# Roadmap: GymTrack

## Milestones

- ✅ **v1.0 MVP** — Phases 1-3 (shipped 2026-03-06)
- ✅ **v1.1 Protein Tracking** — Phases 4-7 (shipped 2026-03-08)
- ✅ **v1.2 Meal Library** — Phase 8 (shipped 2026-03-09)
- ✅ **v1.3 Workout Intelligence & Speed** — Phases 9-14 (shipped 2026-03-14)
- ✅ **v1.4 Test Coverage** — Phases 15-21 (shipped 2026-03-17)
- 🚧 **v1.5 Program Data Export** — Phases 22-23 (in progress)

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

### 🚧 v1.5 Program Data Export (In Progress)

**Milestone Goal:** Let users export a program's completed workout data as a structured JSON file saved directly to their phone.

- [x] **Phase 22: Export Data Layer** — DB query and JSON assembly for completed workout data, structured by week/day with program metadata (completed 2026-03-22)
- [x] **Phase 23: Export UI & File Delivery** — Three-dot menu trigger, loading indicator, Android share/save dialog, descriptive filename, and result toast (completed 2026-03-22)

## Phase Details

### Phase 22: Export Data Layer
**Goal**: Program workout data can be queried and assembled into a complete, correctly-structured JSON export
**Depends on**: Phase 21 (v1.4 complete)
**Requirements**: EXPD-01, EXPD-02, EXPD-03, EXPD-04, EXPD-05
**Success Criteria** (what must be TRUE):
  1. Calling the export function for a program returns a JSON object structured as weeks containing days
  2. Each day entry lists every exercise with the actual sets, reps, and weights the user completed
  3. Days that were not completed are absent from the export output
  4. The JSON object includes program-level metadata: name, total weeks, and completion percentage
  5. A partially-completed program produces a partial export containing only its completed days
**Plans:** 1/1 plans complete
Plans:
- [x] 22-01-PLAN.md — Export types, DB query function, and comprehensive tests

### Phase 23: Export UI & File Delivery
**Goal**: Users can trigger an export from the Programs page and receive a saved JSON file on their phone
**Depends on**: Phase 22
**Requirements**: UI-01, UI-02, UI-03, FILE-01, FILE-02
**Success Criteria** (what must be TRUE):
  1. Tapping the three-dot menu on a program card shows an Export option
  2. After tapping Export, a loading indicator is visible while the data is prepared
  3. Android's native share/save dialog appears so the user can choose where to save the file
  4. The suggested filename follows the pattern ProgramName_YYYY-MM-DD.json
  5. After the dialog is dismissed, a success or error toast confirms the outcome
**Plans:** 1/1 plans complete
Plans:
- [x] 23-01-PLAN.md — ExportToast component, three-dot menu with Export/Delete, share flow, and tests

## Progress

| Phase | Milestone | Plans | Status | Completed |
|-------|-----------|-------|--------|-----------|
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
| 22. Export Data Layer | v1.5 | 1/1 | Complete    | 2026-03-22 |
| 23. Export UI & File Delivery | v1.5 | 1/1 | Complete   | 2026-03-22 |
