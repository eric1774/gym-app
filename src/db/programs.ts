import { db, executeSql, runTransaction } from './database';
import { Program, ProgramDay, ProgramDayExercise, ProgramWeek, ProgramSelectorItem, WeekExerciseResolved } from '../types';

// ── Row mappers ─────────────────────────────────────────────────────

export function rowToProgram(row: {
  id: number;
  name: string;
  weeks: number;
  start_date: string | null;
  current_week: number;
  created_at: string;
  archived_at: string | null;
}): Program {
  return {
    id: row.id,
    name: row.name,
    weeks: row.weeks,
    startDate: row.start_date ?? null,
    currentWeek: row.current_week,
    createdAt: row.created_at,
    archivedAt: row.archived_at ?? null,
  };
}

export function rowToProgramDay(row: {
  id: number;
  program_id: number;
  name: string;
  sort_order: number;
  created_at: string;
}): ProgramDay {
  return {
    id: row.id,
    programId: row.program_id,
    name: row.name,
    sortOrder: row.sort_order,
    createdAt: row.created_at,
  };
}

export function rowToProgramDayExercise(row: {
  id: number;
  program_day_id: number;
  exercise_id: number;
  target_sets: number;
  target_reps: number;
  target_weight_kg: number;
  sort_order: number;
  superset_group_id: number | null;
  notes?: string | null;
}): ProgramDayExercise {
  return {
    id: row.id,
    programDayId: row.program_day_id,
    exerciseId: row.exercise_id,
    targetSets: row.target_sets,
    targetReps: row.target_reps,
    targetWeightLbs: row.target_weight_kg,
    sortOrder: row.sort_order,
    supersetGroupId: row.superset_group_id ?? null,
    notes: row.notes ?? null,
  };
}

export function rowToProgramWeek(row: {
  id: number;
  program_id: number;
  week_number: number;
  name: string | null;
  details: string | null;
}): ProgramWeek {
  return {
    id: row.id,
    programId: row.program_id,
    weekNumber: row.week_number,
    name: row.name ?? null,
    details: row.details ?? null,
  };
}

function rowToWeekExerciseResolved(row: any): WeekExerciseResolved {
  return {
    programDayExerciseId: row.program_day_exercise_id,
    exerciseId: row.exercise_id,
    sortOrder: row.sort_order,
    supersetGroupId: row.superset_group_id ?? null,
    sets: row.sets,
    reps: row.reps,
    weightLbs: row.weight_kg, // legacy: column named _kg, value stored in lbs
    notes: row.notes ?? null,
    overrideRowExists: Boolean(row.override_row_exists),
    setsOverridden: Boolean(row.sets_overridden),
    repsOverridden: Boolean(row.reps_overridden),
    weightOverridden: Boolean(row.weight_overridden),
    notesOverridden: Boolean(row.notes_overridden),
  };
}

// ── Program CRUD ────────────────────────────────────────────────────

/** Create a new program and return the inserted row. */
export async function createProgram(name: string, weeks: number): Promise<Program> {
  const database = await db;
  const createdAt = new Date().toISOString();
  const result = await executeSql(
    database,
    'INSERT INTO programs (name, weeks, start_date, current_week, created_at) VALUES (?, ?, NULL, 1, ?)',
    [name, weeks, createdAt],
  );
  const row = await executeSql(database, 'SELECT * FROM programs WHERE id = ?', [result.insertId]);
  return rowToProgram(row.rows.item(0));
}

/** Return all programs ordered by most recently created first. */
export async function getPrograms(): Promise<Program[]> {
  const database = await db;
  const result = await executeSql(database, 'SELECT * FROM programs ORDER BY created_at DESC');
  const programs: Program[] = [];
  for (let i = 0; i < result.rows.length; i++) {
    programs.push(rowToProgram(result.rows.item(i)));
  }
  return programs;
}

/** Return a single program by id, or null if not found. */
export async function getProgram(id: number): Promise<Program | null> {
  const database = await db;
  const result = await executeSql(database, 'SELECT * FROM programs WHERE id = ?', [id]);
  if (result.rows.length === 0) {
    return null;
  }
  return rowToProgram(result.rows.item(0));
}

