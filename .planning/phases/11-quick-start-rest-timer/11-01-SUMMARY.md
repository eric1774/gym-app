---
phase: 11-quick-start-rest-timer
plan: 01
subsystem: ui
tags: [react-native, dashboard, navigation, sqlite]

# Dependency graph
requires:
  - phase: 10-pr-detection-volume-tracking
    provides: WorkoutScreen PR detection and session infrastructure
  - phase: 08-programs
    provides: programs, program_days, program_day_exercises tables and DB queries
provides:
  - NextWorkoutInfo interface in types/index.ts
  - getNextWorkoutDay() query in db/dashboard.ts
  - NextWorkoutCard UI in DashboardScreen (idle + active states)
affects: [11-quick-start-rest-timer, future dashboard enhancements]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - useFocusEffect with Promise.all for parallel data fetching
    - Inline elapsed timer via useEffect + setInterval keyed on session object
    - getParent<NavigationProp<TabParamList>>() for cross-tab navigation from nested stack

key-files:
  created: []
  modified:
    - src/types/index.ts
    - src/db/dashboard.ts
    - src/screens/DashboardScreen.tsx

key-decisions:
  - "Active session tapping Continue navigates to WorkoutTab without creating a new session"
  - "Next Workout card hidden entirely when no activated programs exist (null check)"
  - "When all days are done for the current week, show first day of program as next workout"
  - "Most recently used program identified via workout_sessions.started_at DESC, falls back to most recently created activated program"

patterns-established:
  - "NextWorkoutCard: two-state card (idle/active) within single View, state-conditional render"
  - "Cross-tab navigation: navigation.getParent<NavigationProp<TabParamList>>()?.navigate('WorkoutTab')"

requirements-completed: [NAV-01, NAV-02]

# Metrics
duration: 18min
completed: 2026-03-11
---

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
