# T02: 04-data-foundation 02

**Slice:** S01 — **Milestone:** M001

## Description

Build the protein repository module with full CRUD operations for meals, goal management, and daily aggregation queries, following the exact repository pattern established by sessions.ts, exercises.ts, and other existing modules.

Purpose: Provide the complete data access layer that Phase 5 (Protein Tab UI) will consume. All protein data operations go through this module.
Output: src/db/protein.ts with all repository functions, re-exported through src/db/index.ts barrel.

## Must-Haves

- [ ] "addMeal inserts a row with correct local_date derived from loggedAt using getLocalDateString"
- [ ] "updateMeal recalculates local_date when loggedAt changes (prevents stale day assignment)"
- [ ] "deleteMeal removes the row by id"
- [ ] "getMealsByDate returns meals filtered by local_date, ordered by logged_at DESC"
- [ ] "getProteinGoal returns null when no settings row exists"
- [ ] "setProteinGoal upserts the protein_settings row (creates if absent, updates if present)"
- [ ] "getDailyProteinTotals returns aggregated protein grouped by local_date within date range"
- [ ] "getTodayProteinTotal returns SUM of protein_grams for today's local_date"
- [ ] "addMeal throws if no protein goal is set (goal-setting required before meal logging)"
- [ ] "A meal logged at 11:30 PM local time has today's local_date, not tomorrow's"

## Files

- `src/db/protein.ts`
- `src/db/index.ts`