/** Delete a program. CASCADE handles child rows. */
export async function deleteProgram(id: number): Promise<void> {
  const database = await db;
  await executeSql(database, 'DELETE FROM programs WHERE id = ?', [id]);
}

/** Activate a program by setting start_date to now. */
export async function activateProgram(id: number): Promise<void> {
  const database = await db;
  const startDate = new Date().toISOString();
  await executeSql(database, 'UPDATE programs SET start_date = ? WHERE id = ?', [startDate, id]);
}

/** Advance program current_week by 1, capped at total weeks. Returns new week value. */
export async function advanceWeek(id: number): Promise<number> {
  const database = await db;
  await executeSql(
    database,
    'UPDATE programs SET current_week = MIN(current_week + 1, weeks) WHERE id = ?',
    [id],
  );
  const result = await executeSql(database, 'SELECT current_week FROM programs WHERE id = ?', [id]);
  return result.rows.item(0).current_week as number;
}


/** Decrease program current_week by 1, floored at 1. Returns new week value. */
export async function decrementWeek(id: number): Promise<number> {
  const database = await db;
  await executeSql(
    database,
    'UPDATE programs SET current_week = MAX(current_week - 1, 1) WHERE id = ?',
    [id],
  );
  const result = await executeSql(database, 'SELECT current_week FROM programs WHERE id = ?', [id]);
  return result.rows.item(0).current_week as number;
}

// ── Program Day CRUD ────────────────────────────────────────────────

/** Return all days for a program, ordered by sort_order. */
export async function getProgramDays(programId: number): Promise<ProgramDay[]> {
  const database = await db;
  const result = await executeSql(
    database,
    'SELECT * FROM program_days WHERE program_id = ? ORDER BY sort_order',
    [programId],
  );
  const days: ProgramDay[] = [];
  for (let i = 0; i < result.rows.length; i++) {
    days.push(rowToProgramDay(result.rows.item(i)));
  }
  return days;
}

/** Create a new program day. sort_order = count of existing days + 1. */
export async function createProgramDay(programId: number, name: string): Promise<ProgramDay> {
  const database = await db;
  const createdAt = new Date().toISOString();
  const countResult = await executeSql(
    database,
    'SELECT COUNT(*) as cnt FROM program_days WHERE program_id = ?',
    [programId],
  );
  const sortOrder = (countResult.rows.item(0).cnt as number) + 1;
  const result = await executeSql(
    database,
    'INSERT INTO program_days (program_id, name, sort_order, created_at) VALUES (?, ?, ?, ?)',
    [programId, name, sortOrder, createdAt],
  );
  const row = await executeSql(database, 'SELECT * FROM program_days WHERE id = ?', [
    result.insertId,
  ]);
  return rowToProgramDay(row.rows.item(0));
}

/** Duplicate a program day (row + all its exercises). */
export async function duplicateProgramDay(dayId: number): Promise<ProgramDay> {
  const database = await db;

  // Fetch original day
  const origResult = await executeSql(database, 'SELECT * FROM program_days WHERE id = ?', [
    dayId,
  ]);
  const orig = origResult.rows.item(0);

  const createdAt = new Date().toISOString();
  const countResult = await executeSql(
    database,
    'SELECT COUNT(*) as cnt FROM program_days WHERE program_id = ?',
    [orig.program_id],
  );
  const sortOrder = (countResult.rows.item(0).cnt as number) + 1;

  // Insert copy day
  const insertResult = await executeSql(
    database,
    'INSERT INTO program_days (program_id, name, sort_order, created_at) VALUES (?, ?, ?, ?)',
    [orig.program_id, orig.name + ' (Copy)', sortOrder, createdAt],
  );
  const newDayId = insertResult.insertId;

  // Copy exercises — preserve superset groupings with new group IDs
  const exercises = await executeSql(
    database,
    'SELECT * FROM program_day_exercises WHERE program_day_id = ? ORDER BY sort_order',
    [dayId],
  );

  // Build a mapping from old group IDs to new group IDs
  const groupIdMap = new Map<number, number>();
  let groupOffset = 0;
  for (let i = 0; i < exercises.rows.length; i++) {
    const ex = exercises.rows.item(i);
    if (ex.superset_group_id !== null && ex.superset_group_id !== undefined) {
      if (!groupIdMap.has(ex.superset_group_id)) {
        groupIdMap.set(ex.superset_group_id, Date.now() + groupOffset);
        groupOffset += 1;
      }
    }
  }

  for (let i = 0; i < exercises.rows.length; i++) {
    const ex = exercises.rows.item(i);
    const oldGroupId: number | null = ex.superset_group_id ?? null;
    const newGroupId: number | null =
      oldGroupId !== null ? (groupIdMap.get(oldGroupId) ?? null) : null;
    await executeSql(
      database,
      'INSERT INTO program_day_exercises (program_day_id, exercise_id, target_sets, target_reps, target_weight_kg, sort_order, superset_group_id) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [newDayId, ex.exercise_id, ex.target_sets, ex.target_reps, ex.target_weight_kg, ex.sort_order, newGroupId],
    );
  }

  const row = await executeSql(database, 'SELECT * FROM program_days WHERE id = ?', [newDayId]);
  return rowToProgramDay(row.rows.item(0));
}

