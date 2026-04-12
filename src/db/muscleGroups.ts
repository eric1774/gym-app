import { db, executeSql, runTransaction } from './database';
import { Exercise, ExerciseCategory, MuscleGroup } from '../types';
import { rowToExercise } from './exercises';

interface ExerciseMuscleGroupDetail {
  muscleGroupId: number;
  name: string;
  parentCategory: ExerciseCategory;
  isPrimary: boolean;
}

function rowToMuscleGroup(row: {
  id: number;
  name: string;
  parent_category: string;
  sort_order: number;
}): MuscleGroup {
  return {
    id: row.id,
    name: row.name,
    parentCategory: row.parent_category as ExerciseCategory,
    sortOrder: row.sort_order,
  };
}

/** Return all muscle groups ordered by parent_category then sort_order. */
export async function getAllMuscleGroups(): Promise<MuscleGroup[]> {
  const database = await db;
  const result = await executeSql(
    database,
    'SELECT * FROM muscle_groups ORDER BY parent_category, sort_order',
  );
  const groups: MuscleGroup[] = [];
  for (let i = 0; i < result.rows.length; i++) {
    groups.push(rowToMuscleGroup(result.rows.item(i)));
  }
  return groups;
}

/** Return muscle groups for a specific parent category. */
export async function getMuscleGroupsByCategory(
  category: ExerciseCategory,
): Promise<MuscleGroup[]> {
  const database = await db;
  const result = await executeSql(
    database,
    'SELECT * FROM muscle_groups WHERE parent_category = ? ORDER BY sort_order',
    [category],
  );
  const groups: MuscleGroup[] = [];
  for (let i = 0; i < result.rows.length; i++) {
    groups.push(rowToMuscleGroup(result.rows.item(i)));
  }
  return groups;
}

/** Return the muscle groups associated with an exercise, with names and categories. */
export async function getExerciseMuscleGroups(
  exerciseId: number,
): Promise<ExerciseMuscleGroupDetail[]> {
  const database = await db;
  const result = await executeSql(
    database,
    `SELECT emg.exercise_id, emg.muscle_group_id, emg.is_primary,
            mg.name, mg.parent_category, mg.sort_order
     FROM exercise_muscle_groups emg
     INNER JOIN muscle_groups mg ON mg.id = emg.muscle_group_id
     WHERE emg.exercise_id = ?
     ORDER BY emg.is_primary DESC, mg.sort_order`,
    [exerciseId],
  );
  const details: ExerciseMuscleGroupDetail[] = [];
  for (let i = 0; i < result.rows.length; i++) {
    const row = result.rows.item(i);
    details.push({
      muscleGroupId: row.muscle_group_id,
      name: row.name,
      parentCategory: row.parent_category as ExerciseCategory,
      isPrimary: row.is_primary === 1,
    });
  }
  return details;
}

/**
 * Replace all muscle group mappings for an exercise and sync the cached category.
 * @param exerciseId The exercise to update
 * @param mappings Array of { muscleGroupId, isPrimary } — exactly one should be primary
 */
export async function setExerciseMuscleGroups(
  exerciseId: number,
  mappings: Array<{ muscleGroupId: number; isPrimary: boolean }>,
): Promise<void> {
  const database = await db;
  await runTransaction(database, tx => {
    // Clear existing mappings
    tx.executeSql('DELETE FROM exercise_muscle_groups WHERE exercise_id = ?', [exerciseId]);

    // Insert new mappings
    for (const { muscleGroupId, isPrimary } of mappings) {
      tx.executeSql(
        'INSERT INTO exercise_muscle_groups (exercise_id, muscle_group_id, is_primary) VALUES (?, ?, ?)',
        [exerciseId, muscleGroupId, isPrimary ? 1 : 0],
      );
    }
  });

  // Sync cached category from primary muscle group
  const primary = mappings.find(m => m.isPrimary);
  if (primary) {
    await executeSql(
      database,
      `UPDATE exercises SET category = (
         SELECT mg.parent_category FROM muscle_groups mg WHERE mg.id = ?
       ) WHERE id = ?`,
      [primary.muscleGroupId, exerciseId],
    );
  }
}

/**
 * Find exercises matching the given muscle group IDs, excluding specific exercise IDs.
 * Returns exercises ranked by match count (exact matches first, then partial).
 */
export async function getExercisesByMuscleGroups(
  muscleGroupIds: number[],
  excludeExerciseIds: number[],
): Promise<Array<{ exercise: Exercise; matchCount: number }>> {
  const database = await db;
  const mgPlaceholders = muscleGroupIds.map(() => '?').join(',');
  const exPlaceholders = excludeExerciseIds.length > 0
    ? excludeExerciseIds.map(() => '?').join(',')
    : null;

  const sql = `
    SELECT e.*, COUNT(emg.muscle_group_id) as match_count
    FROM exercises e
    INNER JOIN exercise_muscle_groups emg ON emg.exercise_id = e.id
    WHERE emg.muscle_group_id IN (${mgPlaceholders})
    ${exPlaceholders ? `AND e.id NOT IN (${exPlaceholders})` : ''}
    GROUP BY e.id
    ORDER BY match_count DESC, e.name ASC
  `;

  const params = [
    ...muscleGroupIds,
    ...excludeExerciseIds,
  ];

  const result = await executeSql(database, sql, params);
  const matches: Array<{ exercise: Exercise; matchCount: number }> = [];
  for (let i = 0; i < result.rows.length; i++) {
    const row = result.rows.item(i);
    matches.push({
      exercise: rowToExercise(row),
      matchCount: row.match_count,
    });
  }
  return matches;
}

/**
 * Get exercises by parent category using muscle group join.
 * Returns exercises that have ANY muscle group in the given parent category.
 */
export async function getExercisesByCategoryViaGroups(
  category: ExerciseCategory,
): Promise<Exercise[]> {
  const database = await db;
  const result = await executeSql(
    database,
    `SELECT DISTINCT e.*
     FROM exercises e
     INNER JOIN exercise_muscle_groups emg ON emg.exercise_id = e.id
     INNER JOIN muscle_groups mg ON mg.id = emg.muscle_group_id
     WHERE mg.parent_category = ?
     ORDER BY e.name ASC`,
    [category],
  );
  const exercises: Exercise[] = [];
  for (let i = 0; i < result.rows.length; i++) {
    exercises.push(rowToExercise(result.rows.item(i)));
  }
  return exercises;
}
