import { db, executeSql } from './database';
import type {
  BodyMetric,
  BodyMetricType,
  BodyMetricUnit,
} from '../types';

// ── Row mapper ───────────────────────────────────────────────────────

type BodyMetricRow = {
  id: number;
  metric_type: string;
  value: number;
  unit: string;
  recorded_date: string;
  program_id: number | null;
  note: string | null;
  created_at: string;
  updated_at: string;
};

export function rowToBodyMetric(row: BodyMetricRow): BodyMetric {
  return {
    id: row.id,
    metricType: row.metric_type as BodyMetricType,
    value: row.value,
    unit: row.unit as BodyMetricUnit,
    recordedDate: row.recorded_date,
    programId: row.program_id ?? null,
    note: row.note ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// ── Types / interfaces ───────────────────────────────────────────────

export interface InsertBodyMetricInput {
  metricType: BodyMetricType;
  value: number;
  unit: BodyMetricUnit;
  recordedDate: string;
  programId: number | null;
  note: string | null;
}

// ── Query functions ──────────────────────────────────────────────────

export async function insertBodyMetric(input: InsertBodyMetricInput): Promise<number> {
  const now = new Date().toISOString();
  const database = await db;
  const result = await executeSql(
    database,
    `INSERT INTO body_metrics
       (metric_type, value, unit, recorded_date, program_id, note, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      input.metricType,
      input.value,
      input.unit,
      input.recordedDate,
      input.programId,
      input.note,
      now,
      now,
    ],
  );
  return result.insertId;
}

export async function getBodyMetricByDate(
  metricType: BodyMetricType,
  recordedDate: string,
): Promise<BodyMetric | null> {
  const database = await db;
  const result = await executeSql(
    database,
    'SELECT * FROM body_metrics WHERE metric_type = ? AND recorded_date = ? LIMIT 1',
    [metricType, recordedDate],
  );
  if (result.rows.length === 0) return null;
  return rowToBodyMetric(result.rows.item(0) as BodyMetricRow);
}

// ── Upsert types ─────────────────────────────────────────────────────

export interface UpsertBodyMetricInput {
  metricType: BodyMetricType;
  value: number;
  unit: BodyMetricUnit;
  recordedDate: string;
  note: string | null;
}

export interface UpsertResult {
  id: number;
  wasUpdated: boolean;
}

// ── Upsert + program auto-link ────────────────────────────────────────

/**
 * Insert or update a body-metric reading for the given (type, date).
 * Auto-links the reading to any program whose window
 * [start_date, start_date + weeks * 7) covers recorded_date.
 */
export async function upsertBodyMetric(
  input: UpsertBodyMetricInput,
): Promise<UpsertResult> {
  const now = new Date().toISOString();
  const programId = await findProgramIdAtDate(input.recordedDate);
  const database = await db;

  const existing = await executeSql(
    database,
    'SELECT id FROM body_metrics WHERE metric_type = ? AND recorded_date = ? LIMIT 1',
    [input.metricType, input.recordedDate],
  );

  if (existing.rows.length > 0) {
    const id = existing.rows.item(0).id as number;
    await executeSql(
      database,
      `UPDATE body_metrics
         SET value = ?, unit = ?, program_id = ?, note = ?, updated_at = ?
       WHERE id = ?`,
      [input.value, input.unit, programId, input.note, now, id],
    );
    return { id, wasUpdated: true };
  }

  const inserted = await executeSql(
    database,
    `INSERT INTO body_metrics
       (metric_type, value, unit, recorded_date, program_id, note, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      input.metricType,
      input.value,
      input.unit,
      input.recordedDate,
      programId,
      input.note,
      now,
      now,
    ],
  );
  return { id: inserted.insertId, wasUpdated: false };
}

/**
 * Return the id of the most recently started program whose window
 * [start_date, start_date + weeks * 7) includes the given date, or null.
 */
export async function findProgramIdAtDate(recordedDate: string): Promise<number | null> {
  const database = await db;
  const result = await executeSql(
    database,
    `SELECT id FROM programs
      WHERE start_date IS NOT NULL
        AND DATE(start_date) <= DATE(?)
        AND DATE(start_date, '+' || (weeks * 7) || ' days') > DATE(?)
      ORDER BY DATE(start_date) DESC
      LIMIT 1`,
    [recordedDate, recordedDate],
  );
  if (result.rows.length === 0) return null;
  return result.rows.item(0).id as number;
}

export async function getBodyMetricsInRange(
  metricType: BodyMetricType,
  startDate: string,
  endDate: string,
): Promise<BodyMetric[]> {
  const database = await db;
  const result = await executeSql(
    database,
    `SELECT * FROM body_metrics WHERE metric_type = ? AND recorded_date BETWEEN ? AND ? ORDER BY recorded_date ASC`,
    [metricType, startDate, endDate],
  );
  const out: BodyMetric[] = [];
  for (let i = 0; i < result.rows.length; i++) {
    out.push(rowToBodyMetric(result.rows.item(i) as BodyMetricRow));
  }
  return out;
}

/**
 * Average the values whose recordedDate is within `[endDate - (windowDays - 1), endDate]`.
 * Returns null if fewer than 3 samples fall within the window (honest about insufficient data).
 */
export function computeMovingAverage(
  points: { recordedDate: string; value: number }[],
  endDate: string,
  windowDays: number,
): number | null {
  const end = new Date(endDate + 'T00:00:00Z');
  const startMs = end.getTime() - (windowDays - 1) * 86400000;
  const inWindow = points.filter(p => {
    const ts = new Date(p.recordedDate + 'T00:00:00Z').getTime();
    return ts >= startMs && ts <= end.getTime();
  });
  if (inWindow.length < 3) return null;
  const sum = inWindow.reduce((acc, p) => acc + p.value, 0);
  return sum / inWindow.length;
}

// ── Phase 6 additions ─────────────────────────────────────────────────

export interface DailyCalorieTotal {
  recordedDate: string;
  total: number;
}

/**
 * Meals table has no `calories` column — derive from macros.
 * `local_date` (TEXT) is the canonical day-bucket column, no TZ math needed.
 */
export async function getDailyCalorieTotals(
  startDate: string,
  endDate: string,
): Promise<DailyCalorieTotal[]> {
  const database = await db;
  const result = await executeSql(
    database,
    `SELECT local_date as d,
            COALESCE(SUM(protein_grams), 0) as p,
            COALESCE(SUM(carb_grams), 0)    as c,
            COALESCE(SUM(fat_grams), 0)     as f
       FROM meals
      WHERE local_date BETWEEN ? AND ?
      GROUP BY local_date
      ORDER BY local_date ASC`,
    [startDate, endDate],
  );
  const out: DailyCalorieTotal[] = [];
  for (let i = 0; i < result.rows.length; i++) {
    const row = result.rows.item(i);
    const total = (row.p as number) * 4 + (row.c as number) * 4 + (row.f as number) * 9;
    out.push({ recordedDate: row.d, total });
  }
  return out;
}

export interface ProgramBound {
  id: number;
  name: string;
  startDate: string;
  weeks: number;
}

export async function getProgramsInRange(
  startDate: string,
  endDate: string,
): Promise<ProgramBound[]> {
  const database = await db;
  const result = await executeSql(
    database,
    `SELECT id, name, start_date, weeks FROM programs
      WHERE start_date IS NOT NULL
        AND DATE(start_date, '+' || (weeks * 7) || ' days') >= DATE(?)
        AND DATE(start_date) <= DATE(?)`,
    [startDate, endDate],
  );
  const out: ProgramBound[] = [];
  for (let i = 0; i < result.rows.length; i++) {
    const row = result.rows.item(i);
    out.push({ id: row.id, name: row.name, startDate: row.start_date, weeks: row.weeks });
  }
  return out;
}

export interface DayMealEntry {
  name: string;
  consumedAt: string;
  calories: number;
  items: string | null;
}

export interface DayDetail {
  weight: number | null;
  bodyFat: number | null;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  meals: DayMealEntry[];
}

export async function getDayDetail(date: string): Promise<DayDetail> {
  const database = await db;

  const [weightRow, bfRow, mealsRes, totalsRes] = await Promise.all([
    executeSql(
      database,
      `SELECT value FROM body_metrics WHERE metric_type='weight' AND recorded_date=? LIMIT 1`,
      [date],
    ),
    executeSql(
      database,
      `SELECT value FROM body_metrics WHERE metric_type='body_fat' AND recorded_date=? LIMIT 1`,
      [date],
    ),
    executeSql(
      database,
      `SELECT description, meal_type, logged_at, protein_grams, carb_grams, fat_grams
         FROM meals
        WHERE local_date = ?
        ORDER BY logged_at ASC`,
      [date],
    ),
    executeSql(
      database,
      `SELECT COALESCE(SUM(protein_grams), 0) as p,
              COALESCE(SUM(carb_grams),    0) as c,
              COALESCE(SUM(fat_grams),     0) as f
         FROM meals
        WHERE local_date = ?`,
      [date],
    ),
  ]);

  const meals: DayMealEntry[] = [];
  for (let i = 0; i < mealsRes.rows.length; i++) {
    const m = mealsRes.rows.item(i);
    const p = m.protein_grams as number;
    const c = m.carb_grams as number;
    const f = m.fat_grams as number;
    meals.push({
      name: m.meal_type as string,
      consumedAt: m.logged_at as string,
      calories: p * 4 + c * 4 + f * 9,
      items: (m.description as string) || null,
    });
  }

  const totals = totalsRes.rows.item(0);
  const p = (totals?.p ?? 0) as number;
  const c = (totals?.c ?? 0) as number;
  const f = (totals?.f ?? 0) as number;

  return {
    weight: weightRow.rows.length > 0 ? (weightRow.rows.item(0).value as number) : null,
    bodyFat: bfRow.rows.length > 0 ? (bfRow.rows.item(0).value as number) : null,
    calories: p * 4 + c * 4 + f * 9,
    protein: p,
    carbs: c,
    fat: f,
    meals,
  };
}
