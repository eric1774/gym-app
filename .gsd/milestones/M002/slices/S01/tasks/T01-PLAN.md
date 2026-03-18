---
estimated_steps: 5
estimated_files: 3
---

# T01: Add category types and implement both DB query functions

**Slice:** S01 — Data Layer — DB Queries & Types
**Milestone:** M002

## Description

Add two new TypeScript interfaces (`CategorySummary`, `CategoryExerciseProgress`) and two new async DB query functions (`getCategorySummaries`, `getCategoryExerciseProgress`) to power the category drill-down dashboard. Follow the exact patterns already established in `src/db/dashboard.ts` — async functions using `executeSql()` on the singleton `db` promise, iterating `result.rows.item(i)`, returning typed arrays.

**Key design constraints:**
- One SQL query per function (no N+1 loops over categories)
- Sparkline points are `number[]` (y-values only), ordered oldest-first
- For timed exercises, the sparkline value is `reps` (which stores duration in seconds), NOT `weight_kg`
- `measurement_type` can be null in older rows — coalesce with `?? 'reps'`
- `getCategoryExerciseProgress` accepts an optional `timeRange` parameter (`'1M' | '3M' | '6M' | 'All'`) for date filtering

## Steps

1. **Add interfaces to `src/types/index.ts`** in the "Dashboard domain types (Phase 3)" section, after `ExerciseProgressPoint`:

   ```typescript
   export interface CategorySummary {
     category: ExerciseCategory;
     exerciseCount: number;
     sparklinePoints: number[];
     lastTrainedAt: string;
     measurementType: 'reps' | 'timed';
   }

   export interface CategoryExerciseProgress {
     exerciseId: number;
     exerciseName: string;
     measurementType: 'reps' | 'timed';
     sparklinePoints: number[];
     currentBest: number;
     previousBest: number | null;
     lastTrainedAt: string;
   }
   ```

2. **Implement `getCategorySummaries()` in `src/db/dashboard.ts`:**
   - Import `CategorySummary` from `'../types'` (add to existing import)
   - Write a single SQL query joining `exercises`, `workout_sets`, `workout_sessions` that returns per-exercise-per-session best values, ordered by `completed_at ASC`:
     ```sql
     SELECT e.id AS exercise_id, e.category, e.measurement_type,
            ws.session_id, wss.completed_at,
            MAX(CASE WHEN e.measurement_type = 'timed' THEN ws2_best.best_reps ELSE ws2_best.best_weight END) AS best_value
     ```
   - Use a correlated subquery pattern (like `getExerciseProgressData`) to pick the best set per exercise per session. For **reps-type** exercises, best = highest `weight_kg` (tiebreak `reps`). For **timed** exercises, best = highest `reps`.
   - A simpler approach: Run one query that gets all per-exercise-per-session bests across all categories:
     ```sql
     SELECT e.id AS exercise_id, e.category, e.measurement_type,
            ws.session_id, wss.completed_at AS completed_at,
            ws.weight_kg, ws.reps
     FROM workout_sets ws
     INNER JOIN exercises e ON e.id = ws.exercise_id
     INNER JOIN workout_sessions wss ON wss.id = ws.session_id
     WHERE wss.completed_at IS NOT NULL
       AND ws.id = (
         SELECT ws2.id FROM workout_sets ws2
         WHERE ws2.session_id = ws.session_id
           AND ws2.exercise_id = ws.exercise_id
         ORDER BY CASE WHEN e.measurement_type = 'timed' THEN ws2.reps ELSE ws2.weight_kg END DESC,
                  ws2.reps DESC
         LIMIT 1
       )
     GROUP BY ws.exercise_id, ws.session_id
     ORDER BY wss.completed_at ASC
     ```
   - **JS-side aggregation:** Group rows by `category`. For each category:
     - Count distinct `exercise_id` values → `exerciseCount`
     - For each session in the category, take the max `best_value` across exercises → `sparklinePoints` array
     - Take the latest `completed_at` → `lastTrainedAt`
     - Determine `measurementType` by majority rule (most exercises)
   - **Important:** The sparkline for a category should show the per-session max best value across all exercises in that category. This gives one point per session.
   - Actually, a category-level sparkline showing overall category trend is better computed as: for each session that trained at least one exercise in the category, take the average (or max) best value across exercises trained in that session. Use **max** for simplicity.

