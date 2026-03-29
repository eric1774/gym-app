# Roadmap: GymTrack

## Milestones

- ✅ **v1.0 MVP** — Phases 1-3 (shipped 2026-03-06)
- ✅ **v1.1 Protein Tracking** — Phases 4-7 (shipped 2026-03-08)
- ✅ **v1.2 Meal Library** — Phase 8 (shipped 2026-03-09)
- ✅ **v1.3 Workout Intelligence & Speed** — Phases 9-14 (shipped 2026-03-14)
- ✅ **v1.4 Test Coverage** — Phases 15-21 (shipped 2026-03-17)
- ✅ **v1.5 Program Data Export** — Phases 22-23 (shipped 2026-03-22)
- 🚧 **v1.6 Heart Rate Monitoring** — Phases 24-27 (in progress)

## Phases

<details>
<summary>✅ v1.0 MVP (Phases 1-3) — SHIPPED 2026-03-06</summary>

Phases 1-3 delivered core workout tracking: programs, exercise logging, rest timer, dashboard, and exercise history.

</details>

<details>
<summary>✅ v1.1 Protein Tracking (Phases 4-7) — SHIPPED 2026-03-08</summary>

**Milestone Goal:** Add daily protein intake tracking with meal logging, configurable goals, progress visualization, and history charts to the existing gym tracking app.

- [x] **Phase 4: Data Foundation** — Schema migration system, protein tables, repository, and local-date infrastructure
- [x] **Phase 5: Protein Tab and Meal Logging** — New bottom tab with goal progress bar, meal add/edit/delete, and today's meal history
- [x] **Phase 6: Protein Intake Chart** — Line chart of daily protein totals with day/week/month filtering
- [x] **Phase 7: Polish and Differentiators** — Quick-add buttons, goal streak indicator, and rolling weekly average

</details>

<details>
<summary>✅ v1.2 Meal Library (Phase 8) — SHIPPED 2026-03-09</summary>

**Milestone Goal:** Add a Meal Library screen for managing saved meals and one-tap logging to today's protein tracking.

- [x] **Phase 8: Meal Library** — Library screen with meal management by type and one-tap protein logging (completed 2026-03-09)

</details>

<details>
<summary>✅ v1.3 Workout Intelligence & Speed (Phases 9-14) — SHIPPED 2026-03-14</summary>

**Milestone Goal:** Reduce friction on set logging, add motivation through PR detection, and surface workout intelligence (volume, summaries, calendar, supersets).

- [x] **Phase 9: Faster Set Logging** — Weight steppers, auto-fill fix, and haptic feedback throughout workout flow (completed 2026-03-10)
- [x] **Phase 10: PR Detection & Volume Tracking** — Animated PR toast with double haptic, running volume total in workout header (completed 2026-03-12)
- [x] **Phase 11: Quick-Start & Rest Timer** — Next Workout dashboard card and per-exercise rest timer configuration (completed 2026-03-12)
- [x] **Phase 12: Workout Summary** — Completion summary screen shown after ending a workout (completed 2026-03-12)
- [x] **Phase 13: Calendar View** — Monthly calendar grid showing training history with day detail view (completed 2026-03-14)
- [x] **Phase 14: Superset Support** — Superset grouping in programs, alternating set flow in workouts (DB migration v7) (completed 2026-03-14)

</details>

<details>
<summary>✅ v1.4 Test Coverage (Phases 15-21) — SHIPPED 2026-03-17</summary>

**Milestone Goal:** Reach 82%+ line coverage across the codebase with Jest, with coverage threshold enforcement.

- [x] **Phase 15: Test Infrastructure** — Jest config with coverage thresholds, native module mocks, and shared test utilities (completed 2026-03-15)
- [x] **Phase 16: Utility and Mapper Tests** — Pure date utility tests and DB row mapper tests across all database modules (completed 2026-03-15)
- [x] **Phase 17: DB Business Logic Tests** — Full test coverage for all 8 database modules (completed 2026-03-15)
- [x] **Phase 18: Component and Context Tests** — Rendering and interaction tests for simple and complex components, modals, and context providers (completed 2026-03-16)
- [x] **Phase 19: Screens Part 1** — Tests for simpler screens and modal screens (completed 2026-03-16)
- [x] **Phase 20: Screens Part 2** — Tests for complex screens (WorkoutScreen, ProgramDetailScreen, DayDetailScreen, SetLoggingPanel) (completed 2026-03-16)
- [x] **Phase 21: Gap Closing** — Coverage report analysis, targeted tests for files below 80%, threshold verification (completed 2026-03-16)

