# Milestones

## v1.6 Heart Rate Monitoring (Shipped: 2026-03-30)

**Phases:** 24-29 (6 phases, 14 plans) | **Files:** 78 changed | **Lines:** +7,942
**Timeline:** 2026-03-24 → 2026-03-30 (7 days)
**Requirements:** 15/15 satisfied (BLE-01–05, HR-01–04, SET-01–02, DATA-01–04)

**Delivered:** Live Garmin heart rate display during workouts via BLE, with 5-zone color-coded BPM, configurable HR settings, session HR persistence, and post-workout HR stats on summary and calendar.

**Key accomplishments:**

- BLE foundation with Android permissions, singleton BleManager, DB migration v8, and HRSettingsService (AsyncStorage CRUD)
- Full device connection pipeline: scan, connect, paired device persistence, auto-reconnect with exponential backoff, connection state indicator
- HR data persistence: in-session sample buffering in useRef, single-transaction batch flush on session end, avg/peak HR aggregates
- Live BPM display in two-row workout header with 5-zone color coding (Zone 1-5) and zone labels
- Settings screen HR configuration: age input with Tanaka formula, max HR override, device pairing and unpair with BLE disconnect
- Bug fix pass: unpair disconnect, below-zone BPM neutral rendering, dead code removal (HRSample type, getComputedMaxHR)

---

## v1.5 Program Data Export (Shipped: 2026-03-22)

**Phases completed:** 2 phases, 2 plans, 5 tasks

**Key accomplishments:**

- SQLite-backed exportProgramData function assembling completed workout data into a hierarchical ProgramExport JSON (weeks > days > exercises > sets) with distinct-pair completion percentage calculation
- Three-dot menu on program cards with Export (share dialog, ProgramName_YYYY-MM-DD.json) and Delete, plus mint-green ExportToast for success/error feedback

---

## v1.4 Test Coverage (Shipped: 2026-03-17)

**Phases:** 15-21 (7 phases, 14 plans) | **Commits:** 37 | **Lines:** +12,819
**Timeline:** 2026-03-15 → 2026-03-16 (2 days)
**Git range:** feat(15-01) → feat(21-01)

**Delivered:** Comprehensive Jest test suite achieving 82.26% global line coverage across the entire React Native codebase, with coverage threshold enforcement and lcov reporting.

**Key accomplishments:**

- Jest infrastructure with 80%/70% coverage thresholds, 8 native module mocks, and renderWithProviders utility
- 30 unit tests for date utilities and all 10 DB row mapper functions
- 147 DB business logic tests across all 8 database modules (exercises, sessions, sets, programs, protein, dashboard, calendar, seed)
- 72 component and context tests covering rendering, interactions, and provider lifecycles
- 79 screen tests for all app screens including WorkoutScreen, superset flows, and modal form validation
- Gap-closing pass boosted coverage from 77.82% to 82.26%, clearing all four Jest coverage thresholds

---
