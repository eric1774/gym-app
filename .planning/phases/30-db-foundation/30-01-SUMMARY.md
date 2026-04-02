---
phase: 30-db-foundation
plan: 01
subsystem: database
tags: [sqlite, migrations, typescript, types, macros, calories]

requires:
  - phase: 24-ble-foundation
    provides: pattern for adding new domain types to src/types/index.ts and migrations
  - phase: 04-data-foundation
    provides: protein domain types (MealType, Meal, ProteinSettings) — macro types modeled after these

provides:
  - MacroType union type and MACRO_COLORS/CALORIES_PER_GRAM constants in src/types/index.ts
  - MacroValues, MacroMeal, MacroSettings, MacroChartPoint interfaces in src/types/index.ts
  - computeCalories pure function in src/utils/macros.ts (protein*4 + carbs*4 + fat*9)
  - Migration v10: carb_grams/fat_grams columns on meals and meal_library tables
  - Migration v10: macro_settings table with nullable goal columns, protein_goal backfilled from protein_settings
  - CREATE_MACRO_SETTINGS_TABLE constant in src/db/schema.ts

affects:
  - 30-db-foundation/30-02 (macros.ts repository will import MacroMeal, MacroSettings, MacroChartPoint)
  - 31-macros-ui (MacroMeal, MacroValues used by meal log screen)
  - 32-macros-settings (MacroSettings used by goals screen)
  - 33-macros-charts (MacroChartPoint used by chart screen)

tech-stack:
  added: []
  patterns:
    - "Macro domain types appended to src/types/index.ts after LibraryMeal, following the phase-section comment pattern"
    - "computeCalories in src/utils/macros.ts — pure function with no imports, consumers round if needed"
    - "Migration v10 uses ALTER TABLE ADD COLUMN for existing tables, CREATE TABLE IF NOT EXISTS for new table"
    - "Backfill INSERT using SELECT...FROM...LIMIT 1 pattern"
    - "Test infrastructure fix: jest.mock('react-native-sqlite-storage') before jest.mock('../database') prevents auto-mock crash"

key-files:
  created:
    - src/utils/macros.ts
    - src/utils/__tests__/macros.test.ts
  modified:
    - src/types/index.ts
    - src/db/migrations.ts
    - src/db/schema.ts
    - src/db/__tests__/migrations.test.ts

key-decisions:
  - "computeCalories takes 3 number params — no MacroValues import, no theme/db dependency, stays pure"
  - "MacroMeal is separate from frozen Meal type — parallel module approach keeps protein.ts frozen"
  - "macro_settings goal columns are REAL (nullable) — NULL means not set yet, not DEFAULT 0"
  - "Backfill protein_goal from protein_settings LIMIT 1 — only if user already had a protein goal"
  - "jest.mock('react-native-sqlite-storage') added to migrations.test.ts to fix pre-existing auto-mock crash from worktree __mocks__ collision"

patterns-established:
  - "Macro colors: Protein #8DC28A (mint), Carbs #5B9BF0 (blue), Fat #E8845C (coral) — from src/theme/colors.ts categoryColors"
  - "CALORIES_PER_GRAM record: protein=4, carbs=4, fat=9 — single source of truth for all calorie calculations"

requirements-completed: [DB-01, DB-02, DB-03]

duration: 16min
completed: 2026-04-02
---

# Phase 30 Plan 01: DB Foundation Summary

**Macro type system and DB migration v10: 7 new types/constants in src/types, computeCalories utility, carb/fat columns on meals tables, and macro_settings table with protein_goal backfill**

## Performance

- **Duration:** 16 min
- **Started:** 2026-04-02T16:18:30Z
- **Completed:** 2026-04-02T16:34:48Z
- **Tasks:** 2
- **Files modified:** 6

## Accomplishments

- Added MacroType union type, MACRO_COLORS and CALORIES_PER_GRAM constants, MacroValues/MacroMeal/MacroSettings/MacroChartPoint interfaces to src/types/index.ts
- Created computeCalories pure function (proteinGrams*4 + carbGrams*4 + fatGrams*9) in src/utils/macros.ts with 6 TDD tests passing
- Added DB migration v10: carb_grams/fat_grams columns to meals and meal_library tables (DEFAULT 0), macro_settings table with nullable goal columns, and protein_goal backfill from protein_settings
- Updated migration tests to expect 10 migrations throughout (fresh DB, partial DB, skip-latest, bootstrap, DDL SQL checks)

