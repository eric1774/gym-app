jest.mock('../database');
jest.mock('../../utils/dates');

import { db, executeSql } from '../database';
import { getLocalDateString, getLocalDateTimeString } from '../../utils/dates';
import { mockResultSet } from '@test-utils';
import {
  addMeal,
  updateMeal,
  deleteMeal,
  getMealsByDate,
  getProteinGoal,
  setProteinGoal,
  getDailyProteinTotals,
  getTodayProteinTotal,
  getStreakDays,
  get7DayAverage,
  getRecentDistinctMeals,
  addLibraryMeal,
  getLibraryMealsByType,
  deleteLibraryMeal,
} from '../protein';

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

const mealRow = {
  id: 1,
  protein_grams: 30,
  description: 'Chicken breast',
  meal_type: 'lunch',
  logged_at: '2026-03-15T12:00:00',
  local_date: '2026-03-15',
  created_at: '2026-03-15T10:00:00',
};

const proteinSettingsRow = {
  id: 1,
  daily_goal_grams: 150,
  created_at: '2026-01-01T00:00:00',
  updated_at: '2026-03-15T10:00:00',
};

const libraryMealRow = {
  id: 1,
  name: 'Protein Shake',
  protein_grams: 50,
  meal_type: 'snack',
  created_at: '2026-03-15T10:00:00',
};

// ── Meal CRUD ────────────────────────────────────────────────────────

describe('addMeal', () => {
  it('inserts a meal and returns the inserted Meal record', async () => {
    // getProteinGoal SELECT → returns goal
    mockExecuteSql.mockResolvedValueOnce(mockResultSet([{ daily_goal_grams: 150 }]));
    // INSERT → insertId=1
    mockExecuteSql.mockResolvedValueOnce(mockResultSet([], 1));
    // SELECT → returns meal row
    mockExecuteSql.mockResolvedValueOnce(mockResultSet([mealRow]));

    const result = await addMeal(30, 'Chicken breast', 'lunch');

    expect(result.id).toBe(1);
    expect(result.proteinGrams).toBe(30);
    expect(result.mealType).toBe('lunch');
    expect(result.description).toBe('Chicken breast');
    expect(result.localDate).toBe('2026-03-15');
  });

  it('throws Error when no protein goal is set', async () => {
    // getProteinGoal SELECT → empty ResultSet (no goal)
    mockExecuteSql.mockResolvedValueOnce(mockResultSet([]));

    await expect(addMeal(30, 'Chicken breast', 'lunch')).rejects.toThrow(
      'Protein goal must be set before logging meals',
    );
  });
});

