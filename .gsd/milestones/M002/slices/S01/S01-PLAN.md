# S01: Data Layer — DB Queries & Types

**Goal:** `getCategorySummaries()` and `getCategoryExerciseProgress()` return correct data from SQLite; types are defined and exported.
**Demo:** Unit tests pass proving both functions return correctly shaped data from mocked SQL results; TypeScript compiles with no errors; functions are importable from `src/db/index.ts`.

## Must-Haves

- `CategorySummary` and `CategoryExerciseProgress` interfaces exported from `src/types/index.ts`
- `getCategorySummaries()` in `src/db/dashboard.ts` — single SQL query, JS-side grouping by category, returns `CategorySummary[]` for all 7 categories that have training data
- `getCategoryExerciseProgress(category, timeRange?)` in `src/db/dashboard.ts` — scoped to one category, optional time range filter, returns `CategoryExerciseProgress[]`
- Both functions re-exported from `src/db/index.ts`
- Unit tests covering happy path, empty data, timed exercises, and edge cases
- No N+1 queries — one SQL call per function invocation

## Proof Level

- This slice proves: contract
- Real runtime required: no
- Human/UAT required: no

## Verification

- `npx jest src/db/__tests__/dashboard.test.ts --verbose` — all new tests pass (getCategorySummaries + getCategoryExerciseProgress sections)
- `npx tsc --noEmit` — no type errors
- Manual check: `getCategorySummaries` and `getCategoryExerciseProgress` are importable from `src/db/index.ts`

## Integration Closure

- Upstream surfaces consumed: existing `exercises`, `workout_sets`, `workout_sessions` tables; `ExerciseCategory` type; `db` / `executeSql` from `src/db/database.ts`
- New wiring introduced in this slice: two new exports from `src/db/index.ts`; two new types in `src/types/index.ts`
- What remains before the milestone is truly usable end-to-end: S02 (sparkline components), S03 (dashboard UI), S04 (CategoryProgressScreen + navigation)

## Tasks

- [x] **T01: Add category types and implement both DB query functions** `est:45m`
  - Why: This is the core implementation — adds the two new interfaces and both query functions that S02–S04 depend on. Bundled together because the functions share types and follow the same established pattern.
  - Files: `src/types/index.ts`, `src/db/dashboard.ts`, `src/db/index.ts`
  - Do: Add `CategorySummary` and `CategoryExerciseProgress` interfaces to types. Implement `getCategorySummaries()` with one SQL query + JS grouping. Implement `getCategoryExerciseProgress(category, timeRange?)` with optional date filtering. Re-export both from `src/db/index.ts`. Follow existing `executeSql` + row iteration pattern exactly.
  - Verify: `npx tsc --noEmit` passes with no errors
  - Done when: Both functions exist, compile, and are importable from `src/db/index.ts`

- [ ] **T02: Add unit tests for getCategorySummaries and getCategoryExerciseProgress** `est:30m`
  - Why: Tests prove the contract — correct data shapes, edge cases (empty data, timed exercises, null measurement_type), and time range filtering. These tests are the slice's primary verification mechanism.
  - Files: `src/db/__tests__/dashboard.test.ts`
  - Do: Add describe blocks for both functions using the existing `mockExecuteSql` / `mockResultSet` pattern. Test: happy path with multiple categories, empty results, timed vs reps exercises, null measurement_type coalescing, sparkline point ordering (oldest-first), time range filtering for getCategoryExerciseProgress.
  - Verify: `npx jest src/db/__tests__/dashboard.test.ts --verbose` — all new tests pass
  - Done when: All new test sections pass and existing tests remain green

## Observability / Diagnostics

- **Runtime signals:** Both query functions log nothing on success (pure data retrieval). Errors propagate as rejected promises from `executeSql()` — callers handle with try/catch.
- **Inspection surfaces:** Functions return typed arrays (`CategorySummary[]`, `CategoryExerciseProgress[]`). Shape can be verified via `console.log(JSON.stringify(result))` in React Native debugger or Flipper.
- **Failure visibility:** SQL errors surface as unhandled promise rejections if not caught by the calling screen. Empty results (no training data) return empty arrays, not errors — callers must handle empty state.
- **Redaction constraints:** No PII in workout data. No secrets. All data is local SQLite — no network calls.

## Files Likely Touched

- `src/types/index.ts`
- `src/db/dashboard.ts`
- `src/db/index.ts`
- `src/db/__tests__/dashboard.test.ts`
