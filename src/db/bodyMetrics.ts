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
