jest.mock('../database');

import { db, executeSql } from '../database';
import { mockResultSet } from '@test-utils';
import {
  getExerciseProgressData,
  getTimedExerciseProgressData,
  getExerciseHistory,
  deleteExerciseHistorySession,
  getRecentlyTrainedExercises,
  getProgramWeekCompletion,
  getProgramTotalCompleted,
  getNextWorkoutDay,
  unmarkDayCompletion,
  getSessionTimeSummary,
  exportAllData,
} from '../dashboard';

const mockExecuteSql = executeSql as jest.MockedFunction<typeof executeSql>;

const mockDb = {};
jest.mocked(db as any);
const dbModule = require('../database');
Object.defineProperty(dbModule, 'db', {
  value: Promise.resolve(mockDb),
  writable: true,
});

beforeEach(() => {
  jest.clearAllMocks();
});

// ── getExerciseProgressData ──────────────────────────────────────────

describe('getExerciseProgressData', () => {
  it('returns array of ExerciseProgressPoint objects from query rows', async () => {
    mockExecuteSql.mockResolvedValueOnce(
      mockResultSet([
        { session_id: 1, date: '2026-01-10T10:00:00Z', best_weight_kg: 80, best_reps: 8 },
        { session_id: 2, date: '2026-02-15T11:00:00Z', best_weight_kg: 85, best_reps: 6 },
      ]),
    );
    const result = await getExerciseProgressData(1);
    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({ sessionId: 1, date: '2026-01-10T10:00:00Z', bestWeightKg: 80, bestReps: 8 });
    expect(result[1]).toEqual({ sessionId: 2, date: '2026-02-15T11:00:00Z', bestWeightKg: 85, bestReps: 6 });
  });

  it('returns empty array when no rows', async () => {
    mockExecuteSql.mockResolvedValueOnce(mockResultSet([]));
    const result = await getExerciseProgressData(99);
    expect(result).toEqual([]);
  });
});

// ── getTimedExerciseProgressData ─────────────────────────────────────

describe('getTimedExerciseProgressData', () => {
  it('returns one ExerciseProgressPoint for a single matching row', async () => {
    mockExecuteSql.mockResolvedValueOnce(
      mockResultSet([
        { session_id: 5, date: '2026-03-01T09:00:00Z', best_weight_kg: 0, best_reps: 120 },
      ]),
    );
    const result = await getTimedExerciseProgressData(5);
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({ sessionId: 5, date: '2026-03-01T09:00:00Z', bestWeightKg: 0, bestReps: 120 });
  });

  it('returns empty array when no rows', async () => {
    mockExecuteSql.mockResolvedValueOnce(mockResultSet([]));
    const result = await getTimedExerciseProgressData(5);
    expect(result).toEqual([]);
  });
});

// ── getExerciseHistory ───────────────────────────────────────────────

