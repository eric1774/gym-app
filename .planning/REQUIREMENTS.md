# Requirements: GymTrack

**Defined:** 2026-03-07
**Core Value:** Fast, frictionless set logging mid-workout

## v1.2 Requirements

Requirements for Meal Library milestone. Each maps to roadmap phases.

### Navigation

- [x] **NAV-02**: User can tap a "Meals" button on the Protein screen (below Add Meal) to navigate to the Meal Library screen

### Meal Library Management

- [x] **LIB-01**: User can view a list of saved meals organized by meal type (Breakfast / Lunch / Dinner / Snack)
- [ ] **LIB-02**: User can add a new meal to the library with name, protein grams, and meal type
- [ ] **LIB-03**: User can swipe to delete a meal from the library

### Quick Logging

- [ ] **LOG-01**: User can tap a meal in the library to instantly add it to today's protein tracking (one-tap, no confirmation)

## v1.1 Requirements (Shipped)

<details>
<summary>All 15 requirements complete</summary>

### Navigation

- [x] **NAV-01**: User can see a "Protein" tab with carrot icon in bottom navigation

### Daily Goal

- [x] **GOAL-01**: User can set a daily protein goal (e.g., 200g)
- [x] **GOAL-02**: User can see a progress bar that fills as meals are logged throughout the day
- [x] **GOAL-03**: Progress bar resets at midnight for each new day

### Meal Logging

- [x] **MEAL-01**: User can tap "Add Meal" to open a modal with protein amount (grams) and description fields
- [x] **MEAL-02**: User can view today's logged meals below the Add Meal button
- [x] **MEAL-03**: User can edit a meal's description, amount, or date from the history view
- [x] **MEAL-04**: User can delete a meal entry from the history view
- [x] **MEAL-05**: User can re-log a frequent meal with one tap via quick-add buttons

### Visualization

- [x] **VIS-01**: User can view a line chart of daily protein totals
- [x] **VIS-02**: User can filter the chart by day, week, or month
- [x] **VIS-03**: User can see a streak indicator showing consecutive days meeting their goal
- [x] **VIS-04**: User can see a rolling 7-day average of protein intake

### Data Infrastructure

- [x] **DATA-01**: Protein data persists in local SQLite with proper schema migration
- [x] **DATA-02**: Daily aggregation uses local date (not UTC) for correct day boundaries

</details>

## v2 Requirements

### Nutrition Expansion

- **NUTR-01**: User can track additional macros (carbs, fats, calories)
- **NUTR-02**: User can set per-day-of-week protein goals (training vs rest days)

## Out of Scope

| Feature | Reason |
|---------|--------|
| Meal editing in library | Keep simple — delete and re-add if wrong |
| Food database / barcode scanning | Violates local-only constraint, 10x scope increase |
| Full macro tracking (carbs, fats, calories) | Deferred to v2 — protein-only keeps scope tight |
| AI photo meal logging | Requires cloud services, violates offline constraint |
| Meal planning / recipes | Out of domain — this is tracking, not planning |
| Social sharing of protein stats | Solo personal use only (project constraint) |
| Calorie tracking beyond protein | Protein-only focus per v1.1 scope |
| Meal photos | Adds complexity without core value |
| Import/export meal library | Future consideration |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| NAV-02 | Phase 8 | Complete |
| LIB-01 | Phase 8 | Complete |
| LIB-02 | Phase 8 | Pending |
| LIB-03 | Phase 8 | Pending |
| LOG-01 | Phase 8 | Pending |

**Coverage:**
- v1.2 requirements: 5 total
- Mapped to phases: 5
- Unmapped: 0

---
*Requirements defined: 2026-03-07*
*Last updated: 2026-03-09 after v1.2 roadmap created*
