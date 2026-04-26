# Progress Screen Redesign — Design Spec

**Date:** 2026-04-25
**Author:** Brainstorming session (Eric + Claude)
**Branch:** `feat/dashboard-v6-redesign`
**Status:** Ready for implementation planning

---

## Goal

Replace the current Progress / Categories / Sessions screens with a redesigned, exercise-first hub that surfaces both per-exercise trends and per-program-day week-over-week trends, applies the v6 personality system (warm/cool/gold zones, anti-AI-slop principles), and consolidates two redundant exercise-detail screens into one.

## Context

**Current entry**: Dashboard Volume card → `ProgressHubScreen` (Categories tab + Sessions tab).

**Current pain**:
- `ProgressHubScreen` Categories tab is a 2-col grid of 7 anatomical SVG icons + muscle-group cards — generic, no hierarchy, doesn't honor bento research.
- Two parallel exercise-detail screens exist: `ExerciseProgressScreen.tsx` (~440 LOC) + `ExerciseDetailScreen.tsx` (~475 LOC) with overlapping responsibilities.
- `SessionDayProgressScreen.tsx` and `CategoryProgressScreen.tsx` use `colors.danger` (red) for negative deltas — violates anti-AI-slop rule #1 ("never tie color to trend direction").
- The Categories drill-down + 7-icon grid is visual ceremony for a problem (find an exercise) that wants a flat searchable list.

**Research source**: NotebookLM notebook *"Mastering Modern UI: Glassmorphism and Bento Grid Design"* — distilled principles applied:
- Mobile bento = asymmetric 2-col, mixed tile sizes, mixed information density.
- "Distinctive density" earns the bento aesthetic; bento ceremony for ceremony's sake is slop.
- Volume + strength dual-layer (volume wash background + strength line foreground) shows training relationships at a glance.
- Progressive disclosure for session history: top set + total volume by default, expand for full sets.
- Keep blur ≤ 30px on mobile (GPU jank); corner radii 8–18px.

**Design system**: `dark-mint-card-ui` v6 — warm Action zones, cool Slate Data zones, Gold Achievement zones, anti-AI-slop principles, time-window math (`v6 same-point-in-week` for weekly stats).

## Scope

**In scope**:
1. Visual redesign of `ProgressHubScreen`, `ExerciseDetailScreen`, `SessionDayProgressScreen` per v6 design language.
2. IA cleanup: consolidate the two exercise-detail screens, delete `CategoryProgressScreen`, restructure tabs.
3. New components for the redesigned surfaces.
4. New DB query functions to power the redesigned data needs.
5. Anti-AI-slop fix: remove `colors.danger` from negative-delta paths in `SessionDayProgressScreen`.

**Out of scope** (deferred to future work):
- Animation polish (chart line draw-on, spring tab indicator, sparkline reveal).
- Pull-to-refresh.
- Per-category Stale thresholds.
- 1RM display / Brzycki math.
- Search debounce / result highlighting.
- Tab persistence across navigation cycles.
- Snapshot / pixel-perfect visual tests.
- Removing `react-native-chart-kit` from `package.json` (separate cleanup commit).
- Category-aware PR Watch increment rounding.
- Deep-link `{ category }` route param to ProgressHub.
- Sound / haptic feedback.

---

## Information Architecture

### Navigation map after redesign

```
DashboardScreen
  └─ tap Volume card / Progress button
       │
       ▼
  ProgressHubScreen  (1 screen, 2 segmented views)
       │
       ├─ "Exercises" view (B-primary)
       │     │
       │     └─ tap exercise row
       │           │
       │           ▼
       │     ExerciseDetailScreen  (consolidated — replaces ExerciseProgressScreen)
       │           │
       │           └─ tap chart point (inspect) / long-press history row
       │                 │
       │                 ▼
       │           SessionBreakdownScreen  (existing, light restyle only)
       │
       └─ "Program Days" view (C-secondary)
             │
             └─ tap a program-day card
                   │
                   ▼
             SessionDayProgressScreen  (existing, restyle + delta-color fix)
                   │
                   └─ tap an exercise row
                         │
                         ▼
                   ExerciseDetailScreen  (same consolidated screen)
```

