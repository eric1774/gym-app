# Score-Based Leveling System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wire up the 4 score dimensions (Consistency, Fitness, Nutrition, Variety) so they are calculated from real user data + badge bonuses, fixing the bug where all users are stuck at level 1.

**Architecture:** A new `scoreCalculator.ts` module queries raw workout/nutrition/hydration data across two time windows (90-day + all-time), computes a weighted blend per dimension, adds badge tier bonuses, and returns scores that feed into the existing `calculateCompositeLevel()`. The rename from `volume` → `fitness` is done via a DB migration and type updates.

**Tech Stack:** React Native, react-native-sqlite-storage, existing gamification context

**Spec:** `docs/superpowers/specs/2026-04-13-score-based-leveling-design.md`

---

## File Structure

| Action | File | Responsibility |
|--------|------|---------------|
| Create | `src/utils/scoreCalculator.ts` | All 4 raw score queries + badge bonus calculation + blending |
| Modify | `src/db/migrations.ts` | Migration 18: rename `volume_score` → `fitness_score` in `user_level` |
| Modify | `src/types/gamification.ts` | Rename `volumeScore` → `fitnessScore` in `LevelState` and `UserLevelRow` |
| Modify | `src/utils/levelCalculator.ts` | Rename param `volumeScore` → `fitnessScore` |
| Modify | `src/db/badges.ts` | Rename `volume` → `fitness` in `updateUserLevel()` and `getUserLevel()` |
| Modify | `src/context/GamificationContext.tsx` | Call `calculateAllScores()` in `checkBadges()` and `backfillBadges()`, update volume→fitness refs |

---

### Task 1: DB Migration — Rename volume_score to fitness_score

Add migration 18 that renames the column and update all type references.

**Files:**
- Modify: `src/db/migrations.ts`
- Modify: `src/types/gamification.ts`
- Modify: `src/utils/levelCalculator.ts`
- Modify: `src/db/badges.ts`
- Modify: `src/context/GamificationContext.tsx`

- [ ] **Step 1: Add migration 18 to migrations.ts**

At the end of the `migrations` array in `src/db/migrations.ts`, after the closing `}` of version 17, add:

```typescript
  {
    version: 18,
    description: 'Rename volume_score to fitness_score in user_level',
    up: (tx: Transaction) => {
      // SQLite < 3.25 doesn't support RENAME COLUMN — recreate the table
      tx.executeSql(`CREATE TABLE user_level_new (
        id INTEGER PRIMARY KEY,
        current_level INTEGER NOT NULL DEFAULT 1,
        title TEXT NOT NULL DEFAULT 'Beginner',
        consistency_score REAL NOT NULL DEFAULT 0,
        fitness_score REAL NOT NULL DEFAULT 0,
        nutrition_score REAL NOT NULL DEFAULT 0,
        variety_score REAL NOT NULL DEFAULT 0,
        last_calculated TEXT NOT NULL DEFAULT (datetime('now'))
      )`);
      tx.executeSql(`INSERT INTO user_level_new (id, current_level, title, consistency_score, fitness_score, nutrition_score, variety_score, last_calculated)
        SELECT id, current_level, title, consistency_score, volume_score, nutrition_score, variety_score, last_calculated FROM user_level`);
      tx.executeSql(`DROP TABLE user_level`);
      tx.executeSql(`ALTER TABLE user_level_new RENAME TO user_level`);
    },
  },
```

- [ ] **Step 2: Update UserLevelRow in types/gamification.ts**

In `src/types/gamification.ts`, find the `UserLevelRow` interface (line 94) and change `volume_score` to `fitness_score`:

```typescript
export interface UserLevelRow {
  id: number;
  current_level: number;
  title: string;
  consistency_score: number;
  fitness_score: number;
  nutrition_score: number;
  variety_score: number;
  last_calculated: string;
}
```

- [ ] **Step 3: Update LevelState in types/gamification.ts**

In `src/types/gamification.ts`, find the `LevelState` interface (line 114) and change `volumeScore` to `fitnessScore`:

