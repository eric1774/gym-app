---
phase: 17-db-business-logic-tests
plan: 03
subsystem: testing
tags: [jest, sqlite, dashboard, calendar, seed, mocking]

requires:
  - phase: 15-test-infrastructure
    provides: Jest config, @test-utils/dbMock with mockResultSet helper
  - phase: 16-utility-and-mapper-tests
    provides: DB mock pattern (jest.mock('../database') + Object.defineProperty for db)

provides:
  - 45 passing tests covering dashboard.ts (11 functions), calendar.ts (3 functions), seed.ts (1 function)
  - Test patterns for multi-query chain functions and local-date-filtered calendar queries

affects: [future-db-modules, refactoring-dashboard, calendar-features]

tech-stack:
  added: []
  patterns:
    - Object.defineProperty(dbModule, 'db', ...) to override read-only db Promise export in tests
    - mockExecuteSql.mockResolvedValueOnce chaining for multi-query function tests
    - jest.mock('../../utils/dates') + mockReturnValueOnce for deterministic local date strings
    - mockRunTransaction.mockImplementation capturing tx callback to count tx.executeSql invocations

key-files:
  created:
    - src/db/__tests__/dashboard.test.ts
    - src/db/__tests__/calendar.test.ts
    - src/db/__tests__/seed.test.ts
  modified: []

key-decisions:
  - "Object.defineProperty pattern (from exercises.test.ts) is required for db mock — direct assignment fails because db is a read-only const export"
  - "executeSql in seed.ts is called without a params argument for COUNT query — toHaveBeenCalledWith must match exact arg count"
  - "getDaySessionDetails PR detection: isPR=false when priorMax is null (first-ever session, no baseline)"

patterns-established:
  - "Multi-query chains: use sequential mockResolvedValueOnce calls in the exact order the source function calls executeSql"
  - "runTransaction mock: implement callback capture to verify tx.executeSql call count without coupling to internal seed data"

requirements-completed: [DBLG-06, DBLG-07, DBLG-08]

duration: 3min
completed: 2026-03-15
---

# Phase 17 Plan 03: DB Business Logic Tests Summary

**45 unit tests covering dashboard.ts (11 async functions), calendar.ts (3 functions), and seed.ts seedIfEmpty guard using jest.mock + mockResolvedValueOnce chain patterns**

## Performance

- **Duration:** 3 min
- **Started:** 2026-03-15T21:11:18Z
- **Completed:** 2026-03-15T21:14:00Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments

- dashboard.test.ts: 28 tests covering all 11 async functions including 5-path getNextWorkoutDay, multi-exercise getSessionTimeSummary computation, nested exportAllData assembly, and getProgramWeekCompletion multi-query chain
- calendar.test.ts: 11 tests covering getWorkoutDaysForMonth (local date filtering + buffer zone exclusion), getFirstSessionDate, and getDaySessionDetails (PR detection, warmup exclusion, null priorMax)
- seed.test.ts: 4 tests for seedIfEmpty verifying 42 tx.executeSql calls when empty and 0 runTransaction calls when non-empty

## Task Commits

Each task was committed atomically:

1. **Task 1: Write dashboard.ts business logic tests** - `a2daf8f` (feat)
2. **Task 2: Write calendar.ts and seed.ts business logic tests** - `e1a3dde` (feat)

**Plan metadata:** (final metadata commit to follow)

## Files Created/Modified

- `src/db/__tests__/dashboard.test.ts` - 28 tests for all 11 dashboard.ts business logic functions
- `src/db/__tests__/calendar.test.ts` - 11 tests for all 3 calendar.ts functions with date mocking
- `src/db/__tests__/seed.test.ts` - 4 tests for seedIfEmpty empty vs non-empty guard

## Decisions Made

- Used `Object.defineProperty(dbModule, 'db', ...)` instead of direct assignment — the `db` export is a read-only const and direct mutation throws "read-only" at module load time
- For seed.ts COUNT query assertion: omitted the optional `params` argument in `toHaveBeenCalledWith` since `executeSql` is called without params (the function signature has it optional, and the actual call omits it)
- For getDaySessionDetails PR detection: when `max_volume` is null, `isPR` is always false — this is consistent with the "first-ever performance is not a PR" decision from Phase 10

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed `db` mock pattern to use Object.defineProperty**
- **Found during:** Task 1 (dashboard tests)
- **Issue:** Plan template used `(db as unknown as Promise<any>) = Promise.resolve(mockDb)` which fails at runtime because `db` is a read-only const
- **Fix:** Used `Object.defineProperty(dbModule, 'db', { value: Promise.resolve(mockDb), writable: true })` matching the existing exercises.test.ts pattern
- **Files modified:** src/db/__tests__/dashboard.test.ts (and applied same fix to calendar.test.ts and seed.test.ts)
- **Verification:** All tests pass
- **Committed in:** a2daf8f (Task 1 commit)

**2. [Rule 1 - Bug] Fixed seed COUNT query assertion to omit optional params arg**
- **Found during:** Task 2 (seed.test.ts)
- **Issue:** `toHaveBeenCalledWith(mockDb, expect.stringContaining('COUNT'), expect.anything())` failed because executeSql is called without params (only 2 args)
- **Fix:** Removed `expect.anything()` third argument
- **Files modified:** src/db/__tests__/seed.test.ts
- **Verification:** All 4 seed tests pass
- **Committed in:** e1a3dde (Task 2 commit)

---

**Total deviations:** 2 auto-fixed (2 Rule 1 bugs)
**Impact on plan:** Both auto-fixes corrected plan template suggestions that did not match actual module API. No scope creep.

## Issues Encountered

None beyond the auto-fixed deviations above.

## Next Phase Readiness

- All 3 test files passing: dashboard.ts, calendar.ts, seed.ts fully covered
- 45 tests total across the three files (28 + 11 + 4 + 2 fixes)
- Pattern established for mocking db export and chaining executeSql calls is consistent with exercises.test.ts

---
*Phase: 17-db-business-logic-tests*
*Completed: 2026-03-15*
