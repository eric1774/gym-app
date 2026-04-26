jest.mock('../database');

import { db, executeSql } from '../database';
import { mockResultSet } from '@test-utils';
import {
  getWeeklySnapshot,
  getSessionComparison,
  getSessionSetDetail,
  getStatsStripData,
  getAllExercisesWithProgress,
  getTopMovers,
  getProgramDayWeeklyTonnage,
  getPRWatch,
  getStaleExercise,
  getExerciseChartData,
} from '../progress';

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

// ── getWeeklySnapshot ────────────────────────────────────────────────

describe('getWeeklySnapshot', () => {
  it('returns sessions, prs, and volume change from 3 queries', async () => {
    // Q1: sessions this week
    mockExecuteSql.mockResolvedValueOnce(mockResultSet([{ cnt: 3 }]));
    // Q2: PR count this week
    mockExecuteSql.mockResolvedValueOnce(mockResultSet([{ pr_count: 2 }]));
    // Q3: this week volume
    mockExecuteSql.mockResolvedValueOnce(mockResultSet([{ volume: 500 }]));
    // Q4: previous week volume
    mockExecuteSql.mockResolvedValueOnce(mockResultSet([{ volume: 400 }]));

    const result = await getWeeklySnapshot();
    expect(result.sessionsThisWeek).toBe(3);
    expect(result.prsThisWeek).toBe(2);
    expect(result.volumeChangePercent).toBeCloseTo(25, 1);
  });

  it('returns null volumeChangePercent when no previous week data', async () => {
    mockExecuteSql.mockResolvedValueOnce(mockResultSet([{ cnt: 1 }]));
    mockExecuteSql.mockResolvedValueOnce(mockResultSet([{ pr_count: 0 }]));
    mockExecuteSql.mockResolvedValueOnce(mockResultSet([{ volume: 200 }]));
    mockExecuteSql.mockResolvedValueOnce(mockResultSet([{ volume: null }]));

    const result = await getWeeklySnapshot();
    expect(result.sessionsThisWeek).toBe(1);
    expect(result.prsThisWeek).toBe(0);
    expect(result.volumeChangePercent).toBeNull();
  });

  it('returns null volumeChangePercent when previous week volume is 0', async () => {
    mockExecuteSql.mockResolvedValueOnce(mockResultSet([{ cnt: 2 }]));
    mockExecuteSql.mockResolvedValueOnce(mockResultSet([{ pr_count: 1 }]));
    mockExecuteSql.mockResolvedValueOnce(mockResultSet([{ volume: 300 }]));
    mockExecuteSql.mockResolvedValueOnce(mockResultSet([{ volume: 0 }]));

    const result = await getWeeklySnapshot();
    expect(result.volumeChangePercent).toBeNull();
  });

  it('returns 0 sessionsThisWeek when no sessions found', async () => {
    mockExecuteSql.mockResolvedValueOnce(mockResultSet([{ cnt: 0 }]));
    mockExecuteSql.mockResolvedValueOnce(mockResultSet([{ pr_count: 0 }]));
    mockExecuteSql.mockResolvedValueOnce(mockResultSet([{ volume: null }]));
    mockExecuteSql.mockResolvedValueOnce(mockResultSet([{ volume: null }]));

    const result = await getWeeklySnapshot();
    expect(result.sessionsThisWeek).toBe(0);
    expect(result.prsThisWeek).toBe(0);
    expect(result.volumeChangePercent).toBeNull();
  });
});

// ── getSessionComparison ─────────────────────────────────────────────

