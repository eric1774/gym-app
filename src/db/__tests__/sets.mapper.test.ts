jest.mock('../database');
import { rowToSet } from '../sets';

describe('rowToSet', () => {
  it('maps working set row to WorkoutSet with camelCase fields', () => {
    const row = {
      id: 10,
      session_id: 1,
      exercise_id: 2,
      set_number: 3,
      weight_kg: 100,
      reps: 8,
      logged_at: '2026-01-01T10:05:00',
      is_warmup: 0,
    };
    expect(rowToSet(row)).toEqual({
      id: 10,
      sessionId: 1,
      exerciseId: 2,
      setNumber: 3,
      weightLbs: 100,
      reps: 8,
      loggedAt: '2026-01-01T10:05:00',
      isWarmup: false,
    });
  });

  it('coerces is_warmup=1 to true', () => {
    const row = {
      id: 11,
      session_id: 1,
      exercise_id: 2,
      set_number: 1,
      weight_kg: 40,
      reps: 10,
      logged_at: '2026-01-01T10:00:00',
      is_warmup: 1,
    };
    expect(rowToSet(row).isWarmup).toBe(true);
  });
});