describe('updateMeal', () => {
  it('calls UPDATE then SELECT and returns updated Meal', async () => {
    const updatedRow = { ...mealRow, protein_grams: 40, description: 'Grilled chicken', meal_type: 'dinner' };
    // UPDATE
    mockExecuteSql.mockResolvedValueOnce(mockResultSet([], 0));
    // SELECT
    mockExecuteSql.mockResolvedValueOnce(mockResultSet([updatedRow]));

    const loggedAt = new Date('2026-03-15');
    const result = await updateMeal(1, 40, 'Grilled chicken', 'dinner', loggedAt);

    expect(result.proteinGrams).toBe(40);
    expect(result.mealType).toBe('dinner');
    expect(result.description).toBe('Grilled chicken');
    // Verify date mocks were called with the provided Date
    expect(mockGetLocalDateString).toHaveBeenCalledWith(loggedAt);
    expect(mockGetLocalDateTimeString).toHaveBeenCalledWith(loggedAt);
    expect(mockExecuteSql).toHaveBeenNthCalledWith(
      1,
      mockDb,
      expect.stringContaining('UPDATE meals'),
      expect.arrayContaining([40, 'Grilled chicken', 'dinner']),
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
  it('returns array of Meal objects for the given date', async () => {
    const mealRow2 = { ...mealRow, id: 2, meal_type: 'dinner', protein_grams: 45 };
    mockExecuteSql.mockResolvedValueOnce(mockResultSet([mealRow, mealRow2]));

    const result = await getMealsByDate('2026-03-15');

    expect(result).toHaveLength(2);
    expect(result[0].id).toBe(1);
    expect(result[1].id).toBe(2);
    expect(mockExecuteSql).toHaveBeenCalledWith(
      mockDb,
      expect.stringContaining("WHERE local_date = ?"),
      ['2026-03-15'],
    );
  });

  it('returns empty array when no meals for that date', async () => {
    mockExecuteSql.mockResolvedValueOnce(mockResultSet([]));

    const result = await getMealsByDate('2026-03-10');

    expect(result).toEqual([]);
  });
});

// ── Goal functions ───────────────────────────────────────────────────

describe('getProteinGoal', () => {
  it('returns goal as number when settings row exists', async () => {
    mockExecuteSql.mockResolvedValueOnce(mockResultSet([{ daily_goal_grams: 150 }]));

    const result = await getProteinGoal();

    expect(result).toBe(150);
  });

  it('returns null when no settings row exists', async () => {
    mockExecuteSql.mockResolvedValueOnce(mockResultSet([]));

    const result = await getProteinGoal();

    expect(result).toBeNull();
  });
});

describe('setProteinGoal', () => {
  it('inserts new row when count=0 and returns ProteinSettings', async () => {
    // COUNT → 0
    mockExecuteSql.mockResolvedValueOnce(mockResultSet([{ cnt: 0 }]));
    // INSERT
    mockExecuteSql.mockResolvedValueOnce(mockResultSet([], 1));
    // SELECT LIMIT 1
    mockExecuteSql.mockResolvedValueOnce(mockResultSet([{ ...proteinSettingsRow, daily_goal_grams: 180 }]));

    const result = await setProteinGoal(180);

    expect(result.dailyGoalGrams).toBe(180);
    expect(mockExecuteSql).toHaveBeenNthCalledWith(
      2,
      mockDb,
      expect.stringContaining('INSERT INTO protein_settings'),
      expect.arrayContaining([180]),
    );
  });

  it('updates existing row when count>0 and returns ProteinSettings', async () => {
    // COUNT → 1
    mockExecuteSql.mockResolvedValueOnce(mockResultSet([{ cnt: 1 }]));
    // UPDATE
    mockExecuteSql.mockResolvedValueOnce(mockResultSet([], 0));
    // SELECT LIMIT 1
    mockExecuteSql.mockResolvedValueOnce(mockResultSet([{ ...proteinSettingsRow, daily_goal_grams: 180 }]));

    const result = await setProteinGoal(180);

    expect(result.dailyGoalGrams).toBe(180);
    expect(mockExecuteSql).toHaveBeenNthCalledWith(
      2,
      mockDb,
      expect.stringContaining('UPDATE protein_settings'),
      expect.arrayContaining([180]),
    );
  });
});

// ── Chart and totals ─────────────────────────────────────────────────

describe('getDailyProteinTotals', () => {
  it('returns array of ProteinChartPoint with goal attached to each point', async () => {
    // getProteinGoal SELECT → 150
    mockExecuteSql.mockResolvedValueOnce(mockResultSet([{ daily_goal_grams: 150 }]));
    // Main SELECT → 3 grouped rows
    mockExecuteSql.mockResolvedValueOnce(
      mockResultSet([
        { local_date: '2026-03-01', total_protein_grams: 160 },
        { local_date: '2026-03-10', total_protein_grams: 120 },
        { local_date: '2026-03-15', total_protein_grams: 85 },
      ]),
    );

    const result = await getDailyProteinTotals('2026-03-01', '2026-03-15');

    expect(result).toHaveLength(3);
    expect(result[0]).toEqual({ date: '2026-03-01', totalProteinGrams: 160, goalGrams: 150 });
    expect(result[1].goalGrams).toBe(150);
    expect(result[2].totalProteinGrams).toBe(85);
  });

  it('returns empty array when no meals in range', async () => {
    // getProteinGoal SELECT → 150
    mockExecuteSql.mockResolvedValueOnce(mockResultSet([{ daily_goal_grams: 150 }]));
    // Main SELECT → empty
    mockExecuteSql.mockResolvedValueOnce(mockResultSet([]));

    const result = await getDailyProteinTotals('2026-03-01', '2026-03-15');

    expect(result).toEqual([]);
  });
});

describe('getTodayProteinTotal', () => {
  it('returns total protein for today using COALESCE', async () => {
    mockExecuteSql.mockResolvedValueOnce(mockResultSet([{ total: 85 }]));

    const result = await getTodayProteinTotal();

    expect(result).toBe(85);
    expect(mockGetLocalDateString).toHaveBeenCalledWith(); // called with no args for today
  });

  it('returns 0 when no meals logged today (COALESCE handles null)', async () => {
    mockExecuteSql.mockResolvedValueOnce(mockResultSet([{ total: 0 }]));

    const result = await getTodayProteinTotal();

    expect(result).toBe(0);
  });
});

// ── Streak logic ─────────────────────────────────────────────────────

describe('getStreakDays', () => {
  it('returns 0 when no protein goal is set', async () => {
    // getProteinGoal SELECT → empty (no goal)
    mockExecuteSql.mockResolvedValueOnce(mockResultSet([]));

    const result = await getStreakDays();

    expect(result).toBe(0);
  });

  it('returns 0 when no meals have been logged at all', async () => {
    // getProteinGoal → 150
    mockExecuteSql.mockResolvedValueOnce(mockResultSet([{ daily_goal_grams: 150 }]));
    // Grouped meals SELECT → empty
    mockExecuteSql.mockResolvedValueOnce(mockResultSet([]));

    const result = await getStreakDays();

    expect(result).toBe(0);
  });

  it('returns 2 when today and yesterday meet goal but day before is missing', async () => {
    // getProteinGoal → 150
    mockExecuteSql.mockResolvedValueOnce(mockResultSet([{ daily_goal_grams: 150 }]));
    // Grouped meals: today meets goal, yesterday meets goal, gap at 2026-03-13
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
    // getProteinGoal → 150
    mockExecuteSql.mockResolvedValueOnce(mockResultSet([{ daily_goal_grams: 150 }]));
    mockExecuteSql.mockResolvedValueOnce(
      mockResultSet([
        { local_date: '2026-03-15', total: 50 },  // today, under goal
        { local_date: '2026-03-14', total: 160 }, // yesterday, meets goal
        { local_date: '2026-03-13', total: 155 }, // day before, meets goal
      ]),
    );

    const result = await getStreakDays();

    expect(result).toBe(2); // yesterday + day before (today skipped because under goal)
  });

  it('returns 2 when today has no meals but yesterday and day before meet goal', async () => {
    // getProteinGoal → 150
    mockExecuteSql.mockResolvedValueOnce(mockResultSet([{ daily_goal_grams: 150 }]));
    // First row is NOT today (today has no meals)
    mockExecuteSql.mockResolvedValueOnce(
      mockResultSet([
        { local_date: '2026-03-14', total: 160 }, // yesterday (today has no rows)
        { local_date: '2026-03-13', total: 155 }, // day before
      ]),
    );

    const result = await getStreakDays();

    expect(result).toBe(2);
  });

  it('returns 5 for a consecutive 5-day streak with all days meeting goal', async () => {
    // getProteinGoal → 150
    mockExecuteSql.mockResolvedValueOnce(mockResultSet([{ daily_goal_grams: 150 }]));
    mockExecuteSql.mockResolvedValueOnce(
      mockResultSet([
        { local_date: '2026-03-15', total: 200 }, // today
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
    // getProteinGoal → 150
    mockExecuteSql.mockResolvedValueOnce(mockResultSet([{ daily_goal_grams: 150 }]));
    mockExecuteSql.mockResolvedValueOnce(
      mockResultSet([
        { local_date: '2026-03-15', total: 180 }, // today, meets goal
        // no further rows
      ]),
    );

    const result = await getStreakDays();

    expect(result).toBe(1);
  });
});

// ── 7-day average ─────────────────────────────────────────────────────

describe('get7DayAverage', () => {
  it('returns rounded average when meals exist in last 7 days', async () => {
    mockExecuteSql.mockResolvedValueOnce(mockResultSet([{ avg_protein: 142.5 }]));

    const result = await get7DayAverage();

    expect(result).toBe(143); // Math.round(142.5) = 143
  });

  it('returns null when avg_protein is null (no meals in last 7 days)', async () => {
    mockExecuteSql.mockResolvedValueOnce(mockResultSet([{ avg_protein: null }]));

    const result = await get7DayAverage();

    expect(result).toBeNull();
  });

  it('returns null when avg_protein is undefined', async () => {
    mockExecuteSql.mockResolvedValueOnce(mockResultSet([{ avg_protein: undefined }]));

    const result = await get7DayAverage();

    expect(result).toBeNull();
  });

  it('returns exact integer average when no rounding needed', async () => {
    mockExecuteSql.mockResolvedValueOnce(mockResultSet([{ avg_protein: 120 }]));

    const result = await get7DayAverage();

    expect(result).toBe(120);
  });
});

// ── Quick-add and library functions ──────────────────────────────────

describe('getRecentDistinctMeals', () => {
  it('returns array of recent distinct meals with default limit 3', async () => {
    const rows = [
      { description: 'Chicken', protein_grams: 30, meal_type: 'lunch' },
      { description: 'Shake', protein_grams: 50, meal_type: 'snack' },
      { description: 'Eggs', protein_grams: 20, meal_type: 'breakfast' },
    ];
    mockExecuteSql.mockResolvedValueOnce(mockResultSet(rows));

    const result = await getRecentDistinctMeals();

    expect(result).toHaveLength(3);
    expect(result[0]).toEqual({ description: 'Chicken', proteinGrams: 30, mealType: 'lunch' });
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
  it('inserts a library meal and returns the inserted LibraryMeal', async () => {
    // INSERT → insertId=1
    mockExecuteSql.mockResolvedValueOnce(mockResultSet([], 1));
    // SELECT
    mockExecuteSql.mockResolvedValueOnce(mockResultSet([libraryMealRow]));

    const result = await addLibraryMeal('Protein Shake', 50, 'snack');

    expect(result.id).toBe(1);
    expect(result.name).toBe('Protein Shake');
    expect(result.proteinGrams).toBe(50);
    expect(result.mealType).toBe('snack');
    expect(mockExecuteSql).toHaveBeenNthCalledWith(
      1,
      mockDb,
      expect.stringContaining('INSERT INTO meal_library'),
      expect.arrayContaining(['Protein Shake', 50, 'snack']),
    );
  });
});

describe('getLibraryMealsByType', () => {
  it('returns Record grouped by meal type with LibraryMeal objects', async () => {
    const rows = [
      { id: 1, name: 'Oatmeal', protein_grams: 10, meal_type: 'breakfast', created_at: '2026-01-01T00:00:00' },
      { id: 2, name: 'Sandwich', protein_grams: 25, meal_type: 'lunch', created_at: '2026-01-01T00:00:00' },
      { id: 3, name: 'Steak', protein_grams: 50, meal_type: 'dinner', created_at: '2026-01-01T00:00:00' },
      { id: 4, name: 'Protein Shake', protein_grams: 40, meal_type: 'snack', created_at: '2026-01-01T00:00:00' },
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