/** Delete a program day. CASCADE handles exercises. */
export async function deleteProgramDay(dayId: number): Promise<void> {
  const database = await db;
  await executeSql(database, 'DELETE FROM program_days WHERE id = ?', [dayId]);
}

/** Rename a program day. */
export async function renameProgramDay(dayId: number, name: string): Promise<void> {
  const database = await db;
  await executeSql(database, 'UPDATE program_days SET name = ? WHERE id = ?', [name, dayId]);
}

/** Rename a program. */
export async function renameProgram(id: number, name: string): Promise<void> {
  const database = await db;
  await executeSql(database, 'UPDATE programs SET name = ? WHERE id = ?', [name, id]);
}

/**
 * Update a program's total weeks. If shrinking (newWeeks < oldWeeks), cleans up
 * any per-week override rows that would be orphaned (week_number > newWeeks).
 */
export async function updateProgramWeeks(programId: number, newWeeks: number): Promise<void> {
  const database = await db;
  const cur = await executeSql(database, 'SELECT weeks FROM programs WHERE id = ?', [programId]);
  const old = cur.rows.length ? (cur.rows.item(0).weeks as number) : null;
  await executeSql(database, 'UPDATE programs SET weeks = ? WHERE id = ?', [newWeeks, programId]);
  if (old !== null && newWeeks < old) {
    await deleteOverridesBeyondWeek(programId, newWeeks);
  }
}

// ── Program Day Exercise CRUD ───────────────────────────────────────

/** Return all exercises for a program day, ordered by sort_order. */
export async function getProgramDayExercises(dayId: number): Promise<ProgramDayExercise[]> {
  const database = await db;
  const result = await executeSql(
    database,
    'SELECT * FROM program_day_exercises WHERE program_day_id = ? ORDER BY sort_order',
    [dayId],
  );
  const exercises: ProgramDayExercise[] = [];
  for (let i = 0; i < result.rows.length; i++) {
    exercises.push(rowToProgramDayExercise(result.rows.item(i)));
  }
  return exercises;
}

export async function getExercisesForWeekDay(
  programDayId: number,
  weekNumber: number,
): Promise<WeekExerciseResolved[]> {
  const database = await db;
  const result = await executeSql(
    database,
    `SELECT
       pde.id                                AS program_day_exercise_id,
       pde.exercise_id                       AS exercise_id,
       pde.sort_order                        AS sort_order,
       pde.superset_group_id                 AS superset_group_id,
       COALESCE(ov.override_sets,      pde.target_sets)       AS sets,
       COALESCE(ov.override_reps,      pde.target_reps)       AS reps,
       COALESCE(ov.override_weight_kg, pde.target_weight_kg)  AS weight_kg,
       COALESCE(ov.notes,              pde.notes)             AS notes,
       CASE WHEN ov.id IS NOT NULL THEN 1 ELSE 0 END               AS override_row_exists,
       CASE WHEN ov.override_sets      IS NOT NULL THEN 1 ELSE 0 END AS sets_overridden,
       CASE WHEN ov.override_reps      IS NOT NULL THEN 1 ELSE 0 END AS reps_overridden,
       CASE WHEN ov.override_weight_kg IS NOT NULL THEN 1 ELSE 0 END AS weight_overridden,
       CASE WHEN ov.notes              IS NOT NULL THEN 1 ELSE 0 END AS notes_overridden
     FROM program_day_exercises pde
     LEFT JOIN program_week_day_exercise_overrides ov
       ON  ov.program_day_exercise_id = pde.id
       AND ov.week_number = ?
     WHERE pde.program_day_id = ?
     ORDER BY pde.sort_order`,
    [weekNumber, programDayId],
  );
  const out: WeekExerciseResolved[] = [];
  for (let i = 0; i < result.rows.length; i++) {
    out.push(rowToWeekExerciseResolved(result.rows.item(i)));
  }
  return out;
}

