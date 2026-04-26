# Dashboard Redesign — Design Spec

**Date:** 2026-04-23
**Mockup:** `docs/superpowers/specs/2026-04-23-dashboard-redesign-mockup.html` (stable copy alongside this spec)
**Status:** Design locked, ready for implementation planning

---

## Goal

Replace the current `DashboardScreen` (six equal-weight cards stacked vertically — `LevelBar`, `NextWorkout`, `DashboardWeightCard`, `WeeklySnapshotCard`, `NutritionRingsCard`) with a redesigned screen that has clear visual hierarchy, purposeful personality, and honest data math.

The current screen reads as "AI slop" because every card competes equally for attention, treatments are generic, and time-window labels are inconsistent (e.g., a card labeled "14 day" showing a 7-day delta).

---

## What's Changing

| Element | Before | After |
|---|---|---|
| `LevelBar` | Top of dashboard | **Removed entirely** (felt superfluous) |
| Page title "Dashboard" | Static `Text` | Replaced with **time-of-day greeting** (`Good morning, Eric`) |
| Streak | None | **New: coral streak chip** with rest-day pills (own row below greeting) |
| `NextWorkoutCard` | Plain bordered surface card | **Hero gradient card** with mint radial glow, last-session context line, exercise-preview chips |
| `DashboardWeightCard` | Single `today` reading + delta vs yesterday | **Trend card**: today's reading + 7-day moving-avg delta + 30-day sparkline (raw + MA overlay) |
| Volume trend | None on dashboard | **New trend card**: 4-week mesocycle %, weekly tonnage bars, +trend line |
| `WeeklySnapshotCard` | Sessions / PRs / Volume % | **Reformed stats strip**: Sessions / PRs / Tonnage — each with neutral delta arrow |
| `NutritionRingsCard` | 4 equal rings, no per-macro tint | **Per-macro tinted ring seats** + `Xg left` instead of just `X/Y g` |

---

## Layout

The screen scrolls vertically. Order top-to-bottom:

1. **Header row** — greeting + settings gear
2. **Streak chip** — coral pill, full row
3. **Hero workout card** — gradient mint, dominant
4. **Trend cards row** — two side-by-side: Weight | Volume
5. **Nutrition rings card** — 4 rings with per-macro tinted seats
6. **Stats strip** — Sessions / PRs / Tonnage (gold-tinted card)

Spacing between sections: `spacing.sm` (8px). Horizontal padding: `spacing.base` (16px).

---

## Component Specs

### 1. Header Row

**File:** `DashboardScreen.tsx` (inline)

```
┌─────────────────────────────────────────┐
│ Good morning, Eric              [⚙]     │
└─────────────────────────────────────────┘
```

- Greeting text: `colors.secondary` for "Good morning,", `colors.primary` bold for the user's first name
- Time-of-day logic: `< 12:00` → "Good morning", `12:00–17:00` → "Good afternoon", `≥ 17:00` → "Good evening"
- User's first name: read from user profile if available; otherwise show greeting alone with no name. (See [Open Questions](#open-questions) — name source needs confirmation before implementation.)
- Gear: 28×28 circle, `colors.surface` background, `colors.border` 1px border, `colors.secondary` icon color, navigates to `Settings`

### 2. Streak Chip

**New component:** `src/components/StreakChip.tsx`

```
╭──────────────────────────────────────────────────╮
│  7-day streak  Rest days included    █ ▎ █ █ ▎ █ █│
╰──────────────────────────────────────────────────╯
```

- **Container:** Pill (`borderRadius: 999`), `colors.surface` background with subtle coral radial gradient overlay (`rgba(232,132,92,0.10)` from left), `1px` border in `rgba(232,132,92,0.30)` (coral-dim)
- **Padding:** `10px 16px`
- **No icon** — text + bars carry the visual
- **Text:** `"7-day streak"` where the `7` is **coral** (`colors.coral` `#E8845C`) and **font-weight 800**, the rest is primary white weight 700, font size 15
- **Subtitle inline:** `"Rest days included"` in `colors.secondary`, font size 11, white-space nowrap
- **Bars (right side):** 7 vertical pills, gap 3px
  - Workout day completed: 4×16px, full coral
  - Rest day (intentional, in plan): 4×9px, `rgba(232,132,92,0.30)`
  - Missed workout day: 4×16px, `rgba(232,132,92,0.10)` (very faint — should rarely show, but if streak is 0 the chip hides entirely)

