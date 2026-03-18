# S03: Dashboard Redesign — Category Cards — Research

**Date:** 2026-03-17
**Depth:** Light research — straightforward wiring of S01 data + S02 components into existing DashboardScreen with known patterns.

## Summary

S03 replaces the flat exercise list in `DashboardScreen.tsx` with category summary cards from S02, powered by the `getCategorySummaries()` query from S01. The work is contained almost entirely in one file (`DashboardScreen.tsx`), plus a navigation type addition in `TabNavigator.tsx` and test updates.

The current dashboard fetches `getRecentlyTrainedExercises()` → groups by category via local `groupByCategory()` → renders groups with sub-categories and per-exercise cards. The new version fetches `getCategorySummaries()` → renders `CategorySummaryCard` for each result, with stale dimming computed from `lastTrainedAt`. The Next Workout card, active session timer, and empty state are all preserved unchanged.

S03 also prepares the `CategoryProgress` navigation route (type + placeholder screen registration) so S04 can plug in the real screen without modifying S03's files.

## Recommendation

Straight replacement approach:
1. Replace `getRecentlyTrainedExercises` data fetch with `getCategorySummaries` in the `useFocusEffect` callback
2. Replace the grouped ScrollView body (groups → subCategories → exercise cards) with a flat list of `CategorySummaryCard` components
3. Remove dead code: `RecentExercise`, `SubCategory`, `GroupData` interfaces, `CATEGORY_GROUP_ORDER`, `groupByCategory()`, `handlePress` (exercise-level navigation moves to S04)
4. Add `CategoryProgress` route to `DashboardStackParamList` in `TabNavigator.tsx`
5. Wire `onPress` on each card to `navigation.navigate('CategoryProgress', { category })`
6. Update tests to mock `getCategorySummaries` instead of `getRecentlyTrainedExercises`

## Implementation Landscape

### Key Files

- **`src/screens/DashboardScreen.tsx`** (270 lines) — The primary file to modify. Currently imports `getRecentlyTrainedExercises` and `getNextWorkoutDay` from `../db/dashboard`. The entire exercise list section (groups → subCategories → exercise cards) gets replaced. The Next Workout card block (lines 133–170), active session timer (lines 75–84), `handleQuickStart` (lines 116–142), empty state (lines 172–178), and all Next Workout / container styles are preserved. Dead code to remove: `RecentExercise` interface (lines 26–32), `SubCategory` interface (lines 34–37), `GroupData` interface (lines 39–42), `CATEGORY_GROUP_ORDER` constant (lines 44–48), `groupByCategory()` function (lines 50–64), `handlePress` callback (lines 114–122), and all group/subCategory/exerciseCard styles (lines ~215–265).
- **`src/navigation/TabNavigator.tsx`** — Add `CategoryProgress: { category: string }` to `DashboardStackParamList` (line ~51). Register a placeholder screen in `DashboardStackNavigator` function. This lets S03's `onPress` handler type-check and navigate, and S04 replaces the placeholder with the real `CategoryProgressScreen`.
- **`src/screens/__tests__/DashboardScreen.test.tsx`** — Rewrite to mock `getCategorySummaries` instead of `getRecentlyTrainedExercises`. Tests must verify: empty state still works, category cards render from summary data, stale dimming logic (30-day threshold), Next Workout card still renders, navigation to `CategoryProgress` on card press.
- **`src/components/CategorySummaryCard.tsx`** — Consumed as-is from S02. No modifications needed. Accepts `{ summary: CategorySummary, isStale: boolean, onPress: () => void }`.
- **`src/db/dashboard.ts`** → `getCategorySummaries()` — Consumed as-is from S01. Returns `CategorySummary[]` with `lastTrainedAt` per category. S03 computes `isStale` by checking if `lastTrainedAt` is older than 30 days.
- **`src/types/index.ts`** — No changes. `CategorySummary` type already defined by S01.

### Build Order

1. **Navigation type + placeholder** — Add `CategoryProgress` route to `DashboardStackParamList` and register a minimal placeholder screen in the navigator. This unblocks the dashboard's `onPress` handler from compiling.
2. **Dashboard rewrite** — Replace the data fetch and render body. This is the core task. Import `getCategorySummaries` and `CategorySummaryCard`, compute stale from `lastTrainedAt`, render cards in a ScrollView. Remove all dead flat-list code.
3. **Test rewrite** — Update `DashboardScreen.test.tsx` to mock `getCategorySummaries` returning `CategorySummary[]` data. Verify card rendering, empty state, stale dimming, and preserved Next Workout behavior.

These can reasonably be done as 2 tasks: (1) navigation prep, (2) dashboard rewrite + tests — since the navigation change is tiny and the dashboard + test changes are tightly coupled.

### Verification Approach

- `npx tsc --noEmit` — no new type errors (existing pre-existing errors only)
- `npx jest src/screens/__tests__/DashboardScreen.test.tsx --verbose` — all new tests pass
- `npx jest src/components/__tests__/CategorySummaryCard.test.tsx --verbose` — S02 tests still pass (regression check for import changes)
- `npx jest --verbose` — full suite passes, confirming no regressions

## Constraints

- **Next Workout card is untouched** — the entire `nextWorkout` block (state, fetch, timer, render, styles) must be preserved exactly as-is
- **`getRecentlyTrainedExercises` may still be used elsewhere** — it's exported from `src/db/index.ts` and referenced in its own tests. Do NOT remove it from the DB layer; only remove the import from `DashboardScreen.tsx`
- **`formatRelativeTime` stays** — already imported from `src/utils/formatRelativeTime.ts` by both `DashboardScreen` and `CategorySummaryCard`. Dashboard no longer calls it directly (card handles it), but keep the import available if needed for other dashboard elements
- **`CategoryProgress` placeholder must be minimal** — just enough to make navigation work. A simple View+Text component inline in `TabNavigator.tsx` or a stub file. S04 replaces it entirely.

## Common Pitfalls

- **Stale computation must use `lastTrainedAt` from `CategorySummary`, not a separate query** — compute `isStale = Date.now() - new Date(summary.lastTrainedAt).getTime() > 30 * 24 * 60 * 60 * 1000` inline in the render. Don't add a DB field for this.
- **Don't remove styles used by the Next Workout card** — the card styles (`nextWorkoutCard`, `nextWorkoutLabel`, etc.) share the same StyleSheet. Only remove group/subCategory/exerciseCard styles that are no longer referenced.
- **Test mock structure changes** — the mock for `../../db/dashboard` currently exports `getRecentlyTrainedExercises` and `getNextWorkoutDay`. Must add `getCategorySummaries` to the mock. Keep `getNextWorkoutDay` for Next Workout card tests. Can remove `getRecentlyTrainedExercises` from the mock since DashboardScreen no longer imports it.
- **Card spacing** — `CategorySummaryCard` doesn't include external margins. The dashboard needs to add `marginBottom: spacing.sm` between cards (same pattern as current exercise cards).