```typescript
export interface LevelState {
  level: number;
  title: string;
  consistencyScore: number;
  fitnessScore: number;
  nutritionScore: number;
  varietyScore: number;
  progressToNext: number;
}
```

- [ ] **Step 4: Update calculateCompositeLevel in levelCalculator.ts**

In `src/utils/levelCalculator.ts`, rename the parameter and usage (lines 36-63):

```typescript
export function calculateCompositeLevel(
  consistencyScore: number,
  fitnessScore: number,
  nutritionScore: number,
  varietyScore: number,
): LevelState {
  const weightedScore =
    consistencyScore * WEIGHTS.consistency +
    fitnessScore * WEIGHTS.volume +
    nutritionScore * WEIGHTS.nutrition +
    varietyScore * WEIGHTS.variety;

  const level = Math.max(1, Math.min(100, Math.round(weightedScore)));
  const title = getLevelTitle(level);
  const progressToNext = weightedScore - Math.floor(weightedScore);

  return {
    level,
    title,
    consistencyScore,
    fitnessScore,
    nutritionScore,
    varietyScore,
    progressToNext: Math.max(0, Math.min(1, progressToNext)),
  };
}
```

- [ ] **Step 5: Update getUserLevel in db/badges.ts**

In `src/db/badges.ts`, find `getUserLevel()` (line 176) and update the fallback and return:

```typescript
export async function getUserLevel(): Promise<UserLevelRow> {
  const database = await db;
  const result = await executeSql(database, `SELECT * FROM user_level WHERE id = 1`);
  if (result.rows.length === 0) {
    return {
      id: 1,
      current_level: 1,
      title: 'Beginner',
      consistency_score: 0,
      fitness_score: 0,
      nutrition_score: 0,
      variety_score: 0,
      last_calculated: new Date().toISOString(),
    };
  }
  return result.rows.item(0);
}
```

- [ ] **Step 6: Update updateUserLevel in db/badges.ts**

In `src/db/badges.ts`, find `updateUserLevel()` (line 194) and rename `volume` to `fitness`:

```typescript
export async function updateUserLevel(
  level: number,
  title: string,
  scores: { consistency: number; fitness: number; nutrition: number; variety: number },
): Promise<void> {
  const database = await db;
  await executeSql(
    database,
    `UPDATE user_level SET current_level = ?, title = ?,
     consistency_score = ?, fitness_score = ?, nutrition_score = ?, variety_score = ?,
     last_calculated = datetime('now') WHERE id = 1`,
    [level, title, scores.consistency, scores.fitness, scores.nutrition, scores.variety],
  );
}
```

- [ ] **Step 7: Update GamificationContext references**

In `src/context/GamificationContext.tsx`, update all `volumeScore` references to `fitnessScore`:

Line 77 — initial state:
```typescript
  const [levelState, setLevelState] = useState<LevelState>({
    level: 1, title: 'Beginner',
    consistencyScore: 0, fitnessScore: 0, nutritionScore: 0, varietyScore: 0,
    progressToNext: 0,
  });
```

Lines 118-124 — loadAllState level mapping:
```typescript
    setLevelState({
      level: levelRow.current_level,
      title: levelRow.title,
      consistencyScore: levelRow.consistency_score,
      fitnessScore: levelRow.fitness_score,
      nutritionScore: levelRow.nutrition_score,
      varietyScore: levelRow.variety_score,
      progressToNext: 0,
    });
```

Lines 252-264 — checkBadges recalculate level:
```typescript
      const levelResult = calculateCompositeLevel(
        levelState.consistencyScore,
        levelState.fitnessScore,
        levelState.nutritionScore,
        levelState.varietyScore,
      );
      setLevelState(levelResult);
      await updateUserLevel(levelResult.level, levelResult.title, {
        consistency: levelResult.consistencyScore,
        fitness: levelResult.fitnessScore,
        nutrition: levelResult.nutritionScore,
        variety: levelResult.varietyScore,
      });
```

