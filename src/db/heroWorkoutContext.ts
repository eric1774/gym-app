import { db, executeSql } from './database';
import type { SQLiteDatabase } from 'react-native-sqlite-storage';

const KG_TO_LB = 2.20462;

export interface HeroWorkoutContext {
  headlineLift: { exerciseName: string; weightLb: number; reps: number } | null;
  /** lb added on the headline lift since the session before last; null if only one prior session */
  addedSinceLast: number | null;
}

export async function getHeroWorkoutContext(programDayId: number): Promise<HeroWorkoutContext> {
  const database = await db;

  // 1. Find the first non-warmup compound exercise for this program day.
  //    "Compound" here just means measurement_type='reps' (as opposed to 'timed' or 'height_reps').
  //    Pick the FIRST one in sort_order — that's the headline lift.
  const pde = await executeSql(
    database,
    `SELECT pde.exercise_id, e.name, e.measurement_type
       FROM program_day_exercises pde
       JOIN exercises e ON e.id = pde.exercise_id
      WHERE pde.program_day_id = ?
      ORDER BY pde.sort_order ASC`,
    [programDayId],
  );
  let exId: number | null = null;
  let exName: string | null = null;
  for (let i = 0; i < pde.rows.length; i++) {
    const r = pde.rows.item(i);
    if (r.measurement_type === 'reps') { exId = r.exercise_id; exName = r.name; break; }
  }
  if (exId === null || exName === null) {
    return { headlineLift: null, addedSinceLast: null };
  }

  // 2. Find the two most recent COMPLETED sessions for this programDayId.
  const ses = await executeSql(
    database,
    `SELECT id FROM workout_sessions
      WHERE program_day_id = ? AND completed_at IS NOT NULL
      ORDER BY completed_at DESC
      LIMIT 2`,
    [programDayId],
  );
  if (ses.rows.length === 0) {
    return { headlineLift: null, addedSinceLast: null };
  }

  const recentId: number = ses.rows.item(0).id;
  const priorId: number | null = ses.rows.length > 1 ? ses.rows.item(1).id : null;

  // 3. Get the top working set from the most recent session for the headline exercise.
  const recent = await topSet(database, recentId, exId);
  if (!recent) {
    return { headlineLift: null, addedSinceLast: null };
  }

  // 4. If there's a prior session, compute the lb added.
  let added: number | null = null;
  if (priorId !== null) {
    const prior = await topSet(database, priorId, exId);
    if (prior) { added = (recent.weightKg - prior.weightKg) * KG_TO_LB; }
  }

  return {
    headlineLift: {
      exerciseName: exName,
      weightLb: Math.round(recent.weightKg * KG_TO_LB),
      reps: recent.reps,
    },
    addedSinceLast: added,
  };
}

async function topSet(
  database: SQLiteDatabase,
  sessionId: number,
  exerciseId: number,
): Promise<{ weightKg: number; reps: number } | null> {
  const r = await executeSql(
    database,
    `SELECT weight_kg, reps FROM workout_sets
      WHERE session_id = ? AND exercise_id = ?
        AND (is_warmup IS NULL OR is_warmup = 0)
      ORDER BY weight_kg DESC, reps DESC
      LIMIT 1`,
    [sessionId, exerciseId],
  );
  if (r.rows.length === 0) { return null; }
  const row = r.rows.item(0);
  return { weightKg: Number(row.weight_kg), reps: Number(row.reps) };
}
