jest.mock('../database');

import { executeSql } from '../database';
import { mockResultSet } from '@test-utils/dbMock';
import {
  logSet,
  getSetsForExerciseInSession,
  getLastSessionSets,
  deleteSet,
  checkForPR,
} from '../sets';

const mockExecuteSql = executeSql as jest.MockedFunction<typeof executeSql>;
const mockDb = {};
const dbModule = require('../database');
Object.defineProperty(dbModule, 'db', {
  value: Promise.resolve(mockDb),
  writable: true,
});

// ── Shared row fixtures ──────────────────────────────────────────────

const setRow = {
  id: 100,
  session_id: 10,
  exercise_id: 5,
  set_number: 1,
  weight_kg: 80,
  reps: 8,
  logged_at: '2026-01-01T10:00:00',
  is_warmup: 0,
};

const warmupSetRow = {
  ...setRow,
  id: 101,
  is_warmup: 1,
  set_number: 1,
};

beforeEach(() => {
  jest.clearAllMocks();
});

// ── logSet ────────────────────────────────────────────────────────────

describe('logSet', () => {
  it('computes set_number as existing count + 1, inserts and returns WorkoutSet', async () => {
    // COUNT query: 0 existing sets
    mockExecuteSql.mockResolvedValueOnce(mockResultSet([{ cnt: 0 }]));
    // INSERT
    mockExecuteSql.mockResolvedValueOnce(mockResultSet([], 100));
    // SELECT
    mockExecuteSql.mockResolvedValueOnce(mockResultSet([setRow]));

    const result = await logSet(10, 5, 80, 8);

    expect(result).toEqual({
      id: 100,
      sessionId: 10,
      exerciseId: 5,
      setNumber: 1,
      weightKg: 80,
      reps: 8,
      loggedAt: '2026-01-01T10:00:00',
      isWarmup: false,
    });
    expect(mockExecuteSql).toHaveBeenCalledTimes(3);
    // INSERT should use set_number = 1 (0 + 1)
    expect(mockExecuteSql).toHaveBeenNthCalledWith(
      2,
      mockDb,
      expect.stringContaining('INSERT INTO workout_sets'),
      [10, 5, 1, 80, 8, expect.any(String), 0],
    );
  });

  it('increments set_number when previous sets exist', async () => {
    // COUNT query: 2 existing sets
    mockExecuteSql.mockResolvedValueOnce(mockResultSet([{ cnt: 2 }]));
    // INSERT
    mockExecuteSql.mockResolvedValueOnce(mockResultSet([], 102));
    // SELECT
    mockExecuteSql.mockResolvedValueOnce(mockResultSet([{ ...setRow, id: 102, set_number: 3 }]));

    const result = await logSet(10, 5, 100, 5);

    expect(result.setNumber).toBe(3);
    expect(mockExecuteSql).toHaveBeenNthCalledWith(
      2,
      mockDb,
      expect.stringContaining('INSERT INTO workout_sets'),
      [10, 5, 3, 100, 5, expect.any(String), 0],
    );
  });

  it('passes is_warmup = 1 when isWarmup is true', async () => {
    mockExecuteSql.mockResolvedValueOnce(mockResultSet([{ cnt: 0 }]));
    mockExecuteSql.mockResolvedValueOnce(mockResultSet([], 101));
    mockExecuteSql.mockResolvedValueOnce(mockResultSet([warmupSetRow]));

    const result = await logSet(10, 5, 40, 15, true);

    expect(result.isWarmup).toBe(true);
    expect(mockExecuteSql).toHaveBeenNthCalledWith(
      2,
      mockDb,
      expect.stringContaining('INSERT INTO workout_sets'),
      [10, 5, 1, 40, 15, expect.any(String), 1],
    );
  });
});

// ── getSetsForExerciseInSession ───────────────────────────────────────

