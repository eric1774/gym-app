import { db, executeSql } from './database';
import { WaterLog, WaterSettings } from '../types';
import { getLocalDateString, getLocalDateTimeString } from '../utils/dates';

// ── Row mappers ──────────────────────────────────────────────────────

/** Map a raw SQLite result row to the WaterLog domain type. */
export function rowToWaterLog(row: {
  id: number;
  amount_oz: number;
  logged_at: string;
  local_date: string;
  created_at: string;
}): WaterLog {
  return {
    id: row.id,
    amountOz: row.amount_oz,
    loggedAt: row.logged_at,
    localDate: row.local_date,
    createdAt: row.created_at,
  };
}

/** Map a raw SQLite result row to the WaterSettings domain type. */
export function rowToWaterSettings(row: {
  id: number;
  goal_oz: number | null;
  created_at: string;
  updated_at: string;
}): WaterSettings {
  return {
    id: row.id,
    goalOz: row.goal_oz,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// ── Water Goal ───────────────────────────────────────────────────────

/**
 * Get the current water goal settings, or null if none are set.
 */
export async function getWaterGoal(): Promise<WaterSettings | null> {
  const database = await db;
  const result = await executeSql(database, 'SELECT * FROM water_settings LIMIT 1');

  if (result.rows.length === 0) {
    return null;
  }
  return rowToWaterSettings(result.rows.item(0));
}

/**
 * Set (create or update) the daily water goal in fluid ounces.
 * Uses upsert pattern: inserts if no row exists, updates otherwise.
 */
export async function setWaterGoal(goalOz: number): Promise<WaterSettings> {
  const database = await db;
  const now = getLocalDateTimeString(new Date());

  const countResult = await executeSql(database, 'SELECT COUNT(*) as cnt FROM water_settings');
  const count = countResult.rows.item(0).cnt as number;

  if (count === 0) {
    await executeSql(
      database,
      'INSERT INTO water_settings (goal_oz, created_at, updated_at) VALUES (?, ?, ?)',
      [goalOz, now, now],
    );
  } else {
    await executeSql(
      database,
      'UPDATE water_settings SET goal_oz = ?, updated_at = ?',
      [goalOz, now],
    );
  }

  const row = await executeSql(database, 'SELECT * FROM water_settings LIMIT 1');
  return rowToWaterSettings(row.rows.item(0));
}

// ── Water Logging ────────────────────────────────────────────────────

/**
 * Log a water intake entry in fluid ounces.
 * No goal required — water can be logged without a goal set.
 *
 * @param amountOz - Amount of water in fluid ounces (whole number per D-05)
 * @param loggedAt - When the water was consumed; defaults to now
 * @returns The inserted WaterLog record
 */
export async function logWater(amountOz: number, loggedAt?: Date): Promise<WaterLog> {
  const database = await db;
  const effectiveDate = loggedAt ?? new Date();
  const localDate = getLocalDateString(effectiveDate);
  const loggedAtStr = getLocalDateTimeString(effectiveDate);
  const createdAt = getLocalDateTimeString(new Date());

  const result = await executeSql(
    database,
    'INSERT INTO water_logs (amount_oz, logged_at, local_date, created_at) VALUES (?, ?, ?, ?)',
    [amountOz, loggedAtStr, localDate, createdAt],
  );

  const row = await executeSql(database, 'SELECT * FROM water_logs WHERE id = ?', [result.insertId]);
  return rowToWaterLog(row.rows.item(0));
}

// ── Water Totals ─────────────────────────────────────────────────────

/**
 * Get total water intake in fluid ounces for today (local date).
 *
 * @returns Total fluid ounces logged today, or 0 if nothing logged
 */
export async function getTodayWaterTotal(): Promise<number> {
  const database = await db;
  const today = getLocalDateString();

  const result = await executeSql(
    database,
    'SELECT COALESCE(SUM(amount_oz), 0) as total FROM water_logs WHERE local_date = ?',
    [today],
  );

  return result.rows.item(0).total as number;
}

// ── Streak and Averages ──────────────────────────────────────────────

/**
 * Get the number of consecutive days (counting backwards from today) where the
 * user met or exceeded their water goal.
 *
 * - If no water_settings row exists or goal_oz is null, returns 0.
 * - Today counts if today's water total already meets the goal.
 * - If today has logs but hasn't hit the goal, streak starts from yesterday.
 * - If today has no logs, streak starts from yesterday.
 * - Gap detection: a missing day means zero water that day, which breaks the streak.
 *
 * @returns Number of consecutive water-goal-met days (0 if no streak)
 */
export async function getStreakDays(): Promise<number> {
  const database = await db;

  const goalResult = await executeSql(database, 'SELECT goal_oz FROM water_settings LIMIT 1');

  if (goalResult.rows.length === 0) {
    return 0;
  }

  const goal = goalResult.rows.item(0).goal_oz as number | null;
  if (goal === null || goal === undefined) {
    return 0;
  }

  const today = getLocalDateString();

  const result = await executeSql(
    database,
    'SELECT local_date, SUM(amount_oz) as total FROM water_logs WHERE local_date <= ? GROUP BY local_date ORDER BY local_date DESC',
    [today],
  );

  if (result.rows.length === 0) {
    return 0;
  }

  let streak = 0;

  // Determine the starting expected date.
  // If the first row is today and it meets the goal, start from today.
  // Otherwise start from yesterday.
  const firstRow = result.rows.item(0);
  let startIndex = 0;
  let expectedDate: Date;

  if (firstRow.local_date === today) {
    if ((firstRow.total as number) >= goal) {
      // Today meets goal — count it and expect yesterday next
      streak = 1;
      startIndex = 1;
      const d = new Date();
      d.setDate(d.getDate() - 1);
      expectedDate = d;
    } else {
      // Today has logs but hasn't hit goal — skip today, start from yesterday
      startIndex = 1;
      const d = new Date();
      d.setDate(d.getDate() - 1);
      expectedDate = d;
    }
  } else {
    // Today has no logs — start from yesterday
    const d = new Date();
    d.setDate(d.getDate() - 1);
    expectedDate = d;
  }

  for (let i = startIndex; i < result.rows.length; i++) {
    const row = result.rows.item(i);
    const rowDate = row.local_date as string;
    const expectedDateStr = getLocalDateString(expectedDate);

    if (rowDate !== expectedDateStr) {
      // Gap detected — streak is broken
      break;
    }

    if ((row.total as number) >= goal) {
      streak++;
      expectedDate.setDate(expectedDate.getDate() - 1);
    } else {
      // Day didn't meet goal — streak broken
      break;
    }
  }

  return streak;
}

/**
 * Get the average daily water intake over the last 7 days.
 * Divides total by 7 always (not just active days).
 *
 * @returns Rounded average in fluid ounces, or null if no data in last 7 days
 */
export async function get7DayAverage(): Promise<number | null> {
  const database = await db;
  const today = getLocalDateString();

  // 7 days inclusive of today: today minus 6 days
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 6);
  const startDateStr = getLocalDateString(startDate);

  const result = await executeSql(
    database,
    'SELECT SUM(amount_oz) as total FROM water_logs WHERE local_date >= ? AND local_date <= ?',
    [startDateStr, today],
  );

  if (result.rows.length === 0) {
    return null;
  }

  const total = result.rows.item(0).total;
  if (total === null || total === undefined) {
    return null;
  }

  return Math.round((total as number) / 7);
}
