---
phase: 22-export-data-layer
plan: 01
subsystem: database
tags: [sqlite, typescript, json-export, program-export]

# Dependency graph
requires: []
provides:
  - exportProgramData(programId) function in src/db/export.ts returning ProgramExport | null
  - ProgramExport, ProgramExportWeek, ProgramExportDay, ProgramExportExercise, ProgramExportSet TypeScript interfaces in src/types/index.ts
  - Re-export from src/db/index.ts barrel
affects:
  - 23-export-ui (will call exportProgramData and handle file delivery)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Multi-query assembly pattern: separate SQL queries for program metadata, day counts, sessions, and per-session sets, then assembled in JS with Map<weekNumber, days[]>
    - Map insertion-order preservation used for exercise ordering by performance (logged_at)

key-files:
  created:
    - src/db/export.ts
    - src/db/__tests__/export.test.ts
  modified:
    - src/types/index.ts
    - src/db/index.ts

key-decisions:
  - "Multiple sessions for the same (day, week) are included as separate day entries to preserve full training history"
  - "Completion % uses DISTINCT (program_day_id, program_week) pairs to avoid inflation from duplicate sessions"
  - "Map.forEach() used instead of for...of Map iteration to maintain ES5 target compatibility"
  - "Exercises ordered by first logged_at appearance (Map insertion order) not alphabetically"

patterns-established:
  - "Export assembly pattern: fetch program + counts in parallel queries, then loop sessions fetching per-session sets"

requirements-completed: [EXPD-01, EXPD-02, EXPD-03, EXPD-04, EXPD-05]

# Metrics
duration: 6min
completed: 2026-03-22
---

# Phase 22 Plan 01: Export Data Layer Summary

**SQLite-backed exportProgramData function assembling completed workout data into a hierarchical ProgramExport JSON (weeks > days > exercises > sets) with distinct-pair completion percentage calculation**

## Performance

- **Duration:** 6 min
- **Started:** 2026-03-22T14:10:21Z
- **Completed:** 2026-03-22T14:16:41Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments

- Defined 5 TypeScript interfaces for the export JSON shape (ProgramExport, ProgramExportWeek, ProgramExportDay, ProgramExportExercise, ProgramExportSet)
- Created exportProgramData function using 4-query strategy: program metadata, day count, completed sessions, per-session sets; returns null for missing programs and valid empty object for programs with no sessions
- Completion percentage calculated as Math.round(distinctCompletedDays / (totalWeeks * daysPerProgram) * 100) using a subquery with DISTINCT (program_day_id, program_week)
- 10 comprehensive tests covering all edge cases: null return, empty weeks, no days, single day, multiple weeks, partial completion, warmup mapping, duplicate sessions, exercise ordering, rounding

## Task Commits

Each task was committed atomically:

1. **Task 1: Define export types and create exportProgramData function** - `5d5ebba` (feat)
2. **Task 2: Write comprehensive tests for exportProgramData** - `725acdb` (test)

**Plan metadata:** (docs commit follows)

## Files Created/Modified

- `src/db/export.ts` - exportProgramData async function with SQL queries and hierarchical JSON assembly
- `src/db/__tests__/export.test.ts` - 10 tests covering all behaviors from the plan's behavior spec
- `src/types/index.ts` - Added ProgramExport and 4 supporting interfaces at end of file
- `src/db/index.ts` - Added re-export line: `export { exportProgramData } from './export'`

## Decisions Made

- Used Map.forEach() instead of for...of Map entries to maintain compatibility with the project's ES5 TypeScript target (for...of on Maps requires --downlevelIteration or ES2015+ target)
- Session-first query strategy: fetch all completed sessions, then per-session loop for sets — matches existing dashboard patterns

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed Map iteration compatibility with TypeScript ES5 target**
- **Found during:** Task 1 (TypeScript compile verification)
- **Issue:** `for...of Map` requires `--downlevelIteration` flag or ES2015+ target; project uses ES5 target
- **Fix:** Replaced `for (const [, exData] of exerciseMap)` and similar loops with `exerciseMap.forEach(...)` calls
- **Files modified:** src/db/export.ts
- **Verification:** `npx tsc --noEmit src/db/export.ts src/types/index.ts` passes (only pre-existing database.ts error remains)
- **Committed in:** 5d5ebba (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (1 bug — TypeScript target compatibility)
**Impact on plan:** Essential fix for TypeScript compatibility. No scope creep.

## Issues Encountered

None beyond the auto-fixed Map iteration issue above.

## Known Stubs

None - the exportProgramData function queries live SQLite data with no stubs or hardcoded values.

## Next Phase Readiness

- exportProgramData is fully implemented, tested, and re-exported from the barrel
- Phase 23 can import `exportProgramData` from `src/db` and call it with a programId
- Function returns ProgramExport | null — Phase 23 should handle the null case (program not found)

---
*Phase: 22-export-data-layer*
*Completed: 2026-03-22*
