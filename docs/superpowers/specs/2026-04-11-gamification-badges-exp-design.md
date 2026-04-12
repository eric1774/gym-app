# Gamification System Design: Badges, EXP & Leveling

**Date:** 2026-04-11
**Status:** Approved

## Overview

A comprehensive gamification system for GymTrack that rewards users with badges, experience points, and a composite leveling system. The system uses a hybrid philosophy combining Achievement Hunter (rare prestigious trophies), Progress Collector (frequent tier progression), and Milestone Journaler (personal fitness moments) to maintain engagement at every stage of the user's fitness journey.

## Design Decisions

| Decision | Choice |
|----------|--------|
| Philosophy | Hybrid — Achievement Hunter + Progress Collector + Milestone Journaler |
| Tier Structure | Bronze → Silver → Gold → Platinum → Diamond (5 tiers) |
| Leveling System | Activity-Weighted Composite — reflects real fitness behavior |
| Navigation | Dashboard Integration + "View All" achievements screen |
| Celebration | Full modal with Dismiss button (no share) |
| Badge Visuals | Shield/emblem style with metallic tier gradients |
| Locked Badges | Silhouette/locked with tap-to-reveal requirements |
| Badge Organization | Unified collection with filterable category tags |
| Streak Thresholds | Moderate — 7 → 14 → 30 → 60 → 100 days |
| Progress Tracking | Achievements screen only — progress rings on in-progress badges |
| Setbacks | Comeback badges + streak shields |
| Celebration Animation | Radial glow + shimmer — metallic light rays, tier-escalating |

---

## 1. Data Architecture

### New SQLite Tables

#### `badges` (static badge definitions, seeded on first run)

| Column | Type | Purpose |
|--------|------|---------|
| id | TEXT PK | Unique badge ID (e.g., `iron_streak`, `ten_ton_club`) |
| name | TEXT | Display name ("Iron Streak") |
| description | TEXT | What it means ("Maintain a workout streak") |
| category | TEXT | Tag: `fitness`, `nutrition`, `consistency`, `milestone`, `recovery` |
| icon_name | TEXT | SVG icon identifier for the shield emblem |
| tier_thresholds | TEXT (JSON) | `[7, 14, 30, 60, 100]` — values for Bronze→Diamond |
| evaluation_type | TEXT | `streak`, `cumulative`, `single_session`, `composite`, `one_time` |
| evaluation_query | TEXT | SQL template or metric key the engine evaluates |
| sort_order | INTEGER | Display ordering within category |

#### `user_badges` (earned badges per user)

| Column | Type | Purpose |
|--------|------|---------|
| id | INTEGER PK | Auto-increment |
| badge_id | TEXT FK | References badges.id |
| tier | INTEGER | 1-5 (Bronze→Diamond) |
| current_value | REAL | Current progress value |
| earned_at | TEXT | ISO timestamp when this tier was unlocked |
| notified | INTEGER | 0/1 — has the celebration modal been shown? |

#### `streak_shields` (protection tokens)

| Column | Type | Purpose |
|--------|------|---------|
| id | INTEGER PK | Auto-increment |
| shield_type | TEXT | Which streak this protects (e.g., `workout`, `protein`, `hydration`) |
| earned_at | TEXT | When the shield was earned |
| used_at | TEXT | NULL until consumed |
| used_for_date | TEXT | The date the shield covered |

#### `user_level` (composite level state, singleton row)

| Column | Type | Purpose |
|--------|------|---------|
| id | INTEGER PK | Always 1 |
| current_level | INTEGER | Calculated level (1-100) |
| title | TEXT | Current rank title |
| consistency_score | REAL | 0-100 subscale |
| volume_score | REAL | 0-100 subscale |
| nutrition_score | REAL | 0-100 subscale |
| variety_score | REAL | 0-100 subscale |
| last_calculated | TEXT | ISO timestamp of last recalculation |

---

## 2. Badge Engine Architecture

### GamificationContext Provider

Wraps the app at the top level alongside existing context providers. Exposes:

