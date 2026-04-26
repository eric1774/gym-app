jest.mock('../database');
jest.mock('../../utils/dates');

import { db, executeSql } from '../database';
import { getLocalDateString } from '../../utils/dates';
import { mockResultSet } from '@test-utils';
import { getWorkoutDaysForMonth, getFirstSessionDate, getDaySessionDetails } from '../calendar';

const mockExecuteSql = executeSql as jest.MockedFunction<typeof executeSql>;
const mockGetLocalDateString = getLocalDateString as jest.MockedFunction<typeof getLocalDateString>;

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

// ── getWorkoutDaysForMonth ───────────────────────────────────────────

describe('getWorkoutDaysForMonth', () => {
  it('groups sessions by local date and returns correct counts', async () => {
    mockExecuteSql.mockResolvedValueOnce(
      mockResultSet([
        { id: 1, completed_at: '2026-03-05T18:00:00Z' },
        { id: 2, completed_at: '2026-03-05T20:00:00Z' }, // same local day as #1
        { id: 3, completed_at: '2026-03-10T15:00:00Z' },
      ]),
    );
    // PR computation: prior maxes + month sets (both empty for this test)
    mockExecuteSql.mockResolvedValueOnce(mockResultSet([]));
    mockExecuteSql.mockResolvedValueOnce(mockResultSet([]));
    mockGetLocalDateString.mockImplementation((d: Date) => {
      const iso = d.toISOString();
      if (iso.startsWith('2026-03-05')) { return '2026-03-05'; }
      if (iso.startsWith('2026-03-10')) { return '2026-03-10'; }
      return '2026-03-05'; // default for same-day edge
    });

    const result = await getWorkoutDaysForMonth(2026, 3);

    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({ date: '2026-03-05', sessionCount: 2, hasPR: false });
    expect(result[1]).toEqual({ date: '2026-03-10', sessionCount: 1, hasPR: false });
  });

  it('returns results sorted ascending by date', async () => {
    mockExecuteSql.mockResolvedValueOnce(
      mockResultSet([
        { id: 1, completed_at: '2026-03-20T10:00:00Z' },
        { id: 2, completed_at: '2026-03-05T10:00:00Z' },
      ]),
    );
    mockExecuteSql.mockResolvedValueOnce(mockResultSet([]));
    mockExecuteSql.mockResolvedValueOnce(mockResultSet([]));
    mockGetLocalDateString
      .mockReturnValueOnce('2026-03-20')
      .mockReturnValueOnce('2026-03-05');

    const result = await getWorkoutDaysForMonth(2026, 3);

    expect(result[0].date).toBe('2026-03-05');
    expect(result[1].date).toBe('2026-03-20');
  });

  it('excludes sessions whose local date is in a different month (buffer zone)', async () => {
    // UTC date appears to be March 1 but local timezone puts it in February
    mockExecuteSql.mockResolvedValueOnce(
      mockResultSet([
        { id: 1, completed_at: '2026-03-01T00:30:00Z' }, // UTC-5 → Feb 28 local
        { id: 2, completed_at: '2026-03-15T10:00:00Z' }, // safely in March
      ]),
    );
    mockExecuteSql.mockResolvedValueOnce(mockResultSet([]));
    mockExecuteSql.mockResolvedValueOnce(mockResultSet([]));
    mockGetLocalDateString
      .mockReturnValueOnce('2026-02-28') // falls outside March → excluded
      .mockReturnValueOnce('2026-03-15'); // included

    const result = await getWorkoutDaysForMonth(2026, 3);

    expect(result).toHaveLength(1);
    expect(result[0].date).toBe('2026-03-15');
  });

  it('returns empty array when no completed sessions', async () => {
    mockExecuteSql.mockResolvedValueOnce(mockResultSet([]));
    mockExecuteSql.mockResolvedValueOnce(mockResultSet([]));
    mockExecuteSql.mockResolvedValueOnce(mockResultSet([]));

    const result = await getWorkoutDaysForMonth(2026, 3);

    expect(result).toEqual([]);
  });

  it('flags hasPR=true for dates where a non-warmup set strictly exceeds the prior (exId,reps) max', async () => {
    // Two completed sessions in March: one normal day, one with a PR.
    mockExecuteSql.mockResolvedValueOnce(
      mockResultSet([
        { id: 1, completed_at: '2026-03-05T18:00:00Z' },
        { id: 2, completed_at: '2026-03-12T18:00:00Z' },
      ]),
    );
    // Prior maxes (before March): exercise 1 at 8 reps maxed at 100kg
    mockExecuteSql.mockResolvedValueOnce(
      mockResultSet([{ exercise_id: 1, reps: 8, max_weight: 100 }]),
    );
    // Month sets: Mar 5 hits 100 (matches max, NOT a PR), Mar 12 hits 105 (PR)
    mockExecuteSql.mockResolvedValueOnce(
      mockResultSet([
        { exercise_id: 1, reps: 8, weight_kg: 100, set_number: 1, completed_at: '2026-03-05T18:00:00Z' },
        { exercise_id: 1, reps: 8, weight_kg: 105, set_number: 1, completed_at: '2026-03-12T18:00:00Z' },
      ]),
    );
    mockGetLocalDateString.mockImplementation((d: Date) => {
      const iso = d.toISOString();
      if (iso.startsWith('2026-03-05')) { return '2026-03-05'; }
      if (iso.startsWith('2026-03-12')) { return '2026-03-12'; }
      return '';
    });

    const result = await getWorkoutDaysForMonth(2026, 3);

    expect(result).toHaveLength(2);
    expect(result.find(d => d.date === '2026-03-05')?.hasPR).toBe(false);
    expect(result.find(d => d.date === '2026-03-12')?.hasPR).toBe(true);
  });

  it('does not flag hasPR for first-ever performance at a rep count (no baseline)', async () => {
    mockExecuteSql.mockResolvedValueOnce(
      mockResultSet([
        { id: 1, completed_at: '2026-03-05T18:00:00Z' },
      ]),
    );
    // No prior maxes — first time lifting at this (exercise, reps)
    mockExecuteSql.mockResolvedValueOnce(mockResultSet([]));
    // One non-warmup set in the month
    mockExecuteSql.mockResolvedValueOnce(
      mockResultSet([
        { exercise_id: 1, reps: 5, weight_kg: 200, set_number: 1, completed_at: '2026-03-05T18:00:00Z' },
      ]),
    );
    mockGetLocalDateString.mockReturnValue('2026-03-05');

    const result = await getWorkoutDaysForMonth(2026, 3);

    expect(result).toHaveLength(1);
    expect(result[0].hasPR).toBe(false);
  });
});

