# Requirements: GymTrack

**Defined:** 2026-03-07
**Core Value:** Fast, frictionless set logging mid-workout

## v1.1 Requirements

Requirements for protein tracking milestone. Each maps to roadmap phases.

### Navigation

- [ ] **NAV-01**: User can see a "Protein" tab with carrot icon in bottom navigation

### Daily Goal

- [ ] **GOAL-01**: User can set a daily protein goal (e.g., 200g)
- [ ] **GOAL-02**: User can see a progress bar that fills as meals are logged throughout the day
- [ ] **GOAL-03**: Progress bar resets at midnight for each new day

### Meal Logging

- [ ] **MEAL-01**: User can tap "Add Meal" to open a modal with protein amount (grams) and description fields
- [ ] **MEAL-02**: User can view today's logged meals below the Add Meal button
- [ ] **MEAL-03**: User can edit a meal's description, amount, or date from the history view
- [ ] **MEAL-04**: User can delete a meal entry from the history view
- [ ] **MEAL-05**: User can re-log a frequent meal with one tap via quick-add buttons

### Visualization

- [ ] **VIS-01**: User can view a line chart of daily protein totals
- [ ] **VIS-02**: User can filter the chart by day, week, or month
- [ ] **VIS-03**: User can see a streak indicator showing consecutive days meeting their goal
- [ ] **VIS-04**: User can see a rolling 7-day average of protein intake

### Data Infrastructure

- [x] **DATA-01**: Protein data persists in local SQLite with proper schema migration
- [x] **DATA-02**: Daily aggregation uses local date (not UTC) for correct day boundaries

## v2 Requirements

### Nutrition Expansion

- **NUTR-01**: User can track additional macros (carbs, fats, calories)
- **NUTR-02**: User can set per-day-of-week protein goals (training vs rest days)

## Out of Scope

| Feature | Reason |
|---------|--------|
| Food database / barcode scanning | Violates local-only constraint, 10x scope increase |
| Full macro tracking (carbs, fats, calories) | Deferred to v2 -- protein-only keeps scope tight |
| AI photo meal logging | Requires cloud services, violates offline constraint |
| Meal planning / recipes | Out of domain -- this is tracking, not planning |
| Social sharing of protein stats | Solo personal use only (project constraint) |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| DATA-01 | Phase 4 | Complete |
| DATA-02 | Phase 4 | Complete |
| NAV-01 | Phase 5 | Pending |
| GOAL-01 | Phase 5 | Pending |
| GOAL-02 | Phase 5 | Pending |
| GOAL-03 | Phase 5 | Pending |
| MEAL-01 | Phase 5 | Pending |
| MEAL-02 | Phase 5 | Pending |
| MEAL-03 | Phase 5 | Pending |
| MEAL-04 | Phase 5 | Pending |
| VIS-01 | Phase 6 | Pending |
| VIS-02 | Phase 6 | Pending |
| MEAL-05 | Phase 7 | Pending |
| VIS-03 | Phase 7 | Pending |
| VIS-04 | Phase 7 | Pending |

**Coverage:**
- v1.1 requirements: 15 total
- Mapped to phases: 15
- Unmapped: 0

---
*Requirements defined: 2026-03-07*
*Last updated: 2026-03-07 after roadmap creation*