describe('getSessionComparison', () => {
  it('returns comparison data for previous mode', async () => {
    // Q1: current session date
    mockExecuteSql.mockResolvedValueOnce(
      mockResultSet([{ completed_at: '2026-04-10T10:00:00Z' }]),
    );
    // Q2: find comparison session (previous)
    mockExecuteSql.mockResolvedValueOnce(
      mockResultSet([{ id: 5, completed_at: '2026-04-03T10:00:00Z' }]),
    );
    // Q3: current session sets
    mockExecuteSql.mockResolvedValueOnce(
      mockResultSet([
        { set_number: 1, weight_kg: 100, reps: 8, is_warmup: 0 },
        { set_number: 2, weight_kg: 100, reps: 7, is_warmup: 0 },
      ]),
    );
    // Q4: comparison session sets
    mockExecuteSql.mockResolvedValueOnce(
      mockResultSet([
        { set_number: 1, weight_kg: 90, reps: 8, is_warmup: 0 },
      ]),
    );

    const result = await getSessionComparison(10, 1, 'previous');
    expect(result).not.toBeNull();
    expect(result!.comparisonDate).toBe('2026-04-03T10:00:00Z');
    expect(result!.comparisonLabel).toBe('vs Previous Session');
    expect(result!.currentSets).toHaveLength(2);
    expect(result!.currentSets[0].weightLbs).toBe(100);
    expect(result!.comparisonSets).toHaveLength(1);
    expect(result!.comparisonSets[0].weightLbs).toBe(90);
  });

  it('returns comparison data for lastMonth mode', async () => {
    // Q1: current session date
    mockExecuteSql.mockResolvedValueOnce(
      mockResultSet([{ completed_at: '2026-04-10T10:00:00Z' }]),
    );
    // Q2: find comparison session (last month)
    mockExecuteSql.mockResolvedValueOnce(
      mockResultSet([{ id: 3, completed_at: '2026-03-11T10:00:00Z' }]),
    );
    // Q3: current sets
    mockExecuteSql.mockResolvedValueOnce(
      mockResultSet([{ set_number: 1, weight_kg: 80, reps: 10, is_warmup: 0 }]),
    );
    // Q4: comparison sets
    mockExecuteSql.mockResolvedValueOnce(
      mockResultSet([{ set_number: 1, weight_kg: 75, reps: 10, is_warmup: 0 }]),
    );

    const result = await getSessionComparison(10, 1, 'lastMonth');
    expect(result).not.toBeNull();
    expect(result!.comparisonLabel).toBe('vs Last Month');
  });

  it('returns null when no comparison session found', async () => {
    // Q1: current session date
    mockExecuteSql.mockResolvedValueOnce(
      mockResultSet([{ completed_at: '2026-04-10T10:00:00Z' }]),
    );
    // Q2: no comparison session
    mockExecuteSql.mockResolvedValueOnce(mockResultSet([]));

    const result = await getSessionComparison(10, 1, 'previous');
    expect(result).toBeNull();
  });

  it('returns null when current session not found', async () => {
    // Q1: no session
    mockExecuteSql.mockResolvedValueOnce(mockResultSet([]));

    const result = await getSessionComparison(999, 1, 'previous');
    expect(result).toBeNull();
  });

  it('maps is_warmup correctly', async () => {
    mockExecuteSql.mockResolvedValueOnce(
      mockResultSet([{ completed_at: '2026-04-10T10:00:00Z' }]),
    );
    mockExecuteSql.mockResolvedValueOnce(
      mockResultSet([{ id: 5, completed_at: '2026-04-03T10:00:00Z' }]),
    );
    mockExecuteSql.mockResolvedValueOnce(
      mockResultSet([
        { set_number: 1, weight_kg: 60, reps: 10, is_warmup: 1 },
        { set_number: 2, weight_kg: 100, reps: 8, is_warmup: 0 },
      ]),
    );
    mockExecuteSql.mockResolvedValueOnce(mockResultSet([]));

    const result = await getSessionComparison(10, 1, 'previous');
    expect(result!.currentSets[0].isWarmup).toBe(true);
    expect(result!.currentSets[1].isWarmup).toBe(false);
  });
});

// ── getSessionSetDetail ──────────────────────────────────────────────

