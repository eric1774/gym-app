jest.mock('../database');

import { executeSql } from '../database';
import { mockResultSet } from '@test-utils/dbMock';
import {
  createSession,
  getActiveSession,
  completeSession,
  getSessionExercises,
  addExerciseToSession,
  markExerciseComplete,
  toggleExerciseComplete,
  hasSessionActivity,
  deleteSession,
  updateSessionRestSeconds,
  uncompleteSession,
  createCompletedSession,
} from '../sessions';

const mockExecuteSql = executeSql as jest.MockedFunction<typeof executeSql>;
const mockDb = {};
const dbModule = require('../database');
Object.defineProperty(dbModule, 'db', {
  value: Promise.resolve(mockDb),
  writable: true,
});

// ── Shared row fixtures ──────────────────────────────────────────────

const sessionRow = {
  id: 10,
  started_at: '2026-01-01T10:00:00',
  completed_at: null,
  program_day_id: null,
};

const completedSessionRow = {
  id: 10,
  started_at: '2026-01-01T10:00:00',
  completed_at: '2026-01-01T11:00:00',
  program_day_id: null,
};

const exerciseSessionRow = {
  exercise_id: 5,
  session_id: 10,
  is_complete: 0,
  rest_seconds: 90,
};

beforeEach(() => {
  jest.clearAllMocks();
});

// ── createSession ─────────────────────────────────────────────────────

describe('createSession', () => {
  it('creates session without programDayId: 2 SQL calls (INSERT + SELECT)', async () => {
    // INSERT
    mockExecuteSql.mockResolvedValueOnce(mockResultSet([], 10));
    // SELECT
    mockExecuteSql.mockResolvedValueOnce(mockResultSet([sessionRow]));

    const result = await createSession();

    expect(result.id).toBe(10);
    expect(result.completedAt).toBeNull();
    expect(result.programDayId).toBeNull();
    expect(mockExecuteSql).toHaveBeenCalledTimes(2);
    expect(mockExecuteSql).toHaveBeenNthCalledWith(
      1,
      mockDb,
      expect.stringContaining('INSERT INTO workout_sessions'),
      expect.arrayContaining([null, null]),
    );
  });

  it('creates session with programDayId: 3 SQL calls (week SELECT + INSERT + SELECT)', async () => {
    // Week query
    mockExecuteSql.mockResolvedValueOnce(mockResultSet([{ current_week: 3 }]));
    // INSERT
    mockExecuteSql.mockResolvedValueOnce(mockResultSet([], 10));
    // SELECT
    mockExecuteSql.mockResolvedValueOnce(mockResultSet([{ ...sessionRow, program_day_id: 7 }]));

    const result = await createSession(7);

    expect(result.programDayId).toBe(7);
    expect(mockExecuteSql).toHaveBeenCalledTimes(3);
    expect(mockExecuteSql).toHaveBeenNthCalledWith(
      1,
      mockDb,
      expect.stringContaining('current_week'),
      [7],
    );
    expect(mockExecuteSql).toHaveBeenNthCalledWith(
      2,
      mockDb,
      expect.stringContaining('INSERT INTO workout_sessions'),
      expect.arrayContaining([7, 3]),
    );
  });
});

// ── getActiveSession ──────────────────────────────────────────────────

describe('getActiveSession', () => {
  it('returns active session when one exists', async () => {
    mockExecuteSql.mockResolvedValueOnce(mockResultSet([sessionRow]));

    const result = await getActiveSession();

    expect(result).not.toBeNull();
    expect(result!.id).toBe(10);
    expect(result!.completedAt).toBeNull();
    expect(mockExecuteSql).toHaveBeenCalledWith(
      mockDb,
      expect.stringContaining('completed_at IS NULL'),
    );
  });

  it('returns null when no active session exists', async () => {
    mockExecuteSql.mockResolvedValueOnce(mockResultSet([]));

    const result = await getActiveSession();

    expect(result).toBeNull();
  });
});

// ── completeSession ───────────────────────────────────────────────────

describe('completeSession', () => {
  it('updates completed_at for the session', async () => {
    mockExecuteSql.mockResolvedValueOnce(mockResultSet([], 0));

    await completeSession(10);

    expect(mockExecuteSql).toHaveBeenCalledWith(
      mockDb,
      expect.stringContaining('SET completed_at'),
      expect.arrayContaining([10]),
    );
  });
});