describe('getExerciseHistory', () => {
  it('groups rows into sessions with sets, preserving order', async () => {
    mockExecuteSql.mockResolvedValueOnce(
      mockResultSet([
        // session 1 (3 sets)
        { session_id: 1, date: '2026-03-10T10:00:00Z', set_number: 1, weight_kg: 80, reps: 8, is_warmup: 0 },
        { session_id: 1, date: '2026-03-10T10:00:00Z', set_number: 2, weight_kg: 85, reps: 6, is_warmup: 0 },
        { session_id: 1, date: '2026-03-10T10:00:00Z', set_number: 3, weight_kg: 60, reps: 12, is_warmup: 1 },
        // session 2 (2 sets)
        { session_id: 2, date: '2026-03-05T10:00:00Z', set_number: 1, weight_kg: 75, reps: 10, is_warmup: 0 },
        { session_id: 2, date: '2026-03-05T10:00:00Z', set_number: 2, weight_kg: 80, reps: 8, is_warmup: 0 },
      ]),
    );
    const result = await getExerciseHistory(1);
    expect(result).toHaveLength(2);
    expect(result[0].sessionId).toBe(1);
    expect(result[0].sets).toHaveLength(3);
    expect(result[1].sessionId).toBe(2);
    expect(result[1].sets).toHaveLength(2);
  });

  it('coerces is_warmup=1 to true and is_warmup=0 to false', async () => {
    mockExecuteSql.mockResolvedValueOnce(
      mockResultSet([
        { session_id: 1, date: '2026-03-10T10:00:00Z', set_number: 1, weight_kg: 60, reps: 15, is_warmup: 1 },
        { session_id: 1, date: '2026-03-10T10:00:00Z', set_number: 2, weight_kg: 80, reps: 8, is_warmup: 0 },
      ]),
    );
    const result = await getExerciseHistory(1);
    expect(result[0].sets[0].isWarmup).toBe(true);
    expect(result[0].sets[1].isWarmup).toBe(false);
  });

  it('returns empty array when no rows', async () => {
    mockExecuteSql.mockResolvedValueOnce(mockResultSet([]));
    const result = await getExerciseHistory(1);
    expect(result).toEqual([]);
  });
});

// ── deleteExerciseHistorySession ─────────────────────────────────────

describe('deleteExerciseHistorySession', () => {
  it('calls executeSql with DELETE and correct params', async () => {
    mockExecuteSql.mockResolvedValueOnce(mockResultSet([]));
    await deleteExerciseHistorySession(1, 5);
    expect(mockExecuteSql).toHaveBeenCalledTimes(1);
    expect(mockExecuteSql).toHaveBeenCalledWith(
      mockDb,
      'DELETE FROM workout_sets WHERE session_id = ? AND exercise_id = ?',
      [1, 5],
    );
  });
});

// ── getRecentlyTrainedExercises ──────────────────────────────────────

describe('getRecentlyTrainedExercises', () => {
  it('returns array with correct field mapping', async () => {
    mockExecuteSql.mockResolvedValueOnce(
      mockResultSet([
        { exercise_id: 1, exercise_name: 'Bench Press', category: 'chest', measurement_type: 'reps', last_trained_at: '2026-03-10T10:00:00Z' },
        { exercise_id: 2, exercise_name: 'Squat', category: 'legs', measurement_type: null, last_trained_at: '2026-03-08T10:00:00Z' },
      ]),
    );
    const result = await getRecentlyTrainedExercises();
    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({
      exerciseId: 1,
      exerciseName: 'Bench Press',
      category: 'chest',
      measurementType: 'reps',
      lastTrainedAt: '2026-03-10T10:00:00Z',
    });
  });

  it('defaults measurementType to "reps" when null', async () => {
    mockExecuteSql.mockResolvedValueOnce(
      mockResultSet([
        { exercise_id: 2, exercise_name: 'Squat', category: 'legs', measurement_type: null, last_trained_at: '2026-03-08T10:00:00Z' },
      ]),
    );
    const result = await getRecentlyTrainedExercises();
    expect(result[0].measurementType).toBe('reps');
  });

  it('returns empty array when no rows', async () => {
    mockExecuteSql.mockResolvedValueOnce(mockResultSet([]));
    const result = await getRecentlyTrainedExercises();
    expect(result).toEqual([]);
  });
});

// ── getProgramWeekCompletion ─────────────────────────────────────────

