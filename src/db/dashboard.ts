import { db, executeSql } from './database';
import {
  ExerciseProgressPoint,
  ExerciseHistorySession,
  ExerciseHistorySet,
  ProgramDayCompletionStatus,
  SessionTimeSummary,
  FullDataExport,
  Exercise,
  ExerciseCategory,
  WorkoutSession,
  WorkoutSet,
  Program,
  ProgramDay,
  ProgramDayExercise,
} from '../types';

// ── Exercise Progress ───────────────────────────────────────────────

/**
 * For each completed session containing this exercise, return the set with
 * the highest weight (tiebreak: highest reps). Ordered oldest-first so
 * charting shows progression over time.
 */
export async function getExerciseProgressData(
  exerciseId: number,
): Promise<ExerciseProgressPoint[]> {
  const database = await db;
  const result = await executeSql(
    database,
    `SELECT ws.session_id, wss.completed_at AS date,
            ws.weight_kg AS best_weight_kg, ws.reps AS best_reps
     FROM workout_sets ws
     INNER JOIN workout_sessions wss ON wss.id = ws.session_id
     WHERE ws.exercise_id = ?
       AND wss.completed_at IS NOT NULL
       AND ws.id = (
         SELECT ws2.id FROM workout_sets ws2
         WHERE ws2.session_id = ws.session_id
           AND ws2.exercise_id = ws.exercise_id
         ORDER BY ws2.weight_kg DESC, ws2.reps DESC
         LIMIT 1
       )
     GROUP BY ws.session_id
     ORDER BY wss.completed_at ASC`,
    [exerciseId],
  );

  const points: ExerciseProgressPoint[] = [];
  for (let i = 0; i < result.rows.length; i++) {
    const row = result.rows.item(i);
    points.push({
      sessionId: row.session_id,
      date: row.date,
      bestWeightKg: row.best_weight_kg,
      bestReps: row.best_reps,
    });
  }
  return points;
}

// ── Exercise History ────────────────────────────────────────────────

/**
 * All completed sessions with sets for this exercise, most recent first.
 * Each session includes all its sets ordered by set_number.
 */
export async function getExerciseHistory(
  exerciseId: number,
): Promise<ExerciseHistorySession[]> {
  const database = await db;
  const result = await executeSql(
    database,
    `SELECT ws.session_id, wss.completed_at AS date,
            ws.set_number, ws.weight_kg, ws.reps, ws.is_warmup
     FROM workout_sets ws
     INNER JOIN workout_sessions wss ON wss.id = ws.session_id
     WHERE ws.exercise_id = ?
       AND wss.completed_at IS NOT NULL
     ORDER BY wss.completed_at DESC, ws.set_number ASC`,
    [exerciseId],
  );

  const sessionsMap = new Map<number, ExerciseHistorySession>();
  const sessionOrder: number[] = [];

  for (let i = 0; i < result.rows.length; i++) {
    const row = result.rows.item(i);
    const sid: number = row.session_id;

    if (!sessionsMap.has(sid)) {
      sessionsMap.set(sid, {
        sessionId: sid,
        date: row.date,
        sets: [],
      });
      sessionOrder.push(sid);
    }

    const set: ExerciseHistorySet = {
      setNumber: row.set_number,
      weightKg: row.weight_kg,
      reps: row.reps,
      isWarmup: row.is_warmup === 1,
    };
    sessionsMap.get(sid)!.sets.push(set);
  }

  return sessionOrder.map((sid) => sessionsMap.get(sid)!);
}

// ── Recently Trained Exercises ──────────────────────────────────────

/**
 * Exercises with logged sets, ordered by most recently trained.
 */
export async function getRecentlyTrainedExercises(): Promise<
  { exerciseId: number; exerciseName: string; category: string; lastTrainedAt: string }[]