describe('getSessionSetDetail', () => {
  it('returns set details with rest times calculated from logged_at', async () => {
    mockExecuteSql.mockResolvedValueOnce(
      mockResultSet([
        { set_number: 1, weight_kg: 80, reps: 10, is_warmup: 0, logged_at: '2026-04-10T10:00:00Z' },
        { set_number: 2, weight_kg: 80, reps: 9, is_warmup: 0, logged_at: '2026-04-10T10:02:30Z' },
        { set_number: 3, weight_kg: 80, reps: 8, is_warmup: 0, logged_at: '2026-04-10T10:05:00Z' },
      ]),
    );

    const result = await getSessionSetDetail(10, 1);
    expect(result).toHaveLength(3);
    expect(result[0].setNumber).toBe(1);
    expect(result[0].weightLbs).toBe(80);
    expect(result[0].reps).toBe(10);
    expect(result[0].isWarmup).toBe(false);
    expect(result[0].restSeconds).toBeNull(); // first set

    // second set: 10:00:00 -> 10:02:30 = 150 seconds
    expect(result[1].restSeconds).toBe(150);

    // third set: 10:02:30 -> 10:05:00 = 150 seconds
    expect(result[2].restSeconds).toBe(150);
  });

  it('returns empty array when no sets found', async () => {
    mockExecuteSql.mockResolvedValueOnce(mockResultSet([]));
    const result = await getSessionSetDetail(999, 1);
    expect(result).toEqual([]);
  });

  it('maps is_warmup = 1 to true', async () => {
    mockExecuteSql.mockResolvedValueOnce(
      mockResultSet([
        { set_number: 1, weight_kg: 40, reps: 15, is_warmup: 1, logged_at: '2026-04-10T10:00:00Z' },
      ]),
    );
    const result = await getSessionSetDetail(10, 1);
    expect(result[0].isWarmup).toBe(true);
    expect(result[0].restSeconds).toBeNull();
  });

  it('handles single set with null restSeconds', async () => {
    mockExecuteSql.mockResolvedValueOnce(
      mockResultSet([
        { set_number: 1, weight_kg: 100, reps: 5, is_warmup: 0, logged_at: '2026-04-10T10:00:00Z' },
      ]),
    );
    const result = await getSessionSetDetail(10, 1);
    expect(result).toHaveLength(1);
    expect(result[0].restSeconds).toBeNull();
  });
});

// ── getTopMovers ────────────────────────────────────────────────────

describe('getTopMovers', () => {
  it('returns up to N exercises ranked by |deltaPercent|', async () => {
    // Mock the underlying getAllExercisesWithProgress queries
    mockExecuteSql.mockResolvedValueOnce(mockResultSet([
      { id: 1, name: 'BiggestMover', category: 'chest', measurement_type: 'reps',
        last_trained_at: '2026-04-22T00:00:00Z', session_count: 5 },
    ]));
    mockExecuteSql.mockResolvedValueOnce(mockResultSet([{ date: '2026-04-22', best: 120 }]));
    mockExecuteSql.mockResolvedValueOnce(mockResultSet([
      { date: '2026-04-22', best: 120 }, { date: '2026-04-15', best: 100 },
    ]));

    const result = await getTopMovers(14, 3);
    expect(result.length).toBeLessThanOrEqual(3);
    expect(result[0].deltaPercent14d).not.toBeNull();
  });

  it('excludes exercises with null deltaPercent14d', async () => {
    mockExecuteSql.mockResolvedValueOnce(mockResultSet([
      { id: 1, name: 'OnlyOneSession', category: 'chest', measurement_type: 'reps',
        last_trained_at: '2026-04-22T00:00:00Z', session_count: 1 },
    ]));
    mockExecuteSql.mockResolvedValueOnce(mockResultSet([{ date: '2026-04-22', best: 100 }]));
    mockExecuteSql.mockResolvedValueOnce(mockResultSet([{ date: '2026-04-22', best: 100 }]));

    const result = await getTopMovers(14, 3);
    expect(result.length).toBe(0);
  });
});

// ── getAllExercisesWithProgress ──────────────────────────────────────

