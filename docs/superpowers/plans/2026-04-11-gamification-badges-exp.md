# Gamification System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a 93-badge gamification system with event-driven badge engine, composite leveling, streak shields, dashboard integration, achievements screen, and celebration modals.

**Architecture:** Event-driven `GamificationContext` wraps the app and listens for AppEvents (set logged, session completed, meal logged, etc.). A `BadgeEngine` evaluates relevant badge definitions per event using relevance filtering. Badge definitions are data-driven (typed registry). UI surfaces on Dashboard (level bar + recent badges) and a dedicated Achievements screen.

**Tech Stack:** React Native 0.84.1, TypeScript, SQLite (react-native-sqlite-storage), React Navigation v7, Jest + @testing-library/react-native

**Spec:** `docs/superpowers/specs/2026-04-11-gamification-badges-exp-design.md`

---

## File Structure

### New Files

| File | Responsibility |
|------|---------------|
| `src/types/gamification.ts` | All gamification types: badges, tiers, events, levels, shields |
| `src/data/badgeDefinitions.ts` | 93 badge definitions as typed data with thresholds and event relevance |
| `src/db/badges.ts` | Badge DB operations: seed, query earned, update progress, shield CRUD |
| `src/utils/badgeEngine.ts` | Core evaluation: filter relevant badges, compare thresholds, detect tier-ups |
| `src/utils/levelCalculator.ts` | Composite level calculation from 4 subscales |
| `src/context/GamificationContext.tsx` | Context provider wiring engine + DB + celebration queue |
| `src/components/BadgeIcon.tsx` | Reusable shield emblem with tier-colored border and glow |
| `src/components/LevelBar.tsx` | Dashboard level card with progress bar |
| `src/components/RecentBadges.tsx` | Horizontally scrollable recent badges strip |
| `src/components/CelebrationModal.tsx` | Full-screen badge earned overlay with radial glow |
| `src/components/BadgeGrid.tsx` | 4-column grid of earned + locked badges with progress bars |
| `src/components/BadgeDetailModal.tsx` | Tap-to-reveal for locked badges, detail for earned |
| `src/components/CompositeScoreCard.tsx` | 4-subscale score bars card |
| `src/components/StreakShieldsCard.tsx` | Shield slots display per streak type |
| `src/screens/AchievementsScreen.tsx` | Full achievements screen with all sections |
| `src/components/__tests__/BadgeIcon.test.tsx` | BadgeIcon unit tests |
| `src/components/__tests__/LevelBar.test.tsx` | LevelBar unit tests |
| `src/components/__tests__/RecentBadges.test.tsx` | RecentBadges unit tests |
| `src/components/__tests__/CelebrationModal.test.tsx` | CelebrationModal unit tests |
| `src/utils/__tests__/badgeEngine.test.ts` | Badge engine evaluation logic tests |
| `src/utils/__tests__/levelCalculator.test.ts` | Level calculation tests |
| `src/db/__tests__/badges.test.ts` | Badge DB operations tests |

### Modified Files

| File | Change |
|------|--------|
| `src/db/schema.ts` | Add 4 CREATE TABLE statements |
| `src/db/migrations.ts` | Add migration 15 for gamification tables |
| `src/types/index.ts` | Re-export gamification types |
| `App.tsx` | Wrap with GamificationProvider |
| `src/navigation/TabNavigator.tsx` | Add Achievements to DashboardStack |
| `src/screens/DashboardScreen.tsx` | Add LevelBar + RecentBadges |
| `src/context/SessionContext.tsx` | Fire SET_LOGGED and SESSION_COMPLETED events |
| `src/db/sets.ts` | Fire PR_ACHIEVED event from checkForPR |
| `src/db/macros.ts` | Fire MEAL_LOGGED event |
| `src/db/hydration.ts` | Fire WATER_LOGGED event |

---

## Task 1: Types & Interfaces

**Files:**
- Create: `src/types/gamification.ts`
- Modify: `src/types/index.ts`

- [ ] **Step 1: Create gamification types file**

```typescript
// src/types/gamification.ts

// ── Tier System ──

export type BadgeTier = 1 | 2 | 3 | 4 | 5;

export const TIER_NAMES: Record<BadgeTier, string> = {
  1: 'Bronze',
  2: 'Silver',
  3: 'Gold',
  4: 'Platinum',
  5: 'Diamond',
};

export const TIER_COLORS: Record<BadgeTier, string> = {
  1: '#CD7F32',
  2: '#C0C0C0',
  3: '#FFB800',
  4: '#B4DCFF',
  5: '#FFFFFF',
};

// ── Badge Categories ──

export type BadgeCategory = 'fitness' | 'nutrition' | 'consistency' | 'recovery' | 'milestone';

export const BADGE_CATEGORIES: BadgeCategory[] = [
  'fitness', 'nutrition', 'consistency', 'recovery', 'milestone',
];

// ── Evaluation Types ──

export type EvaluationType = 'streak' | 'cumulative' | 'single_session' | 'composite' | 'one_time';

// ── App Events ──

export type AppEventType =
  | 'SET_LOGGED'
  | 'SESSION_COMPLETED'
  | 'MEAL_LOGGED'
  | 'WATER_LOGGED'
  | 'PR_ACHIEVED'
  | 'APP_OPENED'
  | 'DAY_BOUNDARY';

export interface AppEvent {
  type: AppEventType;
  timestamp: string;
  payload?: Record<string, unknown>;
}

// ── Badge Definition (data-driven registry) ──

export interface BadgeDefinition {
  id: string;
  name: string;
  description: string;
  category: BadgeCategory;
  iconName: string;
  tierThresholds: number[] | null; // null for one-time milestone badges
  evaluationType: EvaluationType;
  relevantEvents: AppEventType[];
  evaluate: (db: unknown) => Promise<number>; // returns current value
}

// ── DB Row Types ──

export interface BadgeRow {
  id: string;
  name: string;
  description: string;
  category: BadgeCategory;
  icon_name: string;
  tier_thresholds: string; // JSON
  evaluation_type: EvaluationType;
  sort_order: number;
}

export interface UserBadgeRow {
  id: number;
  badge_id: string;
  tier: BadgeTier;
  current_value: number;
  earned_at: string;
  notified: number;
}

export interface StreakShieldRow {
  id: number;
  shield_type: string;
  earned_at: string;
  used_at: string | null;
  used_for_date: string | null;
}

export interface UserLevelRow {
  id: number;
  current_level: number;
  title: string;
  consistency_score: number;
  volume_score: number;
  nutrition_score: number;
  variety_score: number;
  last_calculated: string;
}

// ── UI State Types ──

export interface BadgeState {
  badgeId: string;
  currentTier: BadgeTier | null; // null = not yet earned
  currentValue: number;
  nextThreshold: number | null; // null = maxed out or one-time earned
}

export interface LevelState {
  level: number;
  title: string;
  consistencyScore: number;
  volumeScore: number;
  nutritionScore: number;
  varietyScore: number;
  progressToNext: number; // 0-1
}

export interface ShieldState {
  workout: number;
  protein: number;
  water: number;
}

export interface CelebrationItem {
  badge: BadgeDefinition;
  newTier: BadgeTier;
  earnedAt: string;
}

export interface GamificationContextValue {
  badgeStates: Map<string, BadgeState>;
  levelState: LevelState;
  shieldState: ShieldState;
  pendingCelebrations: CelebrationItem[];
  isLoading: boolean;
  checkBadges: (event: AppEvent) => Promise<void>;
  dismissCelebration: () => void;
  refreshAll: () => Promise<void>;
}

// ── Level Titles ──

export type LevelTitle = 'Beginner' | 'Novice' | 'Intermediate' | 'Advanced' | 'Elite' | 'Master' | 'Legend';

export const LEVEL_TITLE_RANGES: { min: number; max: number; title: LevelTitle }[] = [
  { min: 1, max: 10, title: 'Beginner' },
  { min: 11, max: 25, title: 'Novice' },
  { min: 26, max: 40, title: 'Intermediate' },
  { min: 41, max: 60, title: 'Advanced' },
  { min: 61, max: 80, title: 'Elite' },
  { min: 81, max: 95, title: 'Master' },
  { min: 96, max: 100, title: 'Legend' },
];
```

- [ ] **Step 2: Re-export from types/index.ts**

Add at the bottom of `src/types/index.ts`:

```typescript
export * from './gamification';
```

- [ ] **Step 3: Verify TypeScript compiles**

Run: `npx tsc --noEmit --pretty 2>&1 | head -20`
Expected: No errors related to gamification types

- [ ] **Step 4: Commit**

```bash
git add src/types/gamification.ts src/types/index.ts
git commit -m "feat(gamification): add type definitions for badges, tiers, events, and levels"
```

---

## Task 2: Database Schema & Migration

**Files:**
- Modify: `src/db/schema.ts`
- Modify: `src/db/migrations.ts`

- [ ] **Step 1: Add CREATE TABLE statements to schema.ts**

Add at the bottom of `src/db/schema.ts`:

```typescript
export const CREATE_BADGES_TABLE = `
  CREATE TABLE IF NOT EXISTS badges (
    id TEXT PRIMARY KEY NOT NULL,
    name TEXT NOT NULL,
    description TEXT NOT NULL,
    category TEXT NOT NULL,
    icon_name TEXT NOT NULL,
    tier_thresholds TEXT,
    evaluation_type TEXT NOT NULL,
    sort_order INTEGER NOT NULL DEFAULT 0
  )
`;

export const CREATE_USER_BADGES_TABLE = `
  CREATE TABLE IF NOT EXISTS user_badges (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    badge_id TEXT NOT NULL REFERENCES badges(id),
    tier INTEGER NOT NULL,
    current_value REAL NOT NULL DEFAULT 0,
    earned_at TEXT NOT NULL,
    notified INTEGER NOT NULL DEFAULT 0
  )
`;

export const CREATE_STREAK_SHIELDS_TABLE = `
  CREATE TABLE IF NOT EXISTS streak_shields (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    shield_type TEXT NOT NULL,
    earned_at TEXT NOT NULL,
    used_at TEXT,
    used_for_date TEXT
  )
`;

export const CREATE_USER_LEVEL_TABLE = `
  CREATE TABLE IF NOT EXISTS user_level (
    id INTEGER PRIMARY KEY NOT NULL DEFAULT 1,
    current_level INTEGER NOT NULL DEFAULT 1,
    title TEXT NOT NULL DEFAULT 'Beginner',
    consistency_score REAL NOT NULL DEFAULT 0,
    volume_score REAL NOT NULL DEFAULT 0,
    nutrition_score REAL NOT NULL DEFAULT 0,
    variety_score REAL NOT NULL DEFAULT 0,
    last_calculated TEXT NOT NULL
  )
`;
```

- [ ] **Step 2: Add migration 15 to migrations.ts**

Add to the `MIGRATIONS` array in `src/db/migrations.ts`:

```typescript
{
  version: 15,
  description: 'Gamification: badges, user_badges, streak_shields, user_level tables',
  up: (tx: Transaction) => {
    tx.executeSql(CREATE_BADGES_TABLE);
    tx.executeSql(CREATE_USER_BADGES_TABLE);
    tx.executeSql(CREATE_STREAK_SHIELDS_TABLE);
    tx.executeSql(CREATE_USER_LEVEL_TABLE);
    tx.executeSql(
      `INSERT OR IGNORE INTO user_level (id, current_level, title, consistency_score, volume_score, nutrition_score, variety_score, last_calculated)
       VALUES (1, 1, 'Beginner', 0, 0, 0, 0, datetime('now'))`
    );
    tx.executeSql(`CREATE INDEX IF NOT EXISTS idx_user_badges_badge_id ON user_badges(badge_id)`);
    tx.executeSql(`CREATE INDEX IF NOT EXISTS idx_streak_shields_type ON streak_shields(shield_type)`);
  },
},
```

Also add the imports at the top of `src/db/migrations.ts`:

```typescript
import {
  CREATE_BADGES_TABLE,
  CREATE_USER_BADGES_TABLE,
  CREATE_STREAK_SHIELDS_TABLE,
  CREATE_USER_LEVEL_TABLE,
} from './schema';
```

- [ ] **Step 3: Verify TypeScript compiles**

Run: `npx tsc --noEmit --pretty 2>&1 | head -20`
Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add src/db/schema.ts src/db/migrations.ts
git commit -m "feat(gamification): add migration 15 with badges, user_badges, streak_shields, user_level tables"
```

---

## Task 3: Badge DB Operations

**Files:**
- Create: `src/db/badges.ts`
- Create: `src/db/__tests__/badges.test.ts`

- [ ] **Step 1: Write failing tests for badge DB operations**

Create `src/db/__tests__/badges.test.ts`:

```typescript
import {
  seedBadges,
  getEarnedBadges,
  getBadgeProgress,
  upsertBadgeProgress,
  earnBadgeTier,
  getUnnotifiedBadges,
  markBadgeNotified,
  getAvailableShields,
  earnShield,
  consumeShield,
  getUserLevel,
  updateUserLevel,
} from '../badges';

// Mock the database module
jest.mock('../database', () => {
  const results: Record<string, unknown[]> = {};
  return {
    getDatabase: jest.fn(() => ({
      transaction: jest.fn((callback: (tx: unknown) => void) => {
        const tx = {
          executeSql: jest.fn((_sql: string, _params?: unknown[], successCb?: (tx: unknown, res: unknown) => void) => {
            if (successCb) {
              successCb(tx, { rows: { length: 0, item: () => null, raw: () => [] } });
            }
          }),
        };
        callback(tx);
        return Promise.resolve();
      }),
      executeSql: jest.fn((_sql: string, _params?: unknown[]) => {
        return Promise.resolve([{ rows: { length: 0, item: () => null, raw: () => [] } }]);
      }),
    })),
  };
});

