---
id: T01
parent: S03
milestone: M002
provides:
  - CategoryProgress route in DashboardStackParamList with placeholder screen
  - DashboardScreen rewritten to render CategorySummaryCard components from getCategorySummaries()
  - All dead flat-list code removed (interfaces, constants, functions, styles)
key_files:
  - src/navigation/TabNavigator.tsx
  - src/screens/DashboardScreen.tsx
key_decisions:
  - Full rewrite of DashboardScreen rather than incremental edits — dead code removal was extensive enough to warrant it
patterns_established:
  - Inline stale computation (30-day threshold) in the render map rather than in the data layer
  - Placeholder screens registered inline in TabNavigator.tsx rather than separate files
observability_surfaces:
  - testID="category-card" on each CategorySummaryCard for automated test queries
  - Empty state ("No exercises trained yet") renders when getCategorySummaries returns []
  - React Navigation runtime error in console if CategoryProgress route is missing
duration: 8m
verification_result: passed
completed_at: 2026-03-17
blocker_discovered: false
---

# T01: Wire CategoryProgress route and rewrite Dashboard to render category cards

**Replaced flat exercise list in DashboardScreen with CategorySummaryCard components powered by getCategorySummaries(), added CategoryProgress navigation route with placeholder screen, removed all dead flat-list code**

## What Happened

1. Added `CategoryProgress: { category: string }` to `DashboardStackParamList` in TabNavigator.tsx
2. Created inline `CategoryProgressPlaceholder` component and registered it in `DashboardStackNavigator`
3. Rewrote DashboardScreen.tsx: swapped `getRecentlyTrainedExercises` import for `getCategorySummaries`, replaced `exercises` state with `categories: CategorySummary[]`, updated `useFocusEffect` to fetch `getCategorySummaries()`, replaced grouped ScrollView body with flat map of `CategorySummaryCard` with 30-day stale computation and `CategoryProgress` navigation on press
4. Removed all dead code: `RecentExercise`, `SubCategory`, `GroupData` interfaces, `CATEGORY_GROUP_ORDER` constant, `groupByCategory()` function, `handlePress` callback, `useMemo` import, and 11 unused styles (groupWrapper, groupHeaderStrip, groupHeader, surfaceContainer, subCategoryHeader, subCategorySpacing, card, cardRow, exerciseName, timeAgo, category)
5. Preserved: Next Workout card, Active Workout timer, empty state, `handleQuickStart`, `formatRelativeTime` import

## Verification

- `npx tsc --noEmit` — no new type errors (all errors are pre-existing test module alias issues)
- `grep` for dead code references (RecentExercise, SubCategory, GroupData, CATEGORY_GROUP_ORDER, groupByCategory, handlePress) — none found in DashboardScreen.tsx
- `CategoryProgress` present in DashboardStackParamList type (line 50), placeholder component (line 161), and navigator (line 175)
- CategorySummaryCard tests: 9/9 pass (no regression from S02)
- DashboardScreen tests: 11/13 fail as expected — they mock `getRecentlyTrainedExercises` which is no longer imported. T02 rewrites these.

### Slice-level verification (partial — intermediate task):
- ✅ `npx tsc --noEmit` — no new type errors
- ❌ `npx jest src/screens/__tests__/DashboardScreen.test.tsx` — 11 failures (expected, T02 rewrites tests)
- ✅ `npx jest src/components/__tests__/CategorySummaryCard.test.tsx` — 9/9 pass
- ⏳ `npx jest --verbose` — not run (full suite deferred to T02 after test rewrite)

## Diagnostics

- Each `CategorySummaryCard` has `testID="category-card"` — queryable via `getAllByTestId('category-card')` in tests
- Empty state is the observable fallback when `getCategorySummaries()` returns `[]` or throws
- Navigation to `CategoryProgress` can be verified via React Navigation's state inspection or pressing a card in the app

## Deviations

- Removed `weightSemiBold` and `weightMedium` from typography imports since they were only used by deleted styles — plan didn't explicitly mention this but it follows from dead code removal

## Known Issues

- DashboardScreen tests (13 existing) are broken — 11 fail because they mock `getRecentlyTrainedExercises`. T02 is specifically scoped to rewrite them.

## Files Created/Modified

- `src/navigation/TabNavigator.tsx` — Added `CategoryProgress: { category: string }` to DashboardStackParamList, inline placeholder component, registered in DashboardStackNavigator
- `src/screens/DashboardScreen.tsx` — Full rewrite: category cards replace flat exercise list, dead code removed (~100 lines shorter)
- `.gsd/milestones/M002/slices/S03/S03-PLAN.md` — Added Observability / Diagnostics section
- `.gsd/milestones/M002/slices/S03/tasks/T01-PLAN.md` — Added Observability Impact section