- [ ] **Step 8: Type check**

```bash
npx tsc --noEmit
```
Expected: No new type errors from the rename.

- [ ] **Step 9: Commit**

```bash
git add src/db/migrations.ts src/types/gamification.ts src/utils/levelCalculator.ts src/db/badges.ts src/context/GamificationContext.tsx
git commit -m "refactor: rename volume_score to fitness_score in leveling system"
```

---

### Task 2: Score Calculator — Raw Data Queries

Create the `scoreCalculator.ts` module with all raw data SQL queries and the blending logic.

**Files:**
- Create: `src/utils/scoreCalculator.ts`

- [ ] **Step 1: Create scoreCalculator.ts**

```typescript
// src/utils/scoreCalculator.ts
import { SQLiteDatabase } from 'react-native-sqlite-storage';
import { executeSql } from '../db/database';

/** Scores returned for each dimension (0–100 each). */
export interface DimensionScores {
  consistencyScore: number;
  fitnessScore: number;
  nutritionScore: number;
  varietyScore: number;
}

const RECENT_DAYS = 90;
const RECENT_WEIGHT = 0.7;
const ALLTIME_WEIGHT = 0.3;
const BADGE_TIER_BONUS = 0.5;

// ── Helper: clamp to 0-100 ──

function clamp100(v: number): number {
  return Math.min(100, Math.max(0, Math.round(v)));
}

// ── Helper: linear scale ──

function linearScale(value: number, maxValue: number): number {
  if (maxValue <= 0) return 0;
  return clamp100((value / maxValue) * 100);
}

// ── Helper: get date N days ago as YYYY-MM-DD ──

function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

// ── Helper: weeks in window ──

function weeksInWindow(days: number, firstDate: string | null): number {
  if (!firstDate) return 1;
  const start = new Date(firstDate);
  const now = new Date();
  const actualDays = Math.min(days, Math.floor((now.getTime() - start.getTime()) / 86400000) + 1);
  return Math.max(1, actualDays / 7);
}

// ══════════════════════════════════════════════════════════════
// CONSISTENCY: workout frequency (60%) + logging frequency (40%)
// ══════════════════════════════════════════════════════════════

async function queryConsistency(db: SQLiteDatabase, sinceDate: string | null): Promise<number> {
  const whereClause = sinceDate ? `WHERE completed_at >= '${sinceDate}'` : 'WHERE completed_at IS NOT NULL';

  // Workout frequency: avg workouts per week
  const sessions = await executeSql(db,
    `SELECT COUNT(*) as cnt, MIN(date(completed_at)) as first_date
     FROM workout_sessions ${whereClause}`);
  const sessionCount = sessions.rows.item(0).cnt as number;
  const firstSessionDate = sessions.rows.item(0).first_date as string | null;
  const sessionWeeks = sinceDate
    ? weeksInWindow(RECENT_DAYS, firstSessionDate)
    : weeksInWindow(36500, firstSessionDate); // ~100 years for all-time
  const workoutsPerWeek = sessionCount / sessionWeeks;
  const workoutScore = linearScale(workoutsPerWeek, 5); // 5/week = 100

  // Logging frequency: avg days per week with meal or water log
  const logDays = await executeSql(db,
    `SELECT COUNT(DISTINCT local_date) as cnt, MIN(local_date) as first_date FROM (
       SELECT local_date FROM meals ${sinceDate ? `WHERE local_date >= '${sinceDate}'` : ''}
       UNION
       SELECT local_date FROM water_logs ${sinceDate ? `WHERE local_date >= '${sinceDate}'` : ''}
     )`);
  const logDayCount = logDays.rows.item(0).cnt as number;
  const firstLogDate = logDays.rows.item(0).first_date as string | null;
  const logWeeks = sinceDate
    ? weeksInWindow(RECENT_DAYS, firstLogDate)
    : weeksInWindow(36500, firstLogDate);
  const loggingDaysPerWeek = logDayCount / logWeeks;
  const loggingScore = linearScale(loggingDaysPerWeek, 7); // 7/week = 100

  return workoutScore * 0.6 + loggingScore * 0.4;
}

// ══════════════════════════════════════════════════════════════
// FITNESS: self-relative volume (current avg vs all-time max)
// ══════════════════════════════════════════════════════════════

async function queryFitness(db: SQLiteDatabase, sinceDate: string | null): Promise<number> {
  // Get all-time max weekly volume (always needed as the reference)
  const maxWeekly = await executeSql(db,
    `SELECT MAX(week_vol) as max_vol FROM (
       SELECT strftime('%Y-%W', ws.completed_at) as week_key,
              SUM(s.reps * s.weight) as week_vol
       FROM workout_sets s
       JOIN exercise_sessions es ON s.exercise_session_id = es.id
       JOIN workout_sessions ws ON es.session_id = ws.id
       WHERE ws.completed_at IS NOT NULL
       GROUP BY week_key
     )`);
  const allTimeMaxVol = (maxWeekly.rows.item(0).max_vol as number) || 0;
  if (allTimeMaxVol === 0) return 0;

  // Get average weekly volume in the window
  const whereClause = sinceDate ? `AND ws.completed_at >= '${sinceDate}'` : '';
  const windowVol = await executeSql(db,
    `SELECT SUM(s.reps * s.weight) as total_vol,
            COUNT(DISTINCT strftime('%Y-%W', ws.completed_at)) as week_count
     FROM workout_sets s
     JOIN exercise_sessions es ON s.exercise_session_id = es.id
     JOIN workout_sessions ws ON es.session_id = ws.id
     WHERE ws.completed_at IS NOT NULL ${whereClause}`);
  const totalVol = (windowVol.rows.item(0).total_vol as number) || 0;
  const weekCount = Math.max(1, (windowVol.rows.item(0).week_count as number) || 1);
  const avgWeeklyVol = totalVol / weekCount;

  return linearScale(avgWeeklyVol, allTimeMaxVol);
}

// ══════════════════════════════════════════════════════════════
// NUTRITION: macro adherence (60%) + hydration adherence (40%)
// ══════════════════════════════════════════════════════════════

async function queryNutrition(db: SQLiteDatabase, sinceDate: string | null): Promise<number> {
  const dateFilter = sinceDate ? `AND m.local_date >= '${sinceDate}'` : '';
  const waterDateFilter = sinceDate ? `AND wl.local_date >= '${sinceDate}'` : '';

  // Get macro goals
  const goalResult = await executeSql(db,
    `SELECT protein_goal, carb_goal, fat_goal FROM macro_settings LIMIT 1`);
  let macroAdherence = 0;

  if (goalResult.rows.length > 0) {
    const pg = goalResult.rows.item(0).protein_goal as number | null;
    const cg = goalResult.rows.item(0).carb_goal as number | null;
    const fg = goalResult.rows.item(0).fat_goal as number | null;
    const goals = [pg, cg, fg].filter(g => g !== null && g > 0);

    if (goals.length >= 2) {
      // Days with at least 1 meal in the window
      const mealDays = await executeSql(db,
        `SELECT local_date,
                SUM(protein_grams) as p, SUM(carb_grams) as c, SUM(fat_grams) as f
         FROM meals m
         WHERE 1=1 ${dateFilter}
         GROUP BY local_date`);
      let metDays = 0;
      let totalDays = mealDays.rows.length;
      for (let i = 0; i < mealDays.rows.length; i++) {
        const row = mealDays.rows.item(i);
        let goalsHit = 0;
        if (pg && pg > 0 && (row.p as number) >= pg) goalsHit++;
        if (cg && cg > 0 && (row.c as number) >= cg) goalsHit++;
        if (fg && fg > 0 && (row.f as number) >= fg) goalsHit++;
        if (goalsHit >= 2) metDays++;
      }
      macroAdherence = totalDays > 0 ? (metDays / totalDays) * 100 : 0;
    }
  }

  // Hydration adherence
  let hydrationAdherence = 0;
  const waterGoalResult = await executeSql(db,
    `SELECT goal_oz FROM water_settings LIMIT 1`);
  if (waterGoalResult.rows.length > 0) {
    const goalOz = waterGoalResult.rows.item(0).goal_oz as number | null;
    if (goalOz && goalOz > 0) {
      const waterDays = await executeSql(db,
        `SELECT local_date, SUM(amount_oz) as total
         FROM water_logs wl
         WHERE 1=1 ${waterDateFilter}
         GROUP BY local_date`);
      let metDays = 0;
      for (let i = 0; i < waterDays.rows.length; i++) {
        if ((waterDays.rows.item(i).total as number) >= goalOz) metDays++;
      }
      hydrationAdherence = waterDays.rows.length > 0 ? (metDays / waterDays.rows.length) * 100 : 0;
    }
  }

  return macroAdherence * 0.6 + hydrationAdherence * 0.4;
}

// ══════════════════════════════════════════════════════════════
// VARIETY: exercise variety (50%) + muscle group coverage (50%)
// ══════════════════════════════════════════════════════════════

async function queryVariety(db: SQLiteDatabase, sinceDate: string | null): Promise<number> {
  const whereClause = sinceDate ? `AND ws.completed_at >= '${sinceDate}'` : '';

  // Distinct exercises used
  const exercises = await executeSql(db,
    `SELECT COUNT(DISTINCT es.exercise_id) as cnt
     FROM exercise_sessions es
     JOIN workout_sessions ws ON es.session_id = ws.id
     WHERE ws.completed_at IS NOT NULL ${whereClause}`);
  const distinctCount = (exercises.rows.item(0).cnt as number) || 0;
  // Log scale: ln(count+1) / ln(11) * 100
  const exerciseScore = distinctCount === 0 ? 0
    : clamp100(Math.log(distinctCount + 1) / Math.log(11) * 100);

  // Muscle group coverage
  const totalGroups = await executeSql(db,
    `SELECT COUNT(DISTINCT id) as cnt FROM muscle_groups`);
  const totalGroupCount = (totalGroups.rows.item(0).cnt as number) || 0;

  let coverageScore = 0;
  if (totalGroupCount > 0) {
    const hitGroups = await executeSql(db,
      `SELECT COUNT(DISTINCT emg.muscle_group_id) as cnt
       FROM exercise_muscle_groups emg
       JOIN exercise_sessions es ON emg.exercise_id = es.exercise_id
       JOIN workout_sessions ws ON es.session_id = ws.id
       WHERE ws.completed_at IS NOT NULL ${whereClause}`);
    const hitCount = (hitGroups.rows.item(0).cnt as number) || 0;
    coverageScore = (hitCount / totalGroupCount) * 100;
  }

  return exerciseScore * 0.5 + coverageScore * 0.5;
}

// ══════════════════════════════════════════════════════════════
// BADGE BONUSES: +0.5 per earned tier, mapped by category
// ══════════════════════════════════════════════════════════════

interface BadgeBonuses {
  consistency: number;
  fitness: number;
  nutrition: number;
  variety: number;
}

async function queryBadgeBonuses(db: SQLiteDatabase): Promise<BadgeBonuses> {
  const bonuses: BadgeBonuses = { consistency: 0, fitness: 0, nutrition: 0, variety: 0 };

  // Sum tiers per badge category
  const result = await executeSql(db,
    `SELECT b.category, SUM(ub.tier) as total_tiers
     FROM user_badges ub
     JOIN badges b ON ub.badge_id = b.id
     GROUP BY b.category`);

  let milestoneBonus = 0;
  for (let i = 0; i < result.rows.length; i++) {
    const row = result.rows.item(i);
    const category = row.category as string;
    const totalTiers = (row.total_tiers as number) || 0;
    const bonus = totalTiers * BADGE_TIER_BONUS;

    switch (category) {
      case 'consistency': bonuses.consistency += bonus; break;
      case 'fitness': bonuses.fitness += bonus; break;
      case 'nutrition': bonuses.nutrition += bonus; break;
      case 'recovery': bonuses.variety += bonus; break;
      case 'milestone': milestoneBonus += bonus; break;
    }
  }

  // Milestone bonus goes to lowest-scoring dimension
  if (milestoneBonus > 0) {
    const min = Math.min(bonuses.consistency, bonuses.fitness, bonuses.nutrition, bonuses.variety);
    if (bonuses.consistency === min) bonuses.consistency += milestoneBonus;
    else if (bonuses.fitness === min) bonuses.fitness += milestoneBonus;
    else if (bonuses.nutrition === min) bonuses.nutrition += milestoneBonus;
    else bonuses.variety += milestoneBonus;
  }

  return bonuses;
}

// ══════════════════════════════════════════════════════════════
// MAIN: Calculate all 4 dimension scores
// ══════════════════════════════════════════════════════════════

export async function calculateAllScores(database: SQLiteDatabase): Promise<DimensionScores> {
  const recentDate = daysAgo(RECENT_DAYS);

  // Query all dimensions for both windows in parallel
  const [
    consistencyRecent, consistencyAllTime,
    fitnessRecent, fitnessAllTime,
    nutritionRecent, nutritionAllTime,
    varietyRecent, varietyAllTime,
    badgeBonuses,
  ] = await Promise.all([
    queryConsistency(database, recentDate),
    queryConsistency(database, null),
    queryFitness(database, recentDate),
    queryFitness(database, null),
    queryNutrition(database, recentDate),
    queryNutrition(database, null),
    queryVariety(database, recentDate),
    queryVariety(database, null),
    queryBadgeBonuses(database),
  ]);

  // Weighted blend: 70% recent + 30% all-time + badge bonus
  return {
    consistencyScore: clamp100(
      (consistencyRecent * RECENT_WEIGHT + consistencyAllTime * ALLTIME_WEIGHT) + badgeBonuses.consistency,
    ),
    fitnessScore: clamp100(
      (fitnessRecent * RECENT_WEIGHT + fitnessAllTime * ALLTIME_WEIGHT) + badgeBonuses.fitness,
    ),
    nutritionScore: clamp100(
      (nutritionRecent * RECENT_WEIGHT + nutritionAllTime * ALLTIME_WEIGHT) + badgeBonuses.nutrition,
    ),
    varietyScore: clamp100(
      (varietyRecent * RECENT_WEIGHT + varietyAllTime * ALLTIME_WEIGHT) + badgeBonuses.variety,
    ),
  };
}
```