- `badgeState`: Map of badge ID → { tier, currentValue, nextThreshold }
- `levelState`: { level, title, scores, progressToNext }
- `shieldState`: { available count, per-type count }
- `pendingCelebrations`: Queue of { badge, newTier, animation }
- `checkBadges(event)`: Called after data mutations
- `dismissCelebration()`: User taps dismiss
- `useShield(type, date)`: Consume a streak shield

### Event Flow

```
User Action (log set, complete meal, finish workout)
    ↓
Existing Context persists data to SQLite
    ↓
Fires AppEvent → GamificationContext.checkBadges()
    ↓
BadgeEngine evaluates relevant badge definitions against current state
    ↓
For each badge where currentValue >= nextThreshold:
    → Update user_badges (new tier, earned_at)
    → Queue celebration
    → Recalculate composite level
    ↓
CelebrationModal picks from queue, shows radial glow animation
    ↓
User taps Dismiss → notified=1, next in queue
```

### AppEvent Types

| Event | Fired When | Badges It Can Trigger |
|-------|-----------|----------------------|
| `SET_LOGGED` | User logs a set | Volume, PR, single-session badges |
| `SESSION_COMPLETED` | Workout finished | Streak, session count, duration, HR badges |
| `MEAL_LOGGED` | Meal saved | Macro streaks, food variety, logging streaks |
| `WATER_LOGGED` | Water intake added | Hydration streak, daily goal badges |
| `PR_ACHIEVED` | New personal record | PR-specific badges |
| `APP_OPENED` | App launches | Comeback badges |
| `DAY_BOUNDARY` | Date changes while app open | Streak calculations, shield earning |

### Relevance Filtering

Each badge definition declares which AppEvent types it cares about. When an event fires, only badges relevant to that event type are evaluated (typically 15-20 out of 93). Evaluation is batched in a single transaction. Results are cached in memory and only written to SQLite when a tier changes.

### Streak Shield Mechanics

- Earn 1 shield per 7 consecutive days of a given streak type
- Max 3 shields stockpiled per streak type
- When a streak break is detected, the engine checks for available shields before resetting
- Shield consumption is automatic — a toast says "Shield used! Streak preserved."
- Shield count visible on the achievements screen

### Composite Level Calculation

Recalculated on every `checkBadges()` call. Four subscales:

| Subscale | Weight | What It Measures |
|----------|--------|-----------------|
| Consistency | 40% | Workout frequency over rolling 30 days, active streaks |
| Volume Progress | 30% | Total weight lifted trend, PR frequency, set count growth |
| Nutrition Adherence | 20% | Macro goal hit rate, meal logging consistency, hydration |
| Variety | 10% | Distinct exercises used, muscle category coverage, food diversity |

Each subscale produces a 0-100 score. Weighted composite maps to level (1-100) and title:

| Level Range | Title |
|-------------|-------|
| 1-10 | Beginner |
| 11-25 | Novice |
| 26-40 | Intermediate |
| 41-60 | Advanced |
| 61-80 | Elite |
| 81-95 | Master |
| 96-100 | Legend |

---

## 3. Badge Catalog (93 Badges)

### 3.1 Fitness Badges (28)

#### Volume & Strength (10)

| Badge | Description | Bronze | Silver | Gold | Platinum | Diamond |
|-------|-------------|--------|--------|------|----------|---------|
| The Ton Club | Total lifetime volume lifted | 2,000 lbs | 10,000 | 50,000 | 200,000 | 500,000 |
| Set Stacker | Total lifetime sets completed | 100 | 500 | 1,500 | 5,000 | 15,000 |
| Rep Machine | Total lifetime reps performed | 500 | 2,500 | 10,000 | 30,000 | 100,000 |
| Plate Crusher | Heaviest single set logged | 135 lbs | 185 | 225 | 315 | 405 |
| PR Collector | Total personal records achieved | 5 | 20 | 50 | 100 | 250 |
| Session Warrior | Total workout sessions completed | 10 | 50 | 150 | 400 | 1,000 |
| Marathon Lifter | Longest single session duration | 30 min | 45 | 60 | 90 | 120 |
| Volume Day | Highest volume in a single session | 2,000 lbs | 5,000 | 10,000 | 20,000 | 40,000 |
| Superset King | Total superset groups completed | 10 | 50 | 150 | 400 | 1,000 |
| Warmup Disciple | Total warmup sets logged | 25 | 100 | 300 | 750 | 2,000 |

