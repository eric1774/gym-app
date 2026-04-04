jest.mock('react-native-sqlite-storage');
jest.mock('../database');
jest.mock('../../utils/dates');

// Fix the real current date to 2026-04-04 so streak date arithmetic is deterministic
jest.useFakeTimers();
jest.setSystemTime(new Date('2026-04-04T10:00:00'));

import { db, executeSql } from '../database';
import { getLocalDateString, getLocalDateTimeString } from '../../utils/dates';
import { mockResultSet } from '../../test-utils/dbMock';
import {
  getWaterGoal,
  setWaterGoal,
  logWater,
  getTodayWaterTotal,
  getStreakDays,
  get7DayAverage,
} from '../hydration';

const mockExecuteSql = executeSql as jest.MockedFunction<typeof executeSql>;
const mockGetLocalDateString = getLocalDateString as jest.MockedFunction<typeof getLocalDateString>;
const mockGetLocalDateTimeString = getLocalDateTimeString as jest.MockedFunction<typeof getLocalDateTimeString>;

const mockDb = {};
const dbModule = require('../database');
Object.defineProperty(dbModule, 'db', {
  value: Promise.resolve(mockDb),
  writable: true,
});

// Helper: format a Date as YYYY-MM-DD
function formatDate(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Mock implementation: if Date arg provided, format it; otherwise return today string
function dateStringImpl(d?: Date): string {
  if (!d) return '2026-04-04';
  return formatDate(d);
}

beforeEach(() => {
  jest.clearAllMocks();
  mockGetLocalDateString.mockImplementation(dateStringImpl as any);
  mockGetLocalDateTimeString.mockReturnValue('2026-04-04T10:00:00');
});

// ── Shared row fixtures ──────────────────────────────────────────────

const waterLogRow = {
  id: 1,
  amount_oz: 16,
  logged_at: '2026-04-04T08:00:00',
  local_date: '2026-04-04',
  created_at: '2026-04-04T08:00:00',
};

const waterSettingsRow = {
  id: 1,
  goal_oz: 64,
  created_at: '2026-01-01T00:00:00',
  updated_at: '2026-04-04T10:00:00',
};

// ── getWaterGoal ─────────────────────────────────────────────────────

describe('getWaterGoal', () => {
  it('returns WaterSettings when a row exists', async () => {
    mockExecuteSql.mockResolvedValueOnce(mockResultSet([waterSettingsRow]));

    const result = await getWaterGoal();

    expect(result).not.toBeNull();
    expect(result!.id).toBe(1);
    expect(result!.goalOz).toBe(64);
    expect(mockExecuteSql).toHaveBeenCalledWith(
      mockDb,
      expect.stringContaining('SELECT * FROM water_settings LIMIT 1'),
    );
  });

  it('returns null when no row exists', async () => {
    mockExecuteSql.mockResolvedValueOnce(mockResultSet([]));

    const result = await getWaterGoal();

    expect(result).toBeNull();
  });

  it('returns WaterSettings with null goalOz when goal_oz is null', async () => {
    mockExecuteSql.mockResolvedValueOnce(
      mockResultSet([{ ...waterSettingsRow, goal_oz: null }]),
    );

    const result = await getWaterGoal();

    expect(result).not.toBeNull();
    expect(result!.goalOz).toBeNull();
  });
});

// ── setWaterGoal ─────────────────────────────────────────────────────

describe('setWaterGoal', () => {
  it('inserts a new row when none exists and returns WaterSettings', async () => {
    // COUNT → 0
    mockExecuteSql.mockResolvedValueOnce(mockResultSet([{ cnt: 0 }]));
    // INSERT
    mockExecuteSql.mockResolvedValueOnce(mockResultSet([], 1));
    // SELECT
    mockExecuteSql.mockResolvedValueOnce(mockResultSet([waterSettingsRow]));

    const result = await setWaterGoal(64);

    expect(result.goalOz).toBe(64);
    expect(mockExecuteSql).toHaveBeenNthCalledWith(
      2,
      mockDb,
      expect.stringContaining('INSERT INTO water_settings'),
      expect.arrayContaining([64]),
    );
  });

  it('updates existing row and returns WaterSettings', async () => {
    // COUNT → 1
    mockExecuteSql.mockResolvedValueOnce(mockResultSet([{ cnt: 1 }]));
    // UPDATE
    mockExecuteSql.mockResolvedValueOnce(mockResultSet([], 0));
    // SELECT
    mockExecuteSql.mockResolvedValueOnce(
      mockResultSet([{ ...waterSettingsRow, goal_oz: 80 }]),
    );

    const result = await setWaterGoal(80);

    expect(result.goalOz).toBe(80);
    expect(mockExecuteSql).toHaveBeenNthCalledWith(
      2,
      mockDb,
      expect.stringContaining('UPDATE water_settings'),
      expect.arrayContaining([80]),
    );
  });
});

// ── logWater ─────────────────────────────────────────────────────────

describe('logWater', () => {
  it('inserts a water log entry and returns WaterLog', async () => {
    // INSERT → insertId=1
    mockExecuteSql.mockResolvedValueOnce(mockResultSet([], 1));
    // SELECT
    mockExecuteSql.mockResolvedValueOnce(mockResultSet([waterLogRow]));

    const result = await logWater(16);

    expect(result.id).toBe(1);
    expect(result.amountOz).toBe(16);
    expect(result.localDate).toBe('2026-04-04');
    expect(mockExecuteSql).toHaveBeenNthCalledWith(
      1,
      mockDb,
      expect.stringContaining('INSERT INTO water_logs'),
      expect.arrayContaining([16]),
    );
  });

  it('uses provided loggedAt date for localDate', async () => {
    const loggedAt = new Date('2026-04-03');
    // INSERT → insertId=2
    mockExecuteSql.mockResolvedValueOnce(mockResultSet([], 2));
    // SELECT
    mockExecuteSql.mockResolvedValueOnce(
      mockResultSet([{ ...waterLogRow, id: 2, local_date: '2026-04-03' }]),
    );

    const result = await logWater(8, loggedAt);

    expect(result.localDate).toBe('2026-04-03');
    expect(mockGetLocalDateString).toHaveBeenCalledWith(loggedAt);
    expect(mockGetLocalDateTimeString).toHaveBeenCalledWith(loggedAt);
  });

  it('does not require a water goal to be set', async () => {
    // logWater should NOT call getWaterGoal (no prerequisite check)
    mockExecuteSql.mockResolvedValueOnce(mockResultSet([], 1));
    mockExecuteSql.mockResolvedValueOnce(mockResultSet([waterLogRow]));

    // Should succeed without throwing even if no water goal exists
    await expect(logWater(16)).resolves.not.toThrow();
    // Only 2 SQL calls: INSERT + SELECT (no goal check)
    expect(mockExecuteSql).toHaveBeenCalledTimes(2);
  });
});

// ── getTodayWaterTotal ────────────────────────────────────────────────

describe('getTodayWaterTotal', () => {
  it('returns COALESCE SUM for today when logs exist', async () => {
    mockExecuteSql.mockResolvedValueOnce(mockResultSet([{ total: 48 }]));

    const result = await getTodayWaterTotal();

    expect(result).toBe(48);
    expect(mockExecuteSql).toHaveBeenCalledWith(
      mockDb,
      expect.stringContaining('COALESCE(SUM(amount_oz), 0)'),
      ['2026-04-04'],
    );
  });

  it('returns 0 when no logs for today (COALESCE returns 0)', async () => {
    mockExecuteSql.mockResolvedValueOnce(mockResultSet([{ total: 0 }]));

    const result = await getTodayWaterTotal();

    expect(result).toBe(0);
  });
});

// ── getStreakDays ─────────────────────────────────────────────────────

describe('getStreakDays', () => {
  it('returns 0 when no water_settings row exists', async () => {
    mockExecuteSql.mockResolvedValueOnce(mockResultSet([]));

    const result = await getStreakDays();

    expect(result).toBe(0);
  });

  it('returns 0 when goal_oz is null', async () => {
    mockExecuteSql.mockResolvedValueOnce(
      mockResultSet([{ goal_oz: null }]),
    );

    const result = await getStreakDays();

    expect(result).toBe(0);
  });

  it('returns 0 when no water logs exist', async () => {
    // goal_oz = 64
    mockExecuteSql.mockResolvedValueOnce(mockResultSet([{ goal_oz: 64 }]));
    // No logs
    mockExecuteSql.mockResolvedValueOnce(mockResultSet([]));

    const result = await getStreakDays();

    expect(result).toBe(0);
  });

  it('returns 2 when today and yesterday meet goal but day before is missing', async () => {
    // goal_oz = 64
    mockExecuteSql.mockResolvedValueOnce(mockResultSet([{ goal_oz: 64 }]));
    mockExecuteSql.mockResolvedValueOnce(
      mockResultSet([
        { local_date: '2026-04-04', total: 80 }, // today, meets goal
        { local_date: '2026-04-03', total: 72 }, // yesterday, meets goal
        // 2026-04-02 missing → gap → streak stops
      ]),
    );

    const result = await getStreakDays();

    expect(result).toBe(2);
  });

  it('returns 2 when today is under goal but yesterday and day before meet goal', async () => {
    mockExecuteSql.mockResolvedValueOnce(mockResultSet([{ goal_oz: 64 }]));
    mockExecuteSql.mockResolvedValueOnce(
      mockResultSet([
        { local_date: '2026-04-04', total: 32 }, // today, under goal
        { local_date: '2026-04-03', total: 80 }, // yesterday, meets goal
        { local_date: '2026-04-02', total: 64 }, // day before, exactly goal
      ]),
    );

    const result = await getStreakDays();

    expect(result).toBe(2); // yesterday + day before (today skipped because under goal)
  });

  it('returns 2 when today has no logs but yesterday and day before meet goal', async () => {
    mockExecuteSql.mockResolvedValueOnce(mockResultSet([{ goal_oz: 64 }]));
    // First row is NOT today (today has no logs)
    mockExecuteSql.mockResolvedValueOnce(
      mockResultSet([
        { local_date: '2026-04-03', total: 80 }, // yesterday (today has no rows)
        { local_date: '2026-04-02', total: 64 }, // day before
      ]),
    );

    const result = await getStreakDays();

    expect(result).toBe(2);
  });

  it('returns 5 for a consecutive 5-day streak with all days meeting goal', async () => {
    mockExecuteSql.mockResolvedValueOnce(mockResultSet([{ goal_oz: 64 }]));
    mockExecuteSql.mockResolvedValueOnce(
      mockResultSet([
        { local_date: '2026-04-04', total: 80 }, // today
        { local_date: '2026-04-03', total: 72 },
        { local_date: '2026-04-02', total: 68 },
        { local_date: '2026-04-01', total: 64 }, // exactly goal
        { local_date: '2026-03-31', total: 96 },
      ]),
    );

    const result = await getStreakDays();

    expect(result).toBe(5);
  });

  it('returns 1 when only today meets goal', async () => {
    mockExecuteSql.mockResolvedValueOnce(mockResultSet([{ goal_oz: 64 }]));
    mockExecuteSql.mockResolvedValueOnce(
      mockResultSet([
        { local_date: '2026-04-04', total: 80 }, // today, meets goal
        // no further rows
      ]),
    );

    const result = await getStreakDays();

    expect(result).toBe(1);
  });
});

// ── get7DayAverage ────────────────────────────────────────────────────

describe('get7DayAverage', () => {
  it('returns total divided by 7 (always divides by 7, not active days)', async () => {
    // 7 days, total = 448 oz, average = 448/7 = 64
    mockExecuteSql.mockResolvedValueOnce(mockResultSet([{ total: 448 }]));

    const result = await get7DayAverage();

    expect(result).toBe(64);
  });

  it('returns null when total is null (no logs in last 7 days)', async () => {
    mockExecuteSql.mockResolvedValueOnce(mockResultSet([{ total: null }]));

    const result = await get7DayAverage();

    expect(result).toBeNull();
  });

  it('returns null when total is undefined', async () => {
    mockExecuteSql.mockResolvedValueOnce(mockResultSet([{ total: undefined }]));

    const result = await get7DayAverage();

    expect(result).toBeNull();
  });

  it('returns Math.round of result when not a whole number', async () => {
    // total = 100, 100/7 ≈ 14.28..., rounds to 14
    mockExecuteSql.mockResolvedValueOnce(mockResultSet([{ total: 100 }]));

    const result = await get7DayAverage();

    expect(result).toBe(14); // Math.round(100/7) = Math.round(14.28) = 14
  });

  it('returns null when result rows are empty', async () => {
    mockExecuteSql.mockResolvedValueOnce(mockResultSet([]));

    const result = await get7DayAverage();

    expect(result).toBeNull();
  });

  it('queries correct date range (today minus 6 days)', async () => {
    mockExecuteSql.mockResolvedValueOnce(mockResultSet([{ total: 448 }]));

    await get7DayAverage();

    expect(mockExecuteSql).toHaveBeenCalledWith(
      mockDb,
      expect.stringContaining('SUM(amount_oz)'),
      ['2026-03-29', '2026-04-04'],
    );
  });
});
