jest.mock('../database');
import { rowToExercise } from '../exercises';

describe('rowToExercise', () => {
  it('maps snake_case row to Exercise with camelCase fields', () => {
    const row = {
      id: 1,
      name: 'Bench Press',
      category: 'chest',
      default_rest_seconds: 90,
      is_custom: 0,
      measurement_type: 'reps',
      created_at: '2026-01-01T00:00:00',
    };
    expect(rowToExercise(row)).toEqual({
      id: 1,
      name: 'Bench Press',
      category: 'chest',
      defaultRestSeconds: 90,
      isCustom: false,
      measurementType: 'reps',
      createdAt: '2026-01-01T00:00:00',
    });
  });

  it('coerces is_custom=1 to true', () => {
    const row = {
      id: 2,
      name: 'Custom Curl',
      category: 'arms',
      default_rest_seconds: 60,
      is_custom: 1,
      measurement_type: 'reps',
      created_at: '2026-01-01T00:00:00',
    };
    expect(rowToExercise(row).isCustom).toBe(true);
  });

  it('defaults measurementType to reps when measurement_type is empty string', () => {
    const row = {
      id: 3,
      name: 'Plank',
      category: 'core',
      default_rest_seconds: 30,
      is_custom: 0,
      measurement_type: '',
      created_at: '2026-01-01T00:00:00',
    };
    expect(rowToExercise(row).measurementType).toBe('reps');
  });
});
