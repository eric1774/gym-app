import { db, executeSql } from './database';
import { WorkoutSession, ExerciseSession } from '../types';

/** Map a raw SQLite result row to the WorkoutSession domain type. */
function rowToSession(row: {
  id: number;
  started_at: string;
  completed_at: string | null;
  program_day_id: number | null;
}): WorkoutSession {
  return {
    id: row.id,
    startedAt: row.started_at,
    completedAt: row.completed_at ?? null,
    programDayId: row.program_day_id ?? null,
  };
}

/** Map a raw SQLite row to the ExerciseSession domain type. */
function rowToExerciseSession(row: {
  exercise_id: number;
  session_id: number;
  is_complete: number;
  rest_seconds: number;
}): ExerciseSession {
  return {
    exerciseId: row.exercise_id,
    sessionId: row.session_id,
    isComplete: row.is_complete === 1,
    restSeconds: row.rest_seconds,
  };
}

/**
 * Create a new workout session with started_at = now.
 * Returns the inserted session row.
 */
export async function createSession(programDayId?: number | null): Promise<WorkoutSession> {
  const database = await db;
  const startedAt = new Date().toISOString();
  const result = await executeSql(
    database,
    'INSERT INTO workout_sessions (started_at, completed_at, program_day_id) VALUES (?, NULL, ?)',
    [startedAt, programDayId ?? null],
  );
  const row = await executeSql(database, 'SELECT * FROM workout_sessions WHERE id = ?', [
    result.insertId,
  ]);
  return rowToSession(row.rows.item(0));
}

/**
 * Return the most recent incomplete session, or null if none exists.
 */
export async function getActiveSession(): Promise<WorkoutSession | null> {
  const database = await db;
  const result = await executeSql(
    database,
    'SELECT * FROM workout_sessions WHERE completed_at IS NULL ORDER BY started_at DESC LIMIT 1',
  );
  if (result.rows.length === 0) {
    return null;
  }
  return rowToSession(result.rows.item(0));
}

/**
 * Mark a session as complete by setting completed_at = now.
 */
export async function completeSession(id: number): Promise<void> {
  const database = await db;
  const completedAt = new Date().toISOString();
  await executeSql(database, 'UPDATE workout_sessions SET completed_at = ? WHERE id = ?', [
    completedAt,
    id,
  ]);
}

/**
 * Return all exercise_sessions rows for a given workout session.
 */
export async function getSessionExercises(sessionId: number): Promise<ExerciseSession[]> {
  const database = await db;
  const result = await executeSql(
    database,
    'SELECT * FROM exercise_sessions WHERE session_id = ?',
    [sessionId],
  );
  const rows: ExerciseSession[] = [];
  for (let i = 0; i < result.rows.length; i++) {
    rows.push(rowToExerciseSession(result.rows.item(i)));
  }
  return rows;
}

/**
 * Add an exercise to a session if not already present.
 * Uses INSERT OR IGNORE to respect the composite primary key.
 */
export async function addExerciseToSession(
  sessionId: number,
  exerciseId: number,
  restSeconds: number,
): Promise<void> {
  const database = await db;
  await executeSql(
    database,
    'INSERT OR IGNORE INTO exercise_sessions (exercise_id, session_id, is_complete, rest_seconds) VALUES (?, ?, 0, ?)',
    [exerciseId, sessionId, restSeconds],
  );
}

/**
 * Mark a specific exercise as complete within a session.
 */
export async function markExerciseComplete(
  sessionId: number,
  exerciseId: number,
): Promise<void> {
  const database = await db;
  await executeSql(
    database,
    'UPDATE exercise_sessions SET is_complete = 1 WHERE session_id = ? AND exercise_id = ?',
    [sessionId, exerciseId],
  );
}

/**
 * Toggle the is_complete flag for a specific exercise within a session.
 * Returns the new isComplete value.
 */
export async function toggleExerciseComplete(
  sessionId: number,
  exerciseId: number,
): Promise<boolean> {
  const database = await db;
  const current = await executeSql(
    database,
    'SELECT is_complete FROM exercise_sessions WHERE session_id = ? AND exercise_id = ?',
    [sessionId, exerciseId],
  );
  if (current.rows.length === 0) {
    return false;
  }
  const currentValue: number = current.rows.item(0).is_complete;
  const newValue = currentValue === 1 ? 0 : 1;
  await executeSql(
    database,
    'UPDATE exercise_sessions SET is_complete = ? WHERE session_id = ? AND exercise_id = ?',
    [newValue, sessionId, exerciseId],
  );
  return newValue === 1;
}

/**
 * Check if a session has any activity: at least one set logged OR one exercise marked complete.
 */
export async function hasSessionActivity(sessionId: number): Promise<boolean> {
  const database = await db;
  const setsResult = await executeSql(
    database,
    'SELECT COUNT(*) as cnt FROM workout_sets WHERE session_id = ?',
    [sessionId],
  );
  if ((setsResult.rows.item(0).cnt as number) > 0) {
    return true;
  }
  const exResult = await executeSql(
    database,
    'SELECT COUNT(*) as cnt FROM exercise_sessions WHERE session_id = ? AND is_complete = 1',
    [sessionId],
  );
  return (exResult.rows.item(0).cnt as number) > 0;
}

/**
 * Delete a session and all related data (sets, exercise_sessions).
 */
export async function deleteSession(sessionId: number): Promise<void> {
  const database = await db;
  await executeSql(database, 'DELETE FROM workout_sets WHERE session_id = ?', [sessionId]);
  await executeSql(database, 'DELETE FROM exercise_sessions WHERE session_id = ?', [sessionId]);
  await executeSql(database, 'DELETE FROM workout_sessions WHERE id = ?', [sessionId]);
}

/**
 * Set completed_at back to NULL on a session (uncomplete it).
 */
export async function uncompleteSession(sessionId: number): Promise<void> {
  const database = await db;
  await executeSql(
    database,
    'UPDATE workout_sessions SET completed_at = NULL WHERE id = ?',
    [sessionId],
  );
}

/**
 * Create an already-completed session for a program day (manual day completion).
 */
export async function createCompletedSession(programDayId: number): Promise<void> {
  const database = await db;
  const now = new Date().toISOString();
  await executeSql(
    database,
    'INSERT INTO workout_sessions (started_at, completed_at, program_day_id) VALUES (?, ?, ?)',
    [now, now, programDayId],
  );
}
