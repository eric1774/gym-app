# Roadmap: GymTrack

## Milestones

- **v1.0 MVP** - Phases 1-3 (shipped)
- **v1.1 Protein Tracking** - Phases 4-7 (shipped)
- **v1.2 Meal Library** - Phase 8 (shipped)

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

### v1.2 Meal Library

**Milestone Goal:** Add a Meal Library screen for managing saved meals and one-tap logging to today's protein tracking.

- [x] **Phase 8: Meal Library** - Library screen with meal management by type and one-tap protein logging (completed 2026-03-09)

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

## Progress

**Execution Order:**
Phase 8

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 4. Data Foundation | v1.1 | 2/2 | Complete | 2026-03-07 |
| 5. Protein Tab and Meal Logging | v1.1 | 2/2 | Complete | 2026-03-08 |
| 6. Protein Intake Chart | v1.1 | 1/1 | Complete | 2026-03-08 |
| 7. Polish and Differentiators | v1.1 | 2/2 | Complete | 2026-03-08 |
| 8. Meal Library | v1.2 | 2/2 | Complete | 2026-03-09 |
