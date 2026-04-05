# Phase 34: DB Foundation - Context

**Gathered:** 2026-04-04
**Status:** Ready for planning

<domain>
## Phase Boundary

The app stores water logs and water settings in SQLite with a complete hydration.ts module that all UI phases can call. No UI work — pure data layer.

</domain>

<decisions>
## Implementation Decisions

### Module Export Pattern
- **D-01:** Namespace export — `import * as hydrationDb from './hydration'; export { hydrationDb };` in `src/db/index.ts`, consistent with the `macrosDb` pattern from Phase 30
- **D-02:** Avoids name collision with existing `getStreakDays` and `get7DayAverage` exports from `protein.ts`

### Table Schema: water_logs
- **D-03:** Columns: `id` (INTEGER PK AUTOINCREMENT), `amount_oz` (INTEGER NOT NULL), `logged_at` (TEXT NOT NULL), `local_date` (TEXT NOT NULL), `created_at` (TEXT NOT NULL)
- **D-04:** No description/label column — water is water, no need for text metadata
- **D-05:** INTEGER for amount_oz — all quick-add buttons are whole numbers (8, 16, 24), modal entry in whole oz

### Table Schema: water_settings
- **D-06:** Columns: `id` (INTEGER PK AUTOINCREMENT), `goal_oz` (INTEGER), `created_at` (TEXT NOT NULL), `updated_at` (TEXT NOT NULL)
- **D-07:** Just goal_oz — no unit preference column (metric units are explicitly out of scope for v1.8)
- **D-08:** goal_oz is nullable — null means "no goal set yet" (triggers first-use prompt in Phase 36)

### Streak & Average Semantics
- **D-09:** `get7DayAverage` returns raw oz average (number | null), not percentage — UI computes percentage from goal. Parallels macros `get7DayAverage` which returns raw grams
- **D-10:** `get7DayAverage` counts zero-logged days in the average (divides by 7, not by active days) — a missed day drags the average down. This differs from macros which only averages active days
- **D-11:** `getStreakDays` counts consecutive calendar days where total logged oz >= goal_oz, counting backwards from today. Same gap-detection logic as macros streak

### Claude's Discretion
- Row mapper function naming and structure (follow macros.ts conventions)
- Exact SQL query structure for aggregations
- Test fixture design for hydration functions

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Database layer
- `src/db/macros.ts` — Reference implementation for hydration.ts structure (row mappers, CRUD, goals, totals, streak, average)
- `src/db/migrations.ts` — Migration system; v11 will be appended to MIGRATIONS array
- `src/db/index.ts` — Barrel exports; namespace pattern for hydrationDb
- `src/db/database.ts` — db singleton and executeSql helper used by all DB modules

### Requirements
- `.planning/REQUIREMENTS.md` — DB-01 (migration v11), DB-02 (hydration.ts exports)

### Types
- `src/types/` — Where hydration types (WaterLog, WaterSettings) should be defined

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/db/macros.ts`: Direct template for hydration.ts — same pattern of row mappers, CRUD functions, settings upsert, daily totals, streak, and 7-day average
- `src/db/migrations.ts`: Migration system with `runMigrations()` — append version 11 entry
- `src/utils/dates.ts`: `getLocalDateString()` and `getLocalDateTimeString()` used by all DB modules for consistent date handling
- `src/db/database.ts`: `db` singleton promise, `executeSql` helper, `runTransaction`

### Established Patterns
- Row mapper functions (`rowToX`) convert raw SQLite rows to typed domain objects
- `executeSql` wrapper handles the db promise and returns typed results
- Settings tables use upsert pattern (check count, INSERT or UPDATE)
- Streak uses backward date iteration with gap detection
- `getLocalDateString()` for local_date column consistency

### Integration Points
- `src/db/index.ts` barrel — add `hydrationDb` namespace export
- `src/types/index.ts` — add WaterLog and WaterSettings type exports
- Migration v11 appended to MIGRATIONS array in migrations.ts

</code_context>

<specifics>
## Specific Ideas

No specific requirements — follow the established macros.ts pattern closely. The 6 required functions map directly to macros equivalents:
- `getWaterGoal` ~ `getMacroGoals`
- `setWaterGoal` ~ `setMacroGoals`
- `logWater` ~ `addMeal` (but simpler — no description, no meal type)
- `getTodayWaterTotal` ~ `getTodayMacroTotals` (but returns single number, not object)
- `getStreakDays` ~ `getStreakDays` (reads goal from water_settings instead of macro_settings)
- `get7DayAverage` ~ `get7DayAverage` (but divides by 7 always, not just active days)

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 34-db-foundation*
*Context gathered: 2026-04-04*
