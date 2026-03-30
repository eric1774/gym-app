---
phase: 25-connection-management
plan: 01
subsystem: ui
tags: [ble, heart-rate, react-native, react-context, bluetooth]

# Dependency graph
requires:
  - phase: 24-ble-foundation
    provides: BLEHeartRateService singleton, BLEPermissions, HRSettingsService, DeviceConnectionState type

provides:
  - HeartRateContext (HeartRateProvider + useHeartRate hook) — BLE state machine with scan/connect/disconnect/auto-reconnect
  - SignalBars component — 3-bar RSSI visualization
  - DeviceListRow component — tappable scan result row
  - HRConnectionIndicator component — colored dot + label for all 5 DeviceConnectionState values
  - App.tsx updated with HeartRateProvider wrapping the app tree

affects: [25-connection-management/25-02, 25-connection-management/25-03, 26-hr-data-persistence, 27-live-display-settings-ui]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "createContext<T | null>(null) pattern with null-check hook"
    - "useRef for timers and subscriptions to avoid stale closures in BLE callbacks"
    - "exponential backoff reconnect: Math.pow(2, attempt) * 1000ms, max 5 attempts"
    - "Pure base64 decoder (decodeBase64Bytes) avoids browser/Node globals"

key-files:
  created:
    - src/context/HeartRateContext.tsx
    - src/components/SignalBars.tsx
    - src/components/DeviceListRow.tsx
    - src/components/HRConnectionIndicator.tsx
  modified:
    - App.tsx

key-decisions:
  - "Pure base64 decoder implementation to avoid atob/Buffer global issues in React Native TypeScript"
  - "HeartRateProvider placed inside SessionProvider and outside TimerProvider in App.tsx"
  - "setupDisconnectHandling extracted as useCallback to allow recursive reconnect loop without closure issues"
  - "deviceStateRef used alongside deviceState useState to allow stopScan to correctly detect scanning state from within callbacks"

patterns-established:
  - "BLE subscription cleanup: always call .remove() on hrSubscriptionRef and disconnectSubscriptionRef in cleanup effects"
  - "Reconnect guard: reconnectAttemptRef.current < MAX_RECONNECT_ATTEMPTS before scheduling next attempt"
  - "Silent auto-reconnect: attemptAutoReconnect sets disconnected on failure without showing any error UI"

requirements-completed: [BLE-01, BLE-02, BLE-03, HR-04]

# Metrics
duration: 7min
completed: 2026-03-25
---

# Phase 25 Plan 01: Connection Management Summary

**HeartRateContext BLE state machine with scan/connect/exponential-backoff reconnect plus three presentation components (SignalBars, DeviceListRow, HRConnectionIndicator) wired via HeartRateProvider in App.tsx**

## Performance

- **Duration:** ~7 min
- **Started:** 2026-03-25T19:23:49Z
- **Completed:** 2026-03-25T19:31:08Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments

- HeartRateContext implements full BLE state machine: 15-second scan (HR_SERVICE_UUID filtered), 10-second connect, HR characteristic monitoring, exponential backoff reconnect (1/2/4/8/16s max 5 attempts), silent auto-reconnect, and manual disconnect
- Three presentation components cover all downstream UI needs for Plans 02 and 03
- HeartRateProvider wired into App.tsx provider tree, making BLE state available app-wide

## Task Commits

Each task was committed atomically:

1. **Task 1: HeartRateContext + App.tsx** - `5c3a71d` (feat)
2. **Task 2: SignalBars, DeviceListRow, HRConnectionIndicator** - `607656f` (feat)

## Files Created/Modified

- `src/context/HeartRateContext.tsx` — BLE state machine context provider (HeartRateProvider + useHeartRate) with scan, connect, reconnect, disconnect, auto-reconnect
- `src/components/SignalBars.tsx` — 3-bar RSSI visualization with -60/-80 dBm thresholds, mint/border colors
- `src/components/DeviceListRow.tsx` — 52px tappable row with device name, signal bars, connecting spinner or chevron
- `src/components/HRConnectionIndicator.tsx` — 8px colored dot + state label for all 5 DeviceConnectionState values
- `App.tsx` — Added HeartRateProvider wrapping (SessionProvider > HeartRateProvider > TimerProvider)

## Decisions Made

- **Pure base64 decoder:** TypeScript config for React Native doesn't expose `atob` or `Buffer` as globals — implemented `decodeBase64Bytes()` as a pure function using the BASE64_CHARS lookup table. This is type-safe and environment-agnostic.
- **HeartRateProvider placement in App.tsx:** Inside SessionProvider (may need session context in Phase 26), outside TimerProvider (no timer dependency).
- **deviceStateRef alongside deviceState:** The `stopScan` callback needs to read current state but is captured in closures — a ref that mirrors the state value allows the callback to check whether it's actually in scanning state before setting disconnected.
- **setupDisconnectHandling as useCallback:** Extracted to allow the recursive reconnect loop to call it on successful reconnect without creating a circular dependency.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Replaced atob/Buffer with pure base64 decoder**
- **Found during:** Task 1 (HeartRateContext implementation)
- **Issue:** TypeScript tsc reported `Cannot find name 'atob'` and `Cannot find name 'Buffer'` — both globals unavailable in the React Native tsconfig.
- **Fix:** Implemented `decodeBase64Bytes()` as a pure function using BASE64_CHARS string lookup — no browser/Node globals required. Functionally identical for BLE HR measurement parsing.
- **Files modified:** src/context/HeartRateContext.tsx
- **Verification:** `npx tsc --noEmit` passes with zero errors on HeartRateContext.tsx
- **Committed in:** 5c3a71d (Task 1 commit)

**2. [Rule 1 - Bug] Fixed NodeJS.Timeout type to use ReturnType<typeof setTimeout>**
- **Found during:** Task 1 (HeartRateContext implementation)
- **Issue:** TypeScript reported `Cannot find namespace 'NodeJS'` for timer refs.
- **Fix:** Changed `NodeJS.Timeout` to `ReturnType<typeof setInterval>` / `ReturnType<typeof setTimeout>` — idiomatic TypeScript approach that works without @types/node.
- **Files modified:** src/context/HeartRateContext.tsx
- **Verification:** `npx tsc --noEmit` passes
- **Committed in:** 5c3a71d (Task 1 commit)

---

**Total deviations:** 2 auto-fixed (2 bugs)
**Impact on plan:** Both fixes were type-safety corrections required for TypeScript compilation. No behavior change, no scope creep.

## Issues Encountered

- Initial merge from main was required to bring phase 24 BLE services (BLEHeartRateService, BLEPermissions, HRSettingsService) into the worktree. The worktree was behind main by commits b50c0b9 through the phase 24 completion. Merge fast-forwarded cleanly.

## Next Phase Readiness

- Plan 02 (DeviceScanSheet + SettingsScreen HR card) can now consume `useHeartRate()` for scan/connect flows
- Plan 03 (WorkoutScreen indicator + auto-reconnect) can consume `useHeartRate()` for BPM display and connection state
- All five DeviceConnectionState values are handled by HRConnectionIndicator — ready for use in any UI screen

---
*Phase: 25-connection-management*
*Completed: 2026-03-25*
