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
  NextWorkoutInfo,
  CategorySummary,
  CategoryExerciseProgress,
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

/**
 * For timed exercises: return the set with the longest duration (highest reps)
 * per completed session. Ordered oldest-first for charting.
 */
export async function getTimedExerciseProgressData(
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
         ORDER BY ws2.reps DESC
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

/** Delete all sets for a specific exercise in a session. */
export async function deleteExerciseHistorySession(
  sessionId: number,
  exerciseId: number,
): Promise<void> {
  const database = await db;
  await executeSql(
    database,
    'DELETE FROM workout_sets WHERE session_id = ? AND exercise_id = ?',
    [sessionId, exerciseId],
  );
}
// ── Recently Trained Exercises ──────────────────────────────────────

/**
 * Exercises with logged sets, ordered by most recently trained.
 */
export async function getRecentlyTrainedExercises(): Promise<
  { exerciseId: number; exerciseName: string; category: string; lastTrainedAt: string; measurementType: string }[]
> {
  const database = await db;
  const result = await executeSql(
    database,
    `SELECT e.id AS exercise_id, e.name AS exercise_name, e.category,
            e.measurement_type,
            MAX(ws.logged_at) AS last_trained_at
     FROM exercises e
     INNER JOIN workout_sets ws ON ws.exercise_id = e.id
     GROUP BY e.id
     ORDER BY last_trained_at DESC`,
  );

  const items: { exerciseId: number; exerciseName: string; category: string; lastTrainedAt: string; measurementType: string }[] = [];
  for (let i = 0; i < result.rows.length; i++) {
    const row = result.rows.item(i);
    items.push({
      exerciseId: row.exercise_id,
      exerciseName: row.exercise_name,
      category: row.category,
      lastTrainedAt: row.last_trained_at,
      measurementType: row.measurement_type ?? 'reps',
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
  const currentWeek: number = prog.current_week;

  const daysResult = await executeSql(
    database,
    'SELECT id, name FROM program_days WHERE program_id = ? ORDER BY sort_order',
    [programId],
  );

  const statuses: ProgramDayCompletionStatus[] = [];
  for (let i = 0; i < daysResult.rows.length; i++) {
    const day = daysResult.rows.item(i);
    const sessionResult = await executeSql(
      database,
      `SELECT id FROM workout_sessions
       WHERE program_day_id = ?
         AND completed_at IS NOT NULL
         AND program_week = ?
       ORDER BY completed_at DESC
       LIMIT 1`,
      [day.id, currentWeek],
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

/**
 * Count distinct completed workouts across all weeks for a program.
 * A workout counts once per (day, week) pair.
 */
export async function getProgramTotalCompleted(programId: number): Promise<number> {
  const database = await db;
  const result = await executeSql(
    database,
    `SELECT COUNT(*) AS cnt FROM (
       SELECT DISTINCT ws.program_day_id, ws.program_week
       FROM workout_sessions ws
       INNER JOIN program_days pd ON pd.id = ws.program_day_id
       WHERE pd.program_id = ?
         AND ws.completed_at IS NOT NULL
         AND ws.program_week IS NOT NULL
     )`,
    [programId],
  );
  return result.rows.item(0).cnt as number;
}

// ── Next Workout Day ────────────────────────────────────────────────

/**
 * Identify the next unfinished program day for the most recently used
 * activated program. Returns null if no activated programs exist.
 *
 * Logic:
 * 1. Find the most recently used program (via most recent workout session
 *    with a program_day_id). Fall back to most recently created activated
 *    program if no sessions exist.
 * 2. Get week completion status for that program.
 * 3. Return the first day not yet completed this week.
 *    If all days are done, return the first day (next week preview).
 */
export async function getNextWorkoutDay(): Promise<NextWorkoutInfo | null> {
  const database = await db;

  // Try to find the most recently used activated program via sessions
  let programId: number | null = null;
  let programName: string | null = null;

  const recentResult = await executeSql(
    database,
    `SELECT DISTINCT p.id, p.name
     FROM programs p
     INNER JOIN program_days pd ON pd.program_id = p.id
     INNER JOIN workout_sessions ws ON ws.program_day_id = pd.id
     WHERE p.start_date IS NOT NULL
     ORDER BY ws.started_at DESC
     LIMIT 1`,
  );

  if (recentResult.rows.length > 0) {
    const row = recentResult.rows.item(0);
    programId = row.id;
    programName = row.name;
  } else {
    // Fall back to most recently created activated program
    const fallbackResult = await executeSql(
      database,
      'SELECT id, name FROM programs WHERE start_date IS NOT NULL ORDER BY created_at DESC LIMIT 1',
    );
    if (fallbackResult.rows.length === 0) {
      return null;
    }
    const row = fallbackResult.rows.item(0);
    programId = row.id;
    programName = row.name;
  }

  if (programId === null || programName === null) {
    return null;
  }

  const dayStatuses = await getProgramWeekCompletion(programId);
  if (dayStatuses.length === 0) {
    return null;
  }

  // Find the first unfinished day; if all done, use first day
  const nextDay = dayStatuses.find(d => !d.isCompletedThisWeek) ?? dayStatuses[0];

  // Count exercises for the selected day
  const countResult = await executeSql(
    database,
    'SELECT COUNT(*) AS cnt FROM program_day_exercises WHERE program_day_id = ?',
    [nextDay.dayId],
  );
  const exerciseCount = countResult.rows.item(0).cnt as number;

  return {
    programId,
    programName,
    dayId: nextDay.dayId,
    dayName: nextDay.dayName,
    exerciseCount,
  };
}

/**
 * Unmark a program day as complete by removing all completed sessions for
 * that day within the current week window. Does a fresh DB query so it is
 * not dependent on any cached session IDs.
 */
export async function unmarkDayCompletion(
  programId: number,
  programDayId: number,
): Promise<void> {
  const database = await db;

  const progResult = await executeSql(
    database,
    'SELECT current_week FROM programs WHERE id = ?',
    [programId],
  );
  if (progResult.rows.length === 0) { return; }
  const currentWeek: number = progResult.rows.item(0).current_week;

  // Find all completed sessions for this day in the current week
  const sessions = await executeSql(
    database,
    `SELECT id FROM workout_sessions
     WHERE program_day_id = ?
       AND completed_at IS NOT NULL
       AND program_week = ?`,
    [programDayId, currentWeek],
  );

  for (let i = 0; i < sessions.rows.length; i++) {
    const sid = sessions.rows.item(i).id;
    await executeSql(database, 'DELETE FROM workout_sets WHERE session_id = ?', [sid]);
    await executeSql(database, 'DELETE FROM exercise_sessions WHERE session_id = ?', [sid]);
    await executeSql(database, 'DELETE FROM workout_sessions WHERE id = ?', [sid]);
  }
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

// ── Category Summaries ──────────────────────────────────────────────

/**
 * For each category that has training data, return a summary with
 * exercise count, sparkline of per-session max best values, last trained
 * date, and dominant measurement type. Uses a single SQL query with
 * JS-side grouping — no N+1 loops over categories.
 */
export async function getCategorySummaries(): Promise<CategorySummary[]> {
  const database = await db;
  const result = await executeSql(
    database,
    `SELECT e.id AS exercise_id, e.category, e.measurement_type,
            ws.session_id, wss.completed_at AS completed_at,
            ws.weight_kg, ws.reps
     FROM workout_sets ws
     INNER JOIN exercises e ON e.id = ws.exercise_id
     INNER JOIN workout_sessions wss ON wss.id = ws.session_id
     WHERE wss.completed_at IS NOT NULL
       AND ws.id = (
         SELECT ws2.id FROM workout_sets ws2
         WHERE ws2.session_id = ws.session_id
           AND ws2.exercise_id = ws.exercise_id
         ORDER BY ws2.weight_kg DESC, ws2.reps DESC
         LIMIT 1
       )
     GROUP BY ws.exercise_id, ws.session_id
     ORDER BY wss.completed_at ASC`,
  );

  // Group rows by category
  const categoryMap = new Map<string, {
    exerciseIds: Set<number>;
    sessions: Map<number, { completedAt: string; bestValue: number }>;
    measurementTypes: Map<string, number>;
  }>();

  for (let i = 0; i < result.rows.length; i++) {
    const row = result.rows.item(i);
    const category: string = row.category;
    const measurementType: string = row.measurement_type ?? 'reps';
    const bestValue = measurementType === 'timed' ? row.reps : row.weight_kg;

    if (!categoryMap.has(category)) {
      categoryMap.set(category, {
        exerciseIds: new Set(),
        sessions: new Map(),
        measurementTypes: new Map(),
      });
    }

    const cat = categoryMap.get(category)!;
    cat.exerciseIds.add(row.exercise_id);

    // Track measurement type counts for majority rule
    cat.measurementTypes.set(
      measurementType,
      (cat.measurementTypes.get(measurementType) ?? 0) + 1,
    );

    // Per-session: keep the max best value across all exercises in this category
    const sessionId: number = row.session_id;
    const existing = cat.sessions.get(sessionId);
    if (!existing || bestValue > existing.bestValue) {
      cat.sessions.set(sessionId, {
        completedAt: row.completed_at,
        bestValue,
      });
    }
  }

  const summaries: CategorySummary[] = [];
  for (const [category, data] of categoryMap) {
    // Sparkline: one point per session, ordered oldest-first (already ordered by SQL)
    const sparklinePoints: number[] = [];
    let lastTrainedAt = '';
    for (const session of data.sessions.values()) {
      sparklinePoints.push(session.bestValue);
      lastTrainedAt = session.completedAt;
    }

    // Majority rule for measurement type
    let dominantType: 'reps' | 'timed' = 'reps';
    let maxCount = 0;
    for (const [type, count] of data.measurementTypes) {
      if (count > maxCount) {
        maxCount = count;
        dominantType = type as 'reps' | 'timed';
      }
    }

    summaries.push({
      category: category as ExerciseCategory,
      exerciseCount: data.exerciseIds.size,
      sparklinePoints,
      lastTrainedAt,
      measurementType: dominantType,
    });
  }

  return summaries;
}

// ── Category Exercise Progress ──────────────────────────────────────

/**
 * For a single category, return per-exercise progress with sparkline,
 * current/previous bests, and last trained date. Supports optional time
 * range filtering. Uses a single SQL query with JS-side grouping.
 */
export async function getCategoryExerciseProgress(
  category: ExerciseCategory,
  timeRange?: '1M' | '3M' | '6M' | 'All',
): Promise<CategoryExerciseProgress[]> {
  const database = await db;

  let dateFilter = '';
  const params: (string | number)[] = [category];

  if (timeRange && timeRange !== 'All') {
    const now = new Date();
    const months = timeRange === '1M' ? 1 : timeRange === '3M' ? 3 : 6;
    now.setMonth(now.getMonth() - months);
    dateFilter = 'AND wss.completed_at >= ?';
    params.push(now.toISOString());
  }

  const result = await executeSql(
    database,
    `SELECT e.id AS exercise_id, e.name AS exercise_name, e.measurement_type,
            ws.session_id, wss.completed_at,
            ws.weight_kg, ws.reps
     FROM workout_sets ws
     INNER JOIN exercises e ON e.id = ws.exercise_id
     INNER JOIN workout_sessions wss ON wss.id = ws.session_id
     WHERE e.category = ?
       AND wss.completed_at IS NOT NULL
       ${dateFilter}
       AND ws.id = (
         SELECT ws2.id FROM workout_sets ws2
         WHERE ws2.session_id = ws.session_id
           AND ws2.exercise_id = ws.exercise_id
         ORDER BY ws2.weight_kg DESC, ws2.reps DESC
         LIMIT 1
       )
     GROUP BY ws.exercise_id, ws.session_id
     ORDER BY wss.completed_at ASC`,
    params,
  );

  // Group rows by exercise_id
  const exerciseMap = new Map<number, {
    exerciseName: string;
    measurementType: 'reps' | 'timed';
    points: { completedAt: string; bestValue: number }[];
  }>();

  for (let i = 0; i < result.rows.length; i++) {
    const row = result.rows.item(i);
    const exerciseId: number = row.exercise_id;
    const measurementType = (row.measurement_type ?? 'reps') as 'reps' | 'timed';
    const bestValue = measurementType === 'timed' ? row.reps : row.weight_kg;

    if (!exerciseMap.has(exerciseId)) {
      exerciseMap.set(exerciseId, {
        exerciseName: row.exercise_name,
        measurementType,
        points: [],
      });
    }

    exerciseMap.get(exerciseId)!.points.push({
      completedAt: row.completed_at,
      bestValue,
    });
  }

  const progressList: CategoryExerciseProgress[] = [];
  for (const [exerciseId, data] of exerciseMap) {
    const sparklinePoints = data.points.map(p => p.bestValue);
    const currentBest = sparklinePoints[sparklinePoints.length - 1];
    const previousBest = sparklinePoints.length >= 2
      ? sparklinePoints[sparklinePoints.length - 2]
      : null;
    const lastTrainedAt = data.points[data.points.length - 1].completedAt;

    progressList.push({
      exerciseId,
      exerciseName: data.exerciseName,
      measurementType: data.measurementType,
      sparklinePoints,
      currentBest,
      previousBest,
      lastTrainedAt,
    });
  }

  return progressList;
}

// ── Volume Query Functions ──────────────────────────────────────────

/**
 * For each completed session containing this exercise, return the total volume
 * (SUM of weight_kg * reps for non-warmup sets). Ordered oldest-first for charting.
 * Volume is stored in bestWeightKg field; bestReps is always 0.
 */
export async function getExerciseVolumeData(
  exerciseId: number,
): Promise<ExerciseProgressPoint[]> {
  const database = await db;
  const result = await executeSql(
    database,
    `SELECT ws.exercise_id, ws.session_id, wss.completed_at AS date,
            SUM(ws.weight_kg * ws.reps) AS volume
     FROM workout_sets ws
     INNER JOIN workout_sessions wss ON wss.id = ws.session_id
     WHERE ws.exercise_id = ?
       AND wss.completed_at IS NOT NULL
       AND ws.is_warmup = 0
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
      bestWeightKg: row.volume ?? 0,
      bestReps: 0,
    });
  }
  return points;
}

/**
 * For each category that has training data, return a volume summary with
 * exercise count, sparkline of per-session total volume (SUM weight_kg * reps),
 * last trained date. measurementType is always 'reps' for volume mode.
 */
export async function getCategoryVolumeSummaries(): Promise<CategorySummary[]> {
  const database = await db;
  const result = await executeSql(
    database,
    `SELECT e.id AS exercise_id, e.category, e.measurement_type,
            ws.session_id, wss.completed_at,
            SUM(ws.weight_kg * ws.reps) AS session_volume
     FROM workout_sets ws
     INNER JOIN exercises e ON e.id = ws.exercise_id
     INNER JOIN workout_sessions wss ON wss.id = ws.session_id
     WHERE wss.completed_at IS NOT NULL
       AND ws.is_warmup = 0
     GROUP BY e.id, ws.session_id
     ORDER BY wss.completed_at ASC`,
  );

  // Group by category, then by session_id
  const categoryMap = new Map<string, {
    exerciseIds: Set<number>;
    sessions: Map<number, { completedAt: string; volumeSum: number }>;
  }>();

  for (let i = 0; i < result.rows.length; i++) {
    const row = result.rows.item(i);
    const category: string = row.category;
    const sessionId: number = row.session_id;

    if (!categoryMap.has(category)) {
      categoryMap.set(category, {
        exerciseIds: new Set(),
        sessions: new Map(),
      });
    }

    const cat = categoryMap.get(category)!;
    cat.exerciseIds.add(row.exercise_id);

    const existing = cat.sessions.get(sessionId);
    if (existing) {
      existing.volumeSum += row.session_volume;  // sum across exercises in category
    } else {
      cat.sessions.set(sessionId, {
        completedAt: row.completed_at,
        volumeSum: row.session_volume,
      });
    }
  }

  const summaries: CategorySummary[] = [];
  for (const [category, data] of categoryMap) {
    const sparklinePoints: number[] = [];
    let lastTrainedAt = '';
    for (const session of data.sessions.values()) {
      sparklinePoints.push(session.volumeSum);
      lastTrainedAt = session.completedAt;
    }

    summaries.push({
      category: category as ExerciseCategory,
      exerciseCount: data.exerciseIds.size,
      sparklinePoints,
      lastTrainedAt,
      measurementType: 'reps',
    });
  }

  return summaries;
}

/**
 * For a single category, return per-exercise volume progress with sparkline,
 * current/previous bests (volume per session), and last trained date.
 * Supports optional time range filtering.
 */
export async function getCategoryExerciseVolumeProgress(
  category: ExerciseCategory,
  timeRange?: '1M' | '3M' | '6M' | 'All',
): Promise<CategoryExerciseProgress[]> {
  const database = await db;

  let dateFilter = '';
  const params: (string | number)[] = [category];

  if (timeRange && timeRange !== 'All') {
    const now = new Date();
    const months = timeRange === '1M' ? 1 : timeRange === '3M' ? 3 : 6;
    now.setMonth(now.getMonth() - months);
    dateFilter = 'AND wss.completed_at >= ?';
    params.push(now.toISOString());
  }

  const result = await executeSql(
    database,
    `SELECT e.id AS exercise_id, e.name AS exercise_name, e.measurement_type,
            ws.session_id, wss.completed_at,
            SUM(ws.weight_kg * ws.reps) AS session_volume
     FROM workout_sets ws
     INNER JOIN exercises e ON e.id = ws.exercise_id
     INNER JOIN workout_sessions wss ON wss.id = ws.session_id
     WHERE e.category = ?
       AND wss.completed_at IS NOT NULL
       AND ws.is_warmup = 0
       ${dateFilter}
     GROUP BY e.id, ws.session_id
     ORDER BY wss.completed_at ASC`,
    params,
  );

  // Group by exercise_id, then by session_id
  const exerciseMap = new Map<number, {
    exerciseName: string;
    sessions: Map<number, { completedAt: string; volumeSum: number }>;
  }>();

  for (let i = 0; i < result.rows.length; i++) {
    const row = result.rows.item(i);
    const exerciseId: number = row.exercise_id;
    const sessionId: number = row.session_id;

    if (!exerciseMap.has(exerciseId)) {
      exerciseMap.set(exerciseId, {
        exerciseName: row.exercise_name,
        sessions: new Map(),
      });
    }

    const ex = exerciseMap.get(exerciseId)!;
    const existing = ex.sessions.get(sessionId);
    if (existing) {
      existing.volumeSum += row.session_volume;  // should not happen with proper GROUP BY, but safe
    } else {
      ex.sessions.set(sessionId, {
        completedAt: row.completed_at,
        volumeSum: row.session_volume,
      });
    }
  }

  const progressList: CategoryExerciseProgress[] = [];
  for (const [exerciseId, data] of exerciseMap) {
    const points = Array.from(data.sessions.values());
    const sparklinePoints = points.map(p => p.volumeSum);
    const currentBest = sparklinePoints[sparklinePoints.length - 1];
    const previousBest = sparklinePoints.length >= 2
      ? sparklinePoints[sparklinePoints.length - 2]
      : null;
    const lastTrainedAt = points[points.length - 1].completedAt;

    progressList.push({
      exerciseId,
      exerciseName: data.exerciseName,
      measurementType: 'reps',
      sparklinePoints,
      currentBest,
      previousBest,
      lastTrainedAt,
    });
  }

  return progressList;
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
      measurementType: (r.measurement_type ?? 'reps') as 'reps' | 'timed',
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
      avgHr: r.avg_hr ?? null,
      peakHr: r.peak_hr ?? null,
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
          supersetGroupId: e.superset_group_id ?? null,
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