**Behavior:**
- Tap → navigate to streak detail (out of scope for this phase — link can be a no-op or open `Achievements` for now)
- Component **hides itself** when streak count is 0

**Data source:** Net-new — see [Out-of-Scope / New Work](#out-of-scope--new-work) below.

### 3. Hero Workout Card

**Replaces:** Existing `nextWorkoutCard` JSX inside `DashboardScreen.tsx`. Extract into `src/components/HeroWorkoutCard.tsx`.

```
┌─────────────────────────────────────────────────┐
│ ● UP NEXT · WEEK 3 · DAY 4                      │
│                                                 │
│ Push Day                                        │
│ 6 exercises · est. 52 min · Hypertrophy 5×5     │
│ Last time: Bench 185×5 · you added 10 lb        │
│                                                 │
│ [Bench] [OHP] [Dips] +3 more         [START ▶] │
└─────────────────────────────────────────────────┘
```

- **Background:** Layered gradient
  - Base: `linear-gradient(135deg, #1E2024 0%, #1A3326 100%)` (charcoal → dim mint)
  - Overlay 1: `radial-gradient(ellipse at top left, rgba(141,194,138,0.35) 0%, rgba(141,194,138,0) 55%)` (mint glow top-left)
  - Overlay 2 (`::before` pseudo or absolute child): top-right radial circle — `rgba(141,194,138,0.2)` core fading to transparent at 70% radius
- **Border:** `1px` `rgba(141,194,138,0.3)` (mint-dim)
- **Border radius:** 18
- **Padding:** 16
- **Eyebrow label:** `UP NEXT · WEEK 3 · DAY 4` — `colors.accent` (mint), font size 9, letter-spacing 1.5, weight 700, with a 5×5 mint dot prefix that has a glow (`box-shadow: 0 0 8px var(--mint)`)
- **Title:** `Push Day` — font size 22, weight 700, primary white
- **Meta:** `6 exercises · est. 52 min · Hypertrophy 5×5` — font size 11, `colors.secondary`
- **Last-session line:** `Last time: Bench 185×5 · you added 10 lb` — font size 10, `rgba(141,194,138,0.85)`. The lift name and result is mint-bright, the "you added 10 lb" suffix optional based on data availability.
- **Exercise chips:** First 3 exercise names as pills (`rgba(255,255,255,0.06)` background, primary white text, 4×9px padding, radius 7). If more exist, append `+N more` chip with transparent background.
- **Start button:** Pill (`borderRadius: 999`), mint background, dark text, weight 700, 10×18px padding, drop shadow `0 4px 16px rgba(141,194,138,0.35)`

**States:**
- **Idle (no active session):** Show as above. Button text `START ▶`. Tapping starts the next workout.
- **Active session:** Replace `UP NEXT · WEEK 3 · DAY 4` with `ACTIVE WORKOUT · MM:SS` (elapsed timer). Replace button text with `CONTINUE ▶`. The "last time" line can be hidden or replaced with current set count.
- **No program activated:** Hide the card entirely (existing logic — `nextWorkout === null`).

**Data sources:**
- Existing: `getNextWorkoutDay()`, `getProgramDayExercises()`, `getExercises()`, `useSession()`
- **New:** Last-session lookup for the headline lift — query the most recent session for this `programDayId`, get the top working set on the **first non-warmup compound exercise** in the day's exercise list. If no prior session exists for this day, omit the line entirely.

### 4. Trend Cards Row

**Container:** Two-column grid, `gap: 10px`. Each card:

**Component:** `src/components/TrendCard.tsx` (parameterized by metric)

#### Common visual treatment

- **Background:**
  - Base: `linear-gradient(165deg, #1E2024 0%, #1C2228 100%)` (cool slate undertone)
  - Overlay: `radial-gradient(ellipse at top right, rgba(91,122,149,0.14) 0%, transparent 65%)` (slate top-right)
- **Border:** `1px` `rgba(91,122,149,0.16)`
- **Border radius:** 14
- **Padding:** 12
- **Top row:** Label (top-left, ALL-CAPS, font size 9, letter-spacing 1.2, `colors.secondary`) + chevron (top-right, `›`, `colors.secondary`, opacity 0.6)
- **Big number row:** font size 26, weight 700, primary white, with unit (`lb`, `%`) inline at font size 10, `colors.secondary`
- **Delta row:** font size 10, weight 600, `colors.textSoft` (new token, see below). Includes neutral slate arrow when applicable.
- **Sparkline:** 32px tall, full width, mint stroke

#### Weight card specifics

- **Label:** `WEIGHT` (no time qualifier)
- **Big number:** Today's logged weight (e.g., `184.2 lb`)
- **Delta:** `↓ 0.4 lb · 7d avg` — direction arrow + amount + window descriptor
  - Math: `currentSevenDayMA − previousSevenDayMA` (where `previousSevenDayMA` is the 7-day moving average ending 7 days before today)
  - Arrow direction reflects `currentSevenDayMA - previousSevenDayMA` sign; arrow color is **always neutral slate** regardless of direction
  - If insufficient data (< 14 days of weigh-ins), show `—` instead
- **Sparkline (30 days):** Two overlaid paths
  - Path 1: faint daily readings (`rgba(141,194,138,0.45)`, stroke 1px) with subtle mint area fill underneath
  - Path 2: 7-day moving average overlaid on top (mint `#8DC28A`, stroke 1.7px) — this is the "real" trend line
  - End point on the MA line gets a 2.5px mint dot
- **Tap → navigate to:** Body composition / weight detail screen (existing — confirm route)

#### Volume card specifics

- **Label:** `VOLUME · 4 WK` (window IS part of the metric definition since +12% is meaningless without knowing what window)
- **Big number:** `+12%` (signed delta)
  - Math: `(lastFourWeeksTotalVolume − priorFourWeeksTotalVolume) / priorFourWeeksTotalVolume × 100`
  - Display as `+N%` or `−N%` (rounded to whole percent)
  - If insufficient data (< 8 weeks of sessions), show `—`
- **Delta:** `▲ vs prior 4 wk` — neutral slate arrow + comparison statement (the +12% IS the delta; this row clarifies what's being compared)
- **Sparkline (4 weeks):** 4 weekly bars + connecting trend line on top
  - Each bar is one calendar week's total tonnage (`SUM(weight_kg × reps)` for non-warmup sets)
  - Bar color: mint area gradient (`rgba(141,194,138,0.25)` → transparent)
  - Connecting line between bar tops: mint stroke 1.4px
  - Each bar top has a 2px mint dot; final bar has a 2.5px dot
  - Bars convey "discrete weekly readings" — more honest than a fake smooth line
- **Tap → navigate to:** `ProgressHub` (existing route)

### 5. Nutrition Rings Card

**Existing component:** `src/components/NutritionRingsCard.tsx` — modify in place.

```
┌─────────────────────────────────────────────────┐
│ TODAY'S NUTRITION         1,420 / 2,400 kcal    │
│  ┌───┐  ┌───┐  ┌───┐  ┌───┐                    │
│  │65%│  │48%│  │72%│  │40%│                    │
│  └───┘  └───┘  └───┘  └───┘                    │
│  Protein Carbs   Fat   Water                    │
│  56g left 142g   21g   38oz                    │
└─────────────────────────────────────────────────┘
```

**Changes from current:**

- **Header row:** Add a right-side total — `1,420 / 2,400 kcal` in `colors.secondary`, font size 9, weight 600. Calorie total is the sum of `protein × 4 + carbs × 4 + fat × 9` and the goal is the sum of macro goals' calorie equivalents.
- **Per-ring tinted seats:** Each ring column gets a faintly tinted background (radius 10, padding 6×4):
  - Protein: `rgba(141,194,138,0.06)` (mint)
  - Carbs: `rgba(255,184,0,0.06)` (gold)
  - Fat: `rgba(232,132,92,0.06)` (coral)
  - Water: `rgba(74,141,183,0.06)` (water blue)
- **Sub-label:** Replace the current `X/Y g` formatting with **`Xg left`** (or `Xoz left` for water) — show the *remaining* amount, not the consumed/goal pair
  - When over goal: show `Xg over` (no negative sign)
  - When at exactly goal: show `Goal hit ✓` in `colors.accent`
- **Ring sizing:** Increase ring SVG to 48×48 (current is smaller); inner percentage text font size 11, weight 700

### 6. Stats Strip

**New component:** `src/components/StatsStrip.tsx` — replaces `WeeklySnapshotCard.tsx`.

```
╭───────────────────────────────────────────╮
│   3        2 (gold)      24.5K lb         │
│ ▲1 vs    ▲1 vs       ▲ 2.1K vs            │
│ last wk  last wk      last wk              │
│ SESSIONS   PRs         TONNAGE            │
╰───────────────────────────────────────────╯
```

- **Container:** Surface card with **subtle gold radial glow** (`rgba(255,184,0,0.08)` from center) and `1px` `rgba(255,184,0,0.15)` border, radius 16, padding `12px 6px`
  - The gold tint is a permanent personality cue for "achievements" — it gets *more* prominent when PRs > 0, but stays present even when PRs = 0
- **Grid:** `1fr 1fr 1.15fr` (tonnage column slightly wider since values like `24.5K lb` are wider)
- **Per-stat structure (each):**
  - Big number: font size 18, weight 700
  - Delta line: font size 9, `colors.textSoft`, with neutral slate triangle arrow + amount + `vs last wk`
  - Label: font size 9, ALL-CAPS, `colors.secondary`, letter-spacing 1, weight 600
- **Dividers:** 1px vertical lines (`colors.border`), 36px tall, between each stat

#### Per-stat treatment

| Stat | Big number color | Delta math (Option B — same-point-in-week) |
|---|---|---|
| Sessions | `colors.textSoft` (soft slate) | `count(workouts, this Mon → now) − count(workouts, last Mon → equivalent point)` |
| PRs | `colors.prGold` `#FFB800` with `text-shadow: 0 0 12px rgba(255,184,0,0.3)` | `count(PRs this Mon → now) − count(PRs last Mon → equivalent point)` |
| Tonnage | `colors.textSoft` | `SUM(weight×reps this Mon → now) − SUM(weight×reps last Mon → equivalent point)`, formatted as `24.5K lb` (single decimal `K` suffix when ≥ 10,000 lb, else raw `lb`) |

**Critical rule — neutral arrows:** Up/down arrows are **always slate-colored** (`colors.textSoft`). Never green/red. The user's training phase determines whether direction is good — the dashboard does not editorialize.

**Tap → navigate to:** `ProgressHub`

---

## New Design Tokens

Add to `src/theme/colors.ts`:

```typescript
// Existing tokens preserved.
// New:
textSoft: '#BDC3CB',                     // Soft slate — neutral data text (Sessions, Volume, Tonnage)
slate: '#5B7A95',                        // Cool slate — trend card accents, neutral indicators
slateGlow: 'rgba(91,122,149,0.14)',      // Trend card top-right radial overlay
slateBorder: 'rgba(91,122,149,0.16)',    // Trend card border
mintRadial: 'rgba(141,194,138,0.35)',    // Hero card top-left mint glow stop
coralBorder: 'rgba(232,132,92,0.30)',    // Streak chip border
coralFill: 'rgba(232,132,92,0.10)',      // Streak chip subtle fill / missed-day pill
coralRest: 'rgba(232,132,92,0.30)',      // Rest-day streak pill
goldGlow: 'rgba(255,184,0,0.08)',        // Stats strip ambient glow
goldBorder: 'rgba(255,184,0,0.15)',      // Stats strip border
```

**Token aliasing notes:**
- Gold already exists as `colors.prGold` — keep using that name for PR celebrations
- Coral does not exist as a top-level token — add `coral: '#E8845C'` (matches the value already used in `hrZone4` and `categoryColors.chest`)
- Mint already exists as `colors.accent` `#8DC28A` — keep using `accent`
- Water already exists as `colors.water` `#4A8DB7` — keep using `water`

---

## Time Window & Comparison Math (Locked)

These rules apply across the dashboard and any future trend visualizations:

### Stats strip — same-point-in-week (Option B)

For Sessions / PRs / Tonnage:

```
thisWeekValue   = aggregate(events, [thisWeekStart, now])
lastWeekValue   = aggregate(events, [lastWeekStart, lastWeekStart + (now − thisWeekStart)])
delta           = thisWeekValue − lastWeekValue
```

`thisWeekStart` and `lastWeekStart` use the existing `getWeekStart()` helper (Monday 00:00 UTC). The "equivalent point" is computed by adding the elapsed time-since-Monday to last week's Monday. This means on Tuesday at 10am, the comparison is "Mon-Tue 10am this week vs Mon-Tue 10am last week" — apples to apples.

### Weight card — 7-day moving average comparison

```
currentMA   = avg(dailyWeight, last 7 days including today)
previousMA  = avg(dailyWeight, [today−14d, today−7d])
delta       = currentMA − previousMA
```

Reason: body weight has ±2 lb daily noise from water/sodium/glycogen. Comparing 7-day means filters that out and shows real trend.

If fewer than 14 days of weigh-ins exist, show `—`.

### Volume card — 4-week mesocycle comparison

```
recentVolume   = SUM(weight_kg × reps) WHERE session.completed_at IN [today−4wk, today]
                                       AND set.is_warmup = 0
priorVolume    = SUM(...) WHERE session.completed_at IN [today−8wk, today−4wk]
                          AND set.is_warmup = 0
delta_pct      = (recentVolume − priorVolume) / priorVolume × 100
```

If fewer than 8 weeks of sessions exist, show `—`.

### Universal rules

- **Never** tie color or copy to the direction of a trend (a down weight could be a cut goal hit OR an unintended drop; a low volume week could be a deload OR a slacker week)
- Up/down arrows are **always** `colors.textSoft` (neutral slate)
- The only "celebratory" color treatment in the dashboard is **gold for PRs** (a PR is unambiguously good regardless of training phase) and the **mint hero glow** (the workout to do today is unambiguously the action)

---

## Data Sources

### Existing (no changes needed)
- `getNextWorkoutDay()` (`src/db/dashboard.ts`) — hero card eyebrow + title
- `getProgramDayExercises()` + `getExercises()` (`src/db/programs.ts`, `src/db/exercises.ts`) — chip names
- `useSession()` — active state for hero card
- `getBodyMetricByDate()` (`src/db/bodyMetrics.ts`) — today's weight
- `getMacroGoals()` + `getTodayMacroTotals()` (`src/db/macros.ts`) — rings
- `getWaterGoal()` + `getTodayWaterTotal()` (`src/db/hydration.ts`) — water ring
- `useGamification()` — currently used for level; **the level value is no longer rendered**

### New / extended
- **Weight 30-day series + 7d MA delta:** new function `getWeightTrend()` returning `{ today: number | null, currentSevenDayMA: number, previousSevenDayMA: number, dailySeries: { date: string; weight: number }[] }`. Pulls from `body_metrics` table.
- **Volume 4-week comparison + 4 weekly bars:** new function `getVolumeTrend()` returning `{ deltaPercent: number | null, weeklyBars: { weekStart: string; tonnage: number }[] }`. Aggregates `workout_sets` joined to `workout_sessions`.
- **Stats strip same-point-in-week:** modify or add alongside `getWeeklySnapshot()` in `src/db/progress.ts`. Returns `{ sessions: { current: number; lastWeek: number }, prs: { current: number; lastWeek: number }, tonnage: { currentLb: number; lastWeekLb: number } }`. Caller computes deltas.
- **Last-session highlight:** new function `getHeroWorkoutContext(programDayId)` returning `{ headlineLift: { exerciseName: string; weight: number; reps: number }, addedSinceLast: number | null }`. Looks up the most recent session for the day, picks the first non-warmup compound, finds the top set, and computes `weight - previousTopSetWeight` if a prior session exists.

---

## Out-of-Scope / New Work

These are flagged so they can be sequenced separately:

### Streak data calculation (NEW SCOPE)
- Streak logic with rest-day awareness does not exist in the codebase
- Need: function `getWorkoutStreak()` that returns `{ currentStreak: number, recentDays: { date: string; status: 'workout' | 'rest' | 'missed' }[] }`
- Definition: a streak starts at the most recent missed planned workout day (or all-time first session) and counts forward to today. Days that the active program prescribes as rest count as "rest" (still part of streak). Days the program prescribes as workout but no session exists count as "missed" (break the streak).
- This requires program-day-of-week scheduling data. Verify whether `program_days` already encodes which days of the week they map to (likely yes via the program-customization phase).
- **Implementation phase recommendation:** Could either be done as part of this dashboard redesign phase or split into a separate phase. If split, the `StreakChip` component renders `null` (or a "Start your streak" empty state) until the data fn lands.

### Tonnage calculation
- The existing `getWeeklySnapshot` returns `volumeChangePercent` — the raw weekly tonnage in lbs is not currently computed for display
- New aggregation: `SUM(weight_kg × reps)` for non-warmup sets in the current ISO week, converted to lb
- Format: `< 1000 lb` → `"845 lb"` (whole number, no suffix). `1000–99,999 lb` → `"4.2K lb"` (one decimal place, K suffix; round half-to-even). `≥ 100,000 lb` → `"125K lb"` (no decimal).

### Hero workout "last time" lookup
- New query for previous session's headline lift on the same `programDayId`
- Edge case: program day has been edited since last session (exercise swapped) — fall back to "first compound in current day"

---

## Removed / Demoted

| Element | Disposition | Rationale |
|---|---|---|
| `LevelBar` component | **Remove from dashboard.** Component file kept (still used in `Achievements` if applicable). | User: "feels superfluous" |
| Page title `Dashboard` | **Removed.** Replaced by greeting. | Generic; greeting + streak chip are more grounding |
| `WeeklySnapshotCard` | **Replaced by `StatsStrip`.** Component file deleted. | Redundancy with new trend cards; restructured around Tonnage instead of Volume % |

---

## Testing

### Unit tests (Jest)
- `getWeightTrend()` — verify 7d MA math with synthetic series (smooth trend, noisy day, missing days, < 14 days of data)
- `getVolumeTrend()` — verify 4-week aggregation excludes warm-ups, handles weeks with no sessions
- Stats strip same-point-in-week — verify partial-week comparison on a Tuesday is comparing Mon-Tue to Mon-Tue, not Mon-Tue to Mon-Sun
- Tonnage formatting — `(845, 4200, 24500)` → `("845 lb", "4.2K lb", "24.5K lb")`
- `getWorkoutStreak()` (if implemented this phase) — happy path, rest day in middle, missed day breaks streak

### Component tests (React Native Testing Library)
- `HeroWorkoutCard` — idle state, active state, no-program state
- `TrendCard` — weight variant + volume variant, insufficient-data fallback (`—`)
- `StreakChip` — renders nothing when streak is 0, renders correct number of bars per status
- `StatsStrip` — neutral arrow direction reflects sign, color is always slate (test that no `colors.accent` or `colors.danger` is rendered for delta arrows)
- `NutritionRingsCard` — `Xg left` shows when under goal, `Goal hit ✓` when at goal, `Xg over` when over

### Visual regression (manual UAT)
- Compare against the v6 mockup at `.superpowers/brainstorm/.../direction-b-v6.html` on a real device (emulator or physical) at the matching viewport
- Verify gradients render correctly on Android (subtle gradients sometimes banding-issue)
- Verify dark mode contrast on both an OLED phone and an LCD phone if possible

---

## Open Questions

1. **Streak data scope** — Should streak logic land in this phase, or be split into its own phase with `StreakChip` shipped as a stub initially? **Default recommendation:** split — keeps this phase focused on the visual redesign.
2. **First-name source** — Where does the user's first name live? (Settings? SessionContext? Need to confirm before implementing greeting.) If we don't have one, fall back to time-of-day greeting alone (`Good morning` / `Good afternoon` / `Good evening`) without name.
3. **Hero "last time" headline lift selection** — Currently spec'd as "first non-warmup compound". Confirm this matches user's mental model, or do we want most-recent-PR'd lift instead?
4. **Trend card chevron behavior** — Tap navigates to detail screens. Weight card → does the existing weight detail exist (probably under Health > Weight), or do we need a placeholder? Volume card → `ProgressHub` is the right destination, confirmed.

---

## Dependencies

- No new npm packages needed (all rendering is RN core + existing `react-native-svg`)
- Reuses existing `ProgressRing` component for nutrition rings (no changes to that component)
- New `TrendCard` will need to author the dual-line + bar-chart sparklines from raw `react-native-svg` primitives — no chart library

---

## Mockup Reference

The locked design is at: **`docs/superpowers/specs/2026-04-23-dashboard-redesign-mockup.html`**

This is a stable copy — open it directly in any browser. The original brainstorm copy at `.superpowers/brainstorm/.../direction-b-v6.html` may be cleaned up over time.
