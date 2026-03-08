import { db, executeSql } from './database';
import { Meal, MealType, ProteinSettings, ProteinChartPoint } from '../types';
import { getLocalDateString, getLocalDateTimeString } from '../utils/dates';

/** Map a raw SQLite result row to the Meal domain type. */
function rowToMeal(row: {
  id: number;
  protein_grams: number;
  description: string;
  meal_type: string;
  logged_at: string;
  local_date: string;
  created_at: string;
}): Meal {
  return {
    id: row.id,
    proteinGrams: row.protein_grams,
    description: row.description,
    mealType: row.meal_type as MealType,
    loggedAt: row.logged_at,
    localDate: row.local_date,
    createdAt: row.created_at,
  };
}

/** Map a raw SQLite result row to the ProteinSettings domain type. */
function rowToProteinSettings(row: {
  id: number;
  daily_goal_grams: number;
  created_at: string;
  updated_at: string;
}): ProteinSettings {
  return {
    id: row.id,
    dailyGoalGrams: row.daily_goal_grams,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * Add a new meal entry. Requires a protein goal to be set first.
 *
 * @param proteinGrams - Grams of protein for this meal
 * @param description - Free-text description of the meal
 * @param mealType - One of: breakfast, lunch, dinner, snack
 * @param loggedAt - When the meal was consumed; defaults to now
 * @returns The inserted Meal record
 * @throws Error if no protein goal has been set
 */
export async function addMeal(
  proteinGrams: number,
  description: string,
  mealType: MealType,
  loggedAt?: Date,
): Promise<Meal> {
  const goal = await getProteinGoal();
  if (goal === null) {
    throw new Error('Protein goal must be set before logging meals');
  }

  const database = await db;
  const effectiveDate = loggedAt ?? new Date();
  const localDate = getLocalDateString(effectiveDate);
  const loggedAtStr = getLocalDateTimeString(effectiveDate);
  const createdAt = getLocalDateTimeString(new Date());

  const result = await executeSql(
    database,
    'INSERT INTO meals (protein_grams, description, meal_type, logged_at, local_date, created_at) VALUES (?, ?, ?, ?, ?, ?)',
    [proteinGrams, description, mealType, loggedAtStr, localDate, createdAt],
  );

  const row = await executeSql(database, 'SELECT * FROM meals WHERE id = ?', [
    result.insertId,
  ]);
  return rowToMeal(row.rows.item(0));
}

/**
 * Update an existing meal entry.
 * Always recalculates local_date from loggedAt to ensure day-boundary correctness.
 */
export async function updateMeal(
  id: number,
  proteinGrams: number,
  description: string,
  mealType: MealType,
  loggedAt: Date,
): Promise<Meal> {
  const database = await db;
  const localDate = getLocalDateString(loggedAt);
  const loggedAtStr = getLocalDateTimeString(loggedAt);

  await executeSql(
    database,
    'UPDATE meals SET protein_grams = ?, description = ?, meal_type = ?, logged_at = ?, local_date = ? WHERE id = ?',
    [proteinGrams, description, mealType, loggedAtStr, localDate, id],
  );

  const row = await executeSql(database, 'SELECT * FROM meals WHERE id = ?', [id]);
  return rowToMeal(row.rows.item(0));
}

/**
 * Delete a meal entry by ID.
 */
export async function deleteMeal(id: number): Promise<void> {
  const database = await db;
  await executeSql(database, 'DELETE FROM meals WHERE id = ?', [id]);
}

/**
 * Get all meals for a given local date, ordered newest first.
 *
 * @param localDate - YYYY-MM-DD string in local timezone
 * @returns Array of Meal records for that date
 */
export async function getMealsByDate(localDate: string): Promise<Meal[]> {
  const database = await db;
  const result = await executeSql(
    database,
    'SELECT * FROM meals WHERE local_date = ? ORDER BY logged_at DESC',
    [localDate],
  );

  const meals: Meal[] = [];
  for (let i = 0; i < result.rows.length; i++) {
    meals.push(rowToMeal(result.rows.item(i)));
  }
  return meals;
}

/**
 * Get the current daily protein goal in grams, or null if none is set.
 */
export async function getProteinGoal(): Promise<number | null> {
  const database = await db;
  const result = await executeSql(
    database,
    'SELECT daily_goal_grams FROM protein_settings LIMIT 1',
  );

  if (result.rows.length === 0) {
    return null;
  }
  return result.rows.item(0).daily_goal_grams as number;
}

/**
 * Set (create or update) the daily protein goal.
 * Uses upsert pattern: inserts if no row exists, updates all rows otherwise.
 */
export async function setProteinGoal(goalGrams: number): Promise<ProteinSettings> {
  const database = await db;
  const now = getLocalDateTimeString(new Date());

  const countResult = await executeSql(
    database,
    'SELECT COUNT(*) as cnt FROM protein_settings',
  );
  const count = countResult.rows.item(0).cnt as number;

  if (count === 0) {
    await executeSql(
      database,
      'INSERT INTO protein_settings (daily_goal_grams, created_at, updated_at) VALUES (?, ?, ?)',
      [goalGrams, now, now],
    );
  } else {
    await executeSql(
      database,
      'UPDATE protein_settings SET daily_goal_grams = ?, updated_at = ?',
      [goalGrams, now],
    );
  }

  const row = await executeSql(
    database,
    'SELECT * FROM protein_settings LIMIT 1',
  );
  return rowToProteinSettings(row.rows.item(0));
}

/**
 * Get aggregated daily protein totals within a date range.
 * Each point includes the current protein goal for chart rendering.
 *
 * @param startDate - Start date (YYYY-MM-DD), inclusive
 * @param endDate - End date (YYYY-MM-DD), inclusive
 * @returns Array of ProteinChartPoint sorted by date ascending
 */
export async function getDailyProteinTotals(
  startDate: string,
  endDate: string,
): Promise<ProteinChartPoint[]> {
  const database = await db;
  const goalGrams = await getProteinGoal();

  const result = await executeSql(
    database,
    'SELECT local_date, SUM(protein_grams) as total_protein_grams FROM meals WHERE local_date >= ? AND local_date <= ? GROUP BY local_date ORDER BY local_date ASC',
    [startDate, endDate],
  );

  const points: ProteinChartPoint[] = [];
  for (let i = 0; i < result.rows.length; i++) {
    const row = result.rows.item(i);
    points.push({
      date: row.local_date as string,
      totalProteinGrams: row.total_protein_grams as number,
      goalGrams,
    });
  }
  return points;
}

/**
 * Get the total protein grams logged for today (local date).
 *
 * @returns Total protein grams for today, or 0 if no meals logged
 */
export async function getTodayProteinTotal(): Promise<number> {
  const database = await db;
  const today = getLocalDateString();

  const result = await executeSql(
    database,
    'SELECT COALESCE(SUM(protein_grams), 0) as total FROM meals WHERE local_date = ?',
    [today],
  );

  return result.rows.item(0).total as number;
}
