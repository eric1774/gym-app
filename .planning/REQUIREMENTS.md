# Requirements: GymTrack

**Defined:** 2026-03-15
**Core Value:** Fast, frictionless set logging mid-workout — log weight + reps in two taps, start your rest timer, and get back to lifting.

## v1.4 Requirements

Requirements for Test Coverage milestone. Each maps to roadmap phases.

### Infrastructure (INFRA)

- [x] **INFRA-01**: Jest config has coverage thresholds set to 80% lines globally
- [x] **INFRA-02**: npm script `test:coverage` generates lcov report in coverage/ directory
- [x] **INFRA-03**: Native module mocks exist for all RN deps (sqlite-storage, haptic, sound, svg, safe-area, notifee, background-timer)
- [x] **INFRA-04**: Test utility `renderWithProviders` wraps components with mocked contexts and navigation
- [x] **INFRA-05**: Test utility `mockResultSet` helper generates fake SQL results for DB tests

### Unit Tests (UNIT)

- [x] **UNIT-01**: Date utility functions have tests covering format, zero-padding, and boundary edge cases
- [x] **UNIT-02**: All DB row mapper functions are exported and tested (~10 mappers across 5 DB modules)

### DB Business Logic (DBLG)

- [x] **DBLG-01**: exercises.ts CRUD and search functions have tests with mocked SQL results
- [x] **DBLG-02**: sessions.ts lifecycle functions (create, get, complete, toggle, delete) have tests
- [x] **DBLG-03**: sets.ts functions (logSet, getSets, getLastSessionSets, deleteSet, checkForPR) have tests
- [x] **DBLG-04**: programs.ts CRUD including superset group operations have tests
- [x] **DBLG-05**: protein.ts functions (meals, goals, streaks, averages) have tests
- [x] **DBLG-06**: dashboard.ts query functions (progress, history, completion, export) have tests
- [x] **DBLG-07**: calendar.ts functions (workout days, first session date, day details) have tests
- [x] **DBLG-08**: seed.ts seedIfEmpty has tests for empty and non-empty cases

### Components (COMP)

- [x] **COMP-01**: Simple components (PrimaryButton, MealTypePills, QuickAddButtons, StreakAverageRow, GhostReference, RestTimerBanner, ProgramTargetReference, ExerciseCategoryTabs, SetListItem, MealListItem) have rendering and interaction tests
- [x] **COMP-02**: Complex components and modals (RenameModal, EditTargetsModal, GoalSetupForm, ProteinProgressBar, PRToast, ProteinChart) have tests including validation

### Context Providers (CTX)

- [x] **CTX-01**: SessionContext has tests for session lifecycle and loading state
- [x] **CTX-02**: TimerContext has tests for countdown, haptic/sound triggers, and cleanup

### Screens (SCRN)

- [x] **SCRN-01**: Simple screens (Dashboard, Protein, Programs, ExerciseProgress, Calendar, CalendarDayDetail, Library, Settings, MealLibrary) have rendering and interaction tests
- [x] **SCRN-02**: Modal screens have form validation and submit callback tests
- [x] **SCRN-03**: WorkoutScreen has tests for workout flow, superset grouping, rest timer
- [x] **SCRN-04**: ProgramDetailScreen has tests for day management and superset groups
- [x] **SCRN-05**: DayDetailScreen has tests for exercise management and superset multi-select
- [x] **SCRN-06**: SetLoggingPanel has tests for reps/timed modes and weight stepper

### Gap Closing (GAP)

- [ ] **GAP-01**: Coverage report confirms 80%+ global line coverage
- [ ] **GAP-02**: Files below 80% have targeted tests added to close gaps

## Previous Milestones (Shipped)

<details>
<summary>v1.3 Workout Intelligence & Speed — 20 requirements complete</summary>

- [x] **LOG-01**: User can tap +/-5 buttons to increment/decrement weight without typing
- [x] **LOG-02**: User sees weight input pre-filled from most recent intra-session set when re-expanding the logging panel
- [x] **LOG-03**: User feels haptic feedback on set confirm, exercise complete, and end workout
- [x] **REC-01**: User sees an animated PR toast when logging a set that exceeds all previous weight+reps for that exercise
- [x] **REC-02**: User feels double haptic feedback when a PR is detected
- [x] **REC-03**: User can see running total volume (weight x reps) in the workout header during a session
- [x] **NAV-01**: User can see a "Next Workout" card on the dashboard showing the next unfinished program day
- [x] **NAV-02**: User can tap the Next Workout card to start a workout session in one tap
- [x] **REST-01**: User can see the configured rest duration per exercise during a workout
- [x] **REST-02**: User can edit rest duration per exercise during a workout
- [x] **REST-03**: Rest timer uses the exercise-specific duration when started
- [x] **SUM-01**: User sees a workout completion summary after ending a workout (duration, sets, volume, exercises, PRs)
- [x] **SUM-02**: User can dismiss the summary to return to the workout screen
- [x] **CAL-01**: User can view a monthly calendar grid showing which days had workouts
- [x] **CAL-02**: User can navigate between months
- [x] **CAL-03**: User can tap a day to see session details (duration, exercise count, volume, program day)
- [x] **SUP-01**: User can group 2-3 exercises as a superset within a program day
- [x] **SUP-02**: User can see superset grouping visually during a workout
- [x] **SUP-03**: After logging a set in a superset, the next exercise in the group auto-expands
- [x] **SUP-04**: Rest timer starts after the last exercise in a superset group

