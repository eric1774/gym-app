# S01: Data Layer — DB Queries & Types — UAT

**Milestone:** M002
**Written:** 2026-03-17

## UAT Type

- UAT mode: artifact-driven
- Why this mode is sufficient: This slice produces pure data-layer functions with no UI. Contract verification via unit tests and type checking fully proves correctness. No runtime or visual verification needed.

## Preconditions

- Node.js installed with project dependencies (`npm install` completed)
- Working directory is the project root containing `package.json`, `src/`, and `jest.config.js`

## Smoke Test

Run `npx jest src/db/__tests__/dashboard.test.ts --verbose` — all 42 tests pass including the 14 new tests for `getCategorySummaries` and `getCategoryExerciseProgress`.

## Test Cases

### 1. TypeScript interfaces compile correctly

1. Run `npx tsc --noEmit`
2. Inspect output for errors in `src/types/index.ts`, `src/db/dashboard.ts`, or `src/db/index.ts`
3. **Expected:** No type errors in these three files. Pre-existing test path alias errors (`@test-utils`) are acceptable.

### 2. getCategorySummaries groups multi-category data correctly

1. Run `npx jest src/db/__tests__/dashboard.test.ts -t "groups rows by category" --verbose`
2. **Expected:** Test passes — function returns one `CategorySummary` per category with correct `exerciseCount`, `sparklinePoints`, `lastTrainedAt`, and `measurementType`.

### 3. getCategorySummaries handles empty data

1. Run `npx jest src/db/__tests__/dashboard.test.ts -t "returns empty array when no training data" --verbose`
2. **Expected:** Test passes — function returns `[]` when SQL returns zero rows.

### 4. getCategorySummaries handles timed exercises

1. Run `npx jest src/db/__tests__/dashboard.test.ts -t "uses reps.*duration.*as best value for timed exercises" --verbose`
2. **Expected:** Test passes — for `measurement_type = 'timed'`, the sparkline uses the `reps` column (duration in seconds) as the best value, not `weight`.

### 5. getCategorySummaries coalesces null measurement_type

1. Run `npx jest src/db/__tests__/dashboard.test.ts -t "coalesces null measurement_type to reps" --verbose`
2. **Expected:** Test passes — null `measurement_type` in SQL result is treated as `'reps'`.

### 6. getCategorySummaries uses majority rule for measurementType

1. Run `npx jest src/db/__tests__/dashboard.test.ts -t "determines measurementType by majority rule" --verbose`
2. **Expected:** Test passes — category with 2 reps exercises and 1 timed exercise reports `measurementType: 'reps'`.

### 7. getCategoryExerciseProgress returns per-exercise sparklines and bests

1. Run `npx jest src/db/__tests__/dashboard.test.ts -t "returns per-exercise progress with sparklines and bests" --verbose`
2. **Expected:** Test passes — each exercise has `sparklinePoints` (oldest-first), `currentBest` (last sparkline value), and `previousBest` (second-to-last or null).

### 8. getCategoryExerciseProgress applies time range filter

1. Run `npx jest src/db/__tests__/dashboard.test.ts -t "adds date filter when timeRange is not All" --verbose`
2. **Expected:** Test passes — when `timeRange` is `'3M'`, the SQL query includes a date threshold parameter.

### 9. getCategoryExerciseProgress skips date filter for All/omitted

1. Run `npx jest src/db/__tests__/dashboard.test.ts -t "does not add date filter when timeRange is All" --verbose`
2. Run `npx jest src/db/__tests__/dashboard.test.ts -t "does not add date filter when timeRange is omitted" --verbose`
3. **Expected:** Both tests pass — no date parameter added to SQL query.

### 10. No N+1 queries

1. Run `npx jest src/db/__tests__/dashboard.test.ts -t "calls executeSql exactly once" --verbose`
2. **Expected:** Both tests pass (one per function) — `executeSql` is called exactly once per function invocation regardless of how many categories/exercises exist.

### 11. Functions are importable from src/db/index.ts

1. Run `grep -n "getCategorySummaries\|getCategoryExerciseProgress" src/db/index.ts`
2. **Expected:** Both function names appear in the re-export block.

## Edge Cases

### Null measurement_type in exercises table

1. SQL returns a row where `measurement_type` is NULL
2. **Expected:** Both functions coalesce to `'reps'` — no crash, no undefined behavior.

### Category with only one session

1. `getCategoryExerciseProgress` called for a category with a single training session
2. **Expected:** `sparklinePoints` has one element, `currentBest` equals that value, `previousBest` is `null`.

### Time range that excludes all data

1. `getCategoryExerciseProgress('chest', '1M')` when all chest sessions are older than 1 month
2. **Expected:** Returns `[]` — same as empty data case.

## Failure Signals

- Any of the 14 new tests failing in `dashboard.test.ts`
- Type errors in `src/types/index.ts`, `src/db/dashboard.ts`, or `src/db/index.ts` from `tsc --noEmit`
- Missing exports in `src/db/index.ts` — downstream slices won't compile
- `executeSql` called more than once per function invocation — indicates N+1 regression

## Not Proven By This UAT

- Real SQLite performance with large datasets (1000+ sessions) — tested only with mocked SQL
- UI rendering of sparkline data — deferred to S02
- Integration with dashboard screen — deferred to S03
- Time range filter UX (pills, state management) — deferred to S04
- Correct SQL syntax against real SQLite engine — mocks don't execute actual SQL

## Notes for Tester

- All tests use mocked `executeSql` — they verify JS-side grouping logic and data transformation, not SQL correctness. SQL will be validated when S03/S04 run against the real database on device.
- Pre-existing test failures in `protein.test.ts` (streak tests) and timeout-prone screen tests are unrelated to this slice.
- The `@test-utils` path alias TypeScript errors are pre-existing and only affect `tsc --noEmit` output, not Jest execution (Jest resolves the alias via `moduleNameMapper` in jest config).
