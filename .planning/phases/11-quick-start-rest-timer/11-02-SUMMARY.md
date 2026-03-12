---
phase: 11-quick-start-rest-timer
plan: 02
subsystem: ui
tags: [react-native, sqlite, haptics, workout, stepper]

# Dependency graph
requires:
  - phase: 11-quick-start-rest-timer
    provides: Phase 11 context, ExerciseSession.restSeconds schema already in place
  - phase: 09-faster-set-logging
    provides: Stepper button UX pattern (56x48, opacity 0.3 disabled) used as design reference
provides:
  - updateDefaultRestSeconds function in src/db/exercises.ts
  - updateSessionRestSeconds function in src/db/sessions.ts
  - Rest duration label ("Rest: Xs") in ExerciseCard expanded panel
  - +/- 15s steppers for editing per-exercise rest duration mid-workout
  - handleRestChange callback persisting to both exercises and exercise_sessions tables
  - handleStartRest reads from restOverrides > sessionExercises.restSeconds > defaultRestSeconds > 90
affects:
  - 11-03 (quick start / rest timer integration — reads restSeconds from ExerciseSession)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Local override map pattern (restOverrides) for optimistic UI before session context update
    - Fire-and-forget DB writes for non-blocking UX (.catch(() => {}))
    - Stepper toggle visibility (restStepperVisible useState) inside component for self-contained state

key-files:
  created: []
  modified:
    - src/db/exercises.ts
    - src/db/sessions.ts
    - src/screens/WorkoutScreen.tsx

key-decisions:
  - "restOverrides local map avoids needing a new SessionContext method for optimistic rest duration update"
  - "Both exercises.default_rest_seconds and exercise_sessions.rest_seconds are updated simultaneously on stepper change"
  - "handleStartRest priority: restOverrides > sessionExercises.restSeconds > exercise.defaultRestSeconds > 90"
  - "restOverrides cleared on session end (both Discard and End Workout paths)"

patterns-established:
  - "Rest stepper buttons match Phase 9 weight stepper sizing: width 56, height 48, opacity 0.3 disabled"
  - "impactLight haptic on stepper tap, same as weight steppers"

requirements-completed:
  - REST-01
  - REST-02
  - REST-03

# Metrics
duration: 4min
completed: 2026-03-12
---

# Phase 11 Plan 02: Rest Duration Label and Stepper Summary

**Per-exercise rest duration shown and editable mid-workout via +/- 15s steppers that persist to both DB tables and drive timer start**

## Performance

- **Duration:** 4 min
- **Started:** 2026-03-12T01:34:16Z
- **Completed:** 2026-03-12T01:38:00Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- Each expanded exercise card shows "Rest: Xs" label; tapping toggles +/- 15s steppers
- Stepper buttons match Phase 9 weight stepper UX (56x48, opacity 0.3 disabled, impactLight haptic)
- Changes persist to both `exercises.default_rest_seconds` and `exercise_sessions.rest_seconds` via fire-and-forget writes
- `handleStartRest` now reads per-exercise rest from local override map, falling back to session record, then exercise default
- `restOverrides` state cleared on session end to avoid stale values across workouts

## Task Commits

Each task was committed atomically:

1. **Task 1: Add DB helpers for rest duration updates** - `8bc857d` (feat)
2. **Task 2: Add rest label, stepper UI, and wire handleStartRest** - `69a4c11` (feat)

## Files Created/Modified
- `src/db/exercises.ts` - Added `updateDefaultRestSeconds(exerciseId, restSeconds)` function
- `src/db/sessions.ts` - Added `updateSessionRestSeconds(sessionId, exerciseId, restSeconds)` function
- `src/screens/WorkoutScreen.tsx` - Rest label, stepper UI in ExerciseCard; handleRestChange callback; updated handleStartRest; restOverrides state; new styles

## Decisions Made
- Used a local `restOverrides` map (keyed by exerciseId) rather than adding a method to SessionContext. This avoids a context API change and makes the override purely local to WorkoutScreen, which is the only consumer.
- Both DB tables updated simultaneously on every stepper change — `exercise_sessions.rest_seconds` for the current session and `exercises.default_rest_seconds` for future sessions. This matches the plan spec and user expectation that adjustments carry forward.
- `handleStartRest` priority chain: `restOverrides[exerciseId]` > `sessionExercises.restSeconds` > `exercise.defaultRestSeconds` > 90. The local override is checked first to ensure the latest user input drives the timer without waiting for a DB round-trip.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
- The file linter reverted a partial edit on WorkoutScreen.tsx during incremental editing. Resolved by writing the full file in a single Write operation.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Rest duration is now visible, editable, and persisted per exercise
- `handleStartRest` is wired to use per-exercise rest — Phase 11-03 (quick-start / auto-start rest timer) can now read the correct duration without additional wiring
- No blockers

---
*Phase: 11-quick-start-rest-timer*
*Completed: 2026-03-12*