### Routes added/removed (`DashboardStackParamList`)

| Action | Route |
|---|---|
| **Removed** | `CategoryProgress` |
| **Removed** | `ExerciseProgress` |
| **Kept** | `ProgressHub`, `ExerciseDetail`, `SessionDayProgress`, `SessionBreakdown` |

`ProgressHub` takes no required params. No `{ category }` deep-link param (single-user app, not needed).

### Mental model the redesign optimizes for

User's primary lens: **B (exercise-first granularity)** + **C (program-day week-over-week)**.

A (category-first) was the old default; it's demoted to a chip filter inside the Exercises view.

---

## Design Language Application

### v6 zone usage across these screens

| Surface | Zone | Treatment |
|---|---|---|
| Insight strip — PR Watch tile | **Gold (Achievement)** | `goldGlow` ambient radial + `goldBorder` 1px |
| Insight strip — Stale tile | **Slate (Data)** | Plain `surface` background + `slateBorder` |
| Exercise list rows | **Slate (Data)** | Slate gradient + 2.5px left accent in category color |
| Program Day cards | **Slate (Data)** | Slate gradient + slate border |
| Exercise Detail chart card | **Slate (Data)** | `slateGlow` top-right radial + slate gradient |
| Hero stats (Best, Vol 30d, PRs 90d) | **Slate (Data)** | Slate gradient. *Exception*: PRs cell uses `prGold` text color when count > 0 (achievement-legitimate). |
| Tap-to-inspect callout | **Mint (brand-as-callout, not directional)** | `accentGlow` background + 1px mint border |
| Chart line | **Mint (brand)** | `accent` stroke; gold dot for most-recent PR session |
| Chart bars | **Slate** | `slate` fill at 0.45 opacity |
| Chart Y-axis tick labels (left, lb) | **Mint** | Match line color |
| Chart Y-axis tick labels (right, k lb) | **Slate** | Match bar color |

### Anti-AI-slop compliance (mandatory across all 4 screens)

- All delta arrows render in `colors.textSoft` slate. **Never `colors.danger` red, never `colors.accent` mint for direction.**
- Gold (`prGold`) only on PR badges, PR Watch tile, and `PRs · 90d` hero stat when count > 0.
- Mint (`accent`) only as a brand signal: chart line, sparkline strokes, active tab indicator. Never to imply "good direction."
- "—" em-dash for insufficient data; never fake `0%` or `0`.
- No emoji icons anywhere — custom SVGs only.
- Information density without redundancy: no surface duplicates a dashboard surface (no top-of-Hub volume hero, since dashboard already has `VolumeTrendCard`).
- Time-window labels match the math (`Top Movers · 14d` ⇔ 14-day window query, `vs prior 2wk` ⇔ 2-week-vs-2-week math).

---

## Screen Specifications

### Screen 1 — `ProgressHubScreen` (rewritten)

**Layout, top to bottom**:
1. Header: back arrow + "Progress" title + right-aligned exercise/day count meta.
2. **Insight strip** — `InsightStrip` component. Hides entirely if both PR Watch and Stale return null.
3. **Segmented control** — `[Exercises | Program Days]`. Search + chip filter persist across tab switches.
4. **Tab content**:

#### Exercises tab
- Search input (case-insensitive substring match on exercise name).
- Category chip row (`All / Chest / Back / Legs / Shoulders / Arms / Core / Conditioning / Stretching`). Single-select; tap "All" to reset.
- "Top Movers · 14d" section header (hidden when 0 movers; shown with available rows when 1–2 movers; **also hidden entirely when search input is non-empty** — searching collapses the feed to a single "Results" section).
- "All Exercises" section header (replaced with "Results" when search is non-empty).
- List of `ExerciseListRow`, each with:
  - 2.5px left accent stripe in category color.
  - Exercise name (white, weightSemiBold).
  - Meta line: `{Category} · {N} sessions · {relativeTime}`.
  - Sparkline (`MiniSparkline`, last up-to-8 best-weight points, category-tinted stroke).
  - Delta badge: `▲/▼/— X%` in `textSoft` slate.