</details>

<details>
<summary>✅ v1.5 Program Data Export (Phases 22-23) — SHIPPED 2026-03-22</summary>

**Milestone Goal:** Let users export a program's completed workout data as a structured JSON file saved directly to their phone.

- [x] **Phase 22: Export Data Layer** — DB query and JSON assembly for completed workout data, structured by week/day with program metadata (completed 2026-03-22)
- [x] **Phase 23: Export UI & File Delivery** — Three-dot menu trigger, loading indicator, Android share/save dialog, descriptive filename, and result toast (completed 2026-03-22)

</details>

### v1.6 Heart Rate Monitoring (In Progress)

**Milestone Goal:** Add live Garmin heart rate display during workouts via BLE, with configurable HR zones, session HR persistence, and post-workout HR stats.

- [x] **Phase 24: BLE Foundation** — Android permissions, BleManager singleton, DB migration v8, shared HR types, and HRSettingsService (completed 2026-03-24)
- [x] **Phase 25: Connection Management** — Device scan, connect, paired device persistence, auto-reconnect, connection state indicator, disconnect UX (completed 2026-03-25)
- [x] **Phase 26: HR Data Persistence** — In-session sample buffering, batch flush on session end, avg/peak HR aggregates, summary card stats, calendar day details (completed 2026-03-27)
- [x] **Phase 27: Live Display & Settings UI** — Live BPM in workout header, zone coloring, zone label, age/max HR settings, pairing from Settings (completed 2026-03-29)

## Phase Details

### Phase 24: BLE Foundation
**Goal**: The BLE infrastructure needed by all subsequent phases is in place — permissions are declared and requested, the BleManager singleton is initialized without memory leaks, the DB schema supports HR data, and shared types plus HRSettingsService are available throughout the codebase.
**Depends on**: Phase 23
**Requirements**: BLE-04
**Success Criteria** (what must be TRUE):
  1. App requests BLUETOOTH_SCAN and BLUETOOTH_CONNECT at runtime on Android 12+ (and BLUETOOTH + ACCESS_FINE_LOCATION on Android 11 and below) before any BLE call
  2. A single BleManager instance exists as a module-level constant — no duplicate instances created on re-render or hot reload
  3. DB migration v8 runs cleanly on a device upgrading from schema v7: heart_rate_samples table exists and avg_hr/peak_hr columns exist on workout_sessions
  4. Jest mock for react-native-ble-plx is registered so the existing test suite passes without modification
  5. HRSettingsService can read and write age, maxHrOverride, and pairedDeviceId from AsyncStorage
**Plans:** 2/2 plans complete
Plans:
- [x] 24-01-PLAN.md — Dependencies, permissions, types, BleManager singleton, Jest mock
- [x] 24-02-PLAN.md — DB migration v8, HRSettingsService with AsyncStorage CRUD

### Phase 25: Connection Management
**Goal**: Users can scan for nearby BLE heart rate devices, select and connect to their Garmin Forerunner 245, have that device remembered for auto-reconnect, and see the live connection state in the workout header — including graceful "--" display on mid-workout disconnect with automatic reconnect attempt.
**Depends on**: Phase 24
**Requirements**: BLE-01, BLE-02, BLE-03, BLE-05, HR-04
**Success Criteria** (what must be TRUE):
  1. User can open a scan screen, see nearby BLE heart rate devices appear in a list, and tap one to connect
  2. After connecting to the Garmin Forerunner 245, the device ID is persisted; the next time the workout screen opens, the app connects automatically without requiring a scan
  3. A connection state indicator (connected / reconnecting / disconnected) is visible in the workout header during an active workout
  4. When the watch disconnects mid-workout, the BPM display shows "--" and the app attempts one auto-reconnect without any user action required
  5. HeartRateContext is wired to BLEHeartRateService and exposes currentBpm, deviceState, and session actions to the rest of the app
**Plans:** 3/3 plans complete
Plans:
- [x] 25-01-PLAN.md — HeartRateContext BLE state machine, presentation components, App.tsx provider wiring
- [ ] 25-02-PLAN.md — DeviceScanSheet bottom sheet, SettingsScreen HR Monitor card
- [ ] 25-03-PLAN.md — WorkoutScreen header indicator, auto-reconnect, disconnect haptic
**UI hint**: yes

