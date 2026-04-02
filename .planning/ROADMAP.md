# Roadmap: GymTrack

## Milestones

- ✅ **v1.0 MVP** — Phases 1-3 (shipped 2026-03-06)
- ✅ **v1.1 Protein Tracking** — Phases 4-7 (shipped 2026-03-08)
- ✅ **v1.2 Meal Library** — Phase 8 (shipped 2026-03-09)
- ✅ **v1.3 Workout Intelligence & Speed** — Phases 9-14 (shipped 2026-03-14)
- ✅ **v1.4 Test Coverage** — Phases 15-21 (shipped 2026-03-17)
- ✅ **v1.5 Program Data Export** — Phases 22-23 (shipped 2026-03-22)
- ✅ **v1.6 Heart Rate Monitoring** — Phases 24-29 (shipped 2026-03-30)
- ◆ **v1.7 Macros Tracking** — Phases 30-33

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
- [x] **Phase 26: HR Data Persistence** — In-session sample buffering, batch flush on session end, avg/peak HR aggregates, summary card stats, calendar day details (completed 2026-03-28)
- [x] **Phase 27: Live Display & Settings UI** — Live BPM in workout header, zone coloring, zone label, age/max HR settings, pairing from Settings (completed 2026-03-29)
- [x] **Phase 28: Bug Fixes & Dead Code Cleanup** — Fix unpair disconnect bug, zone clamping for below-zone BPM, remove dead code (completed 2026-03-30)
- [x] **Phase 29: Milestone Bookkeeping** — Update SUMMARY.md frontmatter, check DATA requirements, update coverage counts (completed 2026-03-30)

</details>

### v1.7 Macros Tracking (Phases 30-33)

**Milestone Goal:** Transform protein tracking into full macronutrient tracking (protein, carbs, fat) with multi-macro UI, per-macro goals, charts, calorie computation, and meal library support. protein.ts remains frozen throughout.

- [ ] **Phase 30: DB Foundation** — DB migration v10, macro types and constants, macros.ts module, computeCalories utility
- [ ] **Phase 31: Goal Setting, Progress & Charts** — MacroProgressBars, GoalSetupForm, MacroChart with tab selector, per-macro colors
- [ ] **Phase 32: Screens & Meal Entry** — MacrosScreen, AddMealModal with 3-macro inputs, meal library macro support, macro badges
- [ ] **Phase 33: Navigation Rename** — Protein tab renamed to Macros, all route/stack type names updated

## Phase Details

### Phase 30: DB Foundation
**Goal**: The app stores carbs and fat for every meal, has a macro_settings table, and all macro-aware DB functions compile and pass tests
**Depends on**: Nothing (first phase of milestone)
**Requirements**: DB-01, DB-02, DB-03, DB-04
**Success Criteria** (what must be TRUE):
  1. App opens on a v9 database and successfully migrates to v10 — meals and meal_library have carb_grams and fat_grams columns defaulting to 0, with no NaN or null values visible anywhere in the UI
  2. A new macro_settings row exists after migration and contains the protein goal value carried over from the existing protein_settings row
  3. computeCalories(p, c, f) returns the correct calorie value (p*4 + c*4 + f*9) and is importable by any component without a theme dependency
  4. macros.ts exports all required DB functions (addMeal, getMacroGoals, setMacroGoals, getTodayMacroTotals, getDailyMacroTotals, get7DayAverage, getStreakDays) and its test suite passes — streak counts protein-goal-only days
  5. Jest test suite passes with migration count updated to 10 and mealRow/proteinSettingsRow fixtures updated to include the new columns
**Plans**: 2 plans
Plans:
- [x] 30-01-PLAN.md — Types, constants, computeCalories utility, migration v10, migration test updates (completed 2026-04-02)
- [ ] 30-02-PLAN.md — macros.ts DB module with all functions, test suite, barrel exports

### Phase 31: Goal Setting, Progress & Charts
**Goal**: Users can see all three macro progress bars, set goals for each macro, and view per-macro history charts
**Depends on**: Phase 30
**Requirements**: GOAL-01, GOAL-02, GOAL-03, GOAL-04, GOAL-05, GOAL-06, CHART-01, CHART-02, CHART-03
**Success Criteria** (what must be TRUE):
  1. User can open the goal form and set separate gram targets for protein, carbs, and fat — a calorie estimate updates live as numbers are typed
  2. The progress card shows three separate P/C/F bars, each with current grams, goal grams, and percentage filled — all on one screen without scrolling
  3. An existing user who has only a protein goal sees protein bar filled correctly and carbs/fat bars showing "Tap to set" instead of broken 0/0 state
  4. User can tap the progress card to inline-edit any of the three macro goals and save or cancel without leaving the screen
  5. User can tap Protein, Carbs, or Fat tabs above the chart and see a line chart for the selected macro using its color (mint #8DC28A / blue #5B9BF0 / coral #E8845C) — tab switch is instant with no re-fetch
**Plans**: TBD
**UI hint**: yes

### Phase 32: Screens & Meal Entry
**Goal**: Users can log meals with all three macros, see macro badges on every meal, and the meal library stores and logs full macro data
**Depends on**: Phase 31
**Requirements**: MEAL-01, MEAL-02, MEAL-03, MEAL-04, MEAL-05, MEAL-06, LIB-01, LIB-02, LIB-03
**Success Criteria** (what must be TRUE):
  1. User can open the add meal form, enter protein, carbs, and fat grams (at least one > 0 required), and see a calorie total update live with each keystroke before saving
  2. User can edit an existing meal and change any of its three macro values — all changes persist correctly
  3. Every meal row in today's history shows colored badges for non-zero macros only (zero-value macros are hidden, not shown as "0g")
  4. Quick-add buttons display non-zero macro values as compact colored pills
  5. User can save a library meal with protein, carbs, and fat grams, then tap it to log all three macros to today's totals in one tap
  6. Protein streak counts only consecutive days meeting the protein goal — adding carbs/fat goals does not reset or alter the existing streak count
**Plans**: TBD
**UI hint**: yes

### Phase 33: Navigation Rename
**Goal**: The bottom tab and all internal route names consistently say "Macros" — no visible or type-level reference to "Protein" remains in the navigation layer
**Depends on**: Phase 32
**Requirements**: NAV-01, NAV-02
**Success Criteria** (what must be TRUE):
  1. The bottom navigation tab shows "Macros" label with the correct icon — "Protein" label is gone
  2. tsc --noEmit exits with zero errors after all route and stack type renames (ProteinStack → MacrosStack, ProteinHome → MacrosHome, ProteinStackParamList → MacrosStackParamList)
**Plans**: TBD

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
| 29. Milestone Bookkeeping | v1.6 | 1/1 | Complete | 2026-03-30 |
| 30. DB Foundation | v1.7 | 1/2 | In Progress | - |
| 31. Goal Setting, Progress & Charts | v1.7 | 0/? | Not started | - |
| 32. Screens & Meal Entry | v1.7 | 0/? | Not started | - |
| 33. Navigation Rename | v1.7 | 0/? | Not started | - |
