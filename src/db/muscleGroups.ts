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
 * Back-fill muscle group mappings for any exercises that have none.
 *
 * On a fresh install, seedIfEmpty() inserts exercises AFTER runMigrations(),
 * so migration 16/17's INSERT...SELECT finds zero exercises to map. This
 * function runs after seeding and fills the gap idempotently.
 */
export async function ensureMuscleGroupMappings(): Promise<void> {
  const database = await db;

  // Fast path: if no unmapped exercises exist, skip entirely.
  const unmapped = await executeSql(
    database,
    `SELECT COUNT(*) as cnt FROM exercises e
     WHERE e.id NOT IN (SELECT exercise_id FROM exercise_muscle_groups)`,
  );
  if (unmapped.rows.item(0).cnt === 0) {
    return;
  }

  // Same comprehensive mapping data used in migration 17.
  const mappings: Array<[string, Array<[string, string, number]>]> = [
    ['Bench Press', [['Chest', 'chest', 1], ['Triceps', 'arms', 0], ['Front Delts', 'shoulders', 0]]],
    ['Incline Bench Press', [['Upper Chest', 'chest', 1], ['Front Delts', 'shoulders', 0], ['Triceps', 'arms', 0]]],
    ['Cable Fly', [['Chest', 'chest', 1], ['Front Delts', 'shoulders', 0]]],
    ['Push-Up', [['Chest', 'chest', 1], ['Triceps', 'arms', 0], ['Front Delts', 'shoulders', 0], ['Abs', 'core', 0]]],
    ['Chest Dip', [['Lower Chest', 'chest', 1], ['Triceps', 'arms', 0], ['Front Delts', 'shoulders', 0]]],
    ['Decline Bench Press', [['Lower Chest', 'chest', 1], ['Triceps', 'arms', 0], ['Front Delts', 'shoulders', 0]]],
    ['Deadlift', [['Lower Back', 'back', 1], ['Glutes', 'legs', 1], ['Hamstrings', 'legs', 0], ['Quads', 'legs', 0], ['Traps', 'back', 0], ['Forearms', 'arms', 0]]],
    ['Pull-Up', [['Lats', 'back', 1], ['Biceps', 'arms', 0], ['Upper Back', 'back', 0], ['Forearms', 'arms', 0]]],
    ['Barbell Row', [['Upper Back', 'back', 1], ['Lats', 'back', 0], ['Biceps', 'arms', 0], ['Rear Delts', 'shoulders', 0], ['Forearms', 'arms', 0]]],
    ['Lat Pulldown', [['Lats', 'back', 1], ['Biceps', 'arms', 0], ['Upper Back', 'back', 0], ['Forearms', 'arms', 0]]],
    ['Cable Row', [['Upper Back', 'back', 1], ['Lats', 'back', 0], ['Biceps', 'arms', 0], ['Rear Delts', 'shoulders', 0]]],
    ['Face Pull', [['Rear Delts', 'shoulders', 1], ['Upper Back', 'back', 0], ['Biceps', 'arms', 0]]],
    ['Squat', [['Quads', 'legs', 1], ['Glutes', 'legs', 1], ['Hamstrings', 'legs', 0], ['Lower Back', 'back', 0], ['Abs', 'core', 0]]],
    ['Romanian Deadlift', [['Hamstrings', 'legs', 1], ['Glutes', 'legs', 1], ['Lower Back', 'back', 0], ['Forearms', 'arms', 0]]],
    ['Leg Press', [['Quads', 'legs', 1], ['Glutes', 'legs', 0], ['Hamstrings', 'legs', 0]]],
    ['Leg Curl', [['Hamstrings', 'legs', 1], ['Calves', 'legs', 0]]],
    ['Leg Extension', [['Quads', 'legs', 1]]],
    ['Calf Raise', [['Calves', 'legs', 1]]],
    ['Overhead Press', [['Front Delts', 'shoulders', 1], ['Side Delts', 'shoulders', 0], ['Triceps', 'arms', 0], ['Upper Chest', 'chest', 0]]],
    ['Lateral Raise', [['Side Delts', 'shoulders', 1]]],
    ['Front Raise', [['Front Delts', 'shoulders', 1], ['Upper Chest', 'chest', 0]]],
    ['Arnold Press', [['Front Delts', 'shoulders', 1], ['Side Delts', 'shoulders', 0], ['Triceps', 'arms', 0]]],
    ['Rear Delt Fly', [['Rear Delts', 'shoulders', 1], ['Upper Back', 'back', 0]]],
    ['Shrug', [['Traps', 'back', 1], ['Upper Back', 'back', 0]]],
    ['Bicep Curl', [['Biceps', 'arms', 1], ['Forearms', 'arms', 0]]],
    ['Hammer Curl', [['Biceps', 'arms', 1], ['Forearms', 'arms', 1]]],
    ['Tricep Pushdown', [['Triceps', 'arms', 1]]],
    ['Skull Crusher', [['Triceps', 'arms', 1]]],
    ['Preacher Curl', [['Biceps', 'arms', 1], ['Forearms', 'arms', 0]]],
    ['Dip', [['Triceps', 'arms', 1], ['Lower Chest', 'chest', 0], ['Front Delts', 'shoulders', 0]]],
    ['Plank', [['Abs', 'core', 1], ['Obliques', 'core', 0], ['Lower Back', 'core', 0]]],
    ['Crunch', [['Abs', 'core', 1]]],
    ['Hanging Leg Raise', [['Abs', 'core', 1], ['Hip Flexors', 'legs', 0], ['Obliques', 'core', 0]]],
    ['Cable Crunch', [['Abs', 'core', 1]]],
    ['Ab Wheel', [['Abs', 'core', 1], ['Lower Back', 'core', 0], ['Front Delts', 'shoulders', 0]]],
    ['Russian Twist', [['Obliques', 'core', 1], ['Abs', 'core', 0]]],
    ['Burpees', [['Cardio', 'conditioning', 1], ['Quads', 'legs', 0], ['Chest', 'chest', 0], ['Front Delts', 'shoulders', 0], ['Triceps', 'arms', 0]]],
    ['Rowing', [['Cardio', 'conditioning', 1], ['Upper Back', 'back', 0], ['Lats', 'back', 0], ['Biceps', 'arms', 0], ['Quads', 'legs', 0], ['Hamstrings', 'legs', 0]]],
    ['Jump Rope', [['Cardio', 'conditioning', 1], ['Calves', 'legs', 0], ['Forearms', 'arms', 0]]],
    ['Box Jumps', [['Plyometrics', 'conditioning', 1], ['Quads', 'legs', 0], ['Glutes', 'legs', 0], ['Calves', 'legs', 0], ['Hamstrings', 'legs', 0]]],
    ['Battle Ropes', [['Cardio', 'conditioning', 1], ['Front Delts', 'shoulders', 0], ['Abs', 'core', 0], ['Forearms', 'arms', 0]]],
    ['Mountain Climbers', [['Cardio', 'conditioning', 1], ['Abs', 'core', 0], ['Hip Flexors', 'legs', 0], ['Quads', 'legs', 0], ['Front Delts', 'shoulders', 0]]],
  ];

  await runTransaction(database, tx => {
    for (const [exerciseName, muscles] of mappings) {
      for (const [mgName, mgParent, isPrimary] of muscles) {
        tx.executeSql(
          `INSERT OR IGNORE INTO exercise_muscle_groups (exercise_id, muscle_group_id, is_primary)
           SELECT e.id, mg.id, ?
           FROM exercises e, muscle_groups mg
           WHERE e.name = ? AND mg.name = ? AND mg.parent_category = ?`,
          [isPrimary, exerciseName, mgName, mgParent],
        );
      }
    }

    // Catch-all: any exercise still unmapped gets the default muscle group for its category.
    const defaults: Array<[string, string, string]> = [
      ['chest', 'Chest', 'chest'],
      ['back', 'Lats', 'back'],
      ['legs', 'Quads', 'legs'],
      ['shoulders', 'Front Delts', 'shoulders'],
      ['arms', 'Biceps', 'arms'],
      ['core', 'Abs', 'core'],
      ['conditioning', 'Cardio', 'conditioning'],
    ];
    for (const [category, mgName, mgParent] of defaults) {
      tx.executeSql(
        `INSERT OR IGNORE INTO exercise_muscle_groups (exercise_id, muscle_group_id, is_primary)
         SELECT e.id, mg.id, 1
         FROM exercises e, muscle_groups mg
         WHERE e.category = ? AND mg.name = ? AND mg.parent_category = ?
           AND e.id NOT IN (SELECT exercise_id FROM exercise_muscle_groups)`,
        [category, mgName, mgParent],
      );
    }
  });
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
