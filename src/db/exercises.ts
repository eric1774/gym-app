import { db, executeSql } from './database';
import { Exercise, ExerciseCategory, ExerciseMeasurementType } from '../types';

/** Map a raw SQLite result row to the Exercise domain type. */
export function rowToExercise(row: {
  id: number;
  name: string;
  category: string;
  default_rest_seconds: number;
  is_custom: number;
  measurement_type: string;
  created_at: string;
}): Exercise {
  return {
    id: row.id,
    name: row.name,
    category: row.category as ExerciseCategory,
    defaultRestSeconds: row.default_rest_seconds,
    isCustom: row.is_custom === 1,
    measurementType: (row.measurement_type as ExerciseMeasurementType) || 'reps',
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
  measurementType: ExerciseMeasurementType = 'reps',
): Promise<Exercise> {
  const database = await db;
  const createdAt = new Date().toISOString();
  const result = await executeSql(
    database,
    'INSERT INTO exercises (name, category, default_rest_seconds, is_custom, measurement_type, created_at) VALUES (?, ?, ?, 1, ?, ?)',
    [name, category, defaultRestSeconds, measurementType, createdAt],
  );
  const insertedId = result.insertId;
  const row = await executeSql(database, 'SELECT * FROM exercises WHERE id = ?', [insertedId]);
  return rowToExercise(row.rows.item(0));
}

/**
 * Delete an exercise by id.
 */
export async function deleteExercise(id: number): Promise<void> {
  const database = await db;
  await executeSql(database, 'DELETE FROM exercises WHERE id = ?', [id]);
}

/** Update an exercise's name, category and/or measurement type. */
export async function updateExercise(
  id: number,
  name: string,
  category: ExerciseCategory,
  measurementType: ExerciseMeasurementType,
): Promise<Exercise> {
  const database = await db;
  await executeSql(
    database,
    'UPDATE exercises SET name = ?, category = ?, measurement_type = ? WHERE id = ?',
    [name, category, measurementType, id],
  );
  const row = await executeSql(database, 'SELECT * FROM exercises WHERE id = ?', [id]);
  return rowToExercise(row.rows.item(0));
}

/** Update an exercise's default rest duration (seconds). */
export async function updateDefaultRestSeconds(
  exerciseId: number,
  restSeconds: number,
): Promise<void> {
  const database = await db;
  await executeSql(
    database,
    'UPDATE exercises SET default_rest_seconds = ? WHERE id = ?',
    [restSeconds, exerciseId],
  );
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