#### Category Mastery (7 — one per muscle group)

| Badge | Category Color | Thresholds (sets) |
|-------|---------------|-------------------|
| Chest Commander | #E8845C | 50 → 200 → 500 → 1,200 → 3,000 |
| Back Boss | #5B9BF0 | 50 → 200 → 500 → 1,200 → 3,000 |
| Leg Legend | #B57AE0 | 50 → 200 → 500 → 1,200 → 3,000 |
| Shoulder Sentinel | #4ECDC4 | 50 → 200 → 500 → 1,200 → 3,000 |
| Arm Architect | #8DC28A | 50 → 200 → 500 → 1,200 → 3,000 |
| Core Crusher | #F0B830 | 50 → 200 → 500 → 1,200 → 3,000 |
| Conditioning King | #E0697E | 50 → 200 → 500 → 1,200 → 3,000 |

#### Performance & PR (6)

| Badge | Description | Bronze | Silver | Gold | Platinum | Diamond |
|-------|-------------|--------|--------|------|----------|---------|
| New Peak | Multiple PRs in a single session | 2 | 3 | 4 | 5 | 7 |
| Category Conqueror | PR in every exercise of a category | 1 cat | 2 | 4 | 6 | all 7 |
| PR Streak | Consecutive sessions with a PR | 3 | 5 | 8 | 12 | 20 |
| Weight Climber | Consecutive weight increases (same exercise) | 3 | 5 | 8 | 12 | 20 |
| Rep Ranger | 10+ reps at heaviest weight | 1 | 5 | 15 | 40 | 100 |
| The Specialist | Sessions with a specific program | 10 | 25 | 50 | 100 | 200 |

#### Heart Rate (5)

| Badge | Description | Bronze | Silver | Gold | Platinum | Diamond |
|-------|-------------|--------|--------|------|----------|---------|
| Heart Monitor | Sessions with HR monitor | 5 | 25 | 75 | 200 | 500 |
| Zone Warrior | Minutes in Zone 4-5 | 30 | 120 | 500 | 1,500 | 5,000 |
| Steady State | Sessions with avg HR in Zone 2-3 | 5 | 20 | 50 | 120 | 300 |
| Peak Performer | Sessions reaching 90%+ max HR | 3 | 10 | 30 | 75 | 200 |
| Cardio King | Estimated calories burned from HR | 1,000 | 5,000 | 20,000 | 75,000 | 200,000 |

### 3.2 Nutrition Badges (28)

#### Protein & Macros (10)

| Badge | Description | Bronze | Silver | Gold | Platinum | Diamond |
|-------|-------------|--------|--------|------|----------|---------|
| Protein Machine | Total protein grams lifetime | 1,000g | 5,000 | 20,000 | 75,000 | 200,000 |
| Macro Master | Days hitting all 3 macro goals | 5 | 20 | 60 | 150 | 365 |
| Protein Faithful | Consecutive days hitting protein goal | 7 | 14 | 30 | 60 | 100 |
| Carb Controller | Consecutive days hitting carb goal | 7 | 14 | 30 | 60 | 100 |
| Fat Balancer | Consecutive days hitting fat goal | 7 | 14 | 30 | 60 | 100 |
| Calorie Counter | Total calories logged lifetime | 20,000 | 100,000 | 500,000 | 1.5M | 5M |
| Triple Threat | Consecutive days hitting all 3 macros | 3 | 7 | 14 | 30 | 60 |
| Protein Overachiever | Days exceeding protein goal by 20%+ | 5 | 20 | 50 | 120 | 300 |
| Balanced Plate | Days with P/C/F within 5% of targets | 3 | 10 | 30 | 75 | 200 |
| Macro Streak King | Longest ever macro streak (any macro) | 10 | 21 | 45 | 90 | 180 |

