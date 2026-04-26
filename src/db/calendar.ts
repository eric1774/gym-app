import { db, executeSql } from './database';
import { CalendarDaySession, CalendarSessionDetail, CalendarExerciseDetail, CalendarSetDetail } from '../types';
import { getLocalDateString } from '../utils/dates';

/**
 * Returns all days in the given month (1-indexed) that had at least one
 * completed workout. Uses a UTC date range with a 1-day buffer on each side
 * to handle timezone offset edge cases, then filters in JS using local dates.
 *
 * Each result also flags `hasPR` — true if any non-warmup set on that date
 * set a new max for its (exercise_id, reps) pair vs. the chronologically
 * preceding history. PR detection is computed via a single chronological
 * pass over (a) all sets prior to the month aggregated as a per-(exId,reps)
 * running max baseline, then (b) all sets within the month range, walking
 * forward and updating the running max as each new max appears.
 *
 * @param year  Full year (e.g. 2026)
 * @param month 1-indexed month (1=January, 12=December)
 */
export async function getWorkoutDaysForMonth(
  year: number,
  month: number,
): Promise<CalendarDaySession[]> {
  const database = await db;

  // Build wide UTC boundaries with 1-day buffer on each end
  // Start: one day before the first of the month
  const rangeStart = new Date(year, month - 1, 0); // last day of prev month
  const rangeEnd = new Date(year, month, 2);        // 2nd day of next month

  const startStr = `${rangeStart.getFullYear()}-${String(rangeStart.getMonth() + 1).padStart(2, '0')}-${String(rangeStart.getDate()).padStart(2, '0')}`;
  const endStr   = `${rangeEnd.getFullYear()}-${String(rangeEnd.getMonth() + 1).padStart(2, '0')}-${String(rangeEnd.getDate()).padStart(2, '0')}`;

  const result = await executeSql(
    database,
    `SELECT id, completed_at
     FROM workout_sessions
     WHERE completed_at IS NOT NULL
       AND completed_at >= ?
       AND completed_at < ?
     ORDER BY completed_at ASC`,
    [startStr, endStr],
  );

  // Group by local date, filter to exact month
  const countsByDate = new Map<string, number>();
  for (let i = 0; i < result.rows.length; i++) {
    const row = result.rows.item(i);
    const localDate = getLocalDateString(new Date(row.completed_at));
    // Extract year/month from localDate to check membership
    const [rowYear, rowMonth] = localDate.split('-').map(Number);
    if (rowYear === year && rowMonth === month) {
      countsByDate.set(localDate, (countsByDate.get(localDate) ?? 0) + 1);
    }
  }

  const prDates = await computePRDatesForMonth(database, startStr, year, month);

  const days: CalendarDaySession[] = [];
  for (const [date, sessionCount] of countsByDate) {
    days.push({ date, sessionCount, hasPR: prDates.has(date) });
  }
  // Sort by date ascending
  days.sort((a, b) => a.date.localeCompare(b.date));
  return days;
}

/**
 * Identifies which dates within the target month had at least one PR set.
 * Pulls per-(exercise, reps) running maxes from before the range, then walks
 * the month's non-warmup sets in chronological order, marking dates whose
 * sets strictly exceeded the running max at the time of insertion.
 */
