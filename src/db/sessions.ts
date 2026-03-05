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
export async function createSession(): Promise<WorkoutSession> {
  const database = await db;
  const startedAt = new Date().toISOString();
  const result = await executeSql(
    database,
    'INSERT INTO workout_sessions (started_at, completed_at, program_day_id) VALUES (?, NULL, NULL)',
    [startedAt],
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