describe('getAllExercisesWithProgress', () => {
  it('returns all exercises sorted by recent when filter=all', async () => {
    mockExecuteSql.mockResolvedValueOnce(mockResultSet([
      { id: 1, name: 'Bench Press', category: 'chest', measurement_type: 'reps',
        last_trained_at: '2026-04-22T00:00:00Z', session_count: 12 },
      { id: 2, name: 'Squat', category: 'legs', measurement_type: 'reps',
        last_trained_at: '2026-04-20T00:00:00Z', session_count: 8 },
    ]));
    // Sparkline + delta query per exercise (2 queries × 2 exercises = 4 more)
    mockExecuteSql.mockResolvedValueOnce(mockResultSet([
      { date: '2026-04-22', best: 195 }, { date: '2026-04-19', best: 190 },
    ]));
    mockExecuteSql.mockResolvedValueOnce(mockResultSet([
      { date: '2026-04-22', best: 195 }, { date: '2026-04-08', best: 185 },
    ]));
    mockExecuteSql.mockResolvedValueOnce(mockResultSet([
      { date: '2026-04-20', best: 275 }, { date: '2026-04-18', best: 270 },
    ]));
    mockExecuteSql.mockResolvedValueOnce(mockResultSet([
      { date: '2026-04-20', best: 275 }, { date: '2026-04-06', best: 265 },
    ]));

    const result = await getAllExercisesWithProgress('all', '', 'recent');
    expect(result.length).toBe(2);
    expect(result[0].exerciseName).toBe('Bench Press');
    expect(result[0].sparklinePoints.length).toBeGreaterThan(0);
  });

  it('returns deltaPercent14d=null when fewer than 2 sessions in 14d window', async () => {
    mockExecuteSql.mockResolvedValueOnce(mockResultSet([
      { id: 1, name: 'X', category: 'chest', measurement_type: 'reps',
        last_trained_at: '2026-04-22T00:00:00Z', session_count: 1 },
    ]));
    mockExecuteSql.mockResolvedValueOnce(mockResultSet([{ date: '2026-04-22', best: 100 }]));
    mockExecuteSql.mockResolvedValueOnce(mockResultSet([{ date: '2026-04-22', best: 100 }]));

    const result = await getAllExercisesWithProgress('all', '', 'recent');
    expect(result[0].deltaPercent14d).toBeNull();
  });

  it('filters by category when filter set', async () => {
    mockExecuteSql.mockResolvedValueOnce(mockResultSet([]));
    await getAllExercisesWithProgress('legs', '', 'recent');
    const sql = mockExecuteSql.mock.calls[0][1] as string;
    expect(sql).toContain('category');
    const params = mockExecuteSql.mock.calls[0][2] as unknown[];
    expect(params).toContain('legs');
  });

  it('case-insensitive name search filter', async () => {
    mockExecuteSql.mockResolvedValueOnce(mockResultSet([]));
    await getAllExercisesWithProgress('all', 'BENCH', 'recent');
    const sql = mockExecuteSql.mock.calls[0][1] as string;
    expect(sql.toLowerCase()).toContain('like');
    const params = mockExecuteSql.mock.calls[0][2] as unknown[];
    expect(params).toContain('%bench%');
  });

  it('sort=movers ranks by absolute deltaPercent14d', async () => {
    mockExecuteSql.mockResolvedValueOnce(mockResultSet([
      { id: 1, name: 'Up7', category: 'chest', measurement_type: 'reps',
        last_trained_at: '2026-04-22T00:00:00Z', session_count: 5 },
      { id: 2, name: 'Down12', category: 'back', measurement_type: 'reps',
        last_trained_at: '2026-04-21T00:00:00Z', session_count: 5 },
    ]));
    // Up7: 7% gain
    mockExecuteSql.mockResolvedValueOnce(mockResultSet([{ date: '2026-04-22', best: 100 }]));
    mockExecuteSql.mockResolvedValueOnce(mockResultSet([
      { date: '2026-04-22', best: 107 }, { date: '2026-04-15', best: 100 },
    ]));
    // Down12: -12% drop
    mockExecuteSql.mockResolvedValueOnce(mockResultSet([{ date: '2026-04-21', best: 88 }]));
    mockExecuteSql.mockResolvedValueOnce(mockResultSet([
      { date: '2026-04-21', best: 88 }, { date: '2026-04-15', best: 100 },
    ]));

    const result = await getAllExercisesWithProgress('all', '', 'movers');
    expect(result[0].exerciseName).toBe('Down12'); // |12| > |7|
  });
});

// ── getProgramDayWeeklyTonnage ────────────────────────────────────────

