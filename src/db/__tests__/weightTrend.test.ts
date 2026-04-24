jest.mock('../database');

import { db, executeSql } from '../database';
import { mockResultSet } from '@test-utils';
import { getWeightTrend } from '../weightTrend';

const mockExecuteSql = executeSql as jest.MockedFunction<typeof executeSql>;

const mockDb = {};
const dbModule = require('../database');
Object.defineProperty(dbModule, 'db', {
  value: Promise.resolve(mockDb),
  writable: true,
});

beforeEach(() => {
  jest.clearAllMocks();
});

// ── Helpers ──────────────────────────────────────────────────────────

/** Returns 'YYYY-MM-DD' for a date n days before today. */
function dateNDaysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// ── Tests ─────────────────────────────────────────────────────────────

describe('getWeightTrend', () => {
  it('returns null MAs when fewer than 14 days of weigh-ins exist', async () => {
    // Only 5 readings — not enough for either 7-day window (each needs 6+)
    const rows = Array.from({ length: 5 }, (_, i) => ({
      date: dateNDaysAgo(i),
      weight: 180,
    }));
    mockExecuteSql.mockResolvedValueOnce(
      mockResultSet(rows.map(r => ({ date: r.date, weight: r.weight }))),
    );

    const result = await getWeightTrend();

    expect(result.currentSevenDayMA).toBeNull();
    expect(result.previousSevenDayMA).toBeNull();
  });

  it('computes 7-day MAs correctly with steady weight (180 lb every day for 14 days)', async () => {
    // 14 consecutive days ending today, all 180 lb
    const rows = Array.from({ length: 14 }, (_, i) => ({
      date: dateNDaysAgo(13 - i), // oldest first
      weight: 180,
    }));
    mockExecuteSql.mockResolvedValueOnce(
      mockResultSet(rows.map(r => ({ date: r.date, weight: r.weight }))),
    );

    const result = await getWeightTrend();

    // Both windows should average to 180
    expect(result.currentSevenDayMA).toBeCloseTo(180, 2);
    expect(result.previousSevenDayMA).toBeCloseTo(180, 2);
  });

  it('delta reflects smoothed change: 185 prior 7 days → 180 current 7 days', async () => {
    // Days 13–7 ago: 185 lb (previous window)
    // Days 6–0 ago: 180 lb (current window)
    const rows = [
      ...Array.from({ length: 7 }, (_, i) => ({
        date: dateNDaysAgo(13 - i), // days 13..7 ago, oldest first
        weight: 185,
      })),
      ...Array.from({ length: 7 }, (_, i) => ({
        date: dateNDaysAgo(6 - i), // days 6..0 ago, oldest first
        weight: 180,
      })),
    ];
    mockExecuteSql.mockResolvedValueOnce(
      mockResultSet(rows.map(r => ({ date: r.date, weight: r.weight }))),
    );

    const result = await getWeightTrend();

    expect(result.currentSevenDayMA).toBeCloseTo(180, 2);
    expect(result.previousSevenDayMA).toBeCloseTo(185, 2);
  });

  it("returns today's logged weight when present, null when today is absent", async () => {
    const today = dateNDaysAgo(0);

    // ── Case 1: today IS present ──
    const rowsWithToday = Array.from({ length: 14 }, (_, i) => ({
      date: dateNDaysAgo(13 - i),
      weight: 177.4,
    }));
    mockExecuteSql.mockResolvedValueOnce(
      mockResultSet(rowsWithToday.map(r => ({ date: r.date, weight: r.weight }))),
    );
    const withToday = await getWeightTrend();
    expect(withToday.today).toBeCloseTo(177.4, 2);

    // ── Case 2: today is NOT present ──
    const rowsWithoutToday = Array.from({ length: 7 }, (_, i) => ({
      date: dateNDaysAgo(7 - i), // days 7..1 ago — skips today
      weight: 180,
    }));
    mockExecuteSql.mockResolvedValueOnce(
      mockResultSet(rowsWithoutToday.map(r => ({ date: r.date, weight: r.weight }))),
    );
    const withoutToday = await getWeightTrend();
    expect(withoutToday.today).toBeNull();
  });

  it('returns empty series and null values when no weigh-ins exist', async () => {
    mockExecuteSql.mockResolvedValueOnce(mockResultSet([]));

    const result = await getWeightTrend();

    expect(result.today).toBeNull();
    expect(result.currentSevenDayMA).toBeNull();
    expect(result.previousSevenDayMA).toBeNull();
    expect(result.dailySeries).toEqual([]);
  });
});
