# Roadmap: GymTrack

## Milestones

- **v1.0 MVP** - Phases 1-3 (shipped)
- **v1.1 Protein Tracking** - Phases 4-7 (shipped)
- **v1.2 Meal Library** - Phase 8 (shipped)
- **v1.3 Workout Intelligence & Speed** - Phases 9-14 (in progress)

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

### v1.3 Workout Intelligence & Speed

**Milestone Goal:** Reduce friction on set logging, add motivation through PR detection, and surface workout intelligence (volume, summaries, calendar, supersets).

- [x] **Phase 9: Faster Set Logging** - Weight steppers, auto-fill fix, and haptic feedback throughout workout flow (completed 2026-03-10)
- [x] **Phase 10: PR Detection & Volume Tracking** - Animated PR toast with double haptic, running volume total in workout header (completed 2026-03-12)
- [ ] **Phase 11: Quick-Start & Rest Timer** - Next Workout dashboard card and per-exercise rest timer configuration
- [ ] **Phase 12: Workout Summary** - Completion summary screen shown after ending a workout
- [ ] **Phase 13: Calendar View** - Monthly calendar grid showing training history with day detail view
- [ ] **Phase 14: Superset Support** - Superset grouping in programs, alternating set flow in workouts (DB migration v6)

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
- [ ] 11-01-PLAN.md -- Next Workout card on dashboard with quick-start and active session state
- [ ] 11-02-PLAN.md -- Per-exercise rest duration display, +/-15s steppers, and timer integration

### Phase 12: Workout Summary
**Goal**: Users see a satisfying summary of their completed workout before returning to the home screen
**Depends on**: Phase 10 (PR list and volume data available)
**Requirements**: SUM-01, SUM-02
**Success Criteria** (what must be TRUE):
  1. After tapping "End Workout," a summary screen appears showing session duration, total sets, total volume, exercises completed, and PRs hit during the session
  2. User can tap a dismiss button to leave the summary and return to an empty workout screen
**Plans**: TBD

### Phase 13: Calendar View
**Goal**: Users can see their full training history laid out on a monthly calendar and drill into any day's session details
**Depends on**: Phase 12
**Requirements**: CAL-01, CAL-02, CAL-03
**Success Criteria** (what must be TRUE):
  1. A calendar screen renders the current month as a 7-column grid with mint dot indicators on days that had workouts
  2. User can tap left/right arrows to navigate to adjacent months and the grid updates accordingly
  3. Tapping a day that had a workout reveals session details including duration, exercise count, volume, and program day name
**Plans**: TBD

### Phase 14: Superset Support
**Goal**: Users can group exercises as supersets in their programs and experience a seamless alternating-set flow during workouts
**Depends on**: Phase 11 (per-exercise rest timer required for superset rest behavior)
**Requirements**: SUP-01, SUP-02, SUP-03, SUP-04
**Success Criteria** (what must be TRUE):
  1. In a program day, user can select 2-3 exercises and group them as a superset, with a visual badge confirming the grouping
  2. During a workout, superset exercises are rendered inside a shared container with a connecting visual indicator
  3. After logging a set for any exercise in a superset (except the last), the next exercise in the group auto-expands immediately
  4. After logging a set for the last exercise in a superset group, the rest timer prompt appears using that exercise's configured rest duration
**Plans**: TBD

## Progress

**Execution Order:**
Phase 9 -> 10 -> 11 -> 12 -> 13 -> 14

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 4. Data Foundation | v1.1 | 2/2 | Complete | 2026-03-07 |
| 5. Protein Tab and Meal Logging | v1.1 | 2/2 | Complete | 2026-03-08 |
| 6. Protein Intake Chart | v1.1 | 1/1 | Complete | 2026-03-08 |
| 7. Polish and Differentiators | v1.1 | 2/2 | Complete | 2026-03-08 |
| 8. Meal Library | v1.2 | 2/2 | Complete | 2026-03-09 |
| 9. Faster Set Logging | v1.3 | 1/1 | Complete | 2026-03-11 |
| 10. PR Detection & Volume Tracking | v1.3 | 2/2 | Complete | 2026-03-12 |
| 11. Quick-Start & Rest Timer | 1/2 | In Progress|  | - |
| 12. Workout Summary | v1.3 | 0/? | Not started | - |
| 13. Calendar View | v1.3 | 0/? | Not started | - |
| 14. Superset Support | v1.3 | 0/? | Not started | - |
