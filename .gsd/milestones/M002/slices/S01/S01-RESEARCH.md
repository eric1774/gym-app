# S01: Data Layer — DB Queries & Types — Research

**Date:** 2026-03-17
**Depth:** Light research — straightforward SQL aggregation following established patterns in `src/db/dashboard.ts`

## Summary

This slice adds two new DB query functions (`getCategorySummaries()` and `getCategoryExerciseProgress()`) and two new TypeScript interfaces (`CategorySummary` and `CategoryExerciseProgress`) to power the category drill-down dashboard. The existing codebase has a clear, consistent pattern for DB queries: async functions in `src/db/dashboard.ts` that call `executeSql()` on the singleton `db` promise, iterate `result.rows`, and return typed arrays. Tests mock `executeSql` via `@test-utils/mockResultSet`. No new libraries, migrations, or architectural decisions are needed — this is SQL aggregation over existing tables (`exercises`, `workout_sets`, `workout_sessions`).

The 7 categories are already defined as the `ExerciseCategory` union type in `src/types/index.ts`: `chest`, `back`, `legs`, `shoulders`, `arms`, `core`, `conditioning`. The new queries aggregate best-weight (or best-duration for timed exercises) per session per exercise, then collapse into sparkline point arrays grouped by category.

## Recommendation

Follow the exact pattern of `getExerciseProgressData()` and `getRecentlyTrainedExercises()` in `src/db/dashboard.ts`. Write two new functions in that same file, add two new interfaces to `src/types/index.ts`, re-export from `src/db/index.ts`, and add unit tests in `src/db/__tests__/dashboard.test.ts`. Use a single SQL query per function where possible to avoid N+1 patterns.

## Implementation Landscape

### Key Files

- **`src/types/index.ts`** — Add `CategorySummary` and `CategoryExerciseProgress` interfaces. Place them in the "Dashboard domain types (Phase 3)" section alongside existing `ExerciseProgressPoint`. The `EXERCISE_CATEGORIES` array and `ExerciseCategory` type already exist here and will be used.

- **`src/db/dashboard.ts`** — Add `getCategorySummaries()` and `getCategoryExerciseProgress(category, timeRange?)`. This file already imports `db`, `executeSql`, and all needed types. Follow the existing row-iteration pattern (`result.rows.item(i)` → push to typed array).

- **`src/db/index.ts`** — Re-export the two new functions. Follow the existing `export { ... } from './dashboard'` block.

- **`src/db/__tests__/dashboard.test.ts`** — Add test sections for both new functions. Follow the mock pattern: `mockExecuteSql.mockResolvedValueOnce(mockResultSet([...]))`.

### New Types

```typescript
interface CategorySummary {
  category: ExerciseCategory;
  exerciseCount: number;          // distinct exercises trained in this category
  sparklinePoints: number[];      // best weight (or duration) per session, oldest-first
  lastTrainedAt: string;          // ISO datetime of most recent session
  measurementType: 'reps' | 'timed'; // dominant measurement type for display
}

interface CategoryExerciseProgress {
  exerciseId: number;
  exerciseName: string;
  measurementType: 'reps' | 'timed';
  sparklinePoints: number[];      // best weight/duration per session, oldest-first
  currentBest: number;            // most recent session's best value
  previousBest: number | null;    // prior session's best value (null if only 1 session)
  lastTrainedAt: string;          // ISO datetime of most recent session
}
```

### SQL Strategy

**`getCategorySummaries()`** — One query that gets per-exercise-per-session best weights, then aggregate in JS to produce per-category sparkline arrays. The SQL joins `exercises`, `workout_sets`, and `workout_sessions`, groups by `(exercise_id, session_id)`, takes `MAX(weight_kg)` (or `MAX(reps)` for timed), and orders by `completed_at ASC`. JS code groups by category, counts distinct exercises, and picks the per-session max across all exercises in that category for the sparkline. For `measurementType`, use majority rule (most exercises in the category).

**`getCategoryExerciseProgress(category)`** — Similar query scoped to a single category via `WHERE e.category = ?`. Returns per-exercise sparkline arrays, current/previous best values, and last trained date. An optional `timeRange` parameter filters by `completed_at >= ?` using the same threshold logic from `ExerciseProgressScreen` (`getDateThreshold()`).

### Build Order

1. **Types first** — Add `CategorySummary` and `CategoryExerciseProgress` to `src/types/index.ts`. This unblocks everything.
2. **`getCategorySummaries()`** — Write the query + JS aggregation in `src/db/dashboard.ts`. This is the riskiest piece (batch aggregation performance).
3. **`getCategoryExerciseProgress()`** — Write the per-category query. Simpler than #2 since it's scoped to one category.
4. **Re-export** — Add both to `src/db/index.ts`.
5. **Tests** — Add test sections in `src/db/__tests__/dashboard.test.ts`.

### Verification Approach

- **Unit tests pass:** `npx jest src/db/__tests__/dashboard.test.ts` — all new tests for both functions pass
- **TypeScript compiles:** `npx tsc --noEmit` — no type errors from new interfaces or function signatures
- **Exports work:** Verify the two new functions are importable from `src/db/index.ts`

## Constraints

- SQLite via `react-native-sqlite-storage` — no CTEs with window functions (older Android SQLite versions). Use subqueries and JS-side aggregation instead.
- `result.rows` uses `.item(i)` accessor pattern, not array iteration — must follow existing loop pattern.
- Sparkline points should be `number[]` (not full objects) to keep the component interface simple — the `MiniSparkline` in S02 only needs y-values.
- `measurement_type` column defaults to `'reps'` and can be `null` in older rows — must handle with `?? 'reps'` coalescing (pattern already used in `getRecentlyTrainedExercises()`).

## Common Pitfalls

- **N+1 query trap** — Don't loop over categories and run a query per category in `getCategorySummaries()`. Use one query that fetches all categories at once, then group in JS. The existing `getProgramWeekCompletion()` has an N+1 pattern (query per day) — don't repeat that.
- **Sparkline data ordering** — Points must be oldest-first (`ORDER BY completed_at ASC`) for the sparkline to render correctly as a left-to-right timeline. The existing `getExerciseProgressData()` already does this.
- **Timed vs weight metric confusion** — For timed exercises, the sparkline value is `reps` (which stores seconds), not `weight_kg`. The existing `getTimedExerciseProgressData()` shows this pattern: `ORDER BY ws2.reps DESC` instead of `ws2.weight_kg DESC`.
