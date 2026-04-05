---
phase: 36-goal-setting-stats
plan: 01
subsystem: ui
tags: [react-native, hydration, goal-setting, tdd, conditional-rendering]

# Dependency graph
requires:
  - phase: 35-tab-bar-hydration-core
    provides: HydrationView.tsx with WaterCup hero, quick-add buttons, LogWaterModal
  - phase: 34-db-foundation
    provides: hydrationDb.getWaterGoal, setWaterGoal, getStreakDays, get7DayAverage
provides:
  - GoalSetupCard component with pre-filled 64 oz default, validation, and onGoalSet callback
  - HydrationView null-aware goalOz state (number|null) driving first-use conditional render
  - HydrationView refreshData fetching 4 data points in Promise.all (total, goal, streak, avg)
  - 7-test coverage for GoalSetupCard (validation, submit success, render)
affects: [36-goal-setting-stats plan 02, stat cards, inline goal editing]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "GoalSetupCard pattern: pre-filled default value (useState('64')), parseInt validation with isNaN/<=0 guard, isSubmitting disables button (T-36-02)"
    - "Null-aware goalOz conditional render: goalOz===null ? <GoalSetupCard> : <FullContent>"
    - "Promise.all for parallel data fetching: total + goal + streak + avg in single refreshData call"

key-files:
  created:
    - src/components/GoalSetupCard.tsx
    - src/components/__tests__/GoalSetupCard.test.tsx
  modified:
    - src/components/HydrationView.tsx

key-decisions:
  - "GoalSetupCard uses useState('64') pre-fill per D-02 — users see a ready-to-submit default, no blank form"
  - "HydrationView conditional: goalOz===null renders only GoalSetupCard (centered), goalOz!==null renders full ScrollView — implements D-01 and D-04"
  - "refreshData extended to 4-item Promise.all — streak and avg fetched alongside total and goal so Plan 02 stat cards can read from existing state"
  - "weightRegular and weeklyAvgOz imported/declared now so Plan 02 can add stat cards without re-touching state declarations"

patterns-established:
  - "GoalSetupCard onGoalSet: async ()=>Promise<void> — matches hydration refreshData signature directly"
  - "void variable suppression for intentionally-unused-until-next-plan state (weeklyAvgOz)"

requirements-completed: [GOAL-01]

# Metrics
duration: 18min
completed: 2026-04-05
---

# Phase 36 Plan 01: GoalSetupCard and HydrationView First-Use Gate Summary

**GoalSetupCard component with pre-filled 64 oz input and validation, gated behind HydrationView null-aware goalOz state using conditional rendering**

## Performance

- **Duration:** 18 min
- **Started:** 2026-04-05T00:00:00Z
- **Completed:** 2026-04-05T00:18:00Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments

- Created GoalSetupCard with pre-filled "64" default, parseInt validation (isNaN/<=0 guard), isSubmitting double-tap protection, and full accessibility labels
- Expanded HydrationView refreshData from 2-item to 4-item Promise.all (getTodayWaterTotal, getWaterGoal, getStreakDays, get7DayAverage) with null-aware state
- Replaced hardcoded `goalOz = 64` default with `goalOz: number|null = null`, implementing D-09 replacement — first-use users see GoalSetupCard instead of cup
- All 7 GoalSetupCard tests pass (TDD: RED→GREEN)

## Task Commits

Each task was committed atomically:

1. **Task 1: Create GoalSetupCard component with tests** - `8686b87` (feat)
2. **Task 2: Expand HydrationView state and add conditional GoalSetupCard rendering** - `5ccf5ce` (feat)

**Plan metadata:** (docs commit to follow)

## Files Created/Modified

- `src/components/GoalSetupCard.tsx` - First-use water goal setup card with pre-filled 64 oz, validation, and onGoalSet callback
- `src/components/__tests__/GoalSetupCard.test.tsx` - 7 tests covering render, validation (0/empty/abc), and submit success (default 64 / typed 128)
- `src/components/HydrationView.tsx` - Null-aware goalOz state, 4-item Promise.all in refreshData, conditional GoalSetupCard vs full ScrollView rendering

## Decisions Made

- GoalSetupCard pre-fills "64" (not blank) per D-02 — removes cognitive friction from first-use onboarding, user can just tap Set Goal
- `onGoalSet: () => Promise<void>` signature matches HydrationView's `refreshData` directly — no wrapper needed
- `streakDays` and `weeklyAvgOz` state added now even though stat card rendering is Plan 02 scope — avoids re-touching state declarations in the next plan

## Deviations from Plan

None - plan executed exactly as written.

## Known Stubs

- `weeklyAvgOz` and `streakDays` are fetched in refreshData but not yet rendered — intentional, stat card rendering is Plan 02 scope. Comment in HydrationView.tsx marks the placeholder location.

## Issues Encountered

- Working tree was on an older branch base (c421d8a) rather than the target (b019c62). Reset and restored files from HEAD before execution. No code impact.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Plan 02 can read `streakDays` and `weeklyAvgOz` from HydrationView state directly — state declarations already in place
- Goal label row (GOAL: X fl oz) and HydrationStatCards are the remaining Plan 02 items
- All data fetching is complete; Plan 02 is UI-only work

## Self-Check: PASSED

- FOUND: src/components/GoalSetupCard.tsx
- FOUND: src/components/__tests__/GoalSetupCard.test.tsx
- FOUND: src/components/HydrationView.tsx
- FOUND: .planning/phases/36-goal-setting-stats/36-01-SUMMARY.md
- FOUND commit: 8686b87 (feat(36-01): create GoalSetupCard)
- FOUND commit: 5ccf5ce (feat(36-01): expand HydrationView state)

---
*Phase: 36-goal-setting-stats*
*Completed: 2026-04-05*
