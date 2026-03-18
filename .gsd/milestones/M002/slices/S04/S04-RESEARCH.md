# S04: CategoryProgressScreen & Navigation — Research

**Date:** 2026-03-17
**Depth:** Light — all components, types, DB functions, and patterns already exist; this slice wires them together in a new screen following the established ExerciseProgressScreen pattern.

## Summary

S04 creates `CategoryProgressScreen` and wires it into the existing navigation stack. All building blocks are complete: `getCategoryExerciseProgress(category, timeRange?)` from S01 provides the data, `MiniSparkline` from S02 renders sparklines, and the `CategoryProgress` route (with `{ category: string }` param) is already registered in `DashboardStackParamList` with a placeholder component. The time range pills pattern from `ExerciseProgressScreen` is the exact UI pattern to replicate.

The work is: (1) create `CategoryProgressScreen.tsx` with a header, time range pills, and a list of exercise rows with sparklines and deltas, (2) replace the placeholder in `TabNavigator.tsx` with the real screen import, (3) wire exercise row presses to navigate to `ExerciseProgress` with `{ exerciseId, exerciseName, measurementType }`, and (4) write tests.

## Recommendation

Build this as two tasks: T01 creates the screen and updates navigation, T02 writes tests. The screen should follow ExerciseProgressScreen's exact structure: `SafeAreaView` → header with back button → `ScrollView` → time range filter pills → exercise list. Use `useFocusEffect` + `getCategoryExerciseProgress(category, timeRange)` for data loading, re-fetching when `timeRange` state changes. Each exercise row shows name, MiniSparkline, delta text (same formatting as CategorySummaryCard), and relative time.

## Implementation Landscape

### Key Files

- `src/screens/CategoryProgressScreen.tsx` — **NEW.** The main deliverable. Receives `{ category: string }` from route params. Calls `getCategoryExerciseProgress(category, timeRange)`. Renders exercise rows with MiniSparkline, delta, relative time. Time range pills filter data. Press navigates to ExerciseProgress.
- `src/navigation/TabNavigator.tsx` — **MODIFY.** Replace `CategoryProgressPlaceholder` inline component (lines ~163-168) with import of real `CategoryProgressScreen`. Remove the placeholder function. Update the `DashboardStack.Screen` component reference (line ~175).
- `src/screens/__tests__/CategoryProgressScreen.test.tsx` — **NEW.** Tests following ExerciseProgressScreen.test.tsx pattern: wrap in `NavigationContainer` + `createNativeStackNavigator` with `initialParams`, mock `getCategoryExerciseProgress`.
- `src/screens/ExerciseProgressScreen.tsx` — **READ ONLY.** Pattern source for header, time range pills, scrollview layout, back navigation, styling. Do NOT modify.
- `src/components/MiniSparkline.tsx` — **READ ONLY.** Consumed by exercise rows. Props: `{ data: number[], width?, height?, color? }`.
- `src/components/CategorySummaryCard.tsx` — **READ ONLY.** Reference for delta formatting logic (the `formatDelta` function computes "+X.X kg" for reps, "+Xs" for timed, "–" for non-positive, null for <2 points).
- `src/utils/formatRelativeTime.ts` — **READ ONLY.** Import and use for "Xd ago" display per exercise.
- `src/db/dashboard.ts` — **READ ONLY.** `getCategoryExerciseProgress(category: ExerciseCategory, timeRange?: '1M' | '3M' | '6M' | 'All')` returns `CategoryExerciseProgress[]`.
- `src/types/index.ts` — **READ ONLY.** `CategoryExerciseProgress` interface: `{ exerciseId, exerciseName, measurementType, sparklinePoints, currentBest, previousBest, lastTrainedAt }`.

### Patterns to Follow

**Screen structure** — Copy from `ExerciseProgressScreen.tsx`:
- `SafeAreaView edges={["top"]}` container with `colors.background`
- Header row: back button (`← ` text, `navigation.goBack()`) + title
- `ScrollView` with `contentContainerStyle` padding
- Time range pills: `const TIME_RANGES = ['1M', '3M', '6M', 'All'] as const` with `useState<TimeRange>('All')`
- Filter row styling: `filterRow`, `filterButton`, `filterButtonActive`, `filterText`, `filterTextActive`

**Data loading** — `useFocusEffect` with cancellation flag, calling `getCategoryExerciseProgress(category, timeRange)`. Re-fetch when `timeRange` changes (include in dependency array of the effect, or use a separate `useEffect` for range changes).

**Navigation types** — The route is already typed in `DashboardStackParamList`:
```typescript
CategoryProgress: { category: string };
```
Use `RouteProp<DashboardStackParamList, 'CategoryProgress'>` for route params and `NativeStackNavigationProp<DashboardStackParamList, 'CategoryProgress'>` for navigation.

**Exercise row press** — Navigate to `ExerciseProgress` with:
```typescript
navigation.navigate('ExerciseProgress', {
  exerciseId: exercise.exerciseId,
  exerciseName: exercise.exerciseName,
  measurementType: exercise.measurementType,
})
```
This route already exists in `DashboardStackParamList`.

**Delta formatting** — Replicate `CategorySummaryCard`'s `formatDelta` logic but adapted for `CategoryExerciseProgress` which has `currentBest` and `previousBest` fields instead of computing from sparkline endpoints:
- `previousBest === null` or sparklinePoints.length < 2 → hide delta
- `currentBest - previousBest <= 0` → show "–"
- `measurementType === 'reps'` → `+X.X kg`
- `measurementType === 'timed'` → `+Xs`

**Test pattern** — From `ExerciseProgressScreen.test.tsx`:
- `jest.mock('../../db/dashboard', ...)` at top
- Render with `NavigationContainer` + `createNativeStackNavigator` + `initialParams: { category: 'chest' }`
- Use `waitFor` for async data, `fireEvent.press` for interactions

### Build Order

1. **T01: Create CategoryProgressScreen + update navigation** — Create the screen file, import in TabNavigator, replace placeholder. This is the entire functional deliverable.
2. **T02: Tests** — Write tests for CategoryProgressScreen covering: title rendering, time range pills, exercise rows with sparklines, delta formatting, empty state, navigation to ExerciseProgress on press, back button.

### Verification Approach

- `npx tsc --noEmit` — type-checks new screen and navigation integration
- `npx jest src/screens/__tests__/CategoryProgressScreen.test.tsx --verbose` — new tests pass
- `npx jest src/screens/__tests__/DashboardScreen.test.tsx --verbose` — S03 regression check (navigation still works)
- `npx jest --verbose` — full suite, no regressions
- On-device: Dashboard → tap category card → CategoryProgressScreen shows exercises → tap exercise → ExerciseProgressScreen → back → back → Dashboard

## Common Pitfalls

- **Stale data on time range change** — `useFocusEffect` only re-runs on focus, not on state changes. Use a separate `useEffect` keyed on `[timeRange]` or combine both triggers so changing the time range pill triggers a re-fetch with the new range param.
- **`previousBest` can be null** — Unlike `CategorySummaryCard` which derives delta from sparkline endpoints, `CategoryExerciseProgress.previousBest` is explicitly `number | null`. Delta formatting must handle the null case (hide delta when null).
- **Category param is lowercase** — `route.params.category` comes as lowercase string (e.g., `'chest'`). Capitalize for display: `category.charAt(0).toUpperCase() + category.slice(1)`.
