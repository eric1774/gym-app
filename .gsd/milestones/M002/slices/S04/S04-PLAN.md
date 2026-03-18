# S04: CategoryProgressScreen & Navigation

**Goal:** Tapping a category card on the Dashboard opens a CategoryProgressScreen showing all exercises in that category with sparklines, deltas, time range filtering, and navigation to ExerciseProgressScreen.
**Demo:** Dashboard → tap "Chest" card → CategoryProgressScreen shows exercise list with sparklines and "+X.X kg" deltas → tap time range pill "3M" → data re-filters → tap "Bench Press" row → navigates to ExerciseProgressScreen → back → back → Dashboard.

## Must-Haves

- CategoryProgressScreen renders with category name as header title (capitalized)
- Time range pills (1M/3M/6M/All) filter exercise data via `getCategoryExerciseProgress(category, timeRange)`
- Each exercise row shows: name, MiniSparkline, delta text (formatted by measurementType), relative time
- Delta formatting: `+X.X kg` for reps, `+Xs` for timed, `–` for non-positive, hidden when `previousBest` is null or < 2 sparkline points
- Tapping an exercise row navigates to ExerciseProgress with `{ exerciseId, exerciseName, measurementType }`
- Back button navigates back to Dashboard
- Empty state when no exercises returned
- Placeholder in TabNavigator replaced with real CategoryProgressScreen import

## Proof Level

- This slice proves: final-assembly
- Real runtime required: yes (on-device verification of full navigation chain)
- Human/UAT required: yes (visual check that sparklines render, layout looks correct)

## Verification

- `npx tsc --noEmit` — no new type errors from screen or navigation wiring
- `npx jest src/screens/__tests__/CategoryProgressScreen.test.tsx --verbose` — new tests pass
- `npx jest src/screens/__tests__/DashboardScreen.test.tsx --verbose` — S03 regression (navigation still works)
- `npx jest --verbose` — full suite, no regressions from S04 changes

## Integration Closure

- Upstream surfaces consumed: `getCategoryExerciseProgress(category, timeRange?)` from `src/db/dashboard.ts`, `CategoryExerciseProgress` type from `src/types/index.ts`, `MiniSparkline` from `src/components/MiniSparkline.tsx`, `formatRelativeTime` from `src/utils/formatRelativeTime.ts`, `CategoryProgress` route in `DashboardStackParamList` from `src/navigation/TabNavigator.tsx`
- New wiring introduced in this slice: `CategoryProgressScreen` import replaces `CategoryProgressPlaceholder` in TabNavigator; exercise row press navigates to existing `ExerciseProgress` route
- What remains before the milestone is truly usable end-to-end: nothing — this is the final slice

## Tasks

- [x] **T01: Create CategoryProgressScreen and wire into navigation** `est:25m`
  - Why: This is the entire functional deliverable — the new screen that displays per-exercise progress within a category, with time range filtering and navigation to ExerciseProgressScreen
  - Files: `src/screens/CategoryProgressScreen.tsx`, `src/navigation/TabNavigator.tsx`
  - Do: Create `CategoryProgressScreen.tsx` following ExerciseProgressScreen's structure (SafeAreaView, header with back button, ScrollView, time range pills). Load data via `getCategoryExerciseProgress(category, timeRange)` using both `useFocusEffect` (on focus) and `useEffect` (on timeRange change). Render exercise rows with MiniSparkline, delta formatting adapted from CategorySummaryCard (but using `currentBest`/`previousBest` fields, handling `previousBest: null`), and formatRelativeTime. Wire exercise row press to navigate to ExerciseProgress. In TabNavigator, replace `CategoryProgressPlaceholder` with import of the real screen.
  - Verify: `npx tsc --noEmit` — no new type errors
  - Done when: CategoryProgressScreen compiles, TabNavigator imports it, placeholder is removed

- [x] **T02: Write tests for CategoryProgressScreen** `est:20m`
  - Why: Proves the screen renders correctly, time range pills work, exercise rows display data, delta formatting is correct, navigation fires, and empty state shows
  - Files: `src/screens/__tests__/CategoryProgressScreen.test.tsx`
  - Do: Create test file following ExerciseProgressScreen.test.tsx pattern — mock `getCategoryExerciseProgress` from `../../db/dashboard`, render with `NavigationContainer` + `createNativeStackNavigator` + `initialParams: { category: 'chest' }`. Write tests for: title rendering ("Chest"), time range pills present, exercise rows with names, delta formatting for reps/timed/non-positive/null previousBest, empty state, back button press, exercise row press navigation, time range pill press triggers re-fetch.
  - Verify: `npx jest src/screens/__tests__/CategoryProgressScreen.test.tsx --verbose` — all tests pass; `npx jest --verbose` — full suite passes
  - Done when: All CategoryProgressScreen tests pass and no regressions in full suite

## Observability / Diagnostics

- **Runtime signals:** `getCategoryExerciseProgress` fetch failures are silently caught — future improvement could surface a retry/error banner. Data loading uses a cancellation flag to prevent stale state updates.
- **Inspection surfaces:** Each exercise row carries `testID="exercise-row"` for automated test targeting. Time range pills have no explicit testID but can be queried by text content in tests.
- **Failure visibility:** Empty state ("No exercises found") renders when the DB query returns zero rows or when no exercises exist for the selected time range. Navigation failures (missing params) would throw a runtime error surfaced by React Navigation's error boundary.
- **Redaction constraints:** No user secrets or PII involved — exercise names and category names are user-generated content but not sensitive.

## Files Likely Touched

- `src/screens/CategoryProgressScreen.tsx` — **NEW**
- `src/navigation/TabNavigator.tsx` — **MODIFY** (replace placeholder with real import)
- `src/screens/__tests__/CategoryProgressScreen.test.tsx` — **NEW**