> {
  const database = await db;
  const result = await executeSql(
    database,
    `SELECT e.id AS exercise_id, e.name AS exercise_name, e.category,
            MAX(ws.logged_at) AS last_trained_at
     FROM exercises e
     INNER JOIN workout_sets ws ON ws.exercise_id = e.id
     GROUP BY e.id
     ORDER BY last_trained_at DESC`,
  );

  const items: { exerciseId: number; exerciseName: string; category: string; lastTrainedAt: string }[] = [];
  for (let i = 0; i < result.rows.length; i++) {
    const row = result.rows.item(i);
    items.push({
      exerciseId: row.exercise_id,
      exerciseName: row.exercise_name,
      category: row.category,
      lastTrainedAt: row.last_trained_at,
    });
  }
  return items;
}

// ── Program Week Completion ─────────────────────────────────────────

/**
 * For each day in a program, check if a completed session exists within
 * the current week window.
 */
export async function getProgramWeekCompletion(
  programId: number,
): Promise<ProgramDayCompletionStatus[]> {
  const database = await db;

  const progResult = await executeSql(
    database,
    'SELECT start_date, current_week FROM programs WHERE id = ?',
    [programId],
  );
  if (progResult.rows.length === 0) {
    return [];
  }
  const prog = progResult.rows.item(0);
  const startDate: string | null = prog.start_date;

  const daysResult = await executeSql(
    database,
    'SELECT id, name FROM program_days WHERE program_id = ? ORDER BY sort_order',
    [programId],
  );

  if (!startDate) {
    const statuses: ProgramDayCompletionStatus[] = [];
    for (let i = 0; i < daysResult.rows.length; i++) {
      const day = daysResult.rows.item(i);
      statuses.push({
        dayId: day.id,
        dayName: day.name,
        isCompletedThisWeek: false,
        sessionId: null,
      });
    }
    return statuses;
  }

  const currentWeek: number = prog.current_week;
  const startMs = new Date(startDate).getTime();
  const weekStartMs = startMs + (currentWeek - 1) * 7 * 24 * 60 * 60 * 1000;
  const weekEndMs = weekStartMs + 7 * 24 * 60 * 60 * 1000;
  const weekStartISO = new Date(weekStartMs).toISOString();
  const weekEndISO = new Date(weekEndMs).toISOString();

  const statuses: ProgramDayCompletionStatus[] = [];
  for (let i = 0; i < daysResult.rows.length; i++) {
    const day = daysResult.rows.item(i);
    const sessionResult = await executeSql(
      database,
      `SELECT id FROM workout_sessions
       WHERE program_day_id = ?
         AND completed_at IS NOT NULL
         AND completed_at >= ?
         AND completed_at < ?
       ORDER BY completed_at DESC
       LIMIT 1`,
      [day.id, weekStartISO, weekEndISO],
    );

    const hasSession = sessionResult.rows.length > 0;
    statuses.push({
      dayId: day.id,
      dayName: day.name,
      isCompletedThisWeek: hasSession,
      sessionId: hasSession ? sessionResult.rows.item(0).id : null,
    });
  }
  return statuses;
}

// ── Session Time Summary ────────────────────────────────────────────

/**
 * Compute time breakdown for a completed session.
 * Returns null if session is not completed.
 */
export async function getSessionTimeSummary(
  sessionId: number,
): Promise<SessionTimeSummary | null> {
  const database = await db;

  const sessionResult = await executeSql(
    database,
    'SELECT started_at, completed_at FROM workout_sessions WHERE id = ?',
    [sessionId],
  );
  if (sessionResult.rows.length === 0) {
    return null;
  }
  const session = sessionResult.rows.item(0);
  if (!session.completed_at) {
    return null;
  }

  const totalSeconds = Math.floor(
    (new Date(session.completed_at).getTime() - new Date(session.started_at).getTime()) / 1000,
  );

  const setsResult = await executeSql(
    database,
    `SELECT exercise_id, logged_at
     FROM workout_sets
     WHERE session_id = ?
     ORDER BY exercise_id, logged_at ASC`,
    [sessionId],
  );

  const exerciseSets = new Map<number, string[]>();
  for (let i = 0; i < setsResult.rows.length; i++) {
    const row = setsResult.rows.item(i);
    const exId: number = row.exercise_id;
    if (!exerciseSets.has(exId)) {
      exerciseSets.set(exId, []);
    }
    exerciseSets.get(exId)!.push(row.logged_at);
  }

  let activeSeconds = 0;
  for (const [, timestamps] of exerciseSets) {
    if (timestamps.length <= 1) {
      activeSeconds += 30;
    } else {
      const first = new Date(timestamps[0]).getTime();
      const last = new Date(timestamps[timestamps.length - 1]).getTime();
      activeSeconds += Math.floor((last - first) / 1000);
    }
  }

  const restSeconds = Math.max(0, totalSeconds - activeSeconds);

  return { totalSeconds, activeSeconds, restSeconds };
}

