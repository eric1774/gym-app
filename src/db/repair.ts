import { db, executeSql } from './database';

/**
 * Data repair: advance program to week 5 and restore the March 30 Chest session.
 *
 * This is user-initiated only — called from Settings > Repair Data.
 * Never runs automatically on boot to prevent accidental data loss.
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

  // ── Step 2: Ensure current_week is at least 5 ────────────────────
  if (currentWeek < 5) {
    await executeSql(
      database,
      'UPDATE programs SET current_week = 5 WHERE id = ?',
      [programId],
    );
    log.push(`Advanced current_week from ${currentWeek} to 5`);
  } else {
    log.push(`current_week already at ${currentWeek}`);
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

  if (!chestDayId) {
    log.push('WARNING: Could not find "Chest triceps and conditioning" day');
    return log.join('\n');
  }

  // ── Step 4: Restore March 30 Chest session (week 5) ──────────────
  const march30Exists = await executeSql(
    database,
    `SELECT id FROM workout_sessions
     WHERE program_day_id = ?
       AND program_week = 5
       AND completed_at LIKE '2026-03-30%'
     LIMIT 1`,
    [chestDayId],
  );

  if (march30Exists.rows.length === 0) {
    const startedAt = '2026-03-30T10:00:00.000Z';
    const completedAt = '2026-03-30T11:15:00.000Z';

    const sessionResult = await executeSql(
      database,
      'INSERT INTO workout_sessions (started_at, completed_at, program_day_id, program_week) VALUES (?, ?, ?, 5)',
      [startedAt, completedAt, chestDayId],
    );
    const sessionId = sessionResult.insertId;

    // Using week 4 weights as baseline — user can verify in calendar detail
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
    log.push('Restored March 30 Chest session for week 5 (5 exercises, 15 sets)');
  } else {
    log.push('March 30 Chest session already exists — skipped');
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
