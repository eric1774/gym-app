import { db, executeSql } from './database';
import {
  WeeklySnapshot,
  MuscleGroupProgress,
  ExerciseInsights,
  SessionComparison,
  ExerciseHistorySet,
  ExerciseCategory,
} from '../types';

export interface SessionSetDetail {
  setNumber: number;
  weightLbs: number;
  reps: number;
  isWarmup: boolean;
  restSeconds: number | null;
}

// ── Helpers ─────────────────────────────────────────────────────────

/**
 * Returns the ISO string for Monday 00:00:00.000Z of the week containing `date`.
 */
export function getWeekStart(date: Date): string {
  const d = new Date(date);
  // getDay() returns 0=Sun, 1=Mon ... 6=Sat
  const day = d.getUTCDay();
  // Days to subtract to reach Monday (Sunday wraps to 6)
  const diff = day === 0 ? 6 : day - 1;
  d.setUTCDate(d.getUTCDate() - diff);
  d.setUTCHours(0, 0, 0, 0);
  return d.toISOString();
}

/**
 * Returns the ISO string for Monday 00:00:00.000Z of the week before `date`.
 */
export function getPreviousWeekStart(date: Date): string {
  const d = new Date(date);
  d.setUTCDate(d.getUTCDate() - 7);
  return getWeekStart(d);
}

// ── getWeeklySnapshot ────────────────────────────────────────────────

/**
 * Count completed sessions this week, PRs this week, and calculate
 * volume change vs the previous week.
 */
export async function getWeeklySnapshot(): Promise<WeeklySnapshot> {
  const database = await db;
  const now = new Date();
  const weekStart = getWeekStart(now);
  const prevWeekStart = getPreviousWeekStart(now);

  // Count completed sessions this week
  const sessionsResult = await executeSql(
    database,
    `SELECT COUNT(*) AS cnt
     FROM workout_sessions
     WHERE completed_at >= ?
       AND completed_at < ?`,
    [weekStart, getWeekStart(new Date(new Date(weekStart).getTime() + 7 * 24 * 60 * 60 * 1000))],
  );
  const sessionsThisWeek: number = sessionsResult.rows.item(0).cnt ?? 0;

  // Count PRs this week: exercises where best weight this week > all-time best before this week
  const prResult = await executeSql(
    database,
    `SELECT COUNT(DISTINCT ws.exercise_id) AS pr_count
     FROM workout_sets ws
     INNER JOIN workout_sessions wss ON wss.id = ws.session_id
     WHERE wss.completed_at >= ?
       AND wss.completed_at < ?
       AND (ws.is_warmup IS NULL OR ws.is_warmup = 0)
       AND ws.weight_kg > (
         SELECT COALESCE(MAX(ws2.weight_kg), 0)
         FROM workout_sets ws2
         INNER JOIN workout_sessions wss2 ON wss2.id = ws2.session_id
         WHERE ws2.exercise_id = ws.exercise_id
           AND wss2.completed_at < ?
           AND (ws2.is_warmup IS NULL OR ws2.is_warmup = 0)
       )`,
    [
      weekStart,
      getWeekStart(new Date(new Date(weekStart).getTime() + 7 * 24 * 60 * 60 * 1000)),
      weekStart,
    ],
  );
  const prsThisWeek: number = prResult.rows.item(0).pr_count ?? 0;

  // This week's volume
  const nextWeekStart = getWeekStart(new Date(new Date(weekStart).getTime() + 7 * 24 * 60 * 60 * 1000));
  const thisVolumeResult = await executeSql(
    database,
    `SELECT SUM(ws.weight_kg * ws.reps) AS volume
     FROM workout_sets ws
     INNER JOIN workout_sessions wss ON wss.id = ws.session_id
     WHERE wss.completed_at >= ?
       AND wss.completed_at < ?
       AND (ws.is_warmup IS NULL OR ws.is_warmup = 0)`,
    [weekStart, nextWeekStart],
  );
  const thisVolume: number | null = thisVolumeResult.rows.item(0).volume ?? null;

  // Previous week's volume
  const prevVolumeResult = await executeSql(
    database,
    `SELECT SUM(ws.weight_kg * ws.reps) AS volume
     FROM workout_sets ws
     INNER JOIN workout_sessions wss ON wss.id = ws.session_id
     WHERE wss.completed_at >= ?
       AND wss.completed_at < ?
       AND (ws.is_warmup IS NULL OR ws.is_warmup = 0)`,
    [prevWeekStart, weekStart],
  );
  const prevVolume: number | null = prevVolumeResult.rows.item(0).volume ?? null;

  let volumeChangePercent: number | null = null;
  if (prevVolume && prevVolume > 0 && thisVolume !== null) {
    volumeChangePercent = ((thisVolume - prevVolume) / prevVolume) * 100;
  }

  return { sessionsThisWeek, prsThisWeek, volumeChangePercent };
}

