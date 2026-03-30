---
phase: 26-hr-data-persistence
plan: "02"
subsystem: ui
tags: [heart-rate, workout-summary, calendar, conditional-rendering]

requires:
  - phase: 26-hr-data-persistence-plan-01
    provides: HR type definitions, flushHRSamples context action, DB persistence layer

provides:
  - Conditional Avg HR and Peak HR stat rows in WorkoutSummary (after Exercises, before PRs)
  - Conditional HR second stats line in CalendarDayDetail SessionCard
  - hrStatsRow style in CalendarDayDetailScreen

affects: [WorkoutScreen, CalendarDayDetailScreen, WorkoutSummaryProps]

tech-stack:
  added: []
  patterns: [conditional rendering with !== null guard, reuse existing stat row styles]

key-files:
  created: []
  modified:
    - src/screens/WorkoutScreen.tsx
    - src/screens/CalendarDayDetailScreen.tsx
    - src/types/index.ts
    - src/db/sessions.ts
    - src/db/calendar.ts
    - src/db/dashboard.ts

key-decisions:
  - "HR rows use avgHr !== null guard wrapping both Avg HR and Peak HR rows together (single conditional)"
  - "HR rows placed after Exercises row and before PRs row per UI-SPEC placement rationale"
  - "hrStatsRow style uses marginTop spacing.sm (no border) to visually separate from main statsRow"
  - "avgHr/peakHr added to WorkoutSession and CalendarSessionDetail types in index.ts as dependency"
  - "rowToSession mapper updated with optional avg_hr/peak_hr columns for DB schema compatibility"

patterns-established:
  - "Conditional stat rows: use !== null guard around <> fragment containing both related rows"
  - "hrStatsRow pattern: flexDirection row, flexWrap wrap, gap md, marginTop sm, marginBottom base — no border"

requirements-completed: [DATA-03, DATA-04]

duration: 8min
completed: 2026-03-27
---

# Phase 26 Plan 02: HR UI Display Summary

Avg HR and Peak HR stat rows added to WorkoutSummary (post-workout) and CalendarDayDetail (historical) using conditional rendering that hides HR stats entirely when no HR data exists.

## Performance

- **Duration:** ~8 min
- **Started:** 2026-03-27T22:42:04Z
- **Completed:** 2026-03-27T22:50:00Z
- **Tasks:** 1 of 2 complete (Task 2 is a human-verify checkpoint — awaiting user)
- **Files modified:** 6

## Accomplishments

- WorkoutSummary component now renders Avg HR and Peak HR stat rows when avgHr is not null, positioned correctly after Exercises and before PRs
- CalendarDayDetail SessionCard renders a second stats line with Avg HR and Peak HR when session has HR data
- Both views hide HR stats entirely when avgHr is null (D-08 compliance)
- TypeScript types updated to include avgHr/peakHr on WorkoutSession and CalendarSessionDetail
- All modified source files compile without TypeScript errors

## Task Commits

1. **Task 1: WorkoutSummary HR stat rows and CalendarDayDetail HR second line** - `6b5eb3a` (feat)

## Files Created/Modified

- `src/screens/WorkoutScreen.tsx` - Added avgHr/peakHr to WorkoutSummaryProps, destructured in component, added two conditional stat rows after Exercises and before PRs, updated summaryData state type and component call site
- `src/screens/CalendarDayDetailScreen.tsx` - Added HR stats second row using hrStatsRow style, added hrStatsRow style definition
- `src/types/index.ts` - Added avgHr/peakHr fields to WorkoutSession and CalendarSessionDetail interfaces
- `src/db/sessions.ts` - Updated rowToSession mapper to include avg_hr/peak_hr from DB row
- `src/db/calendar.ts` - Added avgHr: null, peakHr: null to CalendarSessionDetail construction
- `src/db/dashboard.ts` - Added avgHr/peakHr to sessions.push() in full data export

## Decisions Made

- Grouped both HR rows inside a single `{avgHr !== null && (<> ... </>)}` conditional rather than separate checks — keeps HR rows as an atomic unit; if avg HR exists, peak HR always exists too
- Placed HR rows after Exercises and before PRs per UI-SPEC: "HR data groups with performance stats rather than workout structure stats"
- Used `hrStatsRow` style (not reusing `statsRow`) to avoid the bottom border and extra padding that `statsRow` has — the HR row stands on its own without a divider per UI-SPEC
- Added required type fields to `index.ts` since Plan 01 types were not present in this worktree (parallel execution dependency)

## Deviations from Plan

### Pre-completion by Plan 01

The objective noted that Plan 01 (Wave 1 executor) already implemented the UI changes in the main branch. However, this worktree (`worktree-agent-a3c49891`) is based on an older commit that predates Phase 26 entirely. All changes were applied fresh in this worktree, creating a clean implementation that matches the plan spec exactly.

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Added avgHr/peakHr to WorkoutSession and CalendarSessionDetail types**
- **Found during:** Task 1
- **Issue:** Plan 02 depends on Plan 01 for type definitions, but this worktree branch lacks Plan 01 changes. Without the types, the UI code would fail TypeScript compilation.
- **Fix:** Added avgHr/peakHr fields to both interfaces in src/types/index.ts
- **Files modified:** src/types/index.ts
- **Verification:** npx tsc --noEmit passes with no errors in source files
- **Committed in:** 6b5eb3a (Task 1 commit)

**2. [Rule 3 - Blocking] Updated rowToSession mapper, calendar.ts, and dashboard.ts for new type fields**
- **Found during:** Task 1
- **Issue:** After adding avgHr/peakHr to types, TypeScript flagged incomplete object literals in sessions.ts rowToSession, calendar.ts getDaySessionDetails, and dashboard.ts export function
- **Fix:** Added avg_hr/peak_hr mapping to rowToSession; added avgHr: null, peakHr: null to calendar and dashboard construction sites
- **Files modified:** src/db/sessions.ts, src/db/calendar.ts, src/db/dashboard.ts
- **Verification:** npx tsc --noEmit passes with no errors
- **Committed in:** 6b5eb3a (Task 1 commit)

---

**Total deviations:** 2 auto-fixed (both Rule 3 - Blocking due to parallel execution dependency gap)
**Impact on plan:** Both auto-fixes necessary for TypeScript correctness. The actual data wiring (flushHRSamples context) is Plan 01's responsibility and will be merged separately.

## Known Stubs

- `avgHr: null` and `peakHr: null` are hardcoded in `setSummaryData` call in WorkoutScreen.tsx — this is intentional until Plan 01's HeartRateContext and flushHRSamples are merged. The UI correctly hides the HR rows when values are null.
- `avgHr: null` and `peakHr: null` in calendar.ts getDaySessionDetails — Plan 01 wires the actual DB query to include avg_hr/peak_hr columns.

## Issues Encountered

None beyond the dependency gaps handled as deviations above.

## Next Phase Readiness

- Task 2 (human-verify checkpoint) is pending user verification on physical device
- Once Plan 01 changes are merged (HeartRateContext, flushHRSamples, DB query updates), the HR data will flow through to the UI automatically
- User needs to verify 8 steps: HR stats visible with device connected, hidden without

## Self-Check: PASSED

All 6 modified files verified to exist on disk. Task 1 commit (6b5eb3a) verified in git history.

---
*Phase: 26-hr-data-persistence*
*Completed: 2026-03-27*