describe('getProgramWeekCompletion', () => {
  it('returns mixed completion statuses for days in a program', async () => {
    // Call 1: SELECT program
    mockExecuteSql.mockResolvedValueOnce(
      mockResultSet([{ start_date: '2026-03-01', current_week: 2 }]),
    );
    // Call 2: SELECT program_days
    mockExecuteSql.mockResolvedValueOnce(
      mockResultSet([
        { id: 1, name: 'Push' },
        { id: 2, name: 'Pull' },
      ]),
    );
    // Call 3: session check for day 1 (completed)
    mockExecuteSql.mockResolvedValueOnce(mockResultSet([{ id: 10 }]));
    // Call 4: session check for day 2 (not completed)
    mockExecuteSql.mockResolvedValueOnce(mockResultSet([]));

    const result = await getProgramWeekCompletion(1);
    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({ dayId: 1, dayName: 'Push', isCompletedThisWeek: true, sessionId: 10 });
    expect(result[1]).toEqual({ dayId: 2, dayName: 'Pull', isCompletedThisWeek: false, sessionId: null });
  });

  it('returns empty array when program not found', async () => {
    mockExecuteSql.mockResolvedValueOnce(mockResultSet([]));
    const result = await getProgramWeekCompletion(999);
    expect(result).toEqual([]);
  });
});

// ── getProgramTotalCompleted ─────────────────────────────────────────

describe('getProgramTotalCompleted', () => {
  it('returns the cnt value from the query result', async () => {
    mockExecuteSql.mockResolvedValueOnce(mockResultSet([{ cnt: 5 }]));
    const result = await getProgramTotalCompleted(1);
    expect(result).toBe(5);
  });

  it('returns 0 when no sessions found', async () => {
    mockExecuteSql.mockResolvedValueOnce(mockResultSet([{ cnt: 0 }]));
    const result = await getProgramTotalCompleted(1);
    expect(result).toBe(0);
  });
});

// ── getNextWorkoutDay ────────────────────────────────────────────────