#### Program Days tab
- Program selector chip row (`getProgramsWithSessionData`). Single-select; defaults to first program.
- "Last 4 weeks · weekly tonnage" section header.
- List of `ProgramDayCard`, each with:
  - Day name (e.g., "Push Day"), bold white.
  - Sub-line: `Last: {weekday} · {N} exercises`.
  - Right-aligned tonnage value: `18,450 lb`.
  - Below tonnage: `▲/▼/— X% vs prior 2wk` in slate.
  - `WeeklyTonnageBars` component: 4 bars (4w/3w/2w/this), mint for current week, slate for history, value labels float above each bar.

### Screen 2 — `ExerciseDetailScreen` (rewritten, consolidated)

**Layout, top to bottom**:
1. Header: back arrow + exercise name (truncated single line).
2. **Hero stats row** — 3-tile grid:
   - `Best · {weight} lb` (white).
   - `Vol · 30d · {volume}` (white).
   - `PRs · 90d · {count}` (gold when > 0, slate when 0).
3. **Time range pills** — `[1M | 3M | 6M | 1Y]`. Active uses `slate` background.
4. **Chart card** — `StrengthVolumeChart`:
   - Title row: "Strength + Volume" + "{N} sessions" sub.
   - Dual-axis layout:
     - Left axis: 4 mint tick labels in lb (e.g., 220 / 200 / 180 / 160), header "━ lb" in mint.
     - Chart area: mint best-weight line foreground, slate volume bars background. Subtle dashed grid lines at 25/50/75% horizontal positions. Gold dot on most recent PR session.
     - Right axis: 4 slate tick labels in k lb (e.g., 25 / 20 / 15 / 10), header "▮ k lb" in slate.
   - X-axis: 3–4 month labels (auto-spaced).
   - Auto-scale ranges: each axis spans `[dataMin × 0.95, dataMax × 1.05]`. Bars and line never start at zero (avoids the dual-axis "tiny line" pitfall).
5. **Tap-to-inspect callout** — `ChartInspectCallout`:
   - Mint glow tile.
   - Default: shows most recent session.
   - On chart point tap: updates to that session's date / weight / volume / "PR" badge.
   - Hint sub-line: "Tap any point on the chart for session details."
6. **Session History section** — header + list of `SessionHistoryRow`:
   - Collapsed by default: `{date}` + `{topSetWeight × topSetReps}` + sub-line `+{N} sets at {weight}` + total volume + "›" chevron.
   - PR badge on right when session is PR.
   - Tap row: expands inline, chevron rotates to ▾, full set list reveals.
   - Long-press: `Alert` with "View Full Workout" → `SessionBreakdown`, "Delete" → confirmation.

### Screen 3 — `SessionDayProgressScreen` (light restyle)

**Structural changes**: minimal — keep current layout.

**Required changes**:
1. **Color fix (critical)**: replace `colors.danger` with `colors.textSoft` in delta-rendering paths. All delta badges render slate regardless of sign.
2. v6 polish: card backgrounds use slate gradient + slate border (matches new `ProgramDayCard` treatment).
3. Add tap-to-navigate: tap exercise row → `ExerciseDetail` with the right params.

### Screen 4 — `SessionBreakdownScreen` (untouched in this spec)

No structural or color changes. v6 token alignment if any obvious slop is found during implementation, but not in scope.

---

## Component Inventory

### NEW components — `src/components/progress/`

| File | Purpose | LOC est. |
|---|---|---|
| `InsightStrip.tsx` | Composes PR Watch + Stale tiles. Hides entirely if both null. | ~50 |
| `PRWatchTile.tsx` | Gold-zone tile, closest exercise to a PR. Tap → `ExerciseDetail`. | ~60 |
| `StaleTile.tsx` | Slate-zone tile, longest-untrained exercise. Tap → `ExerciseDetail`. | ~50 |
| `ProgressSegmentedControl.tsx` | `[Exercises | Program Days]` control, screen-specific. | ~50 |
| `CategoryChipRow.tsx` | Horizontal single-select chip filter. | ~70 |
| `ExerciseListRow.tsx` | Row with category accent + name + meta + sparkline + delta. | ~100 |
| `ProgramDayCard.tsx` | Day card composed of header + `WeeklyTonnageBars`. | ~90 |
| `WeeklyTonnageBars.tsx` | 4-bar mini chart with values floating above each bar. | ~80 |
| `StrengthVolumeChart.tsx` | Custom SVG dual-axis chart (mint line + slate bars + gold PR dot). | ~180 |
| `ChartInspectCallout.tsx` | Mint callout below chart showing tapped point details. | ~60 |
| `SessionHistoryRow.tsx` | Collapsed history row with `LayoutAnimation` expand. | ~110 |