async function computePRDatesForMonth(
  database: Awaited<typeof db>,
  rangeStartStr: string,
  year: number,
  month: number,
): Promise<Set<string>> {
  // Prior maxima per (exercise, reps) for everything that completed before
  // the wide range start. This becomes the starting baseline for the walk.
  const priorMaxResult = await executeSql(
    database,
    `SELECT ws.exercise_id, ws.reps, MAX(ws.weight_kg) AS max_weight
     FROM workout_sets ws
     INNER JOIN workout_sessions wss ON wss.id = ws.session_id
     WHERE ws.is_warmup = 0
       AND wss.completed_at IS NOT NULL
       AND wss.completed_at < ?
     GROUP BY ws.exercise_id, ws.reps`,
    [rangeStartStr],
  );

  const runningMax = new Map<string, number>();
  for (let i = 0; i < priorMaxResult.rows.length; i++) {
    const row = priorMaxResult.rows.item(i);
    runningMax.set(`${row.exercise_id}|${row.reps}`, row.max_weight);
  }

  // All non-warmup sets within the range, ordered chronologically so the
  // running-max walk reflects the same temporal rule as the active-workout
  // PR check.
  const rangeEnd = new Date(year, month, 2);
  const endStr = `${rangeEnd.getFullYear()}-${String(rangeEnd.getMonth() + 1).padStart(2, '0')}-${String(rangeEnd.getDate()).padStart(2, '0')}`;

  const monthSetsResult = await executeSql(
    database,
    `SELECT ws.exercise_id, ws.reps, ws.weight_kg, ws.set_number, wss.completed_at
     FROM workout_sets ws
     INNER JOIN workout_sessions wss ON wss.id = ws.session_id
     WHERE ws.is_warmup = 0
       AND wss.completed_at IS NOT NULL
       AND wss.completed_at >= ?
       AND wss.completed_at < ?
     ORDER BY wss.completed_at ASC, ws.set_number ASC`,
    [rangeStartStr, endStr],
  );

  const prDates = new Set<string>();
  for (let i = 0; i < monthSetsResult.rows.length; i++) {
    const row = monthSetsResult.rows.item(i);
    const key = `${row.exercise_id}|${row.reps}`;
    const prior = runningMax.get(key);

    // First-ever performance at this rep count is not a PR (no baseline to beat).
    if (prior !== undefined && row.weight_kg > prior) {
      const localDate = getLocalDateString(new Date(row.completed_at));
      const [rowYear, rowMonth] = localDate.split('-').map(Number);
      if (rowYear === year && rowMonth === month) {
        prDates.add(localDate);
      }
    }

    if (prior === undefined || row.weight_kg > prior) {
      runningMax.set(key, row.weight_kg);
    }
  }

  return prDates;
}

/**
 * Returns the local date string (YYYY-MM-DD) of the earliest completed session,
 * or null if no completed sessions exist.
 *
 * Used by CalendarScreen to determine the left-arrow disable boundary.
 */
export async function getFirstSessionDate(): Promise<string | null> {
  const database = await db;
  const result = await executeSql(
    database,
    'SELECT MIN(completed_at) AS earliest FROM workout_sessions WHERE completed_at IS NOT NULL',
  );
  if (result.rows.length === 0) {
    return null;
  }
  const earliest: string | null = result.rows.item(0).earliest;
  if (!earliest) {
    return null;
  }
  return getLocalDateString(new Date(earliest));
}

/**
 * Returns full session details for all completed sessions on the given local
 * date string (YYYY-MM-DD). Includes per-exercise set breakdowns and PR flags.
 */
