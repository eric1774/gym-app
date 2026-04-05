# Requirements: GymTrack

**Defined:** 2026-04-04
**Core Value:** Fast, frictionless set logging mid-workout

## v1.8 Requirements

Requirements for Hydration Tracker milestone. Each maps to roadmap phases.

### Navigation

- [x] **TAB-01**: User can see a tab bar with "Macros" and "Hydration" tabs at the top of the Protein screen, defaulting to Macros
- [x] **TAB-02**: Existing macros content is extracted into a MacrosView component with no behavior changes (pure refactor)

### Hydration

- [ ] **HYD-01**: User can see a cup visualization with gradient fill proportional to their daily water intake vs goal
- [ ] **HYD-02**: User can tap "+ Log Water" to open a modal, enter a custom fl oz amount, and save it to today's total
- [ ] **HYD-03**: User can tap +8 oz, +16 oz, or +24 oz quick-add buttons to instantly log water with haptic feedback
- [ ] **HYD-04**: User can see their current hydration streak (consecutive days meeting goal) and weekly average (% of goal met over 7 days)

### Goals

- [ ] **GOAL-01**: User sees a first-use setup card prompting them to set a daily water goal in fl oz (default 64) when no goal exists
- [ ] **GOAL-02**: User can tap the goal display to inline-edit their water goal, with save/cancel and immediate recalculation of stats

### Database

- [ ] **DB-01**: App migrates to schema v11 with water_logs and water_settings tables
- [ ] **DB-02**: hydration.ts module exports getWaterGoal, setWaterGoal, logWater, getTodayWaterTotal, getStreakDays, and get7DayAverage

## Future Requirements

None — hydration scope is self-contained for v1.8.

## Out of Scope

| Feature | Reason |
|---------|--------|
| Custom quick-add amounts | Fixed +8/+16/+24 oz covers standard sizes; add later if needed |
| Water log history list | Add-only model keeps UX simple; no individual entry view |
| History chart for water intake | Cup visualization + stats cards are sufficient |
| Hydration reminders/notifications | App is local-only, no notification infrastructure |
| Metric units (ml) | Fl oz only for now; can add unit toggle in future milestone |
| Delete/edit water entries | Add-only keeps the interaction fast and simple |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| TAB-01 | Phase 35 | Complete |
| TAB-02 | Phase 35 | Complete |
| HYD-01 | Phase 35 | Pending |
| HYD-02 | Phase 35 | Pending |
| HYD-03 | Phase 35 | Pending |
| HYD-04 | Phase 36 | Pending |
| GOAL-01 | Phase 36 | Pending |
| GOAL-02 | Phase 36 | Pending |
| DB-01 | Phase 34 | Pending |
| DB-02 | Phase 34 | Pending |

**Coverage:**
- v1.8 requirements: 10 total
- Mapped to phases: 10
- Unmapped: 0

---
*Requirements defined: 2026-04-04*
*Last updated: 2026-04-04 — traceability filled after roadmap creation*
