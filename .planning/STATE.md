---
gsd_state_version: 1.0
milestone: v1.6
milestone_name: Heart Rate Monitoring
status: Ready to plan
stopped_at: Completed 25-connection-management/25-02-PLAN.md
last_updated: "2026-03-25T20:04:17.867Z"
progress:
  total_phases: 4
  completed_phases: 2
  total_plans: 5
  completed_plans: 5
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-03-23)

**Core value:** Fast, frictionless set logging mid-workout
**Current focus:** Phase 25 — connection-management

## Current Position

Phase: 26
Plan: Not started

## Performance Metrics

**Velocity:**

- Total plans completed: 0 (v1.6)
- Average duration: —
- Total execution time: —

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| — | — | — | — |

*Updated after each plan completion*
| Phase 24-ble-foundation P02 | 8 | 2 tasks | 7 files |
| Phase 24-ble-foundation P01 | 8 | 2 tasks | 7 files |
| Phase 25-connection-management P01 | 7 | 2 tasks | 5 files |
| Phase 25-connection-management P03 | 8 | 1 tasks | 1 files |
| Phase 25-connection-management P02 | 15 | 2 tasks | 2 files |

## Accumulated Context

### Decisions

- BleManager must be a module-level singleton in BLEHeartRateService.ts — never instantiated inside a component or hook (prevents native memory leaks)
- HR samples buffer in a useRef during workout; batch-flushed to SQLite in one transaction on session end (protects set-logging speed)
- Zone computation uses Tanaka formula (208 − 0.7×age), not 220-age (more accurate for adults over 40)
- Age, maxHrOverride, and pairedDeviceId stored in AsyncStorage (not SQLite — three scalar preferences, never joined relationally)
- HeartRateContext mirrors TimerContext pattern — proven architecture for BLE-to-React bridge
- Reconnect uses exponential backoff (1/2/4/8/16s, max 5 attempts) triggered by onDeviceDisconnected
- [Phase 24-ble-foundation]: AsyncStorage keys are prefixed hr_settings_ for namespace clarity
- [Phase 24-ble-foundation]: Tanaka formula (208 - 0.7 * age) used per D-11 for max HR computation
- [Phase 24-ble-foundation]: @react-native-async-storage/async-storage added to dependencies for HR settings AsyncStorage access
- [Phase 24-ble-foundation]: BleManager instantiated at module level in BLEHeartRateService.ts — not inside component/hook — prevents native memory leaks (D-09)
- [Phase 24-ble-foundation]: Android 12+ (API 31+) uses BLUETOOTH_SCAN + BLUETOOTH_CONNECT; Android 11 and below uses ACCESS_FINE_LOCATION (D-02)
- [Phase 24-ble-foundation]: AsyncStorage chosen over SQLite for HR settings (age, maxHrOverride, pairedDeviceId) — three scalar preferences, never joined relationally (D-12)
- [Phase 25-connection-management]: Pure base64 decoder (decodeBase64Bytes) used instead of atob/Buffer to avoid React Native TypeScript global issues
- [Phase 25-connection-management]: HeartRateProvider placed inside SessionProvider and outside TimerProvider in App.tsx provider tree
- [Phase 25-connection-management]: deviceStateRef mirrors deviceState to allow stopScan callback to read current BLE state from within async closures
- [Phase 25-connection-management]: prevDeviceStateRef pattern for detecting connected->disconnected transitions in useEffect without extra state
- [Phase 25-connection-management]: HR UI in WorkoutScreen gated by hasPairedDevice (D-07) — zero change for users without paired device
- [Phase 25-connection-management]: DeviceScanSheet resets all local state on close to prevent stale UI on re-open; loadHRSettings refreshed after scan sheet closes to pick up newly-paired device

### Pending Todos

None.

### Blockers/Concerns

- Phase 25 requires physical Garmin Forerunner 245 testing — Garmin Connect conflict (GATT_ERROR 133) behavior on the specific device has not been verified; consider /gsd:research-phase if unexpected behavior encountered
- react-native-ble-plx v3.5.1 on RN 0.84.1: validate with minimal BLE scan on device in Phase 24 before full implementation proceeds

## Session Continuity

Last session: 2026-03-25T19:54:53.013Z
Stopped at: Completed 25-connection-management/25-02-PLAN.md
Resume file: None
Next step: /gsd:plan-phase 24