- [ ] **Step 2: Type check**

```bash
npx tsc --noEmit
```
Expected: No type errors in the new file.

- [ ] **Step 3: Commit**

```bash
git add src/utils/scoreCalculator.ts
git commit -m "feat: add score calculator with raw data queries and badge bonuses"
```

---

### Task 3: Integrate Score Calculator into GamificationContext

Wire `calculateAllScores()` into both `checkBadges()` and `backfillBadges()` so scores are recalculated from real data.

**Files:**
- Modify: `src/context/GamificationContext.tsx`

- [ ] **Step 1: Add import**

At the top of `src/context/GamificationContext.tsx`, after the existing `calculateCompositeLevel` import (line 33), add:

```typescript
import { calculateAllScores } from '../utils/scoreCalculator';
```

- [ ] **Step 2: Replace score calculation in checkBadges()**

In `src/context/GamificationContext.tsx`, find the `checkBadges` function's level recalculation block (the section starting with `// Recalculate level`). Replace:

```typescript
      // Recalculate level
      const levelResult = calculateCompositeLevel(
        levelState.consistencyScore,
        levelState.fitnessScore,
        levelState.nutritionScore,
        levelState.varietyScore,
      );
      setLevelState(levelResult);
      await updateUserLevel(levelResult.level, levelResult.title, {
        consistency: levelResult.consistencyScore,
        fitness: levelResult.fitnessScore,
        nutrition: levelResult.nutritionScore,
        variety: levelResult.varietyScore,
      });
```

