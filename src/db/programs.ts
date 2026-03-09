import { db, executeSql, runTransaction } from './database';
import { Program, ProgramDay, ProgramDayExercise } from '../types';

// ── Row mappers ─────────────────────────────────────────────────────

function rowToProgram(row: {
  id: number;
  name: string;
  weeks: number;
  start_date: string | null;
  current_week: number;
  created_at: string;
}): Program {
  return {
    id: row.id,
    name: row.name,
    weeks: row.weeks,
    startDate: row.start_date ?? null,
    currentWeek: row.current_week,
    createdAt: row.created_at,
  };
}

function rowToProgramDay(row: {
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

function rowToProgramDayExercise(row: {
  id: number;
  program_day_id: number;
  exercise_id: number;
  target_sets: number;
  target_reps: number;
  target_weight_kg: number;
  sort_order: number;
}): ProgramDayExercise {
  return {
    id: row.id,
    programDayId: row.program_day_id,
    exerciseId: row.exercise_id,
    targetSets: row.target_sets,
    targetReps: row.target_reps,
    targetWeightKg: row.target_weight_kg,
    sortOrder: row.sort_order,
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

  // Copy exercises
  const exercises = await executeSql(
    database,
    'SELECT * FROM program_day_exercises WHERE program_day_id = ? ORDER BY sort_order',
    [dayId],
  );

  for (let i = 0; i < exercises.rows.length; i++) {
    const ex = exercises.rows.item(i);
    await executeSql(
      database,
      'INSERT INTO program_day_exercises (program_day_id, exercise_id, target_sets, target_reps, target_weight_kg, sort_order) VALUES (?, ?, ?, ?, ?, ?)',
      [newDayId, ex.exercise_id, ex.target_sets, ex.target_reps, ex.target_weight_kg, ex.sort_order],
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

/** Add an exercise to a program day. sort_order = count of existing + 1. */
export async function addExerciseToProgramDay(
  dayId: number,
  exerciseId: number,
  targetSets: number = 3,
  targetReps: number = 10,
  targetWeightKg: number = 0,
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
    [dayId, exerciseId, targetSets, targetReps, targetWeightKg, sortOrder],
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
  targetWeightKg: number,
): Promise<void> {
  const database = await db;
  await executeSql(
    database,
    'UPDATE program_day_exercises SET target_sets = ?, target_reps = ?, target_weight_kg = ? WHERE id = ?',
    [targetSets, targetReps, targetWeightKg, id],
  );
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
