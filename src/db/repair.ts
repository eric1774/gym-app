import { db, executeSql } from './database';

/**
 * One-time data repair: fix program week counter and restore lost sessions.
 *
 * 1. Reset "8 week program" current_week to 4
 * 2. Delete bogus sessions stamped with program_week > 4
 * 3. Recreate the March 24 (Chest) and March 25 (Legs) workout sessions
 *
 * Safe to run multiple times — checks for existing data before inserting.
 */
export async function repairProgramData(): Promise<string> {
  const database = await db;
  const log: string[] = [];

  // ── Step 1: Find the program ──────────────────────────────────────
  const progResult = await executeSql(
    database,
    "SELECT id, current_week FROM programs WHERE name = '8 week program' LIMIT 1",
  );
  if (progResult.rows.length === 0) {
    return 'Program "8 week program" not found.';
  }
  const programId = progResult.rows.item(0).id as number;
  const currentWeek = progResult.rows.item(0).current_week as number;

  // ── Step 2: Reset current_week to 4 ──────────────────────────────
  if (currentWeek !== 4) {
    await executeSql(
      database,
      'UPDATE programs SET current_week = 4 WHERE id = ?',
      [programId],
    );
    log.push(`Reset current_week from ${currentWeek} to 4`);
  } else {
    log.push('current_week already at 4');
  }

  // ── Step 3: Get program day IDs ───────────────────────────────────
  const daysResult = await executeSql(
    database,
    'SELECT id, name FROM program_days WHERE program_id = ? ORDER BY sort_order',
    [programId],
  );
  const dayMap = new Map<string, number>();
  for (let i = 0; i < daysResult.rows.length; i++) {
    const row = daysResult.rows.item(i);
    dayMap.set(row.name as string, row.id as number);
  }

  const chestDayId = dayMap.get('Chest triceps and conditioning');
  const legsDayId = dayMap.get('Legs Quad Focus');

  if (!chestDayId || !legsDayId) {
    log.push(`WARNING: Could not find program days. Chest=${chestDayId}, Legs=${legsDayId}`);
    return log.join('\n');
  }

  // ── Step 4: Delete bogus sessions for weeks > 4 ──────────────────
  const bogusSessionsResult = await executeSql(
    database,
    `SELECT ws.id FROM workout_sessions ws
     INNER JOIN program_days pd ON pd.id = ws.program_day_id
     WHERE pd.program_id = ? AND ws.program_week > 4`,
    [programId],
  );

  let deletedCount = 0;
  for (let i = 0; i < bogusSessionsResult.rows.length; i++) {
    const sid = bogusSessionsResult.rows.item(i).id as number;
    await executeSql(database, 'DELETE FROM workout_sets WHERE session_id = ?', [sid]);
    await executeSql(database, 'DELETE FROM exercise_sessions WHERE session_id = ?', [sid]);
    await executeSql(database, 'DELETE FROM workout_sessions WHERE id = ?', [sid]);
    deletedCount++;
  }
  log.push(`Deleted ${deletedCount} bogus sessions (weeks 5-8)`);

  // ── Step 5: Recreate March 24 Chest session ──────────────────────
  const march24Exists = await executeSql(
    database,
    `SELECT id FROM workout_sessions
     WHERE program_day_id = ?
       AND completed_at LIKE '2026-03-24%'
     LIMIT 1`,
    [chestDayId],
  );

  if (march24Exists.rows.length === 0) {
    const startedAt = '2026-03-24T10:00:00.000Z';
    const completedAt = '2026-03-24T11:15:43.847Z';

    const sessionResult = await executeSql(
      database,
      'INSERT INTO workout_sessions (started_at, completed_at, program_day_id, program_week) VALUES (?, ?, ?, 4)',
      [startedAt, completedAt, chestDayId],
    );
    const sessionId = sessionResult.insertId;

    const chestExercises = [
      { name: 'Bench Press', sets: [
        { setNumber: 1, weight: 135, reps: 8 },
        { setNumber: 2, weight: 135, reps: 12 },
        { setNumber: 3, weight: 135, reps: 8 },
      ]},
      { name: 'Incline Bench Press', sets: [
        { setNumber: 1, weight: 95, reps: 10 },
        { setNumber: 2, weight: 105, reps: 10 },
        { setNumber: 3, weight: 110, reps: 10 },
      ]},
      { name: 'Chest Dip', sets: [
        { setNumber: 1, weight: 0, reps: 5 },
        { setNumber: 2, weight: 0, reps: 5 },
        { setNumber: 3, weight: 0, reps: 5 },
      ]},
      { name: 'Overhead Press', sets: [
        { setNumber: 1, weight: 70, reps: 10 },
        { setNumber: 2, weight: 70, reps: 10 },
        { setNumber: 3, weight: 70, reps: 10 },
      ]},
      { name: 'Lateral Raise', sets: [
        { setNumber: 1, weight: 15, reps: 15 },
        { setNumber: 2, weight: 15, reps: 15 },
        { setNumber: 3, weight: 15, reps: 15 },
      ]},
    ];

    await insertExerciseSets(database, sessionId, chestExercises, completedAt);
    log.push('Restored March 24 Chest session (5 exercises, 15 sets)');
  } else {
    log.push('March 24 Chest session already exists — skipped');
  }

  // ── Step 6: Recreate March 25 Legs session ───────────────────────
  const march25Exists = await executeSql(
    database,
    `SELECT id FROM workout_sessions
     WHERE program_day_id = ?
       AND completed_at LIKE '2026-03-25%'
     LIMIT 1`,
    [legsDayId],
  );

  if (march25Exists.rows.length === 0) {
    const startedAt = '2026-03-25T10:00:00.000Z';
    const completedAt = '2026-03-25T11:29:00.533Z';

    const sessionResult = await executeSql(
      database,
      'INSERT INTO workout_sessions (started_at, completed_at, program_day_id, program_week) VALUES (?, ?, ?, 4)',
      [startedAt, completedAt, legsDayId],
    );
    const sessionId = sessionResult.insertId;

    const legsExercises = [
      { name: 'Bulgarian Split Squats', sets: [
        { setNumber: 1, weight: 25, reps: 10 },
        { setNumber: 2, weight: 25, reps: 10 },
        { setNumber: 3, weight: 25, reps: 10 },
      ]},
      { name: 'Box Jump', sets: [
        { setNumber: 1, weight: 0, reps: 10 },
        { setNumber: 2, weight: 0, reps: 10 },
        { setNumber: 3, weight: 0, reps: 10 },
      ]},
      { name: 'Belt Squats', sets: [
        { setNumber: 1, weight: 100, reps: 12 },
        { setNumber: 2, weight: 110, reps: 12 },
        { setNumber: 3, weight: 110, reps: 12 },
        { setNumber: 4, weight: 120, reps: 12 },
      ]},
      { name: 'Walking Lunges', sets: [
        { setNumber: 1, weight: 20, reps: 10 },
        { setNumber: 2, weight: 20, reps: 10 },
        { setNumber: 3, weight: 20, reps: 7 },
      ]},
      { name: 'Leg Extension', sets: [
        { setNumber: 1, weight: 90, reps: 12 },
        { setNumber: 2, weight: 105, reps: 12 },
        { setNumber: 3, weight: 105, reps: 12 },
      ]},
      { name: 'DB V up', sets: [
        { setNumber: 1, weight: 20, reps: 10 },
        { setNumber: 2, weight: 20, reps: 10 },
        { setNumber: 3, weight: 20, reps: 6 },
      ]},
      { name: 'Superman lift', sets: [
        { setNumber: 1, weight: 0, reps: 10 },
        { setNumber: 2, weight: 0, reps: 10 },
        { setNumber: 3, weight: 0, reps: 10 },
      ]},
    ];

    await insertExerciseSets(database, sessionId, legsExercises, completedAt);
    log.push('Restored March 25 Legs session (7 exercises, 22 sets)');
  } else {
    log.push('March 25 Legs session already exists — skipped');
  }

  return log.join('\n');
}

/** Helper: look up exercise by name and insert workout_sets for a session. */
async function insertExerciseSets(
  database: any,
  sessionId: number,
  exercises: { name: string; sets: { setNumber: number; weight: number; reps: number }[] }[],
  loggedAt: string,
): Promise<void> {
  for (const ex of exercises) {
    const exResult = await executeSql(
      database,
      'SELECT id FROM exercises WHERE name = ? LIMIT 1',
      [ex.name],
    );
    if (exResult.rows.length === 0) {
      continue; // Skip exercises not found in DB
    }
    const exerciseId = exResult.rows.item(0).id as number;

    for (const set of ex.sets) {
      await executeSql(
        database,
        'INSERT INTO workout_sets (session_id, exercise_id, set_number, weight_kg, reps, logged_at, is_warmup) VALUES (?, ?, ?, ?, ?, ?, 0)',
        [sessionId, exerciseId, set.setNumber, set.weight, set.reps, loggedAt],
      );
    }
  }
}