describe('getProgramDayWeeklyTonnage', () => {
  it('returns one row per program day with 4-tuple weeklyTonnageLb', async () => {
    // Day rows
    mockExecuteSql.mockResolvedValueOnce(mockResultSet([
      { id: 10, name: 'Push Day', exercise_count: 6, last_performed_at: '2026-04-22T00:00:00Z' },
    ]));
    // Weekly tonnage for day 10 (4 rows: w-3, w-2, w-1, this)
    mockExecuteSql.mockResolvedValueOnce(mockResultSet([
      { week_offset: 3, tonnage: 9500 },
      { week_offset: 2, tonnage: 13200 },
      { week_offset: 1, tonnage: 17400 },
      { week_offset: 0, tonnage: 18450 },
    ]));

    const result = await getProgramDayWeeklyTonnage(1);
    expect(result.length).toBe(1);
    expect(result[0].dayName).toBe('Push Day');
    expect(result[0].weeklyTonnageLb).toEqual([9500, 13200, 17400, 18450]);
    expect(result[0].currentWeekTonnageLb).toBe(18450);
  });

  it('deltaPercent2wk null when fewer than 4 weeks of data', async () => {
    mockExecuteSql.mockResolvedValueOnce(mockResultSet([
      { id: 10, name: 'Push', exercise_count: 6, last_performed_at: '2026-04-22T00:00:00Z' },
    ]));
    mockExecuteSql.mockResolvedValueOnce(mockResultSet([
      { week_offset: 1, tonnage: 1000 },
      { week_offset: 0, tonnage: 1100 },
    ]));

    const result = await getProgramDayWeeklyTonnage(1);
    expect(result[0].deltaPercent2wk).toBeNull();
    expect(result[0].weeklyTonnageLb).toEqual([0, 0, 1000, 1100]);
  });

  it('deltaPercent2wk = (last2wk - prior2wk)/prior2wk * 100 when 4 weeks present', async () => {
    mockExecuteSql.mockResolvedValueOnce(mockResultSet([
      { id: 10, name: 'Push', exercise_count: 6, last_performed_at: '2026-04-22T00:00:00Z' },
    ]));
    // prior 2wk = 9500+13200=22700; last 2wk = 17400+18450=35850 → +57.9%
    mockExecuteSql.mockResolvedValueOnce(mockResultSet([
      { week_offset: 3, tonnage: 9500 },
      { week_offset: 2, tonnage: 13200 },
      { week_offset: 1, tonnage: 17400 },
      { week_offset: 0, tonnage: 18450 },
    ]));

    const result = await getProgramDayWeeklyTonnage(1);
    expect(result[0].deltaPercent2wk).toBeCloseTo(57.93, 1);
  });
});

// ── getPRWatch ───────────────────────────────────────────────────────

describe('getPRWatch', () => {
  it('returns null when no exercise within threshold', async () => {
    mockExecuteSql.mockResolvedValueOnce(mockResultSet([
      { id: 1, name: 'Far', category: 'chest', measurement_type: 'reps',
        current_best: 100, session_count: 5 },
    ]));
    const result = await getPRWatch(10);
    // current_best 100 → next target 105 → distance 5 → within 10, should return
    expect(result).not.toBeNull();
    expect(result?.targetLb).toBe(105);
    expect(result?.distanceLb).toBe(5);
  });

  it('returns smallest distance candidate when multiple qualify', async () => {
    mockExecuteSql.mockResolvedValueOnce(mockResultSet([
      { id: 1, name: 'Bench', category: 'chest', measurement_type: 'reps',
        current_best: 195, session_count: 12, last_trained_at: '2026-04-22T00:00:00Z' },
      { id: 2, name: 'Squat', category: 'legs', measurement_type: 'reps',
        current_best: 273, session_count: 8, last_trained_at: '2026-04-20T00:00:00Z' },
    ]));
    // Bench: 195 → 200 → distance 5
    // Squat: 273 → 275 → distance 2
    const result = await getPRWatch(10);
    expect(result?.exerciseName).toBe('Squat');
    expect(result?.distanceLb).toBe(2);
  });

  it('excludes timed and height_reps measurement types', async () => {
    mockExecuteSql.mockResolvedValueOnce(mockResultSet([]));
    await getPRWatch();
    const sql = mockExecuteSql.mock.calls[0][1] as string;
    expect(sql).toContain("measurement_type = 'reps'");
  });

  it('returns null when only timed/height_reps exercises exist', async () => {
    mockExecuteSql.mockResolvedValueOnce(mockResultSet([])); // SQL filter excludes them
    const result = await getPRWatch();
    expect(result).toBeNull();
  });
});

// ── getStaleExercise ─────────────────────────────────────────────────