// ── getMuscleGroupProgress ───────────────────────────────────────────

/**
 * For each muscle group category with recent training data (within last 2 weeks),
 * return volume change vs previous week and PR flags.
 */
export async function getMuscleGroupProgress(): Promise<MuscleGroupProgress[]> {
  const database = await db;
  const now = new Date();
  const weekStart = getWeekStart(now);
  const prevWeekStart = getPreviousWeekStart(now);
  const nextWeekStart = getWeekStart(new Date(new Date(weekStart).getTime() + 7 * 24 * 60 * 60 * 1000));
  const twoWeeksAgo = new Date(new Date(prevWeekStart).getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();

  // This week's volume per category
  const thisWeekResult = await executeSql(
    database,
    `SELECT mg.parent_category AS category, SUM(ws.weight_kg * ws.reps) AS volume
     FROM workout_sets ws
     INNER JOIN workout_sessions wss ON wss.id = ws.session_id
     INNER JOIN exercise_muscle_groups emg ON emg.exercise_id = ws.exercise_id
     INNER JOIN muscle_groups mg ON mg.id = emg.muscle_group_id
     WHERE wss.completed_at >= ?
       AND wss.completed_at < ?
       AND (ws.is_warmup IS NULL OR ws.is_warmup = 0)
       AND emg.is_primary = 1
       AND mg.parent_category != 'stretching'
     GROUP BY mg.parent_category`,
    [weekStart, nextWeekStart],
  );

  // Last week's volume per category
  const lastWeekResult = await executeSql(
    database,
    `SELECT mg.parent_category AS category, SUM(ws.weight_kg * ws.reps) AS volume
     FROM workout_sets ws
     INNER JOIN workout_sessions wss ON wss.id = ws.session_id
     INNER JOIN exercise_muscle_groups emg ON emg.exercise_id = ws.exercise_id
     INNER JOIN muscle_groups mg ON mg.id = emg.muscle_group_id
     WHERE wss.completed_at >= ?
       AND wss.completed_at < ?
       AND (ws.is_warmup IS NULL OR ws.is_warmup = 0)
       AND emg.is_primary = 1
       AND mg.parent_category != 'stretching'
     GROUP BY mg.parent_category`,
    [prevWeekStart, weekStart],
  );

  // PRs this week per category
  const prResult = await executeSql(
    database,
    `SELECT DISTINCT mg.parent_category AS category
     FROM workout_sets ws
     INNER JOIN workout_sessions wss ON wss.id = ws.session_id
     INNER JOIN exercise_muscle_groups emg ON emg.exercise_id = ws.exercise_id
     INNER JOIN muscle_groups mg ON mg.id = emg.muscle_group_id
     WHERE wss.completed_at >= ?
       AND wss.completed_at < ?
       AND (ws.is_warmup IS NULL OR ws.is_warmup = 0)
       AND emg.is_primary = 1
       AND mg.parent_category != 'stretching'
       AND ws.weight_kg > (
         SELECT COALESCE(MAX(ws2.weight_kg), 0)
         FROM workout_sets ws2
         INNER JOIN workout_sessions wss2 ON wss2.id = ws2.session_id
         WHERE ws2.exercise_id = ws.exercise_id
           AND wss2.completed_at < ?
           AND (ws2.is_warmup IS NULL OR ws2.is_warmup = 0)
       )`,
    [weekStart, nextWeekStart, weekStart],
  );

  // Last trained per category (within last 2 weeks to determine "recently trained")
  const lastTrainedResult = await executeSql(
    database,
    `SELECT mg.parent_category AS category, MAX(wss.completed_at) AS last_trained_at
     FROM workout_sets ws
     INNER JOIN workout_sessions wss ON wss.id = ws.session_id
     INNER JOIN exercise_muscle_groups emg ON emg.exercise_id = ws.exercise_id
     INNER JOIN muscle_groups mg ON mg.id = emg.muscle_group_id
     WHERE wss.completed_at >= ?
       AND emg.is_primary = 1
       AND mg.parent_category != 'stretching'
     GROUP BY mg.parent_category`,
    [twoWeeksAgo],
  );

  // Build lookup maps
  const thisWeekVolume = new Map<string, number>();
  for (let i = 0; i < thisWeekResult.rows.length; i++) {
    const row = thisWeekResult.rows.item(i);
    thisWeekVolume.set(row.category, row.volume ?? 0);
  }

  const lastWeekVolume = new Map<string, number>();
  for (let i = 0; i < lastWeekResult.rows.length; i++) {
    const row = lastWeekResult.rows.item(i);
    lastWeekVolume.set(row.category, row.volume ?? 0);
  }

  const prCategories = new Set<string>();
  for (let i = 0; i < prResult.rows.length; i++) {
    prCategories.add(prResult.rows.item(i).category);
  }

  // Build result from categories with recent data
  const result: MuscleGroupProgress[] = [];
  for (let i = 0; i < lastTrainedResult.rows.length; i++) {
    const row = lastTrainedResult.rows.item(i);
    const category = row.category as string;
    const lastTrainedAt: string | null = row.last_trained_at ?? null;

    const thisVol = thisWeekVolume.get(category) ?? 0;
    const prevVol = lastWeekVolume.get(category) ?? 0;

    let volumeChangePercent: number | null = null;
    if (prevVol > 0 && thisVol > 0) {
      volumeChangePercent = ((thisVol - prevVol) / prevVol) * 100;
    }

    result.push({
      category: category as ExerciseCategory,
      volumeChangePercent,
      hasPR: prCategories.has(category),
      lastTrainedAt,
    });
  }

  return result;
}

// ── getExerciseInsights ──────────────────────────────────────────────

const PERIOD_MONTHS: Record<'1M' | '3M' | '6M' | '1Y', number> = {
  '1M': 1,
  '3M': 3,
  '6M': 6,
  '1Y': 12,
};

const PERIOD_LABELS: Record<'1M' | '3M' | '6M' | '1Y', string> = {
  '1M': '1 month',
  '3M': '3 months',
  '6M': '6 months',
  '1Y': '1 year',
};

/**
 * Compare current period's best weight and total volume to the previous
 * equivalent period for an exercise.
 */
export async function getExerciseInsights(
  exerciseId: number,
  timeRange: '1M' | '3M' | '6M' | '1Y',
): Promise<ExerciseInsights> {
  const database = await db;
  const periodLabel = PERIOD_LABELS[timeRange];
  const months = PERIOD_MONTHS[timeRange];

  const now = new Date();
  const periodStart = new Date(now);
  periodStart.setMonth(periodStart.getMonth() - months);
  const prevPeriodStart = new Date(periodStart);
  prevPeriodStart.setMonth(prevPeriodStart.getMonth() - months);

  // Current period: best weight + total volume for non-warmup sets
  const currentResult = await executeSql(
    database,
    `SELECT MAX(ws.weight_kg) AS best_weight_kg,
            SUM(ws.weight_kg * ws.reps) AS volume
     FROM workout_sets ws
     INNER JOIN workout_sessions wss ON wss.id = ws.session_id
     WHERE ws.exercise_id = ?
       AND wss.completed_at >= ?
       AND wss.completed_at < ?
       AND (ws.is_warmup IS NULL OR ws.is_warmup = 0)`,
    [exerciseId, periodStart.toISOString(), now.toISOString()],
  );

  // Previous period
  const prevResult = await executeSql(
    database,
    `SELECT MAX(ws.weight_kg) AS best_weight_kg,
            SUM(ws.weight_kg * ws.reps) AS volume
     FROM workout_sets ws
     INNER JOIN workout_sessions wss ON wss.id = ws.session_id
     WHERE ws.exercise_id = ?
       AND wss.completed_at >= ?
       AND wss.completed_at < ?
       AND (ws.is_warmup IS NULL OR ws.is_warmup = 0)`,
    [exerciseId, prevPeriodStart.toISOString(), periodStart.toISOString()],
  );

  const currentRow = currentResult.rows.item(0);
  const prevRow = prevResult.rows.item(0);

  const currentWeightKg: number | null = currentRow.best_weight_kg ?? null;
  const currentVolume: number | null = currentRow.volume ?? null;
  const prevWeightKg: number | null = prevRow.best_weight_kg ?? null;
  const prevVolume: number | null = prevRow.volume ?? null;

  let weightChangePercent: number | null = null;
  if (currentWeightKg !== null && prevWeightKg !== null && prevWeightKg > 0) {
    weightChangePercent = ((currentWeightKg - prevWeightKg) / prevWeightKg) * 100;
  }

  let volumeChangePercent: number | null = null;
  if (currentVolume !== null && prevVolume !== null && prevVolume > 0) {
    volumeChangePercent = ((currentVolume - prevVolume) / prevVolume) * 100;
  }

  return { weightChangePercent, volumeChangePercent, periodLabel };
}

// ── getSessionComparison ─────────────────────────────────────────────

function mapSets(rows: Record<string, unknown>[]): ExerciseHistorySet[] {
  return rows.map(row => ({
    setNumber: row.set_number as number,
    weightLbs: (row.weight_kg as number) * 2.20462,
    reps: row.reps as number,
    isWarmup: row.is_warmup === 1,
  }));
}

/**
 * Get a comparison of sets between the current session and a previous one.
 * mode='previous': most recent session for this exercise before the current one
 * mode='lastMonth': closest session to 30 days before the current one
 */
export async function getSessionComparison(
  sessionId: number,
  exerciseId: number,
  mode: 'previous' | 'lastMonth',
): Promise<SessionComparison | null> {
  const database = await db;

  // Get current session date
  const sessionResult = await executeSql(
    database,
    'SELECT completed_at FROM workout_sessions WHERE id = ?',
    [sessionId],
  );
  if (sessionResult.rows.length === 0) {
    return null;
  }
  const sessionDate: string = sessionResult.rows.item(0).completed_at;

  let comparisonResult;
  if (mode === 'previous') {
    // Most recent completed session with this exercise before current session
    comparisonResult = await executeSql(
      database,
      `SELECT DISTINCT wss.id, wss.completed_at
       FROM workout_sessions wss
       INNER JOIN workout_sets ws ON ws.session_id = wss.id
       WHERE ws.exercise_id = ?
         AND wss.completed_at < ?
         AND wss.completed_at IS NOT NULL
         AND wss.id != ?
       ORDER BY wss.completed_at DESC
       LIMIT 1`,
      [exerciseId, sessionDate, sessionId],
    );
  } else {
    // Session closest to 30 days before current session
    const targetDate = new Date(new Date(sessionDate).getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
    comparisonResult = await executeSql(
      database,
      `SELECT DISTINCT wss.id, wss.completed_at
       FROM workout_sessions wss
       INNER JOIN workout_sets ws ON ws.session_id = wss.id
       WHERE ws.exercise_id = ?
         AND wss.completed_at IS NOT NULL
         AND wss.id != ?
       ORDER BY ABS(JULIANDAY(wss.completed_at) - JULIANDAY(?))
       LIMIT 1`,
      [exerciseId, sessionId, targetDate],
    );
  }

  if (comparisonResult.rows.length === 0) {
    return null;
  }

  const comparisonSession = comparisonResult.rows.item(0);
  const comparisonSessionId: number = comparisonSession.id;
  const comparisonDate: string = comparisonSession.completed_at;
  const comparisonLabel = mode === 'previous' ? 'vs Previous Session' : 'vs Last Month';

  // Fetch current session sets
  const currentSetsResult = await executeSql(
    database,
    `SELECT set_number, weight_kg, reps, is_warmup
     FROM workout_sets
     WHERE session_id = ? AND exercise_id = ?
     ORDER BY set_number ASC`,
    [sessionId, exerciseId],
  );

  // Fetch comparison session sets
  const comparisonSetsResult = await executeSql(
    database,
    `SELECT set_number, weight_kg, reps, is_warmup
     FROM workout_sets
     WHERE session_id = ? AND exercise_id = ?
     ORDER BY set_number ASC`,
    [comparisonSessionId, exerciseId],
  );

  const currentRows: Record<string, unknown>[] = [];
  for (let i = 0; i < currentSetsResult.rows.length; i++) {
    currentRows.push(currentSetsResult.rows.item(i));
  }

  const comparisonRows: Record<string, unknown>[] = [];
  for (let i = 0; i < comparisonSetsResult.rows.length; i++) {
    comparisonRows.push(comparisonSetsResult.rows.item(i));
  }

  return {
    currentSets: mapSets(currentRows),
    comparisonSets: mapSets(comparisonRows),
    comparisonDate,
    comparisonLabel,
  };
}

// ── getSessionSetDetail ──────────────────────────────────────────────

/**
 * Return all sets for a session+exercise with rest times calculated from
 * logged_at timestamps. First set has restSeconds: null.
 */
export async function getSessionSetDetail(
  sessionId: number,
  exerciseId: number,
): Promise<SessionSetDetail[]> {
  const database = await db;

  const result = await executeSql(
    database,
    `SELECT set_number, weight_kg, reps, is_warmup, logged_at
     FROM workout_sets
     WHERE session_id = ? AND exercise_id = ?
     ORDER BY set_number ASC`,
    [sessionId, exerciseId],
  );

  const details: SessionSetDetail[] = [];
  for (let i = 0; i < result.rows.length; i++) {
    const row = result.rows.item(i);
    let restSeconds: number | null = null;

    if (i > 0) {
      const prevLoggedAt = result.rows.item(i - 1).logged_at as string;
      const currLoggedAt = row.logged_at as string;
      if (prevLoggedAt && currLoggedAt) {
        restSeconds = Math.floor(
          (new Date(currLoggedAt).getTime() - new Date(prevLoggedAt).getTime()) / 1000,
        );
      }
    }

    details.push({
      setNumber: row.set_number as number,
      weightLbs: (row.weight_kg as number) * 2.20462,
      reps: row.reps as number,
      isWarmup: row.is_warmup === 1,
      restSeconds,
    });
  }

  return details;
}
