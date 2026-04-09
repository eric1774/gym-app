import { db, executeSql, runTransaction } from './database';
import { Food, FoodSearchResult, MealFood, MealFoodInput, MealType } from '../types';
import { computeCalories } from '../utils/macros';
import { getLocalDateString, getLocalDateTimeString } from '../utils/dates';

// ── Row mappers ──────────────────────────────────────────────────────

/** Map a raw SQLite result row to the Food domain type. */
export function rowToFood(row: {
  id: number;
  fdc_id: number | null;
  name: string;
  category: string | null;
  protein_per_100g: number;
  carbs_per_100g: number;
  fat_per_100g: number;
  search_text: string;
  is_custom: number;
}): Food {
  return {
    id: row.id,
    fdcId: row.fdc_id,
    name: row.name,
    category: row.category,
    proteinPer100g: row.protein_per_100g,
    carbsPer100g: row.carbs_per_100g,
    fatPer100g: row.fat_per_100g,
    caloriesPer100g: computeCalories(row.protein_per_100g, row.carbs_per_100g, row.fat_per_100g),
    searchText: row.search_text,
    isCustom: row.is_custom === 1,
  };
}

/** Map a raw SQLite result row (with usage_count and optional last_used_grams) to FoodSearchResult. */
export function rowToFoodSearchResult(row: {
  id: number;
  fdc_id: number | null;
  name: string;
  category: string | null;
  protein_per_100g: number;
  carbs_per_100g: number;
  fat_per_100g: number;
  search_text: string;
  is_custom: number;
  usage_count?: number;
  last_used_grams?: number;
}): FoodSearchResult {
  return {
    ...rowToFood(row),
    usageCount: row.usage_count ?? 0,
    lastUsedGrams: row.last_used_grams ?? undefined,
  };
}

// ── Food Search ──────────────────────────────────────────────────────

/**
 * Search foods by query string using token-based LIKE matching with frequency boost.
 *
 * - Splits query into whitespace-delimited tokens
 * - Each token is AND-ed as a LIKE condition on search_text
 * - Results ordered by usage count (DESC) then name (ASC), limited to 20
 * - Returns empty array for blank queries
 *
 * All parameters are passed via parameterized query (T-38-01: SQL injection prevention).
 *
 * @param query - Search string to match against food names/categories
 * @returns Array of FoodSearchResult, max 20, ordered by frequency then name
 */
export async function searchFoods(query: string): Promise<FoodSearchResult[]> {
  const trimmed = query.trim().toLowerCase();
  if (trimmed === '') {
    return [];
  }

  const tokens = trimmed.split(/\s+/).filter(t => t.length > 0);
  if (tokens.length === 0) {
    return [];
  }

  const database = await db;

  // Build AND-ed LIKE conditions for each token (T-38-01: parameterized queries)
  const whereClauses = tokens.map(() => 'f.search_text LIKE ?').join(' AND ');
  const params: string[] = tokens.map(t => `%${t}%`);

  const sql = `
    SELECT f.*, COALESCE(mf_count.cnt, 0) as usage_count
    FROM foods f
    LEFT JOIN (
      SELECT food_id, COUNT(*) as cnt FROM meal_foods GROUP BY food_id
    ) mf_count ON mf_count.food_id = f.id
    WHERE ${whereClauses}
    ORDER BY usage_count DESC, f.name ASC
    LIMIT 20
  `;

  const result = await executeSql(database, sql, params);

  const foods: FoodSearchResult[] = [];
  for (let i = 0; i < result.rows.length; i++) {
    foods.push(rowToFoodSearchResult(result.rows.item(i)));
  }
  return foods;
}

// ── Frequent Foods ───────────────────────────────────────────────────

/**
 * Get the top 10 most frequently logged foods, ranked by usage count.
 *
 * Returns empty array if no meal_foods rows exist yet (per D-08).
 *
 * @returns Array of FoodSearchResult, max 10, ordered by frequency DESC
 */
export async function getFrequentFoods(): Promise<FoodSearchResult[]> {
  const database = await db;

  const result = await executeSql(
    database,
    `SELECT f.*, COUNT(mf.id) as usage_count,
       (SELECT mf2.grams FROM meal_foods mf2 WHERE mf2.food_id = f.id ORDER BY mf2.id DESC LIMIT 1) as last_used_grams
     FROM foods f
     INNER JOIN meal_foods mf ON mf.food_id = f.id
     GROUP BY f.id
     ORDER BY usage_count DESC
     LIMIT 10`,
  );

  const foods: FoodSearchResult[] = [];
  for (let i = 0; i < result.rows.length; i++) {
    foods.push(rowToFoodSearchResult(result.rows.item(i)));
  }
  return foods;
}

