# Roadmap: GymTrack

## Milestones

- **v1.0 MVP** - Phases 1-3 (shipped)
- **v1.1 Protein Tracking** - Phases 4-7 (shipped)
- **v1.2 Meal Library** - Phase 8 (shipped)
- **v1.3 Workout Intelligence & Speed** - Phases 9-14 (shipped)
- **v1.4 Test Coverage** - Phases 15-21 (in progress)

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

<details>
<summary>v1.0 MVP (Phases 1-3) - SHIPPED</summary>

Phases 1-3 delivered core workout tracking: programs, exercise logging, rest timer, dashboard, and exercise history.

</details>

<details>
<summary>v1.1 Protein Tracking (Phases 4-7) - SHIPPED</summary>

**Milestone Goal:** Add daily protein intake tracking with meal logging, configurable goals, progress visualization, and history charts to the existing gym tracking app.

- [x] **Phase 4: Data Foundation** - Schema migration system, protein tables, repository, and local-date infrastructure
- [x] **Phase 5: Protein Tab and Meal Logging** - New bottom tab with goal progress bar, meal add/edit/delete, and today's meal history
- [x] **Phase 6: Protein Intake Chart** - Line chart of daily protein totals with day/week/month filtering
- [x] **Phase 7: Polish and Differentiators** - Quick-add buttons, goal streak indicator, and rolling weekly average

</details>

<details>
<summary>v1.2 Meal Library (Phase 8) - SHIPPED</summary>

**Milestone Goal:** Add a Meal Library screen for managing saved meals and one-tap logging to today's protein tracking.

- [x] **Phase 8: Meal Library** - Library screen with meal management by type and one-tap protein logging (completed 2026-03-09)

</details>

<details>
<summary>v1.3 Workout Intelligence & Speed (Phases 9-14) - SHIPPED</summary>

**Milestone Goal:** Reduce friction on set logging, add motivation through PR detection, and surface workout intelligence (volume, summaries, calendar, supersets).

- [x] **Phase 9: Faster Set Logging** - Weight steppers, auto-fill fix, and haptic feedback throughout workout flow (completed 2026-03-10)
- [x] **Phase 10: PR Detection & Volume Tracking** - Animated PR toast with double haptic, running volume total in workout header (completed 2026-03-12)
- [x] **Phase 11: Quick-Start & Rest Timer** - Next Workout dashboard card and per-exercise rest timer configuration (completed 2026-03-12)
- [x] **Phase 12: Workout Summary** - Completion summary screen shown after ending a workout (completed 2026-03-12)
- [x] **Phase 13: Calendar View** - Monthly calendar grid showing training history with day detail view (completed 2026-03-14)
- [x] **Phase 14: Superset Support** - Superset grouping in programs, alternating set flow in workouts (DB migration v7) (completed 2026-03-14)

</details>

### v1.4 Test Coverage

**Milestone Goal:** Reach 80%+ line coverage across the codebase with Jest, integrated with SonarQube for continuous quality tracking.

- [x] **Phase 15: Test Infrastructure** - Jest config with coverage thresholds, native module mocks, and shared test utilities (completed 2026-03-15)
- [x] **Phase 16: Utility and Mapper Tests** - Pure date utility tests and DB row mapper tests across all database modules (completed 2026-03-15)
- [ ] **Phase 17: DB Business Logic Tests** - Full test coverage for all 8 database modules (exercises, sessions, sets, programs, protein, dashboard, calendar, seed)
- [ ] **Phase 18: Component and Context Tests** - Rendering and interaction tests for simple and complex components, modals, and context providers
- [ ] **Phase 19: Screens Part 1** - Tests for simpler screens (Dashboard, Protein, Programs, ExerciseProgress, Calendar, Library, Settings) and modal screens
- [ ] **Phase 20: Screens Part 2** - Tests for complex screens (WorkoutScreen, ProgramDetailScreen, DayDetailScreen, SetLoggingPanel)
- [ ] **Phase 21: Gap Closing** - Coverage report analysis, targeted tests for files below 80%, threshold verification

## Phase Details

### Phase 8: Meal Library
**Goal**: Users can manage a personal library of saved meals and log any meal to today's protein tracking with one tap
**Depends on**: Phase 7 (v1.1 Protein Tracking complete -- Protein screen, meal data layer, and quick-add infrastructure exist)
**Requirements**: NAV-02, LIB-01, LIB-02, LIB-03, LOG-01
**Success Criteria** (what must be TRUE):
  1. User can tap a "Meals" button on the Protein screen and land on a dedicated Meal Library screen
  2. User can see saved meals organized into sections by meal type (Breakfast / Lunch / Dinner / Snack)
  3. User can add a new meal to the library by entering a name, protein grams, and selecting a meal type
  4. User can swipe a meal row to delete it from the library
  5. User can tap any meal in the library to instantly add it to today's protein tracking without any confirmation dialog
