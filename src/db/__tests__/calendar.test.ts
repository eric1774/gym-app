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
    mockGetLocalDateString.mockImplementation((d: Date) => {
      const iso = d.toISOString();
      if (iso.startsWith('2026-03-05')) { return '2026-03-05'; }
      if (iso.startsWith('2026-03-10')) { return '2026-03-10'; }
      return '2026-03-05'; // default for same-day edge
    });

    const result = await getWorkoutDaysForMonth(2026, 3);

    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({ date: '2026-03-05', sessionCount: 2 });
    expect(result[1]).toEqual({ date: '2026-03-10', sessionCount: 1 });
  });

  it('returns results sorted ascending by date', async () => {
    mockExecuteSql.mockResolvedValueOnce(
      mockResultSet([
        { id: 1, completed_at: '2026-03-20T10:00:00Z' },
        { id: 2, completed_at: '2026-03-05T10:00:00Z' },
      ]),
    );
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
    mockGetLocalDateString
      .mockReturnValueOnce('2026-02-28') // falls outside March → excluded
      .mockReturnValueOnce('2026-03-15'); // included

    const result = await getWorkoutDaysForMonth(2026, 3);

    expect(result).toHaveLength(1);
    expect(result[0].date).toBe('2026-03-15');
  });

  it('returns empty array when no completed sessions', async () => {
    mockExecuteSql.mockResolvedValueOnce(mockResultSet([]));

    const result = await getWorkoutDaysForMonth(2026, 3);

    expect(result).toEqual([]);
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
    // Call 3: SELECT max_volume for exercise_id=1 prior sessions → {max_volume: 700}
    // 100*8=800 > 700 → isPR=true; 110*6=660 < 700 → isPR=false
    mockExecuteSql.mockResolvedValueOnce(
      mockResultSet([{ max_volume: 700 }]),
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

  it('sets isPR=false for all sets when no prior sessions exist (null max_volume)', async () => {
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
    // prior max → null (first-ever session)
    mockExecuteSql.mockResolvedValueOnce(
      mockResultSet([{ max_volume: null }]),
    );

    const result = await getDaySessionDetails('2026-03-15');

    expect(result[0].prCount).toBe(0);
    expect(result[0].exercises[0].sets[0].isPR).toBe(false);
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
    // max_volume check (warmup is excluded from this query on source side, but set isPR=false anyway)
    mockExecuteSql.mockResolvedValueOnce(
      mockResultSet([{ max_volume: 700 }]),
    );

    const result = await getDaySessionDetails('2026-03-15');

    expect(result[0].totalSets).toBe(1); // only 1 working set
    expect(result[0].totalVolume).toBe(100 * 8); // 800 — warmup excluded
    expect(result[0].exercises[0].sets[0].isWarmup).toBe(true);
    expect(result[0].exercises[0].sets[0].isPR).toBe(false); // warmup never a PR
    expect(result[0].exercises[0].sets[1].isPR).toBe(true);  // 800 > 700
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