Plus matching `__tests__/<name>.test.tsx` for each (~600 LOC of tests total).

### MODIFIED files

| File | Change | LOC delta |
|---|---|---|
| `src/screens/ProgressHubScreen.tsx` | Full rewrite. Delete inline anatomical SVGs. | −300 / +200 |
| `src/screens/ExerciseDetailScreen.tsx` | Replace `react-native-chart-kit` with `StrengthVolumeChart`. Replace `SessionTimelineRow` with `SessionHistoryRow`. v6 token pass. | −80 / +60 |
| `src/screens/SessionDayProgressScreen.tsx` | Color fix: `danger` → `textSoft` slate. v6 polish on cards. Tap row → `ExerciseDetail` navigation. | −10 / +20 |
| `src/screens/__tests__/SessionDayProgressScreen.test.tsx` | Update assertion: deltas use `textSoft`, never `danger`. | −5 / +5 |
| `src/navigation/TabNavigator.tsx` | Remove `CategoryProgress` + `ExerciseProgress` from `DashboardStackParamList`. | −15 / 0 |
| `src/types.ts` (or per-domain types files) | Add `ExerciseListItem`, `ProgramDayWeeklyTonnage`, `PRWatchCandidate`, `StaleExerciseCandidate`, `ChartPoint`. | 0 / +40 |

### DELETED files

| File | Reason |
|---|---|
| `src/screens/CategoryProgressScreen.tsx` | Subsumed by Hub Exercises tab + chip filter. |
| `src/screens/__tests__/CategoryProgressScreen.test.tsx` | Tests for deleted screen. |
| `src/screens/ExerciseProgressScreen.tsx` | Consolidated into `ExerciseDetailScreen`. |
| `src/screens/__tests__/ExerciseProgressScreen.test.tsx` | Tests for deleted screen. |
| `src/components/CategorySummaryCard.tsx` | Verified unused outside Progress flow. |
| `src/components/__tests__/CategorySummaryCard.test.tsx` | Tests for deleted component. |
| `src/components/SessionTimelineRow.tsx` | Replaced by `SessionHistoryRow`. Verify no other consumers before delete. |
| `src/components/__tests__/SessionTimelineRow.test.tsx` | Tests for replaced component. |

### KEPT and reused

- `src/components/MiniSparkline.tsx` — sparklines in `ExerciseListRow`.
- `src/utils/formatRelativeTime.ts` — "1d ago" rendering.
- `src/theme/colors.ts` — already has all v6 tokens needed.
- `src/components/ExerciseCategoryTabs.tsx` — used by `LibraryScreen` and `ExercisePickerSheet`; not touched.

### Net change

```
+22 files (11 components + 11 tests)
−8 files (deleted)
~5 modified
~+300 LOC net (consolidation wins)
0 new npm dependencies
0 schema changes
```

`StrengthVolumeChart` uses `react-native-svg` (already a dependency, used by other v6 components like `GradientBackdrop`, `WeightTrendCard`). Custom SVG, not `react-native-chart-kit` — chart-kit doesn't support clean dual-axis.

---

## Data Layer

All new functions live in `src/db/progress.ts`.

### NEW functions

