# Score-Based Leveling System — Design Spec

**Date:** 2026-04-13
**Status:** Approved

## Overview

Wire up the 4 score dimensions in the gamification leveling system so they are calculated from real user data. Currently the scores are initialized to 0 and never computed, leaving all users stuck at level 1. After this change, scores reflect actual activity with a hybrid model: raw data metrics as the primary driver, with small badge tier bonuses on top.

## Score Architecture

### 4 Dimensions

| Dimension | Weight | Raw Data Source | Badge Category |
|-----------|--------|----------------|----------------|
| Consistency | 40% | Workout frequency + meal/water logging frequency | `consistency` |
| Fitness | 30% | Total volume lifted relative to personal max | `fitness` |
| Nutrition | 20% | Macro goal adherence + hydration goal adherence | `nutrition` |
| Variety | 10% | Distinct exercises used + muscle group coverage | `recovery` |

### Score Formula

```
dimensionScore = min(100, rawDataScore + badgeBonus)
```

### Composite Level

```
weightedScore = consistency*0.4 + fitness*0.3 + nutrition*0.2 + variety*0.1
level = max(1, min(100, round(weightedScore)))
```

This formula already exists in `calculateCompositeLevel()` — we feed it real scores.

### Progression Feel

Steady grind: a dedicated user working out 4x/week, tracking macros, and drinking water hits level 50 after ~6 months, level 100 after ~2 years.

## Time Window

Each dimension's raw score uses a **weighted blend**:

```
rawDataScore = (recentScore * 0.7) + (allTimeScore * 0.3)
```

- **Recent window:** Last 90 days
- **All-time:** Entire user history

This means:
- Historical data contributes 30% immediately (solves the "stuck at level 1" problem for existing users)
- Active users are rewarded with the 70% recent component
- Taking a break causes gradual decline, not a cliff

## Raw Data Metrics

### Consistency Score (40% of level)

Two sub-metrics blended 60/40:

**Workout frequency (60%):**
- Query: Average workouts per week (completed sessions) in the window
- Scale: 0/week = 0, 5+/week = 100, linear (e.g. 3/week = 60)

**Logging frequency (40%):**
- Query: Average days per week with at least 1 meal OR 1 water log entry
- Scale: 0 days/week = 0, 7 days/week = 100, linear

```
consistencyRaw = workoutFreqScore * 0.6 + loggingFreqScore * 0.4
```

### Fitness Score (30% of level)

Self-relative volume metric:

- Query: Total weekly volume (sets x reps x weight) in the window
- Scale: User's all-time max weekly volume = 100, current weekly average scaled relative to that
- Formula: `min(100, round((currentAvgWeeklyVolume / allTimeMaxWeeklyVolume) * 100))`
- If no workout data exists: 0
- If all-time max is 0: 0

Why self-relative: absolute volume varies wildly between users. A beginner shouldn't be penalized vs an advanced lifter.

### Nutrition Score (20% of level)

Two sub-metrics blended 60/40:

**Macro adherence (60%):**
- Query: % of days in the window where at least 2 of 3 macro goals were met
- Scale: Direct percentage (0% = 0, 100% = 100)
- No-goal state: If no macro goals are set, macro adherence = 0

**Hydration adherence (40%):**
- Query: % of days in the window hitting water goal
- Scale: Direct percentage (0% = 0, 100% = 100)
- No-goal state: If no water goal is set, hydration adherence = 0

```
nutritionRaw = macroAdherence * 0.6 + hydrationAdherence * 0.4
```

### Variety Score (10% of level)

Two sub-metrics blended 50/50:

**Exercise variety (50%):**
- Query: Count of distinct exercises used in the window
- Scale: Logarithmic — 1 exercise = 10, 5 = 50, 10+ = 100
- Formula: `min(100, round(ln(distinctCount + 1) / ln(11) * 100))`

