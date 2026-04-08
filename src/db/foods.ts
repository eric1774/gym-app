import { db, executeSql } from './database';
import { Food, FoodSearchResult } from '../types';
import { computeCalories } from '../utils/macros';

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

/** Map a raw SQLite result row (with usage_count) to FoodSearchResult. */
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
}): FoodSearchResult {
  return {
    ...rowToFood(row),
    usageCount: row.usage_count ?? 0,
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
    `SELECT f.*, COUNT(mf.id) as usage_count
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