/** Add an exercise to a program day. sort_order = count of existing + 1. */
export async function addExerciseToProgramDay(
  dayId: number,
  exerciseId: number,
  targetSets: number = 3,
  targetReps: number = 10,
  targetWeightLbs: number = 0,
): Promise<ProgramDayExercise> {
  const database = await db;
  const countResult = await executeSql(
    database,
    'SELECT COUNT(*) as cnt FROM program_day_exercises WHERE program_day_id = ?',
    [dayId],
  );
  const sortOrder = (countResult.rows.item(0).cnt as number) + 1;
  const result = await executeSql(
    database,
    'INSERT INTO program_day_exercises (program_day_id, exercise_id, target_sets, target_reps, target_weight_kg, sort_order) VALUES (?, ?, ?, ?, ?, ?)',
    [dayId, exerciseId, targetSets, targetReps, targetWeightLbs, sortOrder],
  );
  const row = await executeSql(database, 'SELECT * FROM program_day_exercises WHERE id = ?', [
    result.insertId,
  ]);
  return rowToProgramDayExercise(row.rows.item(0));
}

/** Remove an exercise from a program day by program_day_exercises.id. */
export async function removeExerciseFromProgramDay(id: number): Promise<void> {
  const database = await db;
  await executeSql(database, 'DELETE FROM program_day_exercises WHERE id = ?', [id]);
}

/** Update target sets, reps, and weight for a program day exercise. */
export async function updateExerciseTargets(
  id: number,
  targetSets: number,
  targetReps: number,
  targetWeightLbs: number,
): Promise<void> {
  const database = await db;
  await executeSql(
    database,
    'UPDATE program_day_exercises SET target_sets = ?, target_reps = ?, target_weight_kg = ? WHERE id = ?',
    [targetSets, targetReps, targetWeightLbs, id],
  );
}

/** Reorder days in a program. Updates sort_order based on array index. */
export async function reorderProgramDays(
  programId: number,
  orderedDayIds: number[],
): Promise<void> {
  const database = await db;
  await runTransaction(database, (tx) => {
    orderedDayIds.forEach((id, index) => {
      tx.executeSql(
        'UPDATE program_days SET sort_order = ? WHERE id = ? AND program_id = ?',
        [index, id, programId],
      );
    });
  });
}

/** Reorder exercises in a program day. Updates sort_order based on array index. */
export async function reorderProgramDayExercises(
  dayId: number,
  orderedIds: number[],
): Promise<void> {
  const database = await db;
  await runTransaction(database, (tx) => {
    orderedIds.forEach((id, index) => {
      tx.executeSql(
        'UPDATE program_day_exercises SET sort_order = ? WHERE id = ? AND program_day_id = ?',
        [index, id, dayId],
      );
    });
  });
}

/**
 * Group 2-3 exercises as a superset within a program day.
 * Assigns a shared group ID (Date.now()) to all specified exercise rows.
 */
export async function createSupersetGroup(
  dayId: number,
  exerciseIds: number[],
): Promise<void> {
  const groupId = Date.now();
  const database = await db;
  const placeholders = exerciseIds.map(() => '?').join(', ');
  await runTransaction(database, (tx) => {
    tx.executeSql(
      `UPDATE program_day_exercises SET superset_group_id = ? WHERE program_day_id = ? AND id IN (${placeholders})`,
      [groupId, dayId, ...exerciseIds],
    );
  });
}

/**
 * Remove a superset group from a program day.
 * Clears superset_group_id for all exercises that shared the given group ID.
 */
