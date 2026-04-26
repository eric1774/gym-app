import type { SQLiteDatabase } from 'react-native-sqlite-storage';
import { db, executeSql } from './database';

export interface VolumeTrendResult {
  /** % change: (recent4wk − prior4wk) / prior4wk × 100, or null if prior volume is 0 */
  deltaPercent: number | null;
  /** One entry per week in the recent 4-week window; tonnageLb = SUM(non-warmup weight × reps) in lb */
  weeklyBars: { weekStart: string; tonnageLb: number }[];
}

export async function getVolumeTrend(): Promise<VolumeTrendResult> {
  const database = await db;
  const now = new Date();
  const fourWkAgo = addDays(now, -28);
  const eightWkAgo = addDays(now, -56);

  const [recent, prior] = await Promise.all([
    sumKg(database, fourWkAgo.toISOString(), now.toISOString()),
    sumKg(database, eightWkAgo.toISOString(), fourWkAgo.toISOString()),
  ]);
  const deltaPercent = prior > 0 ? ((recent - prior) / prior) * 100 : null;

  const weeklyBars: { weekStart: string; tonnageLb: number }[] = [];
  for (let w = 3; w >= 0; w--) {
    const ws = addDays(now, -(w + 1) * 7);
    const we = addDays(now, -w * 7);
    const lb = await sumKg(database, ws.toISOString(), we.toISOString());
    weeklyBars.push({ weekStart: ws.toISOString(), tonnageLb: Math.round(lb) });
  }

  return { deltaPercent, weeklyBars };
}

function addDays(d: Date, n: number): Date {
  const o = new Date(d);
  o.setDate(o.getDate() + n);
  return o;
}

async function sumKg(database: SQLiteDatabase, fromIso: string, toIso: string): Promise<number> {
  const r = await executeSql(
    database,
    `SELECT SUM(ws.weight_kg * ws.reps) AS v
       FROM workout_sets ws
       JOIN workout_sessions s ON s.id = ws.session_id
       JOIN exercises e ON e.id = ws.exercise_id
      WHERE s.completed_at >= ? AND s.completed_at < ?
        AND (ws.is_warmup IS NULL OR ws.is_warmup = 0)
        AND e.measurement_type != 'height_reps'`,
    [fromIso, toIso],
  );
  return Number(r.rows.item(0).v ?? 0);
}
