jest.mock('../database');

import { executeSql } from '../database';
import { mockResultSet } from '@test-utils/dbMock';
import {
  getExercises,
  getExercisesByCategory,
  addExercise,
  deleteExercise,
  updateExercise,
  updateDefaultRestSeconds,
  searchExercises,
} from '../exercises';

const mockExecuteSql = executeSql as jest.MockedFunction<typeof executeSql>;
const mockDb = {};
const dbModule = require('../database');
Object.defineProperty(dbModule, 'db', {
  value: Promise.resolve(mockDb),
  writable: true,
});

// ── Shared row fixtures ──────────────────────────────────────────────

const exerciseRow1 = {
  id: 1,
  name: 'Bench Press',
  category: 'chest',
  default_rest_seconds: 90,
  is_custom: 0,
  measurement_type: 'reps',
  created_at: '2026-01-01T00:00:00',
};

const exerciseRow2 = {
  id: 2,
  name: 'Squat',
  category: 'legs',
  default_rest_seconds: 120,
  is_custom: 0,
  measurement_type: 'reps',
  created_at: '2026-01-01T00:00:00',
};

beforeEach(() => {
  jest.clearAllMocks();
});

// ── getExercises ─────────────────────────────────────────────────────

describe('getExercises', () => {
  it('returns array of Exercise objects from result rows', async () => {
    mockExecuteSql.mockResolvedValueOnce(mockResultSet([exerciseRow1, exerciseRow2]));

    const result = await getExercises();

    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({
      id: 1,
      name: 'Bench Press',
      category: 'chest',
      defaultRestSeconds: 90,
      isCustom: false,
      measurementType: 'reps',
      createdAt: '2026-01-01T00:00:00',
    });
    expect(result[1].name).toBe('Squat');
  });

  it('returns empty array when no exercises exist', async () => {
    mockExecuteSql.mockResolvedValueOnce(mockResultSet([]));

    const result = await getExercises();

    expect(result).toEqual([]);
  });

  it('queries ORDER BY name ASC', async () => {
    mockExecuteSql.mockResolvedValueOnce(mockResultSet([]));

    await getExercises();

    expect(mockExecuteSql).toHaveBeenCalledWith(
      mockDb,
      expect.stringContaining('ORDER BY name ASC'),
    );
  });
});

// ── getExercisesByCategory ────────────────────────────────────────────

describe('getExercisesByCategory', () => {
  it('returns exercises for specified category', async () => {
    mockExecuteSql.mockResolvedValueOnce(mockResultSet([exerciseRow1]));

    const result = await getExercisesByCategory('chest');

    expect(result).toHaveLength(1);
    expect(result[0].category).toBe('chest');
    expect(mockExecuteSql).toHaveBeenCalledWith(
      mockDb,
      expect.stringContaining('category = ?'),
      ['chest'],
    );
  });

  it('returns empty array when no exercises in category', async () => {
    mockExecuteSql.mockResolvedValueOnce(mockResultSet([]));

    const result = await getExercisesByCategory('back');

    expect(result).toEqual([]);
  });
});

// ── addExercise ───────────────────────────────────────────────────────