describe('getNextWorkoutDay', () => {
  it('Path A: finds next uncompleted day using most-recently-used program via sessions', async () => {
    // Call 1: SELECT recent program via sessions → {id:1, name:'PPL'}
    mockExecuteSql.mockResolvedValueOnce(mockResultSet([{ id: 1, name: 'PPL' }]));
    // getProgramWeekCompletion calls:
    // Call 2: SELECT program → {current_week: 1}
    mockExecuteSql.mockResolvedValueOnce(mockResultSet([{ start_date: '2026-03-01', current_week: 1 }]));
    // Call 3: SELECT days → Push(1), Pull(2)
    mockExecuteSql.mockResolvedValueOnce(
      mockResultSet([{ id: 1, name: 'Push' }, { id: 2, name: 'Pull' }]),
    );
    // Call 4: session for day 1 (completed)
    mockExecuteSql.mockResolvedValueOnce(mockResultSet([{ id: 10 }]));
    // Call 5: session for day 2 (not completed)
    mockExecuteSql.mockResolvedValueOnce(mockResultSet([]));
    // Call 6: COUNT exercises for day 2 → 4
    mockExecuteSql.mockResolvedValueOnce(mockResultSet([{ cnt: 4 }]));

    const result = await getNextWorkoutDay();
    expect(result).toEqual({ programId: 1, programName: 'PPL', dayId: 2, dayName: 'Pull', exerciseCount: 4 });
  });

  it('Path B: falls back to activated program when no sessions exist', async () => {
    // Call 1: SELECT recent via sessions → empty
    mockExecuteSql.mockResolvedValueOnce(mockResultSet([]));
    // Call 2: SELECT fallback activated program → {id:2, name:'Backup'}
    mockExecuteSql.mockResolvedValueOnce(mockResultSet([{ id: 2, name: 'Backup' }]));
    // getProgramWeekCompletion calls:
    // Call 3: SELECT program
    mockExecuteSql.mockResolvedValueOnce(mockResultSet([{ start_date: '2026-03-01', current_week: 1 }]));
    // Call 4: SELECT days → Day A only
    mockExecuteSql.mockResolvedValueOnce(mockResultSet([{ id: 3, name: 'Day A' }]));
    // Call 5: session for day 3 (not completed)
    mockExecuteSql.mockResolvedValueOnce(mockResultSet([]));
    // Call 6: COUNT exercises for day 3 → 5
    mockExecuteSql.mockResolvedValueOnce(mockResultSet([{ cnt: 5 }]));

    const result = await getNextWorkoutDay();
    expect(result).toEqual({ programId: 2, programName: 'Backup', dayId: 3, dayName: 'Day A', exerciseCount: 5 });
  });

  it('Path C: returns null when no activated programs exist', async () => {
    // Call 1: SELECT recent via sessions → empty
    mockExecuteSql.mockResolvedValueOnce(mockResultSet([]));
    // Call 2: SELECT fallback → empty
    mockExecuteSql.mockResolvedValueOnce(mockResultSet([]));

    const result = await getNextWorkoutDay();
    expect(result).toBeNull();
  });

  it('Path D: returns first day when all days completed this week', async () => {
    // Call 1: recent session program → {id:1, name:'PPL'}
    mockExecuteSql.mockResolvedValueOnce(mockResultSet([{ id: 1, name: 'PPL' }]));
    // getProgramWeekCompletion:
    // Call 2: program
    mockExecuteSql.mockResolvedValueOnce(mockResultSet([{ start_date: '2026-03-01', current_week: 1 }]));
    // Call 3: days → Push, Pull
    mockExecuteSql.mockResolvedValueOnce(
      mockResultSet([{ id: 1, name: 'Push' }, { id: 2, name: 'Pull' }]),
    );
    // Call 4: day 1 → completed
    mockExecuteSql.mockResolvedValueOnce(mockResultSet([{ id: 10 }]));
    // Call 5: day 2 → completed
    mockExecuteSql.mockResolvedValueOnce(mockResultSet([{ id: 11 }]));
    // Call 6: COUNT exercises for day 1 (fallback to first day) → 3
    mockExecuteSql.mockResolvedValueOnce(mockResultSet([{ cnt: 3 }]));

    const result = await getNextWorkoutDay();
    // All days done → falls back to first day (dayStatuses[0])
    expect(result).toEqual({ programId: 1, programName: 'PPL', dayId: 1, dayName: 'Push', exerciseCount: 3 });
  });

  it('returns null when program has no days', async () => {
    // Call 1: recent session program → {id:1, name:'Empty'}
    mockExecuteSql.mockResolvedValueOnce(mockResultSet([{ id: 1, name: 'Empty' }]));
    // getProgramWeekCompletion:
    // Call 2: program found
    mockExecuteSql.mockResolvedValueOnce(mockResultSet([{ start_date: '2026-03-01', current_week: 1 }]));
    // Call 3: no days
    mockExecuteSql.mockResolvedValueOnce(mockResultSet([]));

    const result = await getNextWorkoutDay();
    expect(result).toBeNull();
  });
});

// ── unmarkDayCompletion ──────────────────────────────────────────────

describe('unmarkDayCompletion', () => {
  it('deletes sets, exercise_sessions, and workout_sessions for each completed session', async () => {
    // Call 1: SELECT current_week
    mockExecuteSql.mockResolvedValueOnce(mockResultSet([{ current_week: 2 }]));
    // Call 2: SELECT sessions → 2 sessions
    mockExecuteSql.mockResolvedValueOnce(
      mockResultSet([{ id: 20 }, { id: 21 }]),
    );
    // 3 DELETEs per session = 6 total
    mockExecuteSql.mockResolvedValue(mockResultSet([]));

    await unmarkDayCompletion(1, 5);

    // Total calls: 2 (select queries) + 6 (3 deletes × 2 sessions) = 8
    expect(mockExecuteSql).toHaveBeenCalledTimes(8);

    // Verify DELETE patterns
    const calls = mockExecuteSql.mock.calls;
    expect(calls[2][1]).toContain('DELETE FROM workout_sets');
    expect(calls[2][2]).toEqual([20]);
    expect(calls[3][1]).toContain('DELETE FROM exercise_sessions');
    expect(calls[3][2]).toEqual([20]);
    expect(calls[4][1]).toContain('DELETE FROM workout_sessions');
    expect(calls[4][2]).toEqual([20]);
    expect(calls[5][1]).toContain('DELETE FROM workout_sets');
    expect(calls[5][2]).toEqual([21]);
  });

  it('returns early without deleting when program not found', async () => {
    mockExecuteSql.mockResolvedValueOnce(mockResultSet([]));

    await unmarkDayCompletion(999, 5);

    expect(mockExecuteSql).toHaveBeenCalledTimes(1);
  });
});

