---
estimated_steps: 5
estimated_files: 1
---

# T02: Rewrite DashboardScreen tests for category card rendering

**Slice:** S03 — Dashboard Redesign — Category Cards
**Milestone:** M002

## Description

Rewrite `DashboardScreen.test.tsx` to mock `getCategorySummaries` instead of the now-removed `getRecentlyTrainedExercises` import. The test suite must verify category card rendering, stale dimming, empty state, Next Workout card preservation, and navigation to the new `CategoryProgress` route.

## Steps

1. **Update the jest.mock block.** Replace the `../../db/dashboard` mock:
   ```ts
   jest.mock('../../db/dashboard', () => ({
     getCategorySummaries: jest.fn().mockResolvedValue([]),
     getNextWorkoutDay: jest.fn().mockResolvedValue(null),
     getProgramTotalCompleted: jest.fn().mockResolvedValue(0),
   }));
   ```
   Remove the import of `getRecentlyTrainedExercises`. Add import: `import { getCategorySummaries, getNextWorkoutDay } from '../../db/dashboard';`

2. **Define test fixture data.** Create a helper function or constants for `CategorySummary` test objects:
   ```ts
   const makeSummary = (overrides: Partial<CategorySummary> = {}): CategorySummary => ({
     category: 'chest',
     exerciseCount: 3,
     sparklinePoints: [60, 65, 70, 75],
     lastTrainedAt: new Date().toISOString(),
     measurementType: 'reps' as const,
     currentBest: 75,
     previousBest: 60,
     ...overrides,
   });
   ```
   Import `CategorySummary` from `../../types`.

3. **Write the core test cases:**
   - **renders Dashboard title** — same as before, basic smoke test
   - **shows empty state when no categories** — `getCategorySummaries` returns `[]`, verify "No exercises trained yet" text
   - **renders category cards from summary data** — mock returns 2 summaries (e.g. chest, legs), verify both capitalized category names appear ("Chest", "Legs") and exercise count text ("3 exercises")
   - **renders stale card with dimmed opacity** — mock returns summary with `lastTrainedAt` 45 days ago, find the `category-card` testID element, verify its style includes `opacity: 0.4`
   - **renders non-stale card with full opacity** — mock returns summary with `lastTrainedAt` 5 days ago, verify style includes `opacity: 1`
   - **Next Workout card still renders** — mock `getNextWorkoutDay` with valid data, verify "NEXT WORKOUT", day name, exercise count text, and "Start" button appear
   - **Active Workout card still renders** — mock active session + next workout, verify "ACTIVE WORKOUT" and "Continue" appear
   - **navigates to CategoryProgress on card press** — mock returns a summary, press the card (use `fireEvent.press` on element with testID `category-card`), verify no crash (navigation mock absorbs the call)
   - **renders multiple category cards** — mock returns 3 summaries, verify 3 elements with testID `category-card` appear

4. **Clean up removed tests.** Delete all tests that referenced:
   - Individual exercise names in `getRecentlyTrainedExercises` mock data
   - `STRENGTH TRAINING` section headers
   - Exercise-specific relative time tests (relative time is now handled inside CategorySummaryCard, tested in S02)
   - Exercise-level navigation to `ExerciseProgress`

5. **Run full verification.**
   - `npx jest src/screens/__tests__/DashboardScreen.test.tsx --verbose` — all new tests pass
   - `npx jest src/components/__tests__/CategorySummaryCard.test.tsx --verbose` — S02 tests still pass
   - `npx jest --verbose` — full suite passes

## Must-Haves

- [ ] Mock exports `getCategorySummaries` not `getRecentlyTrainedExercises`
- [ ] Tests verify empty state, category card rendering, stale dimming (opacity 0.4), non-stale rendering
- [ ] Tests verify Next Workout card and Active Workout card still work
- [ ] Tests verify navigation to `CategoryProgress` on card press
- [ ] No references to `getRecentlyTrainedExercises` anywhere in the test file
- [ ] Full test suite passes (`npx jest --verbose`)

## Verification

- `npx jest src/screens/__tests__/DashboardScreen.test.tsx --verbose` — all tests pass
- `npx jest src/components/__tests__/CategorySummaryCard.test.tsx --verbose` — S02 tests still pass (regression)
- `npx jest --verbose` — full suite passes with no regressions
- `grep -c "getRecentlyTrainedExercises" src/screens/__tests__/DashboardScreen.test.tsx` — returns 0

## Inputs

- `src/screens/DashboardScreen.tsx` — T01's rewritten dashboard (imports `getCategorySummaries`, renders `CategorySummaryCard`, navigates to `CategoryProgress`)
- `src/screens/__tests__/DashboardScreen.test.tsx` — existing test file to rewrite (currently has 13 tests mocking `getRecentlyTrainedExercises`)
- `src/components/CategorySummaryCard.tsx` — S02 component, uses testID `category-card` on the outer TouchableOpacity, `category-name` on name text, `exercise-count` on count text, `delta-text` on delta
- `src/types/index.ts` — `CategorySummary` type with fields: `category: string`, `exerciseCount: number`, `sparklinePoints: number[]`, `lastTrainedAt: string`, `measurementType: 'reps' | 'timed'`, `currentBest: number`, `previousBest: number`
- Prior task summary for T01 (will describe the final state of DashboardScreen)

## Observability Impact

- **Test coverage signal:** `npx jest --verbose` output now includes 9 named DashboardScreen test cases covering category cards, stale dimming, empty state, Next Workout, Active Workout, and CategoryProgress navigation. Any future regression in these areas surfaces as a named test failure.
- **Inspection surface:** Tests query `testID="category-card"` elements — the same surface available in React DevTools at runtime. Style assertions (opacity 0.4 vs 1) validate the stale-dimming behavior that's otherwise only visually observable.
- **Failure visibility:** If `getCategorySummaries()` mock contract drifts from the real implementation (e.g. field renames in `CategorySummary`), the mock factory in the test file will produce type errors or render failures — visible in `npx jest` output.

## Expected Output

- `src/screens/__tests__/DashboardScreen.test.tsx` — fully rewritten test file with ~9 tests covering category cards, stale dimming, empty state, Next Workout preservation, and navigation
