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
  getCategorySummaries,
  getCategoryExerciseProgress,
  getCategoryVolumeSummaries,
  getCategoryExerciseVolumeProgress,
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
        { session_id: 1, date: '2026-01-10T10:00:00Z', best_weight_lbs: 80, best_reps: 8 },
        { session_id: 2, date: '2026-02-15T11:00:00Z', best_weight_lbs: 85, best_reps: 6 },
      ]),
    );
    const result = await getExerciseProgressData(1);
    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({ sessionId: 1, date: '2026-01-10T10:00:00Z', bestWeightLbs: 80, bestReps: 8 });
    expect(result[1]).toEqual({ sessionId: 2, date: '2026-02-15T11:00:00Z', bestWeightLbs: 85, bestReps: 6 });
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
        { session_id: 5, date: '2026-03-01T09:00:00Z', best_weight_lbs: 0, best_reps: 120 },
      ]),
    );
    const result = await getTimedExerciseProgressData(5);
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({ sessionId: 5, date: '2026-03-01T09:00:00Z', bestWeightLbs: 0, bestReps: 120 });
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
  // SQL call sequence (1 active candidate):
  //  1. main candidates query (program with day_count, last_used)
  //  2. getProgramTotalCompleted → distinct (day,week) count
  //  3. getProgramWeekCompletion: SELECT program (start_date, current_week)
  //  4. getProgramWeekCompletion: SELECT program_days
  //  5..N. getProgramWeekCompletion: SELECT session for each day
  //  N+1. SELECT COUNT exercises for chosen day

  it('Path A: finds next uncompleted day using active program', async () => {
    mockExecuteSql.mockResolvedValueOnce(
      mockResultSet([{ id: 1, name: 'PPL', weeks: 6, day_count: 2, last_used: '2026-04-20T10:00:00Z' }]),
    );
    mockExecuteSql.mockResolvedValueOnce(mockResultSet([{ cnt: 5 }])); // 5 < 12 → active
    mockExecuteSql.mockResolvedValueOnce(mockResultSet([{ start_date: '2026-03-01', current_week: 1 }]));
    mockExecuteSql.mockResolvedValueOnce(
      mockResultSet([{ id: 1, name: 'Push' }, { id: 2, name: 'Pull' }]),
    );
    mockExecuteSql.mockResolvedValueOnce(mockResultSet([{ id: 10 }])); // Push done
    mockExecuteSql.mockResolvedValueOnce(mockResultSet([])); // Pull not done
    mockExecuteSql.mockResolvedValueOnce(mockResultSet([{ cnt: 4 }]));

    const result = await getNextWorkoutDay();
    expect(result).toEqual({ programId: 1, programName: 'PPL', dayId: 2, dayName: 'Pull', exerciseCount: 4 });
  });

  it('Path B: works for activated program with no sessions yet (last_used = null)', async () => {
    mockExecuteSql.mockResolvedValueOnce(
      mockResultSet([{ id: 2, name: 'Backup', weeks: 4, day_count: 1, last_used: null }]),
    );
    mockExecuteSql.mockResolvedValueOnce(mockResultSet([{ cnt: 0 }])); // 0 < 4 → active
    mockExecuteSql.mockResolvedValueOnce(mockResultSet([{ start_date: '2026-03-01', current_week: 1 }]));
    mockExecuteSql.mockResolvedValueOnce(mockResultSet([{ id: 3, name: 'Day A' }]));
    mockExecuteSql.mockResolvedValueOnce(mockResultSet([])); // Day A not done
    mockExecuteSql.mockResolvedValueOnce(mockResultSet([{ cnt: 5 }]));

    const result = await getNextWorkoutDay();
    expect(result).toEqual({ programId: 2, programName: 'Backup', dayId: 3, dayName: 'Day A', exerciseCount: 5 });
  });

  it('Path C: returns null when no activated programs exist', async () => {
    mockExecuteSql.mockResolvedValueOnce(mockResultSet([])); // empty candidates
    expect(await getNextWorkoutDay()).toBeNull();
  });

  it('Path D: returns first day when all days completed this week', async () => {
    mockExecuteSql.mockResolvedValueOnce(
      mockResultSet([{ id: 1, name: 'PPL', weeks: 6, day_count: 2, last_used: '2026-04-20T10:00:00Z' }]),
    );
    mockExecuteSql.mockResolvedValueOnce(mockResultSet([{ cnt: 5 }])); // 5 < 12 → active
    mockExecuteSql.mockResolvedValueOnce(mockResultSet([{ start_date: '2026-03-01', current_week: 1 }]));
    mockExecuteSql.mockResolvedValueOnce(
      mockResultSet([{ id: 1, name: 'Push' }, { id: 2, name: 'Pull' }]),
    );
    mockExecuteSql.mockResolvedValueOnce(mockResultSet([{ id: 10 }])); // Push done
    mockExecuteSql.mockResolvedValueOnce(mockResultSet([{ id: 11 }])); // Pull done
    mockExecuteSql.mockResolvedValueOnce(mockResultSet([{ cnt: 3 }]));

    const result = await getNextWorkoutDay();
    expect(result).toEqual({ programId: 1, programName: 'PPL', dayId: 1, dayName: 'Push', exerciseCount: 3 });
  });

  it('returns null when chosen program has no days', async () => {
    mockExecuteSql.mockResolvedValueOnce(
      mockResultSet([{ id: 1, name: 'Empty', weeks: 4, day_count: 1, last_used: null }]),
    );
    mockExecuteSql.mockResolvedValueOnce(mockResultSet([{ cnt: 0 }])); // active
    mockExecuteSql.mockResolvedValueOnce(mockResultSet([{ start_date: '2026-03-01', current_week: 1 }]));
    mockExecuteSql.mockResolvedValueOnce(mockResultSet([])); // no days

    expect(await getNextWorkoutDay()).toBeNull();
  });

  it('skips a fully-completed program in favor of an active one with workouts left', async () => {
    // 2 candidates returned, created_at DESC: completed program (newer) and active program
    mockExecuteSql.mockResolvedValueOnce(
      mockResultSet([
        // Completed: 12 weeks × 1 day = 12 target, completed 12 → skipped
        { id: 5, name: 'Old Done', weeks: 12, day_count: 1, last_used: '2026-04-22T10:00:00Z' },
        // Active: 6 weeks × 2 days = 12 target, completed 5
        { id: 6, name: 'New Active', weeks: 6, day_count: 2, last_used: '2026-04-20T10:00:00Z' },
      ]),
    );
    mockExecuteSql.mockResolvedValueOnce(mockResultSet([{ cnt: 12 }])); // Old Done: 12 ≥ 12 → skip
    mockExecuteSql.mockResolvedValueOnce(mockResultSet([{ cnt: 5 }]));  // New Active: 5 < 12 → keep
    mockExecuteSql.mockResolvedValueOnce(mockResultSet([{ start_date: '2026-03-01', current_week: 1 }]));
    mockExecuteSql.mockResolvedValueOnce(
      mockResultSet([{ id: 60, name: 'Push' }, { id: 61, name: 'Pull' }]),
    );
    mockExecuteSql.mockResolvedValueOnce(mockResultSet([])); // Push not done
    mockExecuteSql.mockResolvedValueOnce(mockResultSet([])); // Pull not done
    mockExecuteSql.mockResolvedValueOnce(mockResultSet([{ cnt: 6 }]));

    const result = await getNextWorkoutDay();
    expect(result).toEqual({ programId: 6, programName: 'New Active', dayId: 60, dayName: 'Push', exerciseCount: 6 });
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

// ── getCategorySummaries ─────────────────────────────────────────────

describe('getCategorySummaries', () => {
  it('groups rows by category and returns correct summaries', async () => {
    mockExecuteSql.mockResolvedValueOnce(
      mockResultSet([
        // chest: 2 exercises, 2 sessions
        { exercise_id: 1, category: 'chest', measurement_type: 'reps', session_id: 10, completed_at: '2026-01-10T10:00:00Z', weight_kg: 80, reps: 8 },
        { exercise_id: 2, category: 'chest', measurement_type: 'reps', session_id: 10, completed_at: '2026-01-10T10:00:00Z', weight_kg: 60, reps: 12 },
        { exercise_id: 1, category: 'chest', measurement_type: 'reps', session_id: 11, completed_at: '2026-01-17T10:00:00Z', weight_kg: 85, reps: 6 },
        // legs: 1 exercise, 1 session
        { exercise_id: 3, category: 'legs', measurement_type: 'reps', session_id: 10, completed_at: '2026-01-10T10:00:00Z', weight_kg: 100, reps: 5 },
      ]),
    );

    const result = await getCategorySummaries();

    expect(result).toHaveLength(2);

    const chest = result.find(s => s.category === 'chest')!;
    expect(chest.exerciseCount).toBe(2);
    // Session 10: max(80, 60) = 80; Session 11: 85
    expect(chest.sparklinePoints).toEqual([80, 85]);
    expect(chest.lastTrainedAt).toBe('2026-01-17T10:00:00Z');
    expect(chest.measurementType).toBe('reps');

    const legs = result.find(s => s.category === 'legs')!;
    expect(legs.exerciseCount).toBe(1);
    expect(legs.sparklinePoints).toEqual([100]);
    expect(legs.lastTrainedAt).toBe('2026-01-10T10:00:00Z');
  });

  it('returns empty array when no training data', async () => {
    mockExecuteSql.mockResolvedValueOnce(mockResultSet([]));
    const result = await getCategorySummaries();
    expect(result).toEqual([]);
  });

  it('uses reps (duration) as best value for timed exercises', async () => {
    mockExecuteSql.mockResolvedValueOnce(
      mockResultSet([
        { exercise_id: 5, category: 'core', measurement_type: 'timed', session_id: 20, completed_at: '2026-02-01T10:00:00Z', weight_kg: 0, reps: 60 },
        { exercise_id: 5, category: 'core', measurement_type: 'timed', session_id: 21, completed_at: '2026-02-08T10:00:00Z', weight_kg: 0, reps: 90 },
      ]),
    );

    const result = await getCategorySummaries();
    expect(result).toHaveLength(1);
    expect(result[0].sparklinePoints).toEqual([60, 90]);
    expect(result[0].measurementType).toBe('timed');
  });

  it('coalesces null measurement_type to reps', async () => {
    mockExecuteSql.mockResolvedValueOnce(
      mockResultSet([
        { exercise_id: 6, category: 'arms', measurement_type: null, session_id: 30, completed_at: '2026-03-01T10:00:00Z', weight_kg: 20, reps: 10 },
      ]),
    );

    const result = await getCategorySummaries();
    expect(result).toHaveLength(1);
    expect(result[0].measurementType).toBe('reps');
    // Uses weight_kg for reps-type
    expect(result[0].sparklinePoints).toEqual([20]);
  });

  it('determines measurementType by majority rule', async () => {
    mockExecuteSql.mockResolvedValueOnce(
      mockResultSet([
        // 2 timed exercises, 1 reps exercise in conditioning
        { exercise_id: 7, category: 'conditioning', measurement_type: 'timed', session_id: 40, completed_at: '2026-03-01T10:00:00Z', weight_kg: 0, reps: 120 },
        { exercise_id: 8, category: 'conditioning', measurement_type: 'timed', session_id: 40, completed_at: '2026-03-01T10:00:00Z', weight_kg: 0, reps: 60 },
        { exercise_id: 9, category: 'conditioning', measurement_type: 'reps', session_id: 40, completed_at: '2026-03-01T10:00:00Z', weight_kg: 30, reps: 15 },
      ]),
    );

    const result = await getCategorySummaries();
    expect(result[0].measurementType).toBe('timed');
  });

  it('calls executeSql exactly once (no N+1)', async () => {
    mockExecuteSql.mockResolvedValueOnce(mockResultSet([]));
    await getCategorySummaries();
    expect(mockExecuteSql).toHaveBeenCalledTimes(1);
  });
});

// ── getCategoryExerciseProgress ──────────────────────────────────────

describe('getCategoryExerciseProgress', () => {
  it('returns per-exercise progress with sparklines and bests', async () => {
    mockExecuteSql.mockResolvedValueOnce(
      mockResultSet([
        // Exercise 1: 3 sessions
        { exercise_id: 1, exercise_name: 'Bench Press', measurement_type: 'reps', session_id: 10, completed_at: '2026-01-10T10:00:00Z', weight_kg: 80, reps: 8 },
        { exercise_id: 1, exercise_name: 'Bench Press', measurement_type: 'reps', session_id: 11, completed_at: '2026-01-17T10:00:00Z', weight_kg: 82.5, reps: 7 },
        { exercise_id: 1, exercise_name: 'Bench Press', measurement_type: 'reps', session_id: 12, completed_at: '2026-01-24T10:00:00Z', weight_kg: 85, reps: 6 },
        // Exercise 2: 1 session
        { exercise_id: 2, exercise_name: 'Incline DB', measurement_type: 'reps', session_id: 10, completed_at: '2026-01-10T10:00:00Z', weight_kg: 30, reps: 10 },
      ]),
    );

    const result = await getCategoryExerciseProgress('chest');

    expect(result).toHaveLength(2);

    const bench = result.find(e => e.exerciseId === 1)!;
    expect(bench.exerciseName).toBe('Bench Press');
    expect(bench.sparklinePoints).toEqual([80, 82.5, 85]);
    expect(bench.currentBest).toBe(85);
    expect(bench.previousBest).toBe(82.5);
    expect(bench.lastTrainedAt).toBe('2026-01-24T10:00:00Z');
    expect(bench.measurementType).toBe('reps');

    const incline = result.find(e => e.exerciseId === 2)!;
    expect(incline.sparklinePoints).toEqual([30]);
    expect(incline.currentBest).toBe(30);
    expect(incline.previousBest).toBeNull();
  });

  it('returns empty array when no data for category', async () => {
    mockExecuteSql.mockResolvedValueOnce(mockResultSet([]));
    const result = await getCategoryExerciseProgress('shoulders');
    expect(result).toEqual([]);
  });

  it('uses reps as best value for timed exercises', async () => {
    mockExecuteSql.mockResolvedValueOnce(
      mockResultSet([
        { exercise_id: 5, exercise_name: 'Plank', measurement_type: 'timed', session_id: 20, completed_at: '2026-02-01T10:00:00Z', weight_kg: 0, reps: 60 },
        { exercise_id: 5, exercise_name: 'Plank', measurement_type: 'timed', session_id: 21, completed_at: '2026-02-08T10:00:00Z', weight_kg: 0, reps: 90 },
      ]),
    );

    const result = await getCategoryExerciseProgress('core');
    expect(result[0].sparklinePoints).toEqual([60, 90]);
    expect(result[0].currentBest).toBe(90);
    expect(result[0].previousBest).toBe(60);
    expect(result[0].measurementType).toBe('timed');
  });

  it('coalesces null measurement_type to reps', async () => {
    mockExecuteSql.mockResolvedValueOnce(
      mockResultSet([
        { exercise_id: 6, exercise_name: 'Old Exercise', measurement_type: null, session_id: 30, completed_at: '2026-03-01T10:00:00Z', weight_kg: 50, reps: 8 },
      ]),
    );

    const result = await getCategoryExerciseProgress('arms');
    expect(result[0].measurementType).toBe('reps');
    expect(result[0].sparklinePoints).toEqual([50]);
  });

  it('adds date filter when timeRange is not All', async () => {
    mockExecuteSql.mockResolvedValueOnce(mockResultSet([]));

    await getCategoryExerciseProgress('chest', '3M');

    expect(mockExecuteSql).toHaveBeenCalledTimes(1);
    const sql = mockExecuteSql.mock.calls[0][1] as string;
    expect(sql).toContain('AND wss.completed_at >= ?');
    // Should have 2 params: category + date threshold
    const params = mockExecuteSql.mock.calls[0][2] as unknown[];
    expect(params).toHaveLength(2);
    expect(params[0]).toBe('chest');
    expect(typeof params[1]).toBe('string'); // ISO date string
  });

  it('does not add date filter when timeRange is All', async () => {
    mockExecuteSql.mockResolvedValueOnce(mockResultSet([]));

    await getCategoryExerciseProgress('chest', 'All');

    const sql = mockExecuteSql.mock.calls[0][1] as string;
    expect(sql).not.toContain('AND wss.completed_at >= ?');
    const params = mockExecuteSql.mock.calls[0][2] as unknown[];
    expect(params).toHaveLength(1);
    expect(params[0]).toBe('chest');
  });

  it('does not add date filter when timeRange is omitted', async () => {
    mockExecuteSql.mockResolvedValueOnce(mockResultSet([]));

    await getCategoryExerciseProgress('legs');

    const sql = mockExecuteSql.mock.calls[0][1] as string;
    expect(sql).not.toContain('AND wss.completed_at >= ?');
    const params = mockExecuteSql.mock.calls[0][2] as unknown[];
    expect(params).toHaveLength(1);
  });

  it('calls executeSql exactly once (no N+1)', async () => {
    mockExecuteSql.mockResolvedValueOnce(mockResultSet([]));
    await getCategoryExerciseProgress('back');
    expect(mockExecuteSql).toHaveBeenCalledTimes(1);
  });
});

// ── getCategoryVolumeSummaries ───────────────────────────────────────

describe('getCategoryVolumeSummaries', () => {
  it('groups rows by category and returns correct volume summaries from SQL-aggregated rows', async () => {
    mockExecuteSql.mockResolvedValueOnce(
      mockResultSet([
        // chest: 2 exercises across 2 sessions — rows already aggregated by SQL GROUP BY
        { exercise_id: 1, category: 'chest', measurement_type: 'reps', session_id: 10, completed_at: '2026-01-10T10:00:00Z', session_volume: 640 },
        { exercise_id: 2, category: 'chest', measurement_type: 'reps', session_id: 10, completed_at: '2026-01-10T10:00:00Z', session_volume: 720 },
        { exercise_id: 1, category: 'chest', measurement_type: 'reps', session_id: 11, completed_at: '2026-01-17T10:00:00Z', session_volume: 510 },
        // legs: 1 exercise, 1 session
        { exercise_id: 3, category: 'legs', measurement_type: 'reps', session_id: 10, completed_at: '2026-01-10T10:00:00Z', session_volume: 500 },
      ]),
    );

    const result = await getCategoryVolumeSummaries();

    expect(result).toHaveLength(2);

    const chest = result.find(s => s.category === 'chest')!;
    expect(chest.exerciseCount).toBe(2);
    // Session 10 total: 640 + 720 = 1360; Session 11: 510
    expect(chest.sparklinePoints).toEqual([1360, 510]);
    expect(chest.lastTrainedAt).toBe('2026-01-17T10:00:00Z');
    expect(chest.measurementType).toBe('reps');

    const legs = result.find(s => s.category === 'legs')!;
    expect(legs.exerciseCount).toBe(1);
    expect(legs.sparklinePoints).toEqual([500]);
    expect(legs.lastTrainedAt).toBe('2026-01-10T10:00:00Z');
  });

  it('returns empty array when no training data', async () => {
    mockExecuteSql.mockResolvedValueOnce(mockResultSet([]));
    const result = await getCategoryVolumeSummaries();
    expect(result).toEqual([]);
  });

  it('SQL query uses GROUP BY for aggregation', async () => {
    mockExecuteSql.mockResolvedValueOnce(mockResultSet([]));
    await getCategoryVolumeSummaries();
    const sql = mockExecuteSql.mock.calls[0][1] as string;
    expect(sql).toContain('GROUP BY e.id, ws.session_id');
    expect(sql).toContain('SUM(ws.weight_kg * ws.reps) AS session_volume');
  });

  it('calls executeSql exactly once (no N+1)', async () => {
    mockExecuteSql.mockResolvedValueOnce(mockResultSet([]));
    await getCategoryVolumeSummaries();
    expect(mockExecuteSql).toHaveBeenCalledTimes(1);
  });
});

// ── getCategoryExerciseVolumeProgress ────────────────────────────────

describe('getCategoryExerciseVolumeProgress', () => {
  it('returns per-exercise volume progress from SQL-aggregated rows', async () => {
    mockExecuteSql.mockResolvedValueOnce(
      mockResultSet([
        // Exercise 1: 3 sessions — each row is one (exercise, session) pair from GROUP BY
        { exercise_id: 1, exercise_name: 'Bench Press', measurement_type: 'reps', session_id: 10, completed_at: '2026-01-10T10:00:00Z', session_volume: 640 },
        { exercise_id: 1, exercise_name: 'Bench Press', measurement_type: 'reps', session_id: 11, completed_at: '2026-01-17T10:00:00Z', session_volume: 700 },
        { exercise_id: 1, exercise_name: 'Bench Press', measurement_type: 'reps', session_id: 12, completed_at: '2026-01-24T10:00:00Z', session_volume: 750 },
        // Exercise 2: 1 session
        { exercise_id: 2, exercise_name: 'Incline DB', measurement_type: 'reps', session_id: 10, completed_at: '2026-01-10T10:00:00Z', session_volume: 300 },
      ]),
    );

    const result = await getCategoryExerciseVolumeProgress('chest');

    expect(result).toHaveLength(2);

    const bench = result.find(e => e.exerciseId === 1)!;
    expect(bench.exerciseName).toBe('Bench Press');
    expect(bench.sparklinePoints).toEqual([640, 700, 750]);
    expect(bench.currentBest).toBe(750);
    expect(bench.previousBest).toBe(700);
    expect(bench.lastTrainedAt).toBe('2026-01-24T10:00:00Z');

    const incline = result.find(e => e.exerciseId === 2)!;
    expect(incline.sparklinePoints).toEqual([300]);
    expect(incline.currentBest).toBe(300);
    expect(incline.previousBest).toBeNull();
  });

  it('returns empty array when no data for category', async () => {
    mockExecuteSql.mockResolvedValueOnce(mockResultSet([]));
    const result = await getCategoryExerciseVolumeProgress('shoulders');
    expect(result).toEqual([]);
  });

  it('SQL query uses GROUP BY for aggregation', async () => {
    mockExecuteSql.mockResolvedValueOnce(mockResultSet([]));
    await getCategoryExerciseVolumeProgress('chest');
    const sql = mockExecuteSql.mock.calls[0][1] as string;
    expect(sql).toContain('GROUP BY e.id, ws.session_id');
    expect(sql).toContain('SUM(ws.weight_kg * ws.reps) AS session_volume');
  });

  it('adds date filter when timeRange is not All', async () => {
    mockExecuteSql.mockResolvedValueOnce(mockResultSet([]));
    await getCategoryExerciseVolumeProgress('chest', '3M');
    const sql = mockExecuteSql.mock.calls[0][1] as string;
    expect(sql).toContain('AND wss.completed_at >= ?');
    const params = mockExecuteSql.mock.calls[0][2] as unknown[];
    expect(params).toHaveLength(2);
    expect(params[0]).toBe('chest');
    expect(typeof params[1]).toBe('string');
  });

  it('calls executeSql exactly once (no N+1)', async () => {
    mockExecuteSql.mockResolvedValueOnce(mockResultSet([]));
    await getCategoryExerciseVolumeProgress('back');
    expect(mockExecuteSql).toHaveBeenCalledTimes(1);
  });
});