// ── Full Data Export ────────────────────────────────────────────────

/**
 * Export all data as a nested JSON-friendly object.
 */
export async function exportAllData(): Promise<FullDataExport> {
  const database = await db;

  const exResult = await executeSql(database, 'SELECT * FROM exercises ORDER BY id');
  const exercises: Exercise[] = [];
  for (let i = 0; i < exResult.rows.length; i++) {
    const r = exResult.rows.item(i);
    exercises.push({
      id: r.id,
      name: r.name,
      category: r.category as ExerciseCategory,
      defaultRestSeconds: r.default_rest_seconds,
      isCustom: r.is_custom === 1,
      createdAt: r.created_at,
    });
  }

  const sessResult = await executeSql(database, 'SELECT * FROM workout_sessions ORDER BY id');
  const sessions: (WorkoutSession & { sets: WorkoutSet[] })[] = [];
  for (let i = 0; i < sessResult.rows.length; i++) {
    const r = sessResult.rows.item(i);
    const setsResult = await executeSql(
      database,
      'SELECT * FROM workout_sets WHERE session_id = ? ORDER BY set_number',
      [r.id],
    );
    const sets: WorkoutSet[] = [];
    for (let j = 0; j < setsResult.rows.length; j++) {
      const s = setsResult.rows.item(j);
      sets.push({
        id: s.id,
        sessionId: s.session_id,
        exerciseId: s.exercise_id,
        setNumber: s.set_number,
        weightKg: s.weight_kg,
        reps: s.reps,
        loggedAt: s.logged_at,
        isWarmup: s.is_warmup === 1,
      });
    }
    sessions.push({
      id: r.id,
      startedAt: r.started_at,
      completedAt: r.completed_at ?? null,
      programDayId: r.program_day_id ?? null,
      sets,
    });
  }

  const progResult = await executeSql(database, 'SELECT * FROM programs ORDER BY id');
  const programs: (Program & { days: (ProgramDay & { exercises: ProgramDayExercise[] })[] })[] = [];
  for (let i = 0; i < progResult.rows.length; i++) {
    const r = progResult.rows.item(i);
    const daysResult = await executeSql(
      database,
      'SELECT * FROM program_days WHERE program_id = ? ORDER BY sort_order',
      [r.id],
    );
    const days: (ProgramDay & { exercises: ProgramDayExercise[] })[] = [];
    for (let j = 0; j < daysResult.rows.length; j++) {
      const d = daysResult.rows.item(j);
      const exsResult = await executeSql(
        database,
        'SELECT * FROM program_day_exercises WHERE program_day_id = ? ORDER BY sort_order',
        [d.id],
      );
      const dayExercises: ProgramDayExercise[] = [];
      for (let k = 0; k < exsResult.rows.length; k++) {
        const e = exsResult.rows.item(k);
        dayExercises.push({
          id: e.id,
          programDayId: e.program_day_id,
          exerciseId: e.exercise_id,
          targetSets: e.target_sets,
          targetReps: e.target_reps,
          targetWeightKg: e.target_weight_kg,
          sortOrder: e.sort_order,
        });
      }
      days.push({
        id: d.id,
        programId: d.program_id,
        name: d.name,
        sortOrder: d.sort_order,
        createdAt: d.created_at,
        exercises: dayExercises,
      });
    }
    programs.push({
      id: r.id,
      name: r.name,
      weeks: r.weeks,
      startDate: r.start_date ?? null,
      currentWeek: r.current_week,
      createdAt: r.created_at,
      days,
    });
  }

  return {
    exportedAt: new Date().toISOString(),
    exercises,
    sessions,
    programs,
  };
}
