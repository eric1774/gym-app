import { db, executeSql } from './database';
import { WorkoutSet } from '../types';

/** Map a raw SQLite result row to the WorkoutSet domain type. */
export function rowToSet(row: {
  id: number;
  session_id: number;
  exercise_id: number;
  set_number: number;
  weight_kg: number;
  reps: number;
  logged_at: string;
  is_warmup: number;
}): WorkoutSet {
  return {
    id: row.id,
    sessionId: row.session_id,
    exerciseId: row.exercise_id,
    setNumber: row.set_number,
    weightKg: row.weight_kg,
    reps: row.reps,
    loggedAt: row.logged_at,
    isWarmup: row.is_warmup === 1,
  };
}

/**
 * Log a new set for an exercise in a session.
 * set_number is auto-computed as (existing sets for this exercise in this session) + 1.
 * Returns the inserted WorkoutSet row.
 */
export async function logSet(
  sessionId: number,
  exerciseId: number,
  weightKg: number,
  reps: number,
  isWarmup: boolean = false,
): Promise<WorkoutSet> {
  const database = await db;

  // Compute set_number
  const countResult = await executeSql(
    database,
    'SELECT COUNT(*) as cnt FROM workout_sets WHERE session_id = ? AND exercise_id = ?',
    [sessionId, exerciseId],
  );
  const setNumber: number = (countResult.rows.item(0).cnt as number) + 1;

  const loggedAt = new Date().toISOString();
  const result = await executeSql(
    database,
    'INSERT INTO workout_sets (session_id, exercise_id, set_number, weight_kg, reps, logged_at, is_warmup) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [sessionId, exerciseId, setNumber, weightKg, reps, loggedAt, isWarmup ? 1 : 0],
  );

  const row = await executeSql(database, 'SELECT * FROM workout_sets WHERE id = ?', [
    result.insertId,
  ]);
  return rowToSet(row.rows.item(0));
}

/**
 * Return all sets for a given exercise in a given session, ordered by set_number ascending.
 */
export async function getSetsForExerciseInSession(
  sessionId: number,
  exerciseId: number,
): Promise<WorkoutSet[]> {
  const database = await db;
  const result = await executeSql(
    database,
    'SELECT * FROM workout_sets WHERE session_id = ? AND exercise_id = ? ORDER BY set_number ASC',
    [sessionId, exerciseId],
  );
  const sets: WorkoutSet[] = [];
  for (let i = 0; i < result.rows.length; i++) {
    sets.push(rowToSet(result.rows.item(i)));
  }
  return sets;
}

/**
 * Return the sets from the most recent COMPLETED session for this exercise,
 * excluding the current session.
 *
 * Powers the ghost reference feature (WORK-03): shows what the user lifted
 * last time while they are logging the current session.
 */
export async function getLastSessionSets(
  exerciseId: number,
  currentSessionId: number,
): Promise<WorkoutSet[]> {
  const database = await db;

  // Find the most recent completed session that contains sets for this exercise,
  // excluding the current session.
  const sessionResult = await executeSql(
    database,
    `SELECT ws.session_id
     FROM workout_sets ws
     INNER JOIN workout_sessions wss ON wss.id = ws.session_id
     WHERE ws.exercise_id = ?
       AND wss.completed_at IS NOT NULL
       AND ws.session_id != ?
     ORDER BY wss.completed_at DESC
     LIMIT 1`,
    [exerciseId, currentSessionId],
  );

  if (sessionResult.rows.length === 0) {
    return [];
  }

  const lastSessionId: number = sessionResult.rows.item(0).session_id;
  return getSetsForExerciseInSession(lastSessionId, exerciseId);
}

/**
 * Delete a specific set by ID.
 */
export async function deleteSet(id: number): Promise<void> {
  const database = await db;
  await executeSql(database, 'DELETE FROM workout_sets WHERE id = ?', [id]);
}

/**
 * Check whether a completed set is a personal record at this exact rep count.
 *
 * A set is a PR if `weightKg` strictly exceeds the highest weight ever logged
 * for the same `exerciseId` and same `reps` value across all previously
 * COMPLETED sessions (excluding the current session and warmup sets).
 *
 * Returns `false` if no prior sets exist at this rep count — a first-ever
 * performance is not considered a PR (there is no baseline to beat).
 */
export async function checkForPR(
  exerciseId: number,
  weightKg: number,
  reps: number,
  currentSessionId: number,
): Promise<boolean> {
  const database = await db;

  const result = await executeSql(
    database,
    `SELECT MAX(ws.weight_kg) as max_weight
     FROM workout_sets ws
     INNER JOIN workout_sessions wss ON wss.id = ws.session_id
     WHERE ws.exercise_id = ?
       AND ws.reps = ?
       AND ws.is_warmup = 0
       AND wss.completed_at IS NOT NULL
       AND ws.session_id != ?`,
    [exerciseId, reps, currentSessionId],
  );

  const maxWeight: number | null = result.rows.item(0).max_weight as number | null;

  if (maxWeight === null) {
    // No previous sets at this rep count — not a PR
    return false;
  }

  return weightKg > maxWeight;
}