</details>

<details>
<summary>v1.2 Meal Library — 5 requirements complete</summary>

- [x] **NAV-02**: User can tap a "Meals" button on the Protein screen to navigate to the Meal Library screen
- [x] **LIB-01**: User can view a list of saved meals organized by meal type
- [x] **LIB-02**: User can add a new meal to the library with name, protein grams, and meal type
- [x] **LIB-03**: User can swipe to delete a meal from the library
- [x] **LOG-01**: User can tap a meal in the library to instantly add it to today's protein tracking

</details>

<details>
<summary>v1.1 Protein Tracking — 15 requirements complete</summary>

- [x] **NAV-01**: User can see a "Protein" tab with carrot icon in bottom navigation
- [x] **GOAL-01**: User can set a daily protein goal
- [x] **GOAL-02**: User can see a progress bar that fills as meals are logged
- [x] **GOAL-03**: Progress bar resets at midnight for each new day
- [x] **MEAL-01**: User can tap "Add Meal" to open a modal with protein amount and description
- [x] **MEAL-02**: User can view today's logged meals
- [x] **MEAL-03**: User can edit a meal's description, amount, or date
- [x] **MEAL-04**: User can delete a meal entry
- [x] **MEAL-05**: User can re-log a frequent meal with one tap via quick-add buttons
- [x] **VIS-01**: User can view a line chart of daily protein totals
- [x] **VIS-02**: User can filter the chart by day, week, or month
- [x] **VIS-03**: User can see a streak indicator
- [x] **VIS-04**: User can see a rolling 7-day average
- [x] **DATA-01**: Protein data persists in local SQLite with proper schema migration
- [x] **DATA-02**: Daily aggregation uses local date for correct day boundaries

</details>

## Future Requirements

### Workout Notes

- **NOTE-01**: User can add notes to a workout session
- **NOTE-02**: User can add notes to an individual exercise session
- **NOTE-03**: Notes display a dot badge when content exists
- **NOTE-04**: DB migration v5 adds notes columns to workout_sessions and exercise_sessions

### Nutrition Expansion

- **NUTR-01**: User can track additional macros (carbs, fats, calories)
- **NUTR-02**: User can set per-day-of-week protein goals (training vs rest days)

## Out of Scope

| Feature | Reason |
|---------|--------|
| SonarQube integration | Excluded per user decision — can add later |
| E2E / integration tests | Unit + component coverage sufficient for 80% target |
| Snapshot tests | Low value, high maintenance for this codebase |
| Social/sharing features | Solo personal use only |
| Cloud sync or internet | Fully local app |
| iOS support | Android only for now |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| INFRA-01 | Phase 15 | Complete |
| INFRA-02 | Phase 15 | Complete |
| INFRA-03 | Phase 15 | Complete |
| INFRA-04 | Phase 15 | Complete |
| INFRA-05 | Phase 15 | Complete |
| UNIT-01 | Phase 16 | Complete |
| UNIT-02 | Phase 16 | Complete |
| DBLG-01 | Phase 17 | Complete |
| DBLG-02 | Phase 17 | Complete |
| DBLG-03 | Phase 17 | Complete |
| DBLG-04 | Phase 17 | Complete |
| DBLG-05 | Phase 17 | Complete |
| DBLG-06 | Phase 17 | Complete |
| DBLG-07 | Phase 17 | Complete |
| DBLG-08 | Phase 17 | Complete |
| COMP-01 | Phase 18 | Complete |
| COMP-02 | Phase 18 | Complete |
| CTX-01 | Phase 18 | Complete |
| CTX-02 | Phase 18 | Complete |
| SCRN-01 | Phase 19 | Complete |
| SCRN-02 | Phase 19 | Complete |
| SCRN-03 | Phase 20 | Complete |
| SCRN-04 | Phase 20 | Complete |
| SCRN-05 | Phase 20 | Complete |
| SCRN-06 | Phase 20 | Complete |
| GAP-01 | Phase 21 | Pending |
| GAP-02 | Phase 21 | Pending |

**Coverage:**
- v1.4 requirements: 27 total
- Mapped to phases: 27
- Unmapped: 0

---
*Requirements defined: 2026-03-15*
*Last updated: 2026-03-15 after v1.4 roadmap creation (Phases 15-21)*