**Plans**: 2 plans

Plans:
- [x] 08-01-PLAN.md -- Data foundation: LibraryMeal type, migration, repository, navigation wiring, ProteinScreen button
- [x] 08-02-PLAN.md -- Meal Library screen with SectionList, add-to-library modal, swipe-to-delete, one-tap logging

### Phase 9: Faster Set Logging
**Goal**: Users can log sets faster with weight increment buttons, correct weight auto-fill, and haptic confirmation throughout the workout flow
**Depends on**: Phase 8 (v1.2 complete)
**Requirements**: LOG-01, LOG-02, LOG-03
**Success Criteria** (what must be TRUE):
  1. User can tap +5 or -5 buttons flanking the weight input to adjust weight without typing
  2. When user collapses and re-expands a logging panel mid-session, the weight pre-fills from the most recent set logged in that session
  3. User feels a haptic pulse on set confirm, on marking an exercise complete, and on ending the workout
**Plans**: 1 plan

Plans:
- [x] 09-01-PLAN.md -- Weight steppers, auto-fill fix, and haptic feedback

### Phase 10: PR Detection & Volume Tracking
**Goal**: Users receive immediate celebration when setting a personal record and can see their running session volume at all times
**Depends on**: Phase 9 (haptic pattern established)
**Requirements**: REC-01, REC-02, REC-03
**Success Criteria** (what must be TRUE):
  1. When a logged set exceeds all previous weight+reps for that exercise, an animated gold PR toast slides in from the top and auto-dismisses
  2. User feels two distinct haptic pulses (400ms apart) on PR detection
  3. The workout header displays a running volume total (weight x reps) that updates immediately after each set is logged
**Plans**: 2 plans

Plans:
- [x] 10-01-PLAN.md -- PR detection query, PRToast component, prGold theme color
- [x] 10-02-PLAN.md -- Wire PR check, double haptic, and volume total into WorkoutScreen

### Phase 11: Quick-Start & Rest Timer
**Goal**: Users can start their next workout from the dashboard in one tap and configure rest duration per exercise during a session
**Depends on**: Phase 10
**Requirements**: NAV-01, NAV-02, REST-01, REST-02, REST-03
**Success Criteria** (what must be TRUE):
  1. The dashboard shows a "Next Workout" card identifying the next unfinished program day with program name, day name, and exercise count
  2. Tapping Start on the Next Workout card begins the session and navigates directly to the workout screen without additional steps
  3. Each exercise card in the workout screen shows its configured rest duration (e.g., "Rest: 90s")
  4. User can tap the rest duration label to edit it inline during a workout
  5. When the user starts the rest timer after a set, it counts down using the exercise-specific duration
**Plans**: 2 plans

Plans:
- [x] 11-01-PLAN.md -- Next Workout card on dashboard with quick-start and active session state
- [x] 11-02-PLAN.md -- Per-exercise rest duration display, +/-15s steppers, and timer integration

### Phase 12: Workout Summary
**Goal**: Users see a satisfying summary of their completed workout before returning to the home screen
**Depends on**: Phase 10 (PR list and volume data available)
**Requirements**: SUM-01, SUM-02
**Success Criteria** (what must be TRUE):
  1. After tapping "End Workout," a summary screen appears showing session duration, total sets, total volume, exercises completed, and PRs hit during the session
  2. User can tap a dismiss button to leave the summary and return to an empty workout screen
**Plans**: 1 plan

Plans:
- [x] 12-01-PLAN.md -- Summary card with stats (duration, sets, volume, exercises, PRs), Done-to-Dashboard navigation

### Phase 13: Calendar View
**Goal**: Users can see their full training history laid out on a monthly calendar and drill into any day's session details
**Depends on**: Phase 12
**Requirements**: CAL-01, CAL-02, CAL-03
**Success Criteria** (what must be TRUE):
  1. A calendar screen renders the current month as a 7-column grid with mint dot indicators on days that had workouts
  2. User can tap left/right arrows to navigate to adjacent months and the grid updates accordingly
  3. Tapping a day that had a workout reveals session details including duration, exercise count, volume, and program day name
**Plans**: 2 plans

Plans:
- [x] 13-01-PLAN.md -- Calendar data layer, monthly grid screen with workout indicators, tab navigation wiring
- [x] 13-02-PLAN.md -- Day detail screen with session cards, exercise breakdown, and PR highlighting

### Phase 14: Superset Support
**Goal**: Users can group exercises as supersets in their programs and experience a seamless alternating-set flow during workouts
**Depends on**: Phase 11 (per-exercise rest timer required for superset rest behavior)
**Requirements**: SUP-01, SUP-02, SUP-03, SUP-04
**Success Criteria** (what must be TRUE):
  1. In a program day, user can select 2-3 exercises and group them as a superset, with a visual badge confirming the grouping
  2. During a workout, superset exercises are rendered inside a shared container with a connecting visual indicator
  3. After logging a set for any exercise in a superset (except the last), the next exercise in the group auto-expands immediately
  4. After logging a set for the last exercise in a superset group, the rest timer prompt appears using that exercise's configured rest duration
