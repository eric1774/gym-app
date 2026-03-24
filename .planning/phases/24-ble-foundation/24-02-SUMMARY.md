---
phase: 24-ble-foundation
plan: "02"
subsystem: db-migrations, hr-settings-service
tags: [migration, async-storage, hr-settings, tdd, tanaka-formula]
dependency_graph:
  requires: []
  provides:
    - migration-v8
    - HRSettingsService
    - HRSettings-type
    - CREATE_HEART_RATE_SAMPLES_TABLE
  affects:
    - src/db/migrations.ts
    - src/db/schema.ts
    - src/types/index.ts
    - src/services/HRSettingsService.ts
tech_stack:
  added:
    - "@react-native-async-storage/async-storage"
  patterns:
    - TDD (RED-GREEN) for HRSettingsService
    - Migration interface pattern (version/description/up)
    - DDL constant pattern from schema.ts
key_files:
  created:
    - src/services/HRSettingsService.ts
    - src/services/__tests__/HRSettingsService.test.ts
  modified:
    - src/db/migrations.ts
    - src/db/schema.ts
    - src/types/index.ts
    - jest.setup.js
    - package.json
decisions:
  - AsyncStorage keys are prefixed hr_settings_ for namespace clarity
  - HRSettings type placed in src/types/index.ts under Heart Rate domain types header
  - Tanaka formula (208 - 0.7 * age) used per D-11 for max HR computation
  - @react-native-async-storage/async-storage added to dependencies (needed for Plan 01 and 02)
metrics:
  duration: "8 minutes"
  completed: "2026-03-24"
  tasks_completed: 2
  files_created: 2
  files_modified: 5
---

# Phase 24 Plan 02: BLE Foundation DB Migration and HR Settings Service Summary

**One-liner:** DB migration v8 adds heart_rate_samples table with session FK and index, plus avg_hr/peak_hr columns; HRSettingsService provides AsyncStorage CRUD for age/maxHrOverride/pairedDeviceId with Tanaka formula max HR computation.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Add DB migration v8 for heart_rate_samples | 22141e3 | src/db/migrations.ts, src/db/schema.ts |
| 2 | Create HRSettingsService (TDD RED) | ca236c7 | jest.setup.js, src/types/index.ts, src/services/__tests__/HRSettingsService.test.ts, package.json |
| 2 | Create HRSettingsService (TDD GREEN) | d9ee0d7 | src/services/HRSettingsService.ts |

## What Was Built

### Task 1: DB Migration v8

Added migration v8 to `src/db/migrations.ts` following the established Migration interface pattern. The migration:
- Creates `heart_rate_samples` table with `id`, `session_id` (FK to workout_sessions ON DELETE CASCADE), `bpm`, `recorded_at` columns
- Creates `idx_hr_samples_session` index on `session_id` for efficient batch queries
- Adds `avg_hr REAL` column to `workout_sessions`
- Adds `peak_hr INTEGER` column to `workout_sessions`

Added `CREATE_HEART_RATE_SAMPLES_TABLE` DDL constant to `src/db/schema.ts` as the canonical reference for the table shape.

### Task 2: HRSettingsService

Created `src/services/HRSettingsService.ts` with 6 exported async functions:
- `getHRSettings()` — reads all three settings via `Promise.all` for parallel AsyncStorage reads
- `setAge(age)` — stores age as string under `hr_settings_age`
- `setMaxHrOverride(maxHr)` — stores or removes override under `hr_settings_max_hr_override`
- `setPairedDeviceId(deviceId)` — stores BLE device ID under `hr_settings_paired_device_id`
- `clearPairedDevice()` — removes the paired device ID
- `getComputedMaxHR()` — applies Tanaka formula (208 - 0.7 * age) or user override; returns null if age not set

Added `HRSettings` interface to `src/types/index.ts` with `age`, `maxHrOverride`, and `pairedDeviceId` fields.

## Test Results

All 10 HRSettingsService tests pass:
- `getHRSettings` returns nulls when AsyncStorage empty
- `getHRSettings` returns correct values after setAge/setPairedDeviceId
- `setAge` stores string under correct key
- `setMaxHrOverride` stores or removes based on null/non-null
- `setPairedDeviceId` stores under correct key
- `clearPairedDevice` removes the key
- `getComputedMaxHR` returns 183.5 for age=35 (Tanaka: 208 - 0.7*35)
- `getComputedMaxHR` returns override value when set
- `getComputedMaxHR` returns null when age not set

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Added HRSettings type to src/types/index.ts**
- **Found during:** Task 2 (TDD RED)
- **Issue:** HRSettingsService.ts imports `HRSettings` from `../types` but the type didn't exist, which would cause TypeScript compilation failure
- **Fix:** Added `HRSettings` interface to `src/types/index.ts` under `// -- Heart Rate domain types (Phase 24) --` header
- **Files modified:** src/types/index.ts
- **Commit:** ca236c7

**2. [Rule 3 - Blocking] Installed @react-native-async-storage/async-storage dependency**
- **Found during:** Task 2 (TDD RED)
- **Issue:** Package not in package.json; jest.setup.js mock and HRSettingsService.ts both depend on it; tests failed with "Cannot find module" error
- **Fix:** Added package via `npm install --save @react-native-async-storage/async-storage`
- **Files modified:** package.json, package-lock.json
- **Commit:** ca236c7

**Note:** Plan 01 (running concurrently) also installs this package and adds the AsyncStorage mock. The orchestrator will handle merging these parallel changes.

## Known Stubs

None - all exports are fully implemented and tested.

## Self-Check: PASSED

- [x] src/db/migrations.ts contains `version: 8` - verified
- [x] src/db/schema.ts exports `CREATE_HEART_RATE_SAMPLES_TABLE` - verified
- [x] src/services/HRSettingsService.ts exports all 6 functions - verified
- [x] src/services/__tests__/HRSettingsService.test.ts - 10 tests pass
- [x] Commits 22141e3, ca236c7, d9ee0d7 verified in git log
