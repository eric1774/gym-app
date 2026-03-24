---
gsd_state_version: 1.0
milestone: v1.6
milestone_name: Heart Rate Monitoring
status: Ready to plan
stopped_at: Completed 24-ble-foundation/24-01-PLAN.md
last_updated: "2026-03-24T21:06:23.875Z"
progress:
  total_phases: 4
  completed_phases: 1
  total_plans: 2
  completed_plans: 2
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-03-23)

**Core value:** Fast, frictionless set logging mid-workout
**Current focus:** Phase 24 — ble-foundation

## Current Position

Phase: 25
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

### Pending Todos

None.

### Blockers/Concerns

- Phase 25 requires physical Garmin Forerunner 245 testing — Garmin Connect conflict (GATT_ERROR 133) behavior on the specific device has not been verified; consider /gsd:research-phase if unexpected behavior encountered
- react-native-ble-plx v3.5.1 on RN 0.84.1: validate with minimal BLE scan on device in Phase 24 before full implementation proceeds

## Session Continuity

Last session: 2026-03-24T20:46:58.182Z
Stopped at: Completed 24-ble-foundation/24-01-PLAN.md
Resume file: None
Next step: /gsd:plan-phase 24
