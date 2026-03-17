---
id: T02
parent: S11
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
# T02: 14-superset-support 02

**# Phase 14 Plan 02: Superset Workout UX — Container Rendering and Auto-Advance Summary**

## What Happened

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
