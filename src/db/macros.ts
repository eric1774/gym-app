import { db, executeSql } from './database';
import {
  MacroMeal,
  MacroSettings,
  MacroValues,
  MacroChartPoint,
  MacroLibraryMeal,
  MealType,
  MEAL_TYPES,
  CALORIES_PER_GRAM,
  MacrosExport,
  MacroGoalsSnapshot,
} from '../types';
import pkg from '../../package.json';
import { getLocalDateString, getLocalDateTimeString } from '../utils/dates';
import { computeCalories } from '../utils/macros';
import { emitAppEvent } from '../context/GamificationContext';

// ── Row mappers ──────────────────────────────────────────────────────

/** Map a raw SQLite result row to the MacroMeal domain type. */
export function rowToMacroMeal(row: {
  id: number;
  protein_grams: number;
  carb_grams: number;
  fat_grams: number;
  description: string;
  meal_type: string;
  logged_at: string;
  local_date: string;
  created_at: string;
}): MacroMeal {
  return {
    id: row.id,
    protein: row.protein_grams,
    carbs: row.carb_grams,
    fat: row.fat_grams,
    calories: computeCalories(row.protein_grams, row.carb_grams, row.fat_grams),
    description: row.description,
    mealType: row.meal_type as MealType,
    loggedAt: row.logged_at,
    localDate: row.local_date,
    createdAt: row.created_at,
  };
}

