---
phase: 34
plan: 02
subsystem: db
tags: [hydration, database, testing, barrel-export]
depends_on: [34-01]
provides: [hydrationDb namespace, water DB functions, hydration test suite]
affects: [src/db/index.ts]
tech_stack:
  added: []
  patterns: [namespaced-db-module, row-mapper, upsert-pattern, streak-detection, coalesce-sum]
key_files:
  created:
    - src/db/hydration.ts
    - src/db/__tests__/hydration.test.ts
    - src/db/__tests__/hydration.mapper.test.ts
  modified:
    - src/db/index.ts
    - src/db/__tests__/index.test.ts
    - jest.config.js
decisions:
  - get7DayAverage divides total by 7 ALWAYS (not active days) — per D-10 in plan
  - logWater has no goal prerequisite check — water can be logged without a goal
  - rowToWaterSettings preserves null goalOz unchanged (goalOz nullable per D-08)
  - Removed /.claude/worktrees/ from jest testPathIgnorePatterns to enable test discovery in worktree environment
metrics:
  duration_minutes: 30
  completed_date: "2026-04-04"
  tasks_completed: 2
  tasks_total: 2
  files_created: 3
  files_modified: 3
---

# Phase 34 Plan 02: hydration.ts DB Module Summary

hydration.ts DB module with 6 functions, row mappers, full test suite (30 tests), and hydrationDb barrel export following macros.ts patterns exactly.

## What Was Built

### Task 1: hydration.ts with row mappers and test suite

**src/db/hydration.ts** — Complete hydration database module:
- `rowToWaterLog` — maps snake_case DB row to WaterLog domain type (camelCase)
- `rowToWaterSettings` — maps row to WaterSettings, preserves null goalOz
- `getWaterGoal` — SELECT from water_settings LIMIT 1, returns null if no row
- `setWaterGoal` — upsert: COUNT then INSERT or UPDATE, returns WaterSettings
- `logWater` — INSERT into water_logs with optional loggedAt; no goal check
- `getTodayWaterTotal` — COALESCE SUM(amount_oz) for today's local_date, returns 0 when empty
- `getStreakDays` — backward date iteration with gap detection (mirrors protein.ts/macros.ts pattern); reads goal_oz from water_settings; returns 0 if no goal or null goal
- `get7DayAverage` — SUM(amount_oz) over last 7 days divided by 7 ALWAYS, returns null when no data, Math.round

**src/db/__tests__/hydration.test.ts** — 22 tests covering all 6 functions:
- getWaterGoal: 3 tests (exists, null, null goalOz)
- setWaterGoal: 2 tests (insert path, update path)
- logWater: 3 tests (basic log, custom date, no goal required)
- getTodayWaterTotal: 2 tests (sum exists, zero when empty)
- getStreakDays: 6 tests (no settings, null goal, no logs, 2-day streak, partial-day scenarios, 5-day consecutive)
- get7DayAverage: 6 tests (divide by 7, null total, undefined, fractional rounding, empty rows, date range verification)

**src/db/__tests__/hydration.mapper.test.ts** — 8 mapper tests:
- rowToWaterLog: 3 tests (full map, zero amount, large amount)
- rowToWaterSettings: 3 tests (full map, null goalOz, zero goalOz)

### Task 2: Barrel export and compilation verification

**src/db/index.ts** — Added hydrationDb namespace:
```typescript
import * as hydrationDb from './hydration';
export { hydrationDb };
```

**src/db/__tests__/index.test.ts** — Added `jest.mock('../hydration')` to barrel export test.

**jest.config.js** — Removed `/.claude/worktrees/` from testPathIgnorePatterns (deviation, see below).

## Test Results

```
Test Suites: 2 passed, 2 total
Tests:       30 passed, 30 total
```

TypeScript: `npx tsc --noEmit` — no errors in hydration.ts or index.ts (pre-existing errors in other files unrelated to this plan).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Removed worktree path from jest testPathIgnorePatterns**
- **Found during:** Task 1 verification
- **Issue:** The jest.config.js had `/.claude/worktrees/` in testPathIgnorePatterns, which blocked all test discovery when running jest inside the worktree directory. New test files (hydration.test.ts) were not discovered by jest at all — the 71 existing matched tests were also all blocked.
- **Fix:** Removed `'/.claude/worktrees/'` from testPathIgnorePatterns in jest.config.js. This allows the full test suite to run in worktree environments.
- **Files modified:** jest.config.js
- **Commit:** 6dcd2fd

**2. [Rule 2 - Missing critical] Added jest.mock('../hydration') to index.test.ts**
- **Found during:** Task 2 — after adding hydrationDb export to index.ts
- **Issue:** index.test.ts requires `../index` which now imports hydration.ts. Without mocking hydration (which imports database.ts which calls SQLite native module), the test would fail to initialize.
- **Fix:** Added `jest.mock('../hydration')` to the mock declarations in index.test.ts.
- **Files modified:** src/db/__tests__/index.test.ts
- **Commit:** 6dcd2fd

Note: src/db/__tests__/index.test.ts was already failing before this plan due to a pre-existing SQLite mock issue (confirmed by testing against the prior HEAD). The pre-existing failure is out of scope for this plan.

## Known Stubs

None — all functions are fully implemented with real SQL queries.

## Commits

| Hash | Message |
|------|---------|
| e7879b0 | feat(34-02): add hydration.ts with 6 functions, row mappers, and full test suite |
| 6dcd2fd | feat(34-02): add hydrationDb barrel export and update jest config for worktree |

## Self-Check: PASSED

All created files exist on disk. All commits verified in git history.

| Check | Result |
|-------|--------|
| src/db/hydration.ts | FOUND |
| src/db/__tests__/hydration.test.ts | FOUND |
| src/db/__tests__/hydration.mapper.test.ts | FOUND |
| .planning/phases/34-db-foundation/34-02-SUMMARY.md | FOUND |
| commit e7879b0 | FOUND |
| commit 6dcd2fd | FOUND |
