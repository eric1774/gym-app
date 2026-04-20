import { db, executeSql } from './database';

export async function upsertSessionNote(sessionId: number, exerciseId: number, notes: string | null): Promise<void> {
  const database = await db;
  const trimmed = notes?.trim() ?? '';
  if (trimmed === '') {
    await executeSql(
      database,
      'DELETE FROM exercise_session_notes WHERE session_id = ? AND exercise_id = ?',
      [sessionId, exerciseId],
    );
    return;
  }
  const now = new Date().toISOString();
  await executeSql(
    database,
    `INSERT INTO exercise_session_notes (session_id, exercise_id, notes, updated_at)
     VALUES (?, ?, ?, ?)
     ON CONFLICT(session_id, exercise_id)
     DO UPDATE SET notes = excluded.notes, updated_at = excluded.updated_at`,
    [sessionId, exerciseId, trimmed, now],
  );
}

export async function getSessionNote(sessionId: number, exerciseId: number): Promise<string | null> {
  const database = await db;
  const result = await executeSql(
    database,
    'SELECT notes FROM exercise_session_notes WHERE session_id = ? AND exercise_id = ?',
    [sessionId, exerciseId],
  );
  if (result.rows.length === 0) { return null; }
  return result.rows.item(0).notes ?? null;
}

export async function getLastSessionNote(exerciseId: number): Promise<string | null> {
  const database = await db;
  const result = await executeSql(
    database,
    `SELECT notes FROM exercise_session_notes
      WHERE exercise_id = ? AND notes IS NOT NULL AND notes != ''
      ORDER BY updated_at DESC
      LIMIT 1`,
    [exerciseId],
  );
  if (result.rows.length === 0) { return null; }
  return result.rows.item(0).notes ?? null;
}
