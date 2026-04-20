jest.mock('../database');
import { rowToProgram, rowToProgramDay, rowToProgramDayExercise } from '../programs';

describe('rowToProgram', () => {
  it('maps active program row to Program with camelCase fields', () => {
    const row = {
      id: 1,
      name: 'PPL',
      weeks: 8,
      start_date: '2026-01-01',
      current_week: 3,
      created_at: '2026-01-01T00:00:00',
    };
    expect(rowToProgram(row)).toEqual({
      id: 1,
      name: 'PPL',
      weeks: 8,
      startDate: '2026-01-01',
      currentWeek: 3,
      createdAt: '2026-01-01T00:00:00',
    });
  });

  it('returns startDate null when start_date is null', () => {
    const row = {
      id: 2,
      name: 'New Program',
      weeks: 4,
      start_date: null,
      current_week: 1,
      created_at: '2026-01-01T00:00:00',
    };
    expect(rowToProgram(row).startDate).toBe(null);
  });
});

describe('rowToProgramDay', () => {
  it('maps program day row to ProgramDay with camelCase fields', () => {
    const row = {
      id: 1,
      program_id: 1,
      name: 'Push Day',
      sort_order: 0,
      created_at: '2026-01-01T00:00:00',
    };
    expect(rowToProgramDay(row)).toEqual({
      id: 1,
      programId: 1,
      name: 'Push Day',
      sortOrder: 0,
      createdAt: '2026-01-01T00:00:00',
    });
  });
});

describe('rowToProgramDayExercise', () => {
  it('maps exercise with superset group to ProgramDayExercise with camelCase fields', () => {
    const row = {
      id: 1,
      program_day_id: 1,
      exercise_id: 5,
      target_sets: 3,
      target_reps: 10,
      target_weight_kg: 80,
      sort_order: 0,
      superset_group_id: 1710000000000,
    };
    expect(rowToProgramDayExercise(row)).toEqual({
      id: 1,
      programDayId: 1,
      exerciseId: 5,
      targetSets: 3,
      targetReps: 10,
      targetWeightLbs: 80,
      sortOrder: 0,
      supersetGroupId: 1710000000000,
      notes: null,
    });
  });

  it('returns supersetGroupId null when superset_group_id is null', () => {
    const row = {
      id: 2,
      program_day_id: 1,
      exercise_id: 6,
      target_sets: 4,
      target_reps: 8,
      target_weight_kg: 100,
      sort_order: 1,
      superset_group_id: null,
    };
    expect(rowToProgramDayExercise(row).supersetGroupId).toBe(null);
  });

  it('returns supersetGroupId null when superset_group_id is undefined', () => {
    const row = {
      id: 3,
      program_day_id: 1,
      exercise_id: 7,
      target_sets: 3,
      target_reps: 12,
      target_weight_kg: 60,
      sort_order: 2,
      superset_group_id: undefined,
    };
    expect(rowToProgramDayExercise(row).supersetGroupId).toBe(null);
  });
});
