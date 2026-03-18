# M002: Exercise Progression Dashboard Redesign — Category Drill-Down

**Gathered:** 2026-03-17
**Status:** Ready for planning

## Project Description

Redesign the GymTrack Dashboard screen to replace the flat 30+ exercise list with compact category drill-down cards showing sparkline trends. Tapping a card opens a new CategoryProgressScreen listing all exercises in that category with mini-charts.

## Why This Milestone

The Dashboard currently lists every trained exercise (30+) in a flat ScrollView grouped by category. This makes it tedious to find a specific exercise or glance at progression. Users want to view workout progression over time by category/exercise without crowding the dashboard.

## User-Visible Outcome

### When this milestone is complete, the user can:

- View ~7 compact category cards on the Dashboard with best-weight-trend sparklines instead of 30+ flat exercise rows
- Tap a category card to drill down into all exercises in that category with mini-charts and deltas
- See stale categories (not trained in 30+ days) dimmed but still visible
- Filter exercise progress by time range (1M/3M/6M/All) on the category drill-down screen
- Navigate from category drill-down to existing per-exercise progress screens

### Entry point / environment

- Entry point: Dashboard tab in the GymTrack app
- Environment: Android device/emulator
- Live dependencies involved: none (local SQLite only)

## Completion Class

- Contract complete means: DB queries return correct category summaries and exercise progress data; components render with correct props
- Integration complete means: Dashboard → CategoryProgressScreen → ExerciseProgressScreen navigation flow works end-to-end with real data
- Operational complete means: none (no services or lifecycle concerns)

## Final Integrated Acceptance

To call this milestone complete, we must prove:

- Dashboard shows category cards with sparklines using real logged workout data
- Tapping a category card navigates to CategoryProgressScreen showing all exercises with sparklines and deltas
- Time range filter on CategoryProgressScreen updates sparkline data
- Tapping an exercise on CategoryProgressScreen navigates to existing ExerciseProgressScreen
- Stale categories appear dimmed; timed exercises show duration format
- App builds and deploys to device without errors

## Risks and Unknowns

- Sparkline SVG performance with many categories — low risk, only ~7 cards on dashboard, lightweight SVG polyline
- DB query performance for batch sparkline data — medium risk, need to aggregate across multiple exercises and sessions efficiently
- Removing SubCategorySection without breaking other consumers — low risk, verify no other screens reference it

## Existing Codebase / Prior Art

- `src/db/dashboard.ts` — existing `getExerciseProgressData()` SQL pattern to adapt for batch sparkline queries
- `src/screens/DashboardScreen.tsx` — current flat exercise list to replace; contains `formatRelativeTime()`, `CATEGORY_GROUP_ORDER`, card styling
- `src/screens/ExerciseProgressScreen.tsx` — time range filter pills UI pattern to reuse
- `src/navigation/TabNavigator.tsx` — Dashboard stack navigator to extend with new route
- `src/theme/colors.ts`, `spacing.ts`, `typography.ts` — existing theme tokens
- `react-native-svg` — already installed, provides `Svg` and `Polyline` for sparklines

> See `.gsd/DECISIONS.md` for all architectural and pattern decisions — it is an append-only register; read it during planning, append to it during execution.

## Relevant Requirements

- Dashboard progression viewing — this milestone replaces the flat list with a more usable category drill-down pattern

## Scope

### In Scope

- New DB queries for category summaries and per-category exercise progress
- New types: `CategorySummary`, `CategoryExerciseProgress`
- New component: `MiniSparkline` (SVG-based)
- New component: `CategorySummaryCard`
- New screen: `CategoryProgressScreen`
- Redesigned `DashboardScreen` with category cards
- Navigation updates for `CategoryProgress` route
- Stale category dimming (30+ days)
- Time range filtering on CategoryProgressScreen
- Duration format for timed exercises

### Out of Scope / Non-Goals

- Changing the Next Workout card on Dashboard
- Modifying the existing ExerciseProgressScreen
- Adding new exercise categories or types
- Cloud sync or data export changes
- Protein tracking changes

## Technical Constraints

- Android only — React Native targeting Android API 26+
- Zero internet dependency — all data local SQLite
- Must use existing theme tokens (dark-mint-card-ui)
- Must use already-installed `react-native-svg` for sparklines (no new chart libraries)

## Integration Points

- `src/db/dashboard.ts` — new queries integrate with existing SQLite database and migration v7 schema
- `src/navigation/TabNavigator.tsx` — new screen added to Dashboard stack
- `src/screens/ExerciseProgressScreen.tsx` — CategoryProgressScreen navigates to this existing screen

## Open Questions

- None — user decisions already made (best weight metric, dim-don't-hide for stale categories)
