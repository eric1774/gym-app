---
estimated_steps: 6
estimated_files: 2
---

# T01: Create CategoryProgressScreen and wire into navigation

**Slice:** S04 — CategoryProgressScreen & Navigation
**Milestone:** M002

## Description

Create the `CategoryProgressScreen` component and replace the placeholder in `TabNavigator.tsx`. This screen shows all exercises in a category with sparklines, deltas, and time range filtering. It follows the exact structure of `ExerciseProgressScreen.tsx` — SafeAreaView with header, ScrollView with time range pills, and a list body. Tapping an exercise row navigates to the existing `ExerciseProgress` route.

**Relevant skills:** `dark-mint-card-ui` (for styling tokens), `deploy` (auto-deploy after code changes)

## Steps

1. **Create `src/screens/CategoryProgressScreen.tsx`** with these imports:
   - React hooks: `useState`, `useCallback`, `useEffect` from 'react'
   - RN: `ScrollView`, `StyleSheet`, `Text`, `TouchableOpacity`, `View` from 'react-native'
   - `SafeAreaView` from 'react-native-safe-area-context'
   - `useFocusEffect`, `useNavigation`, `useRoute`, `RouteProp` from '@react-navigation/native'
   - `NativeStackNavigationProp` from '@react-navigation/native-stack'
   - `getCategoryExerciseProgress` from '../db/dashboard'
   - `CategoryExerciseProgress` from '../types'
   - `DashboardStackParamList` from '../navigation/TabNavigator'
   - `MiniSparkline` from '../components/MiniSparkline'
   - `formatRelativeTime` from '../utils/formatRelativeTime'
   - Theme tokens: `colors`, `spacing`, `fontSize`, `weightBold`, `weightSemiBold`, `weightMedium`

2. **Define types and constants at top of file:**
   ```typescript
   type ScreenRouteProp = RouteProp<DashboardStackParamList, 'CategoryProgress'>;
   type ScreenNavProp = NativeStackNavigationProp<DashboardStackParamList, 'CategoryProgress'>;
   const TIME_RANGES = ['1M', '3M', '6M', 'All'] as const;
   type TimeRange = (typeof TIME_RANGES)[number];
   ```

3. **Implement the `CategoryProgressScreen` component** with this structure:
   - Extract `category` from `route.params`
   - State: `exercises: CategoryExerciseProgress[]` (init `[]`), `timeRange: TimeRange` (init `'All'`)
   - **Data loading — two triggers:**
     - `useFocusEffect` with `useCallback` — fetches `getCategoryExerciseProgress(category, timeRange)` with cancellation flag. Dependencies: `[category, timeRange]`.
     - This handles both initial load on focus AND re-fetch when timeRange changes, because `useFocusEffect` with changing deps will re-run.
   - **Delta formatting function** `formatDelta(exercise: CategoryExerciseProgress): string | null`:
     - If `exercise.previousBest === null` OR `exercise.sparklinePoints.length < 2` → return `null` (hide delta)
     - Compute `delta = exercise.currentBest - exercise.previousBest`
     - If `delta <= 0` → return `'–'`
     - If `exercise.measurementType === 'timed'` → return `+${Math.round(delta)}s`
     - Else (reps) → return `+${delta.toFixed(1)} kg`
   - **Render:**
     - `SafeAreaView edges={["top"]}` with `styles.container`
     - Header row: back button (← text, `navigation.goBack()`) + title (`category.charAt(0).toUpperCase() + category.slice(1)`)
     - `ScrollView` with `contentContainerStyle` padding
     - Time range filter pills row (same pattern as ExerciseProgressScreen)
     - If `exercises.length === 0`: empty state text "No exercises found"
     - Else: map exercises to rows, each row is a `TouchableOpacity` with `testID="exercise-row"`:
       - Left side: exercise name, delta text (colored accent if positive, secondary if neutral), relative time
       - Right side: `MiniSparkline` with `data={exercise.sparklinePoints}`
       - `onPress`: `navigation.navigate('ExerciseProgress', { exerciseId: exercise.exerciseId, exerciseName: exercise.exerciseName, measurementType: exercise.measurementType })`