export async function removeSupersetGroup(
  dayId: number,
  groupId: number,
): Promise<void> {
  const database = await db;
  await executeSql(
    database,
    'UPDATE program_day_exercises SET superset_group_id = NULL WHERE program_day_id = ? AND superset_group_id = ?',
    [dayId, groupId],
  );
}

// ── Program Week Data ──────────────────────────────────────────────

/** Return the week name/details for a specific week, or null if not set. */
export async function getWeekData(
  programId: number,
  weekNumber: number,
): Promise<ProgramWeek | null> {
  const database = await db;
  const result = await executeSql(
    database,
    'SELECT * FROM program_weeks WHERE program_id = ? AND week_number = ?',
    [programId, weekNumber],
  );
  if (result.rows.length === 0) {
    return null;
  }
  return rowToProgramWeek(result.rows.item(0));
}

/** Insert or update week name/details. Deletes row if both are empty. */
export async function upsertWeekData(
  programId: number,
  weekNumber: number,
  name: string | null,
  details: string | null,
): Promise<void> {
  const database = await db;
  const trimmedName = name?.trim() || null;
  const trimmedDetails = details?.trim() || null;

  if (trimmedName === null && trimmedDetails === null) {
    await executeSql(
      database,
      'DELETE FROM program_weeks WHERE program_id = ? AND week_number = ?',
      [programId, weekNumber],
    );
    return;
  }

  await executeSql(
    database,
    `INSERT INTO program_weeks (program_id, week_number, name, details)
     VALUES (?, ?, ?, ?)
     ON CONFLICT(program_id, week_number)
     DO UPDATE SET name = excluded.name, details = excluded.details`,
    [programId, weekNumber, trimmedName, trimmedDetails],
  );
}

/** Return all week data for a program, ordered by week_number. */
export async function getAllWeekData(programId: number): Promise<ProgramWeek[]> {
  const database = await db;
  const result = await executeSql(
    database,
    'SELECT * FROM program_weeks WHERE program_id = ? ORDER BY week_number',
    [programId],
  );
  const weeks: ProgramWeek[] = [];
  for (let i = 0; i < result.rows.length; i++) {
    weeks.push(rowToProgramWeek(result.rows.item(i)));
  }
  return weeks;
}

export async function archiveProgram(programId: number): Promise<void> {
  const database = await db;
  await executeSql(
    database,
    'UPDATE programs SET archived_at = ? WHERE id = ?',
    [new Date().toISOString(), programId],
  );
}

export async function unarchiveProgram(programId: number): Promise<void> {
  const database = await db;
  await executeSql(
    database,
    'UPDATE programs SET archived_at = NULL WHERE id = ?',
    [programId],
  );
}

export async function getProgramsWithSessionData(): Promise<ProgramSelectorItem[]> {
  const database = await db;
  const result = await executeSql(
    database,
    `SELECT DISTINCT p.id, p.name, p.archived_at
     FROM programs p
     INNER JOIN program_days pd ON pd.program_id = p.id
     INNER JOIN workout_sessions ws ON ws.program_day_id = pd.id
     WHERE ws.completed_at IS NOT NULL
     ORDER BY
       CASE WHEN p.archived_at IS NULL THEN 0 ELSE 1 END,
       p.created_at DESC`,
    [],
  );

  const items: ProgramSelectorItem[] = [];
  for (let i = 0; i < result.rows.length; i++) {
    const row = result.rows.item(i);
    items.push({
      id: row.id,
      name: row.name,
      isArchived: row.archived_at !== null,
      archivedAt: row.archived_at ?? null,
    });
  }
  return items;
}

// ── Warmup Template ID for Program Days ────────────────────────────

export async function getWarmupTemplateIdForDay(
  dayId: number,
): Promise<number | null> {
  const database = await db;
  const result = await executeSql(
    database,
    'SELECT warmup_template_id FROM program_days WHERE id = ?',
    [dayId],
  );
  if (result.rows.length === 0) {
    return null;
  }
  return result.rows.item(0).warmup_template_id ?? null;
}

export async function setWarmupTemplateIdForDay(
  dayId: number,
  templateId: number,
): Promise<void> {
  const database = await db;
  await executeSql(
    database,
    'UPDATE program_days SET warmup_template_id = ? WHERE id = ?',
    [templateId, dayId],
  );
}

