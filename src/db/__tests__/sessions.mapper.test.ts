jest.mock('../database');
import { rowToSession, rowToExerciseSession } from '../sessions';

describe('rowToSession', () => {
  it('maps completed session row to WorkoutSession with camelCase fields', () => {
    const row = {
      id: 1,
      started_at: '2026-01-01T10:00:00',
      completed_at: '2026-01-01T11:00:00',
      program_day_id: 5,
    };
    expect(rowToSession(row)).toEqual({
      id: 1,
      startedAt: '2026-01-01T10:00:00',
      completedAt: '2026-01-01T11:00:00',
      programDayId: 5,
    });
  });

  it('returns null for null completed_at', () => {
    const row = {
      id: 2,
      started_at: '2026-01-01T10:00:00',
      completed_at: null,
      program_day_id: 5,
    };
    expect(rowToSession(row).completedAt).toBe(null);
  });

  it('returns null for null program_day_id', () => {
    const row = {
      id: 3,
      started_at: '2026-01-01T10:00:00',
      completed_at: null,
      program_day_id: null,
    };
    expect(rowToSession(row).programDayId).toBe(null);
  });
});

describe('rowToExerciseSession', () => {
  it('maps exercise session row to ExerciseSession with camelCase fields', () => {
    const row = {
      exercise_id: 3,
      session_id: 1,
      is_complete: 0,
      rest_seconds: 90,
    };
    expect(rowToExerciseSession(row)).toEqual({
      exerciseId: 3,
      sessionId: 1,
      isComplete: false,
      restSeconds: 90,
    });
  });

  it('coerces is_complete=1 to true', () => {
    const row = {
      exercise_id: 4,
      session_id: 2,
      is_complete: 1,
      rest_seconds: 60,
    };
    expect(rowToExerciseSession(row).isComplete).toBe(true);
  });
});
