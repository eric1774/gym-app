import { db, executeSql } from './database';
import { Exercise, ExerciseCategory } from '../types';

/** Map a raw SQLite result row to the Exercise domain type. */
function rowToExercise(row: {
  id: number;
  name: string;
  category: string;
  default_rest_seconds: number;
  is_custom: number;
  created_at: string;
}): Exercise {
  return {
    id: row.id,
    name: row.name,
    category: row.category as ExerciseCategory,
    defaultRestSeconds: row.default_rest_seconds,
    isCustom: row.is_custom === 1,
    createdAt: row.created_at,
  };
}

/** Return all exercises, ordered by name. */
export async function getExercises(): Promise<Exercise[]> {
  const database = await db;
  const result = await executeSql(database, 'SELECT * FROM exercises ORDER BY name ASC');
  const exercises: Exercise[] = [];
  for (let i = 0; i < result.rows.length; i++) {
    exercises.push(rowToExercise(result.rows.item(i)));
  }
  return exercises;
}

/** Return exercises filtered by category, ordered by name. */
export async function getExercisesByCategory(category: ExerciseCategory): Promise<Exercise[]> {
  const database = await db;
  const result = await executeSql(
    database,
    'SELECT * FROM exercises WHERE category = ? ORDER BY name ASC',
    [category],
  );
  const exercises: Exercise[] = [];
  for (let i = 0; i < result.rows.length; i++) {
    exercises.push(rowToExercise(result.rows.item(i)));
  }
  return exercises;
}

/**
 * Insert a new custom exercise and return the inserted row.
 * Custom exercises are always marked is_custom = 1.
 */
export async function addExercise(
  name: string,
  category: ExerciseCategory,
  defaultRestSeconds: number = 90,
): Promise<Exercise> {
  const database = await db;
  const createdAt = new Date().toISOString();
  const result = await executeSql(
    database,
    'INSERT INTO exercises (name, category, default_rest_seconds, is_custom, created_at) VALUES (?, ?, ?, 1, ?)',
    [name, category, defaultRestSeconds, createdAt],
  );
  const insertedId = result.insertId;
  const row = await executeSql(database, 'SELECT * FROM exercises WHERE id = ?', [insertedId]);
  return rowToExercise(row.rows.item(0));
}

/**
 * Delete a custom exercise.
 * Throws if the exercise is a preset (is_custom = 0).
 */
export async function deleteExercise(id: number): Promise<void> {
  const database = await db;
  const check = await executeSql(database, 'SELECT is_custom FROM exercises WHERE id = ?', [id]);
  if (check.rows.length === 0) {
    throw new Error(`Exercise ${id} not found`);
  }
  const isCustom: number = check.rows.item(0).is_custom;
  if (isCustom !== 1) {
    throw new Error(`Cannot delete preset exercise ${id}. Only custom exercises can be deleted.`);
  }
  await executeSql(database, 'DELETE FROM exercises WHERE id = ?', [id]);
}

/** Case-insensitive name search across all categories. */
export async function searchExercises(query: string): Promise<Exercise[]> {
  const database = await db;
  const result = await executeSql(
    database,
    'SELECT * FROM exercises WHERE name LIKE ? ORDER BY name ASC',
    [`%${query}%`],
  );
  const exercises: Exercise[] = [];
  for (let i = 0; i < result.rows.length; i++) {
    exercises.push(rowToExercise(result.rows.item(i)));
  }
  return exercises;
}
