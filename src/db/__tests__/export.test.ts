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
      .mockResolvedValueOnce(mockResultSet([]));                                   // sessions

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
      .mockResolvedValueOnce(mockResultSet([]));                                     // sessions

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
      // sessions query - 1 session with stored program_week
      .mockResolvedValueOnce(
        mockResultSet([
          { session_id: 10, completed_at: '2026-03-10T10:00:00Z', program_week: 1, program_day_id: 1, day_name: 'Push Day' },
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
      );

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
    expect(firstSet.weightLbs).toBe(80);
    expect(firstSet.reps).toBe(8);
    expect(firstSet.isWarmup).toBe(false);

    // 1 distinct (day, week) pair out of 4 weeks * 3 days = 12 → Math.round(8.33) = 8
    expect(result!.completionPercent).toBe(8);
  });

  // Test 5: multiple weeks using stored program_week
  it('groups sessions by stored program_week across multiple weeks', async () => {
    mockExecuteSql
      // program: 4 weeks
      .mockResolvedValueOnce(mockResultSet([{ id: 2, name: 'Strength', weeks: 4 }]))
      // days count: 2 days per week
      .mockResolvedValueOnce(mockResultSet([{ cnt: 2 }]))
      // sessions: Day A completed in weeks 1 & 2, Day B in week 1 only
      // Ordered by program_week ASC, completed_at ASC
      .mockResolvedValueOnce(
        mockResultSet([
          { session_id: 1, completed_at: '2026-03-01T10:00:00Z', program_week: 1, program_day_id: 10, day_name: 'Day A' },
          { session_id: 2, completed_at: '2026-03-02T10:00:00Z', program_week: 1, program_day_id: 11, day_name: 'Day B' },
          { session_id: 3, completed_at: '2026-03-08T10:00:00Z', program_week: 2, program_day_id: 10, day_name: 'Day A' },
        ]),
      )
      // sets for session 1 (empty)
      .mockResolvedValueOnce(mockResultSet([]))
      // sets for session 2 (empty)
      .mockResolvedValueOnce(mockResultSet([]))
      // sets for session 3 (empty)
      .mockResolvedValueOnce(mockResultSet([]));

    const result = await exportProgramData(2);
    expect(result).not.toBeNull();
    expect(result!.weeks).toHaveLength(2);
    expect(result!.weeks[0].weekNumber).toBe(1);
    expect(result!.weeks[1].weekNumber).toBe(2);
    expect(result!.weeks[0].days).toHaveLength(2); // Day A + Day B
    expect(result!.weeks[1].days).toHaveLength(1); // Day A only
  });

  // Test 6: partial program completion percentage from stored weeks
  it('calculates correct completionPercent for partially completed program', async () => {
    mockExecuteSql
      // 8-week program with 3 days
      .mockResolvedValueOnce(mockResultSet([{ id: 3, name: 'Big Program', weeks: 8 }]))
      .mockResolvedValueOnce(mockResultSet([{ cnt: 3 }]))
      // 4 completed sessions across 2 days, 2 weeks each (stored program_week)
      .mockResolvedValueOnce(
        mockResultSet([
          { session_id: 1, completed_at: '2026-02-01T10:00:00Z', program_week: 1, program_day_id: 20, day_name: 'Day A' },
          { session_id: 2, completed_at: '2026-02-02T10:00:00Z', program_week: 1, program_day_id: 21, day_name: 'Day B' },
          { session_id: 3, completed_at: '2026-02-08T10:00:00Z', program_week: 2, program_day_id: 20, day_name: 'Day A' },
          { session_id: 4, completed_at: '2026-02-09T10:00:00Z', program_week: 2, program_day_id: 21, day_name: 'Day B' },
        ]),
      )
      .mockResolvedValueOnce(mockResultSet([]))  // sets for session 1
      .mockResolvedValueOnce(mockResultSet([]))  // sets for session 2
      .mockResolvedValueOnce(mockResultSet([]))  // sets for session 3
      .mockResolvedValueOnce(mockResultSet([])); // sets for session 4

    const result = await exportProgramData(3);
    expect(result).not.toBeNull();
    expect(result!.weeks).toHaveLength(2);
    // 4 distinct (day, week) pairs out of 8*3=24
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
          { session_id: 5, completed_at: '2026-03-01T10:00:00Z', program_week: 1, program_day_id: 1, day_name: 'Push' },
        ]),
      )
      .mockResolvedValueOnce(
        mockResultSet([
          { exercise_name: 'Bench Press', set_number: 1, weight_kg: 40, reps: 15, is_warmup: 1, exercise_id: 1 },
          { exercise_name: 'Bench Press', set_number: 2, weight_kg: 80, reps: 8, is_warmup: 0, exercise_id: 1 },
          { exercise_name: 'Bench Press', set_number: 3, weight_kg: 80, reps: 8, is_warmup: 0, exercise_id: 1 },
        ]),
      );

    const result = await exportProgramData(1);
    expect(result).not.toBeNull();
    const sets = result!.weeks[0].days[0].exercises[0].sets;
    expect(sets).toHaveLength(3);
    expect(sets[0].isWarmup).toBe(true);
    expect(sets[1].isWarmup).toBe(false);
    expect(sets[2].isWarmup).toBe(false);
  });

  // Test 8: same day completed in different stored weeks
  it('groups completions of the same day into their stored program_week', async () => {
    mockExecuteSql
      .mockResolvedValueOnce(mockResultSet([{ id: 1, name: 'PPL', weeks: 4 }]))
      .mockResolvedValueOnce(mockResultSet([{ cnt: 3 }]))
      // Two completions of the same day in stored weeks 1 and 2
      .mockResolvedValueOnce(
        mockResultSet([
          { session_id: 10, completed_at: '2026-03-10T09:00:00Z', program_week: 1, program_day_id: 1, day_name: 'Push Day' },
          { session_id: 11, completed_at: '2026-03-17T09:00:00Z', program_week: 2, program_day_id: 1, day_name: 'Push Day' },
        ]),
      )
      .mockResolvedValueOnce(mockResultSet([]))  // sets for session 10
      .mockResolvedValueOnce(mockResultSet([])); // sets for session 11

    const result = await exportProgramData(1);
    expect(result).not.toBeNull();
    expect(result!.weeks).toHaveLength(2);
    expect(result!.weeks[0].weekNumber).toBe(1);
    expect(result!.weeks[0].days).toHaveLength(1);
    expect(result!.weeks[0].days[0].completedAt).toBe('2026-03-10T09:00:00Z');
    expect(result!.weeks[1].weekNumber).toBe(2);
    expect(result!.weeks[1].days).toHaveLength(1);
    expect(result!.weeks[1].days[0].completedAt).toBe('2026-03-17T09:00:00Z');
  });

  // Test 9: exercises ordered by performance (logged_at order), not alphabetical
  it('returns exercises in logged_at order (performance order), not alphabetical', async () => {
    mockExecuteSql
      .mockResolvedValueOnce(mockResultSet([{ id: 1, name: 'Program', weeks: 4 }]))
      .mockResolvedValueOnce(mockResultSet([{ cnt: 2 }]))
      .mockResolvedValueOnce(
        mockResultSet([
          { session_id: 20, completed_at: '2026-03-05T10:00:00Z', program_week: 1, program_day_id: 1, day_name: 'Day A' },
        ]),
      )
      // exercise B (id=2) logged before exercise A (id=1) — B should appear first in output
      .mockResolvedValueOnce(
        mockResultSet([
          { exercise_name: 'Zumba Stretch', set_number: 1, weight_kg: 0, reps: 30, is_warmup: 0, exercise_id: 2 },
          { exercise_name: 'Zumba Stretch', set_number: 2, weight_kg: 0, reps: 30, is_warmup: 0, exercise_id: 2 },
          { exercise_name: 'Bench Press', set_number: 1, weight_kg: 80, reps: 8, is_warmup: 0, exercise_id: 1 },
        ]),
      );

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
          { session_id: 1, completed_at: '2026-03-01T10:00:00Z', program_week: 1, program_day_id: 1, day_name: 'Push' },
        ]),
      )
      .mockResolvedValueOnce(mockResultSet([])); // sets

    const result = await exportProgramData(1);
    expect(result).not.toBeNull();
    // Math.round(1/12*100) = Math.round(8.333) = 8
    expect(result!.completionPercent).toBe(8);
    expect(Number.isInteger(result!.completionPercent)).toBe(true);
  });

  // Test 11: sessions use stored program_week correctly across multiple weeks
  it('uses stored program_week to group sessions into correct weeks', async () => {
    mockExecuteSql
      .mockResolvedValueOnce(mockResultSet([{ id: 1, name: 'PPL', weeks: 4 }]))
      .mockResolvedValueOnce(mockResultSet([{ cnt: 2 }]))
      // 4 sessions across 2 days with stored program_week values
      .mockResolvedValueOnce(
        mockResultSet([
          { session_id: 1, completed_at: '2026-03-01T10:00:00Z', program_week: 1, program_day_id: 1, day_name: 'Push' },
          { session_id: 2, completed_at: '2026-03-02T10:00:00Z', program_week: 1, program_day_id: 2, day_name: 'Pull' },
          { session_id: 3, completed_at: '2026-03-08T10:00:00Z', program_week: 2, program_day_id: 1, day_name: 'Push' },
          { session_id: 4, completed_at: '2026-03-09T10:00:00Z', program_week: 2, program_day_id: 2, day_name: 'Pull' },
        ]),
      )
      .mockResolvedValueOnce(mockResultSet([]))  // sets for session 1
      .mockResolvedValueOnce(mockResultSet([]))  // sets for session 2
      .mockResolvedValueOnce(mockResultSet([]))  // sets for session 3
      .mockResolvedValueOnce(mockResultSet([])); // sets for session 4

    const result = await exportProgramData(1);
    expect(result).not.toBeNull();
    expect(result!.weeks).toHaveLength(2);
    expect(result!.weeks[0].weekNumber).toBe(1);
    expect(result!.weeks[0].days).toHaveLength(2); // Push + Pull
    expect(result!.weeks[1].weekNumber).toBe(2);
    expect(result!.weeks[1].days).toHaveLength(2); // Push + Pull
    // 4 distinct pairs / (4 weeks * 2 days) = 4/8 = 50%
    expect(result!.completionPercent).toBe(50);
  });

  // Test 12: skipped days in early weeks appear in correct stored week
  it('handles skipped days correctly using stored program_week', async () => {
    mockExecuteSql
      .mockResolvedValueOnce(mockResultSet([{ id: 1, name: 'PPL', weeks: 4 }]))
      .mockResolvedValueOnce(mockResultSet([{ cnt: 4 }]))
      // User skipped Day C and Day D in week 1, did them in week 3 instead
      // With old ranking algorithm, Day C/D would incorrectly go to week 1
      // With stored program_week, they correctly go to week 3
      .mockResolvedValueOnce(
        mockResultSet([
          { session_id: 1, completed_at: '2026-03-01T10:00:00Z', program_week: 1, program_day_id: 1, day_name: 'Day A' },
          { session_id: 2, completed_at: '2026-03-02T10:00:00Z', program_week: 1, program_day_id: 2, day_name: 'Day B' },
          { session_id: 3, completed_at: '2026-03-08T10:00:00Z', program_week: 2, program_day_id: 1, day_name: 'Day A' },
          { session_id: 4, completed_at: '2026-03-09T10:00:00Z', program_week: 2, program_day_id: 2, day_name: 'Day B' },
          { session_id: 5, completed_at: '2026-03-15T10:00:00Z', program_week: 3, program_day_id: 1, day_name: 'Day A' },
          { session_id: 6, completed_at: '2026-03-16T10:00:00Z', program_week: 3, program_day_id: 2, day_name: 'Day B' },
          { session_id: 7, completed_at: '2026-03-17T10:00:00Z', program_week: 3, program_day_id: 3, day_name: 'Day C' },
          { session_id: 8, completed_at: '2026-03-18T10:00:00Z', program_week: 3, program_day_id: 4, day_name: 'Day D' },
        ]),
      )
      .mockResolvedValueOnce(mockResultSet([]))  // sets 1
      .mockResolvedValueOnce(mockResultSet([]))  // sets 2
      .mockResolvedValueOnce(mockResultSet([]))  // sets 3
      .mockResolvedValueOnce(mockResultSet([]))  // sets 4
      .mockResolvedValueOnce(mockResultSet([]))  // sets 5
      .mockResolvedValueOnce(mockResultSet([]))  // sets 6
      .mockResolvedValueOnce(mockResultSet([]))  // sets 7
      .mockResolvedValueOnce(mockResultSet([])); // sets 8

    const result = await exportProgramData(1);
    expect(result).not.toBeNull();
    expect(result!.weeks).toHaveLength(3);
    expect(result!.weeks[0].weekNumber).toBe(1);
    expect(result!.weeks[0].days).toHaveLength(2); // Day A + Day B
    expect(result!.weeks[1].weekNumber).toBe(2);
    expect(result!.weeks[1].days).toHaveLength(2); // Day A + Day B
    expect(result!.weeks[2].weekNumber).toBe(3);
    expect(result!.weeks[2].days).toHaveLength(4); // Day A + B + C + D
    // Day C and D are in week 3, NOT week 1
    const week3DayNames = result!.weeks[2].days.map(d => d.dayName);
    expect(week3DayNames).toContain('Day C');
    expect(week3DayNames).toContain('Day D');
    const week1DayNames = result!.weeks[0].days.map(d => d.dayName);
    expect(week1DayNames).not.toContain('Day C');
    expect(week1DayNames).not.toContain('Day D');
  });
});
