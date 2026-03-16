import {
  CREATE_EXERCISES_TABLE,
  CREATE_WORKOUT_SESSIONS_TABLE,
  CREATE_WORKOUT_SETS_TABLE,
  CREATE_EXERCISE_SESSIONS_TABLE,
  CREATE_PROGRAMS_TABLE,
  CREATE_PROGRAM_DAYS_TABLE,
  CREATE_PROGRAM_DAY_EXERCISES_TABLE,
} from '../schema';

// Trivial import tests — schema.ts exports SQL string constants with no logic.
// These tests exist solely to register the file for coverage.
describe('db/schema constants', () => {
  it('exports CREATE_EXERCISES_TABLE as a string containing IF NOT EXISTS', () => {
    expect(typeof CREATE_EXERCISES_TABLE).toBe('string');
    expect(CREATE_EXERCISES_TABLE).toContain('IF NOT EXISTS');
    expect(CREATE_EXERCISES_TABLE).toContain('exercises');
  });

  it('exports CREATE_WORKOUT_SESSIONS_TABLE as a string', () => {
    expect(typeof CREATE_WORKOUT_SESSIONS_TABLE).toBe('string');
    expect(CREATE_WORKOUT_SESSIONS_TABLE).toContain('workout_sessions');
  });

  it('exports CREATE_WORKOUT_SETS_TABLE as a string', () => {
    expect(typeof CREATE_WORKOUT_SETS_TABLE).toBe('string');
    expect(CREATE_WORKOUT_SETS_TABLE).toContain('workout_sets');
  });

  it('exports CREATE_EXERCISE_SESSIONS_TABLE as a string', () => {
    expect(typeof CREATE_EXERCISE_SESSIONS_TABLE).toBe('string');
    expect(CREATE_EXERCISE_SESSIONS_TABLE).toContain('exercise_sessions');
  });

  it('exports CREATE_PROGRAMS_TABLE as a string', () => {
    expect(typeof CREATE_PROGRAMS_TABLE).toBe('string');
    expect(CREATE_PROGRAMS_TABLE).toContain('programs');
  });

  it('exports CREATE_PROGRAM_DAYS_TABLE as a string', () => {
    expect(typeof CREATE_PROGRAM_DAYS_TABLE).toBe('string');
    expect(CREATE_PROGRAM_DAYS_TABLE).toContain('program_days');
  });

  it('exports CREATE_PROGRAM_DAY_EXERCISES_TABLE as a string', () => {
    expect(typeof CREATE_PROGRAM_DAY_EXERCISES_TABLE).toBe('string');
    expect(CREATE_PROGRAM_DAY_EXERCISES_TABLE).toContain('program_day_exercises');
  });
});
