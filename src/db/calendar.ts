import { db, executeSql } from './database';
import { CalendarDaySession, CalendarSessionDetail, CalendarExerciseDetail, CalendarSetDetail } from '../types';
import { getLocalDateString } from '../utils/dates';

/**
 * Returns all days in the given month (1-indexed) that had at least one
 * completed workout. Uses a UTC date range with a 1-day buffer on each side
 * to handle timezone offset edge cases, then filters in JS using local dates.
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

  const days: CalendarDaySession[] = [];
  for (const [date, sessionCount] of countsByDate) {
    days.push({ date, sessionCount });
  }
  // Sort by date ascending
  days.sort((a, b) => a.date.localeCompare(b.date));
  return days;
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
    const exerciseMap = new Map<number, { name: string; sets: { setNumber: number; weightKg: number; reps: number; isWarmup: boolean }[] }>();
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
        weightKg: row.weight_kg,
        reps: row.reps,
        isWarmup,
      });

      if (!isWarmup) {
        totalSets++;
        totalVolume += row.weight_kg * row.reps;
      }
    }

    // PR detection: for each non-warmup set, check if volume (weight_kg * reps)
    // exceeds the max volume for that exercise across working sets in prior sessions.
    // Consistent with Phase 10 decision: first-ever performance returns false (no baseline).
    const exercises: CalendarExerciseDetail[] = [];
    let prCount = 0;

    for (const exId of exerciseOrder) {
      const exData = exerciseMap.get(exId)!;

      // Get max volume per set for this exercise in ALL prior completed sessions
      const priorMaxResult = await executeSql(
        database,
        `SELECT MAX(ws.weight_kg * ws.reps) AS max_volume
         FROM workout_sets ws
         INNER JOIN workout_sessions wss ON wss.id = ws.session_id
         WHERE ws.exercise_id = ?
           AND ws.is_warmup = 0
           AND wss.completed_at IS NOT NULL
           AND wss.completed_at < ?`,
        [exId, session.completed_at],
      );

      const priorMax: number | null = priorMaxResult.rows.item(0).max_volume;

      const setDetails: CalendarSetDetail[] = exData.sets.map(s => {
        let isPR = false;
        if (!s.isWarmup && priorMax !== null) {
          isPR = (s.weightKg * s.reps) > priorMax;
          if (isPR) { prCount++; }
        }
        return {
          setNumber: s.setNumber,
          weightKg: s.weightKg,
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