3. **Implement `getCategoryExerciseProgress(category, timeRange?)` in `src/db/dashboard.ts`:**
   - Import `CategoryExerciseProgress` from `'../types'`
   - Accepts `category: ExerciseCategory` and optional `timeRange?: '1M' | '3M' | '6M' | 'All'`
   - When `timeRange` is provided and not `'All'`, calculate a date threshold (same logic as `getDateThreshold` in `ExerciseProgressScreen.tsx` — subtract 1/3/6 months from now) and add `AND wss.completed_at >= ?` to the WHERE clause
   - SQL query scoped to one category:
     ```sql
     SELECT e.id AS exercise_id, e.name AS exercise_name, e.measurement_type,
            ws.session_id, wss.completed_at,
            ws.weight_kg, ws.reps
     FROM workout_sets ws
     INNER JOIN exercises e ON e.id = ws.exercise_id
     INNER JOIN workout_sessions wss ON wss.id = ws.session_id
     WHERE e.category = ?
       AND wss.completed_at IS NOT NULL
       AND ws.id = (
         SELECT ws2.id FROM workout_sets ws2
         WHERE ws2.session_id = ws.session_id
           AND ws2.exercise_id = ws.exercise_id
         ORDER BY CASE WHEN e.measurement_type = 'timed' THEN ws2.reps ELSE ws2.weight_kg END DESC,
                  ws2.reps DESC
         LIMIT 1
       )
     GROUP BY ws.exercise_id, ws.session_id
     ORDER BY wss.completed_at ASC
     ```
   - JS-side: Group by `exercise_id`. For each exercise build:
     - `sparklinePoints`: array of best values per session (oldest first)
     - `currentBest`: last element in sparkline
     - `previousBest`: second-to-last element, or `null` if only 1 session
     - `lastTrainedAt`: latest `completed_at`
     - `measurementType`: from row, coalesced with `?? 'reps'`
   - The best value for each row: if `measurement_type === 'timed'`, use `reps`; otherwise use `weight_kg`

4. **Update imports in `src/db/dashboard.ts`:**
   - Add `CategorySummary`, `CategoryExerciseProgress` to the import from `'../types'`

5. **Re-export from `src/db/index.ts`:**
   - Add `getCategorySummaries` and `getCategoryExerciseProgress` to the existing `export { ... } from './dashboard'` block

## Must-Haves

- [ ] `CategorySummary` interface exported from `src/types/index.ts` with fields: `category`, `exerciseCount`, `sparklinePoints`, `lastTrainedAt`, `measurementType`
- [ ] `CategoryExerciseProgress` interface exported from `src/types/index.ts` with fields: `exerciseId`, `exerciseName`, `measurementType`, `sparklinePoints`, `currentBest`, `previousBest`, `lastTrainedAt`
- [ ] `getCategorySummaries()` uses single SQL query + JS grouping (no N+1)
- [ ] `getCategoryExerciseProgress(category, timeRange?)` supports optional time range filtering
- [ ] Both functions follow the existing `executeSql` + `result.rows.item(i)` iteration pattern
- [ ] For timed exercises, best value is `reps` (duration in seconds), not `weight_kg`
- [ ] Null `measurement_type` coalesced to `'reps'`
- [ ] Both functions re-exported from `src/db/index.ts`

## Observability Impact

- **Signals changed:** Two new async functions become available. No new logging or metrics — follows existing silent-success pattern.
- **Inspection:** Future agents can verify function output by calling them in a test or debug screen and checking the returned array shapes match `CategorySummary[]` / `CategoryExerciseProgress[]`.
- **Failure visibility:** SQL query errors propagate as promise rejections. Empty training data returns `[]` (not null/error). Null `measurement_type` is silently coalesced to `'reps'`.

## Verification

- `npx tsc --noEmit` — no type errors
- Both functions are importable: `import { getCategorySummaries, getCategoryExerciseProgress } from '../db'`

## Inputs

- `src/types/index.ts` — existing types including `ExerciseCategory`, `ExerciseProgressPoint`
- `src/db/dashboard.ts` — existing query functions to follow as patterns (especially `getExerciseProgressData`, `getTimedExerciseProgressData`, `getRecentlyTrainedExercises`)
- `src/db/index.ts` — existing re-export block for dashboard functions
- `src/db/database.ts` — `db` and `executeSql` imports

## Expected Output

- `src/types/index.ts` — two new interfaces added in the Phase 3 section
- `src/db/dashboard.ts` — two new exported async functions
- `src/db/index.ts` — two new names in the dashboard re-export block
