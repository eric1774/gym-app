# Milestones

## v1.9 Food Database & Meal Builder (Shipped: 2026-04-09)

**Phases:** 37-40 (4 phases, 11 plans) | **Commits:** 29 | **Lines:** +5,401
**Timeline:** 2026-04-08 → 2026-04-09 (2 days)
**Git range:** feat(37-01) → feat(40-03)

**Delivered:** Offline USDA food database with multi-food meal builder that auto-calculates macros from gram weights, plus smart features like remembered portions, meal repeat/edit, and library integration.

**Key accomplishments:**

- USDA build pipeline + migration v12 seeding ~8,000 foods into SQLite with first-launch splash screen
- Fuzzy token search with 200ms debounce, frequency boosting, frequent foods list, and custom food creation
- Multi-food meal builder with per-food gram entry, live macro preview, running totals, and atomic multi-food logging
- Remembered portions with ghost text pre-fill and "last: Xg" badges on search results
- Meal repeat/edit — repeat icon to pre-load builder from previous meals, edit mode for logged meal food components
- Library integration — BUILD MEAL button from library flow, save-to-library toggle for built meals

---

## v1.8 Hydration Tracker (Shipped: 2026-04-05)

**Phases:** 34-36 (3 phases, 6 plans, 12 tasks) | **Commits:** 17 | **Lines:** +3,917
**Timeline:** 2026-04-04 → 2026-04-05 (2 days)
**Git range:** feat(34-01) → feat(36-02)
**Requirements:** 10/10 satisfied (TAB-01–02, HYD-01–04, GOAL-01–02, DB-01–02)

**Delivered:** Daily hydration tracking on the Macros page with cup visualization, water goal setting, quick-add logging, and hydration stats.

**Key accomplishments:**

- DB migration v11 with water_logs and water_settings tables, hydration.ts module exporting all 6 DB functions
- TabBar component with underline active state, MacrosView extraction refactoring ProteinScreen into thin shell
- WaterCup gradient fill visualization proportional to daily water progress vs goal
- Quick-add buttons (+8/+16/+24 oz) with haptic feedback and LogWaterModal for custom amounts
- GoalSetupCard with pre-filled 64 oz default for first-use, inline goal editing with Save/Cancel
- HydrationStatCards showing hydration streak (consecutive days meeting goal) and weekly average (% of goal)

---

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