#### Meal Logging (8)

| Badge | Description | Bronze | Silver | Gold | Platinum | Diamond |
|-------|-------------|--------|--------|------|----------|---------|
| Meal Logger | Total meals logged | 25 | 100 | 400 | 1,000 | 3,000 |
| Full Day Tracker | Days logging all 4 meal types | 5 | 20 | 60 | 150 | 365 |
| Logging Streak | Consecutive days logging at least 1 meal | 7 | 14 | 30 | 60 | 100 |
| Breakfast Champion | Breakfasts logged | 10 | 50 | 150 | 365 | 1,000 |
| Meal Prep Pro | Library meals reused | 5 | 15 | 40 | 100 | 250 |
| Food Explorer | Distinct foods logged | 10 | 30 | 75 | 150 | 300 |
| Meal Builder | Multi-food meals created | 10 | 40 | 100 | 250 | 750 |
| Library Architect | Saved meals in library | 3 | 10 | 25 | 50 | 100 |

#### Hydration (6)

| Badge | Description | Bronze | Silver | Gold | Platinum | Diamond |
|-------|-------------|--------|--------|------|----------|---------|
| Water Warrior | Consecutive days hitting water goal | 7 | 14 | 30 | 60 | 100 |
| Ocean Drinker | Total lifetime water intake | 500 oz | 2,500 | 10,000 | 30,000 | 100,000 |
| Hydration Logger | Total water log entries | 25 | 100 | 300 | 750 | 2,000 |
| Overflowing | Days exceeding water goal by 50%+ | 3 | 10 | 30 | 75 | 200 |
| Early Sipper | Days logging water before 9 AM | 5 | 20 | 50 | 120 | 300 |
| Steady Flow | Days with 4+ separate water entries | 5 | 15 | 40 | 100 | 250 |

#### Nutrition Milestones (4)

| Badge | Description | Bronze | Silver | Gold | Platinum | Diamond |
|-------|-------------|--------|--------|------|----------|---------|
| Custom Chef | Custom foods created | 5 | 15 | 35 | 75 | 150 |
| Nutrition Nerd | Days with full macro breakdowns on every meal | 5 | 20 | 60 | 150 | 365 |
| Goal Setter | Macro/water goal updates | 1 | 3 | 6 | 12 | 24 |
| Snack Tracker | Snacks logged | 10 | 40 | 100 | 250 | 750 |

### 3.3 Consistency Badges (16)

| Badge | Description | Bronze | Silver | Gold | Platinum | Diamond |
|-------|-------------|--------|--------|------|----------|---------|
| Iron Streak | Consecutive days with a workout | 7 | 14 | 30 | 60 | 100 |
| Complete Athlete | Days with workout + macros + water all hit | 3 | 10 | 30 | 75 | 200 |
| Weekend Warrior | Weekends with a workout | 4 | 12 | 26 | 52 | 100 |
| Early Bird | Workouts started before 8 AM | 5 | 20 | 50 | 120 | 300 |
| Night Owl | Workouts started after 8 PM | 5 | 20 | 50 | 120 | 300 |
| Weekly Regular | Consecutive weeks with 3+ workouts | 4 | 8 | 16 | 30 | 52 |
| Monthly Machine | Consecutive months with 12+ workouts | 2 | 4 | 8 | 12 | 24 |
| Full Week Fuel | Consecutive weeks logging meals every day | 2 | 4 | 8 | 16 | 30 |
| Dual Discipline | Days with workout and all meals logged | 5 | 20 | 60 | 150 | 365 |
| Program Loyalist | Consecutive weeks following program schedule | 2 | 4 | 8 | 16 | 30 |
| Variety Pack | Distinct categories trained in one week | 3 | 4 | 5 | 6 | 7 |
| Full Spectrum | Weeks training all 7 categories | 2 | 8 | 20 | 40 | 100 |
| App Veteran | Days since first workout (tenure) | 30 | 90 | 180 | 365 | 730 |
| Rest Day Fuel | Rest days where macros were still tracked | 5 | 20 | 50 | 120 | 300 |
| Hydro Athlete | Workout days where water goal was hit | 5 | 20 | 60 | 150 | 400 |
| Shield Collector | Total streak shields earned | 3 | 10 | 25 | 60 | 150 |