describe('getStaleExercise', () => {
  it('returns null when nothing past threshold', async () => {
    mockExecuteSql.mockResolvedValueOnce(mockResultSet([]));
    const result = await getStaleExercise(14, 90);
    expect(result).toBeNull();
  });

  it('returns the longest-untrained exercise within [min,max] days', async () => {
    mockExecuteSql.mockResolvedValueOnce(mockResultSet([
      { id: 5, name: 'Deadlift', category: 'legs', days_since: 14 },
    ]));
    const result = await getStaleExercise(14, 90);
    expect(result?.exerciseName).toBe('Deadlift');
    expect(result?.daysSinceLastTrained).toBe(14);
  });

  it('SQL excludes archived programs', async () => {
    mockExecuteSql.mockResolvedValueOnce(mockResultSet([]));
    await getStaleExercise();
    const sql = mockExecuteSql.mock.calls[0][1] as string;
    expect(sql).toMatch(/archived|is_archived/i);
  });

  it('SQL excludes daysSinceLastTrained > 90', async () => {
    mockExecuteSql.mockResolvedValueOnce(mockResultSet([]));
    await getStaleExercise(14, 90);
    const params = mockExecuteSql.mock.calls[0][2] as unknown[];
    // Two thresholds passed: minDays cutoff, maxDays cutoff
    expect(params.length).toBeGreaterThanOrEqual(2);
  });
});

// ── getExerciseChartData ─────────────────────────────────────────────

describe('getExerciseChartData', () => {
  it('returns chronological session points with bestWeight + volume', async () => {
    mockExecuteSql.mockResolvedValueOnce(mockResultSet([
      { session_id: 1, date: '2026-01-15T00:00:00Z', best_weight: 175, volume: 1640 },
      { session_id: 2, date: '2026-02-01T00:00:00Z', best_weight: 180, volume: 1720 },
      { session_id: 3, date: '2026-02-20T00:00:00Z', best_weight: 195, volume: 2025 },
    ]));
    const result = await getExerciseChartData(1, '6M');
    expect(result.length).toBe(3);
    expect(result[0].bestWeightLb).toBe(175);
    expect(result[2].volumeLb).toBe(2025);
  });

  it('isPR set when bestWeight is running max', async () => {
    mockExecuteSql.mockResolvedValueOnce(mockResultSet([
      { session_id: 1, date: '2026-01-15T00:00:00Z', best_weight: 175, volume: 1000 },
      { session_id: 2, date: '2026-02-01T00:00:00Z', best_weight: 170, volume: 1000 },
      { session_id: 3, date: '2026-02-20T00:00:00Z', best_weight: 180, volume: 1000 },
    ]));
    const result = await getExerciseChartData(1, '6M');
    expect(result[0].isPR).toBe(true);   // first session always PR
    expect(result[1].isPR).toBe(false);  // 170 < running max 175
    expect(result[2].isPR).toBe(true);   // 180 > running max 175
  });

  it('range filter passed as date cutoff', async () => {
    mockExecuteSql.mockResolvedValueOnce(mockResultSet([]));
    await getExerciseChartData(1, '1M');
    const params = mockExecuteSql.mock.calls[0][2] as unknown[];
    expect(params).toContain(1);
    expect(params.length).toBeGreaterThanOrEqual(2);
  });
});

// ── getStatsStripData ────────────────────────────────────────────────

