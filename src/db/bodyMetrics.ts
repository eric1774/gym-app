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
