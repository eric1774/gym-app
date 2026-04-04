# Roadmap: GymTrack

## Milestones

- ✅ **v1.0 MVP** — Phases 1-3 (shipped 2026-03-06)
- ✅ **v1.1 Protein Tracking** — Phases 4-7 (shipped 2026-03-08)
- ✅ **v1.2 Meal Library** — Phase 8 (shipped 2026-03-09)
- ✅ **v1.3 Workout Intelligence & Speed** — Phases 9-14 (shipped 2026-03-14)
- ✅ **v1.4 Test Coverage** — Phases 15-21 (shipped 2026-03-17)
- ✅ **v1.5 Program Data Export** — Phases 22-23 (shipped 2026-03-22)
- ✅ **v1.6 Heart Rate Monitoring** — Phases 24-29 (shipped 2026-03-30)

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

<details>
<summary>✅ v1.6 Heart Rate Monitoring (Phases 24-29) — SHIPPED 2026-03-30</summary>

**Milestone Goal:** Add live Garmin heart rate display during workouts via BLE, with configurable HR zones, session HR persistence, and post-workout HR stats.

- [x] **Phase 24: BLE Foundation** — Android permissions, BleManager singleton, DB migration v8, shared HR types, and HRSettingsService (completed 2026-03-24)
- [x] **Phase 25: Connection Management** — Device scan, connect, paired device persistence, auto-reconnect, connection state indicator, disconnect UX (completed 2026-03-25)
- [x] **Phase 26: HR Data Persistence** — In-session sample buffering, batch flush on session end, avg/peak HR aggregates, summary card stats, calendar day details (completed 2026-03-27)
- [x] **Phase 27: Live Display & Settings UI** — Live BPM in workout header, zone coloring, zone label, age/max HR settings, pairing from Settings (completed 2026-03-29)
- [x] **Phase 28: Bug Fixes & Dead Code Cleanup** — Fix unpair disconnect bug, zone clamping for below-zone BPM, remove dead code (completed 2026-03-30)
- [x] **Phase 29: Milestone Bookkeeping** — Update SUMMARY.md frontmatter, check DATA requirements, update coverage counts (completed 2026-03-30)

</details>

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
| 25. Connection Management | v1.6 | 3/3 | Complete | 2026-03-25 |
| 26. HR Data Persistence | v1.6 | 2/2 | Complete | 2026-03-28 |
| 27. Live Display & Settings UI | v1.6 | 4/4 | Complete | 2026-03-29 |
| 28. Bug Fixes & Dead Code Cleanup | v1.6 | 2/2 | Complete | 2026-03-30 |
| 29. Milestone Bookkeeping | v1.6 | 1/1 | Complete    | 2026-03-30 |