```ts
// === Hub — Exercises tab =============================================

/**
 * All exercises with their progress data, optionally filtered/searched.
 * Powers the Exercises tab list (incl. Top Movers section).
 */
async function getAllExercisesWithProgress(
  filter: ExerciseCategory | 'all' = 'all',
  search: string = '',
  sort: 'movers' | 'recent' | 'name' = 'recent',
): Promise<ExerciseListItem[]>

interface ExerciseListItem {
  exerciseId: number;
  exerciseName: string;
  category: ExerciseCategory;
  measurementType: 'reps' | 'timed' | 'height_reps';
  lastTrainedAt: string | null;
  sessionCount: number;
  sparklinePoints: number[];          // last up-to-8 best-weight values
  deltaPercent14d: number | null;     // null if <2 sessions in 14d window
}


/**
 * Top N exercises by absolute % change in best weight over the window.
 * Excludes exercises with <2 sessions in the window (insufficient data).
 */
async function getTopMovers(
  windowDays: number = 14,
  limit: number = 3,
): Promise<ExerciseListItem[]>


// === Hub — Program Days tab ==========================================

/**
 * Weekly tonnage for each day in a program, last 4 weeks.
 */
async function getProgramDayWeeklyTonnage(
  programId: number,
): Promise<ProgramDayWeeklyTonnage[]>

interface ProgramDayWeeklyTonnage {
  programDayId: number;
  dayName: string;
  exerciseCount: number;
  lastPerformedAt: string | null;
  weeklyTonnageLb: [number, number, number, number]; // [4wk, 3wk, 2wk, this wk]
  currentWeekTonnageLb: number;                       // = weeklyTonnageLb[3]
  deltaPercent2wk: number | null;                     // last 2wk vs prior 2wk
}


// === Insight strip ===================================================

/**
 * Closest exercise to its current PR — only if within threshold.
 * Returns null when nothing is close (the strip hides that tile).
 *
 * Algorithm:
 *   For each rep-based exercise with at least 3 sessions:
 *     currentBest = max(weight) across all working sets ever
 *     nextTarget = ceil((currentBest + 1) / 5) * 5   // next 5-lb increment
 *     distance = nextTarget - currentBest
 *   Filter: distance > 0 AND distance <= maxLb
 *   Pick:   smallest distance (ties → most recently trained)
 *
 * Excludes timed and height_reps measurement types.
 */
async function getPRWatch(maxLb: number = 10): Promise<PRWatchCandidate | null>

interface PRWatchCandidate {
  exerciseId: number;
  exerciseName: string;
  currentBestLb: number;
  targetLb: number;
  distanceLb: number;
}


/**
 * Longest-untrained exercise that is part of any non-archived program,
 * with `STALE_MIN_DAYS <= daysSinceLastTrained <= STALE_MAX_DAYS`.
 * Anything past 90 days is filtered out — that's "unused", not "stale".
 */
async function getStaleExercise(
  minDays: number = 14,
  maxDays: number = 90,
): Promise<StaleExerciseCandidate | null>

interface StaleExerciseCandidate {
  exerciseId: number;
  exerciseName: string;
  daysSinceLastTrained: number;
  category: ExerciseCategory;
}


// === Exercise Detail — dual-axis chart ===============================

/**
 * Combined strength + volume per session for the chart.
 * One row per session in window, chronological order.
 * isPR flag set when bestWeight in that session was an all-time high
 *   at the time it was recorded (running max from earliest session).
 */
async function getExerciseChartData(
  exerciseId: number,
  range: '1M' | '3M' | '6M' | '1Y',
): Promise<ChartPoint[]>

interface ChartPoint {
  sessionId: number;
  date: string;
  bestWeightLb: number;     // top working set weight
  volumeLb: number;         // sum(weight × reps), working sets only (excludes warmups)
  isPR: boolean;
}
```

### DELETED DB functions

| Function | Replacement |
|---|---|
| `getMuscleGroupProgress` | None — Categories grid is gone. |
| `getCategoryExerciseProgress` | `getAllExercisesWithProgress(filter=category)` |
| `getCategoryExerciseVolumeProgress` | Same — toggle is gone, dual-axis chart shows both. |
| `getExerciseInsights` | Removed — the "Weight up X%" line is gone in the new Exercise Detail; the dual-axis chart conveys the same info more honestly. |

**Verification before delete**: grep each function name across the codebase before removal to confirm no other callers.

### KEPT functions (untouched)