## Task Commits

Each task was committed atomically:

1. **Task 1: Add macro types, constants, and computeCalories utility** - `85077ba` (feat)
2. **Task 2: Add migration v10 and update migration tests** - `a2c5a1f` (feat)

## Files Created/Modified

- `src/types/index.ts` - Added MacroType, MACRO_COLORS, CALORIES_PER_GRAM, MacroValues, MacroMeal, MacroSettings, MacroChartPoint (7 additions after LibraryMeal)
- `src/utils/macros.ts` - New file: pure computeCalories function
- `src/utils/__tests__/macros.test.ts` - New file: 6 TDD tests for computeCalories
- `src/db/migrations.ts` - Added migration v10 (carb/fat columns + macro_settings table + backfill)
- `src/db/schema.ts` - Added CREATE_MACRO_SETTINGS_TABLE constant
- `src/db/__tests__/migrations.test.ts` - Updated all migration counts 9→10, added mock fix, added v10 DDL assertions

## Decisions Made

- computeCalories takes 3 number parameters (not MacroValues) to keep it completely import-free — no circular dependency risk
- MacroMeal is a separate type from Meal, consistent with the "protein.ts frozen" decision established in STATE.md
- macro_settings goal columns are REAL (nullable, no DEFAULT) — NULL means "goal not set yet", distinct from zero
- Backfill uses LIMIT 1 to avoid duplicates if protein_settings somehow has multiple rows

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed pre-existing test infrastructure crash in migrations.test.ts**
- **Found during:** Task 2 (add migration v10 and update migration tests)
- **Issue:** `jest.mock('../database')` was crashing with `TypeError: Cannot read properties of undefined (reading 'open')` because Jest's auto-mock mechanism loads the real `database.ts` module which calls `SQLite.openDatabase()` at module level — native `NativeModules.SQLite` is undefined in Jest environment. This affected the test even before my changes.
- **Fix:** Added `jest.mock('react-native-sqlite-storage')` before `jest.mock('../database')` — consistent with how `database.test.ts` already handles this. This was also made necessary by the worktree's duplicate `__mocks__` directory (`agent-a436914f/__mocks__/`) causing jest-haste-map to print warnings about duplicate manual mocks.
- **Files modified:** `src/db/__tests__/migrations.test.ts`
- **Verification:** All 6 migration tests now pass
- **Committed in:** a2c5a1f (Task 2 commit)

**2. [Rule 1 - Bug] Updated "runs migration DDL inside a transaction" test for v10**
- **Found during:** Task 2 (running migration tests after adding v10)
- **Issue:** The test set `max_version: 8` expecting only migration 9 to run (1 transaction). With v10 added, both v9 and v10 now run (2 transactions) causing `expect(transaction).toHaveBeenCalledTimes(1)` to fail.
- **Fix:** Updated the test to set `max_version: 9` (only v10 runs), updated the assertion to check for `carb_grams` instead of `UPDATE workout_sessions`.
- **Files modified:** `src/db/__tests__/migrations.test.ts`
- **Verification:** Test passes
- **Committed in:** a2c5a1f (Task 2 commit)

---

**Total deviations:** 2 auto-fixed (2 Rule 1 bugs)
**Impact on plan:** Both fixes were for test infrastructure. No scope creep. Production code changes match plan exactly.

## Issues Encountered

The test infrastructure issue (pre-existing crash on `jest.mock('../database')`) required investigation of the worktree mock collision. Root cause: when a worktree is active in `.claude/worktrees/agent-a436914f/`, its `__mocks__/` directory is scanned by jest-haste-map, printing duplicate mock warnings. While these warnings are benign for the duplicated files, the underlying auto-mock failure was a pre-existing bug unrelated to the duplicates — fixed by adding the explicit sqlite-storage mock.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- All macro types, constants, and computeCalories are exported and ready for Plan 02 (macros.ts repository)
- Migration v10 establishes carb_grams/fat_grams columns Plan 02 will query
- macro_settings table is ready for Plan 02's getSettings/saveSettings functions
- No blockers

---
*Phase: 30-db-foundation*
*Completed: 2026-04-02*
