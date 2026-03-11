# Requirements: GymTrack

**Defined:** 2026-03-10
**Core Value:** Fast, frictionless set logging mid-workout — log weight + reps in two taps, start your rest timer, and get back to lifting.

## v1.3 Requirements

Requirements for Workout Intelligence & Speed milestone. Each maps to roadmap phases.

### Set Logging

- [x] **LOG-01**: User can tap +/-5 buttons to increment/decrement weight without typing
- [x] **LOG-02**: User sees weight input pre-filled from most recent intra-session set when re-expanding the logging panel
- [x] **LOG-03**: User feels haptic feedback on set confirm, exercise complete, and end workout

### Records

- [ ] **REC-01**: User sees an animated PR toast when logging a set that exceeds all previous weight+reps for that exercise
- [ ] **REC-02**: User feels double haptic feedback when a PR is detected
- [ ] **REC-03**: User can see running total volume (weight x reps) in the workout header during a session

### Navigation

- [ ] **NAV-01**: User can see a "Next Workout" card on the dashboard showing the next unfinished program day
- [ ] **NAV-02**: User can tap the Next Workout card to start a workout session in one tap

### Rest Timer

- [ ] **REST-01**: User can see the configured rest duration per exercise during a workout
- [ ] **REST-02**: User can edit rest duration per exercise during a workout
- [ ] **REST-03**: Rest timer uses the exercise-specific duration when started

### Summary

- [ ] **SUM-01**: User sees a workout completion summary after ending a workout (duration, sets, volume, exercises, PRs)
- [ ] **SUM-02**: User can dismiss the summary to return to the workout screen

### Calendar

- [ ] **CAL-01**: User can view a monthly calendar grid showing which days had workouts
- [ ] **CAL-02**: User can navigate between months
- [ ] **CAL-03**: User can tap a day to see session details (duration, exercise count, volume, program day)

### Supersets

- [ ] **SUP-01**: User can group 2-3 exercises as a superset within a program day
- [ ] **SUP-02**: User can see superset grouping visually during a workout
- [ ] **SUP-03**: After logging a set in a superset, the next exercise in the group auto-expands
- [ ] **SUP-04**: Rest timer starts after the last exercise in a superset group

## Previous Milestones (Shipped)

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
| Social/sharing features | Solo personal use only |
| Cloud sync or internet | Fully local app |
| iOS support | Android only for now |
| AI program suggestions | User builds their own programs |
| Workout notes (v1.3) | Deferred — not critical for workout intelligence |
| Food database / barcode scanning | Violates local-only constraint |
| AI photo meal logging | Requires cloud services |
| Meal planning / recipes | Out of domain — this is tracking, not planning |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| LOG-01 | Phase 9 | Complete |
| LOG-02 | Phase 9 | Complete |
| LOG-03 | Phase 9 | Complete |
| REC-01 | Phase 10 | Pending |
| REC-02 | Phase 10 | Pending |
| REC-03 | Phase 10 | Pending |
| NAV-01 | Phase 11 | Pending |
| NAV-02 | Phase 11 | Pending |
| REST-01 | Phase 11 | Pending |
| REST-02 | Phase 11 | Pending |
| REST-03 | Phase 11 | Pending |
| SUM-01 | Phase 12 | Pending |
| SUM-02 | Phase 12 | Pending |
| CAL-01 | Phase 13 | Pending |
| CAL-02 | Phase 13 | Pending |
| CAL-03 | Phase 13 | Pending |
| SUP-01 | Phase 14 | Pending |
| SUP-02 | Phase 14 | Pending |
| SUP-03 | Phase 14 | Pending |
| SUP-04 | Phase 14 | Pending |

**Coverage:**
- v1.3 requirements: 20 total
- Mapped to phases: 20
- Unmapped: 0 ✓

---
*Requirements defined: 2026-03-10*
*Last updated: 2026-03-10 after v1.3 roadmap creation*
