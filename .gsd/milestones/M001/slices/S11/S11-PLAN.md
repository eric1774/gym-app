# S11: Superset Support

**Goal:** Add superset data layer (migration v7, types, DB functions) and superset grouping UI in DayDetailScreen so users can create and manage superset exercise groups within program days.
**Demo:** Add superset data layer (migration v7, types, DB functions) and superset grouping UI in DayDetailScreen so users can create and manage superset exercise groups within program days.

## Must-Haves


## Tasks

- [x] **T01: 14-superset-support 01**
  - Add superset data layer (migration v7, types, DB functions) and superset grouping UI in DayDetailScreen so users can create and manage superset exercise groups within program days.

Purpose: SUP-01 requires users to group 2-3 exercises as a superset with visual confirmation. This plan delivers the full data foundation and program-view UX.
Output: Working superset creation/removal in program day detail, with lightning bolt badges and shared container for grouped exercises.
- [x] **T02: 14-superset-support 02**
  - Add superset visual treatment and auto-advance behavior to WorkoutScreen so users see grouped exercises in a shared container and experience seamless alternating-set flow during workouts.

Purpose: SUP-02 (visual grouping), SUP-03 (auto-advance), SUP-04 (rest after last) deliver the core workout experience for supersets — the auto-advance cycle that makes supersets feel fast and frictionless.
Output: WorkoutScreen renders superset containers with accent bar, auto-advances through exercises in a group, suppresses rest timer for non-last exercises, and shows round progress.

## Files Likely Touched

- `src/types/index.ts`
- `src/db/migrations.ts`
- `src/db/programs.ts`
- `src/screens/DayDetailScreen.tsx`
- `src/components/ExerciseTargetRow.tsx`
- `src/screens/WorkoutScreen.tsx`
