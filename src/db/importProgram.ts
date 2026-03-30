import { db, executeSql } from './database';

/**
 * Import the full "8 week program" with all workout history (weeks 1-4)
 * into a fresh database. Used to seed the emulator with prod data.
 *
 * Idempotent: skips if the program already exists with sessions.
 */
export async function importProgramData(): Promise<string> {
  const database = await db;
  const log: string[] = [];

  // ── Guard: skip if program already has session data ───────────────
  const existingProg = await executeSql(
    database,
    "SELECT id FROM programs WHERE name = '8 week program' LIMIT 1",
  );
  if (existingProg.rows.length > 0) {
    const pid = existingProg.rows.item(0).id as number;
    const sessionCount = await executeSql(
      database,
      `SELECT COUNT(*) AS cnt FROM workout_sessions ws
       INNER JOIN program_days pd ON pd.id = ws.program_day_id
       WHERE pd.program_id = ?`,
      [pid],
    );
    if ((sessionCount.rows.item(0).cnt as number) > 0) {
      return 'Program already has session data — import skipped.';
    }
  }

  // ── Step 1: Create program ────────────────────────────────────────
  const now = new Date().toISOString();
  let programId: number;

  if (existingProg.rows.length > 0) {
    programId = existingProg.rows.item(0).id as number;
    log.push('Program exists, reusing');
  } else {
    const startDate = '2026-03-05T00:00:00.000Z';
    const result = await executeSql(
      database,
      'INSERT INTO programs (name, weeks, start_date, current_week, created_at) VALUES (?, 8, ?, 4, ?)',
      ['8 week program', startDate, now],
    );
    programId = result.insertId;
    log.push('Created "8 week program"');
  }

  // Set current_week=4 and ensure activated
  await executeSql(
    database,
    "UPDATE programs SET current_week = 4, start_date = COALESCE(start_date, '2026-03-05T00:00:00.000Z') WHERE id = ?",
    [programId],
  );

  // ── Step 2: Create program days ───────────────────────────────────
  const dayNames = [
    'Legs Quad Focus',
    'Chest triceps and conditioning',
    'Pull focus',
    'Legs Hamstring Glute Focus',
  ];

  const dayIdMap = new Map<string, number>();
  for (let i = 0; i < dayNames.length; i++) {
    const name = dayNames[i];
    const existing = await executeSql(
      database,
      'SELECT id FROM program_days WHERE program_id = ? AND name = ? LIMIT 1',
      [programId, name],
    );
    if (existing.rows.length > 0) {
      dayIdMap.set(name, existing.rows.item(0).id as number);
    } else {
      const result = await executeSql(
        database,
        'INSERT INTO program_days (program_id, name, sort_order, created_at) VALUES (?, ?, ?, ?)',
        [programId, name, i, now],
      );
      dayIdMap.set(name, result.insertId);
    }
  }
  log.push(`Program days: ${dayIdMap.size}`);

  // ── Step 3: Set up program day exercises (templates) ──────────────
  const dayExerciseTemplates: Record<string, { name: string; sets: number; reps: number }[]> = {
    'Legs Quad Focus': [
      { name: 'Belt Squats', sets: 4, reps: 12 },
      { name: 'Bulgarian Split Squats', sets: 3, reps: 10 },
      { name: 'Box Jump', sets: 3, reps: 10 },
      { name: 'Walking Lunges', sets: 3, reps: 10 },
      { name: 'Leg Extension', sets: 3, reps: 12 },
      { name: 'DB Single arm Suitcase Carry', sets: 3, reps: 60 },
      { name: 'Superman lift', sets: 3, reps: 10 },
      { name: 'DB V up', sets: 3, reps: 10 },
    ],
    'Chest triceps and conditioning': [
      { name: 'Bench Press', sets: 3, reps: 10 },
      { name: 'Incline Bench Press', sets: 3, reps: 10 },
      { name: 'Chest Dip', sets: 3, reps: 5 },
      { name: 'Overhead Press', sets: 3, reps: 10 },
      { name: 'Lateral Raise', sets: 3, reps: 15 },
      { name: 'Close Grip Bench Press', sets: 3, reps: 10 },
      { name: 'Kettlebell Swings', sets: 3, reps: 12 },
    ],
    'Pull focus': [
      { name: 'Pull-Up', sets: 4, reps: 5 },
      { name: 'Barbell Row', sets: 4, reps: 12 },
      { name: 'Single Arm DB Row', sets: 3, reps: 10 },
      { name: 'Face Pull', sets: 3, reps: 15 },
      { name: 'Bicep Curl', sets: 3, reps: 10 },
      { name: 'KB Snatch', sets: 2, reps: 5 },
    ],
    'Legs Hamstring Glute Focus': [
      { name: 'Deadlift', sets: 4, reps: 8 },
      { name: 'Romanian Deadlift', sets: 3, reps: 10 },
      { name: 'Hip Thrusts', sets: 3, reps: 10 },
      { name: 'Leg Curl', sets: 3, reps: 10 },
      { name: 'Bulgarian Split Squats', sets: 3, reps: 10 },
      { name: 'Kettlebell Swings', sets: 3, reps: 12 },
    ],
  };

  for (const [dayName, exercises] of Object.entries(dayExerciseTemplates)) {
    const dayId = dayIdMap.get(dayName)!;
    const existingEx = await executeSql(
      database,
      'SELECT COUNT(*) AS cnt FROM program_day_exercises WHERE program_day_id = ?',
      [dayId],
    );
    if ((existingEx.rows.item(0).cnt as number) > 0) continue;

    for (let i = 0; i < exercises.length; i++) {
      const ex = exercises[i];
      const exRow = await executeSql(
        database,
        'SELECT id FROM exercises WHERE name = ? LIMIT 1',
        [ex.name],
      );
      if (exRow.rows.length === 0) continue;
      await executeSql(
        database,
        'INSERT INTO program_day_exercises (program_day_id, exercise_id, target_sets, target_reps, target_weight_kg, sort_order) VALUES (?, ?, ?, ?, 0, ?)',
        [dayId, exRow.rows.item(0).id, ex.sets, ex.reps, i],
      );
    }
  }
  log.push('Program day exercises configured');

  // ── Step 4: Import all workout sessions ───────────────────────────
  let sessionCount = 0;
  let setCount = 0;

  for (const week of WEEK_DATA) {
    for (const day of week.days) {
      const dayId = dayIdMap.get(day.dayName);
      if (!dayId) continue;

      const startedAt = new Date(new Date(day.completedAt).getTime() - 3600000).toISOString();
      const sessionResult = await executeSql(
        database,
        'INSERT INTO workout_sessions (started_at, completed_at, program_day_id, program_week) VALUES (?, ?, ?, ?)',
        [startedAt, day.completedAt, dayId, week.weekNumber],
      );
      const sessionId = sessionResult.insertId;
      sessionCount++;

      for (const ex of day.exercises) {
        const exRow = await executeSql(
          database,
          'SELECT id FROM exercises WHERE name = ? LIMIT 1',
          [ex.name],
        );
        if (exRow.rows.length === 0) continue;
        const exerciseId = exRow.rows.item(0).id as number;

        for (const set of ex.sets) {
          await executeSql(
            database,
            'INSERT INTO workout_sets (session_id, exercise_id, set_number, weight_kg, reps, logged_at, is_warmup) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [sessionId, exerciseId, set.setNumber, set.weight, set.reps, day.completedAt, set.isWarmup ? 1 : 0],
          );
          setCount++;
        }
      }
    }
  }

  log.push(`Imported ${sessionCount} sessions, ${setCount} sets`);
  return log.join('\n');
}

