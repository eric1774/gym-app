---
id: S04
milestone: M002
status: ready
---

# S04: CategoryProgressScreen & Navigation — Context

<!-- Slice-scoped context. Milestone-only sections (acceptance criteria, completion class,
     milestone sequence) do not belong here — those live in the milestone context. -->

## Goal

Build `CategoryProgressScreen` showing all exercises in a category with sparklines, deltas, and time range filtering, wire it into the Dashboard stack navigation so tapping a category card navigates there and tapping an exercise navigates to the existing `ExerciseProgressScreen`.

## Why this Slice

This is the final slice and the milestone's integration proof. S01 provides data, S02 provides components, S03 provides the dashboard with category cards — this slice connects the full navigation chain: Dashboard → CategoryProgressScreen → ExerciseProgressScreen → back. Without it, the category cards are tappable but lead nowhere.

## Scope

### In Scope

- New `CategoryProgressScreen` screen in `src/screens/`
- Custom header with category name and back arrow (matching ExerciseProgressScreen pattern)
- Time range filter pills (1M/3M/6M/All) reusing the pattern from ExerciseProgressScreen
- Default time range: "All"
- Exercise list: each row shows exercise name (left), mini sparkline (middle), signed delta (right)
- Timed exercises show duration format for both sparkline values and delta (e.g. "+0:15")
- Each exercise row tappable — navigates to existing ExerciseProgressScreen
- Inline "No data in this range" message when time range filter results in empty data
- Add `CategoryProgress` route to `DashboardStackParamList` and `DashboardStackNavigator`
- Data fetching via `getCategoryExerciseProgress(category, timeRange)` on focus and time range change
- Back navigation returns to Dashboard

### Out of Scope

- Modifying the existing ExerciseProgressScreen
- Modifying CategorySummaryCard or MiniSparkline components (S02 delivered those)
- Modifying DashboardScreen beyond what S03 already set up (onPress wiring should already exist)
- Pull-to-refresh on CategoryProgressScreen
- Search or sort within the exercise list
- Stale dimming on individual exercises (only categories are dimmed, on the dashboard)

## Constraints

- Must follow existing navigation pattern: `headerShown: false`, custom header with back arrow
- Must use existing theme tokens (dark-mint-card-ui)
- Must reuse `MiniSparkline` component from S02 for exercise row sparklines
- Must use `getCategoryExerciseProgress(category, timeRange)` from S01 — no new queries
- Time range pills must match ExerciseProgressScreen's visual pattern (same styling)
- Route params: category name passed from DashboardScreen's card `onPress`

## Integration Points

### Consumes

- `getCategoryExerciseProgress(category, timeRange)` from `src/db/dashboard.ts` — fetches per-exercise progress data
- `CategoryExerciseProgress` type from `src/types/index.ts` — data shape for each exercise row
- `MiniSparkline` component from `src/components/` — renders sparkline in each exercise row
- `DashboardStackParamList` from `src/navigation/TabNavigator.tsx` — route registration
- Time range pills pattern from `src/screens/ExerciseProgressScreen.tsx` — visual pattern to replicate
- `src/theme/colors.ts`, `spacing.ts`, `typography.ts` — existing theme tokens

### Produces

- `CategoryProgressScreen` in `src/screens/` — new screen completing the navigation chain
- Updated `DashboardStackParamList` with `CategoryProgress` route
- Updated `DashboardStackNavigator` with the new screen
- Full working navigation: Dashboard → CategoryProgress → ExerciseProgress → back

## Implementation Decisions

- **Screen header:** Category name as title with a back arrow. No exercise count subtitle. Matches ExerciseProgressScreen's custom header pattern.
- **Time range default:** "All" selected by default. Consistent with ExerciseProgressScreen.
- **Exercise row layout:** Exercise name on the left, mini sparkline in the middle, signed delta on the right. Single horizontal row per exercise. Each row tappable.
- **Timed exercise display:** Duration format for both sparkline values and delta (e.g. "+0:15"). Sparkline shape is the same, Y-axis meaning changes to duration.
- **Empty state after filtering:** Inline "No data in this range" message centered in the exercise list area when the selected time range yields no data.
- **Data refresh:** Fetch on focus via `useFocusEffect` and re-fetch when time range changes.

## Open Questions

- None — all behavioral decisions resolved during discuss phase.
