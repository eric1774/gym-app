# Roadmap: GymTrack

## Milestones

- **v1.0 MVP** - Phases 1-3 (shipped)
- **v1.1 Protein Tracking** - Phases 4-7 (in progress)

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

<details>
<summary>v1.0 MVP (Phases 1-3) - SHIPPED</summary>

Phases 1-3 delivered core workout tracking: programs, exercise logging, rest timer, dashboard, and exercise history.

</details>

### v1.1 Protein Tracking (In Progress)

**Milestone Goal:** Add daily protein intake tracking with meal logging, configurable goals, progress visualization, and history charts to the existing gym tracking app.

- [x] **Phase 4: Data Foundation** - Schema migration system, protein tables, repository, and local-date infrastructure
- [ ] **Phase 5: Protein Tab and Meal Logging** - New bottom tab with goal progress bar, meal add/edit/delete, and today's meal history
- [ ] **Phase 6: Protein Intake Chart** - Line chart of daily protein totals with day/week/month filtering
- [ ] **Phase 7: Polish and Differentiators** - Quick-add buttons, goal streak indicator, and rolling weekly average

## Phase Details

### Phase 4: Data Foundation
**Goal**: Protein data layer exists and handles local-date boundaries correctly
**Depends on**: Nothing (first phase of v1.1; v1.0 infrastructure is complete)
**Requirements**: DATA-01, DATA-02
**Success Criteria** (what must be TRUE):
  1. App launches with protein tables (meals, protein_settings) created via a versioned migration system that will not break on future schema changes
  2. A meal inserted at 11:30 PM local time appears under "today" (not tomorrow), confirming local-date aggregation works correctly
  3. All protein repository functions (add, update, delete, query meals; get/set goal; get chart data) return correct results when called directly
**Plans**: 2 plans

Plans:
- [x] 04-01-PLAN.md -- Types, date utility, migration system, and initDatabase refactor
- [x] 04-02-PLAN.md -- Protein repository (meals CRUD, goal management, aggregation queries)

### Phase 5: Protein Tab and Meal Logging
**Goal**: Users can track daily protein intake through a dedicated tab with goal progress and meal management
**Depends on**: Phase 4
**Requirements**: NAV-01, GOAL-01, GOAL-02, GOAL-03, MEAL-01, MEAL-02, MEAL-03, MEAL-04
**Success Criteria** (what must be TRUE):
  1. User can tap a "Protein" tab with carrot icon in the bottom navigation bar and land on the Protein screen
  2. User can set a daily protein goal and see a progress bar that fills proportionally as meals are logged throughout the day
  3. User can tap "Add Meal", enter protein grams and an optional description, and see the meal appear in today's list within one second
  4. User can tap a meal to edit its description, amount, or date, and can swipe or tap to delete a meal with confirmation
  5. Progress bar resets to zero when the user opens the app on a new calendar day (midnight boundary)
**Plans**: TBD

Plans:
- [ ] 05-01: TBD
- [ ] 05-02: TBD

### Phase 6: Protein Intake Chart
**Goal**: Users can visualize their protein intake history over time with filterable time ranges
**Depends on**: Phase 5
**Requirements**: VIS-01, VIS-02
**Success Criteria** (what must be TRUE):
  1. User can scroll down on the Protein screen and see a line chart showing daily protein totals over time
  2. User can tap filter pills (1W / 1M / 3M / All) to change the chart's time range, and the chart updates to show only data within that range
  3. Chart renders smoothly with 60+ days of data without visible lag or jank
**Plans**: TBD

Plans:
- [ ] 06-01: TBD

### Phase 7: Polish and Differentiators
**Goal**: Protein tracking becomes faster and more motivating with quick-add shortcuts and streak/average feedback
**Depends on**: Phase 6
**Requirements**: MEAL-05, VIS-03, VIS-04
**Success Criteria** (what must be TRUE):
  1. User can re-log a frequent meal with one tap via quick-add buttons displayed on the Protein screen, without opening the Add Meal modal
  2. User can see a streak indicator showing how many consecutive days they have met their protein goal
  3. User can see a rolling 7-day average of their daily protein intake displayed on the Protein screen
**Plans**: TBD

Plans:
- [ ] 07-01: TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 4 -> 5 -> 6 -> 7

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 4. Data Foundation | v1.1 | 2/2 | Complete | 2026-03-07 |
| 5. Protein Tab and Meal Logging | v1.1 | 0/? | Not started | - |
| 6. Protein Intake Chart | v1.1 | 0/? | Not started | - |
| 7. Polish and Differentiators | v1.1 | 0/? | Not started | - |