// ── Custom Food Creation ─────────────────────────────────────────────

/**
 * Create a custom food entry (not from USDA database).
 *
 * - Sets is_custom=1, fdc_id=NULL, category=NULL
 * - search_text is set to the lowercased name
 * - Uses parameterized INSERT (T-38-02: SQL injection prevention)
 * - Validates name is non-empty and macros are non-negative
 *
 * @param name - Display name for the custom food
 * @param proteinPer100g - Protein in grams per 100g
 * @param carbsPer100g - Carbohydrates in grams per 100g
 * @param fatPer100g - Fat in grams per 100g
 * @returns The inserted Food record
 * @throws Error if name is blank or macros are negative
 */
export async function createCustomFood(
  name: string,
  proteinPer100g: number,
  carbsPer100g: number,
  fatPer100g: number,
): Promise<Food> {
  const trimmedName = name.trim();
  if (trimmedName === '') {
    throw new Error('Food name cannot be blank');
  }
  if (proteinPer100g < 0 || carbsPer100g < 0 || fatPer100g < 0) {
    throw new Error('Macro values must be non-negative');
  }

  const database = await db;
  const searchText = trimmedName.toLowerCase();

  const result = await executeSql(
    database,
    'INSERT INTO foods (fdc_id, name, category, protein_per_100g, carbs_per_100g, fat_per_100g, search_text, is_custom) VALUES (NULL, ?, NULL, ?, ?, ?, ?, 1)',
    [trimmedName, proteinPer100g, carbsPer100g, fatPer100g, searchText],
  );

  const row = await executeSql(database, 'SELECT * FROM foods WHERE id = ?', [result.insertId]);
  return rowToFood(row.rows.item(0));
}

// ── Food Lookup ──────────────────────────────────────────────────────

/**
 * Get a food by its ID.
 *
 * @param id - The food's primary key
 * @returns Food record, or null if not found
 */
export async function getFoodById(id: number): Promise<Food | null> {
  const database = await db;
  const result = await executeSql(database, 'SELECT * FROM foods WHERE id = ?', [id]);

  if (result.rows.length === 0) {
    return null;
  }
  return rowToFood(result.rows.item(0));
}

// ── Meal Foods ───────────────────────────────────────────────────────

/** Map a raw SQLite result row to the MealFood domain type. */
export function rowToMealFood(row: {
  id: number;
  meal_id: number;
  food_id: number;
  food_name: string;
  grams: number;
  protein: number;
  carbs: number;
  fat: number;
}): MealFood {
  return {
    id: row.id,
    mealId: row.meal_id,
    foodId: row.food_id,
    foodName: row.food_name,
    grams: row.grams,
    protein: row.protein,
    carbs: row.carbs,
    fat: row.fat,
    calories: computeCalories(row.protein, row.carbs, row.fat),
  };
}

/**
 * Log a multi-food meal in a single transaction.
 *
 * 1. Insert meals row with summed macros (compatible with existing MacrosView, charts, streaks)
 * 2. Insert one meal_foods row per food with snapshotted macros
 *
 * All parameters are passed via parameterized queries (T-39-01: SQL injection prevention).
 *
 * @param description - Meal description (auto-generated from food names, user-editable)
 * @param mealType - One of: breakfast, lunch, dinner, snack
 * @param foods - Array of MealFoodInput objects from the builder
 * @param loggedAt - When the meal was consumed; defaults to now
 * @returns The meal ID of the inserted meals row
 * @throws Error if foods array is empty
 */