- `getExerciseHistory`, `deleteExerciseHistorySession` — power Session History rows.
- `getProgramsWithSessionData` — program selector chip data.
- `getSessionDayExerciseProgress` — SessionDay drill-down.
- `getStatsStripData`, `getWeightTrend`, `getVolumeTrend`, `getHeroWorkoutContext` — used by Dashboard, untouched.

### Algorithm constants (defaulted, easy to tune)

| Constant | Default | Notes |
|---|---|---|
| `PR_WATCH_MAX_LB` | 10 | Distance threshold from rounded target. |
| `PR_WATCH_INCREMENT_LB` | 5 | Rounding increment (flat across all categories for v1). |
| `STALE_MIN_DAYS` | 14 | Lower bound: exercise must be at least this many days untrained to qualify as stale. Flat across categories for v1. |
| `STALE_MAX_DAYS` | 90 | Upper bound: anything older than this isn't stale, just unused. Excluded from candidates. |
| `TOP_MOVERS_WINDOW_DAYS` | 14 | Matches "Top Movers · 14d" label. |
| `TOP_MOVERS_LIMIT` | 3 | Top 3 by absolute % change. |
| `SPARKLINE_MAX_POINTS` | 8 | Last 8 best-weight values per exercise. |

---

## Behavior, States, Interactions

### Loading

Match existing pattern: silent fetch on `useFocusEffect`, render empty arrays initially, populate on resolve. No spinners, no skeletons. Sub-second on-device queries don't earn a loading flash.

### Empty / insufficient-data states

| Surface | Condition | Behavior |
|---|---|---|
| Insight strip | Both PR Watch + Stale null | Strip hides entirely (no placeholder) |
| PR Watch tile | null (nothing within threshold) | Tile hides; if Stale also null, full strip hides |
| Stale tile | null (nothing past threshold) | Tile hides |
| Top Movers section | <3 movers in window | Show what we have. If 0, hide section header. |
| All Exercises section | No exercises ever logged | "Log your first workout to see exercises here." |
| Exercises tab w/ active chip | No matches for category | "No {category} exercises tracked yet." |
| Search w/ no results | No matches for string | "No exercises match '{search}'." |
| Program Days tab | No programs | "Create a program to track day trends." |
| Program Days tab | Programs but no sessions | "Complete a program workout to see day trends." |
| `ProgramDayCard` | <2 weeks of data | Show available bars + delta = "—" |
| `WeeklyTonnageBars` | Single week available | Show single bar at min height, others empty/dimmed |
| Exercise Detail chart | <2 sessions in range | "Log 2+ sessions to see your trend." Chart hidden, hero stats still render. |
| Sparkline | <2 points | Flat line at midpoint, no gradient fill |
| Delta badges | Insufficient data | "—" em-dash, slate, never `0%` |
| `PRs · 90d` hero stat | 0 PRs | Show "0" in `textSoft` slate (drop the gold) |

### Interactions

#### `ProgressHubScreen`

| Action | Behavior |
|---|---|
| Tap segmented control | Instant switch. Search + chip filter persist across tabs. |
| Tap chip | Filter list. "All" resets. Single-select. |
| Type in search | Filter immediately, no debounce. Case-insensitive substring. |
| Tap PR Watch tile | Navigate to `ExerciseDetail` for that exercise. |
| Tap Stale tile | Navigate to `ExerciseDetail`. |
| Tap exercise row | Navigate to `ExerciseDetail`. |
| Tap Program Day card | Navigate to `SessionDayProgress`. |
| Tap program selector chip | Switch program; refetch days. |
| Pull to refresh | Not supported (matches existing pattern). |
| Tab state on remount | Defaults to "Exercises". |

#### `ExerciseDetailScreen`

| Action | Behavior |
|---|---|
| Tap time range pill | Refilter chart + history. Instant. |
| Tap chart data point | Update inspect callout with that session's data. Highlighted point grows r=3 → r=4.5. |
| Tap blank chart area | Reset inspect callout to most-recent session. |
| Tap session history row | Expand inline (`LayoutAnimation.easeInEaseOut`). Chevron rotates ›→▾. Sets revealed. |
| Tap row again (expanded) | Collapse. |
| Long-press session row | `Alert` with "View Full Workout" (→ `SessionBreakdown`) and "Delete" (destructive, with confirmation). |