**Muscle group coverage (50%):**
- Query: % of the user's tracked muscle groups hit at least once in the window
- Scale: Direct percentage (0% = 0, 100% = 100)
- If no muscle groups are tracked: 0

```
varietyRaw = exerciseVariety * 0.5 + muscleGroupCoverage * 0.5
```

## Badge Bonuses

Each earned badge tier adds **+0.5 points** to its mapped score dimension.

### Category Mapping

| Badge Category | Score Dimension |
|---------------|----------------|
| `consistency` (16 badges) | Consistency |
| `fitness` (28 badges) | Fitness |
| `nutrition` (28 badges) | Nutrition |
| `recovery` (9 badges) | Variety |
| `milestone` (12 badges) | Whichever dimension currently has the lowest score (auto-balancing) |

### Tier Counting

A badge at gold (tier 3) contributes 3 tiers x 0.5 = +1.5 points. Diamond (tier 5) = +2.5 points.

### Theoretical Maximums

- Consistency: 16 badges x 5 tiers x 0.5 = +40
- Fitness: 28 x 5 x 0.5 = +70
- Nutrition: 28 x 5 x 0.5 = +70
- Variety: 9 x 5 x 0.5 = +22.5 (+ some milestones)

In practice, a few months of use earns ~10-20 bonus points per category.

## Recalculation Triggers

| Trigger | Action |
|---------|--------|
| `checkBadges()` — after any data mutation event | Full recalculation of all 4 scores + badge bonuses, persist to `user_level` |
| `backfillBadges()` — on first init with historical data | Full recalculation after badges are backfilled |
| `loadAllState()` — on app open | Reads persisted scores from DB only (no recalculation) |

## Implementation: `calculateAllScores(database)`

A single new function that:

1. Queries raw data for each dimension:
   - 4 queries for 90-day recent window
   - 4 queries for all-time
2. Computes weighted blend per dimension: `recent * 0.7 + allTime * 0.3`
3. Counts badge tiers per category from `user_badges` table
4. Adds badge bonuses (+0.5 per tier) to mapped dimension
5. Handles `milestone` badges by adding to the lowest-scoring dimension
6. Caps each dimension at 100
7. Returns `{ consistencyScore, fitnessScore, nutritionScore, varietyScore }`

**Location:** `src/utils/scoreCalculator.ts` (new file)

Called from:
- `GamificationContext.checkBadges()` — after evaluating badges
- `GamificationContext.backfillBadges()` — after backfill completes
- Both call `updateUserLevel()` to persist

## Rename: volume → fitness

### Database Migration

New migration adds to `user_level`:
```sql
ALTER TABLE user_level RENAME COLUMN volume_score TO fitness_score;
```

If SQLite version doesn't support `RENAME COLUMN`, recreate the table with the new column name.

### Type Changes

- `LevelState.volumeScore` → `LevelState.fitnessScore`
- `calculateCompositeLevel()` parameter: `volumeScore` → `fitnessScore`
- `updateUserLevel()` scores object key: `volume` → `fitness`
- `getUserLevel()` return value: `volume_score` → `fitness_score`
- `LevelBar` component: update if it displays dimension names

## Edge Cases

| Scenario | Behavior |
|----------|----------|
| Brand new user, no data | All scores 0, level 1 |
| Existing user, first load after update | Backfill triggers recalculation, level jumps based on historical data |
| User stops training for months | Recent (70%) portion drops toward 0, all-time (30%) preserves some score |
| No macro/water goals set | Nutrition raw score stays 0, only badge bonuses contribute |
| User only does 1 exercise | Variety exercise score ~40 (log scale), muscle coverage low |
| All badges at diamond | Badge bonuses add ~58 points spread across categories on top of raw data |

## Out of Scope

- No UI changes to LevelBar (just receives updated numbers)
- No new badge definitions
- No push notifications for level-ups (existing celebration modal handles this if wired up later)
- No leaderboard or social features