export async function getDaySessionDetails(
  dateStr: string,
): Promise<CalendarSessionDetail[]> {
  const database = await db;

  // Fetch all completed sessions and filter to matching local date
  const allSessionsResult = await executeSql(
    database,
    `SELECT ws.id, ws.started_at, ws.completed_at, ws.program_day_id,
            ws.avg_hr, ws.peak_hr,
            pd.name AS program_day_name
     FROM workout_sessions ws
     LEFT JOIN program_days pd ON pd.id = ws.program_day_id
     WHERE ws.completed_at IS NOT NULL
     ORDER BY ws.completed_at ASC`,
  );

  const matchingSessions: {
    id: number;
    started_at: string;
    completed_at: string;
    program_day_name: string | null;
    avg_hr: number | null;
    peak_hr: number | null;
  }[] = [];

  for (let i = 0; i < allSessionsResult.rows.length; i++) {
    const row = allSessionsResult.rows.item(i);
    const localDate = getLocalDateString(new Date(row.completed_at));
    if (localDate === dateStr) {
      matchingSessions.push({
        id: row.id,
        started_at: row.started_at,
        completed_at: row.completed_at,
        program_day_name: row.program_day_name ?? null,
        avg_hr: row.avg_hr ?? null,
        peak_hr: row.peak_hr ?? null,
      });
    }
  }

  const details: CalendarSessionDetail[] = [];

  for (const session of matchingSessions) {
    const durationSeconds = Math.floor(
      (new Date(session.completed_at).getTime() - new Date(session.started_at).getTime()) / 1000,
    );

    // Get all sets for this session joined with exercises
    const setsResult = await executeSql(
      database,
      `SELECT ws.set_number, ws.weight_kg, ws.reps, ws.is_warmup,
              ws.exercise_id, e.name AS exercise_name
       FROM workout_sets ws
       JOIN exercises e ON e.id = ws.exercise_id
       WHERE ws.session_id = ?
       ORDER BY ws.exercise_id, ws.set_number ASC`,
      [session.id],
    );

    // Group sets by exercise
    const exerciseMap = new Map<number, { name: string; sets: { setNumber: number; weightLbs: number; reps: number; isWarmup: boolean }[] }>();
    const exerciseOrder: number[] = [];
    let totalSets = 0;
    let totalVolume = 0;

    for (let i = 0; i < setsResult.rows.length; i++) {
      const row = setsResult.rows.item(i);
      const exId: number = row.exercise_id;

      if (!exerciseMap.has(exId)) {
        exerciseMap.set(exId, { name: row.exercise_name, sets: [] });
        exerciseOrder.push(exId);
      }

      const isWarmup = row.is_warmup === 1;
      exerciseMap.get(exId)!.sets.push({
        setNumber: row.set_number,
        weightLbs: row.weight_kg,
        reps: row.reps,
        isWarmup,
      });

      if (!isWarmup) {
        totalSets++;
        totalVolume += row.weight_kg * row.reps;
      }
    }

    // PR detection: matches the active-workout rule in src/db/sets.ts#checkForPR.
    // A non-warmup set is a PR when its weight strictly exceeds the max weight ever
    // logged for that (exercise, reps) pair in earlier completed sessions AND the
    // max weight seen earlier at the same rep count within this same session.
    // First-ever performance returns false (no baseline to beat).
    const exercises: CalendarExerciseDetail[] = [];
    let prCount = 0;

    for (const exId of exerciseOrder) {
      const exData = exerciseMap.get(exId)!;

      // Max weight grouped by rep count across all prior completed sessions.
      const priorMaxResult = await executeSql(
        database,
        `SELECT ws.reps, MAX(ws.weight_kg) AS max_weight
         FROM workout_sets ws
         INNER JOIN workout_sessions wss ON wss.id = ws.session_id
         WHERE ws.exercise_id = ?
           AND ws.is_warmup = 0
           AND wss.completed_at IS NOT NULL
           AND wss.completed_at < ?
         GROUP BY ws.reps`,
        [exId, session.completed_at],
      );

      const priorMaxByReps = new Map<number, number>();
      for (let i = 0; i < priorMaxResult.rows.length; i++) {
        const row = priorMaxResult.rows.item(i);
        priorMaxByReps.set(row.reps, row.max_weight);
      }

      const inSessionMaxByReps = new Map<number, number>();

      const setDetails: CalendarSetDetail[] = exData.sets.map(s => {
        let isPR = false;
        if (!s.isWarmup) {
          const priorMax = priorMaxByReps.get(s.reps);
          const inSessionMax = inSessionMaxByReps.get(s.reps) ?? 0;
          if (priorMax !== undefined && s.weightLbs > priorMax && s.weightLbs > inSessionMax) {
            isPR = true;
            prCount++;
          }
          inSessionMaxByReps.set(s.reps, Math.max(inSessionMax, s.weightLbs));
        }
        return {
          setNumber: s.setNumber,
          weightLbs: s.weightLbs,
          reps: s.reps,
          isWarmup: s.isWarmup,
          isPR,
        };
      });

      exercises.push({
        exerciseId: exId,
        exerciseName: exData.name,
        sets: setDetails,
      });
    }

    details.push({
      sessionId: session.id,
      startedAt: session.started_at,
      completedAt: session.completed_at,
      programDayName: session.program_day_name,
      durationSeconds,
      totalSets,
      totalVolume,
      exerciseCount: exerciseOrder.length,
      prCount,
      exercises,
      avgHr: session.avg_hr,
      peakHr: session.peak_hr,
    });
  }

  return details;
}