### 3.4 Recovery Badges (9)

| Badge | Description | Bronze | Silver | Gold | Platinum | Diamond |
|-------|-------------|--------|--------|------|----------|---------|
| The Phoenix | Return after 7+ days off | 1 | 3 | 5 | 10 | 20 |
| Back on Track | Hit macros 3 days straight after missing a week | 1 | 3 | 6 | 12 | 25 |
| Streak Saver | Streak shields consumed | 1 | 5 | 12 | 25 | 50 |
| Rebuild Stronger | PR within 7 days of returning from 7+ day break | 1 | 3 | 5 | 10 | 20 |
| Hydration Reset | Hit water goal 3 days straight after missing 3+ | 1 | 3 | 6 | 12 | 25 |
| Never Skip Monday | Consecutive Mondays with a workout | 4 | 8 | 16 | 30 | 52 |
| Resilient | Rebuild a streak higher than before it broke | 1 | 3 | 5 | 10 | 20 |
| Full Recovery | After 14+ days off, complete 7 workouts in 14 days | 1 | 2 | 4 | 7 | 15 |
| Second Wind | Log a meal after 5+ days of no nutrition tracking | 1 | 3 | 6 | 12 | 25 |

### 3.5 Milestone Badges (12 — one-time trophies, no tiers)

| Badge | Trigger |
|-------|---------|
| First Blood | Complete first workout |
| First Fuel | Log first meal |
| First Drop | Log first water intake |
| Gold Standard | Achieve first personal record |
| Heart Connected | Complete first workout with HR monitor |
| Program Graduate | Complete all weeks of a program |
| Century Club | Complete 100th workout session |
| Perfect Day | Workout + all macros hit + water goal + all 4 meal types |
| Recipe Creator | Save first library meal |
| Custom Creator | Create first custom food |
| One Year Strong | 365 days since first activity |
| Badge Hunter | Earn first 10 badges (any tier) |

### Totals

- 81 tiered badges × 5 tiers = 405 unlock moments
- 12 one-time trophies
- **417 total achievements**

---

## 4. UI/UX Design

### 4.1 Dashboard Integration

Two new elements at the **top** of the existing Dashboard, between the header and the S/V toggle pill:

**Level Bar:**
- Card using `colors.surface` (#1E2024), 14px border radius, standard border
- Left: Circular mint gradient badge showing level number (40×40px)
- Center: Title text ("Intermediate") + "Level 14 · 68% to next"
- Bottom: Progress bar (`#33373D` track, mint gradient fill)
- Tappable → navigates to Achievements screen
- Height: ~70px

**Recent Badges Row:**
- Header: "Recent Badges" (white, 14px semibold) + "View All ›" (mint, 12px)
- Horizontally scrollable strip of earned badges (52×52px shields)
- Each badge shows icon, tier pip (metallic color, 7px font), and name below
- Only appears after earning at least 1 badge

### 4.2 Achievements Screen

Accessed via "View All" or tapping the level bar. Stack navigator push from Dashboard.

**Level Hero Section:**
- Large circular level badge (64×64px, centered)
- Title text (18px bold)
- Count: "23 badges earned · 417 total" (12px secondary)

**Composite Score Bars:**
- Card with 2×2 grid showing 4 subscales
- Each: label, score number, colored progress bar
- Colors: Consistency (#8DC28A), Volume (#5B9BF0), Nutrition (#E0A85C), Variety (#B57AE0)

**Category Filter Pills:**
- Horizontal scroll: All, Fitness, Nutrition, Consistency, Recovery, Milestone
- Active pill: mint fill (#8DC28A) with dark text
- Inactive: surface fill (#1E2024) with secondary text

**Badge Grid:**
- 4-column grid, 8px gap
- Earned badges: icon + tier pip + name + progress bar to next tier
- Locked badges: dark silhouette (#1E2024), lock icon, "???" name, 40% opacity
- Tapping locked badge: reveals name, description, and requirements
- Tapping earned badge: shows detail modal (earned date, history, next tier progress)

**Streak Shields Section:**
- Card at bottom showing available shields per type
- 3 slots per type (Workout, Protein, Water)
- Filled slots: mint with shield icon; Empty slots: dark (#333)

### 4.3 Celebration Modal

Full-screen modal overlay triggered when a badge is earned.

**Layout:**
- Dark overlay (#151718)
- "BADGE EARNED" label (11px, secondary, letter-spacing 1.5px)
- Badge shield (80×80px) centered with tier-colored border and box-shadow
- Tier label (tier metallic color, 11px bold)
- Badge name (20px white bold)
- Description (13px secondary)
- "Dismiss" button (surface bg, white text, 14px semibold)

**Radial Glow (tier-escalating):**
- Bronze: Warm copper `rgba(205,127,50,0.15)`, 3 concentric rings, subtle shadow
- Silver: Cool silver `rgba(192,192,192,0.15)`, 3 rings
- Gold: Rich amber `rgba(255,184,0,0.2)`, 3 rings, stronger shadow
- Platinum: Ice blue `rgba(180,220,255,0.18)`, 4 rings
- Diamond: Prismatic white `rgba(255,255,255,0.15)`, 5 rings, gradient text label, text shadow

**Animation:**
- Badge scales from 0→1 with spring physics
- Glow fades in over 400ms
- Light rays rotate slowly (2s loop) via React Native Animated rotation
- Double haptic buzz on appear (`Haptics.notificationAsync`)
- Modal stays until user taps Dismiss
- Multiple badges queue — one modal at a time

### 4.4 Shield Usage Toast

When a streak shield is auto-consumed:
- Toast notification (similar to existing PR toast style)
- "Shield used! Streak preserved." with shield icon
- Auto-dismisses after 3 seconds

---

## 5. New Files

| File | Purpose |
|------|---------|
| `src/context/GamificationContext.tsx` | Context provider with badge engine |
| `src/db/badges.ts` | Badge DB operations (seed, query, update) |
| `src/db/gamification.ts` | Badge evaluation queries, level calculation |
| `src/screens/AchievementsScreen.tsx` | Full achievements screen |
| `src/components/LevelBar.tsx` | Dashboard level bar card |
| `src/components/RecentBadges.tsx` | Dashboard recent badges strip |
| `src/components/BadgeGrid.tsx` | Grid component for achievements screen |
| `src/components/BadgeDetailModal.tsx` | Tap-to-reveal for locked / detail for earned |
| `src/components/CelebrationModal.tsx` | Badge earned celebration overlay |
| `src/components/CompositeScoreCard.tsx` | 4-subscale score bars |
| `src/components/StreakShieldsCard.tsx` | Shield slots display |
| `src/components/BadgeIcon.tsx` | Reusable shield emblem with tier styling |
| `src/data/badgeDefinitions.ts` | Badge catalog as typed data |
| `src/types/gamification.ts` | TypeScript types for badges, levels, events |
| `src/utils/badgeEngine.ts` | Core evaluation logic, relevance filtering |

## 6. Modified Files

| File | Change |
|------|--------|
| `App.tsx` | Wrap with GamificationContext provider |
| `src/db/migrations.ts` | Add migration 15 for badges, user_badges, streak_shields, user_level tables |
| `src/db/schema.ts` | Add CREATE TABLE statements |
| `src/screens/DashboardScreen.tsx` | Add LevelBar and RecentBadges above S/V toggle |
| `src/navigation/TabNavigator.tsx` | Add AchievementsScreen to DashboardStack |
| `src/context/SessionContext.tsx` | Fire SESSION_COMPLETED and SET_LOGGED events |
| `src/db/sets.ts` | Fire PR_ACHIEVED event from existing checkForPR |
| `src/db/macros.ts` | Fire MEAL_LOGGED event |
| `src/db/hydration.ts` | Fire WATER_LOGGED event |
| `src/types/index.ts` | Export gamification types |