// ── getSessionExercises ───────────────────────────────────────────────

describe('getSessionExercises', () => {
  it('returns array of ExerciseSession objects', async () => {
    const completedRow = { ...exerciseSessionRow, is_complete: 1 };
    mockExecuteSql.mockResolvedValueOnce(mockResultSet([exerciseSessionRow, completedRow]));

    const result = await getSessionExercises(10);

    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({
      exerciseId: 5,
      sessionId: 10,
      isComplete: false,
      restSeconds: 90,
    });
    expect(result[1].isComplete).toBe(true);
    expect(mockExecuteSql).toHaveBeenCalledWith(
      mockDb,
      expect.stringContaining('exercise_sessions'),
      [10],
    );
  });

  it('returns empty array when no exercises in session', async () => {
    mockExecuteSql.mockResolvedValueOnce(mockResultSet([]));

    const result = await getSessionExercises(10);

    expect(result).toEqual([]);
  });
});

// ── addExerciseToSession ──────────────────────────────────────────────

describe('addExerciseToSession', () => {
  it('calls INSERT OR IGNORE with correct params', async () => {
    mockExecuteSql.mockResolvedValueOnce(mockResultSet([], 0));

    await addExerciseToSession(10, 5, 90);

    expect(mockExecuteSql).toHaveBeenCalledWith(
      mockDb,
      expect.stringContaining('INSERT OR IGNORE INTO exercise_sessions'),
      [5, 10, 90],
    );
  });
});

// ── markExerciseComplete ──────────────────────────────────────────────

describe('markExerciseComplete', () => {
  it('calls UPDATE to set is_complete = 1', async () => {
    mockExecuteSql.mockResolvedValueOnce(mockResultSet([], 0));

    await markExerciseComplete(10, 5);

    expect(mockExecuteSql).toHaveBeenCalledWith(
      mockDb,
      expect.stringContaining('is_complete = 1'),
      [10, 5],
    );
  });
});

// ── toggleExerciseComplete ────────────────────────────────────────────

describe('toggleExerciseComplete', () => {
  it('returns false when exercise not found', async () => {
    mockExecuteSql.mockResolvedValueOnce(mockResultSet([]));

    const result = await toggleExerciseComplete(10, 5);

    expect(result).toBe(false);
    expect(mockExecuteSql).toHaveBeenCalledTimes(1);
  });

  it('toggles from incomplete (0) to complete (1) and returns true', async () => {
    // SELECT: is_complete = 0
    mockExecuteSql.mockResolvedValueOnce(mockResultSet([{ is_complete: 0 }]));
    // UPDATE
    mockExecuteSql.mockResolvedValueOnce(mockResultSet([], 0));

    const result = await toggleExerciseComplete(10, 5);

    expect(result).toBe(true);
    expect(mockExecuteSql).toHaveBeenNthCalledWith(
      2,
      mockDb,
      expect.stringContaining('SET is_complete = ?'),
      [1, 10, 5],
    );
  });

  it('toggles from complete (1) to incomplete (0) and returns false', async () => {
    // SELECT: is_complete = 1
    mockExecuteSql.mockResolvedValueOnce(mockResultSet([{ is_complete: 1 }]));
    // UPDATE
    mockExecuteSql.mockResolvedValueOnce(mockResultSet([], 0));

    const result = await toggleExerciseComplete(10, 5);

    expect(result).toBe(false);
    expect(mockExecuteSql).toHaveBeenNthCalledWith(
      2,
      mockDb,
      expect.stringContaining('SET is_complete = ?'),
      [0, 10, 5],
    );
  });
});

// ── hasSessionActivity ────────────────────────────────────────────────

describe('hasSessionActivity', () => {
  it('returns true when sets exist', async () => {
    // sets COUNT = 1
    mockExecuteSql.mockResolvedValueOnce(mockResultSet([{ cnt: 1 }]));

    const result = await hasSessionActivity(10);

    expect(result).toBe(true);
    expect(mockExecuteSql).toHaveBeenCalledTimes(1);
  });

  it('returns true when no sets but completed exercises exist', async () => {
    // sets COUNT = 0
    mockExecuteSql.mockResolvedValueOnce(mockResultSet([{ cnt: 0 }]));
    // completed exercises COUNT = 2
    mockExecuteSql.mockResolvedValueOnce(mockResultSet([{ cnt: 2 }]));

    const result = await hasSessionActivity(10);

    expect(result).toBe(true);
    expect(mockExecuteSql).toHaveBeenCalledTimes(2);
  });

  it('returns false when no sets and no completed exercises', async () => {
    // sets COUNT = 0
    mockExecuteSql.mockResolvedValueOnce(mockResultSet([{ cnt: 0 }]));
    // completed exercises COUNT = 0
    mockExecuteSql.mockResolvedValueOnce(mockResultSet([{ cnt: 0 }]));

    const result = await hasSessionActivity(10);

    expect(result).toBe(false);
  });
});

