import { db, executeSql } from './database';
import { BADGE_DEFINITIONS } from '../data/badgeDefinitions';
import type { UserBadgeRow, StreakShieldRow, UserLevelRow, BadgeTier, ShieldState } from '../types';

// ── Seed Badges ──

export async function seedBadges(): Promise<void> {
  const database = await db;
  return new Promise((resolve, reject) => {
    database.transaction(
      (tx) => {
        for (const badge of BADGE_DEFINITIONS) {
          tx.executeSql(
            `INSERT OR REPLACE INTO badges (id, name, description, category, icon_name, tier_thresholds, evaluation_type, sort_order)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              badge.id,
              badge.name,
              badge.description,
              badge.category,
              badge.iconName,
              badge.tierThresholds ? JSON.stringify(badge.tierThresholds) : null,
              badge.evaluationType,
              BADGE_DEFINITIONS.indexOf(badge),
            ],
          );
        }
      },
      reject,
      () => resolve(),
    );
  });
}

// ── Query Earned Badges ──

export async function getEarnedBadges(): Promise<UserBadgeRow[]> {
  const database = await db;
  const result = await executeSql(
    database,
    `SELECT * FROM user_badges ORDER BY earned_at DESC`,
  );
  const rows: UserBadgeRow[] = [];
  for (let i = 0; i < result.rows.length; i++) {
    rows.push(result.rows.item(i));
  }
  return rows;
}

// ── Badge Progress ──

export async function getBadgeProgress(badgeId: string): Promise<UserBadgeRow | null> {
  const database = await db;
  const result = await executeSql(
    database,
    `SELECT * FROM user_badges WHERE badge_id = ? ORDER BY tier DESC LIMIT 1`,
    [badgeId],
  );
  return result.rows.length > 0 ? result.rows.item(0) : null;
}

export async function upsertBadgeProgress(badgeId: string, currentValue: number): Promise<void> {
  const database = await db;
  const existing = await getBadgeProgress(badgeId);
  if (existing) {
    await executeSql(
      database,
      `UPDATE user_badges SET current_value = ? WHERE id = ?`,
      [currentValue, existing.id],
    );
  }
}

export async function earnBadgeTier(
  badgeId: string,
  tier: BadgeTier,
  currentValue: number,
): Promise<void> {
  const database = await db;
  const existing = await getBadgeProgress(badgeId);
  if (existing && existing.tier >= tier) return; // Already earned this or higher tier

  if (existing) {
    await executeSql(
      database,
      `UPDATE user_badges SET tier = ?, current_value = ?, earned_at = datetime('now'), notified = 0 WHERE id = ?`,
      [tier, currentValue, existing.id],
    );
  } else {
    await executeSql(
      database,
      `INSERT INTO user_badges (badge_id, tier, current_value, earned_at, notified)
       VALUES (?, ?, ?, datetime('now'), 0)`,
      [badgeId, tier, currentValue],
    );
  }
}

// ── Notification ──

export async function getUnnotifiedBadges(): Promise<UserBadgeRow[]> {
  const database = await db;
  const result = await executeSql(
    database,
    `SELECT * FROM user_badges WHERE notified = 0 ORDER BY earned_at ASC`,
  );
  const rows: UserBadgeRow[] = [];
  for (let i = 0; i < result.rows.length; i++) {
    rows.push(result.rows.item(i));
  }
  return rows;
}

export async function markBadgeNotified(userBadgeId: number): Promise<void> {
  const database = await db;
  await executeSql(
    database,
    `UPDATE user_badges SET notified = 1 WHERE id = ?`,
    [userBadgeId],
  );
}

// ── Streak Shields ──

export async function getAvailableShields(): Promise<ShieldState> {
  const database = await db;
  const result = await executeSql(
    database,
    `SELECT shield_type, COUNT(*) as count FROM streak_shields
     WHERE used_at IS NULL GROUP BY shield_type`,
  );
  const state: ShieldState = { workout: 0, protein: 0, water: 0 };
  for (let i = 0; i < result.rows.length; i++) {
    const row = result.rows.item(i);
    if (row.shield_type in state) {
      (state as unknown as Record<string, number>)[row.shield_type] = row.count;
    }
  }
  return state;
}

export async function earnShield(shieldType: string): Promise<boolean> {
  const database = await db;
  const shields = await getAvailableShields();
  const current = (shields as unknown as Record<string, number>)[shieldType] ?? 0;
  if (current >= 3) return false; // Max 3 per type

  await executeSql(
    database,
    `INSERT INTO streak_shields (shield_type, earned_at) VALUES (?, datetime('now'))`,
    [shieldType],
  );
  return true;
}

export async function consumeShield(shieldType: string, forDate: string): Promise<boolean> {
  const database = await db;
  const result = await executeSql(
    database,
    `SELECT id FROM streak_shields WHERE shield_type = ? AND used_at IS NULL ORDER BY earned_at ASC LIMIT 1`,
    [shieldType],
  );
  if (result.rows.length === 0) return false;

  const shieldId = result.rows.item(0).id;
  await executeSql(
    database,
    `UPDATE streak_shields SET used_at = datetime('now'), used_for_date = ? WHERE id = ?`,
    [forDate, shieldId],
  );
  return true;
}

// ── User Level ──

export async function getUserLevel(): Promise<UserLevelRow> {
  const database = await db;
  const result = await executeSql(database, `SELECT * FROM user_level WHERE id = 1`);
  if (result.rows.length === 0) {
    return {
      id: 1,
      current_level: 1,
      title: 'Beginner',
      consistency_score: 0,
      volume_score: 0,
      nutrition_score: 0,
      variety_score: 0,
      last_calculated: new Date().toISOString(),
    };
  }
  return result.rows.item(0);
}

export async function updateUserLevel(
  level: number,
  title: string,
  scores: { consistency: number; volume: number; nutrition: number; variety: number },
): Promise<void> {
  const database = await db;
  await executeSql(
    database,
    `UPDATE user_level SET current_level = ?, title = ?,
     consistency_score = ?, volume_score = ?, nutrition_score = ?, variety_score = ?,
     last_calculated = datetime('now') WHERE id = 1`,
    [level, title, scores.consistency, scores.volume, scores.nutrition, scores.variety],
  );
}