export async function addMealWithFoods(
  description: string,
  mealType: MealType,
  foods: MealFoodInput[],
  loggedAt?: Date,
): Promise<number> {
  if (foods.length === 0) {
    throw new Error('At least one food is required');
  }

  const database = await db;
  const effectiveDate = loggedAt ?? new Date();
  const localDate = getLocalDateString(effectiveDate);
  const loggedAtStr = getLocalDateTimeString(effectiveDate);
  const createdAt = getLocalDateTimeString(new Date());

  // Compute snapshotted macros per food and summed totals for the meals row
  let totalProtein = 0;
  let totalCarbs = 0;
  let totalFat = 0;

  const foodRows = foods.map(f => {
    const protein = (f.grams / 100) * f.proteinPer100g;
    const carbs = (f.grams / 100) * f.carbsPer100g;
    const fat = (f.grams / 100) * f.fatPer100g;
    totalProtein += protein;
    totalCarbs += carbs;
    totalFat += fat;
    return { ...f, protein, carbs, fat };
  });

  // Insert the meals row with summed macros
  await runTransaction(database, (tx) => {
    tx.executeSql(
      'INSERT INTO meals (protein_grams, carb_grams, fat_grams, description, meal_type, logged_at, local_date, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [totalProtein, totalCarbs, totalFat, description, mealType, loggedAtStr, localDate, createdAt],
    );
  });

  // Retrieve the inserted meal ID
  const mealResult = await executeSql(
    database,
    'SELECT id FROM meals WHERE logged_at = ? AND created_at = ? ORDER BY id DESC LIMIT 1',
    [loggedAtStr, createdAt],
  );
  const mealId = mealResult.rows.item(0).id as number;

  // Insert meal_foods rows with snapshotted macros
  await runTransaction(database, (tx) => {
    for (const f of foodRows) {
      tx.executeSql(
        'INSERT INTO meal_foods (meal_id, food_id, food_name, grams, protein, carbs, fat) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [mealId, f.foodId, f.foodName, f.grams, f.protein, f.carbs, f.fat],
      );
    }
  });

  return mealId;
}

/**
 * Get the food breakdown for a logged meal.
 *
 * @param mealId - The meal's primary key
 * @returns Array of MealFood records, ordered by id (insertion order)
 */
export async function getMealFoods(mealId: number): Promise<MealFood[]> {
  const database = await db;
  const result = await executeSql(
    database,
    'SELECT * FROM meal_foods WHERE meal_id = ? ORDER BY id ASC',
    [mealId],
  );

  const mealFoods: MealFood[] = [];
  for (let i = 0; i < result.rows.length; i++) {
    mealFoods.push(rowToMealFood(result.rows.item(i)));
  }
  return mealFoods;
}

// ── Meal Copy / Edit ─────────────────────────────────────────────────

/**
 * Return the food breakdown for a logged meal in MealFoodInput format,
 * ready to pre-load the builder for repeat or edit flows (per D-08).
 *
 * Uses LEFT JOIN so deleted foods don't lose their name/gram data.
 * Per-100g macros fall back to 0 when the foods row is missing.
 *
 * All parameters are passed via parameterized queries (T-40-04).
 *
 * @param mealId - The meal's primary key
 * @returns Array of MealFoodInput records in insertion order, or empty array
 */
export async function duplicateMealFoods(mealId: number): Promise<MealFoodInput[]> {
  const database = await db;
  const result = await executeSql(
    database,
    `SELECT mf.food_id, mf.food_name, mf.grams,
            f.protein_per_100g, f.carbs_per_100g, f.fat_per_100g
     FROM meal_foods mf
     LEFT JOIN foods f ON f.id = mf.food_id
     WHERE mf.meal_id = ?
     ORDER BY mf.id ASC`,
    [mealId],
  );

  const foods: MealFoodInput[] = [];
  for (let i = 0; i < result.rows.length; i++) {
    const row = result.rows.item(i);
    foods.push({
      foodId: row.food_id,
      foodName: row.food_name,
      grams: row.grams,
      proteinPer100g: row.protein_per_100g ?? 0,
      carbsPer100g: row.carbs_per_100g ?? 0,
      fatPer100g: row.fat_per_100g ?? 0,
    });
  }
  return foods;
}

/**
 * Update an existing meal with a new set of foods, recalculating totals (per D-11).
 *
 * Atomically in a single transaction:
 * 1. Delete all existing meal_foods rows for the meal
 * 2. Insert new meal_foods rows with snapshotted macros
 * 3. Update the meals row with recalculated totals
 *
 * All SQL uses parameterized queries (T-40-03).
 *
 * @param mealId - The meal's primary key
 * @param description - Updated meal description
 * @param mealType - Updated meal type
 * @param foods - Updated list of foods with gram amounts
 * @param loggedAt - When the meal was consumed; defaults to now
 * @throws Error if foods array is empty
 */