// ── deleteSession ─────────────────────────────────────────────────────

describe('deleteSession', () => {
  it('deletes heart_rate_samples, workout_sets, exercise_sessions, and workout_sessions in order', async () => {
    mockExecuteSql
      .mockResolvedValueOnce(mockResultSet([], 0))
      .mockResolvedValueOnce(mockResultSet([], 0))
      .mockResolvedValueOnce(mockResultSet([], 0))
      .mockResolvedValueOnce(mockResultSet([], 0));

    await deleteSession(10);

    expect(mockExecuteSql).toHaveBeenCalledTimes(4);
    expect(mockExecuteSql).toHaveBeenNthCalledWith(
      1,
      mockDb,
      expect.stringContaining('DELETE FROM heart_rate_samples'),
      [10],
    );
    expect(mockExecuteSql).toHaveBeenNthCalledWith(
      2,
      mockDb,
      expect.stringContaining('DELETE FROM workout_sets'),
      [10],
    );
    expect(mockExecuteSql).toHaveBeenNthCalledWith(
      3,
      mockDb,
      expect.stringContaining('DELETE FROM exercise_sessions'),
      [10],
    );
    expect(mockExecuteSql).toHaveBeenNthCalledWith(
      4,
      mockDb,
      expect.stringContaining('DELETE FROM workout_sessions'),
      [10],
    );
  });
});

// ── updateSessionRestSeconds ──────────────────────────────────────────

describe('updateSessionRestSeconds', () => {
  it('updates rest_seconds for the exercise in the session', async () => {
    mockExecuteSql.mockResolvedValueOnce(mockResultSet([], 0));

    await updateSessionRestSeconds(10, 5, 120);

    expect(mockExecuteSql).toHaveBeenCalledWith(
      mockDb,
      expect.stringContaining('SET rest_seconds = ?'),
      [120, 10, 5],
    );
  });
});

// ── uncompleteSession ─────────────────────────────────────────────────

describe('uncompleteSession', () => {
  it('sets completed_at to NULL', async () => {
    mockExecuteSql.mockResolvedValueOnce(mockResultSet([], 0));

    await uncompleteSession(10);

    expect(mockExecuteSql).toHaveBeenCalledWith(
      mockDb,
      expect.stringContaining('completed_at = NULL'),
      [10],
    );
  });
});

// ── createCompletedSession ────────────────────────────────────────────

describe('createCompletedSession', () => {
  it('looks up program week then inserts a completed session', async () => {
    // Week query
    mockExecuteSql.mockResolvedValueOnce(mockResultSet([{ current_week: 2 }]));
    // INSERT
    mockExecuteSql.mockResolvedValueOnce(mockResultSet([], 0));

    await createCompletedSession(7);

    expect(mockExecuteSql).toHaveBeenCalledTimes(2);
    expect(mockExecuteSql).toHaveBeenNthCalledWith(
      1,
      mockDb,
      expect.stringContaining('current_week'),
      [7],
    );
    expect(mockExecuteSql).toHaveBeenNthCalledWith(
      2,
      mockDb,
      expect.stringContaining('INSERT INTO workout_sessions'),
      expect.arrayContaining([7, 2]),
    );
  });

  it('inserts with null program_week when no week result found', async () => {
    // Week query returns empty
    mockExecuteSql.mockResolvedValueOnce(mockResultSet([]));
    // INSERT
    mockExecuteSql.mockResolvedValueOnce(mockResultSet([], 0));

    await createCompletedSession(7);

    expect(mockExecuteSql).toHaveBeenNthCalledWith(
      2,
      mockDb,
      expect.stringContaining('INSERT INTO workout_sessions'),
      expect.arrayContaining([null]),
    );
  });
});
