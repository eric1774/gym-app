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

/**
 * Get the number of consecutive days (counting backwards from today) where the
 * user met or exceeded their protein goal.
 *
 * - If no goal is set, returns 0.
 * - Today counts if today's total already meets the goal.
 * - If today has meals but hasn't hit the goal, streak starts from yesterday.
 * - If today has no meals, streak starts from yesterday.
 * - Gap detection: a missing day between result rows means zero protein that day,
 *   which breaks the streak.
 *
 * @returns Number of consecutive goal-met days (0 if no streak)
 */
export async function getStreakDays(): Promise<number> {
  const goal = await getProteinGoal();
  if (goal === null) {
    return 0;
  }

  const database = await db;
  const today = getLocalDateString();

  const result = await executeSql(
    database,
    'SELECT local_date, SUM(protein_grams) as total FROM meals WHERE local_date <= ? GROUP BY local_date ORDER BY local_date DESC',
    [today],
  );

  if (result.rows.length === 0) {
    return 0;
  }

  let streak = 0;

  // Determine the starting expected date.
  // If the first row is today and it meets the goal, start from today.
  // Otherwise start from yesterday.
  const firstRow = result.rows.item(0);
  let startIndex = 0;
  let expectedDate: Date;

  if (firstRow.local_date === today) {
    if ((firstRow.total as number) >= goal) {
      // Today meets goal — count it and expect yesterday next
      streak = 1;
      startIndex = 1;
      const d = new Date();
      d.setDate(d.getDate() - 1);
      expectedDate = d;
    } else {
      // Today has meals but hasn't hit goal — skip today, start from yesterday
      startIndex = 1;
      const d = new Date();
      d.setDate(d.getDate() - 1);
      expectedDate = d;
    }
  } else {
    // Today has no meals — start from yesterday
    const d = new Date();
    d.setDate(d.getDate() - 1);
    expectedDate = d;
  }

  for (let i = startIndex; i < result.rows.length; i++) {
    const row = result.rows.item(i);
    const rowDate = row.local_date as string;
    const expectedDateStr = getLocalDateString(expectedDate);

    if (rowDate !== expectedDateStr) {
      // Gap detected — streak is broken
      break;
    }

    if ((row.total as number) >= goal) {
      streak++;
      expectedDate.setDate(expectedDate.getDate() - 1);
    } else {
      // Day didn't meet goal — streak broken
      break;
    }
  }

  return streak;
}

/**
 * Get the average daily protein intake across the last 7 days, only counting
 * days that have at least one logged meal.
 *
 * @returns Rounded average in grams, or null if no meals in the last 7 days
 */
export async function get7DayAverage(): Promise<number | null> {
  const database = await db;
  const today = getLocalDateString();

  // 7 days inclusive of today: today minus 6 days
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 6);
  const startDateStr = getLocalDateString(startDate);

  const result = await executeSql(
    database,
    'SELECT AVG(daily_total) as avg_protein FROM (SELECT SUM(protein_grams) as daily_total FROM meals WHERE local_date >= ? AND local_date <= ? GROUP BY local_date)',
    [startDateStr, today],
  );

  if (result.rows.length === 0) {
    return null;
  }

  const avgProtein = result.rows.item(0).avg_protein;
  if (avgProtein === null || avgProtein === undefined) {
    return null;
  }

  return Math.round(avgProtein as number);
}

/**
 * Get the most recent distinct meals, deduplicated by (description, protein_grams) pair.
 * Useful for quick-add buttons — shows the user's most frequently logged recent meals.
 *
 * @param limit - Maximum number of distinct meals to return (default 3)
 * @returns Array of distinct meal objects with description, proteinGrams, and mealType
 */
export async function getRecentDistinctMeals(
  limit: number = 3,
): Promise<Array<{ description: string; proteinGrams: number; mealType: MealType }>> {
  const database = await db;

  const result = await executeSql(
    database,
    `SELECT description, protein_grams, meal_type, MAX(logged_at) as latest
     FROM meals
     WHERE description != ''
     GROUP BY description, protein_grams
     ORDER BY latest DESC
     LIMIT ?`,
    [limit],
  );

  const meals: Array<{ description: string; proteinGrams: number; mealType: MealType }> = [];
  for (let i = 0; i < result.rows.length; i++) {
    const row = result.rows.item(i);
    meals.push({
      description: row.description as string,
      proteinGrams: row.protein_grams as number,
      mealType: row.meal_type as MealType,
    });
  }
  return meals;
}