// ── getSessionTimeSummary ────────────────────────────────────────────

describe('getSessionTimeSummary', () => {
  it('computes total, active, and rest seconds correctly', async () => {
    // Session: 10:00 to 11:00 = 3600 total seconds
    mockExecuteSql.mockResolvedValueOnce(
      mockResultSet([{ started_at: '2026-03-15T10:00:00Z', completed_at: '2026-03-15T11:00:00Z' }]),
    );
    // Sets: exercise 1 has 3 sets (10:05, 10:10, 10:15) = 600s span
    //       exercise 2 has 1 set (10:30) = single set = 30s default
    mockExecuteSql.mockResolvedValueOnce(
      mockResultSet([
        { exercise_id: 1, logged_at: '2026-03-15T10:05:00Z' },
        { exercise_id: 1, logged_at: '2026-03-15T10:10:00Z' },
        { exercise_id: 1, logged_at: '2026-03-15T10:15:00Z' },
        { exercise_id: 2, logged_at: '2026-03-15T10:30:00Z' },
      ]),
    );

    const result = await getSessionTimeSummary(1);
    expect(result).not.toBeNull();
    expect(result!.totalSeconds).toBe(3600);
    expect(result!.activeSeconds).toBe(630); // 600 + 30
    expect(result!.restSeconds).toBe(2970);  // 3600 - 630
  });

  it('returns null when session not found', async () => {
    mockExecuteSql.mockResolvedValueOnce(mockResultSet([]));
    const result = await getSessionTimeSummary(999);
    expect(result).toBeNull();
  });

  it('returns null when session is not yet completed (completed_at is null)', async () => {
    mockExecuteSql.mockResolvedValueOnce(
      mockResultSet([{ started_at: '2026-03-15T10:00:00Z', completed_at: null }]),
    );
    const result = await getSessionTimeSummary(1);
    expect(result).toBeNull();
  });

  it('handles a single-set exercise with 30s default active time', async () => {
    mockExecuteSql.mockResolvedValueOnce(
      mockResultSet([{ started_at: '2026-03-15T10:00:00Z', completed_at: '2026-03-15T10:10:00Z' }]),
    );
    // single set per exercise → 30s each
    mockExecuteSql.mockResolvedValueOnce(
      mockResultSet([
        { exercise_id: 1, logged_at: '2026-03-15T10:02:00Z' },
      ]),
    );

    const result = await getSessionTimeSummary(1);
    expect(result).not.toBeNull();
    expect(result!.activeSeconds).toBe(30);
    expect(result!.totalSeconds).toBe(600);
    expect(result!.restSeconds).toBe(570);
  });
});

// ── exportAllData ────────────────────────────────────────────────────