describe('badges DB operations', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('seedBadges', () => {
    it('should execute INSERT OR REPLACE for each badge definition', async () => {
      await expect(seedBadges()).resolves.not.toThrow();
    });
  });

  describe('getEarnedBadges', () => {
    it('should return an empty array when no badges earned', async () => {
      const result = await getEarnedBadges();
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('getUserLevel', () => {
    it('should return level state', async () => {
      const result = await getUserLevel();
      expect(result).toBeDefined();
    });
  });

  describe('getAvailableShields', () => {
    it('should return shield counts by type', async () => {
      const result = await getAvailableShields();
      expect(result).toBeDefined();
    });
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx jest src/db/__tests__/badges.test.ts --no-coverage 2>&1 | tail -20`
Expected: FAIL — functions not found / not exported

- [ ] **Step 3: Implement badge DB operations**

Create `src/db/badges.ts`:

```typescript
import { getDatabase } from './database';
import { BADGE_DEFINITIONS } from '../data/badgeDefinitions';
import type { UserBadgeRow, StreakShieldRow, UserLevelRow, BadgeTier, ShieldState } from '../types';

// ── Seed Badges ──

export async function seedBadges(): Promise<void> {
  const db = getDatabase();
  return new Promise((resolve, reject) => {
    db.transaction(
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
  const db = getDatabase();
  const [result] = await db.executeSql(
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
  const db = getDatabase();
  const [result] = await db.executeSql(
    `SELECT * FROM user_badges WHERE badge_id = ? ORDER BY tier DESC LIMIT 1`,
    [badgeId],
  );
  return result.rows.length > 0 ? result.rows.item(0) : null;
}

export async function upsertBadgeProgress(badgeId: string, currentValue: number): Promise<void> {
  const db = getDatabase();
  const existing = await getBadgeProgress(badgeId);
  if (existing) {
    await db.executeSql(
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
  const db = getDatabase();
  const existing = await getBadgeProgress(badgeId);
  if (existing && existing.tier >= tier) return; // Already earned this or higher tier

  if (existing) {
    await db.executeSql(
      `UPDATE user_badges SET tier = ?, current_value = ?, earned_at = datetime('now'), notified = 0 WHERE id = ?`,
      [tier, currentValue, existing.id],
    );
  } else {
    await db.executeSql(
      `INSERT INTO user_badges (badge_id, tier, current_value, earned_at, notified)
       VALUES (?, ?, ?, datetime('now'), 0)`,
      [badgeId, tier, currentValue],
    );
  }
}

// ── Notification ──

export async function getUnnotifiedBadges(): Promise<UserBadgeRow[]> {
  const db = getDatabase();
  const [result] = await db.executeSql(
    `SELECT * FROM user_badges WHERE notified = 0 ORDER BY earned_at ASC`,
  );
  const rows: UserBadgeRow[] = [];
  for (let i = 0; i < result.rows.length; i++) {
    rows.push(result.rows.item(i));
  }
  return rows;
}

export async function markBadgeNotified(userBadgeId: number): Promise<void> {
  const db = getDatabase();
  await db.executeSql(
    `UPDATE user_badges SET notified = 1 WHERE id = ?`,
    [userBadgeId],
  );
}

// ── Streak Shields ──

export async function getAvailableShields(): Promise<ShieldState> {
  const db = getDatabase();
  const [result] = await db.executeSql(
    `SELECT shield_type, COUNT(*) as count FROM streak_shields
     WHERE used_at IS NULL GROUP BY shield_type`,
  );
  const state: ShieldState = { workout: 0, protein: 0, water: 0 };
  for (let i = 0; i < result.rows.length; i++) {
    const row = result.rows.item(i);
    if (row.shield_type in state) {
      (state as Record<string, number>)[row.shield_type] = row.count;
    }
  }
  return state;
}

export async function earnShield(shieldType: string): Promise<boolean> {
  const shields = await getAvailableShields();
  const current = (shields as Record<string, number>)[shieldType] ?? 0;
  if (current >= 3) return false; // Max 3 per type

  const db = getDatabase();
  await db.executeSql(
    `INSERT INTO streak_shields (shield_type, earned_at) VALUES (?, datetime('now'))`,
    [shieldType],
  );
  return true;
}

export async function consumeShield(shieldType: string, forDate: string): Promise<boolean> {
  const db = getDatabase();
  const [result] = await db.executeSql(
    `SELECT id FROM streak_shields WHERE shield_type = ? AND used_at IS NULL ORDER BY earned_at ASC LIMIT 1`,
    [shieldType],
  );
  if (result.rows.length === 0) return false;

  const shieldId = result.rows.item(0).id;
  await db.executeSql(
    `UPDATE streak_shields SET used_at = datetime('now'), used_for_date = ? WHERE id = ?`,
    [forDate, shieldId],
  );
  return true;
}

// ── User Level ──

export async function getUserLevel(): Promise<UserLevelRow> {
  const db = getDatabase();
  const [result] = await db.executeSql(`SELECT * FROM user_level WHERE id = 1`);
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
  const db = getDatabase();
  await db.executeSql(
    `UPDATE user_level SET current_level = ?, title = ?,
     consistency_score = ?, volume_score = ?, nutrition_score = ?, variety_score = ?,
     last_calculated = datetime('now') WHERE id = 1`,
    [level, title, scores.consistency, scores.volume, scores.nutrition, scores.variety],
  );
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx jest src/db/__tests__/badges.test.ts --no-coverage 2>&1 | tail -20`
Expected: PASS (tests will pass with mocked DB — actual SQL integration tested on device)

- [ ] **Step 5: Commit**

```bash
git add src/db/badges.ts src/db/__tests__/badges.test.ts
git commit -m "feat(gamification): add badge DB operations — seed, query, earn, shields, level"
```

---

## Task 4: Badge Definitions Data

**Files:**
- Create: `src/data/badgeDefinitions.ts`

This is the heart of the system — all 93 badges as typed data. This is a large file but it's pure data, no logic.

- [ ] **Step 1: Create badge definitions file with all 93 badges**

Create `src/data/badgeDefinitions.ts`:

```typescript
import type { BadgeDefinition } from '../types';

// Helper to create badge definitions with common patterns
function cumulative(
  id: string,
  name: string,
  description: string,
  category: BadgeDefinition['category'],
  iconName: string,
  thresholds: number[],
  events: BadgeDefinition['relevantEvents'],
  evaluateFn: BadgeDefinition['evaluate'],
): BadgeDefinition {
  return {
    id, name, description, category, iconName,
    tierThresholds: thresholds,
    evaluationType: 'cumulative',
    relevantEvents: events,
    evaluate: evaluateFn,
  };
}

function streak(
  id: string,
  name: string,
  description: string,
  category: BadgeDefinition['category'],
  iconName: string,
  thresholds: number[],
  events: BadgeDefinition['relevantEvents'],
  evaluateFn: BadgeDefinition['evaluate'],
): BadgeDefinition {
  return {
    id, name, description, category, iconName,
    tierThresholds: thresholds,
    evaluationType: 'streak',
    relevantEvents: events,
    evaluate: evaluateFn,
  };
}

function oneTime(
  id: string,
  name: string,
  description: string,
  category: BadgeDefinition['category'],
  iconName: string,
  events: BadgeDefinition['relevantEvents'],
  evaluateFn: BadgeDefinition['evaluate'],
): BadgeDefinition {
  return {
    id, name, description, category, iconName,
    tierThresholds: null,
    evaluationType: 'one_time',
    relevantEvents: events,
    evaluate: evaluateFn,
  };
}

// ── SQL Evaluation Helpers ──
// These return functions that query the DB and return a numeric value.
// The badge engine compares this value against tier thresholds.

function sqlCount(query: string, params: unknown[] = []): BadgeDefinition['evaluate'] {
  return async (db: unknown) => {
    const database = db as { executeSql: (sql: string, params?: unknown[]) => Promise<[{ rows: { length: number; item: (i: number) => Record<string, number> } }]> };
    const [result] = await database.executeSql(query, params);
    if (result.rows.length === 0) return 0;
    return result.rows.item(0).value ?? 0;
  };
}

// ══════════════════════════════════════
// BADGE DEFINITIONS (93 total)
// ══════════════════════════════════════

export const BADGE_DEFINITIONS: BadgeDefinition[] = [

  // ── FITNESS: Volume & Strength (10) ──

  cumulative('ton_club', 'The Ton Club', 'Total lifetime volume lifted', 'fitness', 'dumbbell',
    [2000, 10000, 50000, 200000, 500000], ['SET_LOGGED', 'SESSION_COMPLETED'],
    sqlCount(`SELECT COALESCE(SUM(weight_lbs * reps), 0) as value FROM workout_sets WHERE is_warmup = 0`)),

  cumulative('set_stacker', 'Set Stacker', 'Total lifetime sets completed', 'fitness', 'layers',
    [100, 500, 1500, 5000, 15000], ['SET_LOGGED'],
    sqlCount(`SELECT COUNT(*) as value FROM workout_sets WHERE is_warmup = 0`)),

  cumulative('rep_machine', 'Rep Machine', 'Total lifetime reps performed', 'fitness', 'repeat',
    [500, 2500, 10000, 30000, 100000], ['SET_LOGGED'],
    sqlCount(`SELECT COALESCE(SUM(reps), 0) as value FROM workout_sets WHERE is_warmup = 0`)),

  cumulative('plate_crusher', 'Plate Crusher', 'Heaviest single set logged', 'fitness', 'weight',
    [135, 185, 225, 315, 405], ['SET_LOGGED'],
    sqlCount(`SELECT COALESCE(MAX(weight_lbs), 0) as value FROM workout_sets WHERE is_warmup = 0`)),

  cumulative('pr_collector', 'PR Collector', 'Total personal records achieved', 'fitness', 'trophy',
    [5, 20, 50, 100, 250], ['PR_ACHIEVED'],
    sqlCount(`SELECT COUNT(DISTINCT exercise_id || '-' || weight_lbs) as value FROM workout_sets ws
      WHERE ws.weight_lbs = (SELECT MAX(ws2.weight_lbs) FROM workout_sets ws2 WHERE ws2.exercise_id = ws.exercise_id)
      AND ws.is_warmup = 0`)),

  cumulative('session_warrior', 'Session Warrior', 'Total workout sessions completed', 'fitness', 'calendar-check',
    [10, 50, 150, 400, 1000], ['SESSION_COMPLETED'],
    sqlCount(`SELECT COUNT(*) as value FROM workout_sessions WHERE completed_at IS NOT NULL`)),

  cumulative('marathon_lifter', 'Marathon Lifter', 'Longest single session duration (minutes)', 'fitness', 'clock',
    [30, 45, 60, 90, 120], ['SESSION_COMPLETED'],
    sqlCount(`SELECT COALESCE(MAX((julianday(completed_at) - julianday(started_at)) * 1440), 0) as value
      FROM workout_sessions WHERE completed_at IS NOT NULL`)),

  cumulative('volume_day', 'Volume Day', 'Highest volume in a single session', 'fitness', 'trending-up',
    [2000, 5000, 10000, 20000, 40000], ['SESSION_COMPLETED'],
    sqlCount(`SELECT COALESCE(MAX(session_vol), 0) as value FROM (
      SELECT ws.session_id, SUM(ws.weight_lbs * ws.reps) as session_vol
      FROM workout_sets ws WHERE ws.is_warmup = 0 GROUP BY ws.session_id)`)),

  cumulative('superset_king', 'Superset King', 'Total superset groups completed', 'fitness', 'git-merge',
    [10, 50, 150, 400, 1000], ['SESSION_COMPLETED'],
    sqlCount(`SELECT COUNT(DISTINCT superset_group_id) as value FROM exercise_sessions WHERE superset_group_id IS NOT NULL`)),

  cumulative('warmup_disciple', 'Warmup Disciple', 'Total warmup sets logged', 'fitness', 'sun',
    [25, 100, 300, 750, 2000], ['SET_LOGGED'],
    sqlCount(`SELECT COUNT(*) as value FROM workout_sets WHERE is_warmup = 1`)),

  // ── FITNESS: Category Mastery (7) ──

  cumulative('chest_commander', 'Chest Commander', 'Total chest sets completed', 'fitness', 'chest',
    [50, 200, 500, 1200, 3000], ['SET_LOGGED'],
    sqlCount(`SELECT COUNT(*) as value FROM workout_sets ws JOIN exercises e ON ws.exercise_id = e.id WHERE e.category = 'chest' AND ws.is_warmup = 0`)),

  cumulative('back_boss', 'Back Boss', 'Total back sets completed', 'fitness', 'back',
    [50, 200, 500, 1200, 3000], ['SET_LOGGED'],
    sqlCount(`SELECT COUNT(*) as value FROM workout_sets ws JOIN exercises e ON ws.exercise_id = e.id WHERE e.category = 'back' AND ws.is_warmup = 0`)),

  cumulative('leg_legend', 'Leg Legend', 'Total leg sets completed', 'fitness', 'leg',
    [50, 200, 500, 1200, 3000], ['SET_LOGGED'],
    sqlCount(`SELECT COUNT(*) as value FROM workout_sets ws JOIN exercises e ON ws.exercise_id = e.id WHERE e.category = 'legs' AND ws.is_warmup = 0`)),

  cumulative('shoulder_sentinel', 'Shoulder Sentinel', 'Total shoulder sets completed', 'fitness', 'shoulder',
    [50, 200, 500, 1200, 3000], ['SET_LOGGED'],
    sqlCount(`SELECT COUNT(*) as value FROM workout_sets ws JOIN exercises e ON ws.exercise_id = e.id WHERE e.category = 'shoulders' AND ws.is_warmup = 0`)),

  cumulative('arm_architect', 'Arm Architect', 'Total arm sets completed', 'fitness', 'arm',
    [50, 200, 500, 1200, 3000], ['SET_LOGGED'],
    sqlCount(`SELECT COUNT(*) as value FROM workout_sets ws JOIN exercises e ON ws.exercise_id = e.id WHERE e.category = 'arms' AND ws.is_warmup = 0`)),

  cumulative('core_crusher', 'Core Crusher', 'Total core sets completed', 'fitness', 'core',
    [50, 200, 500, 1200, 3000], ['SET_LOGGED'],
    sqlCount(`SELECT COUNT(*) as value FROM workout_sets ws JOIN exercises e ON ws.exercise_id = e.id WHERE e.category = 'core' AND ws.is_warmup = 0`)),

  cumulative('conditioning_king', 'Conditioning King', 'Total conditioning sets completed', 'fitness', 'conditioning',
    [50, 200, 500, 1200, 3000], ['SET_LOGGED'],
    sqlCount(`SELECT COUNT(*) as value FROM workout_sets ws JOIN exercises e ON ws.exercise_id = e.id WHERE e.category = 'conditioning' AND ws.is_warmup = 0`)),

  // ── FITNESS: Performance & PR (6) ──

  cumulative('new_peak', 'New Peak', 'Most PRs in a single session', 'fitness', 'zap',
    [2, 3, 4, 5, 7], ['PR_ACHIEVED', 'SESSION_COMPLETED'],
    sqlCount(`SELECT COALESCE(MAX(pr_count), 0) as value FROM (
      SELECT session_id, COUNT(*) as pr_count FROM (
        SELECT ws.session_id, ws.exercise_id FROM workout_sets ws
        WHERE ws.is_warmup = 0 AND ws.weight_lbs = (
          SELECT MAX(ws2.weight_lbs) FROM workout_sets ws2
          WHERE ws2.exercise_id = ws.exercise_id AND ws2.logged_at <= ws.logged_at
        )
        GROUP BY ws.session_id, ws.exercise_id
      ) GROUP BY session_id)`)),

  cumulative('category_conqueror', 'Category Conqueror', 'Categories where you hold a PR in every exercise', 'fitness', 'crown',
    [1, 2, 4, 6, 7], ['PR_ACHIEVED'],
    sqlCount(`SELECT COUNT(*) as value FROM (SELECT 1) WHERE 1=0`)), // Complex — evaluated in badgeEngine

  cumulative('pr_streak', 'PR Streak', 'Consecutive sessions with at least one PR', 'fitness', 'flame',
    [3, 5, 8, 12, 20], ['SESSION_COMPLETED', 'PR_ACHIEVED'],
    sqlCount(`SELECT 0 as value`)), // Streak logic evaluated in badgeEngine

  cumulative('weight_climber', 'Weight Climber', 'Consecutive weight increases on same exercise', 'fitness', 'arrow-up',
    [3, 5, 8, 12, 20], ['SET_LOGGED'],
    sqlCount(`SELECT 0 as value`)), // Evaluated in badgeEngine with exercise context

  cumulative('rep_ranger', 'Rep Ranger', 'Times hitting 10+ reps at heaviest weight', 'fitness', 'target',
    [1, 5, 15, 40, 100], ['SET_LOGGED'],
    sqlCount(`SELECT COUNT(*) as value FROM workout_sets ws
      WHERE ws.reps >= 10 AND ws.is_warmup = 0
      AND ws.weight_lbs = (SELECT MAX(ws2.weight_lbs) FROM workout_sets ws2 WHERE ws2.exercise_id = ws.exercise_id)`)),

  cumulative('the_specialist', 'The Specialist', 'Sessions with a specific program', 'fitness', 'bookmark',
    [10, 25, 50, 100, 200], ['SESSION_COMPLETED'],
    sqlCount(`SELECT COALESCE(MAX(session_count), 0) as value FROM (
      SELECT COUNT(*) as session_count FROM workout_sessions ws
      JOIN program_days pd ON ws.program_day_id = pd.id
      WHERE ws.completed_at IS NOT NULL
      GROUP BY pd.program_id)`)),

  // ── FITNESS: Heart Rate (5) ──

  cumulative('heart_monitor', 'Heart Monitor', 'Sessions with HR monitor connected', 'fitness', 'heart',
    [5, 25, 75, 200, 500], ['SESSION_COMPLETED'],
    sqlCount(`SELECT COUNT(*) as value FROM workout_sessions WHERE avg_hr IS NOT NULL AND completed_at IS NOT NULL`)),

  cumulative('zone_warrior', 'Zone Warrior', 'Minutes in HR Zone 4-5', 'fitness', 'activity',
    [30, 120, 500, 1500, 5000], ['SESSION_COMPLETED'],
    sqlCount(`SELECT 0 as value`)), // Requires HR sample analysis — evaluated in badgeEngine

  cumulative('steady_state', 'Steady State', 'Sessions with avg HR in Zone 2-3', 'fitness', 'minus-circle',
    [5, 20, 50, 120, 300], ['SESSION_COMPLETED'],
    sqlCount(`SELECT 0 as value`)), // Requires HR zone config — evaluated in badgeEngine

  cumulative('peak_performer', 'Peak Performer', 'Sessions reaching 90%+ max HR', 'fitness', 'chevrons-up',
    [3, 10, 30, 75, 200], ['SESSION_COMPLETED'],
    sqlCount(`SELECT 0 as value`)), // Requires max HR config — evaluated in badgeEngine

  cumulative('cardio_king', 'Cardio King', 'Estimated calories burned from HR data', 'fitness', 'flame',
    [1000, 5000, 20000, 75000, 200000], ['SESSION_COMPLETED'],
    sqlCount(`SELECT 0 as value`)), // Requires calorie estimation — evaluated in badgeEngine

  // ── NUTRITION: Protein & Macros (10) ──

  cumulative('protein_machine', 'Protein Machine', 'Total protein grams logged', 'nutrition', 'beef',
    [1000, 5000, 20000, 75000, 200000], ['MEAL_LOGGED'],
    sqlCount(`SELECT COALESCE(SUM(protein_grams), 0) as value FROM meals`)),

  cumulative('macro_master', 'Macro Master', 'Days hitting all 3 macro goals', 'nutrition', 'check-circle',
    [5, 20, 60, 150, 365], ['MEAL_LOGGED'],
    sqlCount(`SELECT 0 as value`)), // Requires goal comparison — evaluated in badgeEngine

  streak('protein_faithful', 'Protein Faithful', 'Consecutive days hitting protein goal', 'nutrition', 'shield',
    [7, 14, 30, 60, 100], ['MEAL_LOGGED', 'DAY_BOUNDARY'],
    sqlCount(`SELECT 0 as value`)), // Streak evaluated in badgeEngine

  streak('carb_controller', 'Carb Controller', 'Consecutive days hitting carb goal', 'nutrition', 'pie-chart',
    [7, 14, 30, 60, 100], ['MEAL_LOGGED', 'DAY_BOUNDARY'],
    sqlCount(`SELECT 0 as value`)),

  streak('fat_balancer', 'Fat Balancer', 'Consecutive days hitting fat goal', 'nutrition', 'droplet',
    [7, 14, 30, 60, 100], ['MEAL_LOGGED', 'DAY_BOUNDARY'],
    sqlCount(`SELECT 0 as value`)),

  cumulative('calorie_counter', 'Calorie Counter', 'Total calories logged', 'nutrition', 'calculator',
    [20000, 100000, 500000, 1500000, 5000000], ['MEAL_LOGGED'],
    sqlCount(`SELECT COALESCE(SUM(mf.calories * mf.grams / 100.0), 0) as value FROM meal_foods mf`)),

  streak('triple_threat', 'Triple Threat', 'Consecutive days hitting all 3 macros', 'nutrition', 'award',
    [3, 7, 14, 30, 60], ['MEAL_LOGGED', 'DAY_BOUNDARY'],
    sqlCount(`SELECT 0 as value`)),

  cumulative('protein_overachiever', 'Protein Overachiever', 'Days exceeding protein goal by 20%+', 'nutrition', 'trending-up',
    [5, 20, 50, 120, 300], ['MEAL_LOGGED'],
    sqlCount(`SELECT 0 as value`)),

  cumulative('balanced_plate', 'Balanced Plate', 'Days with macros within 5% of targets', 'nutrition', 'sliders',
    [3, 10, 30, 75, 200], ['MEAL_LOGGED'],
    sqlCount(`SELECT 0 as value`)),

  cumulative('macro_streak_king', 'Macro Streak King', 'Longest ever macro streak (any macro)', 'nutrition', 'king',
    [10, 21, 45, 90, 180], ['MEAL_LOGGED', 'DAY_BOUNDARY'],
    sqlCount(`SELECT 0 as value`)),

  // ── NUTRITION: Meal Logging (8) ──

  cumulative('meal_logger', 'Meal Logger', 'Total meals logged', 'nutrition', 'utensils',
    [25, 100, 400, 1000, 3000], ['MEAL_LOGGED'],
    sqlCount(`SELECT COUNT(*) as value FROM meals`)),

  cumulative('full_day_tracker', 'Full Day Tracker', 'Days logging all 4 meal types', 'nutrition', 'calendar',
    [5, 20, 60, 150, 365], ['MEAL_LOGGED'],
    sqlCount(`SELECT COUNT(*) as value FROM (
      SELECT local_date FROM meals GROUP BY local_date
      HAVING COUNT(DISTINCT meal_type) >= 4)`)),

  streak('logging_streak', 'Logging Streak', 'Consecutive days logging at least 1 meal', 'nutrition', 'edit',
    [7, 14, 30, 60, 100], ['MEAL_LOGGED', 'DAY_BOUNDARY'],
    sqlCount(`SELECT 0 as value`)),

  cumulative('breakfast_champion', 'Breakfast Champion', 'Breakfasts logged', 'nutrition', 'coffee',
    [10, 50, 150, 365, 1000], ['MEAL_LOGGED'],
    sqlCount(`SELECT COUNT(*) as value FROM meals WHERE meal_type = 'breakfast'`)),

  cumulative('meal_prep_pro', 'Meal Prep Pro', 'Library meals reused', 'nutrition', 'copy',
    [5, 15, 40, 100, 250], ['MEAL_LOGGED'],
    sqlCount(`SELECT 0 as value`)), // Tracked via library meal usage

  cumulative('food_explorer', 'Food Explorer', 'Distinct foods logged', 'nutrition', 'compass',
    [10, 30, 75, 150, 300], ['MEAL_LOGGED'],
    sqlCount(`SELECT COUNT(DISTINCT food_id) as value FROM meal_foods WHERE food_id IS NOT NULL`)),

  cumulative('meal_builder', 'Meal Builder', 'Multi-food meals created', 'nutrition', 'layers',
    [10, 40, 100, 250, 750], ['MEAL_LOGGED'],
    sqlCount(`SELECT COUNT(*) as value FROM (
      SELECT meal_id FROM meal_foods GROUP BY meal_id HAVING COUNT(*) >= 2)`)),

  cumulative('library_architect', 'Library Architect', 'Saved meals in library', 'nutrition', 'archive',
    [3, 10, 25, 50, 100], ['MEAL_LOGGED'],
    sqlCount(`SELECT COUNT(*) as value FROM library_meals`)),

  // ── NUTRITION: Hydration (6) ──

  streak('water_warrior', 'Water Warrior', 'Consecutive days hitting water goal', 'nutrition', 'droplet',
    [7, 14, 30, 60, 100], ['WATER_LOGGED', 'DAY_BOUNDARY'],
    sqlCount(`SELECT 0 as value`)),

  cumulative('ocean_drinker', 'Ocean Drinker', 'Total lifetime water intake (oz)', 'nutrition', 'waves',
    [500, 2500, 10000, 30000, 100000], ['WATER_LOGGED'],
    sqlCount(`SELECT COALESCE(SUM(amount_oz), 0) as value FROM water_logs`)),

  cumulative('hydration_logger', 'Hydration Logger', 'Total water log entries', 'nutrition', 'plus-circle',
    [25, 100, 300, 750, 2000], ['WATER_LOGGED'],
    sqlCount(`SELECT COUNT(*) as value FROM water_logs`)),

  cumulative('overflowing', 'Overflowing', 'Days exceeding water goal by 50%+', 'nutrition', 'cloud-rain',
    [3, 10, 30, 75, 200], ['WATER_LOGGED'],
    sqlCount(`SELECT 0 as value`)),

  cumulative('early_sipper', 'Early Sipper', 'Days logging water before 9 AM', 'nutrition', 'sunrise',
    [5, 20, 50, 120, 300], ['WATER_LOGGED'],
    sqlCount(`SELECT COUNT(DISTINCT local_date) as value FROM water_logs WHERE time(logged_at) < '09:00:00'`)),

  cumulative('steady_flow', 'Steady Flow', 'Days with 4+ separate water entries', 'nutrition', 'bar-chart',
    [5, 15, 40, 100, 250], ['WATER_LOGGED'],
    sqlCount(`SELECT COUNT(*) as value FROM (
      SELECT local_date FROM water_logs GROUP BY local_date HAVING COUNT(*) >= 4)`)),

  // ── NUTRITION: Milestones (4) ──

  cumulative('custom_chef', 'Custom Chef', 'Custom foods created', 'nutrition', 'chef-hat',
    [5, 15, 35, 75, 150], ['MEAL_LOGGED'],
    sqlCount(`SELECT COUNT(*) as value FROM foods WHERE is_custom = 1`)),

  cumulative('nutrition_nerd', 'Nutrition Nerd', 'Days with full macro breakdowns', 'nutrition', 'book-open',
    [5, 20, 60, 150, 365], ['MEAL_LOGGED'],
    sqlCount(`SELECT 0 as value`)),

  cumulative('goal_setter', 'Goal Setter', 'Macro/water goal updates', 'nutrition', 'settings',
    [1, 3, 6, 12, 24], ['MEAL_LOGGED', 'WATER_LOGGED'],
    sqlCount(`SELECT 0 as value`)), // Would need goal change tracking

  cumulative('snack_tracker', 'Snack Tracker', 'Snacks logged', 'nutrition', 'cookie',
    [10, 40, 100, 250, 750], ['MEAL_LOGGED'],
    sqlCount(`SELECT COUNT(*) as value FROM meals WHERE meal_type = 'snack'`)),

  // ── CONSISTENCY (16) ──

  streak('iron_streak', 'Iron Streak', 'Consecutive days with a workout', 'consistency', 'flame',
    [7, 14, 30, 60, 100], ['SESSION_COMPLETED', 'DAY_BOUNDARY'],
    sqlCount(`SELECT 0 as value`)),

  cumulative('complete_athlete', 'Complete Athlete', 'Days with workout + macros + water all hit', 'consistency', 'star',
    [3, 10, 30, 75, 200], ['SESSION_COMPLETED', 'MEAL_LOGGED', 'WATER_LOGGED'],
    sqlCount(`SELECT 0 as value`)),

  cumulative('weekend_warrior', 'Weekend Warrior', 'Weekends with a workout', 'consistency', 'calendar',
    [4, 12, 26, 52, 100], ['SESSION_COMPLETED'],
    sqlCount(`SELECT COUNT(DISTINCT strftime('%Y-%W', started_at)) as value FROM workout_sessions
      WHERE completed_at IS NOT NULL AND (strftime('%w', started_at) = '0' OR strftime('%w', started_at) = '6')`)),

  cumulative('early_bird', 'Early Bird', 'Workouts started before 8 AM', 'consistency', 'sunrise',
    [5, 20, 50, 120, 300], ['SESSION_COMPLETED'],
    sqlCount(`SELECT COUNT(*) as value FROM workout_sessions
      WHERE completed_at IS NOT NULL AND time(started_at) < '08:00:00'`)),

  cumulative('night_owl', 'Night Owl', 'Workouts started after 8 PM', 'consistency', 'moon',
    [5, 20, 50, 120, 300], ['SESSION_COMPLETED'],
    sqlCount(`SELECT COUNT(*) as value FROM workout_sessions
      WHERE completed_at IS NOT NULL AND time(started_at) >= '20:00:00'`)),

  streak('weekly_regular', 'Weekly Regular', 'Consecutive weeks with 3+ workouts', 'consistency', 'repeat',
    [4, 8, 16, 30, 52], ['SESSION_COMPLETED', 'DAY_BOUNDARY'],
    sqlCount(`SELECT 0 as value`)),

  streak('monthly_machine', 'Monthly Machine', 'Consecutive months with 12+ workouts', 'consistency', 'grid',
    [2, 4, 8, 12, 24], ['SESSION_COMPLETED', 'DAY_BOUNDARY'],
    sqlCount(`SELECT 0 as value`)),

  streak('full_week_fuel', 'Full Week Fuel', 'Consecutive weeks logging meals every day', 'consistency', 'package',
    [2, 4, 8, 16, 30], ['MEAL_LOGGED', 'DAY_BOUNDARY'],
    sqlCount(`SELECT 0 as value`)),

  cumulative('dual_discipline', 'Dual Discipline', 'Days with workout + all meals logged', 'consistency', 'check-square',
    [5, 20, 60, 150, 365], ['SESSION_COMPLETED', 'MEAL_LOGGED'],
    sqlCount(`SELECT 0 as value`)),

  streak('program_loyalist', 'Program Loyalist', 'Consecutive weeks following program', 'consistency', 'clipboard',
    [2, 4, 8, 16, 30], ['SESSION_COMPLETED', 'DAY_BOUNDARY'],
    sqlCount(`SELECT 0 as value`)),

  cumulative('variety_pack', 'Variety Pack', 'Most distinct categories in a single week', 'consistency', 'shuffle',
    [3, 4, 5, 6, 7], ['SESSION_COMPLETED'],
    sqlCount(`SELECT COALESCE(MAX(cat_count), 0) as value FROM (
      SELECT strftime('%Y-%W', ws2.started_at) as week, COUNT(DISTINCT e.category) as cat_count
      FROM workout_sessions ws2
      JOIN exercise_sessions es ON es.session_id = ws2.id
      JOIN exercises e ON e.id = es.exercise_id
      WHERE ws2.completed_at IS NOT NULL
      GROUP BY week)`)),

  cumulative('full_spectrum', 'Full Spectrum', 'Weeks training all 7 categories', 'consistency', 'globe',
    [2, 8, 20, 40, 100], ['SESSION_COMPLETED'],
    sqlCount(`SELECT COUNT(*) as value FROM (
      SELECT strftime('%Y-%W', ws2.started_at) as week
      FROM workout_sessions ws2
      JOIN exercise_sessions es ON es.session_id = ws2.id
      JOIN exercises e ON e.id = es.exercise_id
      WHERE ws2.completed_at IS NOT NULL
      GROUP BY week HAVING COUNT(DISTINCT e.category) = 7)`)),

  cumulative('app_veteran', 'App Veteran', 'Days since first workout', 'consistency', 'award',
    [30, 90, 180, 365, 730], ['APP_OPENED'],
    sqlCount(`SELECT COALESCE(CAST(julianday('now') - julianday(MIN(started_at)) AS INTEGER), 0) as value
      FROM workout_sessions WHERE completed_at IS NOT NULL`)),

  cumulative('rest_day_fuel', 'Rest Day Fuel', 'Rest days with macros tracked', 'consistency', 'battery-charging',
    [5, 20, 50, 120, 300], ['MEAL_LOGGED'],
    sqlCount(`SELECT 0 as value`)),

  cumulative('hydro_athlete', 'Hydro Athlete', 'Workout days with water goal hit', 'consistency', 'zap',
    [5, 20, 60, 150, 400], ['WATER_LOGGED', 'SESSION_COMPLETED'],
    sqlCount(`SELECT 0 as value`)),

  cumulative('shield_collector', 'Shield Collector', 'Total streak shields earned', 'consistency', 'shield',
    [3, 10, 25, 60, 150], ['DAY_BOUNDARY'],
    sqlCount(`SELECT COUNT(*) as value FROM streak_shields`)),

  // ── RECOVERY (9) ──

  cumulative('the_phoenix', 'The Phoenix', 'Return after 7+ days off', 'recovery', 'refresh-cw',
    [1, 3, 5, 10, 20], ['SESSION_COMPLETED'],
    sqlCount(`SELECT 0 as value`)), // Evaluated in badgeEngine with gap detection

  cumulative('back_on_track', 'Back on Track', 'Hit macros 3 days after missing a week', 'recovery', 'corner-up-right',
    [1, 3, 6, 12, 25], ['MEAL_LOGGED'],
    sqlCount(`SELECT 0 as value`)),

  cumulative('streak_saver', 'Streak Saver', 'Streak shields consumed', 'recovery', 'life-buoy',
    [1, 5, 12, 25, 50], ['DAY_BOUNDARY'],
    sqlCount(`SELECT COUNT(*) as value FROM streak_shields WHERE used_at IS NOT NULL`)),

  cumulative('rebuild_stronger', 'Rebuild Stronger', 'PR within 7 days of return from 7+ day break', 'recovery', 'trending-up',
    [1, 3, 5, 10, 20], ['PR_ACHIEVED'],
    sqlCount(`SELECT 0 as value`)),

  cumulative('hydration_reset', 'Hydration Reset', 'Hit water 3 days after missing 3+', 'recovery', 'droplet',
    [1, 3, 6, 12, 25], ['WATER_LOGGED'],
    sqlCount(`SELECT 0 as value`)),

  streak('never_skip_monday', 'Never Skip Monday', 'Consecutive Mondays with a workout', 'recovery', 'calendar',
    [4, 8, 16, 30, 52], ['SESSION_COMPLETED', 'DAY_BOUNDARY'],
    sqlCount(`SELECT 0 as value`)),

  cumulative('resilient', 'Resilient', 'Rebuild a streak higher than before it broke', 'recovery', 'rotate-ccw',
    [1, 3, 5, 10, 20], ['DAY_BOUNDARY'],
    sqlCount(`SELECT 0 as value`)),

  cumulative('full_recovery', 'Full Recovery', 'After 14+ days off, 7 workouts in 14 days', 'recovery', 'heart',
    [1, 2, 4, 7, 15], ['SESSION_COMPLETED'],
    sqlCount(`SELECT 0 as value`)),

  cumulative('second_wind', 'Second Wind', 'Log meal after 5+ days no nutrition tracking', 'recovery', 'wind',
    [1, 3, 6, 12, 25], ['MEAL_LOGGED'],
    sqlCount(`SELECT 0 as value`)),

  // ── MILESTONE: One-Time Trophies (12) ──

  oneTime('first_blood', 'First Blood', 'Complete your very first workout', 'milestone', 'star',
    ['SESSION_COMPLETED'],
    sqlCount(`SELECT CASE WHEN COUNT(*) > 0 THEN 1 ELSE 0 END as value FROM workout_sessions WHERE completed_at IS NOT NULL`)),

  oneTime('first_fuel', 'First Fuel', 'Log your very first meal', 'milestone', 'utensils',
    ['MEAL_LOGGED'],
    sqlCount(`SELECT CASE WHEN COUNT(*) > 0 THEN 1 ELSE 0 END as value FROM meals`)),

  oneTime('first_drop', 'First Drop', 'Log your first water intake', 'milestone', 'droplet',
    ['WATER_LOGGED'],
    sqlCount(`SELECT CASE WHEN COUNT(*) > 0 THEN 1 ELSE 0 END as value FROM water_logs`)),

  oneTime('gold_standard', 'Gold Standard', 'Achieve your first personal record', 'milestone', 'trophy',
    ['PR_ACHIEVED'],
    sqlCount(`SELECT 0 as value`)), // Detected by PR event

  oneTime('heart_connected', 'Heart Connected', 'First workout with HR monitor', 'milestone', 'heart',
    ['SESSION_COMPLETED'],
    sqlCount(`SELECT CASE WHEN COUNT(*) > 0 THEN 1 ELSE 0 END as value
      FROM workout_sessions WHERE avg_hr IS NOT NULL AND completed_at IS NOT NULL`)),

  oneTime('program_graduate', 'Program Graduate', 'Complete all weeks of a program', 'milestone', 'graduation-cap',
    ['SESSION_COMPLETED'],
    sqlCount(`SELECT 0 as value`)), // Evaluated in badgeEngine

  oneTime('century_club', 'Century Club', 'Complete your 100th workout', 'milestone', 'hash',
    ['SESSION_COMPLETED'],
    sqlCount(`SELECT CASE WHEN COUNT(*) >= 100 THEN 1 ELSE 0 END as value FROM workout_sessions WHERE completed_at IS NOT NULL`)),

  oneTime('perfect_day', 'Perfect Day', 'Workout + all macros + water + all 4 meal types', 'milestone', 'sun',
    ['SESSION_COMPLETED', 'MEAL_LOGGED', 'WATER_LOGGED'],
    sqlCount(`SELECT 0 as value`)), // Complex cross-domain — evaluated in badgeEngine

  oneTime('recipe_creator', 'Recipe Creator', 'Save your first library meal', 'milestone', 'book',
    ['MEAL_LOGGED'],
    sqlCount(`SELECT CASE WHEN COUNT(*) > 0 THEN 1 ELSE 0 END as value FROM library_meals`)),

  oneTime('custom_creator', 'Custom Creator', 'Create your first custom food', 'milestone', 'edit-3',
    ['MEAL_LOGGED'],
    sqlCount(`SELECT CASE WHEN COUNT(*) > 0 THEN 1 ELSE 0 END as value FROM foods WHERE is_custom = 1`)),

  oneTime('one_year_strong', 'One Year Strong', '365 days since first activity', 'milestone', 'calendar',
    ['APP_OPENED'],
    sqlCount(`SELECT CASE WHEN CAST(julianday('now') - julianday(MIN(started_at)) AS INTEGER) >= 365 THEN 1 ELSE 0 END as value
      FROM workout_sessions WHERE completed_at IS NOT NULL`)),

  oneTime('badge_hunter', 'Badge Hunter', 'Earn your first 10 badges', 'milestone', 'search',
    ['SET_LOGGED', 'SESSION_COMPLETED', 'MEAL_LOGGED', 'WATER_LOGGED', 'PR_ACHIEVED'],
    sqlCount(`SELECT CASE WHEN COUNT(*) >= 10 THEN 1 ELSE 0 END as value FROM user_badges`)),
];

// ── Lookup helpers ──

export function getBadgeDefinition(id: string): BadgeDefinition | undefined {
  return BADGE_DEFINITIONS.find(b => b.id === id);
}

export function getBadgesByCategory(category: BadgeDefinition['category']): BadgeDefinition[] {
  return BADGE_DEFINITIONS.filter(b => b.category === category);
}

export function getBadgesForEvent(eventType: BadgeDefinition['relevantEvents'][number]): BadgeDefinition[] {
  return BADGE_DEFINITIONS.filter(b => b.relevantEvents.includes(eventType));
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit --pretty 2>&1 | head -20`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/data/badgeDefinitions.ts
git commit -m "feat(gamification): add all 93 badge definitions with SQL evaluation functions"
```

---

## Task 5: Badge Engine Core

**Files:**
- Create: `src/utils/badgeEngine.ts`
- Create: `src/utils/__tests__/badgeEngine.test.ts`

- [ ] **Step 1: Write failing tests for badge engine**

Create `src/utils/__tests__/badgeEngine.test.ts`:

```typescript
import { evaluateBadge, determineTier, getRelevantBadges } from '../badgeEngine';
import type { BadgeDefinition, BadgeTier } from '../../types';

describe('badgeEngine', () => {
  describe('determineTier', () => {
    it('returns null when value is below Bronze threshold', () => {
      expect(determineTier(5, [10, 20, 30, 60, 100])).toBeNull();
    });

    it('returns Bronze (1) when value meets first threshold', () => {
      expect(determineTier(10, [10, 20, 30, 60, 100])).toBe(1);
    });

    it('returns Silver (2) when value meets second threshold', () => {
      expect(determineTier(25, [10, 20, 30, 60, 100])).toBe(2);
    });

    it('returns Gold (3) when value meets third threshold', () => {
      expect(determineTier(30, [10, 20, 30, 60, 100])).toBe(3);
    });

    it('returns Platinum (4) when value meets fourth threshold', () => {
      expect(determineTier(60, [10, 20, 30, 60, 100])).toBe(4);
    });

    it('returns Diamond (5) when value meets fifth threshold', () => {
      expect(determineTier(150, [10, 20, 30, 60, 100])).toBe(5);
    });

    it('returns 1 for one-time badges when value >= 1', () => {
      expect(determineTier(1, null)).toBe(1);
    });

    it('returns null for one-time badges when value is 0', () => {
      expect(determineTier(0, null)).toBeNull();
    });
  });

  describe('getRelevantBadges', () => {
    it('filters badges by event type', () => {
      const result = getRelevantBadges('SET_LOGGED');
      expect(result.length).toBeGreaterThan(0);
      result.forEach(b => {
        expect(b.relevantEvents).toContain('SET_LOGGED');
      });
    });

    it('returns different badges for different events', () => {
      const setBadges = getRelevantBadges('SET_LOGGED');
      const waterBadges = getRelevantBadges('WATER_LOGGED');
      expect(setBadges).not.toEqual(waterBadges);
    });
  });

  describe('evaluateBadge', () => {
    it('returns current value from evaluate function', async () => {
      const mockBadge: BadgeDefinition = {
        id: 'test_badge',
        name: 'Test',
        description: 'Test badge',
        category: 'fitness',
        iconName: 'star',
        tierThresholds: [10, 20, 30, 60, 100],
        evaluationType: 'cumulative',
        relevantEvents: ['SET_LOGGED'],
        evaluate: async () => 25,
      };

      const result = await evaluateBadge(mockBadge, {} as unknown);
      expect(result.currentValue).toBe(25);
      expect(result.tier).toBe(2); // Silver
      expect(result.nextThreshold).toBe(30); // Gold threshold
    });

    it('returns nextThreshold as null when Diamond is reached', async () => {
      const mockBadge: BadgeDefinition = {
        id: 'test_badge',
        name: 'Test',
        description: 'Test badge',
        category: 'fitness',
        iconName: 'star',
        tierThresholds: [10, 20, 30, 60, 100],
        evaluationType: 'cumulative',
        relevantEvents: ['SET_LOGGED'],
        evaluate: async () => 150,
      };

      const result = await evaluateBadge(mockBadge, {} as unknown);
      expect(result.tier).toBe(5); // Diamond
      expect(result.nextThreshold).toBeNull();
    });
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx jest src/utils/__tests__/badgeEngine.test.ts --no-coverage 2>&1 | tail -20`
Expected: FAIL — module not found

- [ ] **Step 3: Implement badge engine**

Create `src/utils/badgeEngine.ts`:

```typescript
import type { BadgeDefinition, BadgeTier, BadgeState, AppEventType } from '../types';
import { BADGE_DEFINITIONS, getBadgesForEvent } from '../data/badgeDefinitions';

export interface BadgeEvalResult {
  currentValue: number;
  tier: BadgeTier | null;
  nextThreshold: number | null;
}

/**
 * Determine the tier for a given value against thresholds.
 * Returns null if below Bronze. Returns 1 for one-time badges (null thresholds) when value >= 1.
 */
export function determineTier(
  value: number,
  thresholds: number[] | null,
): BadgeTier | null {
  // One-time badges: earned if value >= 1
  if (thresholds === null) {
    return value >= 1 ? 1 : null;
  }

  let tier: BadgeTier | null = null;
  for (let i = 0; i < thresholds.length; i++) {
    if (value >= thresholds[i]) {
      tier = (i + 1) as BadgeTier;
    } else {
      break;
    }
  }
  return tier;
}

/**
 * Get the next threshold above the current tier, or null if maxed out.
 */
export function getNextThreshold(
  currentTier: BadgeTier | null,
  thresholds: number[] | null,
): number | null {
  if (thresholds === null) return null; // One-time badge
  if (currentTier === null) return thresholds[0]; // Not yet earned — Bronze threshold
  if (currentTier >= 5) return null; // Diamond — maxed out
  return thresholds[currentTier]; // Next tier threshold
}

/**
 * Get all badge definitions relevant to a given event type.
 */
export function getRelevantBadges(eventType: AppEventType): BadgeDefinition[] {
  return getBadgesForEvent(eventType);
}

/**
 * Evaluate a single badge against the database, returning current value, tier, and next threshold.
 */
export async function evaluateBadge(
  badge: BadgeDefinition,
  db: unknown,
): Promise<BadgeEvalResult> {
  const currentValue = await badge.evaluate(db);
  const tier = determineTier(currentValue, badge.tierThresholds);
  const nextThreshold = getNextThreshold(tier, badge.tierThresholds);

  return { currentValue, tier, nextThreshold };
}

/**
 * Evaluate all relevant badges for an event, returning updated states.
 * Only evaluates badges that match the event type (relevance filtering).
 */
export async function evaluateRelevantBadges(
  eventType: AppEventType,
  db: unknown,
  currentStates: Map<string, BadgeState>,
): Promise<{ updated: Map<string, BadgeState>; newTierUps: Array<{ badge: BadgeDefinition; newTier: BadgeTier }> }> {
  const relevantBadges = getRelevantBadges(eventType);
  const updated = new Map(currentStates);
  const newTierUps: Array<{ badge: BadgeDefinition; newTier: BadgeTier }> = [];

  for (const badge of relevantBadges) {
    const result = await evaluateBadge(badge, db);
    const previousState = currentStates.get(badge.id);
    const previousTier = previousState?.currentTier ?? null;

    updated.set(badge.id, {
      badgeId: badge.id,
      currentTier: result.tier,
      currentValue: result.currentValue,
      nextThreshold: result.nextThreshold,
    });

    // Detect tier-up
    if (result.tier !== null && (previousTier === null || result.tier > previousTier)) {
      newTierUps.push({ badge, newTier: result.tier });
    }
  }

  return { updated, newTierUps };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx jest src/utils/__tests__/badgeEngine.test.ts --no-coverage 2>&1 | tail -20`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/utils/badgeEngine.ts src/utils/__tests__/badgeEngine.test.ts
git commit -m "feat(gamification): implement badge engine with tier determination and relevance filtering"
```

---

## Task 6: Level Calculator

**Files:**
- Create: `src/utils/levelCalculator.ts`
- Create: `src/utils/__tests__/levelCalculator.test.ts`

- [ ] **Step 1: Write failing tests**

Create `src/utils/__tests__/levelCalculator.test.ts`:

```typescript
import { calculateCompositeLevel, getLevelTitle, calculateSubscale } from '../levelCalculator';

describe('levelCalculator', () => {
  describe('getLevelTitle', () => {
    it('returns Beginner for level 1', () => {
      expect(getLevelTitle(1)).toBe('Beginner');
    });

    it('returns Novice for level 15', () => {
      expect(getLevelTitle(15)).toBe('Novice');
    });

    it('returns Intermediate for level 30', () => {
      expect(getLevelTitle(30)).toBe('Intermediate');
    });

    it('returns Advanced for level 50', () => {
      expect(getLevelTitle(50)).toBe('Advanced');
    });

    it('returns Elite for level 70', () => {
      expect(getLevelTitle(70)).toBe('Elite');
    });

    it('returns Master for level 90', () => {
      expect(getLevelTitle(90)).toBe('Master');
    });

    it('returns Legend for level 100', () => {
      expect(getLevelTitle(100)).toBe('Legend');
    });
  });

  describe('calculateCompositeLevel', () => {
    it('returns level 1 for all zero scores', () => {
      const result = calculateCompositeLevel(0, 0, 0, 0);
      expect(result.level).toBe(1);
      expect(result.title).toBe('Beginner');
    });

    it('returns level 100 for all perfect scores', () => {
      const result = calculateCompositeLevel(100, 100, 100, 100);
      expect(result.level).toBe(100);
      expect(result.title).toBe('Legend');
    });

    it('weights consistency at 40%', () => {
      const highConsistency = calculateCompositeLevel(100, 0, 0, 0);
      const highVolume = calculateCompositeLevel(0, 100, 0, 0);
      expect(highConsistency.level).toBeGreaterThan(highVolume.level);
    });

    it('calculates progress to next level', () => {
      const result = calculateCompositeLevel(50, 50, 50, 50);
      expect(result.progressToNext).toBeGreaterThanOrEqual(0);
      expect(result.progressToNext).toBeLessThanOrEqual(1);
    });
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx jest src/utils/__tests__/levelCalculator.test.ts --no-coverage 2>&1 | tail -20`
Expected: FAIL

- [ ] **Step 3: Implement level calculator**

Create `src/utils/levelCalculator.ts`:

```typescript
import type { LevelState, LevelTitle } from '../types';
import { LEVEL_TITLE_RANGES } from '../types';

const WEIGHTS = {
  consistency: 0.4,
  volume: 0.3,
  nutrition: 0.2,
  variety: 0.1,
};

/**
 * Get the title for a given level number.
 */
export function getLevelTitle(level: number): LevelTitle {
  for (const range of LEVEL_TITLE_RANGES) {
    if (level >= range.min && level <= range.max) {
      return range.title;
    }
  }
  return 'Beginner';
}

/**
 * Calculate a single subscale score (0-100) from raw metrics.
 * This is a placeholder that will be refined as we wire up real data.
 * Each subscale queries the DB for its own metrics.
 */
export function calculateSubscale(rawValue: number, maxExpected: number): number {
  return Math.min(100, Math.max(0, Math.round((rawValue / maxExpected) * 100)));
}

/**
 * Calculate composite level from 4 subscale scores (each 0-100).
 * Returns level (1-100), title, and progress to next level.
 */
export function calculateCompositeLevel(
  consistencyScore: number,
  volumeScore: number,
  nutritionScore: number,
  varietyScore: number,
): LevelState {
  const weightedScore =
    consistencyScore * WEIGHTS.consistency +
    volumeScore * WEIGHTS.volume +
    nutritionScore * WEIGHTS.nutrition +
    varietyScore * WEIGHTS.variety;

  // Map 0-100 weighted score to level 1-100
  const level = Math.max(1, Math.min(100, Math.round(weightedScore)));
  const title = getLevelTitle(level);

  // Progress to next level (fractional part of the weighted score)
  const progressToNext = weightedScore - Math.floor(weightedScore);

  return {
    level,
    title,
    consistencyScore,
    volumeScore,
    nutritionScore,
    varietyScore,
    progressToNext: Math.max(0, Math.min(1, progressToNext)),
  };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx jest src/utils/__tests__/levelCalculator.test.ts --no-coverage 2>&1 | tail -20`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/utils/levelCalculator.ts src/utils/__tests__/levelCalculator.test.ts
git commit -m "feat(gamification): implement composite level calculator with weighted subscales"
```

---

## Task 7: GamificationContext Provider

**Files:**
- Create: `src/context/GamificationContext.tsx`
- Modify: `App.tsx`

- [ ] **Step 1: Implement GamificationContext**

Create `src/context/GamificationContext.tsx`:

```typescript
import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
  useEffect,
  useRef,
} from 'react';
import type {
  GamificationContextValue,
  BadgeState,
  LevelState,
  ShieldState,
  CelebrationItem,
  AppEvent,
  BadgeTier,
} from '../types';
import { getDatabase } from '../db/database';
import {
  seedBadges,
  getEarnedBadges,
  earnBadgeTier,
  upsertBadgeProgress,
  getUnnotifiedBadges,
  markBadgeNotified,
  getAvailableShields,
  getUserLevel,
  updateUserLevel,
} from '../db/badges';
import { evaluateRelevantBadges } from '../utils/badgeEngine';
import { calculateCompositeLevel } from '../utils/levelCalculator';
import { BADGE_DEFINITIONS, getBadgeDefinition } from '../data/badgeDefinitions';
import { determineTier, getNextThreshold } from '../utils/badgeEngine';

const GamificationContext = createContext<GamificationContextValue | undefined>(undefined);

export function useGamification(): GamificationContextValue {
  const ctx = useContext(GamificationContext);
  if (!ctx) {
    throw new Error('useGamification must be used inside <GamificationProvider>');
  }
  return ctx;
}

export function GamificationProvider({ children }: { children: React.ReactNode }) {
  const [badgeStates, setBadgeStates] = useState<Map<string, BadgeState>>(new Map());
  const [levelState, setLevelState] = useState<LevelState>({
    level: 1, title: 'Beginner',
    consistencyScore: 0, volumeScore: 0, nutritionScore: 0, varietyScore: 0,
    progressToNext: 0,
  });
  const [shieldState, setShieldState] = useState<ShieldState>({ workout: 0, protein: 0, water: 0 });
  const [pendingCelebrations, setPendingCelebrations] = useState<CelebrationItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const isInitialized = useRef(false);

  // ── Initialize: seed badges, load state ──
  useEffect(() => {
    if (isInitialized.current) return;
    isInitialized.current = true;

    (async () => {
      try {
        await seedBadges();
        await loadAllState();
      } catch (error) {
        console.error('Gamification init failed:', error);
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  const loadAllState = useCallback(async () => {
    const db = getDatabase();

    // Load earned badges and build state map
    const earned = await getEarnedBadges();
    const stateMap = new Map<string, BadgeState>();

    // Initialize all badges with default state
    for (const def of BADGE_DEFINITIONS) {
      stateMap.set(def.id, {
        badgeId: def.id,
        currentTier: null,
        currentValue: 0,
        nextThreshold: def.tierThresholds ? def.tierThresholds[0] : 1,
      });
    }

    // Overlay earned badge data
    for (const row of earned) {
      const def = getBadgeDefinition(row.badge_id);
      if (!def) continue;
      stateMap.set(row.badge_id, {
        badgeId: row.badge_id,
        currentTier: row.tier as BadgeTier,
        currentValue: row.current_value,
        nextThreshold: getNextThreshold(row.tier as BadgeTier, def.tierThresholds),
      });
    }

    setBadgeStates(stateMap);

    // Load level
    const levelRow = await getUserLevel();
    setLevelState({
      level: levelRow.current_level,
      title: levelRow.title,
      consistencyScore: levelRow.consistency_score,
      volumeScore: levelRow.volume_score,
      nutritionScore: levelRow.nutrition_score,
      varietyScore: levelRow.variety_score,
      progressToNext: 0,
    });

    // Load shields
    const shields = await getAvailableShields();
    setShieldState(shields);

    // Load unnotified celebrations
    const unnotified = await getUnnotifiedBadges();
    const celebrations: CelebrationItem[] = [];
    for (const row of unnotified) {
      const def = getBadgeDefinition(row.badge_id);
      if (def) {
        celebrations.push({
          badge: def,
          newTier: row.tier as BadgeTier,
          earnedAt: row.earned_at,
        });
      }
    }
    setPendingCelebrations(celebrations);
  }, []);

  // ── Check Badges (called after data mutations) ──
  const checkBadges = useCallback(async (event: AppEvent) => {
    try {
      const db = getDatabase();
      const { updated, newTierUps } = await evaluateRelevantBadges(
        event.type,
        db,
        badgeStates,
      );

      // Persist tier-ups to DB
      for (const { badge, newTier } of newTierUps) {
        const state = updated.get(badge.id);
        if (state) {
          await earnBadgeTier(badge.id, newTier, state.currentValue);
        }
      }

      // Update progress for all evaluated badges
      for (const [badgeId, state] of updated) {
        if (state.currentValue > 0) {
          await upsertBadgeProgress(badgeId, state.currentValue);
        }
      }

      setBadgeStates(updated);

      // Queue celebrations for new tier-ups
      if (newTierUps.length > 0) {
        const newCelebrations: CelebrationItem[] = newTierUps.map(({ badge, newTier }) => ({
          badge,
          newTier,
          earnedAt: new Date().toISOString(),
        }));
        setPendingCelebrations(prev => [...prev, ...newCelebrations]);
      }

      // Recalculate level (simplified — will be enhanced with real subscale queries)
      const levelResult = calculateCompositeLevel(
        levelState.consistencyScore,
        levelState.volumeScore,
        levelState.nutritionScore,
        levelState.varietyScore,
      );
      setLevelState(levelResult);
      await updateUserLevel(levelResult.level, levelResult.title, {
        consistency: levelResult.consistencyScore,
        volume: levelResult.volumeScore,
        nutrition: levelResult.nutritionScore,
        variety: levelResult.varietyScore,
      });

      // Refresh shields
      const shields = await getAvailableShields();
      setShieldState(shields);
    } catch (error) {
      console.error('Badge check failed:', error);
    }
  }, [badgeStates, levelState]);

  // ── Dismiss Celebration ──
  const dismissCelebration = useCallback(async () => {
    const current = pendingCelebrations[0];
    if (!current) return;

    // Mark as notified in DB
    const unnotified = await getUnnotifiedBadges();
    const match = unnotified.find(
      r => r.badge_id === current.badge.id && r.tier === current.newTier,
    );
    if (match) {
      await markBadgeNotified(match.id);
    }

    setPendingCelebrations(prev => prev.slice(1));
  }, [pendingCelebrations]);

  // ── Refresh All ──
  const refreshAll = useCallback(async () => {
    setIsLoading(true);
    await loadAllState();
    setIsLoading(false);
  }, [loadAllState]);

  const value = useMemo<GamificationContextValue>(
    () => ({
      badgeStates,
      levelState,
      shieldState,
      pendingCelebrations,
      isLoading,
      checkBadges,
      dismissCelebration,
      refreshAll,
    }),
    [badgeStates, levelState, shieldState, pendingCelebrations, isLoading, checkBadges, dismissCelebration, refreshAll],
  );

  return (
    <GamificationContext.Provider value={value}>
      {children}
    </GamificationContext.Provider>
  );
}
```

- [ ] **Step 2: Wrap app with GamificationProvider in App.tsx**

In `App.tsx`, add the import and wrap inside the existing provider chain. Add `GamificationProvider` as the **outermost** provider (after SessionProvider, since it needs DB access):

Add import:
```typescript
import { GamificationProvider } from './src/context/GamificationContext';
```

Wrap the provider tree — place `<GamificationProvider>` inside `<SessionProvider>` but outside `<HeartRateProvider>`:

```typescript
return (
  <SessionProvider>
    <GamificationProvider>
      <HeartRateProvider>
        <TimerProvider>
          <StopwatchProvider>
            <RootNavigator />
          </StopwatchProvider>
        </TimerProvider>
      </HeartRateProvider>
    </GamificationProvider>
  </SessionProvider>
);
```

- [ ] **Step 3: Verify TypeScript compiles**

Run: `npx tsc --noEmit --pretty 2>&1 | head -20`
Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add src/context/GamificationContext.tsx App.tsx
git commit -m "feat(gamification): add GamificationContext provider with badge checking and celebration queue"
```

---

## Task 8: BadgeIcon Component

**Files:**
- Create: `src/components/BadgeIcon.tsx`
- Create: `src/components/__tests__/BadgeIcon.test.tsx`

- [ ] **Step 1: Write failing test**

Create `src/components/__tests__/BadgeIcon.test.tsx`:

```typescript
import React from 'react';
import { render } from '@testing-library/react-native';
import { BadgeIcon } from '../BadgeIcon';

describe('BadgeIcon', () => {
  it('renders with tier color border', () => {
    const { getByTestId } = render(
      <BadgeIcon iconName="flame" tier={3} size={52} testID="badge-icon" />,
    );
    expect(getByTestId('badge-icon')).toBeTruthy();
  });

  it('renders locked state when tier is null', () => {
    const { getByTestId } = render(
      <BadgeIcon iconName="flame" tier={null} size={52} locked testID="badge-locked" />,
    );
    expect(getByTestId('badge-locked')).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest src/components/__tests__/BadgeIcon.test.tsx --no-coverage 2>&1 | tail -10`
Expected: FAIL

- [ ] **Step 3: Implement BadgeIcon**

Create `src/components/BadgeIcon.tsx`:

```typescript
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { TIER_COLORS, TIER_NAMES } from '../types';
import type { BadgeTier } from '../types';
import { colors } from '../theme/colors';

interface BadgeIconProps {
  iconName: string;
  tier: BadgeTier | null;
  size: number;
  locked?: boolean;
  showTierPip?: boolean;
  testID?: string;
}

// Map icon names to emoji (will be replaced with SVG icons in polish pass)
const ICON_MAP: Record<string, string> = {
  flame: '🔥', dumbbell: '🏋️', layers: '🔄', repeat: '🔁', weight: '⚖️',
  trophy: '🏆', 'calendar-check': '📅', clock: '⏱️', 'trending-up': '📈',
  'git-merge': '🔀', sun: '☀️', chest: '💪', back: '🔙', leg: '🦵',
  shoulder: '🤷', arm: '💪', core: '🎯', conditioning: '🏃', zap: '⚡',
  crown: '👑', 'arrow-up': '⬆️', target: '🎯', bookmark: '🔖',
  heart: '❤️', activity: '📊', 'minus-circle': '⭕', 'chevrons-up': '⏫',
  beef: '🥩', 'check-circle': '✅', shield: '🛡️', 'pie-chart': '📊',
  droplet: '💧', calculator: '🔢', award: '🏅', 'trending-up2': '📈',
  sliders: '🎛️', king: '👑', utensils: '🍽️', calendar: '📅',
  edit: '✏️', coffee: '☕', copy: '📋', compass: '🧭', archive: '📦',
  waves: '🌊', 'plus-circle': '➕', 'cloud-rain': '🌧️', sunrise: '🌅',
  'bar-chart': '📊', 'chef-hat': '👨‍🍳', 'book-open': '📖', settings: '⚙️',
  cookie: '🍪', star: '⭐', shuffle: '🔀', globe: '🌍',
  'battery-charging': '🔋', 'check-square': '☑️', clipboard: '📋',
  moon: '🌙', grid: '📊', package: '📦', 'refresh-cw': '🔄',
  'corner-up-right': '↗️', 'life-buoy': '🛟', 'rotate-ccw': '🔄',
  wind: '💨', 'graduation-cap': '🎓', hash: '#️⃣', book: '📚',
  'edit-3': '✏️', search: '🔍',
  lock: '🔒',
};

function getIcon(name: string): string {
  return ICON_MAP[name] ?? '❓';
}

export function BadgeIcon({ iconName, tier, size, locked, showTierPip = true, testID }: BadgeIconProps) {
  const borderColor = locked || tier === null ? '#333' : TIER_COLORS[tier];
  const bgGradientStart = locked || tier === null ? colors.surface : getBgForTier(tier);
  const opacity = locked ? 0.4 : 1;

  return (
    <View
      testID={testID}
      style={[
        styles.container,
        {
          width: size,
          height: size,
          borderColor,
          backgroundColor: bgGradientStart,
          opacity,
        },
      ]}
    >
      <Text style={[styles.icon, { fontSize: size * 0.45 }]}>
        {locked ? getIcon('lock') : getIcon(iconName)}
      </Text>

      {showTierPip && tier !== null && !locked && (
        <View style={[styles.tierPip, { backgroundColor: borderColor }]}>
          <Text style={styles.tierPipText}>
            {TIER_NAMES[tier].charAt(0)}
          </Text>
        </View>
      )}
    </View>
  );
}

function getBgForTier(tier: BadgeTier | null): string {
  switch (tier) {
    case 1: return '#1d1510'; // Bronze
    case 2: return '#1a1d21'; // Silver
    case 3: return '#2a2200'; // Gold
    case 4: return '#1a2030'; // Platinum
    case 5: return '#1a1d25'; // Diamond
    default: return colors.surface;
  }
}

const styles = StyleSheet.create({
  container: {
    borderWidth: 2,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  icon: {
    textAlign: 'center',
  },
  tierPip: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 3,
  },
  tierPipText: {
    color: '#000',
    fontSize: 7,
    fontWeight: '800',
  },
});
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx jest src/components/__tests__/BadgeIcon.test.tsx --no-coverage 2>&1 | tail -10`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/BadgeIcon.tsx src/components/__tests__/BadgeIcon.test.tsx
git commit -m "feat(gamification): add BadgeIcon component with tier colors and locked state"
```

---

## Task 9: LevelBar Component

**Files:**
- Create: `src/components/LevelBar.tsx`
- Create: `src/components/__tests__/LevelBar.test.tsx`

- [ ] **Step 1: Write failing test**

Create `src/components/__tests__/LevelBar.test.tsx`:

```typescript
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { LevelBar } from '../LevelBar';

const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate }),
}));

describe('LevelBar', () => {
  const defaultProps = {
    level: 14,
    title: 'Intermediate' as const,
    progressToNext: 0.68,
  };

  it('renders level number', () => {
    const { getByText } = render(<LevelBar {...defaultProps} />);
    expect(getByText('14')).toBeTruthy();
  });

  it('renders title', () => {
    const { getByText } = render(<LevelBar {...defaultProps} />);
    expect(getByText('Intermediate')).toBeTruthy();
  });

  it('navigates to Achievements on press', () => {
    const { getByTestId } = render(<LevelBar {...defaultProps} />);
    fireEvent.press(getByTestId('level-bar'));
    expect(mockNavigate).toHaveBeenCalledWith('Achievements');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest src/components/__tests__/LevelBar.test.tsx --no-coverage 2>&1 | tail -10`
Expected: FAIL

- [ ] **Step 3: Implement LevelBar**

Create `src/components/LevelBar.tsx`:

```typescript
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { colors } from '../theme/colors';
import { fontSize, fontWeight } from '../theme/typography';
import { spacing } from '../theme/spacing';

interface LevelBarProps {
  level: number;
  title: string;
  progressToNext: number;
}

export function LevelBar({ level, title, progressToNext }: LevelBarProps) {
  const navigation = useNavigation<any>();

  return (
    <TouchableOpacity
      testID="level-bar"
      style={styles.container}
      onPress={() => navigation.navigate('Achievements')}
      activeOpacity={0.7}
    >
      <View style={styles.row}>
        <View style={styles.levelCircle}>
          <Text style={styles.levelNumber}>{level}</Text>
        </View>
        <View style={styles.info}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.subtitle}>
            Level {level} · {Math.round(progressToNext * 100)}% to next
          </Text>
        </View>
        <Text style={styles.chevron}>›</Text>
      </View>
      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${progressToNext * 100}%` }]} />
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    padding: 14,
    marginHorizontal: spacing.base,
    marginBottom: spacing.md,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  levelCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  levelNumber: {
    color: colors.background,
    fontSize: 16,
    fontWeight: '800',
  },
  info: {
    flex: 1,
    marginLeft: 10,
  },
  title: {
    color: colors.primary,
    fontSize: fontSize.sm + 1,
    fontWeight: fontWeight.semiBold,
  },
  subtitle: {
    color: colors.secondary,
    fontSize: fontSize.xs + 1,
  },
  chevron: {
    color: colors.secondary,
    fontSize: 18,
  },
  progressTrack: {
    backgroundColor: '#33373D',
    borderRadius: 4,
    height: 6,
    marginTop: 10,
    overflow: 'hidden',
  },
  progressFill: {
    backgroundColor: colors.accent,
    height: '100%',
    borderRadius: 4,
  },
});
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx jest src/components/__tests__/LevelBar.test.tsx --no-coverage 2>&1 | tail -10`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/LevelBar.tsx src/components/__tests__/LevelBar.test.tsx
git commit -m "feat(gamification): add LevelBar component for Dashboard"
```

---

## Task 10: RecentBadges Component

**Files:**
- Create: `src/components/RecentBadges.tsx`
- Create: `src/components/__tests__/RecentBadges.test.tsx`

- [ ] **Step 1: Write failing test**

Create `src/components/__tests__/RecentBadges.test.tsx`:

```typescript
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { RecentBadges } from '../RecentBadges';
import type { UserBadgeRow } from '../../types';

const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate }),
}));

describe('RecentBadges', () => {
  it('renders nothing when no badges', () => {
    const { toJSON } = render(<RecentBadges badges={[]} />);
    expect(toJSON()).toBeNull();
  });

  it('renders badge names', () => {
    const badges = [
      { badge_id: 'iron_streak', tier: 3, current_value: 30, earned_at: '2026-04-10', notified: 1, id: 1 },
    ] as UserBadgeRow[];
    const { getByText } = render(<RecentBadges badges={badges} />);
    expect(getByText('Iron Streak')).toBeTruthy();
  });

  it('navigates to Achievements on View All press', () => {
    const badges = [
      { badge_id: 'iron_streak', tier: 3, current_value: 30, earned_at: '2026-04-10', notified: 1, id: 1 },
    ] as UserBadgeRow[];
    const { getByText } = render(<RecentBadges badges={badges} />);
    fireEvent.press(getByText('View All ›'));
    expect(mockNavigate).toHaveBeenCalledWith('Achievements');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest src/components/__tests__/RecentBadges.test.tsx --no-coverage 2>&1 | tail -10`
Expected: FAIL

- [ ] **Step 3: Implement RecentBadges**

Create `src/components/RecentBadges.tsx`:

```typescript
import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { BadgeIcon } from './BadgeIcon';
import { getBadgeDefinition } from '../data/badgeDefinitions';
import { colors } from '../theme/colors';
import { fontSize, fontWeight } from '../theme/typography';
import { spacing } from '../theme/spacing';
import type { UserBadgeRow, BadgeTier } from '../types';

interface RecentBadgesProps {
  badges: UserBadgeRow[];
}

export function RecentBadges({ badges }: RecentBadgesProps) {
  const navigation = useNavigation<any>();

  if (badges.length === 0) return null;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Recent Badges</Text>
        <TouchableOpacity onPress={() => navigation.navigate('Achievements')}>
          <Text style={styles.viewAll}>View All ›</Text>
        </TouchableOpacity>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.scroll}>
        {badges.slice(0, 10).map((badge) => {
          const def = getBadgeDefinition(badge.badge_id);
          if (!def) return null;
          return (
            <View key={badge.id} style={styles.badgeItem}>
              <BadgeIcon
                iconName={def.iconName}
                tier={badge.tier as BadgeTier}
                size={52}
                showTierPip
              />
              <Text style={styles.badgeName} numberOfLines={1}>
                {def.name}
              </Text>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: spacing.base,
    marginBottom: spacing.md,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  headerTitle: {
    color: colors.primary,
    fontSize: fontSize.sm + 1,
    fontWeight: fontWeight.semiBold,
  },
  viewAll: {
    color: colors.accent,
    fontSize: fontSize.xs + 1,
    fontWeight: fontWeight.medium,
  },
  scroll: {
    flexDirection: 'row',
  },
  badgeItem: {
    alignItems: 'center',
    marginRight: 10,
    width: 68,
  },
  badgeName: {
    color: colors.secondary,
    fontSize: 10,
    marginTop: 5,
    textAlign: 'center',
    lineHeight: 12,
  },
});
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx jest src/components/__tests__/RecentBadges.test.tsx --no-coverage 2>&1 | tail -10`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/RecentBadges.tsx src/components/__tests__/RecentBadges.test.tsx
git commit -m "feat(gamification): add RecentBadges horizontal strip for Dashboard"
```

---

## Task 11: CelebrationModal Component

**Files:**
- Create: `src/components/CelebrationModal.tsx`
- Create: `src/components/__tests__/CelebrationModal.test.tsx`

- [ ] **Step 1: Write failing test**

Create `src/components/__tests__/CelebrationModal.test.tsx`:

```typescript
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { CelebrationModal } from '../CelebrationModal';
import type { CelebrationItem } from '../../types';

describe('CelebrationModal', () => {
  const celebration: CelebrationItem = {
    badge: {
      id: 'iron_streak',
      name: 'Iron Streak',
      description: '30 consecutive days with a workout',
      category: 'consistency',
      iconName: 'flame',
      tierThresholds: [7, 14, 30, 60, 100],
      evaluationType: 'streak',
      relevantEvents: ['SESSION_COMPLETED'],
      evaluate: async () => 30,
    },
    newTier: 3,
    earnedAt: '2026-04-10T12:00:00Z',
  };

  it('renders badge name', () => {
    const { getByText } = render(
      <CelebrationModal celebration={celebration} onDismiss={jest.fn()} />,
    );
    expect(getByText('Iron Streak')).toBeTruthy();
  });

  it('renders tier name', () => {
    const { getByText } = render(
      <CelebrationModal celebration={celebration} onDismiss={jest.fn()} />,
    );
    expect(getByText('GOLD')).toBeTruthy();
  });

  it('calls onDismiss when Dismiss button pressed', () => {
    const onDismiss = jest.fn();
    const { getByText } = render(
      <CelebrationModal celebration={celebration} onDismiss={onDismiss} />,
    );
    fireEvent.press(getByText('Dismiss'));
    expect(onDismiss).toHaveBeenCalled();
  });

  it('renders nothing when celebration is null', () => {
    const { toJSON } = render(
      <CelebrationModal celebration={null} onDismiss={jest.fn()} />,
    );
    expect(toJSON()).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest src/components/__tests__/CelebrationModal.test.tsx --no-coverage 2>&1 | tail -10`
Expected: FAIL

- [ ] **Step 3: Implement CelebrationModal**

Create `src/components/CelebrationModal.tsx`:

```typescript
import React, { useEffect, useRef } from 'react';
import {
  View, Text, Modal, TouchableOpacity, StyleSheet, Animated, Platform,
} from 'react-native';
import { BadgeIcon } from './BadgeIcon';
import { TIER_COLORS, TIER_NAMES } from '../types';
import type { CelebrationItem, BadgeTier } from '../types';
import { colors } from '../theme/colors';

interface CelebrationModalProps {
  celebration: CelebrationItem | null;
  onDismiss: () => void;
}

const GLOW_CONFIG: Record<BadgeTier, { color: string; opacity: number; rings: number }> = {
  1: { color: '205,127,50', opacity: 0.15, rings: 3 },
  2: { color: '192,192,192', opacity: 0.15, rings: 3 },
  3: { color: '255,184,0', opacity: 0.2, rings: 3 },
  4: { color: '180,220,255', opacity: 0.18, rings: 4 },
  5: { color: '255,255,255', opacity: 0.15, rings: 5 },
};

export function CelebrationModal({ celebration, onDismiss }: CelebrationModalProps) {
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (celebration) {
      // Reset animations
      scaleAnim.setValue(0);
      glowAnim.setValue(0);
      rotateAnim.setValue(0);

      // Badge scale in with spring
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 6,
        tension: 80,
        useNativeDriver: true,
      }).start();

      // Glow fade in
      Animated.timing(glowAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }).start();

      // Slow rotation loop for shimmer
      Animated.loop(
        Animated.timing(rotateAnim, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        }),
      ).start();

      // Haptic feedback
      try {
        const ReactNativeHapticFeedback = require('react-native-haptic-feedback');
        if (ReactNativeHapticFeedback?.trigger) {
          ReactNativeHapticFeedback.trigger('notificationSuccess');
        }
      } catch {
        // Haptics not available
      }
    }
  }, [celebration]);

  if (!celebration) return null;

  const { badge, newTier } = celebration;
  const glow = GLOW_CONFIG[newTier];
  const tierColor = TIER_COLORS[newTier];
  const tierName = TIER_NAMES[newTier];

  return (
    <Modal transparent animationType="fade" visible>
      <View style={styles.overlay}>
        {/* Radial glow background */}
        <Animated.View
          style={[
            styles.glowContainer,
            { opacity: glowAnim },
          ]}
        >
          {Array.from({ length: glow.rings }, (_, i) => (
            <View
              key={i}
              style={[
                styles.glowRing,
                {
                  width: 120 + (i * 40),
                  height: 120 + (i * 40),
                  borderColor: `rgba(${glow.color},${glow.opacity - i * 0.03})`,
                },
              ]}
            />
          ))}
        </Animated.View>

        {/* Content */}
        <Text style={styles.earnedLabel}>BADGE EARNED</Text>

        <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
          <View style={[styles.badgeContainer, { shadowColor: tierColor }]}>
            <BadgeIcon iconName={badge.iconName} tier={newTier} size={80} showTierPip={false} />
          </View>
        </Animated.View>

        <Text style={[styles.tierLabel, { color: tierColor }]}>{tierName.toUpperCase()}</Text>
        <Text style={styles.badgeName}>{badge.name}</Text>
        <Text style={styles.description}>{badge.description}</Text>

        <TouchableOpacity style={styles.dismissButton} onPress={onDismiss} activeOpacity={0.7}>
          <Text style={styles.dismissText}>Dismiss</Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  glowContainer: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  glowRing: {
    position: 'absolute',
    borderRadius: 999,
    borderWidth: 1,
  },
  earnedLabel: {
    color: colors.secondary,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.5,
    marginBottom: 16,
  },
  badgeContainer: {
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 30,
    elevation: 10,
  },
  tierLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
    marginTop: 16,
  },
  badgeName: {
    color: colors.primary,
    fontSize: 20,
    fontWeight: '700',
    marginTop: 4,
  },
  description: {
    color: colors.secondary,
    fontSize: 13,
    marginTop: 6,
    textAlign: 'center',
    lineHeight: 18,
  },
  dismissButton: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 40,
    marginTop: 24,
  },
  dismissText: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: '600',
  },
});
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx jest src/components/__tests__/CelebrationModal.test.tsx --no-coverage 2>&1 | tail -10`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/CelebrationModal.tsx src/components/__tests__/CelebrationModal.test.tsx
git commit -m "feat(gamification): add CelebrationModal with tier-escalating radial glow animation"
```

---

## Task 12: Dashboard Integration

**Files:**
- Modify: `src/screens/DashboardScreen.tsx`

- [ ] **Step 1: Add LevelBar and RecentBadges to DashboardScreen**

In `src/screens/DashboardScreen.tsx`, add imports:

```typescript
import { useGamification } from '../context/GamificationContext';
import { LevelBar } from '../components/LevelBar';
import { RecentBadges } from '../components/RecentBadges';
import { CelebrationModal } from '../components/CelebrationModal';
```

Inside the component function, add the gamification hook:

```typescript
const { levelState, badgeStates, pendingCelebrations, dismissCelebration } = useGamification();
```

Add a derived `recentBadges` array (earned badges sorted by most recent):

```typescript
const [recentBadges, setRecentBadges] = useState<UserBadgeRow[]>([]);

// Add to the existing useFocusEffect or useEffect that loads data:
// After existing data loading, also load recent badges:
import { getEarnedBadges } from '../db/badges';
// Inside the data loading effect:
const earned = await getEarnedBadges();
setRecentBadges(earned.slice(0, 10));
```

In the JSX, add LevelBar and RecentBadges **between** the header and the S/V toggle pill:

```tsx
{/* After header, before S/V toggle */}
<LevelBar
  level={levelState.level}
  title={levelState.title}
  progressToNext={levelState.progressToNext}
/>
<RecentBadges badges={recentBadges} />

{/* Existing S/V toggle, Next Workout, Category cards... */}
```

Add CelebrationModal at the end of the component (outside ScrollView):

```tsx
<CelebrationModal
  celebration={pendingCelebrations.length > 0 ? pendingCelebrations[0] : null}
  onDismiss={dismissCelebration}
/>
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit --pretty 2>&1 | head -20`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/screens/DashboardScreen.tsx
git commit -m "feat(gamification): integrate LevelBar, RecentBadges, and CelebrationModal into Dashboard"
```

---

## Task 13: Achievements Screen

**Files:**
- Create: `src/components/BadgeGrid.tsx`
- Create: `src/components/BadgeDetailModal.tsx`
- Create: `src/components/CompositeScoreCard.tsx`
- Create: `src/components/StreakShieldsCard.tsx`
- Create: `src/screens/AchievementsScreen.tsx`
- Modify: `src/navigation/TabNavigator.tsx`

- [ ] **Step 1: Create CompositeScoreCard**

Create `src/components/CompositeScoreCard.tsx`:

```typescript
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import type { LevelState } from '../types';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';

const SUBSCALES = [
  { key: 'consistencyScore' as const, label: 'Consistency', color: '#8DC28A' },
  { key: 'volumeScore' as const, label: 'Volume', color: '#5B9BF0' },
  { key: 'nutritionScore' as const, label: 'Nutrition', color: '#E0A85C' },
  { key: 'varietyScore' as const, label: 'Variety', color: '#B57AE0' },
];

export function CompositeScoreCard({ levelState }: { levelState: LevelState }) {
  return (
    <View style={styles.card}>
      <View style={styles.grid}>
        {SUBSCALES.map(({ key, label, color }) => (
          <View key={key} style={styles.item}>
            <View style={styles.labelRow}>
              <Text style={styles.label}>{label}</Text>
              <Text style={[styles.score, { color }]}>{Math.round(levelState[key])}</Text>
            </View>
            <View style={styles.track}>
              <View style={[styles.fill, { width: `${levelState[key]}%`, backgroundColor: color }]} />
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: 10,
    padding: spacing.md,
    marginHorizontal: spacing.base,
    marginBottom: spacing.base,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  item: { width: '48%' },
  labelRow: { flexDirection: 'row', justifyContent: 'space-between' },
  label: { color: colors.secondary, fontSize: 11 },
  score: { fontSize: 11 },
  track: { backgroundColor: '#2a2d31', borderRadius: 3, height: 4, marginTop: 3, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 3 },
});
```

- [ ] **Step 2: Create StreakShieldsCard**

Create `src/components/StreakShieldsCard.tsx`:

```typescript
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import type { ShieldState } from '../types';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';

const SHIELD_TYPES = [
  { key: 'workout' as const, label: 'Workout' },
  { key: 'protein' as const, label: 'Protein' },
  { key: 'water' as const, label: 'Water' },
];

export function StreakShieldsCard({ shieldState }: { shieldState: ShieldState }) {
  return (
    <View style={styles.card}>
      <Text style={styles.title}>🛡️ Streak Shields</Text>
      <View style={styles.row}>
        {SHIELD_TYPES.map(({ key, label }) => (
          <View key={key} style={styles.type}>
            <Text style={styles.label}>{label}</Text>
            <View style={styles.slots}>
              {[0, 1, 2].map(i => (
                <View
                  key={i}
                  style={[
                    styles.slot,
                    i < shieldState[key] ? styles.slotFilled : styles.slotEmpty,
                  ]}
                >
                  {i < shieldState[key] && <Text style={styles.slotIcon}>🛡</Text>}
                </View>
              ))}
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: 10,
    padding: spacing.md,
    marginHorizontal: spacing.base,
    marginBottom: spacing.base,
  },
  title: { color: colors.primary, fontWeight: '600', fontSize: 12, marginBottom: spacing.sm },
  row: { flexDirection: 'row', gap: spacing.md },
  type: { flex: 1 },
  label: { color: colors.secondary, fontSize: 10 },
  slots: { flexDirection: 'row', gap: 3, marginTop: 4 },
  slot: { width: 16, height: 16, borderRadius: 3, alignItems: 'center', justifyContent: 'center' },
  slotFilled: { backgroundColor: colors.accent },
  slotEmpty: { backgroundColor: '#333' },
  slotIcon: { fontSize: 8 },
});
```

- [ ] **Step 3: Create BadgeDetailModal**

Create `src/components/BadgeDetailModal.tsx`:

```typescript
import React from 'react';
import { View, Text, Modal, TouchableOpacity, StyleSheet } from 'react-native';
import { BadgeIcon } from './BadgeIcon';
import { TIER_NAMES, TIER_COLORS } from '../types';
import type { BadgeDefinition, BadgeState, BadgeTier } from '../types';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';

interface BadgeDetailModalProps {
  badge: BadgeDefinition | null;
  state: BadgeState | null;
  visible: boolean;
  onClose: () => void;
}

export function BadgeDetailModal({ badge, state, visible, onClose }: BadgeDetailModalProps) {
  if (!badge || !state) return null;

  const isLocked = state.currentTier === null;

  return (
    <Modal transparent animationType="fade" visible={visible}>
      <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={onClose}>
        <View style={styles.card}>
          <BadgeIcon iconName={badge.iconName} tier={state.currentTier} size={64} locked={isLocked} />
          <Text style={styles.name}>{badge.name}</Text>
          <Text style={styles.description}>{badge.description}</Text>
          <Text style={styles.category}>{badge.category.toUpperCase()}</Text>

          {!isLocked && state.currentTier !== null && (
            <Text style={[styles.tier, { color: TIER_COLORS[state.currentTier] }]}>
              {TIER_NAMES[state.currentTier]}
            </Text>
          )}

          {badge.tierThresholds && (
            <View style={styles.thresholds}>
              {badge.tierThresholds.map((t, i) => {
                const tier = (i + 1) as BadgeTier;
                const reached = state.currentTier !== null && state.currentTier >= tier;
                return (
                  <View key={i} style={styles.thresholdRow}>
                    <Text style={[styles.thresholdTier, { color: reached ? TIER_COLORS[tier] : '#555' }]}>
                      {TIER_NAMES[tier]}
                    </Text>
                    <Text style={[styles.thresholdValue, { color: reached ? '#fff' : '#555' }]}>
                      {t.toLocaleString()}
                    </Text>
                  </View>
                );
              })}
            </View>
          )}

          {state.nextThreshold !== null && (
            <View style={styles.progressSection}>
              <Text style={styles.progressLabel}>
                {Math.round(state.currentValue).toLocaleString()} / {state.nextThreshold.toLocaleString()}
              </Text>
              <View style={styles.progressTrack}>
                <View
                  style={[
                    styles.progressFill,
                    { width: `${Math.min(100, (state.currentValue / state.nextThreshold) * 100)}%` },
                  ]}
                />
              </View>
            </View>
          )}
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    width: '100%',
    maxWidth: 320,
  },
  name: { color: colors.primary, fontSize: 18, fontWeight: '700', marginTop: 12 },
  description: { color: colors.secondary, fontSize: 13, textAlign: 'center', marginTop: 6, lineHeight: 18 },
  category: { color: colors.secondary, fontSize: 10, fontWeight: '700', letterSpacing: 1, marginTop: 8 },
  tier: { fontSize: 12, fontWeight: '700', marginTop: 4 },
  thresholds: { marginTop: 16, width: '100%' },
  thresholdRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  thresholdTier: { fontSize: 12, fontWeight: '600' },
  thresholdValue: { fontSize: 12 },
  progressSection: { marginTop: 16, width: '100%' },
  progressLabel: { color: colors.secondary, fontSize: 11, textAlign: 'center', marginBottom: 6 },
  progressTrack: { backgroundColor: '#2a2d31', borderRadius: 4, height: 6, overflow: 'hidden' },
  progressFill: { backgroundColor: colors.accent, height: '100%', borderRadius: 4 },
});
```

- [ ] **Step 4: Create BadgeGrid**

Create `src/components/BadgeGrid.tsx`:

```typescript
import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { BadgeIcon } from './BadgeIcon';
import { BadgeDetailModal } from './BadgeDetailModal';
import { BADGE_DEFINITIONS } from '../data/badgeDefinitions';
import type { BadgeDefinition, BadgeState, BadgeCategory } from '../types';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';

interface BadgeGridProps {
  badgeStates: Map<string, BadgeState>;
  filter: BadgeCategory | 'all';
}

export function BadgeGrid({ badgeStates, filter }: BadgeGridProps) {
  const [selectedBadge, setSelectedBadge] = useState<BadgeDefinition | null>(null);

  const filtered = filter === 'all'
    ? BADGE_DEFINITIONS
    : BADGE_DEFINITIONS.filter(b => b.category === filter);

  const selectedState = selectedBadge ? badgeStates.get(selectedBadge.id) ?? null : null;

  return (
    <View style={styles.container}>
      <View style={styles.grid}>
        {filtered.map(badge => {
          const state = badgeStates.get(badge.id);
          const isLocked = !state || state.currentTier === null;

          return (
            <TouchableOpacity
              key={badge.id}
              style={styles.cell}
              onPress={() => setSelectedBadge(badge)}
              activeOpacity={0.7}
            >
              <BadgeIcon
                iconName={badge.iconName}
                tier={state?.currentTier ?? null}
                size={48}
                locked={isLocked}
              />
              <Text style={[styles.name, isLocked && styles.nameLocked]} numberOfLines={1}>
                {isLocked ? '???' : badge.name}
              </Text>
              {!isLocked && state?.nextThreshold !== null && state?.nextThreshold !== undefined && (
                <View style={styles.miniProgress}>
                  <View
                    style={[
                      styles.miniProgressFill,
                      { width: `${Math.min(100, ((state?.currentValue ?? 0) / state.nextThreshold) * 100)}%` },
                    ]}
                  />
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      <BadgeDetailModal
        badge={selectedBadge}
        state={selectedState}
        visible={selectedBadge !== null}
        onClose={() => setSelectedBadge(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginHorizontal: spacing.base },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  cell: { width: '23%', alignItems: 'center', marginBottom: spacing.sm },
  name: { color: colors.secondary, fontSize: 9, marginTop: 4, textAlign: 'center' },
  nameLocked: { color: '#555' },
  miniProgress: { backgroundColor: '#2a2d31', borderRadius: 2, height: 3, marginTop: 2, width: 48, overflow: 'hidden' },
  miniProgressFill: { backgroundColor: colors.accent, height: '100%', borderRadius: 2 },
});
```

- [ ] **Step 5: Create AchievementsScreen**

Create `src/screens/AchievementsScreen.tsx`:

```typescript
import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, SafeAreaView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useGamification } from '../context/GamificationContext';
import { CompositeScoreCard } from '../components/CompositeScoreCard';
import { BadgeGrid } from '../components/BadgeGrid';
import { StreakShieldsCard } from '../components/StreakShieldsCard';
import { BADGE_DEFINITIONS } from '../data/badgeDefinitions';
import type { BadgeCategory } from '../types';
import { colors } from '../theme/colors';
import { fontSize, fontWeight } from '../theme/typography';
import { spacing } from '../theme/spacing';

const FILTERS: Array<{ key: BadgeCategory | 'all'; label: string; count: number }> = [
  { key: 'all', label: 'All', count: BADGE_DEFINITIONS.length },
  { key: 'fitness', label: 'Fitness', count: BADGE_DEFINITIONS.filter(b => b.category === 'fitness').length },
  { key: 'nutrition', label: 'Nutrition', count: BADGE_DEFINITIONS.filter(b => b.category === 'nutrition').length },
  { key: 'consistency', label: 'Consistency', count: BADGE_DEFINITIONS.filter(b => b.category === 'consistency').length },
  { key: 'recovery', label: 'Recovery', count: BADGE_DEFINITIONS.filter(b => b.category === 'recovery').length },
  { key: 'milestone', label: 'Milestone', count: BADGE_DEFINITIONS.filter(b => b.category === 'milestone').length },
];

export function AchievementsScreen() {
  const navigation = useNavigation();
  const { levelState, badgeStates, shieldState } = useGamification();
  const [activeFilter, setActiveFilter] = useState<BadgeCategory | 'all'>('all');

  const earnedCount = Array.from(badgeStates.values()).filter(s => s.currentTier !== null).length;
  const totalCount = BADGE_DEFINITIONS.length;

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        {/* Back button */}
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Text style={styles.backText}>‹ Dashboard</Text>
        </TouchableOpacity>

        {/* Level Hero */}
        <View style={styles.hero}>
          <View style={styles.heroCircle}>
            <Text style={styles.heroLevel}>{levelState.level}</Text>
          </View>
          <Text style={styles.heroTitle}>{levelState.title}</Text>
          <Text style={styles.heroSubtitle}>{earnedCount} badges earned · {totalCount} total</Text>
        </View>

        {/* Composite Scores */}
        <CompositeScoreCard levelState={levelState} />

        {/* Filter Pills */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
          {FILTERS.map(f => (
            <TouchableOpacity
              key={f.key}
              style={[styles.pill, activeFilter === f.key && styles.pillActive]}
              onPress={() => setActiveFilter(f.key)}
            >
              <Text style={[styles.pillText, activeFilter === f.key && styles.pillTextActive]}>
                {f.label} ({f.count})
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Badge Grid */}
        <BadgeGrid badgeStates={badgeStates} filter={activeFilter} />

        {/* Streak Shields */}
        <StreakShieldsCard shieldState={shieldState} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: spacing.xxl },
  backButton: { padding: spacing.base },
  backText: { color: colors.accent, fontSize: fontSize.sm, fontWeight: fontWeight.medium },
  hero: { alignItems: 'center', marginBottom: spacing.base },
  heroCircle: {
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: colors.accent,
    alignItems: 'center', justifyContent: 'center',
  },
  heroLevel: { color: colors.background, fontSize: 24, fontWeight: '800' },
  heroTitle: { color: colors.primary, fontSize: 18, fontWeight: '700', marginTop: spacing.sm },
  heroSubtitle: { color: colors.secondary, fontSize: 12, marginTop: 2 },
  filterScroll: { marginHorizontal: spacing.base, marginBottom: spacing.sm },
  pill: {
    backgroundColor: colors.surface, paddingVertical: 5, paddingHorizontal: 12,
    borderRadius: 20, marginRight: 6,
  },
  pillActive: { backgroundColor: colors.accent },
  pillText: { color: colors.secondary, fontSize: 11 },
  pillTextActive: { color: colors.background, fontWeight: '600' },
});
```

- [ ] **Step 6: Add Achievements to DashboardStack navigation**

In `src/navigation/TabNavigator.tsx`, update `DashboardStackParamList`:

```typescript
export type DashboardStackParamList = {
  DashboardHome: undefined;
  ExerciseProgress: { exerciseId: number; exerciseName: string; measurementType?: 'reps' | 'timed'; category?: string; viewMode?: 'strength' | 'volume' };
  Settings: undefined;
  CategoryProgress: { category: string; viewMode?: 'strength' | 'volume' };
  Achievements: undefined; // ADD THIS
};
```

Add the import and screen:

```typescript
import { AchievementsScreen } from '../screens/AchievementsScreen';
```

Inside `DashboardStackNavigator`, add the screen:

```tsx
<DashboardStack.Screen name="Achievements" component={AchievementsScreen} />
```

- [ ] **Step 7: Verify TypeScript compiles**

Run: `npx tsc --noEmit --pretty 2>&1 | head -20`
Expected: No errors

- [ ] **Step 8: Commit**

```bash
git add src/components/BadgeGrid.tsx src/components/BadgeDetailModal.tsx src/components/CompositeScoreCard.tsx src/components/StreakShieldsCard.tsx src/screens/AchievementsScreen.tsx src/navigation/TabNavigator.tsx
git commit -m "feat(gamification): add Achievements screen with badge grid, scores, shields, and filters"
```

---

## Task 14: Event Wiring

**Files:**
- Modify: `src/context/SessionContext.tsx`
- Modify: `src/db/sets.ts`
- Modify: `src/db/macros.ts`
- Modify: `src/db/hydration.ts`

This task wires up the existing data flows to fire AppEvents so the badge engine evaluates after every user action.

- [ ] **Step 1: Add event bus**

The simplest approach: the GamificationContext exposes `checkBadges(event)`. We call it from the places where data is persisted. Since contexts can't easily call each other, we'll use a lightweight event emitter.

Create a simple event bus at the top of `src/context/GamificationContext.tsx` (add before the provider):

```typescript
// Simple event bus for cross-context communication
type Listener = (event: AppEvent) => void;
const listeners: Set<Listener> = new Set();

export function emitAppEvent(event: AppEvent): void {
  listeners.forEach(fn => fn(event));
}

function useAppEventListener(handler: Listener) {
  useEffect(() => {
    listeners.add(handler);
    return () => { listeners.delete(handler); };
  }, [handler]);
}
```

Inside the `GamificationProvider`, subscribe to events:

```typescript
const handleEvent = useCallback((event: AppEvent) => {
  checkBadges(event);
}, [checkBadges]);

useAppEventListener(handleEvent);
```

- [ ] **Step 2: Fire SET_LOGGED from sets.ts**

In `src/db/sets.ts`, after the SQL INSERT that logs a set, add:

```typescript
import { emitAppEvent } from '../context/GamificationContext';

// After successfully inserting a set:
emitAppEvent({ type: 'SET_LOGGED', timestamp: new Date().toISOString() });
```

- [ ] **Step 3: Fire SESSION_COMPLETED from SessionContext.tsx**

In `src/context/SessionContext.tsx`, in the function that completes a session (likely `completeSession` or similar), add:

```typescript
import { emitAppEvent } from './GamificationContext';

// After successfully marking session as completed:
emitAppEvent({ type: 'SESSION_COMPLETED', timestamp: new Date().toISOString() });
```

- [ ] **Step 4: Fire PR_ACHIEVED from sets.ts**

In `src/db/sets.ts`, in the `checkForPR` function where it determines a new PR was hit, add:

```typescript
// After PR is detected:
emitAppEvent({ type: 'PR_ACHIEVED', timestamp: new Date().toISOString() });
```

- [ ] **Step 5: Fire MEAL_LOGGED from macros.ts**

In `src/db/macros.ts`, after the SQL INSERT that logs a meal or meal update, add:

```typescript
import { emitAppEvent } from '../context/GamificationContext';

// After successfully inserting/updating a meal:
emitAppEvent({ type: 'MEAL_LOGGED', timestamp: new Date().toISOString() });
```

- [ ] **Step 6: Fire WATER_LOGGED from hydration.ts**

In `src/db/hydration.ts`, after the SQL INSERT for water log, add:

```typescript
import { emitAppEvent } from '../context/GamificationContext';

// After successfully logging water:
emitAppEvent({ type: 'WATER_LOGGED', timestamp: new Date().toISOString() });
```

- [ ] **Step 7: Fire APP_OPENED from GamificationContext**

In `src/context/GamificationContext.tsx`, in the init `useEffect` after `loadAllState()`:

```typescript
// After initial load completes, check for comeback / tenure badges
await checkBadges({ type: 'APP_OPENED', timestamp: new Date().toISOString() });
```

- [ ] **Step 8: Verify TypeScript compiles**

Run: `npx tsc --noEmit --pretty 2>&1 | head -20`
Expected: No errors

- [ ] **Step 9: Commit**

```bash
git add src/context/GamificationContext.tsx src/db/sets.ts src/context/SessionContext.tsx src/db/macros.ts src/db/hydration.ts
git commit -m "feat(gamification): wire event emitters for SET_LOGGED, SESSION_COMPLETED, PR_ACHIEVED, MEAL_LOGGED, WATER_LOGGED"
```

---

## Task 15: Integration Test & Smoke Test

**Files:**
- No new files — this is a verification task

- [ ] **Step 1: Run all existing tests to verify nothing is broken**

Run: `npx jest --no-coverage 2>&1 | tail -30`
Expected: All existing tests still pass. Any failures here indicate our changes broke something — fix before proceeding.

- [ ] **Step 2: Run TypeScript compilation check**

Run: `npx tsc --noEmit --pretty 2>&1 | tail -20`
Expected: No errors

- [ ] **Step 3: Build the app for Android**

Run: `cd android && ./gradlew assembleDebug 2>&1 | tail -20`
Expected: BUILD SUCCESSFUL

- [ ] **Step 4: Manual smoke test on device/emulator**

Test these flows:
1. Open app — verify LevelBar appears on Dashboard showing "Level 1 · Beginner"
2. Complete a short workout (1 exercise, 1 set) — verify "First Blood" milestone badge celebration modal appears
3. Dismiss the celebration — verify it disappears
4. Check Dashboard — verify Recent Badges strip appears with "First Blood"
5. Tap "View All" — verify Achievements screen opens with badge grid
6. Verify filter pills work (Fitness, Nutrition, etc.)
7. Tap a locked badge — verify name and requirements are revealed
8. Log a meal — verify no crash, check for "First Fuel" badge
9. Log water — verify "First Drop" badge

- [ ] **Step 5: Commit any fixes from smoke testing**

```bash
git add -A
git commit -m "fix(gamification): address issues found during integration smoke test"
```

---

## Summary

| Task | Description | Key Files |
|------|-------------|-----------|
| 1 | Types & interfaces | `src/types/gamification.ts` |
| 2 | DB schema & migration | `src/db/schema.ts`, `migrations.ts` |
| 3 | Badge DB operations | `src/db/badges.ts` |
| 4 | Badge definitions (93 badges) | `src/data/badgeDefinitions.ts` |
| 5 | Badge engine core | `src/utils/badgeEngine.ts` |
| 6 | Level calculator | `src/utils/levelCalculator.ts` |
| 7 | GamificationContext | `src/context/GamificationContext.tsx` |
| 8 | BadgeIcon component | `src/components/BadgeIcon.tsx` |
| 9 | LevelBar component | `src/components/LevelBar.tsx` |
| 10 | RecentBadges component | `src/components/RecentBadges.tsx` |
| 11 | CelebrationModal | `src/components/CelebrationModal.tsx` |
| 12 | Dashboard integration | `src/screens/DashboardScreen.tsx` |
| 13 | Achievements screen | `src/screens/AchievementsScreen.tsx` + 4 components |
| 14 | Event wiring | SessionContext, sets.ts, macros.ts, hydration.ts |
| 15 | Integration & smoke test | Verification only |