export async function updateMealWithFoods(
  mealId: number,
  description: string,
  mealType: MealType,
  foods: MealFoodInput[],
  loggedAt?: Date,
): Promise<void> {
  if (foods.length === 0) {
    throw new Error('At least one food is required');
  }

  const database = await db;

  // Compute snapshotted macros per food and summed totals
  let totalProtein = 0;
  let totalCarbs = 0;
  let totalFat = 0;

  const foodRows = foods.map(f => {
    const protein = (f.grams / 100) * f.proteinPer100g;
    const carbs = (f.grams / 100) * f.carbsPer100g;
    const fat = (f.grams / 100) * f.fatPer100g;
    totalProtein += protein;
    totalCarbs += carbs;
    totalFat += fat;
    return { ...f, protein, carbs, fat };
  });

  const effectiveDate = loggedAt ?? new Date();
  const loggedAtStr = getLocalDateTimeString(effectiveDate);
  const localDate = getLocalDateString(effectiveDate);

  // Single transaction: delete old meal_foods, insert new ones, update meals row
  await runTransaction(database, (tx) => {
    // Delete old food rows
    tx.executeSql('DELETE FROM meal_foods WHERE meal_id = ?', [mealId]);

    // Insert new food rows
    for (const f of foodRows) {
      tx.executeSql(
        'INSERT INTO meal_foods (meal_id, food_id, food_name, grams, protein, carbs, fat) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [mealId, f.foodId, f.foodName, f.grams, f.protein, f.carbs, f.fat],
      );
    }

    // Update meals row with recalculated totals (D-11: single source of truth)
    tx.executeSql(
      'UPDATE meals SET protein_grams = ?, carb_grams = ?, fat_grams = ?, description = ?, meal_type = ?, logged_at = ?, local_date = ? WHERE id = ?',
      [totalProtein, totalCarbs, totalFat, description, mealType, loggedAtStr, localDate, mealId],
    );
  });
}

/**
 * Check whether a meal has any meal_foods rows (per D-05, D-06).
 *
 * Used to determine whether to show the repeat icon on a meal card
 * and whether to route edit to builder or AddMealModal.
 *
 * All SQL uses parameterized queries.
 *
 * @param mealId - The meal's primary key
 * @returns true if the meal has at least one meal_foods row
 */
export async function hasMealFoods(mealId: number): Promise<boolean> {
  const database = await db;
  const result = await executeSql(
    database,
    'SELECT COUNT(*) as cnt FROM meal_foods WHERE meal_id = ?',
    [mealId],
  );
  return result.rows.item(0).cnt > 0;
}

/**
 * Batch query to count meal_foods rows per meal ID (per D-05, D-06).
 *
 * Avoids N+1 queries when rendering a list of meals. The IN clause is
 * built from integer IDs from the DB — never user-supplied strings (T-40-05).
 * Limited to a day's meals (typically < 20).
 *
 * @param mealIds - Array of meal IDs to check
 * @returns Record mapping each meal ID to its meal_foods row count
 */
export async function getMealFoodsCounts(mealIds: number[]): Promise<Record<number, number>> {
  if (mealIds.length === 0) { return {}; }
  const database = await db;
  const placeholders = mealIds.map(() => '?').join(',');
  const result = await executeSql(
    database,
    `SELECT meal_id, COUNT(*) as cnt FROM meal_foods WHERE meal_id IN (${placeholders}) GROUP BY meal_id`,
    mealIds,
  );
  const counts: Record<number, number> = {};
  for (let i = 0; i < result.rows.length; i++) {
    const row = result.rows.item(i);
    counts[row.meal_id] = row.cnt;
  }
  return counts;
}

// ── Remembered Portions ──────────────────────────────────────────────

/**
 * Get the last gram quantity used when logging a specific food.
 *
 * Query: SELECT grams FROM meal_foods WHERE food_id = ? ORDER BY id DESC LIMIT 1
 * Parameterized query prevents SQL injection (T-40-01).
 *
 * Per D-02: Used to pre-fill the gram input with ghost text showing the user's
 * previously used quantity for this food.
 *
 * @param foodId - The food's primary key
 * @returns Last used grams as a number, or null if food has never been logged
 */
export async function getLastUsedPortion(foodId: number): Promise<number | null> {
  const database = await db;
  const result = await executeSql(
    database,
    'SELECT grams FROM meal_foods WHERE food_id = ? ORDER BY id DESC LIMIT 1',
    [foodId],
  );

  if (result.rows.length === 0) {
    return null;
  }
  return result.rows.item(0).grams as number;
}