describe('addExercise', () => {
  it('inserts exercise and returns the inserted Exercise with isCustom=true', async () => {
    const insertedRow = {
      id: 42,
      name: 'Goblet Squat',
      category: 'legs',
      default_rest_seconds: 60,
      is_custom: 1,
      measurement_type: 'reps',
      created_at: '2026-01-01T00:00:00',
    };

    // First call: INSERT returns insertId=42
    mockExecuteSql.mockResolvedValueOnce(mockResultSet([], 42));
    // Second call: SELECT returns inserted row
    mockExecuteSql.mockResolvedValueOnce(mockResultSet([insertedRow]));

    const result = await addExercise('Goblet Squat', 'legs', 60, 'reps');

    expect(result.id).toBe(42);
    expect(result.isCustom).toBe(true);
    expect(result.defaultRestSeconds).toBe(60);
    expect(result.name).toBe('Goblet Squat');
    expect(result.category).toBe('legs');
  });

  it('uses default restSeconds=90 and measurementType=reps when not provided', async () => {
    const insertedRow = {
      id: 5,
      name: 'Push Up',
      category: 'chest',
      default_rest_seconds: 90,
      is_custom: 1,
      measurement_type: 'reps',
      created_at: '2026-01-01T00:00:00',
    };

    mockExecuteSql.mockResolvedValueOnce(mockResultSet([], 5));
    mockExecuteSql.mockResolvedValueOnce(mockResultSet([insertedRow]));

    const result = await addExercise('Push Up', 'chest');

    expect(result.defaultRestSeconds).toBe(90);
    expect(result.measurementType).toBe('reps');
    expect(mockExecuteSql).toHaveBeenCalledWith(
      mockDb,
      expect.stringContaining('INSERT INTO exercises'),
      expect.arrayContaining([90, 'reps']),
    );
  });
});

// ── deleteExercise ────────────────────────────────────────────────────

describe('deleteExercise', () => {
  it('calls DELETE with the correct exercise id', async () => {
    mockExecuteSql.mockResolvedValueOnce(mockResultSet([], 0));

    await deleteExercise(5);

    expect(mockExecuteSql).toHaveBeenCalledWith(
      mockDb,
      expect.stringContaining('DELETE FROM exercises'),
      [5],
    );
  });
});

// ── updateExercise ────────────────────────────────────────────────────

describe('updateExercise', () => {
  it('executes UPDATE then SELECT and returns updated Exercise', async () => {
    const updatedRow = {
      id: 3,
      name: 'Flat Bench',
      category: 'chest',
      default_rest_seconds: 90,
      is_custom: 0,
      measurement_type: 'reps',
      created_at: '2026-01-01T00:00:00',
    };

    // First call: UPDATE
    mockExecuteSql.mockResolvedValueOnce(mockResultSet([], 0));
    // Second call: SELECT
    mockExecuteSql.mockResolvedValueOnce(mockResultSet([updatedRow]));

    const result = await updateExercise(3, 'Flat Bench', 'chest', 'reps');

    expect(result.name).toBe('Flat Bench');
    expect(result.id).toBe(3);
    expect(mockExecuteSql).toHaveBeenNthCalledWith(
      1,
      mockDb,
      expect.stringContaining('UPDATE exercises'),
      ['Flat Bench', 'chest', 'reps', 3],
    );
  });
});

// ── updateDefaultRestSeconds ──────────────────────────────────────────

describe('updateDefaultRestSeconds', () => {
  it('calls UPDATE with restSeconds and exerciseId in correct order', async () => {
    mockExecuteSql.mockResolvedValueOnce(mockResultSet([], 0));

    await updateDefaultRestSeconds(7, 120);

    expect(mockExecuteSql).toHaveBeenCalledWith(
      mockDb,
      expect.stringContaining('UPDATE exercises SET default_rest_seconds'),
      [120, 7],
    );
  });
});

// ── searchExercises ───────────────────────────────────────────────────

describe('searchExercises', () => {
  it('returns matching exercises using LIKE query', async () => {
    const benchRow2 = {
      id: 3,
      name: 'Dumbbell Bench Press',
      category: 'chest',
      default_rest_seconds: 90,
      is_custom: 0,
      measurement_type: 'reps',
      created_at: '2026-01-01T00:00:00',
    };

    mockExecuteSql.mockResolvedValueOnce(mockResultSet([exerciseRow1, benchRow2]));

    const result = await searchExercises('bench');

    expect(result).toHaveLength(2);
    expect(mockExecuteSql).toHaveBeenCalledWith(
      mockDb,
      expect.stringContaining('LIKE'),
      ['%bench%'],
    );
  });

  it('returns empty array when no matches found', async () => {
    mockExecuteSql.mockResolvedValueOnce(mockResultSet([]));

    const result = await searchExercises('zzz_no_match');

    expect(result).toEqual([]);
  });
});
