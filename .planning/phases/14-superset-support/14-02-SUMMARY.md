---
phase: 14-superset-support
plan: 02
subsystem: workout
tags: [superset, workout-screen, auto-advance, rest-timer, layout-animation]
dependency_graph:
  requires: [superset-data-layer]
  provides: [superset-workout-ux]
  affects: [WorkoutScreen]
tech_stack:
  added: []
  patterns: [LayoutAnimation, useRef-for-callback-closures, superset-render-sections]
key_files:
  created: []
  modified:
    - src/screens/WorkoutScreen.tsx
decisions:
  - "useRef mirrors (supersetGroupsRef, exerciseSupersetMapRef) used alongside state to give handleSetLogged stale-free access to superset maps without adding them to the useCallback dependency array"
  - "isRunningRef tracks previous isRunning value inside useEffect to detect true->false transition for post-rest auto-advance (avoids separate prevIsRunning state)"
  - "LayoutAnimation.create(250, easeInEaseOut, opacity) chosen over spring preset for subtle, non-distracting card expand transitions"
  - "groupForWorkout() returns WorkoutSection union type — superset sections appear first in the order their first exercise is encountered, then category sections for remaining exercises"
metrics:
  duration: "~3.5 minutes"
  completed_date: "2026-03-14"
  tasks_completed: 2
  files_modified: 1
---

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
