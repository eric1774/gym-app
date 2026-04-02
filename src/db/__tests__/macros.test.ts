jest.mock('react-native-sqlite-storage');
jest.mock('../database');
jest.mock('../../utils/dates');

// Fix the real current date to 2026-03-15 so streak date arithmetic is deterministic
jest.useFakeTimers();
jest.setSystemTime(new Date('2026-03-15T10:00:00'));

import { db, executeSql } from '../database';
import { getLocalDateString, getLocalDateTimeString } from '../../utils/dates';
import { mockResultSet } from '../../test-utils/dbMock';
import {
  addMeal,
  updateMeal,
  deleteMeal,
  getMealsByDate,
  getMacroGoals,
  setMacroGoals,
  getTodayMacroTotals,
  getDailyMacroTotals,
  get7DayAverage,
  getStreakDays,
  getRecentDistinctMeals,
  addLibraryMeal,
  getLibraryMealsByType,
  deleteLibraryMeal,
} from '../macros';

const mockExecuteSql = executeSql as jest.MockedFunction<typeof executeSql>;
const mockGetLocalDateString = getLocalDateString as jest.MockedFunction<typeof getLocalDateString>;
const mockGetLocalDateTimeString = getLocalDateTimeString as jest.MockedFunction<typeof getLocalDateTimeString>;

const mockDb = {};
const dbModule = require('../database');
Object.defineProperty(dbModule, 'db', {
  value: Promise.resolve(mockDb),
  writable: true,
});