**Plans**: 2 plans

Plans:
- [x] 14-01-PLAN.md -- Data layer (migration v7, types, DB functions) and DayDetailScreen superset creation/removal UI
- [x] 14-02-PLAN.md -- WorkoutScreen superset container, auto-advance logic, and rest timer suppression

### Phase 15: Test Infrastructure
**Goal**: The Jest test environment is fully configured with coverage thresholds, mocks for all native modules, and shared test utilities that all subsequent test phases can rely on
**Depends on**: Phase 14 (v1.3 complete — source code is stable)
**Requirements**: INFRA-01, INFRA-02, INFRA-03, INFRA-04, INFRA-05
**Success Criteria** (what must be TRUE):
  1. Running `npm run test:coverage` generates a `coverage/lcov.info` report without errors
  2. Jest config enforces 80% global line coverage threshold — the test run fails if coverage drops below this
  3. All 7 native module mocks exist and `npx jest --showConfig` resolves them without module-not-found errors
  4. `renderWithProviders` wraps any component with mocked contexts and navigation so screen tests can mount without errors
  5. `mockResultSet` generates fake SQL result objects that the DB test layer can use without real SQLite
**Plans**: 2 plans

Plans:
- [x] 15-01-PLAN.md -- Jest config with coverage thresholds, lcov reporter, jest.setup.js, and test:coverage npm script
- [x] 15-02-PLAN.md -- Native module mocks (8 mocks in __mocks__/) and test utilities (dbMock.ts, renderWithProviders.tsx)

### Phase 16: Utility and Mapper Tests
**Goal**: All pure date utility functions and DB row mapper functions are tested in isolation, confirming correct data transformations
**Depends on**: Phase 15 (test infrastructure in place)
**Requirements**: UNIT-01, UNIT-02
**Success Criteria** (what must be TRUE):
  1. Date utility tests cover format correctness, zero-padding, month/year boundary cases, and local-vs-UTC behavior
  2. All ~10 rowToX mapper functions across the 5 DB modules are exported and have tests verifying field mapping and type coercion (snake_case to camelCase, integer booleans, null handling)
**Plans**: 1 plan

Plans:
- [x] 16-01-PLAN.md -- Date utility tests and DB row mapper export + tests (exercises, sessions, sets, programs, protein)

### Phase 17: DB Business Logic Tests
**Goal**: All database business logic functions have tests with mocked SQL results, covering CRUD operations, edge cases, and complex queries
**Depends on**: Phase 16 (mappers tested, mock patterns established)
**Requirements**: DBLG-01, DBLG-02, DBLG-03, DBLG-04, DBLG-05, DBLG-06, DBLG-07, DBLG-08
**Success Criteria** (what must be TRUE):
  1. exercises.ts, sessions.ts, sets.ts, and programs.ts functions each have tests covering both happy path and error/edge cases (empty results, no prior sets for PR check, superset group remapping)
  2. protein.ts streak and average calculations are tested with consecutive-day, gap, and today-boundary scenarios
  3. dashboard.ts complex query functions (progress, history, completion, export) have tests with representative mocked result sets
  4. calendar.ts and seed.ts functions are tested including the seedIfEmpty empty vs non-empty distinction
**Plans**: 3 plans

Plans:
- [ ] 17-01-PLAN.md -- exercises.ts, sessions.ts, sets.ts business logic tests
- [ ] 17-02-PLAN.md -- programs.ts (including superset operations) and protein.ts tests
- [ ] 17-03-PLAN.md -- dashboard.ts, calendar.ts, and seed.ts tests

### Phase 18: Component and Context Tests
**Goal**: All UI components and context providers have tests verifying rendering, user interaction, state transitions, and side effects
**Depends on**: Phase 15 (renderWithProviders available)
**Requirements**: COMP-01, COMP-02, CTX-01, CTX-02
**Success Criteria** (what must be TRUE):
  1. Simple components (PrimaryButton, MealTypePills, QuickAddButtons, StreakAverageRow, GhostReference, RestTimerBanner, ProgramTargetReference, ExerciseCategoryTabs, SetListItem, MealListItem) render correctly and invoke callbacks when interacted with
  2. Complex components and modals (RenameModal, EditTargetsModal, GoalSetupForm, ProteinProgressBar, PRToast, ProteinChart) handle validation, empty state, and form submission
  3. SessionContext tests confirm session lifecycle transitions (start, add exercise, complete, toggle, delete) and loading state
  4. TimerContext tests confirm countdown ticks, haptic/sound triggers at countdown milestones, and timer cleanup on unmount
