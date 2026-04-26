jest.mock('../database');

import { mockResultSet } from '@test-utils';
import { getHeroWorkoutContext } from '../heroWorkoutContext';

const mockExecuteSql = require('../database').executeSql as jest.MockedFunction<any>;

const mockDb = {};
const dbModule = require('../database');
Object.defineProperty(dbModule, 'db', {
  value: Promise.resolve(mockDb),
  writable: true,
});

beforeEach(() => {
  jest.clearAllMocks();
});

// ── Tests ─────────────────────────────────────────────────────────────

describe('getHeroWorkoutContext', () => {
  it('returns { headlineLift: null, addedSinceLast: null } when no completed sessions exist for this programDayId', async () => {
    // Q1: program_day_exercises — returns one reps exercise
    mockExecuteSql.mockResolvedValueOnce(
      mockResultSet([{ exercise_id: 10, name: 'Bench Press', measurement_type: 'reps' }]),
    );
    // Q2: workout_sessions — no completed sessions
    mockExecuteSql.mockResolvedValueOnce(mockResultSet([]));

    const result = await getHeroWorkoutContext(1);

    expect(result.headlineLift).toBeNull();
    expect(result.addedSinceLast).toBeNull();
  });

  it('returns top working set for the first reps exercise when one prior session exists; addedSinceLast is null', async () => {
    // Q1: program_day_exercises
    mockExecuteSql.mockResolvedValueOnce(
      mockResultSet([{ exercise_id: 10, name: 'Bench Press', measurement_type: 'reps' }]),
    );
    // Q2: two most recent sessions — only one
    mockExecuteSql.mockResolvedValueOnce(
      mockResultSet([{ id: 42 }]),
    );
    // Q3: top set for session 42 — 185 lb × 5 reps (column lies — _kg suffix, lb values)
    mockExecuteSql.mockResolvedValueOnce(
      mockResultSet([{ weight_kg: 184.6, reps: 5 }]),
    );

    const result = await getHeroWorkoutContext(1);

    expect(result.headlineLift).not.toBeNull();
    expect(result.headlineLift!.exerciseName).toBe('Bench Press');
    expect(result.headlineLift!.weightLb).toBe(185); // round(184.6) = 185
    expect(result.headlineLift!.reps).toBe(5);
    expect(result.addedSinceLast).toBeNull();
  });

  it('computes addedSinceLast in lb when two prior sessions exist', async () => {
    // Q1: program_day_exercises
    mockExecuteSql.mockResolvedValueOnce(
      mockResultSet([{ exercise_id: 10, name: 'Squat', measurement_type: 'reps' }]),
    );
    // Q2: two most recent sessions
    mockExecuteSql.mockResolvedValueOnce(
      mockResultSet([{ id: 55 }, { id: 44 }]),
    );
    // Q3: top set for recent session 55 — 100 kg
    mockExecuteSql.mockResolvedValueOnce(
      mockResultSet([{ weight_kg: 100, reps: 3 }]),
    );
    // Q4: top set for prior session 44 — 95.5 kg
    mockExecuteSql.mockResolvedValueOnce(
      mockResultSet([{ weight_kg: 95.5, reps: 3 }]),
    );

    const result = await getHeroWorkoutContext(2);

    expect(result.headlineLift).not.toBeNull();
    expect(result.headlineLift!.exerciseName).toBe('Squat');
    // weight_kg column actually stores lb — no conversion
    expect(result.headlineLift!.weightLb).toBe(100);
    expect(result.headlineLift!.reps).toBe(3);
    expect(result.addedSinceLast).toBeCloseTo(4.5, 4);
  });

  it('returns { headlineLift: null, addedSinceLast: null } when program day has no reps exercises (only timed/height_reps)', async () => {
    // Q1: program_day_exercises — all non-reps
    mockExecuteSql.mockResolvedValueOnce(
      mockResultSet([
        { exercise_id: 20, name: 'Plank', measurement_type: 'timed' },
        { exercise_id: 21, name: 'Box Jump', measurement_type: 'height_reps' },
      ]),
    );

    const result = await getHeroWorkoutContext(3);

    expect(result.headlineLift).toBeNull();
    expect(result.addedSinceLast).toBeNull();
    // Should NOT make further queries after finding no reps exercise
    expect(mockExecuteSql).toHaveBeenCalledTimes(1);
  });

  it('returns { headlineLift: null, addedSinceLast: null } when recent session has no sets for the headline exercise', async () => {
    // Q1: program_day_exercises — returns one reps exercise
    mockExecuteSql.mockResolvedValueOnce(
      mockResultSet([{ exercise_id: 10, name: 'Bench Press', measurement_type: 'reps' }]),
    );
    // Q2: sessions — returns one session
    mockExecuteSql.mockResolvedValueOnce(
      mockResultSet([{ id: 50 }]),
    );
    // Q3: topSet for that session/exercise — empty (no sets logged)
    mockExecuteSql.mockResolvedValueOnce(mockResultSet([]));

    const result = await getHeroWorkoutContext(4);

    expect(result.headlineLift).toBeNull();
    expect(result.addedSinceLast).toBeNull();
  });
});