describe('getSetsForExerciseInSession', () => {
  it('returns ordered array of WorkoutSet objects', async () => {
    const setRow2 = { ...setRow, id: 101, set_number: 2, reps: 6 };
    mockExecuteSql.mockResolvedValueOnce(mockResultSet([setRow, setRow2]));

    const result = await getSetsForExerciseInSession(10, 5);

    expect(result).toHaveLength(2);
    expect(result[0].setNumber).toBe(1);
    expect(result[1].setNumber).toBe(2);
    expect(mockExecuteSql).toHaveBeenCalledWith(
      mockDb,
      expect.stringContaining('ORDER BY set_number ASC'),
      [10, 5],
    );
  });

  it('returns empty array when no sets exist', async () => {
    mockExecuteSql.mockResolvedValueOnce(mockResultSet([]));

    const result = await getSetsForExerciseInSession(10, 5);

    expect(result).toEqual([]);
  });
});

// ── getLastSessionSets ────────────────────────────────────────────────

describe('getLastSessionSets', () => {
  it('returns empty array when no previous session found', async () => {
    mockExecuteSql.mockResolvedValueOnce(mockResultSet([]));

    const result = await getLastSessionSets(5, 10);

    expect(result).toEqual([]);
    expect(mockExecuteSql).toHaveBeenCalledTimes(1);
  });

  it('finds previous session then calls getSetsForExerciseInSession', async () => {
    // Previous session query returns session id=9
    mockExecuteSql.mockResolvedValueOnce(mockResultSet([{ id: 9 }]));
    // Sets for session 9
    mockExecuteSql.mockResolvedValueOnce(mockResultSet([{ ...setRow, session_id: 9 }]));

    const result = await getLastSessionSets(5, 10);

    expect(result).toHaveLength(1);
    expect(result[0].sessionId).toBe(9);
    expect(mockExecuteSql).toHaveBeenCalledTimes(2);
    expect(mockExecuteSql).toHaveBeenNthCalledWith(
      1,
      mockDb,
      expect.stringContaining('completed_at IS NOT NULL'),
      [5, 10],
    );
    // Second call is getSetsForExerciseInSession(9, 5)
    expect(mockExecuteSql).toHaveBeenNthCalledWith(
      2,
      mockDb,
      expect.stringContaining('ORDER BY set_number ASC'),
      [9, 5],
    );
  });
});

// ── deleteSet ─────────────────────────────────────────────────────────

describe('deleteSet', () => {
  it('calls DELETE with the correct set id', async () => {
    mockExecuteSql.mockResolvedValueOnce(mockResultSet([], 0));

    await deleteSet(100);

    expect(mockExecuteSql).toHaveBeenCalledWith(
      mockDb,
      expect.stringContaining('DELETE FROM workout_sets'),
      [100],
    );
  });
});

// ── checkForPR ────────────────────────────────────────────────────────

describe('checkForPR', () => {
  it('returns false when max_weight is null (first-ever performance)', async () => {
    mockExecuteSql.mockResolvedValueOnce(mockResultSet([{ max_weight: null }]));

    const result = await checkForPR(5, 100, 8, 10);

    expect(result).toBe(false);
  });

  it('returns true when weightKg strictly exceeds max_weight', async () => {
    mockExecuteSql.mockResolvedValueOnce(mockResultSet([{ max_weight: 90 }]));

    const result = await checkForPR(5, 100, 8, 10);

    expect(result).toBe(true);
  });

  it('returns false when weightKg equals max_weight (not strictly greater)', async () => {
    mockExecuteSql.mockResolvedValueOnce(mockResultSet([{ max_weight: 100 }]));

    const result = await checkForPR(5, 100, 8, 10);

    expect(result).toBe(false);
  });

  it('returns false when weightKg is less than max_weight', async () => {
    mockExecuteSql.mockResolvedValueOnce(mockResultSet([{ max_weight: 110 }]));

    const result = await checkForPR(5, 100, 8, 10);

    expect(result).toBe(false);
  });

  it('queries with correct params excluding current session and warmup sets', async () => {
    mockExecuteSql.mockResolvedValueOnce(mockResultSet([{ max_weight: 80 }]));

    await checkForPR(5, 100, 8, 10);

    expect(mockExecuteSql).toHaveBeenCalledWith(
      mockDb,
      expect.stringContaining('MAX(ws.weight_kg)'),
      [5, 8, 10],
    );
    expect(mockExecuteSql).toHaveBeenCalledWith(
      mockDb,
      expect.stringContaining('is_warmup = 0'),
      expect.anything(),
    );
  });
});