export async function clearWarmupTemplateIdForDay(
  dayId: number,
): Promise<void> {
  const database = await db;
  await executeSql(
    database,
    'UPDATE program_days SET warmup_template_id = NULL WHERE id = ?',
    [dayId],
  );
}

// ── Per-week Exercise Overrides ────────────────────────────────────

type OverrideField = 'sets' | 'reps' | 'weight' | 'notes';

const OVERRIDE_COLUMN: Record<OverrideField, string> = {
  sets: 'override_sets',
  reps: 'override_reps',
  weight: 'override_weight_kg',
  notes: 'notes',
};

export async function upsertOverride(args: {
  programDayExerciseId: number;
  weekNumber: number;
  field: OverrideField;
  value: number | string | null;
}): Promise<void> {
  const { programDayExerciseId, weekNumber, field, value } = args;
  const col = OVERRIDE_COLUMN[field];
  const now = new Date().toISOString();
  const database = await db;
  await executeSql(
    database,
    `INSERT INTO program_week_day_exercise_overrides
       (program_day_exercise_id, week_number, ${col}, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?)
     ON CONFLICT(program_day_exercise_id, week_number)
     DO UPDATE SET ${col} = excluded.${col}, updated_at = excluded.updated_at`,
    [programDayExerciseId, weekNumber, value, now, now],
  );
}

export async function revertOverrideField(args: {
  programDayExerciseId: number;
  weekNumber: number;
  field: OverrideField;
}): Promise<void> {
  const { programDayExerciseId, weekNumber, field } = args;
  const col = OVERRIDE_COLUMN[field];
  const now = new Date().toISOString();
  const database = await db;

  await executeSql(
    database,
    `UPDATE program_week_day_exercise_overrides
       SET ${col} = NULL, updated_at = ?
     WHERE program_day_exercise_id = ? AND week_number = ?`,
    [now, programDayExerciseId, weekNumber],
  );

  const check = await executeSql(
    database,
    `SELECT override_sets, override_reps, override_weight_kg, notes
       FROM program_week_day_exercise_overrides
      WHERE program_day_exercise_id = ? AND week_number = ?`,
    [programDayExerciseId, weekNumber],
  );
  if (check.rows.length === 0) { return; }
  const row = check.rows.item(0);
  const allNull = row.override_sets == null
    && row.override_reps == null
    && row.override_weight_kg == null
    && (row.notes == null || row.notes === '');
  if (!allNull) { return; }

  await executeSql(
    database,
    `DELETE FROM program_week_day_exercise_overrides
      WHERE program_day_exercise_id = ? AND week_number = ?`,
    [programDayExerciseId, weekNumber],
  );
}

export async function updateBaseNote(programDayExerciseId: number, notes: string | null): Promise<void> {
  const database = await db;
  await executeSql(
    database,
    'UPDATE program_day_exercises SET notes = ? WHERE id = ?',
    [notes, programDayExerciseId],
  );
}

export async function getWeekOverrideCounts(programId: number): Promise<Record<number, number>> {
  const database = await db;
  const result = await executeSql(
    database,
    `SELECT week_number, COUNT(*) AS override_count
       FROM program_week_day_exercise_overrides
       WHERE program_day_exercise_id IN (
         SELECT id FROM program_day_exercises
         WHERE program_day_id IN (SELECT id FROM program_days WHERE program_id = ?)
       )
       GROUP BY week_number`,
    [programId],
  );
  const out: Record<number, number> = {};
  for (let i = 0; i < result.rows.length; i++) {
    const row = result.rows.item(i);
    out[row.week_number] = row.override_count;
  }
  return out;
}

export async function deleteOverridesBeyondWeek(programId: number, newWeekCount: number): Promise<void> {
  const database = await db;
  await executeSql(
    database,
    `DELETE FROM program_week_day_exercise_overrides
      WHERE week_number > ?
        AND program_day_exercise_id IN (
          SELECT id FROM program_day_exercises
          WHERE program_day_id IN (SELECT id FROM program_days WHERE program_id = ?)
        )`,
    [newWeekCount, programId],
  );
}