// Helper: format a Date as YYYY-MM-DD (mirrors real implementation)
function formatDate(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Mock implementation: if Date arg provided, format it; otherwise return today string
function dateStringImpl(d?: Date): string {
  if (!d) return '2026-03-15';
  return formatDate(d);
}

beforeEach(() => {
  jest.clearAllMocks();
  mockGetLocalDateString.mockImplementation(dateStringImpl as any);
  mockGetLocalDateTimeString.mockReturnValue('2026-03-15T10:00:00');
});

// ── Shared row fixtures ──────────────────────────────────────────────

const macroMealRow = {
  id: 1,
  protein_grams: 30,
  carb_grams: 50,
  fat_grams: 15,
  description: 'Chicken with rice',
  meal_type: 'lunch',
  logged_at: '2026-03-15T12:00:00',
  local_date: '2026-03-15',
  created_at: '2026-03-15T10:00:00',
};

const macroSettingsRow = {
  id: 1,
  protein_goal: 150,
  carb_goal: null,
  fat_goal: null,
  created_at: '2026-01-01T00:00:00',
  updated_at: '2026-03-15T10:00:00',
};

const macroLibraryMealRow = {
  id: 1,
  name: 'Protein Shake',
  protein_grams: 50,
  carb_grams: 20,
  fat_grams: 5,
  meal_type: 'snack',
  created_at: '2026-03-15T10:00:00',
};

// ── Meal CRUD ────────────────────────────────────────────────────────

describe('addMeal', () => {
  it('inserts a meal with all 3 macro columns and returns MacroMeal with computed calories', async () => {
    // getMacroGoals SELECT → returns settings row (goal set)
    mockExecuteSql.mockResolvedValueOnce(mockResultSet([macroSettingsRow]));
    // INSERT → insertId=1
    mockExecuteSql.mockResolvedValueOnce(mockResultSet([], 1));
    // SELECT → returns meal row
    mockExecuteSql.mockResolvedValueOnce(mockResultSet([macroMealRow]));

    const result = await addMeal('Chicken with rice', 'lunch', { protein: 30, carbs: 50, fat: 15 });

    expect(result.id).toBe(1);
    expect(result.protein).toBe(30);
    expect(result.carbs).toBe(50);
    expect(result.fat).toBe(15);
    expect(result.calories).toBe(30 * 4 + 50 * 4 + 15 * 9); // 455
    expect(result.mealType).toBe('lunch');
    expect(result.description).toBe('Chicken with rice');
    expect(result.localDate).toBe('2026-03-15');
    // Verify INSERT includes all 3 macro columns
    expect(mockExecuteSql).toHaveBeenNthCalledWith(
      2,
      mockDb,
      expect.stringContaining('INSERT INTO meals'),
      expect.arrayContaining([30, 50, 15, 'Chicken with rice', 'lunch']),
    );
  });

  it('throws Error when no macro goal is set (getMacroGoals returns null)', async () => {
    // getMacroGoals SELECT → empty ResultSet (no row)
    mockExecuteSql.mockResolvedValueOnce(mockResultSet([]));

    await expect(
      addMeal('Chicken with rice', 'lunch', { protein: 30, carbs: 50, fat: 15 }),
    ).rejects.toThrow('Macro goals must be set before logging meals');
  });
});

describe('updateMeal', () => {
  it('calls UPDATE with all 3 macro columns then SELECT and returns updated MacroMeal', async () => {
    const updatedRow = { ...macroMealRow, protein_grams: 40, carb_grams: 15, fat_grams: 8, description: 'Grilled chicken', meal_type: 'dinner' };
    // UPDATE
    mockExecuteSql.mockResolvedValueOnce(mockResultSet([], 0));
    // SELECT
    mockExecuteSql.mockResolvedValueOnce(mockResultSet([updatedRow]));

    const loggedAt = new Date('2026-03-15');
    const result = await updateMeal(1, 'Grilled chicken', 'dinner', { protein: 40, carbs: 15, fat: 8 }, loggedAt);

    expect(result.protein).toBe(40);
    expect(result.carbs).toBe(15);
    expect(result.fat).toBe(8);
    expect(result.mealType).toBe('dinner');
    expect(result.description).toBe('Grilled chicken');
    expect(mockGetLocalDateString).toHaveBeenCalledWith(loggedAt);
    expect(mockGetLocalDateTimeString).toHaveBeenCalledWith(loggedAt);
    expect(mockExecuteSql).toHaveBeenNthCalledWith(
      1,
      mockDb,
      expect.stringContaining('UPDATE meals'),
      expect.arrayContaining([40, 15, 8, 'Grilled chicken', 'dinner']),
    );
  });
});

describe('deleteMeal', () => {
  it('calls DELETE with the correct meal id', async () => {
    mockExecuteSql.mockResolvedValueOnce(mockResultSet([], 0));

    await deleteMeal(1);

    expect(mockExecuteSql).toHaveBeenCalledWith(
      mockDb,
      expect.stringContaining('DELETE FROM meals'),
      [1],
    );
  });
});

describe('getMealsByDate', () => {
  it('returns array of MacroMeal objects for the given date', async () => {
    const mealRow2 = { ...macroMealRow, id: 2, meal_type: 'dinner', protein_grams: 45, carb_grams: 20, fat_grams: 10 };
    mockExecuteSql.mockResolvedValueOnce(mockResultSet([macroMealRow, mealRow2]));

    const result = await getMealsByDate('2026-03-15');

    expect(result).toHaveLength(2);
    expect(result[0].id).toBe(1);
    expect(result[1].id).toBe(2);
    expect(mockExecuteSql).toHaveBeenCalledWith(
      mockDb,
      expect.stringContaining('WHERE local_date = ?'),
      ['2026-03-15'],
    );
  });

  it('returns empty array when no meals for that date', async () => {
    mockExecuteSql.mockResolvedValueOnce(mockResultSet([]));

    const result = await getMealsByDate('2026-03-10');

    expect(result).toEqual([]);
  });
});

// ── Macro Goals ───────────────────────────────────────────────────────

describe('getMacroGoals', () => {
  it('returns MacroSettings when row exists (proteinGoal set, others null)', async () => {
    mockExecuteSql.mockResolvedValueOnce(mockResultSet([macroSettingsRow]));

    const result = await getMacroGoals();

    expect(result).not.toBeNull();
    expect(result!.id).toBe(1);
    expect(result!.proteinGoal).toBe(150);
    expect(result!.carbGoal).toBeNull();
    expect(result!.fatGoal).toBeNull();
  });

  it('returns null when no macro_settings row exists', async () => {
    mockExecuteSql.mockResolvedValueOnce(mockResultSet([]));

    const result = await getMacroGoals();

    expect(result).toBeNull();
  });
});

describe('setMacroGoals', () => {
  it('inserts new row when count=0 with provided goals and NULL for unprovided', async () => {
    // COUNT → 0
    mockExecuteSql.mockResolvedValueOnce(mockResultSet([{ cnt: 0 }]));
    // INSERT
    mockExecuteSql.mockResolvedValueOnce(mockResultSet([], 1));
    // SELECT LIMIT 1
    mockExecuteSql.mockResolvedValueOnce(mockResultSet([{ ...macroSettingsRow, protein_goal: 180 }]));

    const result = await setMacroGoals({ protein: 180 });

    expect(result.proteinGoal).toBe(180);
    expect(mockExecuteSql).toHaveBeenNthCalledWith(
      2,
      mockDb,
      expect.stringContaining('INSERT INTO macro_settings'),
      expect.arrayContaining([180]),
    );
  });

  it('updates only provided fields when count>0 (partial update — carbs only)', async () => {
    // COUNT → 1
    mockExecuteSql.mockResolvedValueOnce(mockResultSet([{ cnt: 1 }]));
    // UPDATE
    mockExecuteSql.mockResolvedValueOnce(mockResultSet([], 0));
    // SELECT LIMIT 1
    mockExecuteSql.mockResolvedValueOnce(mockResultSet([{ ...macroSettingsRow, carb_goal: 200 }]));

    const result = await setMacroGoals({ carbs: 200 });

    expect(result.carbGoal).toBe(200);
    const updateCall = mockExecuteSql.mock.calls[1];
    expect(updateCall[1]).toContain('carb_goal = ?');
    expect(updateCall[1]).not.toContain('protein_goal = ?');
    expect(updateCall[1]).not.toContain('fat_goal = ?');
  });

  it('updates multiple provided fields (carbs and fat)', async () => {
    // COUNT → 1
    mockExecuteSql.mockResolvedValueOnce(mockResultSet([{ cnt: 1 }]));
    // UPDATE
    mockExecuteSql.mockResolvedValueOnce(mockResultSet([], 0));
    // SELECT LIMIT 1
    mockExecuteSql.mockResolvedValueOnce(
      mockResultSet([{ ...macroSettingsRow, carb_goal: 200, fat_goal: 65 }]),
    );

    const result = await setMacroGoals({ carbs: 200, fat: 65 });

    expect(result.carbGoal).toBe(200);
    expect(result.fatGoal).toBe(65);
    const updateCall = mockExecuteSql.mock.calls[1];
    expect(updateCall[1]).toContain('carb_goal = ?');
    expect(updateCall[1]).toContain('fat_goal = ?');
    expect(updateCall[1]).not.toContain('protein_goal = ?');
  });
});

// ── Macro Totals ──────────────────────────────────────────────────────

describe('getTodayMacroTotals', () => {
  it('returns MacroValues with all 3 macro sums for today', async () => {
    mockExecuteSql.mockResolvedValueOnce(
      mockResultSet([{ protein: 120, carbs: 200, fat: 55 }]),
    );

    const result = await getTodayMacroTotals();

    expect(result).toEqual({ protein: 120, carbs: 200, fat: 55 });
    expect(mockGetLocalDateString).toHaveBeenCalledWith(); // called with no args for today
  });

  it('returns {protein:0, carbs:0, fat:0} when no meals today (COALESCE handles null)', async () => {
    mockExecuteSql.mockResolvedValueOnce(
      mockResultSet([{ protein: 0, carbs: 0, fat: 0 }]),
    );

    const result = await getTodayMacroTotals();

    expect(result).toEqual({ protein: 0, carbs: 0, fat: 0 });
  });
});

describe('getDailyMacroTotals', () => {
  it('returns MacroChartPoint[] with per-day aggregates and computed calories', async () => {
    mockExecuteSql.mockResolvedValueOnce(
      mockResultSet([
        { local_date: '2026-03-01', protein: 120, carbs: 180, fat: 50 },
        { local_date: '2026-03-10', protein: 100, carbs: 160, fat: 45 },
        { local_date: '2026-03-15', protein: 85, carbs: 150, fat: 40 },
      ]),
    );

    const result = await getDailyMacroTotals('2026-03-01', '2026-03-15');

    expect(result).toHaveLength(3);
    expect(result[0].date).toBe('2026-03-01');
    expect(result[0].protein).toBe(120);
    expect(result[0].carbs).toBe(180);
    expect(result[0].fat).toBe(50);
    expect(result[0].calories).toBe(120 * 4 + 180 * 4 + 50 * 9); // 480 + 720 + 450 = 1650
  });

  it('returns empty array when no meals in date range', async () => {
    mockExecuteSql.mockResolvedValueOnce(mockResultSet([]));

    const result = await getDailyMacroTotals('2026-03-01', '2026-03-15');

    expect(result).toEqual([]);
  });
});

// ── 7-day average ─────────────────────────────────────────────────────

describe('get7DayAverage', () => {
  it('returns MacroValues with rounded averages when meals exist in last 7 days', async () => {
    mockExecuteSql.mockResolvedValueOnce(
      mockResultSet([{ avg_protein: 142.5, avg_carbs: 195.3, avg_fat: 62.7 }]),
    );

    const result = await get7DayAverage();

    expect(result).not.toBeNull();
    expect(result!.protein).toBe(143); // Math.round(142.5)
    expect(result!.carbs).toBe(195);   // Math.round(195.3)
    expect(result!.fat).toBe(63);      // Math.round(62.7)
  });

  it('returns null when avg_protein is null (no meals in last 7 days)', async () => {
    mockExecuteSql.mockResolvedValueOnce(
      mockResultSet([{ avg_protein: null, avg_carbs: null, avg_fat: null }]),
    );

    const result = await get7DayAverage();

    expect(result).toBeNull();
  });

  it('returns null when avg_protein is undefined', async () => {
    mockExecuteSql.mockResolvedValueOnce(
      mockResultSet([{ avg_protein: undefined, avg_carbs: undefined, avg_fat: undefined }]),
    );

    const result = await get7DayAverage();

    expect(result).toBeNull();
  });

  it('returns exact integer averages when no rounding needed', async () => {
    mockExecuteSql.mockResolvedValueOnce(
      mockResultSet([{ avg_protein: 120, avg_carbs: 200, avg_fat: 60 }]),
    );

    const result = await get7DayAverage();

    expect(result).toEqual({ protein: 120, carbs: 200, fat: 60 });
  });
});

// ── Streak logic ─────────────────────────────────────────────────────

describe('getStreakDays', () => {
  it('returns 0 when no protein goal is set (no macro_settings row)', async () => {
    // SELECT protein_goal FROM macro_settings → empty
    mockExecuteSql.mockResolvedValueOnce(mockResultSet([]));

    const result = await getStreakDays();

    expect(result).toBe(0);
  });

  it('returns 0 when protein_goal is null in macro_settings', async () => {
    // SELECT protein_goal → row with null
    mockExecuteSql.mockResolvedValueOnce(mockResultSet([{ protein_goal: null }]));

    const result = await getStreakDays();

    expect(result).toBe(0);
  });

  it('returns 0 when no meals have been logged at all', async () => {
    // SELECT protein_goal → 150
    mockExecuteSql.mockResolvedValueOnce(mockResultSet([{ protein_goal: 150 }]));
    // Grouped meals SELECT → empty
    mockExecuteSql.mockResolvedValueOnce(mockResultSet([]));

    const result = await getStreakDays();

    expect(result).toBe(0);
  });

  it('returns 2 when today and yesterday meet protein goal but day before is missing', async () => {
    // SELECT protein_goal → 150
    mockExecuteSql.mockResolvedValueOnce(mockResultSet([{ protein_goal: 150 }]));
    mockExecuteSql.mockResolvedValueOnce(
      mockResultSet([
        { local_date: '2026-03-15', total: 160 }, // today, meets goal
        { local_date: '2026-03-14', total: 155 }, // yesterday, meets goal
        // 2026-03-13 missing → gap → streak stops
      ]),
    );

    const result = await getStreakDays();

    expect(result).toBe(2);
  });

  it('returns 2 when today is under goal but yesterday and day before meet goal', async () => {
    mockExecuteSql.mockResolvedValueOnce(mockResultSet([{ protein_goal: 150 }]));
    mockExecuteSql.mockResolvedValueOnce(
      mockResultSet([
        { local_date: '2026-03-15', total: 50 },  // today, under goal
        { local_date: '2026-03-14', total: 160 }, // yesterday, meets goal
        { local_date: '2026-03-13', total: 155 }, // day before, meets goal
      ]),
    );

    const result = await getStreakDays();

    expect(result).toBe(2);
  });

  it('returns 2 when today has no meals but yesterday and day before meet goal', async () => {
    mockExecuteSql.mockResolvedValueOnce(mockResultSet([{ protein_goal: 150 }]));
    // First row is NOT today
    mockExecuteSql.mockResolvedValueOnce(
      mockResultSet([
        { local_date: '2026-03-14', total: 160 }, // yesterday
        { local_date: '2026-03-13', total: 155 }, // day before
      ]),
    );

    const result = await getStreakDays();

    expect(result).toBe(2);
  });

  it('returns 5 for a consecutive 5-day streak', async () => {
    mockExecuteSql.mockResolvedValueOnce(mockResultSet([{ protein_goal: 150 }]));
    mockExecuteSql.mockResolvedValueOnce(
      mockResultSet([
        { local_date: '2026-03-15', total: 200 },
        { local_date: '2026-03-14', total: 180 },
        { local_date: '2026-03-13', total: 160 },
        { local_date: '2026-03-12', total: 155 },
        { local_date: '2026-03-11', total: 150 }, // exactly goal
      ]),
    );

    const result = await getStreakDays();

    expect(result).toBe(5);
  });

  it('returns 1 when only today meets goal', async () => {
    mockExecuteSql.mockResolvedValueOnce(mockResultSet([{ protein_goal: 150 }]));
    mockExecuteSql.mockResolvedValueOnce(
      mockResultSet([
        { local_date: '2026-03-15', total: 180 },
      ]),
    );

    const result = await getStreakDays();

    expect(result).toBe(1);
  });

  it('counts only protein-goal days — days where carbs/fat miss goal still count for protein streak', async () => {
    // protein_goal=150 set; carb_goal=200, fat_goal=65 also set but ignored for streak
    mockExecuteSql.mockResolvedValueOnce(
      mockResultSet([{ protein_goal: 150 }]),
    );
    // days where protein >= 150 but carbs < 200 and fat < 65 — should still count
    mockExecuteSql.mockResolvedValueOnce(
      mockResultSet([
        { local_date: '2026-03-15', total: 160 }, // protein >= 150 (carbs/fat not checked)
        { local_date: '2026-03-14', total: 155 }, // protein >= 150 (carbs/fat not checked)
        { local_date: '2026-03-13', total: 152 }, // protein >= 150 (carbs/fat not checked)
      ]),
    );

    const result = await getStreakDays();

    // Should be 3 — protein goal met all 3 days regardless of carbs/fat
    expect(result).toBe(3);
  });
});

// ── Quick-add and library functions ──────────────────────────────────

describe('getRecentDistinctMeals', () => {
  it('returns array of recent distinct meals with default limit 3', async () => {
    const rows = [
      { description: 'Chicken', protein_grams: 30, carb_grams: 20, fat_grams: 5, meal_type: 'lunch' },
      { description: 'Shake', protein_grams: 50, carb_grams: 10, fat_grams: 3, meal_type: 'snack' },
      { description: 'Eggs', protein_grams: 20, carb_grams: 0, fat_grams: 12, meal_type: 'breakfast' },
    ];
    mockExecuteSql.mockResolvedValueOnce(mockResultSet(rows));

    const result = await getRecentDistinctMeals();

    expect(result).toHaveLength(3);
    expect(result[0]).toEqual({ description: 'Chicken', protein: 30, carbs: 20, fat: 5, mealType: 'lunch' });
    expect(result[1].description).toBe('Shake');
    expect(mockExecuteSql).toHaveBeenCalledWith(
      mockDb,
      expect.stringContaining('LIMIT ?'),
      [3],
    );
  });

  it('passes custom limit to query', async () => {
    mockExecuteSql.mockResolvedValueOnce(mockResultSet([]));

    await getRecentDistinctMeals(5);

    expect(mockExecuteSql).toHaveBeenCalledWith(
      mockDb,
      expect.stringContaining('LIMIT ?'),
      [5],
    );
  });

  it('returns empty array when no recent meals', async () => {
    mockExecuteSql.mockResolvedValueOnce(mockResultSet([]));

    const result = await getRecentDistinctMeals();

    expect(result).toEqual([]);
  });
});

describe('addLibraryMeal', () => {
  it('inserts a library meal and returns the inserted MacroLibraryMeal', async () => {
    // INSERT → insertId=1
    mockExecuteSql.mockResolvedValueOnce(mockResultSet([], 1));
    // SELECT
    mockExecuteSql.mockResolvedValueOnce(mockResultSet([macroLibraryMealRow]));

    const result = await addLibraryMeal('Protein Shake', 'snack', { protein: 50, carbs: 20, fat: 5 });

    expect(result.id).toBe(1);
    expect(result.name).toBe('Protein Shake');
    expect(result.protein).toBe(50);
    expect(result.carbs).toBe(20);
    expect(result.fat).toBe(5);
    expect(result.mealType).toBe('snack');
    expect(mockExecuteSql).toHaveBeenNthCalledWith(
      1,
      mockDb,
      expect.stringContaining('INSERT INTO meal_library'),
      expect.arrayContaining(['Protein Shake', 50, 20, 5, 'snack']),
    );
  });
});

describe('getLibraryMealsByType', () => {
  it('returns Record grouped by meal type with MacroLibraryMeal objects', async () => {
    const rows = [
      { id: 1, name: 'Oatmeal', protein_grams: 10, carb_grams: 40, fat_grams: 3, meal_type: 'breakfast', created_at: '2026-01-01T00:00:00' },
      { id: 2, name: 'Sandwich', protein_grams: 25, carb_grams: 30, fat_grams: 10, meal_type: 'lunch', created_at: '2026-01-01T00:00:00' },
      { id: 3, name: 'Steak', protein_grams: 50, carb_grams: 0, fat_grams: 20, meal_type: 'dinner', created_at: '2026-01-01T00:00:00' },
      { id: 4, name: 'Protein Shake', protein_grams: 50, carb_grams: 20, fat_grams: 5, meal_type: 'snack', created_at: '2026-01-01T00:00:00' },
    ];
    mockExecuteSql.mockResolvedValueOnce(mockResultSet(rows));

    const result = await getLibraryMealsByType();

    expect(result.breakfast).toHaveLength(1);
    expect(result.breakfast[0].name).toBe('Oatmeal');
    expect(result.lunch[0].name).toBe('Sandwich');
    expect(result.dinner[0].name).toBe('Steak');
    expect(result.snack[0].name).toBe('Protein Shake');
  });

  it('returns all empty arrays when no library meals exist', async () => {
    mockExecuteSql.mockResolvedValueOnce(mockResultSet([]));

    const result = await getLibraryMealsByType();

    expect(result.breakfast).toEqual([]);
    expect(result.lunch).toEqual([]);
    expect(result.dinner).toEqual([]);
    expect(result.snack).toEqual([]);
  });
});

describe('deleteLibraryMeal', () => {
  it('calls DELETE with the correct library meal id', async () => {
    mockExecuteSql.mockResolvedValueOnce(mockResultSet([], 0));

    await deleteLibraryMeal(1);

    expect(mockExecuteSql).toHaveBeenCalledWith(
      mockDb,
      expect.stringContaining('DELETE FROM meal_library'),
      [1],
    );
  });
});
