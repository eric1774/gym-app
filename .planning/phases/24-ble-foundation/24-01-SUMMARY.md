---
phase: 24-ble-foundation
plan: 01
subsystem: ble
tags: [react-native-ble-plx, async-storage, bluetooth, android, permissions, typescript]

# Dependency graph
requires:
  - phase: 23-export-ui-file-delivery
    provides: prior milestone complete; no direct code dependencies for this phase

provides:
  - react-native-ble-plx and @react-native-async-storage/async-storage installed as production dependencies
  - Android BLE permission declarations in AndroidManifest.xml (BLUETOOTH_SCAN, BLUETOOTH_CONNECT, ACCESS_FINE_LOCATION, BLUETOOTH)
  - Module-level BleManager singleton exported from src/services/BLEHeartRateService.ts
  - BLE permission request/check/settings functions in src/services/BLEPermissions.ts
  - HR domain types (HRSample, HRSettings, HRZoneThresholds, DeviceConnectionState, HRZoneNumber, HRZoneInfo, HR_ZONES) in src/types/index.ts
  - Jest mock for react-native-ble-plx in __mocks__/react-native-ble-plx.js
  - AsyncStorage mock registered in jest.setup.js

affects: [25-ble-connection, 26-hr-context, 27-hr-display, any phase using BLE scanning/HR data]

# Tech tracking
tech-stack:
  added: [react-native-ble-plx@3.5.1, @react-native-async-storage/async-storage@3.0.1]
  patterns:
    - Module-level BleManager singleton pattern (D-09) — never instantiated in component/hook
    - Android 12+ vs older permission branching via Platform.Version >= 31
    - Lazy permission request — only when user initiates BLE action
    - __mocks__ directory manual mock pattern (same as react-native-svg.js)

key-files:
  created:
    - src/services/BLEHeartRateService.ts
    - src/services/BLEPermissions.ts
    - __mocks__/react-native-ble-plx.js
  modified:
    - package.json
    - package-lock.json
    - android/app/src/main/AndroidManifest.xml
    - src/types/index.ts
    - jest.setup.js

key-decisions:
  - "BleManager instantiated at module level in BLEHeartRateService.ts — not inside component/hook — prevents native memory leaks (D-09)"
  - "BLE permissions requested lazily — only on first scan/connect attempt — users without HR monitor see no dialogs (D-01)"
  - "Android 12+ (API 31+) uses BLUETOOTH_SCAN + BLUETOOTH_CONNECT; Android 11 and below uses ACCESS_FINE_LOCATION (D-02)"
  - "Permission denial returns 'blocked' on NEVER_ASK_AGAIN, enabling openAppSettings() fallback path (D-03, D-05)"
  - "AsyncStorage chosen over SQLite for HR settings (age, maxHrOverride, pairedDeviceId) — three scalar preferences, never joined relationally (D-12)"
  - "Tanaka formula zones (50/60/70/80/90% of maxHr) defined as HR_ZONES constant, 5-zone model (D-11)"

patterns-established:
  - "BLE singleton: import bleManager from BLEHeartRateService — never new BleManager() elsewhere"
  - "Permission branching: check Platform.Version >= 31 for Android 12+ BLE permission set"
  - "BLE mock: __mocks__/react-native-ble-plx.js mirrors __mocks__/react-native-svg.js convention"

requirements-completed: [BLE-04]

# Metrics
duration: 8min
completed: 2026-03-24
---

# Phase 24 Plan 01: BLE Foundation Summary

**react-native-ble-plx singleton wired with Android permissions, HR types, and Jest mock — BLE infrastructure ready for scan/connect phases**

## Performance

- **Duration:** 8 min
- **Started:** 2026-03-24T20:35:40Z
- **Completed:** 2026-03-24T20:44:07Z
- **Tasks:** 2
- **Files modified:** 7

## Accomplishments
- Installed react-native-ble-plx and @react-native-async-storage/async-storage as production dependencies
- Added all 4 BLE Android permissions to AndroidManifest.xml with correct flags (neverForLocation on BLUETOOTH_SCAN, maxSdkVersion=30 on BLUETOOTH)
- Created module-level BleManager singleton and standard BLE UUIDs for HR service/measurement characteristic
- Built BLEPermissions module with Android 12+ vs older API-level branching, returning 'granted'/'denied'/'blocked' states
- Defined complete HR domain type set: HRSample, DeviceConnectionState, HRSettings, HRZoneThresholds, HRZoneNumber, HRZoneInfo, HR_ZONES
- Created __mocks__/react-native-ble-plx.js manual mock matching existing mock conventions
- Added AsyncStorage mock to jest.setup.js for future HR settings tests

## Task Commits

Each task was committed atomically:

1. **Task 1: Install dependencies, declare Android BLE permissions, and create Jest mock** - `86b49f4` (feat)
2. **Task 2: Define HR types and create BleManager singleton + BLE permissions module** - `b189b37` (feat)

**Plan metadata:** (final commit hash - see below)

## Files Created/Modified
- `src/services/BLEHeartRateService.ts` - Module-level BleManager singleton, HR_SERVICE_UUID, HR_MEASUREMENT_CHAR_UUID
- `src/services/BLEPermissions.ts` - checkBLEPermissions, requestBLEPermissions, openAppSettings with Android version branching
- `__mocks__/react-native-ble-plx.js` - Jest manual mock for BleManager class, State enum, BleError, BleErrorCode
- `src/types/index.ts` - HR domain types appended (HRSample, DeviceConnectionState, HRSettings, HRZoneThresholds, HRZoneNumber, HRZoneInfo, HR_ZONES)
- `android/app/src/main/AndroidManifest.xml` - 4 BLE permission declarations added before application tag
- `jest.setup.js` - AsyncStorage mock registered for HR settings tests
- `package.json` - 2 new production dependencies added

## Decisions Made
- BleManager is a module-level constant — importing bleManager from BLEHeartRateService guarantees single instance across the app (D-09)
- Permission request is lazy — only called when user initiates BLE scan, so non-HR users never see a dialog (D-01)
- Distinct permission sets for Android 12+ vs older: BLUETOOTH_SCAN + BLUETOOTH_CONNECT on API 31+; ACCESS_FINE_LOCATION on API 30 and below (D-02)
- 'blocked' state returned on NEVER_ASK_AGAIN to enable the "open Android settings" fallback path (D-03, D-05)

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
- Tests could not be run directly in this worktree because the worktree path matches the `testPathIgnorePatterns` (`/.claude/worktrees/`) in jest.config.js. TypeScript type-check on service files confirms no errors in newly created code. The orchestrator will validate the full test suite after all agents complete.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- BLE infrastructure complete: bleManager singleton, permission request flow, HR types, Jest mocks all ready
- Phase 25 can import bleManager from BLEHeartRateService.ts and call requestBLEPermissions() before scanning
- Phase 26 can define HeartRateContext using the HRSettings and DeviceConnectionState types
- The __mocks__/react-native-ble-plx.js mock ensures future BLE service tests will work without native Android BLE APIs

## Self-Check: PASSED

All files present and all commits verified:
- FOUND: src/services/BLEHeartRateService.ts
- FOUND: src/services/BLEPermissions.ts
- FOUND: __mocks__/react-native-ble-plx.js
- FOUND: .planning/phases/24-ble-foundation/24-01-SUMMARY.md
- FOUND commit: 86b49f4 (Task 1)
- FOUND commit: b189b37 (Task 2)

---
*Phase: 24-ble-foundation*
*Completed: 2026-03-24*