// ── Full workout data for weeks 1-4 ────────────────────────────────

const WEEK_DATA = [
  {
    weekNumber: 1,
    days: [
      {
        dayName: 'Legs Quad Focus',
        completedAt: '2026-03-05T23:38:33.076Z',
        exercises: [] as { name: string; sets: { setNumber: number; weight: number; reps: number; isWarmup: boolean }[] }[],
      },
      {
        dayName: 'Chest triceps and conditioning',
        completedAt: '2026-03-06T17:37:43.901Z',
        exercises: [
          { name: 'Bench Press', sets: [
            { setNumber: 1, weight: 135, reps: 10, isWarmup: false },
            { setNumber: 2, weight: 135, reps: 10, isWarmup: false },
            { setNumber: 3, weight: 135, reps: 8, isWarmup: false },
          ]},
          { name: 'Incline Bench Press', sets: [
            { setNumber: 1, weight: 95, reps: 10, isWarmup: false },
            { setNumber: 2, weight: 95, reps: 6, isWarmup: false },
            { setNumber: 3, weight: 95, reps: 6, isWarmup: false },
          ]},
          { name: 'Overhead Press', sets: [
            { setNumber: 1, weight: 45, reps: 10, isWarmup: false },
            { setNumber: 2, weight: 55, reps: 10, isWarmup: false },
            { setNumber: 3, weight: 55, reps: 10, isWarmup: false },
          ]},
          { name: 'Lateral Raise', sets: [
            { setNumber: 1, weight: 10, reps: 15, isWarmup: false },
            { setNumber: 2, weight: 10, reps: 15, isWarmup: false },
            { setNumber: 3, weight: 15, reps: 10, isWarmup: false },
          ]},
          { name: 'Chest Dip', sets: [
            { setNumber: 1, weight: 0, reps: 4, isWarmup: false },
            { setNumber: 2, weight: 0, reps: 4, isWarmup: false },
            { setNumber: 3, weight: 0, reps: 4, isWarmup: false },
          ]},
          { name: 'Close Grip Bench Press', sets: [
            { setNumber: 1, weight: 95, reps: 10, isWarmup: false },
            { setNumber: 2, weight: 95, reps: 10, isWarmup: false },
            { setNumber: 3, weight: 95, reps: 10, isWarmup: false },
          ]},
          { name: 'Kettlebell Swings', sets: [
            { setNumber: 1, weight: 35, reps: 12, isWarmup: false },
            { setNumber: 2, weight: 35, reps: 12, isWarmup: false },
            { setNumber: 3, weight: 35, reps: 12, isWarmup: false },
          ]},
        ],
      },
      {
        dayName: 'Pull focus',
        completedAt: '2026-03-09T14:15:47.802Z',
        exercises: [
          { name: 'Pull-Up', sets: [
            { setNumber: 1, weight: 0, reps: 4, isWarmup: false },
            { setNumber: 2, weight: 0, reps: 4, isWarmup: false },
            { setNumber: 3, weight: 0, reps: 3, isWarmup: false },
            { setNumber: 4, weight: 0, reps: 4, isWarmup: false },
          ]},
          { name: 'Barbell Row', sets: [
            { setNumber: 1, weight: 65, reps: 12, isWarmup: false },
            { setNumber: 2, weight: 65, reps: 12, isWarmup: false },
            { setNumber: 3, weight: 85, reps: 10, isWarmup: false },
            { setNumber: 4, weight: 85, reps: 10, isWarmup: false },
          ]},
          { name: 'Single Arm DB Row', sets: [
            { setNumber: 1, weight: 35, reps: 10, isWarmup: false },
            { setNumber: 2, weight: 35, reps: 10, isWarmup: false },
            { setNumber: 3, weight: 35, reps: 10, isWarmup: false },
          ]},
          { name: 'Face Pull', sets: [
            { setNumber: 1, weight: 20, reps: 15, isWarmup: false },
            { setNumber: 2, weight: 30, reps: 12, isWarmup: false },
            { setNumber: 3, weight: 30, reps: 12, isWarmup: false },
          ]},
          { name: 'Bicep Curl', sets: [
            { setNumber: 1, weight: 20, reps: 10, isWarmup: false },
            { setNumber: 2, weight: 20, reps: 10, isWarmup: false },
            { setNumber: 3, weight: 20, reps: 10, isWarmup: false },
          ]},
          { name: 'KB Snatch', sets: [
            { setNumber: 1, weight: 35, reps: 5, isWarmup: false },
            { setNumber: 2, weight: 35, reps: 5, isWarmup: false },
          ]},
        ],
      },
      {
        dayName: 'Legs Hamstring Glute Focus',
        completedAt: '2026-03-10T12:46:57.458Z',
        exercises: [
          { name: 'Deadlift', sets: [
            { setNumber: 1, weight: 95, reps: 8, isWarmup: false },
            { setNumber: 2, weight: 115, reps: 8, isWarmup: false },
            { setNumber: 3, weight: 115, reps: 8, isWarmup: false },
            { setNumber: 4, weight: 115, reps: 7, isWarmup: false },
          ]},
          { name: 'Romanian Deadlift', sets: [
            { setNumber: 1, weight: 75, reps: 8, isWarmup: false },
            { setNumber: 2, weight: 75, reps: 10, isWarmup: false },
            { setNumber: 3, weight: 75, reps: 8, isWarmup: false },
          ]},
          { name: 'Hip Thrusts', sets: [
            { setNumber: 1, weight: 75, reps: 10, isWarmup: false },
            { setNumber: 2, weight: 75, reps: 10, isWarmup: false },
            { setNumber: 3, weight: 75, reps: 10, isWarmup: false },
          ]},
          { name: 'Leg Curl', sets: [
            { setNumber: 1, weight: 25, reps: 10, isWarmup: false },
            { setNumber: 2, weight: 25, reps: 10, isWarmup: false },
            { setNumber: 3, weight: 25, reps: 10, isWarmup: false },
          ]},
          { name: 'Bulgarian Split Squats', sets: [
            { setNumber: 1, weight: 0, reps: 10, isWarmup: false },
            { setNumber: 2, weight: 0, reps: 10, isWarmup: false },
            { setNumber: 3, weight: 0, reps: 10, isWarmup: false },
          ]},
          { name: 'Kettlebell Swings', sets: [
            { setNumber: 1, weight: 35, reps: 12, isWarmup: false },
            { setNumber: 2, weight: 35, reps: 12, isWarmup: false },
            { setNumber: 3, weight: 35, reps: 12, isWarmup: false },
          ]},
          { name: 'DB Single arm Suitcase Carry', sets: [
            { setNumber: 1, weight: 0, reps: 66, isWarmup: false },
            { setNumber: 2, weight: 0, reps: 96, isWarmup: false },
            { setNumber: 3, weight: 0, reps: 76, isWarmup: false },
          ]},
        ],
      },
    ],
  },
  {
    weekNumber: 2,
    days: [
      {
        dayName: 'Legs Quad Focus',
        completedAt: '2026-03-07T15:39:50.464Z',
        exercises: [
          { name: 'Belt Squats', sets: [
            { setNumber: 1, weight: 50, reps: 12, isWarmup: false },
            { setNumber: 2, weight: 50, reps: 12, isWarmup: false },
            { setNumber: 3, weight: 70, reps: 12, isWarmup: false },
            { setNumber: 4, weight: 70, reps: 12, isWarmup: false },
          ]},
          { name: 'Bulgarian Split Squats', sets: [
            { setNumber: 1, weight: 0, reps: 10, isWarmup: false },
            { setNumber: 2, weight: 0, reps: 10, isWarmup: false },
            { setNumber: 3, weight: 0, reps: 10, isWarmup: false },
          ]},
          { name: 'Box Jump', sets: [
            { setNumber: 1, weight: 0, reps: 10, isWarmup: false },
            { setNumber: 2, weight: 0, reps: 10, isWarmup: false },
            { setNumber: 3, weight: 0, reps: 10, isWarmup: false },
          ]},
          { name: 'Walking Lunges', sets: [
            { setNumber: 1, weight: 0, reps: 10, isWarmup: false },
            { setNumber: 2, weight: 0, reps: 10, isWarmup: false },
            { setNumber: 3, weight: 0, reps: 10, isWarmup: false },
          ]},
          { name: 'Leg Extension', sets: [
            { setNumber: 1, weight: 60, reps: 12, isWarmup: false },
            { setNumber: 2, weight: 60, reps: 12, isWarmup: false },
            { setNumber: 3, weight: 70, reps: 12, isWarmup: false },
          ]},
          { name: 'DB Single arm Suitcase Carry', sets: [
            { setNumber: 1, weight: 0, reps: 60, isWarmup: false },
            { setNumber: 2, weight: 0, reps: 63, isWarmup: false },
            { setNumber: 3, weight: 0, reps: 71, isWarmup: false },
          ]},
          { name: 'Superman lift', sets: [
            { setNumber: 1, weight: 0, reps: 10, isWarmup: false },
            { setNumber: 2, weight: 0, reps: 10, isWarmup: false },
            { setNumber: 3, weight: 0, reps: 10, isWarmup: false },
          ]},
          { name: 'DB V up', sets: [
            { setNumber: 1, weight: 0, reps: 10, isWarmup: false },
            { setNumber: 2, weight: 0, reps: 10, isWarmup: false },
            { setNumber: 3, weight: 0, reps: 10, isWarmup: false },
          ]},
        ],
      },
      {
        dayName: 'Chest triceps and conditioning',
        completedAt: '2026-03-12T13:26:13.580Z',
        exercises: [
          { name: 'Bench Press', sets: [
            { setNumber: 1, weight: 135, reps: 10, isWarmup: false },
            { setNumber: 2, weight: 140, reps: 10, isWarmup: false },
            { setNumber: 3, weight: 140, reps: 8, isWarmup: false },
          ]},
          { name: 'Incline Bench Press', sets: [
            { setNumber: 1, weight: 95, reps: 10, isWarmup: false },
            { setNumber: 2, weight: 95, reps: 8, isWarmup: false },
            { setNumber: 3, weight: 95, reps: 10, isWarmup: false },
          ]},
          { name: 'Chest Dip', sets: [
            { setNumber: 1, weight: 0, reps: 5, isWarmup: false },
            { setNumber: 2, weight: 0, reps: 5, isWarmup: false },
            { setNumber: 3, weight: 0, reps: 5, isWarmup: false },
          ]},
          { name: 'Close Grip Bench Press', sets: [
            { setNumber: 1, weight: 95, reps: 8, isWarmup: false },
            { setNumber: 2, weight: 95, reps: 8, isWarmup: false },
            { setNumber: 3, weight: 95, reps: 6, isWarmup: false },
          ]},
          { name: 'Overhead Press', sets: [
            { setNumber: 1, weight: 55, reps: 10, isWarmup: false },
            { setNumber: 2, weight: 55, reps: 10, isWarmup: false },
            { setNumber: 3, weight: 55, reps: 8, isWarmup: false },
          ]},
          { name: 'Lateral Raise', sets: [
            { setNumber: 1, weight: 10, reps: 15, isWarmup: false },
            { setNumber: 2, weight: 12, reps: 15, isWarmup: false },
            { setNumber: 3, weight: 12, reps: 15, isWarmup: false },
          ]},
        ],
      },
      {
        dayName: 'Pull focus',
        completedAt: '2026-03-15T14:28:31.206Z',
        exercises: [
          { name: 'Pull-Up', sets: [
            { setNumber: 1, weight: 0, reps: 5, isWarmup: false },
            { setNumber: 2, weight: 0, reps: 5, isWarmup: false },
            { setNumber: 3, weight: 0, reps: 3, isWarmup: false },
          ]},
          { name: 'Barbell Row', sets: [
            { setNumber: 1, weight: 95, reps: 12, isWarmup: false },
            { setNumber: 2, weight: 95, reps: 12, isWarmup: false },
            { setNumber: 3, weight: 95, reps: 12, isWarmup: false },
            { setNumber: 4, weight: 95, reps: 6, isWarmup: false },
          ]},
          { name: 'Single Arm DB Row', sets: [
            { setNumber: 1, weight: 40, reps: 10, isWarmup: false },
            { setNumber: 2, weight: 40, reps: 10, isWarmup: false },
            { setNumber: 3, weight: 40, reps: 10, isWarmup: false },
          ]},
          { name: 'Face Pull', sets: [
            { setNumber: 1, weight: 30, reps: 15, isWarmup: false },
            { setNumber: 2, weight: 30, reps: 15, isWarmup: false },
            { setNumber: 3, weight: 30, reps: 15, isWarmup: false },
          ]},
          { name: 'Bicep Curl', sets: [
            { setNumber: 1, weight: 25, reps: 10, isWarmup: false },
            { setNumber: 2, weight: 25, reps: 10, isWarmup: false },
            { setNumber: 3, weight: 25, reps: 8, isWarmup: false },
          ]},
          { name: 'KB Snatch', sets: [
            { setNumber: 1, weight: 35, reps: 5, isWarmup: false },
            { setNumber: 2, weight: 35, reps: 5, isWarmup: false },
          ]},
          { name: 'Burpees', sets: [
            { setNumber: 1, weight: 0, reps: 10, isWarmup: false },
            { setNumber: 2, weight: 0, reps: 10, isWarmup: false },
          ]},
          { name: 'Med Ball Slam', sets: [
            { setNumber: 1, weight: 30, reps: 5, isWarmup: false },
            { setNumber: 2, weight: 30, reps: 5, isWarmup: false },
          ]},
        ],
      },
      {
        dayName: 'Legs Hamstring Glute Focus',
        completedAt: '2026-03-16T12:12:26.058Z',
        exercises: [
          { name: 'Deadlift', sets: [
            { setNumber: 1, weight: 95, reps: 8, isWarmup: false },
            { setNumber: 2, weight: 115, reps: 8, isWarmup: false },
            { setNumber: 3, weight: 125, reps: 8, isWarmup: false },
            { setNumber: 4, weight: 125, reps: 7, isWarmup: false },
          ]},
          { name: 'Romanian Deadlift', sets: [
            { setNumber: 1, weight: 95, reps: 8, isWarmup: false },
            { setNumber: 2, weight: 95, reps: 8, isWarmup: false },
            { setNumber: 3, weight: 95, reps: 8, isWarmup: false },
          ]},
          { name: 'Hip Thrusts', sets: [
            { setNumber: 1, weight: 95, reps: 10, isWarmup: false },
            { setNumber: 2, weight: 95, reps: 10, isWarmup: false },
            { setNumber: 3, weight: 95, reps: 10, isWarmup: false },
          ]},
          { name: 'Leg Curl', sets: [
            { setNumber: 1, weight: 25, reps: 10, isWarmup: false },
            { setNumber: 2, weight: 30, reps: 10, isWarmup: false },
            { setNumber: 3, weight: 30, reps: 10, isWarmup: false },
          ]},
          { name: 'Bulgarian Split Squats', sets: [
            { setNumber: 1, weight: 15, reps: 10, isWarmup: false },
            { setNumber: 2, weight: 15, reps: 10, isWarmup: false },
          ]},
          { name: 'Kettlebell Swings', sets: [
            { setNumber: 1, weight: 40, reps: 12, isWarmup: false },
            { setNumber: 2, weight: 40, reps: 12, isWarmup: false },
          ]},
        ],
      },
    ],
  },
  {
    weekNumber: 3,
    days: [
      {
        dayName: 'Chest triceps and conditioning',
        completedAt: '2026-03-12T13:26:39.145Z',
        exercises: [] as { name: string; sets: { setNumber: number; weight: number; reps: number; isWarmup: boolean }[] }[],
      },
      {
        dayName: 'Legs Quad Focus',
        completedAt: '2026-03-13T12:32:36.648Z',
        exercises: [
          { name: 'Belt Squats', sets: [
            { setNumber: 1, weight: 50, reps: 12, isWarmup: false },
            { setNumber: 2, weight: 80, reps: 12, isWarmup: false },
            { setNumber: 3, weight: 90, reps: 12, isWarmup: false },
            { setNumber: 4, weight: 90, reps: 12, isWarmup: false },
          ]},
          { name: 'Bulgarian Split Squats', sets: [
            { setNumber: 1, weight: 10, reps: 10, isWarmup: false },
            { setNumber: 2, weight: 10, reps: 10, isWarmup: false },
            { setNumber: 3, weight: 10, reps: 10, isWarmup: false },
          ]},
          { name: 'Box Jump', sets: [
            { setNumber: 1, weight: 0, reps: 10, isWarmup: false },
            { setNumber: 2, weight: 0, reps: 10, isWarmup: false },
            { setNumber: 3, weight: 0, reps: 10, isWarmup: false },
          ]},
          { name: 'Walking Lunges', sets: [
            { setNumber: 1, weight: 0, reps: 10, isWarmup: false },
            { setNumber: 2, weight: 0, reps: 10, isWarmup: false },
            { setNumber: 3, weight: 0, reps: 10, isWarmup: false },
          ]},
          { name: 'Leg Extension', sets: [
            { setNumber: 1, weight: 70, reps: 12, isWarmup: false },
            { setNumber: 2, weight: 70, reps: 12, isWarmup: false },
            { setNumber: 3, weight: 70, reps: 12, isWarmup: false },
          ]},
        ],
      },
      {
        dayName: 'Pull focus',
        completedAt: '2026-03-21T12:19:20.682Z',
        exercises: [
          { name: 'Pull-Up', sets: [
            { setNumber: 1, weight: 0, reps: 5, isWarmup: false },
            { setNumber: 2, weight: 0, reps: 5, isWarmup: false },
            { setNumber: 3, weight: 0, reps: 4, isWarmup: false },
            { setNumber: 4, weight: 0, reps: 5, isWarmup: false },
          ]},
          { name: 'Barbell Row', sets: [
            { setNumber: 1, weight: 95, reps: 12, isWarmup: false },
            { setNumber: 2, weight: 100, reps: 12, isWarmup: false },
            { setNumber: 3, weight: 105, reps: 12, isWarmup: false },
            { setNumber: 4, weight: 105, reps: 12, isWarmup: false },
          ]},
          { name: 'Single Arm DB Row', sets: [
            { setNumber: 1, weight: 40, reps: 10, isWarmup: false },
            { setNumber: 2, weight: 45, reps: 10, isWarmup: false },
            { setNumber: 3, weight: 45, reps: 10, isWarmup: false },
          ]},
          { name: 'Face Pull', sets: [
            { setNumber: 1, weight: 40, reps: 15, isWarmup: false },
            { setNumber: 2, weight: 40, reps: 15, isWarmup: false },
            { setNumber: 3, weight: 40, reps: 15, isWarmup: false },
          ]},
          { name: 'Bicep Curl', sets: [
            { setNumber: 1, weight: 30, reps: 10, isWarmup: false },
            { setNumber: 2, weight: 30, reps: 6, isWarmup: false },
            { setNumber: 3, weight: 25, reps: 10, isWarmup: false },
          ]},
          { name: 'Forearm Plank Reaches', sets: [
            { setNumber: 1, weight: 0, reps: 30, isWarmup: false },
          ]},
          { name: 'Rolling Side Plank Knee to Elbow', sets: [
            { setNumber: 1, weight: 0, reps: 30, isWarmup: false },
          ]},
          { name: 'Leg Lift Hip Pulse', sets: [
            { setNumber: 1, weight: 0, reps: 30, isWarmup: false },
          ]},
          { name: 'DB Hollow Flutter Kicks', sets: [
            { setNumber: 1, weight: 0, reps: 30, isWarmup: false },
          ]},
        ],
      },
      {
        dayName: 'Legs Hamstring Glute Focus',
        completedAt: '2026-03-22T19:51:16.174Z',
        exercises: [
          { name: 'Deadlift', sets: [
            { setNumber: 1, weight: 95, reps: 12, isWarmup: false },
            { setNumber: 2, weight: 120, reps: 12, isWarmup: false },
            { setNumber: 3, weight: 135, reps: 8, isWarmup: false },
          ]},
          { name: 'Romanian Deadlift', sets: [
            { setNumber: 1, weight: 95, reps: 10, isWarmup: false },
            { setNumber: 2, weight: 95, reps: 10, isWarmup: false },
            { setNumber: 3, weight: 95, reps: 8, isWarmup: false },
          ]},
          { name: 'Hip Thrusts', sets: [
            { setNumber: 1, weight: 115, reps: 10, isWarmup: false },
            { setNumber: 2, weight: 115, reps: 10, isWarmup: false },
            { setNumber: 3, weight: 115, reps: 8, isWarmup: false },
          ]},
          { name: 'Leg Curl', sets: [
            { setNumber: 1, weight: 35, reps: 10, isWarmup: false },
            { setNumber: 2, weight: 35, reps: 12, isWarmup: false },
            { setNumber: 3, weight: 35, reps: 10, isWarmup: false },
          ]},
          { name: 'DB V up', sets: [
            { setNumber: 1, weight: 15, reps: 10, isWarmup: false },
            { setNumber: 2, weight: 15, reps: 10, isWarmup: false },
          ]},
        ],
      },
    ],
  },
  {
    weekNumber: 4,
    days: [
      {
        dayName: 'Chest triceps and conditioning',
        completedAt: '2026-03-24T11:15:43.847Z',
        exercises: [
          { name: 'Bench Press', sets: [
            { setNumber: 1, weight: 135, reps: 8, isWarmup: false },
            { setNumber: 2, weight: 135, reps: 12, isWarmup: false },
            { setNumber: 3, weight: 135, reps: 8, isWarmup: false },
          ]},
          { name: 'Incline Bench Press', sets: [
            { setNumber: 1, weight: 95, reps: 10, isWarmup: false },
            { setNumber: 2, weight: 105, reps: 10, isWarmup: false },
            { setNumber: 3, weight: 110, reps: 10, isWarmup: false },
          ]},
          { name: 'Chest Dip', sets: [
            { setNumber: 1, weight: 0, reps: 5, isWarmup: false },
            { setNumber: 2, weight: 0, reps: 5, isWarmup: false },
            { setNumber: 3, weight: 0, reps: 5, isWarmup: false },
          ]},
          { name: 'Overhead Press', sets: [
            { setNumber: 1, weight: 70, reps: 10, isWarmup: false },
            { setNumber: 2, weight: 70, reps: 10, isWarmup: false },
            { setNumber: 3, weight: 70, reps: 10, isWarmup: false },
          ]},
          { name: 'Lateral Raise', sets: [
            { setNumber: 1, weight: 15, reps: 15, isWarmup: false },
            { setNumber: 2, weight: 15, reps: 15, isWarmup: false },
            { setNumber: 3, weight: 15, reps: 15, isWarmup: false },
          ]},
        ],
      },
      {
        dayName: 'Legs Quad Focus',
        completedAt: '2026-03-25T11:29:00.533Z',
        exercises: [
          { name: 'Bulgarian Split Squats', sets: [
            { setNumber: 1, weight: 25, reps: 10, isWarmup: false },
            { setNumber: 2, weight: 25, reps: 10, isWarmup: false },
            { setNumber: 3, weight: 25, reps: 10, isWarmup: false },
          ]},
          { name: 'Box Jump', sets: [
            { setNumber: 1, weight: 0, reps: 10, isWarmup: false },
            { setNumber: 2, weight: 0, reps: 10, isWarmup: false },
            { setNumber: 3, weight: 0, reps: 10, isWarmup: false },
          ]},
          { name: 'Belt Squats', sets: [
            { setNumber: 1, weight: 100, reps: 12, isWarmup: false },
            { setNumber: 2, weight: 110, reps: 12, isWarmup: false },
            { setNumber: 3, weight: 110, reps: 12, isWarmup: false },
            { setNumber: 4, weight: 120, reps: 12, isWarmup: false },
          ]},
          { name: 'Walking Lunges', sets: [
            { setNumber: 1, weight: 20, reps: 10, isWarmup: false },
            { setNumber: 2, weight: 20, reps: 10, isWarmup: false },
            { setNumber: 3, weight: 20, reps: 7, isWarmup: false },
          ]},
          { name: 'Leg Extension', sets: [
            { setNumber: 1, weight: 90, reps: 12, isWarmup: false },
            { setNumber: 2, weight: 105, reps: 12, isWarmup: false },
            { setNumber: 3, weight: 105, reps: 12, isWarmup: false },
          ]},
          { name: 'DB V up', sets: [
            { setNumber: 1, weight: 20, reps: 10, isWarmup: false },
            { setNumber: 2, weight: 20, reps: 10, isWarmup: false },
            { setNumber: 3, weight: 20, reps: 6, isWarmup: false },
          ]},
          { name: 'Superman lift', sets: [
            { setNumber: 1, weight: 0, reps: 10, isWarmup: false },
            { setNumber: 2, weight: 0, reps: 10, isWarmup: false },
            { setNumber: 3, weight: 0, reps: 10, isWarmup: false },
          ]},
        ],
      },
      {
        dayName: 'Legs Quad Focus',
        completedAt: '2026-03-19T11:28:01.781Z',
        exercises: [
          { name: 'Belt Squats', sets: [
            { setNumber: 1, weight: 100, reps: 12, isWarmup: false },
            { setNumber: 2, weight: 100, reps: 8, isWarmup: false },
            { setNumber: 3, weight: 100, reps: 12, isWarmup: false },
            { setNumber: 4, weight: 100, reps: 8, isWarmup: false },
          ]},
          { name: 'Bulgarian Split Squats', sets: [
            { setNumber: 1, weight: 20, reps: 10, isWarmup: false },
            { setNumber: 2, weight: 20, reps: 10, isWarmup: false },
            { setNumber: 3, weight: 20, reps: 10, isWarmup: false },
          ]},
          { name: 'Box Jump', sets: [
            { setNumber: 1, weight: 0, reps: 10, isWarmup: false },
            { setNumber: 2, weight: 0, reps: 10, isWarmup: false },
            { setNumber: 3, weight: 0, reps: 10, isWarmup: false },
          ]},
          { name: 'Walking Lunges', sets: [
            { setNumber: 1, weight: 0, reps: 10, isWarmup: false },
            { setNumber: 2, weight: 0, reps: 10, isWarmup: false },
          ]},
          { name: 'Leg Extension', sets: [
            { setNumber: 1, weight: 90, reps: 12, isWarmup: false },
            { setNumber: 2, weight: 90, reps: 12, isWarmup: false },
          ]},
          { name: 'DB Single arm Suitcase Carry', sets: [
            { setNumber: 1, weight: 0, reps: 61, isWarmup: false },
            { setNumber: 2, weight: 0, reps: 85, isWarmup: false },
          ]},
          { name: 'Superman lift', sets: [
            { setNumber: 1, weight: 0, reps: 10, isWarmup: false },
            { setNumber: 2, weight: 0, reps: 10, isWarmup: false },
          ]},
          { name: 'DB V up', sets: [
            { setNumber: 1, weight: 5, reps: 10, isWarmup: false },
            { setNumber: 2, weight: 10, reps: 10, isWarmup: false },
          ]},
        ],
      },
    ],
  },
];