4. **Style the component** following Dark Mint Card design system:
   - Container: `flex: 1, backgroundColor: colors.background`
   - Header: same as ExerciseProgressScreen (flexDirection row, back button, title)
   - Filter pills: same styles as ExerciseProgressScreen (`filterRow`, `filterButton`, `filterButtonActive`, `filterText`, `filterTextActive`)
   - Exercise rows: `backgroundColor: colors.surfaceElevated`, `borderRadius: 14`, `borderWidth: 1`, `borderColor: colors.border`, `padding: spacing.base`, `marginBottom: spacing.sm` — matches CategorySummaryCard styling
   - Row layout: `flexDirection: 'row'`, text container `flex: 1`, sparkline on right

5. **Update `src/navigation/TabNavigator.tsx`:**
   - Add import: `import { CategoryProgressScreen } from '../screens/CategoryProgressScreen';`
   - Remove the `CategoryProgressPlaceholder` function (lines ~163-168)
   - Change the `CategoryProgress` screen's component from `CategoryProgressPlaceholder` to `CategoryProgressScreen`

6. **Verify:** Run `npx tsc --noEmit` to confirm no new type errors from the new screen and navigation wiring.

## Must-Haves

- [ ] `CategoryProgressScreen` exported from `src/screens/CategoryProgressScreen.tsx`
- [ ] Screen receives `{ category: string }` from route params and displays capitalized name as header title
- [ ] Time range pills (1M/3M/6M/All) update state and trigger data re-fetch
- [ ] Each exercise row shows name, MiniSparkline, formatted delta, relative time
- [ ] Delta formatting handles: null previousBest → hidden, < 2 points → hidden, non-positive → '–', reps → '+X.X kg', timed → '+Xs'
- [ ] Exercise row press navigates to ExerciseProgress with correct params
- [ ] Back button calls `navigation.goBack()`
- [ ] Empty state renders when no exercises
- [ ] `CategoryProgressPlaceholder` removed from TabNavigator and replaced with real import

## Verification

- `npx tsc --noEmit` — no new type errors (pre-existing errors are acceptable)
- Visual inspection: the file exists and exports `CategoryProgressScreen`
- TabNavigator imports `CategoryProgressScreen` and `CategoryProgressPlaceholder` function is removed

## Inputs

- `src/screens/ExerciseProgressScreen.tsx` — Pattern source for screen structure, header, time range pills, styling. Copy the layout pattern (SafeAreaView → header → ScrollView → filter pills → content).
- `src/components/CategorySummaryCard.tsx` — Reference for delta formatting logic. The `formatDelta` function there uses sparkline endpoints; T01's version uses `currentBest`/`previousBest` fields and handles `previousBest: null`.
- `src/navigation/TabNavigator.tsx` — Contains `CategoryProgressPlaceholder` to remove and `DashboardStackParamList` type to reference.
- `src/types/index.ts` — `CategoryExerciseProgress` interface: `{ exerciseId: number, exerciseName: string, measurementType: 'reps' | 'timed', sparklinePoints: number[], currentBest: number, previousBest: number | null, lastTrainedAt: string }`.
- `src/db/dashboard.ts` — `getCategoryExerciseProgress(category: ExerciseCategory, timeRange?: '1M' | '3M' | '6M' | 'All')` returns `Promise<CategoryExerciseProgress[]>`.
- `src/components/MiniSparkline.tsx` — Props: `{ data: number[], width?: number, height?: number, color?: string }`. Defaults: 80×40 with accent color.
- `src/utils/formatRelativeTime.ts` — `formatRelativeTime(dateStr: string): string` returns e.g. "3d ago".
- Theme files: `src/theme/colors.ts` (`colors.background`, `colors.surface`, `colors.surfaceElevated`, `colors.border`, `colors.accent`, `colors.secondary`, `colors.primary`), `src/theme/spacing.ts`, `src/theme/typography.ts` (`fontSize`, `weightBold`, `weightSemiBold`, `weightMedium`).

## Observability Impact

- **Signals changed:** New `CategoryProgressScreen` component fetches `getCategoryExerciseProgress(category, timeRange)` on focus and on time range change. Fetch errors are silently swallowed (consistent with ExerciseProgressScreen pattern).
- **Inspection surfaces:** Exercise rows have `testID="exercise-row"` for test automation. Empty state text "No exercises found" is queryable.
- **Failure visibility:** If the screen receives an invalid category param, the DB query returns `[]` and the empty state renders — no crash. If navigation params are missing entirely, React Navigation throws at route access.

## Expected Output

- `src/screens/CategoryProgressScreen.tsx` — New screen component, ~150-200 lines, fully functional with data loading, rendering, and navigation
- `src/navigation/TabNavigator.tsx` — Modified: new import added, placeholder removed, screen reference updated