#### `SessionDayProgressScreen`

| Action | Behavior |
|---|---|
| Tap exercise row | **NEW**: navigate to `ExerciseDetail`. |
| All deltas | **CRITICAL FIX**: `colors.textSoft` slate. Never `colors.danger`. |

### Animations

V1 minimal:
- Tab switch: instant.
- Chip filter: instant content swap.
- History row expand: single `LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut)` before `setState`.
- Chart point selection: highlighted circle r=3 → r=4.5 instant.
- Insight tiles appear/disappear: render branch only, no enter/exit animation.

### Error handling

Match existing pattern — silent failure with `console.warn`, cancellation flag in `useFocusEffect`:

```ts
useFocusEffect(useCallback(() => {
  let cancelled = false;
  (async () => {
    try {
      const data = await getAllExercisesWithProgress(filter, search);
      if (!cancelled) setExercises(data);
    } catch (err) {
      console.warn('ProgressHub fetch failed:', err);
    }
  })();
  return () => { cancelled = true; };
}, [filter, search]));
```

No retry UI, no error toast — local SQLite is trusted.

### Accessibility

- All tap targets ≥ 44×44.
- Each chip/button/row has a `testID`.
- Chart points: `hitSlop={{ top:12, bottom:12, left:8, right:8 }}` to make small circles touch-friendly.
- Color is never the sole signal: PR is "PR" text + gold; deltas use ▲/▼/— glyphs alongside slate.

### Race conditions

Two scenarios, both handled by the cancellation flag:
1. Filter changes mid-fetch — old chip's data arriving after switch.
2. Tab switch mid-fetch — Program Days query lands after user switched back to Exercises.

Chart point inspection state is purely local — no race possible.

---

## Testing Strategy

Jest + `@testing-library/react-native` matching existing patterns.

### New component tests (`src/components/progress/__tests__/`)

11 test files mirroring 11 new components. Critical assertions per file documented in design Section 5 of the brainstorming session; in summary each covers render correctness, prop-driven behavior, callback firing, and v6 token usage.

### Modified screen tests

| File | Critical updates |
|---|---|
| `ProgressHubScreen.test.tsx` | **Full rewrite.** New: insight strip render conditions, segmented control switches view, chip filter restricts list, search restricts list, top-movers section conditional, navigation params on row tap. |
| `ExerciseDetailScreen.test.tsx` | **Updated.** New: dual-axis chart renders, time-range filter affects chart, history row expand/collapse, long-press menu, removed chart-kit assertions. |
| `SessionDayProgressScreen.test.tsx` | **Critical assertion update.** All delta badges render `colors.textSoft` for negative values, never `colors.danger`. Tap row navigates to `ExerciseDetail`. |

### New DB function tests (`src/db/__tests__/progress.test.ts`)

- `getAllExercisesWithProgress`: filter / search / sort variants, null delta when insufficient.
- `getTopMovers`: top-N by `|delta|`, excludes <2 sessions, mixes positive/negative.
- `getProgramDayWeeklyTonnage`: 4-tuple shape, partial data → null delta, same-point-in-week comparison.
- `getPRWatch`: null when nothing close, smallest-distance candidate, ties broken by recency, excludes timed/height_reps.
- `getStaleExercise`: null when nothing past threshold, longest-untrained candidate, only non-archived programs, 90-day floor.
- `getExerciseChartData`: chronological order, `isPR` running max, range filter, working sets only.

### Verification gates

```bash
npx tsc --noEmit                          # zero type errors
npm test                                  # full Jest suite passes
npm test -- --coverage --watchAll=false   # spot-check coverage on new files
```

### Manual on-device smoke test (documented checklist)

1. Open app → tap Volume card on Dashboard.
2. Hub Exercises tab loads. Insight strip visible (or honestly hidden).
3. Tap a category chip → list filters.
4. Tap a row → Exercise Detail loads with dual-axis chart.
5. Tap a chart point → Inspect Callout updates.
6. Tap a history row → expands inline.
7. Long-press a history row → menu appears.
8. Back → Hub. Switch to Program Days tab → cards render with bars.
9. Tap a Program Day → SessionDayProgress loads. Verify deltas are slate, not red.
10. Tap an exercise row in SessionDay → ExerciseDetail loads.