With:

```typescript
      // Recalculate scores from raw data + badge bonuses
      const scores = await calculateAllScores(database);
      const levelResult = calculateCompositeLevel(
        scores.consistencyScore,
        scores.fitnessScore,
        scores.nutritionScore,
        scores.varietyScore,
      );
      setLevelState(levelResult);
      await updateUserLevel(levelResult.level, levelResult.title, {
        consistency: levelResult.consistencyScore,
        fitness: levelResult.fitnessScore,
        nutrition: levelResult.nutritionScore,
        variety: levelResult.varietyScore,
      });
```

- [ ] **Step 3: Add score recalculation after backfill**

In `src/context/GamificationContext.tsx`, find the `backfillBadges` function. After the line that marks badges as notified (the `UPDATE user_badges SET notified = 1` block, around line 180), and before the `return backfilled;` line, add score recalculation:

```typescript
    // Recalculate scores now that backfilled badges exist
    const scores = await calculateAllScores(database);
    const levelResult = calculateCompositeLevel(
      scores.consistencyScore,
      scores.fitnessScore,
      scores.nutritionScore,
      scores.varietyScore,
    );
    await updateUserLevel(levelResult.level, levelResult.title, {
      consistency: levelResult.consistencyScore,
      fitness: levelResult.fitnessScore,
      nutrition: levelResult.nutritionScore,
      variety: levelResult.varietyScore,
    });
```

