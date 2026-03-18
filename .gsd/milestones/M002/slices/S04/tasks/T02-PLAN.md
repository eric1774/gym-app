---
estimated_steps: 4
estimated_files: 1
---

# T02: Write tests for CategoryProgressScreen

**Slice:** S04 — CategoryProgressScreen & Navigation
**Milestone:** M002

## Description

Write comprehensive tests for `CategoryProgressScreen` following the established pattern from `ExerciseProgressScreen.test.tsx`. Tests verify: title rendering, time range pills, exercise row rendering with sparklines and deltas, delta formatting edge cases, empty state, back button navigation, exercise row press navigation, and time range change triggering re-fetch.

## Steps

1. **Create `src/screens/__tests__/CategoryProgressScreen.test.tsx`** with mock setup at top:
   ```typescript
   jest.mock('../../db/dashboard', () => ({
     getCategoryExerciseProgress: jest.fn().mockResolvedValue([]),
   }));
   ```
   Import: React, `render`/`waitFor`/`fireEvent` from `@testing-library/react-native`, `NavigationContainer` from `@react-navigation/native`, `createNativeStackNavigator` from `@react-navigation/native-stack`, `CategoryProgressScreen` from the screen file, `getCategoryExerciseProgress` from `../../db/dashboard`.

2. **Create test renderer helper** `renderWithParams`:
   ```typescript
   const Stack = createNativeStackNavigator();
   function renderWithParams(params: { category: string }) {
     return render(
       <NavigationContainer>
         <Stack.Navigator>
           <Stack.Screen
             name="CategoryProgress"
             component={CategoryProgressScreen}
             initialParams={params}
           />
           <Stack.Screen name="ExerciseProgress" component={() => null} />
         </Stack.Navigator>
       </NavigationContainer>,
     );
   }
   ```
   Note: Include an `ExerciseProgress` screen in the navigator so navigation.navigate doesn't crash.

3. **Create a `makeExercise` factory** for test fixtures:
   ```typescript
   const makeExercise = (overrides = {}) => ({
     exerciseId: 1,
     exerciseName: 'Bench Press',
     measurementType: 'reps' as const,
     sparklinePoints: [60, 65, 70, 75],
     currentBest: 75,
     previousBest: 60,
     lastTrainedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
     ...overrides,
   });
   ```

4. **Write these tests** inside `describe('CategoryProgressScreen', ...)`:
   - **"renders capitalized category name as title"** — params `{ category: 'chest' }`, assert `getByText('Chest')` exists
   - **"renders all 4 time range pills"** — assert 1M, 3M, 6M, All text elements exist
   - **"renders exercise rows with names"** — mock returns 2 exercises, assert both names appear
   - **"shows delta formatted as weight for reps type"** — mock exercise with reps, `currentBest: 75`, `previousBest: 60` → assert `+15.0 kg` appears
   - **"shows delta formatted as duration for timed type"** — mock exercise with `measurementType: 'timed'`, `currentBest: 90`, `previousBest: 60` → assert `+30s` appears
   - **"shows dash for non-positive delta"** — mock exercise with `currentBest: 60`, `previousBest: 75` → assert `–` appears
   - **"hides delta when previousBest is null"** — mock exercise with `previousBest: null` → assert `delta-text` testID does NOT exist (use `queryByTestId`)
   - **"shows empty state when no exercises"** — mock returns `[]` → assert "No exercises found" text
   - **"calls getCategoryExerciseProgress on render"** — assert mock was called with `('chest', 'All')`
   - **"re-fetches when time range pill is pressed"** — press "3M" pill, use `waitFor` to assert mock called with `('chest', '3M')`
   - **"navigates back on back button press"** — press ← button, no crash
   - **"navigates to ExerciseProgress on exercise row press"** — press exercise row, no crash (navigation absorbed by test navigator)

## Must-Haves

- [ ] All tests pass: `npx jest src/screens/__tests__/CategoryProgressScreen.test.tsx --verbose`
- [ ] Tests cover: title, pills, exercise rows, delta reps format, delta timed format, non-positive delta, null previousBest, empty state, data fetch call, time range re-fetch, back navigation, exercise row navigation
- [ ] Full test suite has no regressions: `npx jest --verbose`

## Verification

- `npx jest src/screens/__tests__/CategoryProgressScreen.test.tsx --verbose` — all tests pass (expect ~12 tests)
- `npx jest src/screens/__tests__/DashboardScreen.test.tsx --verbose` — S03 regression check (9/9 pass)
- `npx jest --verbose` — full suite passes with no new failures

## Inputs

- `src/screens/CategoryProgressScreen.tsx` — The screen created in T01. It exports `CategoryProgressScreen`, uses `getCategoryExerciseProgress` from `../../db/dashboard`, renders exercise rows with `testID="exercise-row"`, shows delta with `testID="delta-text"`, displays capitalized category name.
- `src/screens/__tests__/ExerciseProgressScreen.test.tsx` — Pattern source for test structure: mock setup at top, `renderWithParams` helper with NavigationContainer + Stack, `beforeEach` with `jest.clearAllMocks`, `waitFor` for async data.
- `src/types/index.ts` — `CategoryExerciseProgress` interface for fixture shape: `{ exerciseId: number, exerciseName: string, measurementType: 'reps' | 'timed', sparklinePoints: number[], currentBest: number, previousBest: number | null, lastTrainedAt: string }`.
- Key test patterns from the codebase:
  - Mock at file top before imports: `jest.mock('../../db/dashboard', () => ({ ... }))`
  - Use `as jest.Mock` for type assertion when setting return values
  - Use `waitFor` for async rendering after mock data loads
  - Use `fireEvent.press` for button/row interactions
  - Use `queryByTestId` (returns null) for asserting elements are NOT present
  - Use `queryByText` for negative assertions

## Observability Impact

- **Test coverage signals:** 12 test cases cover all CategoryProgressScreen runtime paths — title rendering, time range filtering, delta formatting (reps/timed/negative/null), empty state, data fetch invocation, and navigation. Run `npx jest src/screens/__tests__/CategoryProgressScreen.test.tsx --verbose` to inspect.
- **testID surface added:** `testID="delta-text"` added to the delta Text element in CategoryProgressScreen for automated test targeting of delta visibility.
- **Failure visibility:** Test failures surface specific behavioral regressions — e.g. delta formatting changes, empty state text changes, or navigation breakages show as named test failures in CI output.

## Expected Output

- `src/screens/__tests__/CategoryProgressScreen.test.tsx` — New test file with ~12 tests covering all CategoryProgressScreen behaviors, following established test patterns