---

## Risks

1. **Dual-axis chart scaling pitfall.** Best-weight 10% range vs volume 67% range can mislead the eye. **Mitigation**: both axes auto-scale to `[dataMin × 0.95, dataMax × 1.05]`; documented in `StrengthVolumeChart`; tested with seeded narrow-range fixture.
2. **PR Watch target shift.** As user grinds toward 200, the rounded target stays at 200 but distance shrinks. Acceptable for v1; alternative (frozen target) costs more code for marginal UX gain.
3. **Stale tile false positives from archived programs.** **Mitigation**: `getStaleExercise` filters non-archived programs only. Schema supports archived flag (recent commit `5a1befa`).
4. **Test churn temporarily reduces coverage.** Net assertion count goes up (~115 vs ~80 current); rebuilt screens cover same surface; brief fluctuation acceptable on a single-user app.
5. **Type-check fallout from deleted routes.** Removing `CategoryProgress` + `ExerciseProgress` produces TS errors at every callsite. **Mitigation**: TS errors *are* the test; predictable fix-list, single grep.
6. **`react-native-chart-kit` orphan.** Leave installed during implementation; verify no remaining consumers post-rewrite; uninstall in separate cleanup commit if orphaned.

---

## Migration / Rollout

**Single PR, single milestone.** Single-user app, no external breaking-change concerns. The implementation plan should sequence:

1. **Types + DB functions** — verify with DB tests in isolation, no UI yet.
2. **Atomic UI components** — `InsightStrip`, `PRWatchTile`, `StaleTile`, `ProgressSegmentedControl`, `CategoryChipRow`.
3. **Composite UI components** — `ExerciseListRow`, `ProgramDayCard`, `WeeklyTonnageBars`, `SessionHistoryRow`.
4. **Chart components** — `StrengthVolumeChart`, `ChartInspectCallout`.
5. **`ProgressHubScreen` rewrite** — new layout, both tabs.
6. **`ExerciseDetailScreen` rewrite** — consolidates `ExerciseProgressScreen`.
7. **`SessionDayProgressScreen` color fix + light restyle.**
8. **Navigation cleanup** — delete dead screens + tests, remove routes from `DashboardStackParamList`, fix all callsites until type-checker is green.
9. **On-device smoke test pass.**

Each task → atomic commit. Type-checker is green only after Task 8.

### Database migration

**None.** All new functions are read-only against existing tables.

### Performance budget

- `getAllExercisesWithProgress` for ~30 exercises: target <200 ms on-device.
- `ProgressHubScreen` initial paint with all queries: target <500 ms.
- `StrengthVolumeChart` render with 100 data points: target <100 ms.

If any miss in real-data testing, optimize the offending query (CTE consolidation is the first lever).

---

## Visual References

The full visual mockups for all 4 screens (Hub Exercises, Hub Program Days, Exercise Detail with dual-axis chart, restyled Session Day) are captured in `.superpowers/brainstorm/<session>/content/final-screens.html` from the brainstorming session. They are the canonical visual reference. Each screen above describes the layout sufficiently to implement without referring to the mockups.

---

## Open Questions

None remaining at spec time. All decisions locked during the brainstorming session:

- Scope: visual + IA cleanup (B).
- Mental model: exercise-first primary, program-day secondary (B+C).
- Hub structure: thin insight strip + segmented feed (no hero).
- Program Days delta math: last 2wk vs prior 2wk.
- Chart approach: dual-axis Variant 2 (full Y-tick labels, color-matched).
- Strength metric: best weight (no 1RM).
- Session history: collapsed by default with inline expand.
- Hero stats: keep 3-tile (Best / Vol 30d / PRs 90d).
- Insight tiles: hide when null (no placeholder).
- Error handling: silent + console.warn (existing pattern).
- No deep-link `{ category }` route param.
- Single PR rollout.
- `react-native-chart-kit` removal: separate cleanup commit if orphaned.