// ── getFirstSessionDate ──────────────────────────────────────────────

describe('getFirstSessionDate', () => {
  it('returns local date string of the earliest completed session', async () => {
    mockExecuteSql.mockResolvedValueOnce(
      mockResultSet([{ earliest: '2026-01-15T10:00:00Z' }]),
    );
    mockGetLocalDateString.mockReturnValueOnce('2026-01-15');

    const result = await getFirstSessionDate();

    expect(result).toBe('2026-01-15');
    expect(mockGetLocalDateString).toHaveBeenCalledWith(new Date('2026-01-15T10:00:00Z'));
  });

  it('returns null when earliest is null (no completed sessions)', async () => {
    mockExecuteSql.mockResolvedValueOnce(
      mockResultSet([{ earliest: null }]),
    );

    const result = await getFirstSessionDate();

    expect(result).toBeNull();
    expect(mockGetLocalDateString).not.toHaveBeenCalled();
  });

  it('returns null when ResultSet has no rows', async () => {
    mockExecuteSql.mockResolvedValueOnce(mockResultSet([]));

    const result = await getFirstSessionDate();

    expect(result).toBeNull();
  });
});

// ── getDaySessionDetails ─────────────────────────────────────────────

describe('getDaySessionDetails', () => {
  it('returns details for sessions matching the requested date, excluding non-matching sessions', async () => {
    // Call 1: SELECT all completed sessions → 2 sessions, only session 1 matches '2026-03-15'
    mockExecuteSql.mockResolvedValueOnce(
      mockResultSet([
        { id: 1, started_at: '2026-03-15T09:00:00Z', completed_at: '2026-03-15T10:00:00Z', program_day_id: 1, program_day_name: 'Push' },
        { id: 2, started_at: '2026-03-14T09:00:00Z', completed_at: '2026-03-14T10:00:00Z', program_day_id: 2, program_day_name: 'Pull' },
      ]),
    );
    // getLocalDateString: session 1 → '2026-03-15' (match), session 2 → '2026-03-14' (excluded)
    mockGetLocalDateString
      .mockReturnValueOnce('2026-03-15')
      .mockReturnValueOnce('2026-03-14');

    // Call 2: SELECT sets for session 1
    mockExecuteSql.mockResolvedValueOnce(
      mockResultSet([
        { set_number: 1, weight_kg: 100, reps: 8, is_warmup: 0, exercise_id: 1, exercise_name: 'Bench Press' },
        { set_number: 2, weight_kg: 110, reps: 6, is_warmup: 0, exercise_id: 1, exercise_name: 'Bench Press' },
      ]),
    );
    // Call 3: max weight grouped by reps for prior completed sessions
    // 8 reps prior max = 95 → 100 > 95 → isPR; 6 reps prior max = 115 → 110 <= 115 → not PR
    mockExecuteSql.mockResolvedValueOnce(
      mockResultSet([
        { reps: 8, max_weight: 95 },
        { reps: 6, max_weight: 115 },
      ]),
    );

    const result = await getDaySessionDetails('2026-03-15');

    expect(result).toHaveLength(1);
    const detail = result[0];
    expect(detail.sessionId).toBe(1);
    expect(detail.durationSeconds).toBe(3600);
    expect(detail.totalSets).toBe(2);
    expect(detail.totalVolume).toBe(100 * 8 + 110 * 6); // 800 + 660 = 1460
    expect(detail.exerciseCount).toBe(1);
    expect(detail.prCount).toBe(1);
    expect(detail.programDayName).toBe('Push');
    expect(detail.exercises[0].exerciseName).toBe('Bench Press');
    expect(detail.exercises[0].sets[0].isPR).toBe(true);
    expect(detail.exercises[0].sets[1].isPR).toBe(false);
  });

  it('sets isPR=false for all sets when no prior sessions exist at this rep count', async () => {
    mockExecuteSql.mockResolvedValueOnce(
      mockResultSet([
        { id: 1, started_at: '2026-03-15T09:00:00Z', completed_at: '2026-03-15T10:00:00Z', program_day_id: null, program_day_name: null },
      ]),
    );
    mockGetLocalDateString.mockReturnValueOnce('2026-03-15');

    // sets
    mockExecuteSql.mockResolvedValueOnce(
      mockResultSet([
        { set_number: 1, weight_kg: 100, reps: 8, is_warmup: 0, exercise_id: 1, exercise_name: 'Bench Press' },
      ]),
    );
    // prior max → empty (first-ever session, no rows grouped by reps)
    mockExecuteSql.mockResolvedValueOnce(mockResultSet([]));

    const result = await getDaySessionDetails('2026-03-15');

    expect(result[0].prCount).toBe(0);
    expect(result[0].exercises[0].sets[0].isPR).toBe(false);
  });

  it('only flags the first set as PR when the same weight x reps is repeated in one session', async () => {
    mockExecuteSql.mockResolvedValueOnce(
      mockResultSet([
        { id: 1, started_at: '2026-03-15T09:00:00Z', completed_at: '2026-03-15T10:00:00Z', program_day_id: null, program_day_name: null },
      ]),
    );
    mockGetLocalDateString.mockReturnValueOnce('2026-03-15');

    // 4 identical working sets of 160 x 12
    mockExecuteSql.mockResolvedValueOnce(
      mockResultSet([
        { set_number: 1, weight_kg: 160, reps: 12, is_warmup: 0, exercise_id: 1, exercise_name: 'Bench Press' },
        { set_number: 2, weight_kg: 160, reps: 12, is_warmup: 0, exercise_id: 1, exercise_name: 'Bench Press' },
        { set_number: 3, weight_kg: 160, reps: 12, is_warmup: 0, exercise_id: 1, exercise_name: 'Bench Press' },
        { set_number: 4, weight_kg: 160, reps: 12, is_warmup: 0, exercise_id: 1, exercise_name: 'Bench Press' },
      ]),
    );
    // Prior max at 12 reps = 150 → set 1 (160 > 150) is PR; sets 2-4 match set 1 so not PR
    mockExecuteSql.mockResolvedValueOnce(
      mockResultSet([{ reps: 12, max_weight: 150 }]),
    );

    const result = await getDaySessionDetails('2026-03-15');

    expect(result[0].prCount).toBe(1);
    expect(result[0].exercises[0].sets[0].isPR).toBe(true);
    expect(result[0].exercises[0].sets[1].isPR).toBe(false);
    expect(result[0].exercises[0].sets[2].isPR).toBe(false);
    expect(result[0].exercises[0].sets[3].isPR).toBe(false);
  });

  it('flags a later heavier set at the same rep count as a new PR', async () => {
    mockExecuteSql.mockResolvedValueOnce(
      mockResultSet([
        { id: 1, started_at: '2026-03-15T09:00:00Z', completed_at: '2026-03-15T10:00:00Z', program_day_id: null, program_day_name: null },
      ]),
    );
    mockGetLocalDateString.mockReturnValueOnce('2026-03-15');

    // 160 x 12, then 170 x 12 later in the same session
    mockExecuteSql.mockResolvedValueOnce(
      mockResultSet([
        { set_number: 1, weight_kg: 160, reps: 12, is_warmup: 0, exercise_id: 1, exercise_name: 'Bench Press' },
        { set_number: 2, weight_kg: 160, reps: 12, is_warmup: 0, exercise_id: 1, exercise_name: 'Bench Press' },
        { set_number: 3, weight_kg: 170, reps: 12, is_warmup: 0, exercise_id: 1, exercise_name: 'Bench Press' },
      ]),
    );
    mockExecuteSql.mockResolvedValueOnce(
      mockResultSet([{ reps: 12, max_weight: 150 }]),
    );

    const result = await getDaySessionDetails('2026-03-15');

    expect(result[0].prCount).toBe(2);
    expect(result[0].exercises[0].sets[0].isPR).toBe(true);  // 160 > 150 prior
    expect(result[0].exercises[0].sets[1].isPR).toBe(false); // 160 matches in-session max
    expect(result[0].exercises[0].sets[2].isPR).toBe(true);  // 170 > 160 in-session
  });

  it('excludes warmup sets from totalSets and totalVolume, warmup isPR is always false', async () => {
    mockExecuteSql.mockResolvedValueOnce(
      mockResultSet([
        { id: 1, started_at: '2026-03-15T09:00:00Z', completed_at: '2026-03-15T10:00:00Z', program_day_id: null, program_day_name: null },
      ]),
    );
    mockGetLocalDateString.mockReturnValueOnce('2026-03-15');

    // session has 1 warmup set + 1 working set
    mockExecuteSql.mockResolvedValueOnce(
      mockResultSet([
        { set_number: 1, weight_kg: 60, reps: 10, is_warmup: 1, exercise_id: 1, exercise_name: 'Bench Press' },
        { set_number: 2, weight_kg: 100, reps: 8, is_warmup: 0, exercise_id: 1, exercise_name: 'Bench Press' },
      ]),
    );
    // Prior max at 8 reps = 90 → working set 100 > 90 is a PR
    mockExecuteSql.mockResolvedValueOnce(
      mockResultSet([{ reps: 8, max_weight: 90 }]),
    );

    const result = await getDaySessionDetails('2026-03-15');

    expect(result[0].totalSets).toBe(1); // only 1 working set
    expect(result[0].totalVolume).toBe(100 * 8); // 800 — warmup excluded
    expect(result[0].exercises[0].sets[0].isWarmup).toBe(true);
    expect(result[0].exercises[0].sets[0].isPR).toBe(false); // warmup never a PR
    expect(result[0].exercises[0].sets[1].isPR).toBe(true);  // 100 > 90
  });

  it('returns empty array when no sessions match the requested date', async () => {
    mockExecuteSql.mockResolvedValueOnce(
      mockResultSet([
        { id: 1, started_at: '2026-03-14T09:00:00Z', completed_at: '2026-03-14T10:00:00Z', program_day_id: null, program_day_name: null },
      ]),
    );
    mockGetLocalDateString.mockReturnValueOnce('2026-03-14'); // all sessions are on Mar 14

    const result = await getDaySessionDetails('2026-03-15');

    expect(result).toHaveLength(0);
  });

  it('returns empty array when there are no completed sessions at all', async () => {
    mockExecuteSql.mockResolvedValueOnce(mockResultSet([]));

    const result = await getDaySessionDetails('2026-03-15');

    expect(result).toEqual([]);
  });

  it('handles session with null programDayName correctly', async () => {
    mockExecuteSql.mockResolvedValueOnce(
      mockResultSet([
        { id: 5, started_at: '2026-03-15T09:00:00Z', completed_at: '2026-03-15T10:00:00Z', program_day_id: null, program_day_name: null },
      ]),
    );
    mockGetLocalDateString.mockReturnValueOnce('2026-03-15');

    mockExecuteSql.mockResolvedValueOnce(mockResultSet([])); // no sets

    const result = await getDaySessionDetails('2026-03-15');

    expect(result[0].programDayName).toBeNull();
    expect(result[0].exercises).toHaveLength(0);
    expect(result[0].totalSets).toBe(0);
    expect(result[0].totalVolume).toBe(0);
    expect(result[0].prCount).toBe(0);
  });
});
