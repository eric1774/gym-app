---
phase: 17-db-business-logic-tests
plan: 01
subsystem: testing
tags: [jest, sqlite, react-native, unit-tests, mock, auto-mock]

# Dependency graph
requires:
  - phase: 16-utility-and-mapper-tests
    provides: mapper functions and test infrastructure patterns
  - phase: 15-test-infrastructure
    provides: mockResultSet, mockDatabase test utilities
provides:
  - 45 unit tests covering all 24 async functions in exercises.ts, sessions.ts, and sets.ts
  - Documented working Jest auto-mock pattern for React Native SQLite modules
  - Confirmed: import mockResultSet from @test-utils/dbMock not @test-utils (avoids mockProviders side effects)
affects: [future-db-tests, test-infrastructure]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "jest.mock('../database') auto-mock (NOT factory) + Object.defineProperty for db Promise"
    - "Import mockResultSet from @test-utils/dbMock directly to avoid mockProviders.tsx side effects"
    - "mockExecuteSql = executeSql as jest.MockedFunction<typeof executeSql>"
    - "Chain .mockResolvedValueOnce() once per SQL call in function under test"

key-files:
  created:
    - src/db/__tests__/exercises.test.ts
    - src/db/__tests__/sessions.test.ts
    - src/db/__tests__/sets.test.ts

key-decisions:
  - "Use jest.mock('../database') auto-mock instead of factory mock — factory mock is applied lazily and doesn't intercept module imports in exercises/sessions/sets"
  - "Import from @test-utils/dbMock not @test-utils — @test-utils/index loads mockProviders.tsx which calls jest.mock('../db/exercises', factory) overriding the auto-mock"
  - "Object.defineProperty(dbModule, 'db', { value: Promise.resolve(mockDb) }) after require('../database') to set the db Promise"
  - "checkForPR: null max_weight returns false (first-ever is NOT a PR); must strictly exceed to return true"

patterns-established:
  - "DB module test pattern: jest.mock('../database') + @test-utils/dbMock import + Object.defineProperty for db"
  - "All 3 test files use identical setup boilerplate for consistency"

requirements-completed: [DBLG-01, DBLG-02, DBLG-03]

# Metrics
duration: 90min
completed: 2026-03-15
---

# Phase 17 Plan 01: exercises/sessions/sets DB Business Logic Tests Summary

**45 unit tests for all 24 async functions in exercises.ts, sessions.ts, sets.ts using jest.mock auto-mock with @test-utils/dbMock to bypass mockProviders side effects**

## Performance

- **Duration:** ~90 min (including 56-iteration debug investigation)
- **Started:** 2026-03-15T20:00:00Z
- **Completed:** 2026-03-15T23:08:53Z
- **Tasks:** 2
- **Files created:** 3

## Accomplishments
- 12 tests for all 7 exercises.ts functions (getExercises, getExercisesByCategory, addExercise, deleteExercise, updateExercise, updateDefaultRestSeconds, searchExercises)
- 20 tests for all 12 sessions.ts functions including complex edge cases (toggleExerciseComplete 3 directions, hasSessionActivity 2 SQL calls, deleteSession 3 ordered deletes, createSession with/without programDayId)
- 13 tests for all 5 sets.ts functions including all 4 checkForPR edge cases (null=false, equal=false, greater=true, less=false)
- Identified and documented root cause of Jest mock issue: @test-utils/index loads mockProviders.tsx which auto-mocks exercises and sessions modules

## Task Commits

Each task was committed atomically:

1. **Task 1: Write exercises.ts business logic tests** - `d266020` (feat)
2. **Task 2: Write sessions.ts and sets.ts business logic tests** - `93c1d8b` (feat)

## Files Created/Modified
- `src/db/__tests__/exercises.test.ts` - 12 tests for all 7 exercises.ts async functions
- `src/db/__tests__/sessions.test.ts` - 20 tests for all 12 sessions.ts async functions
- `src/db/__tests__/sets.test.ts` - 13 tests for all 5 sets.ts async functions

## Decisions Made
- **Auto-mock over factory mock**: `jest.mock('../database')` without factory is required because the factory mock is hoisted but called lazily — exercises/sessions/sets already load with the real module before the factory mock fires. Auto-mock ensures the exercises.ts module gets the mocked executeSql at import time.
- **Direct @test-utils/dbMock import**: The barrel export at @test-utils/index loads mockProviders.tsx which contains `jest.mock('../db/exercises', factory)` and `jest.mock('../db/sessions', factory)` side effects. Importing from the direct path avoids these side effects.
- **Object.defineProperty for db**: Since `db` is a `const` export (a Promise), reassignment fails. Using `Object.defineProperty` on the required module object sets the property correctly and persists across the test file.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug Investigation] Identified @test-utils side effect causing mock override**
- **Found during:** Task 1 (exercises.ts tests)
- **Issue:** Importing `mockResultSet` from `@test-utils` causes @test-utils/index → mockProviders.tsx → `jest.mock('../db/exercises', factory)` to execute, replacing auto-mock with a 5-function stub (getExercises, getExerciseById, addExercise, updateExercise, deleteExercise). All other function imports become undefined.
- **Fix:** Changed import from `@test-utils` to `@test-utils/dbMock` (direct path) in all 3 test files. The `'^@test-utils/(.*)$'` moduleNameMapper pattern already supports this.
- **Files modified:** All 3 new test files
- **Verification:** All 45 tests pass
- **Committed in:** d266020, 93c1d8b

**2. [Rule 1 - Bug Investigation] Factory mock doesn't intercept module in exercises/sessions/sets**
- **Found during:** Task 1 (56-iteration debug process spanning previous session)
- **Issue:** `jest.mock('../database', () => ({ executeSql: jest.fn() }))` factory mock creates a mock that exercises.ts does NOT receive — exercises.ts loads via the global react-native-sqlite-storage mock instead. Root cause: Babel `_interopRequireWildcard` and lazy factory evaluation means exercises.ts loads before the factory fires.
- **Fix:** Switched to `jest.mock('../database')` auto-mock (no factory). Auto-mock creates jest.fn() stubs that ARE properly shared with exercises.ts. Combined with Object.defineProperty for db, this provides complete control.
- **Files modified:** All 3 new test files
- **Verification:** executeSql mock calls confirmed in tests (called 1-3 times per function as expected)
- **Committed in:** d266020, 93c1d8b

---

**Total deviations:** 2 auto-fixed (2 bug investigations/root cause fixes)
**Impact on plan:** Both deviations were necessary to make tests work correctly. The plan's suggested mock pattern (`(db as any) = Promise.resolve(mockDb)`) wouldn't work because `db` is a const export. Working pattern documented in key-decisions.

## Issues Encountered
- Pre-existing App.test.tsx failures in main and worktrees directory — not related to this work, confirmed by git stash verification
- 56 debug iterations across two sessions to identify the @test-utils side effect root cause

## Next Phase Readiness
- All 3 core DB modules (exercises, sessions, sets) have comprehensive business logic tests
- Documented mock pattern ready for remaining DB module tests in phases 17-02, 17-03
- Key insight: use `@test-utils/dbMock` not `@test-utils` for any test file that tests modules mocked in mockProviders.tsx

---
*Phase: 17-db-business-logic-tests*
*Completed: 2026-03-15*
