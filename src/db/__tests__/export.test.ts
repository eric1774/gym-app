jest.mock('../database');

import { db, executeSql } from '../database';
import { mockResultSet } from '@test-utils';
import { exportProgramData } from '../export';

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

describe('exportProgramData', () => {
  // Test 1: program not found
  it('returns null when program is not found', async () => {
    mockExecuteSql.mockResolvedValueOnce(mockResultSet([])); // program query returns empty
    const result = await exportProgramData(999);
    expect(result).toBeNull();
  });

  // Test 2: program with no completed sessions
  it('returns valid export object with empty weeks and 0 completionPercent when no sessions', async () => {
    mockExecuteSql
      .mockResolvedValueOnce(mockResultSet([{ id: 1, name: 'PPL', weeks: 4 }])) // program
      .mockResolvedValueOnce(mockResultSet([{ cnt: 3 }]))                         // days count
      .mockResolvedValueOnce(mockResultSet([]))                                   // sessions
      .mockResolvedValueOnce(mockResultSet([{ cnt: 0 }]));                        // distinct count

    const result = await exportProgramData(1);
    expect(result).not.toBeNull();
    expect(result!.programName).toBe('PPL');
    expect(result!.totalWeeks).toBe(4);
    expect(result!.completionPercent).toBe(0);
    expect(result!.weeks).toEqual([]);
    expect(typeof result!.exportedAt).toBe('string');
  });

  // Test 3: program with no days defined
  it('returns empty weeks and 0 completionPercent when program has no days', async () => {
    mockExecuteSql
      .mockResolvedValueOnce(mockResultSet([{ id: 1, name: 'Empty', weeks: 4 }])) // program
      .mockResolvedValueOnce(mockResultSet([{ cnt: 0 }]))                           // days count = 0
      .mockResolvedValueOnce(mockResultSet([]))                                     // sessions
      .mockResolvedValueOnce(mockResultSet([{ cnt: 0 }]));                          // distinct count

    const result = await exportProgramData(1);
    expect(result).not.toBeNull();
    expect(result!.completionPercent).toBe(0);
    expect(result!.weeks).toEqual([]);
  });

  // Test 4: single completed day with exercises
  it('returns 1 week with 1 day containing exercises with correct sets', async () => {
    mockExecuteSql
      // program metadata
      .mockResolvedValueOnce(mockResultSet([{ id: 1, name: 'Push Pull', weeks: 4 }]))
      // days count
      .mockResolvedValueOnce(mockResultSet([{ cnt: 3 }]))
      // sessions query - 1 session
      .mockResolvedValueOnce(
        mockResultSet([
          { session_id: 10, program_week: 1, completed_at: '2026-03-10T10:00:00Z', day_name: 'Push Day' },
        ]),
      )
      // sets for session 10 - Bench Press (3 sets) + Overhead Press (2 sets)
      .mockResolvedValueOnce(
        mockResultSet([
          { exercise_name: 'Bench Press', set_number: 1, weight_kg: 80, reps: 8, is_warmup: 0, exercise_id: 1 },
          { exercise_name: 'Bench Press', set_number: 2, weight_kg: 80, reps: 8, is_warmup: 0, exercise_id: 1 },
          { exercise_name: 'Bench Press', set_number: 3, weight_kg: 80, reps: 8, is_warmup: 0, exercise_id: 1 },
          { exercise_name: 'Overhead Press', set_number: 1, weight_kg: 50, reps: 10, is_warmup: 0, exercise_id: 2 },
          { exercise_name: 'Overhead Press', set_number: 2, weight_kg: 50, reps: 10, is_warmup: 0, exercise_id: 2 },
        ]),
      )
      // distinct count for completion %: 1 of 12 = Math.round(8.33) = 8
      .mockResolvedValueOnce(mockResultSet([{ cnt: 1 }]));

    const result = await exportProgramData(1);
    expect(result).not.toBeNull();
    expect(result!.weeks).toHaveLength(1);
    expect(result!.weeks[0].weekNumber).toBe(1);
    expect(result!.weeks[0].days).toHaveLength(1);

    const day = result!.weeks[0].days[0];
    expect(day.dayName).toBe('Push Day');
    expect(day.completedAt).toBe('2026-03-10T10:00:00Z');
    expect(day.exercises).toHaveLength(2);
    expect(day.exercises[0].exerciseName).toBe('Bench Press');
    expect(day.exercises[0].sets).toHaveLength(3);
    expect(day.exercises[1].exerciseName).toBe('Overhead Press');
    expect(day.exercises[1].sets).toHaveLength(2);

    const firstSet = day.exercises[0].sets[0];
    expect(firstSet.setNumber).toBe(1);
    expect(firstSet.weightKg).toBe(80);
    expect(firstSet.reps).toBe(8);
    expect(firstSet.isWarmup).toBe(false);

    expect(result!.completionPercent).toBe(8);
  });

  // Test 5: multiple weeks with multiple days
  it('returns weeks array ordered by weekNumber with correct day distribution', async () => {
    mockExecuteSql
      // program: 4 weeks
      .mockResolvedValueOnce(mockResultSet([{ id: 2, name: 'Strength', weeks: 4 }]))
      // days count: 2 days per week
      .mockResolvedValueOnce(mockResultSet([{ cnt: 2 }]))
      // sessions: 2 in week 1, 1 in week 3 (week 2 skipped)
      .mockResolvedValueOnce(
        mockResultSet([
          { session_id: 1, program_week: 1, completed_at: '2026-03-01T10:00:00Z', day_name: 'Day A' },
          { session_id: 2, program_week: 1, completed_at: '2026-03-02T10:00:00Z', day_name: 'Day B' },
          { session_id: 3, program_week: 3, completed_at: '2026-03-15T10:00:00Z', day_name: 'Day A' },
        ]),
      )
      // sets for session 1 (empty)
      .mockResolvedValueOnce(mockResultSet([]))
      // sets for session 2 (empty)
      .mockResolvedValueOnce(mockResultSet([]))
      // sets for session 3 (empty)
      .mockResolvedValueOnce(mockResultSet([]))
      // distinct count
      .mockResolvedValueOnce(mockResultSet([{ cnt: 3 }]));

    const result = await exportProgramData(2);
    expect(result).not.toBeNull();
    expect(result!.weeks).toHaveLength(2);
    expect(result!.weeks[0].weekNumber).toBe(1);
    expect(result!.weeks[1].weekNumber).toBe(3);
    expect(result!.weeks[0].days).toHaveLength(2);
    expect(result!.weeks[1].days).toHaveLength(1);
  });

  // Test 6: partial program completion percentage
  it('calculates correct completionPercent for partially completed program', async () => {
    mockExecuteSql
      // 8-week program with 3 days
      .mockResolvedValueOnce(mockResultSet([{ id: 3, name: 'Big Program', weeks: 8 }]))
      .mockResolvedValueOnce(mockResultSet([{ cnt: 3 }]))
      // 4 completed sessions
      .mockResolvedValueOnce(
        mockResultSet([
          { session_id: 1, program_week: 1, completed_at: '2026-02-01T10:00:00Z', day_name: 'Day A' },
          { session_id: 2, program_week: 1, completed_at: '2026-02-02T10:00:00Z', day_name: 'Day B' },
          { session_id: 3, program_week: 2, completed_at: '2026-02-08T10:00:00Z', day_name: 'Day A' },
          { session_id: 4, program_week: 2, completed_at: '2026-02-09T10:00:00Z', day_name: 'Day B' },
        ]),
      )
      .mockResolvedValueOnce(mockResultSet([]))  // sets for session 1
      .mockResolvedValueOnce(mockResultSet([]))  // sets for session 2
      .mockResolvedValueOnce(mockResultSet([]))  // sets for session 3
      .mockResolvedValueOnce(mockResultSet([]))  // sets for session 4
      // distinct count: 4 distinct (day, week) pairs out of 8*3=24
      .mockResolvedValueOnce(mockResultSet([{ cnt: 4 }]));

    const result = await exportProgramData(3);
    expect(result).not.toBeNull();
    // Math.round(4/24*100) = Math.round(16.67) = 17
    expect(result!.completionPercent).toBe(17);
  });

  // Test 7: warmup sets included with correct isWarmup boolean
  it('maps is_warmup correctly to boolean for warmup and working sets', async () => {
    mockExecuteSql
      .mockResolvedValueOnce(mockResultSet([{ id: 1, name: 'PPL', weeks: 4 }]))
      .mockResolvedValueOnce(mockResultSet([{ cnt: 3 }]))
      .mockResolvedValueOnce(
        mockResultSet([
          { session_id: 5, program_week: 1, completed_at: '2026-03-01T10:00:00Z', day_name: 'Push' },
        ]),
      )
      .mockResolvedValueOnce(
        mockResultSet([
          { exercise_name: 'Bench Press', set_number: 1, weight_kg: 40, reps: 15, is_warmup: 1, exercise_id: 1 },
          { exercise_name: 'Bench Press', set_number: 2, weight_kg: 80, reps: 8, is_warmup: 0, exercise_id: 1 },
          { exercise_name: 'Bench Press', set_number: 3, weight_kg: 80, reps: 8, is_warmup: 0, exercise_id: 1 },
        ]),
      )
      .mockResolvedValueOnce(mockResultSet([{ cnt: 1 }]));

    const result = await exportProgramData(1);
    expect(result).not.toBeNull();
    const sets = result!.weeks[0].days[0].exercises[0].sets;
    expect(sets).toHaveLength(3);
    expect(sets[0].isWarmup).toBe(true);
    expect(sets[1].isWarmup).toBe(false);
    expect(sets[2].isWarmup).toBe(false);
  });

  // Test 8: multiple sessions same day same week appear as separate day entries
  it('returns separate day entries for multiple sessions in the same week and day', async () => {
    mockExecuteSql
      .mockResolvedValueOnce(mockResultSet([{ id: 1, name: 'PPL', weeks: 4 }]))
      .mockResolvedValueOnce(mockResultSet([{ cnt: 3 }]))
      // Two sessions, both week 1, same day name
      .mockResolvedValueOnce(
        mockResultSet([
          { session_id: 10, program_week: 1, completed_at: '2026-03-10T09:00:00Z', day_name: 'Push Day' },
          { session_id: 11, program_week: 1, completed_at: '2026-03-10T18:00:00Z', day_name: 'Push Day' },
        ]),
      )
      .mockResolvedValueOnce(mockResultSet([]))  // sets for session 10
      .mockResolvedValueOnce(mockResultSet([]))  // sets for session 11
      .mockResolvedValueOnce(mockResultSet([{ cnt: 1 }]));  // distinct count (same day+week = 1)

    const result = await exportProgramData(1);
    expect(result).not.toBeNull();
    expect(result!.weeks).toHaveLength(1);
    expect(result!.weeks[0].days).toHaveLength(2);
    expect(result!.weeks[0].days[0].dayName).toBe('Push Day');
    expect(result!.weeks[0].days[1].dayName).toBe('Push Day');
    expect(result!.weeks[0].days[0].completedAt).toBe('2026-03-10T09:00:00Z');
    expect(result!.weeks[0].days[1].completedAt).toBe('2026-03-10T18:00:00Z');
  });

  // Test 9: exercises ordered by performance (logged_at order), not alphabetical
  it('returns exercises in logged_at order (performance order), not alphabetical', async () => {
    mockExecuteSql
      .mockResolvedValueOnce(mockResultSet([{ id: 1, name: 'Program', weeks: 4 }]))
      .mockResolvedValueOnce(mockResultSet([{ cnt: 2 }]))
      .mockResolvedValueOnce(
        mockResultSet([
          { session_id: 20, program_week: 1, completed_at: '2026-03-05T10:00:00Z', day_name: 'Day A' },
        ]),
      )
      // exercise B (id=2) logged before exercise A (id=1) — B should appear first in output
      .mockResolvedValueOnce(
        mockResultSet([
          { exercise_name: 'Zumba Stretch', set_number: 1, weight_kg: 0, reps: 30, is_warmup: 0, exercise_id: 2 },
          { exercise_name: 'Zumba Stretch', set_number: 2, weight_kg: 0, reps: 30, is_warmup: 0, exercise_id: 2 },
          { exercise_name: 'Bench Press', set_number: 1, weight_kg: 80, reps: 8, is_warmup: 0, exercise_id: 1 },
        ]),
      )
      .mockResolvedValueOnce(mockResultSet([{ cnt: 1 }]));

    const result = await exportProgramData(1);
    expect(result).not.toBeNull();
    const exercises = result!.weeks[0].days[0].exercises;
    expect(exercises).toHaveLength(2);
    // Zumba Stretch (id=2) was logged first, so it appears first
    expect(exercises[0].exerciseName).toBe('Zumba Stretch');
    // Bench Press (id=1) was logged second, so it appears second
    expect(exercises[1].exerciseName).toBe('Bench Press');
  });

  // Test 10: completion percentage rounding with Math.round
  it('rounds completion percentage correctly (1 of 12 days = 8%)', async () => {
    mockExecuteSql
      // 4-week program with 3 days = 12 total
      .mockResolvedValueOnce(mockResultSet([{ id: 1, name: 'PPL', weeks: 4 }]))
      .mockResolvedValueOnce(mockResultSet([{ cnt: 3 }]))
      // 1 completed session
      .mockResolvedValueOnce(
        mockResultSet([
          { session_id: 1, program_week: 1, completed_at: '2026-03-01T10:00:00Z', day_name: 'Push' },
        ]),
      )
      .mockResolvedValueOnce(mockResultSet([]))  // sets
      // distinct count: 1
      .mockResolvedValueOnce(mockResultSet([{ cnt: 1 }]));

    const result = await exportProgramData(1);
    expect(result).not.toBeNull();
    // Math.round(1/12*100) = Math.round(8.333) = 8
    expect(result!.completionPercent).toBe(8);
    expect(Number.isInteger(result!.completionPercent)).toBe(true);
  });
});