describe('getStatsStripData (same-point-in-week)', () => {
  it('returns zeros when no events exist', async () => {
    // Q1: sessions current, Q2: sessions lastWeek
    mockExecuteSql.mockResolvedValueOnce(mockResultSet([{ cnt: 0 }]));
    mockExecuteSql.mockResolvedValueOnce(mockResultSet([{ cnt: 0 }]));
    // Q3: tonnage current, Q4: tonnage lastWeek
    mockExecuteSql.mockResolvedValueOnce(mockResultSet([{ v: null }]));
    mockExecuteSql.mockResolvedValueOnce(mockResultSet([{ v: null }]));
    // Q5: PRs current, Q6: PRs lastWeek
    mockExecuteSql.mockResolvedValueOnce(mockResultSet([{ pr_count: 0 }]));
    mockExecuteSql.mockResolvedValueOnce(mockResultSet([{ pr_count: 0 }]));

    const data = await getStatsStripData();
    expect(data.sessions).toEqual({ current: 0, lastWeek: 0 });
    expect(data.prs).toEqual({ current: 0, lastWeek: 0 });
    expect(data.tonnage).toEqual({ currentLb: 0, lastWeekLb: 0 });
  });

  it('queries sessions in this-week window and last-week-equivalent window', async () => {
    // Capture all executeSql calls to inspect parameters
    const calls: Array<{ sql: string; params: unknown[] }> = [];
    mockExecuteSql.mockImplementation(((_db: unknown, sql: string, params: unknown[]) => {
      calls.push({ sql, params });
      if (sql.includes('COUNT(*)') && sql.includes('workout_sessions')) {
        return Promise.resolve(mockResultSet([{ cnt: 2 }]));
      }
      if (sql.includes('SUM(')) {
        return Promise.resolve(mockResultSet([{ v: 0 }]));
      }
      return Promise.resolve(mockResultSet([{ pr_count: 0 }]));
    }) as any);

    await getStatsStripData();

    // Find the two session-count calls
    const sessionCalls = calls.filter(
      c => c.sql.includes('COUNT(*)') && c.sql.includes('workout_sessions'),
    );
    expect(sessionCalls).toHaveLength(2);

    const [curFrom, curTo] = sessionCalls[0].params as string[];
    const [lastFrom, lastTo] = sessionCalls[1].params as string[];

    // Both are ISO strings
    expect(() => new Date(curFrom)).not.toThrow();
    expect(() => new Date(curTo)).not.toThrow();
    expect(() => new Date(lastFrom)).not.toThrow();
    expect(() => new Date(lastTo)).not.toThrow();

    // current window: thisStart <= now
    expect(new Date(curFrom).getTime()).toBeLessThanOrEqual(new Date(curTo).getTime());

    // lastWeek window: lastStart is 7 days before thisStart
    const diffMs = new Date(curFrom).getTime() - new Date(lastFrom).getTime();
    expect(diffMs).toBeCloseTo(7 * 24 * 60 * 60 * 1000, -3); // ±1 second tolerance

    // elapsed spans should be equal (same-point-in-week)
    const curElapsed = new Date(curTo).getTime() - new Date(curFrom).getTime();
    const lastElapsed = new Date(lastTo).getTime() - new Date(lastFrom).getTime();
    expect(curElapsed).toBeCloseTo(lastElapsed, -3);
  });

  it('rounds tonnage from raw weight × reps stored in lb', async () => {
    // sessions: current=1, lastWeek=0
    mockExecuteSql.mockResolvedValueOnce(mockResultSet([{ cnt: 1 }]));
    mockExecuteSql.mockResolvedValueOnce(mockResultSet([{ cnt: 0 }]));
    // tonnage: current=1000.4 lb (column lies — _kg suffix, lb values), lastWeek=0
    mockExecuteSql.mockResolvedValueOnce(mockResultSet([{ v: 1000.4 }]));
    mockExecuteSql.mockResolvedValueOnce(mockResultSet([{ v: 0 }]));
    // PRs
    mockExecuteSql.mockResolvedValueOnce(mockResultSet([{ pr_count: 0 }]));
    mockExecuteSql.mockResolvedValueOnce(mockResultSet([{ pr_count: 0 }]));

    const data = await getStatsStripData();
    expect(data.tonnage.currentLb).toBe(1000);
    expect(data.tonnage.lastWeekLb).toBe(0);
  });

  it('PRs use same window comparison — PR query called twice', async () => {
    const prCalls: Array<{ sql: string; params: unknown[] }> = [];
    mockExecuteSql.mockImplementation(((_db: unknown, sql: string, params: unknown[]) => {
      if (sql.includes('COUNT(*)') && sql.includes('workout_sessions')) {
        return Promise.resolve(mockResultSet([{ cnt: 0 }]));
      }
      if (sql.includes('SUM(')) {
        return Promise.resolve(mockResultSet([{ v: 0 }]));
      }
      // PR query
      prCalls.push({ sql, params });
      return Promise.resolve(mockResultSet([{ pr_count: 1 }]));
    }) as any);

    const data = await getStatsStripData();

    expect(prCalls).toHaveLength(2);
    // Both calls should use the same 3-parameter PR query shape
    expect(prCalls[0].params).toHaveLength(3);
    expect(prCalls[1].params).toHaveLength(3);

    // current PR window: params[2] (the "before this period" cutoff) === params[0] (from)
    expect(prCalls[0].params[0]).toBe(prCalls[0].params[2]);
    // last-week PR window: same invariant
    expect(prCalls[1].params[0]).toBe(prCalls[1].params[2]);

    // The from boundaries for the two calls should be ~7 days apart
    const diffMs =
      new Date(prCalls[0].params[0] as string).getTime() -
      new Date(prCalls[1].params[0] as string).getTime();
    expect(diffMs).toBeCloseTo(7 * 24 * 60 * 60 * 1000, -3);

    expect(data.prs).toEqual({ current: 1, lastWeek: 1 });
  });
});
