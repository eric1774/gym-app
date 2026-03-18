# S03: Dashboard Redesign — Category Cards

**Goal:** Dashboard shows ~7 category cards with sparklines instead of the flat 30+ exercise list; Next Workout card unchanged; stale categories dimmed
**Demo:** Open Dashboard → see compact category cards (e.g. "Chest — 3 exercises" with sparkline and delta) instead of individual exercise rows. Categories untrained for 30+ days appear dimmed. Tapping a card navigates to CategoryProgress route. Next Workout / Active Workout card works identically to before.

## Must-Haves

- Dashboard fetches `getCategorySummaries()` instead of `getRecentlyTrainedExercises()`
- Each category renders as a `CategorySummaryCard` with sparkline, delta, and relative time
- Categories with `lastTrainedAt` older than 30 days render with `isStale: true` (dimmed)
- Tapping a category card navigates to `CategoryProgress` route with `{ category }` param
- `CategoryProgress` route added to `DashboardStackParamList` with placeholder screen
- Next Workout card, Active Workout card, empty state, and quick-start all preserved unchanged
- Dead code removed: `RecentExercise`, `SubCategory`, `GroupData` interfaces, `CATEGORY_GROUP_ORDER`, `groupByCategory()`, `handlePress`, and associated group/subCategory/exerciseCard styles
- All old exercise-specific relative time tests replaced with category-card-level tests

## Proof Level

- This slice proves: integration (S01 data + S02 components wired into real dashboard screen)
- Real runtime required: no (Jest tests with mocked DB verify rendering and navigation)
- Human/UAT required: yes (visual check on device deferred to S04 final assembly)

## Verification

- `npx tsc --noEmit` — no new type errors beyond pre-existing ones
- `npx jest src/screens/__tests__/DashboardScreen.test.tsx --verbose` — all new tests pass
- `npx jest src/components/__tests__/CategorySummaryCard.test.tsx --verbose` — S02 tests still pass (regression)
- `npx jest --verbose` — full suite passes, no regressions

## Integration Closure

- Upstream surfaces consumed: `getCategorySummaries()` from S01 (`src/db/dashboard.ts`), `CategorySummaryCard` from S02 (`src/components/CategorySummaryCard.tsx`), `CategorySummary` type from S01 (`src/types/index.ts`)
- New wiring introduced in this slice: `CategoryProgress` route in `DashboardStackParamList` + placeholder screen; dashboard data fetch swap from `getRecentlyTrainedExercises` to `getCategorySummaries`; stale computation and card rendering loop
- What remains before the milestone is truly usable end-to-end: S04 replaces the placeholder `CategoryProgressScreen` with the real implementation, wires time range filtering, and completes the navigation chain

## Tasks

- [x] **T01: Wire CategoryProgress route and rewrite Dashboard to render category cards** `est:30m`
  - Why: This is the core slice work — replaces the flat exercise list with category cards, adds the navigation route, and removes dead code
  - Files: `src/navigation/TabNavigator.tsx`, `src/screens/DashboardScreen.tsx`
  - Do: (1) Add `CategoryProgress: { category: string }` to `DashboardStackParamList` in TabNavigator, register a minimal placeholder screen in `DashboardStackNavigator`. (2) In DashboardScreen: swap `getRecentlyTrainedExercises` import with `getCategorySummaries`, import `CategorySummaryCard` and `CategorySummary`, replace `exercises` state with `categories: CategorySummary[]`, update `useFocusEffect` to fetch `getCategorySummaries()`, replace the grouped ScrollView body with a flat map of `CategorySummaryCard` components with `marginBottom: spacing.sm`, compute `isStale` inline from `lastTrainedAt` (30-day threshold), wire `onPress` to `navigation.navigate('CategoryProgress', { category: summary.category })`. (3) Remove dead code: `RecentExercise`/`SubCategory`/`GroupData` interfaces, `CATEGORY_GROUP_ORDER`, `groupByCategory()`, `handlePress`, and all group/subCategory/exerciseCard styles. Preserve all Next Workout code, empty state, active session timer, `handleQuickStart`, and their styles.
  - Verify: `npx tsc --noEmit` shows no new type errors
  - Done when: DashboardScreen imports `getCategorySummaries`, renders `CategorySummaryCard` components, navigates to `CategoryProgress` on press, dead code is gone, and TypeScript compiles clean

- [ ] **T02: Rewrite DashboardScreen tests for category card rendering** `est:25m`
  - Why: The existing 13 tests mock `getRecentlyTrainedExercises` which is no longer imported — tests must be rewritten to mock `getCategorySummaries` and verify the new card-based rendering
  - Files: `src/screens/__tests__/DashboardScreen.test.tsx`
  - Do: (1) Update the `jest.mock('../../db/dashboard')` block to export `getCategorySummaries` (replacing `getRecentlyTrainedExercises`) alongside `getNextWorkoutDay`. (2) Rewrite test data to use `CategorySummary` objects (with `category`, `exerciseCount`, `sparklinePoints`, `lastTrainedAt`, `measurementType`, `currentBest`, `previousBest`). (3) Test cases: renders Dashboard title, shows empty state when `getCategorySummaries` returns `[]`, renders category cards (check for capitalized category name and exercise count text), stale dimming (card with `lastTrainedAt` > 30 days ago has opacity 0.4), non-stale card has opacity 1, Next Workout card still renders, Active Workout card still renders, pressing a category card triggers navigation to CategoryProgress, multiple categories render multiple cards. (4) Remove all old exercise-specific tests (relative time tests, STRENGTH TRAINING group tests, exercise navigation tests).
  - Verify: `npx jest src/screens/__tests__/DashboardScreen.test.tsx --verbose` — all tests pass; `npx jest --verbose` — full suite passes
  - Done when: All new DashboardScreen tests pass, no references to `getRecentlyTrainedExercises` in test file, S02 CategorySummaryCard tests still pass

## Observability / Diagnostics

- **Runtime signals:** Dashboard logs `catch` block silently on fetch failure; in dev builds, `console.error` should surface `getCategorySummaries()` errors. Empty-state rendering ("No exercises trained yet") is the primary observable indicator of no data.
- **Inspection surfaces:** `categories.length` in the DashboardScreen state array — visible via React DevTools or `console.log` in the `useFocusEffect` callback. Each `CategorySummaryCard` has `testID="category-card"` for automated test queries.
- **Failure visibility:** If `getCategorySummaries()` throws, the dashboard falls through to `categories.length === 0` and renders the empty state. No crash, but no data shown. Navigation failures (missing `CategoryProgress` route) surface as a React Navigation runtime error in the console.
- **Redaction constraints:** No PII or secrets in this slice — exercise names and category labels are user-generated but non-sensitive.

## Files Likely Touched

- `src/navigation/TabNavigator.tsx`
- `src/screens/DashboardScreen.tsx`
- `src/screens/__tests__/DashboardScreen.test.tsx`
