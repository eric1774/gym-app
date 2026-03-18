---
id: S03
parent: M002
milestone: M002
provides:
  - Dashboard renders ~7 CategorySummaryCard components instead of flat 30+ exercise rows
  - CategoryProgress route registered in DashboardStackParamList with placeholder screen
  - Stale dimming (opacity 0.4) for categories untrained 30+ days
  - Navigation from card press to CategoryProgress with { category } param
  - 9 DashboardScreen tests covering cards, stale dimming, empty state, Next/Active Workout, and navigation
requires:
  - slice: S01
    provides: getCategorySummaries() function and CategorySummary type from src/db/dashboard.ts and src/types/index.ts
  - slice: S02
    provides: CategorySummaryCard component from src/components/CategorySummaryCard.tsx
affects:
  - S04
key_files:
  - src/screens/DashboardScreen.tsx
  - src/navigation/TabNavigator.tsx
  - src/screens/__tests__/DashboardScreen.test.tsx
key_decisions:
  - Full rewrite of DashboardScreen rather than incremental edits — dead code removal was extensive enough to warrant it
  - Inline stale computation (30-day threshold) in the render map rather than in the data layer — keeps DB queries pure and threshold logic in the UI layer (D004)
  - Placeholder screen for CategoryProgress registered inline in TabNavigator.tsx rather than as a separate file
patterns_established:
  - Inline stale computation from lastTrainedAt in the component render rather than the data layer
  - Placeholder screens registered inline in TabNavigator.tsx for routes not yet implemented
  - Test fixtures use factory functions (makeSummary) aligned to actual TypeScript types
observability_surfaces:
  - testID="category-card" on each CategorySummaryCard — queryable via getAllByTestId in tests and React DevTools
  - Empty state ("No exercises trained yet") renders when getCategorySummaries returns [] or throws
  - React Navigation runtime error in console if CategoryProgress route is missing
  - npx jest src/screens/__tests__/DashboardScreen.test.tsx --verbose — 9 named tests covering all card behaviors
drill_down_paths:
  - .gsd/milestones/M002/slices/S03/tasks/T01-SUMMARY.md
  - .gsd/milestones/M002/slices/S03/tasks/T02-SUMMARY.md
duration: 16m
verification_result: passed
completed_at: 2026-03-17
---

# S03: Dashboard Redesign — Category Cards

**Dashboard rewritten from flat 30+ exercise list to ~7 compact CategorySummaryCard components with sparklines, stale dimming, and CategoryProgress navigation route**

## What Happened

This slice integrated S01's data layer and S02's UI components into the live Dashboard screen, completing the core visual redesign.

**T01 (8m)** rewrote `DashboardScreen.tsx` — swapped `getRecentlyTrainedExercises` for `getCategorySummaries`, replaced the grouped ScrollView body with a flat map of `CategorySummaryCard` components, and added inline 30-day stale computation. Added `CategoryProgress: { category: string }` to `DashboardStackParamList` in `TabNavigator.tsx` with an inline placeholder screen. Removed ~100 lines of dead code: `RecentExercise`, `SubCategory`, `GroupData` interfaces, `CATEGORY_GROUP_ORDER` constant, `groupByCategory()` function, `handlePress` callback, and 11 unused styles. All Next Workout, Active Workout, empty state, and quick-start code preserved untouched.

**T02 (8m)** rewrote `DashboardScreen.test.tsx` from scratch — replaced 13 tests mocking `getRecentlyTrainedExercises` with 9 focused tests mocking `getCategorySummaries`. Tests verify: title rendering, empty state, card rendering with capitalized names and exercise counts, stale dimming (opacity 0.4 at 45 days), non-stale opacity (1 at 5 days), Next Workout card, Active Workout card with Continue button, CategoryProgress navigation on press, and multiple card count.

## Verification

- `npx tsc --noEmit` — no new type errors (all errors are pre-existing test module alias issues)
- `npx jest src/screens/__tests__/DashboardScreen.test.tsx --verbose` — 9/9 pass
- `npx jest src/components/__tests__/CategorySummaryCard.test.tsx --verbose` — 9/9 pass (S02 regression check)
- `npx jest --verbose` — 499/503 pass, 4 pre-existing failures in protein.test.ts (streak tests), 0 regressions from S03
- Dead code removal verified: grep for `RecentExercise`, `SubCategory`, `GroupData`, `CATEGORY_GROUP_ORDER`, `groupByCategory`, `handlePress` — none found in DashboardScreen.tsx
- `CategoryProgress` route confirmed in DashboardStackParamList type, placeholder component, and navigator registration

## Deviations

- Removed `weightSemiBold` and `weightMedium` from typography imports — not mentioned in plan but follows naturally from dead code removal (only used by deleted styles)
- T02 `makeSummary` fixture dropped `currentBest`/`previousBest` fields that the plan included — those fields exist on `CategoryExerciseProgress` (S04's type), not `CategorySummary`

## Known Limitations

- `CategoryProgress` route renders a placeholder screen ("Category Progress — Coming Soon") — S04 replaces this with the real implementation
- No on-device visual verification yet — deferred to S04 final assembly UAT
- Stale threshold (30 days) is hardcoded inline — works for now but not user-configurable

## Follow-ups

- S04 must replace `CategoryProgressPlaceholder` with real `CategoryProgressScreen` implementation
- S04 should verify the full navigation chain on device: Dashboard → CategoryProgress → ExerciseProgress → back

## Files Created/Modified

- `src/navigation/TabNavigator.tsx` — Added `CategoryProgress: { category: string }` to DashboardStackParamList, inline placeholder component, registered in DashboardStackNavigator
- `src/screens/DashboardScreen.tsx` — Full rewrite: getCategorySummaries() data fetch, CategorySummaryCard rendering, stale computation, CategoryProgress navigation, ~100 lines of dead code removed
- `src/screens/__tests__/DashboardScreen.test.tsx` — Full rewrite: 9 tests mocking getCategorySummaries covering cards, stale dimming, empty state, Next/Active Workout, navigation

## Forward Intelligence

### What the next slice should know
- The `CategoryProgress` route already exists in `DashboardStackParamList` and the navigator — S04 just needs to replace the placeholder component with the real `CategoryProgressScreen`. The param is `{ category: string }`.
- `getCategoryExerciseProgress(category)` from S01 is the data source for the detail screen — it's already built and tested but not yet consumed by any screen.
- The time range pills pattern from `ExerciseProgressScreen` is the model for S04's time range filtering — look at that screen for the established pattern.

### What's fragile
- The test mock contract (`jest.mock('../../db/dashboard')`) must export exactly `getCategorySummaries` and `getNextWorkoutDay` — if S04 adds imports from dashboard.ts, the mock block needs updating
- Stale threshold is `30 * 24 * 60 * 60 * 1000` inline — if this needs to be shared with other screens, extract to a constant

### Authoritative diagnostics
- `npx jest src/screens/__tests__/DashboardScreen.test.tsx --verbose` — 9 tests verify the complete dashboard integration
- `npx jest src/components/__tests__/CategorySummaryCard.test.tsx --verbose` — 9 tests verify the card component (S02)
- `npx tsc --noEmit` — type safety across the integration boundary

### What assumptions changed
- Plan assumed `makeSummary` would include `currentBest`/`previousBest` — those fields are on `CategoryExerciseProgress`, not `CategorySummary`. The types were already correct in S01; the plan's fixture was slightly wrong.
