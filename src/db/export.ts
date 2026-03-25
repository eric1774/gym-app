import { db, executeSql } from './database';
import {
  ProgramExport,
  ProgramExportWeek,
  ProgramExportDay,
  ProgramExportExercise,
  ProgramExportSet,
} from '../types';

/**
 * Export a program's completed workout data as a structured JSON object.
 *
 * Week numbers come from the stored program_week column, which is set to the
 * program's current_week at session creation time. Migration 9 repaired any
 * historical sessions that were incorrectly backfilled to week 1 by migration 5.
 *
 * Returns null if the program does not exist.
 * Returns a valid ProgramExport with empty weeks array if the program has no completed sessions.
 */
export async function exportProgramData(programId: number): Promise<ProgramExport | null> {
  const database = await db;

  // a) Fetch program metadata
  const programResult = await executeSql(
    database,
    'SELECT id, name, weeks FROM programs WHERE id = ?',
    [programId],
  );
  if (programResult.rows.length === 0) {
    return null;
  }
  const programRow = programResult.rows.item(0);
  const program = {
    id: programRow.id as number,
    name: programRow.name as string,
    weeks: programRow.weeks as number,
  };

  // b) Count total program days (denominator for completion %)
  const daysCountResult = await executeSql(
    database,
    'SELECT COUNT(*) as cnt FROM program_days WHERE program_id = ?',
    [programId],
  );
  const daysPerProgram = daysCountResult.rows.item(0).cnt as number;

  // c) Fetch ALL completed sessions for this program, ordered by week then completion time.
  //    Uses stored program_week which reflects the program's current_week at session creation.
  const sessionsResult = await executeSql(
    database,
    `SELECT ws.id AS session_id, ws.completed_at, ws.program_week,
            ws.program_day_id, pd.name AS day_name
     FROM workout_sessions ws
     INNER JOIN program_days pd ON pd.id = ws.program_day_id
     WHERE pd.program_id = ?
       AND ws.completed_at IS NOT NULL
       AND ws.program_week IS NOT NULL
     ORDER BY ws.program_week ASC, ws.completed_at ASC, ws.id ASC`,
    [programId],
  );

  // d) Group sessions by their stored program_week.
  const weeksMap = new Map<number, ProgramExportDay[]>();
  const distinctPairs = new Set<string>();

  for (let i = 0; i < sessionsResult.rows.length; i++) {
    const sessionRow = sessionsResult.rows.item(i);
    const sessionId = sessionRow.session_id as number;
    const dayId = sessionRow.program_day_id as number;
    const dayName = sessionRow.day_name as string;
    const completedAt = sessionRow.completed_at as string;
    const weekNumber = sessionRow.program_week as number;

    // Track distinct (day, week) pairs for completion %
    distinctPairs.add(`${dayId}-${weekNumber}`);

    const setsResult = await executeSql(
      database,
      `SELECT e.name AS exercise_name, wset.set_number, wset.weight_kg, wset.reps, wset.is_warmup, wset.exercise_id
       FROM workout_sets wset
       INNER JOIN exercises e ON e.id = wset.exercise_id
       WHERE wset.session_id = ?
       ORDER BY wset.logged_at ASC, wset.set_number ASC`,
      [sessionId],
    );

    // Group sets by exercise_id, preserving insertion order (Map preserves insertion order)
    const exerciseMap = new Map<number, { exerciseName: string; sets: ProgramExportSet[] }>();

    for (let j = 0; j < setsResult.rows.length; j++) {
      const setRow = setsResult.rows.item(j);
      const exerciseId = setRow.exercise_id as number;
      const exerciseName = setRow.exercise_name as string;

      if (!exerciseMap.has(exerciseId)) {
        exerciseMap.set(exerciseId, { exerciseName, sets: [] });
      }

      const exportSet: ProgramExportSet = {
        setNumber: setRow.set_number as number,
        weightLbs: setRow.weight_kg as number,
        reps: setRow.reps as number,
        isWarmup: setRow.is_warmup === 1,
      };
      exerciseMap.get(exerciseId)!.sets.push(exportSet);
    }

    const exercises: ProgramExportExercise[] = [];
    exerciseMap.forEach((exData) => {
      exercises.push({
        exerciseName: exData.exerciseName,
        sets: exData.sets,
      });
    });

    const day: ProgramExportDay = {
      dayName,
      completedAt,
      exercises,
    };

    if (!weeksMap.has(weekNumber)) {
      weeksMap.set(weekNumber, []);
    }
    weeksMap.get(weekNumber)!.push(day);
  }

  // e) Assemble weeks array sorted by week number
  const weeksArray: ProgramExportWeek[] = [];
  const sortedWeekNumbers = Array.from(weeksMap.keys()).sort((a, b) => a - b);
  sortedWeekNumbers.forEach((weekNumber) => {
    weeksArray.push({
      weekNumber,
      days: weeksMap.get(weekNumber)!,
    });
  });

  // f) Calculate completion percentage from calculated weeks
  let completionPercent = 0;
  if (daysPerProgram > 0 && program.weeks > 0) {
    completionPercent = Math.round((distinctPairs.size / (program.weeks * daysPerProgram)) * 100);
  }

  // g) Return the ProgramExport object
  return {
    programName: program.name,
    totalWeeks: program.weeks,
    completionPercent,
    exportedAt: new Date().toISOString(),
    weeks: weeksArray,
  };
}