describe('exportAllData', () => {
  it('assembles nested FullDataExport with correct structure', async () => {
    // Call 1: SELECT exercises → 2 rows
    mockExecuteSql.mockResolvedValueOnce(
      mockResultSet([
        { id: 1, name: 'Bench Press', category: 'chest', default_rest_seconds: 90, is_custom: 0, measurement_type: 'reps', created_at: '2026-01-01T00:00:00Z' },
        { id: 2, name: 'Squat', category: 'legs', default_rest_seconds: 90, is_custom: 0, measurement_type: 'reps', created_at: '2026-01-01T00:00:00Z' },
      ]),
    );
    // Call 2: SELECT workout_sessions → 1 row
    mockExecuteSql.mockResolvedValueOnce(
      mockResultSet([
        { id: 1, started_at: '2026-03-10T10:00:00Z', completed_at: '2026-03-10T11:00:00Z', program_day_id: null },
      ]),
    );
    // Call 3: SELECT workout_sets for session 1 → 2 sets
    mockExecuteSql.mockResolvedValueOnce(
      mockResultSet([
        { id: 1, session_id: 1, exercise_id: 1, set_number: 1, weight_kg: 80, reps: 8, logged_at: '2026-03-10T10:05:00Z', is_warmup: 0 },
        { id: 2, session_id: 1, exercise_id: 1, set_number: 2, weight_kg: 85, reps: 6, logged_at: '2026-03-10T10:10:00Z', is_warmup: 1 },
      ]),
    );
    // Call 4: SELECT programs → 1 row
    mockExecuteSql.mockResolvedValueOnce(
      mockResultSet([
        { id: 1, name: 'PPL', weeks: 4, start_date: '2026-03-01', current_week: 2, created_at: '2026-03-01T00:00:00Z' },
      ]),
    );
    // Call 5: SELECT program_days for program 1 → 1 day
    mockExecuteSql.mockResolvedValueOnce(
      mockResultSet([
        { id: 1, program_id: 1, name: 'Push', sort_order: 0, created_at: '2026-03-01T00:00:00Z' },
      ]),
    );
    // Call 6: SELECT program_day_exercises for day 1 → 2 exercises
    mockExecuteSql.mockResolvedValueOnce(
      mockResultSet([
        { id: 1, program_day_id: 1, exercise_id: 1, target_sets: 3, target_reps: 8, target_weight_kg: 80, sort_order: 0, superset_group_id: null },
        { id: 2, program_day_id: 1, exercise_id: 2, target_sets: 3, target_reps: 10, target_weight_kg: 60, sort_order: 1, superset_group_id: 1 },
      ]),
    );

    const result = await exportAllData();

    expect(result.exportedAt).toBeTruthy();
    expect(result.exercises).toHaveLength(2);
    expect(result.exercises[0].isCustom).toBe(false);
    expect(result.exercises[1].isCustom).toBe(false);

    expect(result.sessions).toHaveLength(1);
    expect(result.sessions[0].sets).toHaveLength(2);
    expect(result.sessions[0].sets[0].isWarmup).toBe(false);
    expect(result.sessions[0].sets[1].isWarmup).toBe(true);
    expect(result.sessions[0].programDayId).toBeNull();

    expect(result.programs).toHaveLength(1);
    expect(result.programs[0].days).toHaveLength(1);
    expect(result.programs[0].days[0].exercises).toHaveLength(2);
    expect(result.programs[0].days[0].exercises[0].supersetGroupId).toBeNull();
    expect(result.programs[0].days[0].exercises[1].supersetGroupId).toBe(1);
  });

  it('coerces is_custom=1 to true for custom exercises', async () => {
    // Call 1: exercises → 1 custom exercise
    mockExecuteSql.mockResolvedValueOnce(
      mockResultSet([
        { id: 10, name: 'My Custom Move', category: 'arms', default_rest_seconds: 60, is_custom: 1, measurement_type: null, created_at: '2026-03-01T00:00:00Z' },
      ]),
    );
    // Call 2: no sessions
    mockExecuteSql.mockResolvedValueOnce(mockResultSet([]));
    // Call 3: no programs
    mockExecuteSql.mockResolvedValueOnce(mockResultSet([]));

    const result = await exportAllData();
    expect(result.exercises[0].isCustom).toBe(true);
    expect(result.exercises[0].measurementType).toBe('reps'); // defaults from ??
    expect(result.sessions).toHaveLength(0);
    expect(result.programs).toHaveLength(0);
  });
});
