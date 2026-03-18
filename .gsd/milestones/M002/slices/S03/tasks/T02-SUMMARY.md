---
id: T02
parent: S03
milestone: M002
provides:
  - 9 DashboardScreen tests covering category card rendering, stale dimming, empty state, Next Workout/Active Workout preservation, CategoryProgress navigation
key_files:
  - src/screens/__tests__/DashboardScreen.test.tsx
key_decisions:
  - Adjusted makeSummary fixture to match actual CategorySummary type (no currentBest/previousBest fields, which exist only on CategoryExerciseProgress)
patterns_established:
  - Flatten array-style props to extract opacity from CategorySummaryCard's composed style prop
observability_surfaces:
  - npx jest src/screens/__tests__/DashboardScreen.test.tsx --verbose — 9 named tests covering category cards, stale dimming, empty state, Next Workout, Active Workout, and navigation
duration: 8m
verification_result: passed
completed_at: 2026-03-17
blocker_discovered: false
---

# T02: Rewrite DashboardScreen tests for category card rendering

**Rewrote DashboardScreen test suite: 9 tests covering category cards, stale dimming (opacity 0.4), empty state, Next Workout/Active Workout cards, and CategoryProgress navigation**

## What Happened

Replaced the entire 13-test DashboardScreen test file that mocked `getRecentlyTrainedExercises` with 9 focused tests mocking `getCategorySummaries`. Created a `makeSummary` factory aligned with the real `CategorySummary` type. Tests verify: title rendering, empty state text, 2-card rendering with capitalized names and exercise counts, stale card opacity (0.4 at 45 days), non-stale card opacity (1 at 5 days), Next Workout card contents, Active Workout card with Continue button, navigation on card press, and multiple card count (3 cards).

## Verification

- `npx jest src/screens/__tests__/DashboardScreen.test.tsx --verbose` — 9/9 pass
- `npx jest src/components/__tests__/CategorySummaryCard.test.tsx --verbose` — 9/9 pass (S02 regression)
- `npx jest --verbose` — 499/503 pass, 4 pre-existing failures in protein.test.ts (streak tests), 0 regressions from this task
- `grep -c "getRecentlyTrainedExercises" src/screens/__tests__/DashboardScreen.test.tsx` — returns 0

## Diagnostics

- Run `npx jest src/screens/__tests__/DashboardScreen.test.tsx --verbose` to see all 9 named test results
- Tests query `testID="category-card"` elements — same surface available in React DevTools
- Style assertions (opacity 0.4 vs 1) validate stale-dimming behavior
- Mock contract drift (field renames in CategorySummary) surfaces as type errors or render failures

## Deviations

- Plan's `makeSummary` fixture included `currentBest` and `previousBest` fields that don't exist on `CategorySummary` type (they're on `CategoryExerciseProgress`). Removed them to match the actual type.

## Known Issues

- 4 pre-existing failures in `src/db/__tests__/protein.test.ts` (getStreakDays tests) — unrelated to this task, existed before.

## Files Created/Modified

- `src/screens/__tests__/DashboardScreen.test.tsx` — Full rewrite: 9 tests mocking getCategorySummaries, verifying category cards, stale dimming, empty state, Next/Active Workout, and navigation
- `.gsd/milestones/M002/slices/S03/tasks/T02-PLAN.md` — Added Observability Impact section (pre-flight fix)