/** Map a raw SQLite result row to the MacroSettings domain type. */
export function rowToMacroSettings(row: {
  id: number;
  protein_goal: number | null;
  carb_goal: number | null;
  fat_goal: number | null;
  created_at: string;
  updated_at: string;
}): MacroSettings {
  return {
    id: row.id,
    proteinGoal: row.protein_goal,
    carbGoal: row.carb_goal,
    fatGoal: row.fat_goal,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/** Map a raw SQLite result row to the MacroLibraryMeal domain type. */
export function rowToMacroLibraryMeal(row: {
  id: number;
  name: string;
  protein_grams: number;
  carb_grams: number;
  fat_grams: number;
  meal_type: string;
  created_at: string;
}): MacroLibraryMeal {
  return {
    id: row.id,
    name: row.name,
    protein: row.protein_grams,
    carbs: row.carb_grams,
    fat: row.fat_grams,
    calories: computeCalories(row.protein_grams, row.carb_grams, row.fat_grams),
    mealType: row.meal_type as MealType,
    createdAt: row.created_at,
  };
}

// ── Meal CRUD ────────────────────────────────────────────────────────

/**
 * Add a new macro-aware meal entry. Requires macro goals to be set first.
 *
 * @param description - Free-text description of the meal
 * @param mealType - One of: breakfast, lunch, dinner, snack
 * @param macros - Object with protein, carbs, and fat in grams
 * @param loggedAt - When the meal was consumed; defaults to now
 * @returns The inserted MacroMeal record
 * @throws Error if no macro goals have been set
 */
export async function addMeal(
  description: string,
  mealType: MealType,
  macros: MacroValues,
  loggedAt?: Date,
): Promise<MacroMeal> {
  const goals = await getMacroGoals();
  if (goals === null) {
    throw new Error('Macro goals must be set before logging meals');
  }

  const database = await db;
  const effectiveDate = loggedAt ?? new Date();
  const localDate = getLocalDateString(effectiveDate);
  const loggedAtStr = getLocalDateTimeString(effectiveDate);
  const createdAt = getLocalDateTimeString(new Date());

  const result = await executeSql(
    database,
    'INSERT INTO meals (protein_grams, carb_grams, fat_grams, description, meal_type, logged_at, local_date, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    [macros.protein, macros.carbs, macros.fat, description, mealType, loggedAtStr, localDate, createdAt],
  );

  const row = await executeSql(database, 'SELECT * FROM meals WHERE id = ?', [result.insertId]);
  const meal = rowToMacroMeal(row.rows.item(0));
  emitAppEvent({ type: 'MEAL_LOGGED', timestamp: new Date().toISOString() });
  return meal;
}

/**
 * Update an existing macro-aware meal entry.
 * Always recalculates local_date from loggedAt to ensure day-boundary correctness.
 */
export async function updateMeal(
  id: number,
  description: string,
  mealType: MealType,
  macros: MacroValues,
  loggedAt: Date,
): Promise<MacroMeal> {
  const database = await db;
  const localDate = getLocalDateString(loggedAt);
  const loggedAtStr = getLocalDateTimeString(loggedAt);

  await executeSql(
    database,
    'UPDATE meals SET protein_grams = ?, carb_grams = ?, fat_grams = ?, description = ?, meal_type = ?, logged_at = ?, local_date = ? WHERE id = ?',
    [macros.protein, macros.carbs, macros.fat, description, mealType, loggedAtStr, localDate, id],
  );

  const row = await executeSql(database, 'SELECT * FROM meals WHERE id = ?', [id]);
  const meal = rowToMacroMeal(row.rows.item(0));
  emitAppEvent({ type: 'MEAL_LOGGED', timestamp: new Date().toISOString() });
  return meal;
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
 * @returns Array of MacroMeal records for that date
 */
export async function getMealsByDate(localDate: string): Promise<MacroMeal[]> {
  const database = await db;
  const result = await executeSql(
    database,
    'SELECT * FROM meals WHERE local_date = ? ORDER BY logged_at DESC',
    [localDate],
  );

  const meals: MacroMeal[] = [];
  for (let i = 0; i < result.rows.length; i++) {
    meals.push(rowToMacroMeal(result.rows.item(i)));
  }
  return meals;
}

// ── Macro Goals ──────────────────────────────────────────────────────

/**
 * Get the current macro goals, or null if none are set.
 */
export async function getMacroGoals(): Promise<MacroSettings | null> {
  const database = await db;
  const result = await executeSql(database, 'SELECT * FROM macro_settings LIMIT 1');

  if (result.rows.length === 0) {
    return null;
  }
  return rowToMacroSettings(result.rows.item(0));
}

/**
 * Set (create or update) macro goals.
 * Only updates provided fields — unprovided fields are left unchanged.
 * Uses upsert pattern: inserts if no row exists, updates only provided columns otherwise.
 */
export async function setMacroGoals(goals: Partial<MacroValues>): Promise<MacroSettings> {
  const database = await db;
  const now = getLocalDateTimeString(new Date());

  const countResult = await executeSql(database, 'SELECT COUNT(*) as cnt FROM macro_settings');
  const count = countResult.rows.item(0).cnt as number;

  if (count === 0) {
    await executeSql(
      database,
      'INSERT INTO macro_settings (protein_goal, carb_goal, fat_goal, created_at, updated_at) VALUES (?, ?, ?, ?, ?)',
      [goals.protein ?? null, goals.carbs ?? null, goals.fat ?? null, now, now],
    );
  } else {
    const setClauses: string[] = [];
    const params: (number | string | null)[] = [];

    if (goals.protein !== undefined) {
      setClauses.push('protein_goal = ?');
      params.push(goals.protein);
    }
    if (goals.carbs !== undefined) {
      setClauses.push('carb_goal = ?');
      params.push(goals.carbs);
    }
    if (goals.fat !== undefined) {
      setClauses.push('fat_goal = ?');
      params.push(goals.fat);
    }
    setClauses.push('updated_at = ?');
    params.push(now);

    await executeSql(database, `UPDATE macro_settings SET ${setClauses.join(', ')}`, params);
  }

  const row = await executeSql(database, 'SELECT * FROM macro_settings LIMIT 1');
  return rowToMacroSettings(row.rows.item(0));
}

// ── Macro Totals ─────────────────────────────────────────────────────

/**
 * Get total macro intake for today (local date).
 *
 * @returns MacroValues with protein, carbs, fat sums; returns {0,0,0} if no meals logged
 */
export async function getTodayMacroTotals(): Promise<MacroValues> {
  const database = await db;
  const today = getLocalDateString();

  const result = await executeSql(
    database,
    'SELECT COALESCE(SUM(protein_grams), 0) as protein, COALESCE(SUM(carb_grams), 0) as carbs, COALESCE(SUM(fat_grams), 0) as fat FROM meals WHERE local_date = ?',
    [today],
  );

  const row = result.rows.item(0);
  return {
    protein: row.protein as number,
    carbs: row.carbs as number,
    fat: row.fat as number,
  };
}

/**
 * Get total macro intake for a specific local date.
 *
 * @param localDate - YYYY-MM-DD string in local timezone
 * @returns MacroValues with protein, carbs, fat sums; returns {0,0,0} if no meals logged
 */
export async function getMacroTotalsByDate(localDate: string): Promise<MacroValues> {
  const database = await db;

  const result = await executeSql(
    database,
    'SELECT COALESCE(SUM(protein_grams), 0) as protein, COALESCE(SUM(carb_grams), 0) as carbs, COALESCE(SUM(fat_grams), 0) as fat FROM meals WHERE local_date = ?',
    [localDate],
  );

  const row = result.rows.item(0);
  return {
    protein: row.protein as number,
    carbs: row.carbs as number,
    fat: row.fat as number,
  };
}

/**
 * Get aggregated daily macro totals within a date range.
 *
 * @param startDate - Start date (YYYY-MM-DD), inclusive
 * @param endDate - End date (YYYY-MM-DD), inclusive
 * @returns Array of MacroChartPoint sorted by date ascending
 */
export async function getDailyMacroTotals(
  startDate: string,
  endDate: string,
): Promise<MacroChartPoint[]> {
  const database = await db;

  const result = await executeSql(
    database,
    'SELECT local_date, SUM(protein_grams) as protein, SUM(carb_grams) as carbs, SUM(fat_grams) as fat FROM meals WHERE local_date >= ? AND local_date <= ? GROUP BY local_date ORDER BY local_date ASC',
    [startDate, endDate],
  );

  const points: MacroChartPoint[] = [];
  for (let i = 0; i < result.rows.length; i++) {
    const row = result.rows.item(i);
    points.push({
      date: row.local_date as string,
      protein: row.protein as number,
      carbs: row.carbs as number,
      fat: row.fat as number,
      calories: computeCalories(row.protein as number, row.carbs as number, row.fat as number),
    });
  }
  return points;
}

/**
 * Get the average daily macro intake across the last 7 days, only counting
 * days that have at least one logged meal.
 *
 * @returns MacroValues with rounded per-macro averages, or null if no meals in last 7 days
 */
export async function get7DayAverage(): Promise<MacroValues | null> {
  const database = await db;
  const today = getLocalDateString();

  // 7 days inclusive of today: today minus 6 days
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 6);
  const startDateStr = getLocalDateString(startDate);

  const result = await executeSql(
    database,
    'SELECT AVG(p) as avg_protein, AVG(c) as avg_carbs, AVG(f) as avg_fat FROM (SELECT SUM(protein_grams) as p, SUM(carb_grams) as c, SUM(fat_grams) as f FROM meals WHERE local_date >= ? AND local_date <= ? GROUP BY local_date)',
    [startDateStr, today],
  );

  if (result.rows.length === 0) {
    return null;
  }

  const avg_protein = result.rows.item(0).avg_protein;
  if (avg_protein === null || avg_protein === undefined) {
    return null;
  }

  const avg_carbs = result.rows.item(0).avg_carbs;
  const avg_fat = result.rows.item(0).avg_fat;

  return {
    protein: Math.round(avg_protein as number),
    carbs: Math.round(avg_carbs as number),
    fat: Math.round(avg_fat as number),
  };
}

/**
 * Get the number of consecutive days (counting backwards from today) where the
 * user met or exceeded their protein goal.
 *
 * Per D-10: streak counts only protein-goal-met days — carb and fat goals are ignored.
 * Reads protein_goal from macro_settings (not protein_settings).
 *
 * - If no macro_settings row exists or protein_goal is null, returns 0.
 * - Today counts if today's protein total already meets the goal.
 * - If today has meals but hasn't hit the goal, streak starts from yesterday.
 * - If today has no meals, streak starts from yesterday.
 * - Gap detection: a missing day means zero protein that day, which breaks the streak.
 *
 * @returns Number of consecutive protein-goal-met days (0 if no streak)
 */
export async function getStreakDays(): Promise<number> {
  const database = await db;

  // Read protein_goal from macro_settings (per D-10 — not from protein_settings)
  const goalResult = await executeSql(
    database,
    'SELECT protein_goal FROM macro_settings LIMIT 1',
  );

  if (goalResult.rows.length === 0) {
    return 0;
  }

  const goal = goalResult.rows.item(0).protein_goal as number | null;
  if (goal === null || goal === undefined) {
    return 0;
  }

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
 * Calculate consecutive-day streaks for all three macros (protein, carbs, fat).
 * A day counts toward a macro's streak if the total for that macro meets or exceeds its goal.
 * Each macro streak is independent — hitting protein but missing carbs only breaks the carbs streak.
 *
 * @returns Object with streak counts for each macro: { protein, carbs, fat }
 */
export async function getMacroStreaks(): Promise<MacroValues> {
  const database = await db;

  const goalResult = await executeSql(
    database,
    'SELECT protein_goal, carb_goal, fat_goal FROM macro_settings LIMIT 1',
  );

  if (goalResult.rows.length === 0) {
    return { protein: 0, carbs: 0, fat: 0 };
  }

  const goals = {
    protein: goalResult.rows.item(0).protein_goal as number | null,
    carbs: goalResult.rows.item(0).carb_goal as number | null,
    fat: goalResult.rows.item(0).fat_goal as number | null,
  };

  const today = getLocalDateString();

  const result = await executeSql(
    database,
    `SELECT local_date,
            SUM(protein_grams) as total_protein,
            SUM(carb_grams) as total_carbs,
            SUM(fat_grams) as total_fat
     FROM meals WHERE local_date <= ?
     GROUP BY local_date ORDER BY local_date DESC`,
    [today],
  );

  if (result.rows.length === 0) {
    return { protein: 0, carbs: 0, fat: 0 };
  }

  const streaks = { protein: 0, carbs: 0, fat: 0 };
  // Track which macros are still streaking (have a goal and haven't broken yet)
  const active = {
    protein: goals.protein !== null && goals.protein !== undefined,
    carbs: goals.carbs !== null && goals.carbs !== undefined,
    fat: goals.fat !== null && goals.fat !== undefined,
  };

  const firstRow = result.rows.item(0);
  let startIndex = 0;
  let expectedDate: Date;

  if (firstRow.local_date === today) {
    // Check today for each macro
    if (active.protein && (firstRow.total_protein as number) >= goals.protein!) { streaks.protein = 1; }
    if (active.carbs && (firstRow.total_carbs as number) >= goals.carbs!) { streaks.carbs = 1; }
    if (active.fat && (firstRow.total_fat as number) >= goals.fat!) { streaks.fat = 1; }
    startIndex = 1;
    const d = new Date();
    d.setDate(d.getDate() - 1);
    expectedDate = d;
  } else {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    expectedDate = d;
  }

  for (let i = startIndex; i < result.rows.length; i++) {
    // Stop if no macros are still streaking
    if (!active.protein && !active.carbs && !active.fat) { break; }

    const row = result.rows.item(i);
    const expectedDateStr = getLocalDateString(expectedDate);

    if (row.local_date !== expectedDateStr) {
      break; // Gap — all remaining streaks are broken
    }

    if (active.protein) {
      if ((row.total_protein as number) >= goals.protein!) { streaks.protein++; } else { active.protein = false; }
    }
    if (active.carbs) {
      if ((row.total_carbs as number) >= goals.carbs!) { streaks.carbs++; } else { active.carbs = false; }
    }
    if (active.fat) {
      if ((row.total_fat as number) >= goals.fat!) { streaks.fat++; } else { active.fat = false; }
    }

    expectedDate.setDate(expectedDate.getDate() - 1);
  }

  return streaks;
}

// ── Quick-add and library functions ─────────────────────────────────

/**
 * Get the most recent distinct meals, deduplicated by (description, protein_grams, carb_grams, fat_grams) tuple.
 *
 * @param limit - Maximum number of distinct meals to return (default 3)
 * @returns Array of distinct meal objects with description, protein, carbs, fat, and mealType
 */
export async function getRecentDistinctMeals(
  limit: number = 3,
): Promise<Array<{ description: string; protein: number; carbs: number; fat: number; mealType: MealType }>> {
  const database = await db;

  const result = await executeSql(
    database,
    `SELECT description, protein_grams, carb_grams, fat_grams, meal_type, MAX(logged_at) as latest
     FROM meals
     WHERE description != ''
     GROUP BY description, protein_grams, carb_grams, fat_grams
     ORDER BY latest DESC
     LIMIT ?`,
    [limit],
  );

  const meals: Array<{ description: string; protein: number; carbs: number; fat: number; mealType: MealType }> = [];
  for (let i = 0; i < result.rows.length; i++) {
    const row = result.rows.item(i);
    meals.push({
      description: row.description as string,
      protein: row.protein_grams as number,
      carbs: row.carb_grams as number,
      fat: row.fat_grams as number,
      mealType: row.meal_type as MealType,
    });
  }
  return meals;
}

/**
 * Add a new macro-aware meal to the library as a reusable template.
 *
 * @param name - Display name for this library meal
 * @param mealType - One of: breakfast, lunch, dinner, snack
 * @param macros - Object with protein, carbs, and fat in grams
 * @returns The inserted MacroLibraryMeal record
 */
export async function addLibraryMeal(
  name: string,
  mealType: MealType,
  macros: MacroValues,
): Promise<MacroLibraryMeal> {
  const database = await db;
  const createdAt = getLocalDateTimeString(new Date());

  const result = await executeSql(
    database,
    'INSERT INTO meal_library (name, protein_grams, carb_grams, fat_grams, meal_type, created_at) VALUES (?, ?, ?, ?, ?, ?)',
    [name, macros.protein, macros.carbs, macros.fat, mealType, createdAt],
  );

  const row = await executeSql(database, 'SELECT * FROM meal_library WHERE id = ?', [result.insertId]);
  return rowToMacroLibraryMeal(row.rows.item(0));
}

/**
 * Get all library meals grouped by meal type.
 * Each group is sorted alphabetically by name.
 *
 * @returns Record keyed by MealType with arrays of MacroLibraryMeal
 */
export async function getLibraryMealsByType(): Promise<Record<MealType, MacroLibraryMeal[]>> {
  const database = await db;

  const result = await executeSql(
    database,
    'SELECT * FROM meal_library ORDER BY meal_type, name ASC',
  );

  const grouped: Record<MealType, MacroLibraryMeal[]> = {
    breakfast: [],
    lunch: [],
    dinner: [],
    snack: [],
  };

  for (let i = 0; i < result.rows.length; i++) {
    const meal = rowToMacroLibraryMeal(result.rows.item(i));
    if (MEAL_TYPES.includes(meal.mealType)) {
      grouped[meal.mealType].push(meal);
    }
  }

  return grouped;
}

/**
 * Delete a library meal by ID.
 *
 * @param id - The library meal ID to delete
 */
export async function deleteLibraryMeal(id: number): Promise<void> {
  const database = await db;
  await executeSql(database, 'DELETE FROM meal_library WHERE id = ?', [id]);
}

// ── Export ─────────────────────────────────────────────────────────────

/**
 * Build the macros-export payload for an inclusive date range.
 * Reuses getDailyMacroTotals for daily rows and getMacroGoals for the snapshot.
 */
export async function getMacrosExportData(
  startDate: string,
  endDate: string,
): Promise<MacrosExport> {
  const [days, settings] = await Promise.all([
    getDailyMacroTotals(startDate, endDate),
    getMacroGoals(),
  ]);

  let goals: MacroGoalsSnapshot | null = null;
  if (settings !== null) {
    const allSet =
      settings.proteinGoal !== null &&
      settings.carbGoal !== null &&
      settings.fatGoal !== null;
    goals = {
      protein: settings.proteinGoal,
      carbs: settings.carbGoal,
      fat: settings.fatGoal,
      calories: allSet
        ? settings.proteinGoal! * CALORIES_PER_GRAM.protein +
          settings.carbGoal!   * CALORIES_PER_GRAM.carbs +
          settings.fatGoal!    * CALORIES_PER_GRAM.fat
        : null,
    };
  }

  return {
    exportedAt: new Date().toISOString(),
    appVersion: getAppVersion(),
    range: { start: startDate, end: endDate },
    goals,
    days,
  };
}

function getAppVersion(): string {
  return pkg.version;
}