This ensures that on first launch after the update, the user's level immediately jumps based on historical data.

- [ ] **Step 4: Type check**

```bash
npx tsc --noEmit
```
Expected: No new type errors.

- [ ] **Step 5: Commit**

```bash
git add src/context/GamificationContext.tsx
git commit -m "feat: wire score calculator into checkBadges and backfillBadges"
```

---

### Task 4: Update schema.ts CREATE_USER_LEVEL_TABLE

Update the schema constant so fresh installs use `fitness_score` instead of `volume_score`.

**Files:**
- Modify: `src/db/schema.ts`

- [ ] **Step 1: Update CREATE_USER_LEVEL_TABLE**

In `src/db/schema.ts`, find the `CREATE_USER_LEVEL_TABLE` constant and change `volume_score` to `fitness_score`:

Find:
```sql
volume_score REAL NOT NULL DEFAULT 0,
```

Replace with:
```sql
fitness_score REAL NOT NULL DEFAULT 0,
```

- [ ] **Step 2: Type check**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add src/db/schema.ts
git commit -m "fix: update schema template to use fitness_score for fresh installs"
```

---

### Task 5: On-Device Testing

Build, deploy, and verify the leveling system works with real data.

**Files:**
- None (testing only)

- [ ] **Step 1: Build and deploy**

```bash
cd android && JAVA_HOME="C:/Program Files/Android/Android Studio/jbr" ./gradlew assembleRelease
```

Then install on emulator.

- [ ] **Step 2: Test with existing data**

Open the app. The dashboard's LevelBar should now show a level higher than 1 (if the user has historical workout/nutrition data). Check:

| Scenario | Expected |
|----------|----------|
| User with workouts + meals + water data | Level jumps significantly from 1 |
| LevelBar shows new level and title | Title matches LEVEL_TITLE_RANGES for the calculated level |
| Progress bar fills partially | progressToNext reflects fractional weighted score |

- [ ] **Step 3: Test score changes on activity**

1. Log a meal on the Health tab
2. Return to Dashboard — level/progress should reflect the new data
3. Log water
4. Return to Dashboard — should update again

- [ ] **Step 4: Verify badge bonuses**

If badges are earned, the bonus should contribute to scores. Check by navigating to Achievements and noting earned badges, then verifying the level is slightly higher than pure raw data would suggest.

- [ ] **Step 5: Commit any fixes if needed**

```bash
git add -u
git commit -m "fix: scoring adjustments from on-device testing"
```

(Only commit if changes were made.)
