---
id: S08
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
# S08: Quick Start Rest Timer

**# Phase 11 Plan 01: Next Workout Card Summary**

## What Happened

# Phase 11 Plan 01: Next Workout Card Summary

**One-tap workout start from dashboard via NextWorkoutCard showing program day, exercise count, and active session elapsed timer**

## Performance

- **Duration:** ~18 min
- **Started:** 2026-03-11T05:30:00Z
- **Completed:** 2026-03-11T05:48:00Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments

- Added `NextWorkoutInfo` interface to types and `getNextWorkoutDay()` DB query that finds the most recently used activated program, identifies the first unfinished day, and returns day/exercise count info
- Built NextWorkoutCard in DashboardScreen showing program name, day name, exercise count, and a Start button in idle state
- Built active state showing "ACTIVE WORKOUT" label in accent color, live MM:SS elapsed timer, and Continue button that navigates to WorkoutTab without creating a duplicate session

## Task Commits

Each task was committed atomically:

1. **Task 1: Add getNextWorkoutDay query and NextWorkoutInfo type** - `e93b0bd` (feat)
2. **Task 2: Build NextWorkoutCard in DashboardScreen** - `51789a5` (feat)

**Plan metadata:** TBD (docs: complete plan)

## Files Created/Modified

- `src/types/index.ts` - Added `NextWorkoutInfo` interface after `ProgramDayCompletionStatus`
- `src/db/dashboard.ts` - Added `getNextWorkoutDay()` function (most-recent-program logic, week completion check, exercise count)
- `src/screens/DashboardScreen.tsx` - Added imports, state, elapsed timer, `handleQuickStart` callback, NextWorkoutCard JSX, and `nextWorkout*` styles

## Decisions Made

- Active session handling: tapping the card navigates to WorkoutTab directly, no alert, no new session — matches user decision from context
- Card is hidden entirely (not rendered) when `nextWorkout === null` — no programs or no activated programs produces no visual noise
- All-days-done fallback: shows first day of the program (always provides something actionable)
- Used `Promise.all` for parallel fetch of `getRecentlyTrainedExercises()` and `getNextWorkoutDay()` in `useFocusEffect`

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed missing `measurementType` field in `exportAllData`**
- **Found during:** Task 1 (TypeScript check after adding getNextWorkoutDay)
- **Issue:** `exportAllData()` in `db/dashboard.ts` was pushing Exercise objects without `measurementType`, causing a TS2345 type error (pre-existing bug, exposed during compilation of the modified file)
- **Fix:** Added `measurementType: (r.measurement_type ?? 'reps') as 'reps' | 'timed'` to the exercise push in `exportAllData`
- **Files modified:** `src/db/dashboard.ts`
- **Verification:** TypeScript error for that specific location resolved after fix
- **Committed in:** `e93b0bd` (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (Rule 1 - Bug)
**Impact on plan:** Pre-existing bug fixed inline while editing the same file. No scope creep.

## Issues Encountered

- Pre-existing `WorkoutScreen.tsx` TS error (missing `restSeconds` and `onRestChange` props on ExerciseCard) was present before this plan and is out of scope. Logged as pre-existing, not fixed.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Next Workout Card is fully functional; ready for rest timer work in plans 02+
- No blockers

## Self-Check: PASSED

- FOUND: src/types/index.ts
- FOUND: src/db/dashboard.ts
- FOUND: src/screens/DashboardScreen.tsx
- FOUND: .planning/phases/11-quick-start-rest-timer/11-01-SUMMARY.md
- FOUND: commit e93b0bd (Task 1)
- FOUND: commit 51789a5 (Task 2)

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

## Self-Check: PASSED

- FOUND: src/db/exercises.ts (updateDefaultRestSeconds exported)
- FOUND: src/db/sessions.ts (updateSessionRestSeconds exported)
- FOUND: src/screens/WorkoutScreen.tsx (restStepperVisible present)
- FOUND: .planning/phases/11-quick-start-rest-timer/11-02-SUMMARY.md
- FOUND commit: 8bc857d (DB helpers)
- FOUND commit: 69a4c11 (WorkoutScreen stepper UI)

---
*Phase: 11-quick-start-rest-timer*
*Completed: 2026-03-12*
