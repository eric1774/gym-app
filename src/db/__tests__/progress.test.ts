jest.mock('../database');

import { db, executeSql } from '../database';
import { mockResultSet } from '@test-utils';
import {
  getWeeklySnapshot,
  getMuscleGroupProgress,
  getExerciseInsights,
  getSessionComparison,
  getSessionSetDetail,
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

// ── getMuscleGroupProgress ───────────────────────────────────────────

describe('getMuscleGroupProgress', () => {
  it('returns muscle group progress with volume change and PR flags', async () => {
    // Q1: this week volume per category
    mockExecuteSql.mockResolvedValueOnce(
      mockResultSet([
        { category: 'chest', volume: 600 },
        { category: 'back', volume: 400 },
      ]),
    );
    // Q2: last week volume per category
    mockExecuteSql.mockResolvedValueOnce(
      mockResultSet([
        { category: 'chest', volume: 500 },
        { category: 'back', volume: 0 },
      ]),
    );
    // Q3: PRs this week per category
    mockExecuteSql.mockResolvedValueOnce(
      mockResultSet([
        { category: 'chest' },
      ]),
    );
    // Q4: last trained per category (within 2 weeks)
    mockExecuteSql.mockResolvedValueOnce(
      mockResultSet([
        { category: 'chest', last_trained_at: '2026-04-10T10:00:00Z' },
        { category: 'back', last_trained_at: '2026-04-08T10:00:00Z' },
      ]),
    );

    const result = await getMuscleGroupProgress();
    expect(result).toHaveLength(2);

    const chest = result.find(r => r.category === 'chest');
    expect(chest).toBeDefined();
    expect(chest!.hasPR).toBe(true);
    expect(chest!.volumeChangePercent).toBeCloseTo(20, 1);
    expect(chest!.lastTrainedAt).toBe('2026-04-10T10:00:00Z');

    const back = result.find(r => r.category === 'back');
    expect(back).toBeDefined();
    expect(back!.hasPR).toBe(false);
    expect(back!.volumeChangePercent).toBeNull();
  });

  it('returns empty array when no categories trained in last 2 weeks', async () => {
    mockExecuteSql.mockResolvedValueOnce(mockResultSet([]));
    mockExecuteSql.mockResolvedValueOnce(mockResultSet([]));
    mockExecuteSql.mockResolvedValueOnce(mockResultSet([]));
    mockExecuteSql.mockResolvedValueOnce(mockResultSet([]));

    const result = await getMuscleGroupProgress();
    expect(result).toEqual([]);
  });
});

// ── getExerciseInsights ──────────────────────────────────────────────

describe('getExerciseInsights', () => {
  it('returns weight and volume change for 1M period', async () => {
    // Q1: current period best weight + volume
    mockExecuteSql.mockResolvedValueOnce(
      mockResultSet([{ best_weight_kg: 100, volume: 2000 }]),
    );
    // Q2: previous period best weight + volume
    mockExecuteSql.mockResolvedValueOnce(
      mockResultSet([{ best_weight_kg: 80, volume: 1600 }]),
    );

    const result = await getExerciseInsights(1, '1M');
    expect(result.periodLabel).toBe('1 month');
    // weight: (100 - 80) / 80 * 100 = 25%
    expect(result.weightChangePercent).toBeCloseTo(25, 1);
    // volume: (2000 - 1600) / 1600 * 100 = 25%
    expect(result.volumeChangePercent).toBeCloseTo(25, 1);
  });

  it('returns correct period label for 3M', async () => {
    mockExecuteSql.mockResolvedValueOnce(mockResultSet([{ best_weight_kg: 50, volume: 1000 }]));
    mockExecuteSql.mockResolvedValueOnce(mockResultSet([{ best_weight_kg: 50, volume: 1000 }]));

    const result = await getExerciseInsights(1, '3M');
    expect(result.periodLabel).toBe('3 months');
    expect(result.weightChangePercent).toBeCloseTo(0, 1);
    expect(result.volumeChangePercent).toBeCloseTo(0, 1);
  });

  it('returns correct period label for 6M', async () => {
    mockExecuteSql.mockResolvedValueOnce(mockResultSet([{ best_weight_kg: null, volume: null }]));
    mockExecuteSql.mockResolvedValueOnce(mockResultSet([{ best_weight_kg: null, volume: null }]));

    const result = await getExerciseInsights(1, '6M');
    expect(result.periodLabel).toBe('6 months');
    expect(result.weightChangePercent).toBeNull();
    expect(result.volumeChangePercent).toBeNull();
  });

  it('returns correct period label for 1Y', async () => {
    mockExecuteSql.mockResolvedValueOnce(mockResultSet([{ best_weight_kg: 60, volume: 1200 }]));
    mockExecuteSql.mockResolvedValueOnce(mockResultSet([{ best_weight_kg: null, volume: null }]));

    const result = await getExerciseInsights(1, '1Y');
    expect(result.periodLabel).toBe('1 year');
    expect(result.weightChangePercent).toBeNull();
    expect(result.volumeChangePercent).toBeNull();
  });

  it('returns null changes when no current period data', async () => {
    mockExecuteSql.mockResolvedValueOnce(mockResultSet([{ best_weight_kg: null, volume: null }]));
    mockExecuteSql.mockResolvedValueOnce(mockResultSet([{ best_weight_kg: 80, volume: 1600 }]));

    const result = await getExerciseInsights(1, '1M');
    expect(result.weightChangePercent).toBeNull();
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
    expect(result!.currentSets[0].weightLbs).toBeCloseTo(100 * 2.20462, 2);
    expect(result!.comparisonSets).toHaveLength(1);
    expect(result!.comparisonSets[0].weightLbs).toBeCloseTo(90 * 2.20462, 2);
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
    expect(result[0].weightLbs).toBeCloseTo(80 * 2.20462, 2);
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