### Phase 26: HR Data Persistence
**Goal**: HR samples collected during a workout are reliably stored without impacting set-logging speed, and avg/peak HR computed from those samples is visible on the workout summary card and in the calendar day detail view.
**Depends on**: Phase 25
**Requirements**: DATA-01, DATA-02, DATA-03, DATA-04
**Success Criteria** (what must be TRUE):
  1. HR samples accumulate in memory during a workout and are batch-inserted into hr_samples in a single SQLite transaction when the session ends — no per-sample DB writes during an active workout
  2. avg_hr and peak_hr are computed from the in-memory buffer on session end and persisted to workout_sessions before the summary screen renders
  3. The workout summary card displays average HR and peak HR after a session that included a connected heart rate monitor
  4. The calendar day detail view displays average HR and peak HR for past sessions that recorded HR data
**Plans**: TBD

### Phase 27: Live Display & Settings UI
**Goal**: Users see their live BPM color-coded by zone in the workout header throughout a session, and can configure age and max HR in Settings and initiate device pairing from Settings.
**Depends on**: Phase 26
**Requirements**: HR-01, HR-02, HR-03, SET-01, SET-02
**Success Criteria** (what must be TRUE):
  1. Live BPM updates in the workout header approximately once per second during an active session with a connected device
  2. The BPM display is color-coded to match the user's current HR zone (5-zone model: Zone 1-5 at 50/60/70/80/90% of max HR)
  3. A zone label ("Zone 3 — Aerobic") is shown alongside the BPM number
  4. User can enter their age in Settings, and the app automatically calculates max HR using the Tanaka formula (208 - 0.7 x age)
  5. User can initiate a device scan and pair their Garmin from the Settings screen (without needing to start a workout first)
**Plans:** 4/4 plans complete
Plans:
- [x] 27-01-PLAN.md — Zone utility, HRLiveBpmDisplay component, WorkoutScreen integration
- [x] 27-02-PLAN.md — Settings Heart Rate Monitor card with age/max HR controls and device pairing
- [x] 27-03-PLAN.md — Gap closure: add gear icon to Dashboard header for Settings navigation
- [x] 27-04-PLAN.md — Gap closure: fix BPM flicker and header overflow (End Workout pushed off screen)
**UI hint**: yes

## Progress

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1-3. Core Workout Tracking | v1.0 | — | Complete | 2026-03-06 |
| 4. Data Foundation | v1.1 | 2/2 | Complete | 2026-03-07 |
| 5. Protein Tab and Meal Logging | v1.1 | 2/2 | Complete | 2026-03-08 |
| 6. Protein Intake Chart | v1.1 | 1/1 | Complete | 2026-03-08 |
| 7. Polish and Differentiators | v1.1 | 2/2 | Complete | 2026-03-08 |
| 8. Meal Library | v1.2 | 2/2 | Complete | 2026-03-09 |
| 9. Faster Set Logging | v1.3 | 1/1 | Complete | 2026-03-10 |
| 10. PR Detection & Volume Tracking | v1.3 | 2/2 | Complete | 2026-03-12 |
| 11. Quick-Start & Rest Timer | v1.3 | 2/2 | Complete | 2026-03-12 |
| 12. Workout Summary | v1.3 | 1/1 | Complete | 2026-03-12 |
| 13. Calendar View | v1.3 | 2/2 | Complete | 2026-03-14 |
| 14. Superset Support | v1.3 | 2/2 | Complete | 2026-03-14 |
| 15. Test Infrastructure | v1.4 | 2/2 | Complete | 2026-03-15 |
| 16. Utility and Mapper Tests | v1.4 | 1/1 | Complete | 2026-03-15 |
| 17. DB Business Logic Tests | v1.4 | 3/3 | Complete | 2026-03-15 |
| 18. Component and Context Tests | v1.4 | 3/3 | Complete | 2026-03-16 |
| 19. Screens Part 1 | v1.4 | 2/2 | Complete | 2026-03-16 |
| 20. Screens Part 2 | v1.4 | 2/2 | Complete | 2026-03-16 |
| 21. Gap Closing | v1.4 | 1/1 | Complete | 2026-03-16 |
| 22. Export Data Layer | v1.5 | 1/1 | Complete | 2026-03-22 |
| 23. Export UI & File Delivery | v1.5 | 1/1 | Complete | 2026-03-22 |
| 24. BLE Foundation | v1.6 | 2/2 | Complete | 2026-03-24 |
| 25. Connection Management | v1.6 | 1/3 | Complete    | 2026-03-25 |
| 26. HR Data Persistence | v1.6 | 2/2 | Complete    | 2026-03-28 |
| 27. Live Display & Settings UI | v1.6 | 4/4 | Complete   | 2026-03-29 |