**Plans**: TBD

Plans:
- [ ] 18-01: Simple component tests (10 components)
- [ ] 18-02: Complex component and modal tests (6 components)
- [ ] 18-03: SessionContext and TimerContext tests

### Phase 19: Screens Part 1
**Goal**: All simpler screens and modal screens have tests confirming they render correctly, load data, and handle user interactions
**Depends on**: Phase 18 (context mocks verified, component patterns established)
**Requirements**: SCRN-01, SCRN-02
**Success Criteria** (what must be TRUE):
  1. Dashboard, Protein, Programs, ExerciseProgress, Calendar, CalendarDayDetail, Library, Settings, and MealLibrary screens each render without errors given mocked navigation and context
  2. Each simpler screen's primary data-loading path and at least one user interaction (tap, delete, create) are covered by tests
  3. Modal screens (AddMeal, EditMeal, AddExercise, etc.) have form validation tests confirming empty inputs are rejected and valid inputs trigger the correct submit callback
**Plans**: TBD

Plans:
- [ ] 19-01: Dashboard, Protein, Programs, ExerciseProgress screen tests
- [ ] 19-02: Calendar, CalendarDayDetail, Library, Settings, MealLibrary screen tests and modal screen tests

### Phase 20: Screens Part 2
**Goal**: The four most complex screens — WorkoutScreen, ProgramDetailScreen, DayDetailScreen, and SetLoggingPanel — have tests covering their core flows including superset-specific behavior
**Depends on**: Phase 19 (screen test patterns established)
**Requirements**: SCRN-03, SCRN-04, SCRN-05, SCRN-06
**Success Criteria** (what must be TRUE):
  1. WorkoutScreen tests cover: starting a workout, rendering the exercise list, superset grouping display, rest timer interaction, and ending the session
  2. ProgramDetailScreen tests cover: day list rendering, adding/removing a day, and superset group display
  3. DayDetailScreen tests cover: exercise list rendering, adding/removing an exercise, and the superset multi-select flow
  4. SetLoggingPanel tests cover: reps mode, timed mode, weight stepper increments/decrements, and the confirm-set action
**Plans**: TBD

Plans:
- [ ] 20-01: WorkoutScreen tests (start session, exercise flow, superset, rest timer, end session)
- [ ] 20-02: ProgramDetailScreen, DayDetailScreen, and SetLoggingPanel tests

### Phase 21: Gap Closing
**Goal**: The full test suite passes with 80%+ global line coverage confirmed by the Jest coverage report
**Depends on**: Phase 20 (all planned tests written)
**Requirements**: GAP-01, GAP-02
**Success Criteria** (what must be TRUE):
  1. `npm run test:coverage` completes with the global line coverage threshold met — no threshold failure in the Jest output
  2. The lcov HTML report confirms no individual source file critical to the app's behavior is below 80% coverage
**Plans**: TBD

Plans:
- [ ] 21-01: Run coverage report, identify sub-80% files, write targeted gap-closing tests

## Progress

**Execution Order:**
Phase 15 -> 16 -> 17 -> 18 -> 19 -> 20 -> 21

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 4. Data Foundation | v1.1 | 2/2 | Complete | 2026-03-07 |
| 5. Protein Tab and Meal Logging | v1.1 | 2/2 | Complete | 2026-03-08 |
| 6. Protein Intake Chart | v1.1 | 1/1 | Complete | 2026-03-08 |
| 7. Polish and Differentiators | v1.1 | 2/2 | Complete | 2026-03-08 |
| 8. Meal Library | v1.2 | 2/2 | Complete | 2026-03-09 |
| 9. Faster Set Logging | v1.3 | 1/1 | Complete | 2026-03-11 |
| 10. PR Detection & Volume Tracking | v1.3 | 2/2 | Complete | 2026-03-12 |
| 11. Quick-Start & Rest Timer | v1.3 | 2/2 | Complete | 2026-03-12 |
| 12. Workout Summary | v1.3 | 1/1 | Complete | 2026-03-12 |
| 13. Calendar View | v1.3 | 2/2 | Complete | 2026-03-14 |
| 14. Superset Support | v1.3 | 2/2 | Complete | 2026-03-14 |
| 15. Test Infrastructure | 2/2 | Complete    | 2026-03-15 | - |
| 16. Utility and Mapper Tests | 1/1 | Complete    | 2026-03-15 | - |
| 17. DB Business Logic Tests | 1/3 | In Progress|  | - |
| 18. Component and Context Tests | v1.4 | 0/3 | Not started | - |
| 19. Screens Part 1 | v1.4 | 0/2 | Not started | - |
| 20. Screens Part 2 | v1.4 | 0/2 | Not started | - |
| 21. Gap Closing | v1.4 | 0/1 | Not started | - |
