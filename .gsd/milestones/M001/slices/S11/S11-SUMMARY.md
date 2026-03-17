---
id: S11
parent: M001
milestone: M001
provides: []
requires: []
affects: []
key_files: []
key_decisions: []
patterns_established: []
observability_surfaces: []
drill_down_paths: []
duration: 
verification_result: passed
completed_at: 
blocker_discovered: false
---
# S11: Superset Support

**# Phase 14 Plan 01: Superset Support — Data Layer and Program View UI Summary**

## What Happened

# Phase 14 Plan 01: Superset Support — Data Layer and Program View UI Summary

Full superset grouping system: SQLite migration v7, type updates, DB functions, and complete DayDetailScreen UX for creating and managing superset exercise groups within program days.

## What Was Built

### Data Layer (Task 1)

- `ProgramDayExercise` interface extended with `supersetGroupId: number | null`
- Migration v7 adds `superset_group_id INTEGER` column to `program_day_exercises` (nullable — NULL = no superset)
- `rowToProgramDayExercise` mapper updated to read `superset_group_id ?? null`
- `createSupersetGroup(dayId, exerciseIds)`: generates `Date.now()` group ID, bulk UPDATEs via `runTransaction`
- `removeSupersetGroup(dayId, groupId)`: NULLs out `superset_group_id` for all matching rows
- `duplicateProgramDay` preserves superset groupings: builds old→new group ID map, copies with new IDs

### UI Layer (Task 2)

**ExerciseTargetRow:**
- `supersetGroupId` prop: shows U+26A1 lightning bolt badge (TouchableOpacity calling `onUngroup`)
- `selectionMode` prop: replaces reorder column with 28px circular checkbox
- `isSelected` / `onSelect` / `onUngroup` handler props

**DayDetailScreen:**
- `supersetMode` and `selectedIds` state
- SS button in header (surface bg, accent border/text) to left of Add button
- In superset mode: header shows only Cancel; instruction text "SELECT 2-3 EXERCISES" below header
- `buildGroups()` helper: groups consecutive same-`supersetGroupId` exercises into render groups
- FlatList replaced with ScrollView; superset groups rendered in `accentDim` background container (`borderRadius: 12`, mint border)
- Adjacency validation: `selectedIds` indices must be contiguous; Alert shown if not
- "Group as Superset" button at bottom (disabled at opacity 0.4 when < 2 selected)
- Ungroup: Alert with Cancel / Ungroup (destructive) → `removeSupersetGroup` → `refresh()`

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed ProgramDayExercise construction in dashboard.ts**
- **Found during:** Task 1 TypeScript verification
- **Issue:** `src/db/dashboard.ts` line 528 manually constructed `ProgramDayExercise` objects without the new required `supersetGroupId` field, causing a TS2345 error
- **Fix:** Added `supersetGroupId: e.superset_group_id ?? null` to the object literal
- **Files modified:** `src/db/dashboard.ts`
- **Commit:** 8d989c1

## Self-Check: PASSED

Files confirmed present:
- src/types/index.ts — FOUND
- src/db/migrations.ts — FOUND
- src/db/programs.ts — FOUND
- src/db/dashboard.ts — FOUND
- src/screens/DayDetailScreen.tsx — FOUND
- src/components/ExerciseTargetRow.tsx — FOUND

Commits confirmed:
- 8d989c1 feat(14-01): data layer — migration v7, types, and DB functions for superset groups
- d7c1635 feat(14-01): DayDetailScreen multi-select mode, superset containers, ExerciseTargetRow badges

# Phase 14 Plan 02: Superset Workout UX — Container Rendering and Auto-Advance Summary

SupersetContainer component with mint accent bar and round counter, plus auto-advance state machine that cycles A->B->rest->A->B through superset exercises using LayoutAnimation and a post-rest ref.

## What Was Built

### Task 1: Superset Container Rendering

**`groupForWorkout()` function:**
- Separates `sessionExercises` into superset and non-superset buckets
- Returns `WorkoutSection[]` union: `{ type: 'superset', groupId, exerciseIds }` or `{ type: 'category', category, items }`
- Superset sections appear first in program sortOrder; category sections follow for remaining exercises

**`SupersetContainer` component (inline in WorkoutScreen.tsx):**
- Outer container: `backgroundColor: colors.surface`, `borderRadius: 14`, `borderWidth: 1`, `overflow: hidden`
- Mint accent bar: `position: absolute, left: 0, top: 0, bottom: 0, width: 4, backgroundColor: colors.accent`
- Header: "SUPERSET · Round X/Y" (`\u00B7` middle dot separator), `letterSpacing: 1.5`, `colors.secondary`
- Round calculated as `Math.min(...exerciseIds.map(id => setCountsByExercise[id] ?? 0)) + 1`
- Total from `programTargetsMap.get(id)?.targetSets ?? 3`
- Hairline `View` dividers between cards (no divider before first card)
- Delegates to `ExerciseCard` with `insideSuperset={true}`

**`ExerciseCard` changes:**
- New optional `insideSuperset?: boolean` and `isLastInSuperset?: boolean` props
- `insideSuperset` applies `cardInSuperset` style (removes border/radius/margin) instead of `card`
- `cardHeaderInSuperset`: adds `paddingLeft: spacing.base + 8` for accent bar clearance
- `cardExpandedInSuperset`: adds `paddingLeft: spacing.base + 8` for content alignment

**State additions:**
- `supersetGroups: Map<number, number[]>` — groupId to ordered exerciseId list
- `exerciseSupersetMap: Map<number, number>` — exerciseId to groupId
- Both populated from `getProgramDayExercises()` `supersetGroupId` field, sorted by `sortOrder`

### Task 2: Auto-Advance and Rest Timer Suppression

**Refs for stale-closure safety:**
- `supersetGroupsRef` and `exerciseSupersetMapRef` mirror state, updated synchronously in the `useEffect` alongside `setState`
- `lastSupersetRestRef`: `{ groupId, exerciseId } | null` — set when last-in-group exercise logs a set

**`handleSetLogged` superset logic:**
- Reads `exerciseSupersetMapRef.current.get(exerciseId)` to detect group membership
- Non-last exercise: calls `LayoutAnimation.configureNext(...)` then `setActiveExerciseId(nextExerciseId)` — rest prompt suppressed (no `setPendingRestExerciseId`)
- Last exercise: calls `setPendingRestExerciseId(exerciseId)` as normal + sets `lastSupersetRestRef`
- Non-superset exercise: unchanged behavior (sets `pendingRestExerciseId`)

**Post-rest auto-advance `useEffect`:**
- `isRunningRef` tracks previous `isRunning` value
- On `wasRunning=true, isRunning=false` with `lastSupersetRestRef.current` set:
  - Reads first exerciseId from group, clears ref
  - `LayoutAnimation.configureNext(...)` + `setActiveExerciseId(groupExerciseIds[0])`
- Creates the A->B->rest->A->B cycle described in the phase context

## Deviations from Plan

None — plan executed exactly as written.

## Self-Check: PASSED

Files confirmed present:
- src/screens/WorkoutScreen.tsx — FOUND

Commits confirmed:
- 474908c feat(14-02): superset container rendering with accent bar and round counter
- d83afef feat(14-02): superset auto-advance logic and rest timer suppression
