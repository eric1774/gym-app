---
phase: 37-data-foundation
plan: 01
subsystem: database
tags: [usda, sqlite, json, node, typescript, tsx, unzipper, food-database]

# Dependency graph
requires: []
provides:
  - scripts/build-usda-json.ts: TypeScript build pipeline that downloads USDA SR Legacy CSV and outputs minified JSON
  - scripts/tsconfig.json: TypeScript config for scripts directory
  - assets/usda-foods.json: Minified JSON array of 7,793 USDA SR Legacy food objects with full macro data
affects:
  - 37-02: migration v12 reads assets/usda-foods.json for bulk seeding

# Tech tracking
tech-stack:
  added:
    - tsx (devDependency) — TypeScript execution for build scripts
    - unzipper (devDependency) — ZIP extraction for USDA dataset
    - "@types/unzipper" (devDependency) — TypeScript types for unzipper
  patterns:
    - Build-time data pipeline: download -> cache -> extract -> parse -> filter -> output JSON
    - Idempotent script: ZIP download skipped if cached, extraction skipped if already extracted
    - CSV parser: custom quoted-field aware line parser (no external csv-parse dependency)
    - USDA nutrient IDs: Protein=1003, Carbs=1005, Fat=1004

key-files:
  created:
    - scripts/build-usda-json.ts
    - scripts/tsconfig.json
    - assets/usda-foods.json
  modified:
    - .gitignore (added scripts/.cache/)
    - package.json (added tsx, unzipper, @types/unzipper devDependencies)
    - package-lock.json

key-decisions:
  - "Custom CSV parser instead of csv-parse dependency — avoids extra dep, USDA CSVs are well-structured"
  - "Idempotent extraction cache check — hasCachedExtraction() checks both top-level and subdirectory layout"
  - "Round macro values to 2 decimal places — consistent precision without unnecessary digits"
  - "All 7,793 SR Legacy foods have complete macro data — skippedIncomplete=0, no filtering needed"

patterns-established:
  - "Build scripts live in scripts/ at project root, separate from app source"
  - "USDA nutrient IDs: Protein=1003, Carbs=1005, Fat=1004 (SR Legacy constants)"
  - "UsdaFoodRow interface: fdc_id, name, category, protein_per_100g, carbs_per_100g, fat_per_100g"

requirements-completed:
  - DATA-01

# Metrics
duration: 15min
completed: 2026-04-08
---

# Phase 37 Plan 01: Data Foundation — USDA Build Pipeline Summary

**Node.js/TypeScript pipeline downloads USDA SR Legacy CSVs, parses 644K nutrient rows, and outputs 7,793 foods as a 1.35MB minified JSON asset ready for migration v12 bulk seeding**

## Performance

- **Duration:** ~15 min
- **Started:** 2026-04-08T13:37:00Z
- **Completed:** 2026-04-08T13:52:57Z
- **Tasks:** 1 of 1
- **Files modified:** 6

## Accomplishments

- Build script downloads USDA SR Legacy ZIP (5.8MB) from `fdc.nal.usda.gov` over HTTPS and caches locally in `scripts/.cache/` (excluded from git via .gitignore)
- Parses three CSV files: `food.csv` (7,793 rows), `food_category.csv` (28 rows), `food_nutrient.csv` (644,125 rows) — joins them into a flat array with complete macro data
- Outputs `assets/usda-foods.json`: 7,793 foods, 1.35MB minified, all with `fdc_id`, `name`, `category`, `protein_per_100g`, `carbs_per_100g`, `fat_per_100g` — zero foods skipped for missing nutrients
- Script is idempotent: skips download if ZIP is cached, skips extraction if CSVs already present

## Task Commits

Each task was committed atomically:

1. **Task 1: Create USDA build pipeline script** - `4797001` (feat)

## Files Created/Modified

- `scripts/build-usda-json.ts` — USDA CSV downloader, parser, filter, and JSON writer (~270 lines)
- `scripts/tsconfig.json` — TypeScript config for scripts directory (ES2020, commonjs, strict)
- `assets/usda-foods.json` — Generated: 7,793 USDA food objects, 1.35MB minified JSON array
- `.gitignore` — Added `scripts/.cache/` entry (threat mitigation T-37-03)
- `package.json` — Added `tsx`, `unzipper`, `@types/unzipper` as devDependencies
- `package-lock.json` — Updated after devDependency installs

## Decisions Made

- Used custom CSV parser instead of adding `csv-parse` dependency — the USDA CSVs are well-structured and the custom parser handles all edge cases (quoted fields, embedded commas, escaped quotes) cleanly
- Added `hasCachedExtraction()` helper that checks both top-level and one-level-deep subdirectory layout — the USDA ZIP extracts into a subdirectory, so the naive check would fail
- Macro values rounded to 2 decimal places — balances precision with file size

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Fixed idempotency for ZIP extraction subdirectory layout**
- **Found during:** Task 1 (second run verification)
- **Issue:** `extractZip()` checked for `food.csv` at `CACHE_EXTRACTED/food.csv` but the ZIP extracts into `CACHE_EXTRACTED/FoodData_Central_sr_legacy.../food.csv` (subdirectory). The extraction was re-running every time despite cached files existing.
- **Fix:** Added `hasCachedExtraction()` helper that searches both top-level and one level deep for `food.csv`
- **Files modified:** `scripts/build-usda-json.ts`
- **Verification:** Second run output shows "Using cached extracted files." — no re-extraction
- **Committed in:** `4797001` (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Minor correctness fix for idempotency. No scope change.

## Issues Encountered

None beyond the idempotency fix above.

## User Setup Required

None — no external service configuration required. The `scripts/.cache/` directory is created automatically on first run.

## Next Phase Readiness

- `assets/usda-foods.json` is ready to be `require()`-imported by migration v12 (Plan 02)
- JSON array shape matches the `UsdaFoodRow` interface exactly: `fdc_id`, `name`, `category`, `protein_per_100g`, `carbs_per_100g`, `fat_per_100g`
- All 7,793 SR Legacy foods have complete macro data — Plan 02 can bulk-insert without additional filtering
- Script can be re-run at any time to regenerate the asset (idempotent, uses local cache)

---
*Phase: 37-data-foundation*
*Completed: 2026-04-08*
