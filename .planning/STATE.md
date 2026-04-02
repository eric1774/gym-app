---
gsd_state_version: 1.0
milestone: v1.7
milestone_name: Macros Tracking
status: Ready to discuss/plan
stopped_at: Completed 31-01-PLAN.md
last_updated: "2026-04-02T20:43:04.000Z"
last_activity: 2026-04-02
progress:
  total_phases: 4
  completed_phases: 1
  total_plans: 4
  completed_plans: 3
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-04-01)

**Core value:** Fast, frictionless set logging mid-workout
**Current focus:** Phase 31 — Goal Setting, Progress & Charts

## Current Position

Phase: 31 (Goal Setting, Progress & Charts) — IN PROGRESS
Plan: 1 of 2 complete
Status: Plan 01 complete — Plan 02 next
Last activity: 2026-04-02

```
Progress: [=======             ] 1/4 phases complete (3/4 plans)
```

## Performance Metrics

| Metric | Value |
|--------|-------|
| Phases this milestone | 4 |
| Phases complete | 1 |
| Plans complete (Phase 30) | 2/2 |
| Requirements mapped | 24/24 |
| 30-01 duration | 16 min |
| 30-01 tasks | 2 |
| 30-01 files | 6 |
| 30-02 duration | ~8 min |
| 30-02 tasks | 2 |
| 30-02 files | 5 |
| 31-01 duration | ~4 min |
| 31-01 tasks | 2 |
| 31-01 files | 2 |

## Accumulated Context

### Decisions

**Streak semantics (Phase 30 gate):** Streak = protein goal met only. Backward compatible with existing streak counts. Adding carbs/fat goals does not change streak behavior. Locked in before macros.ts implements getStreakDays.

**Legacy meal badge display:** Hide zero-value macros on meal badges. Pre-migration meals with DEFAULT 0 carbs/fat show only protein badge (not "0g C" / "0g F"). Consistent with the general rule: only non-zero macros displayed.

**protein.ts frozen throughout:** Never modify protein.ts or its test suite. macros.ts is the new parallel module that replaces protein.ts as the DB layer for all screens.

**computeCalories location:** src/utils/macros.ts — single shared function prevents rounding inconsistency across 4+ display sites.

**Macro colors:** Protein #8DC28A (mint), Carbs #5B9BF0 (blue), Fat #E8845C (coral) — sourced from existing src/theme/colors.ts palette.

- [Phase 30-db-foundation]: macrosDb namespace export instead of named re-exports — protein.ts is frozen (D-07) so same names can't coexist in barrel
- [Phase 30-db-foundation]: getStreakDays reads protein_goal from macro_settings (not protein_settings) per D-10 — streak is protein-only, carb/fat goals ignored
- [Phase 31-01]: MacroGoalSetupForm only sends carbs/fat to setMacroGoals when > 0 to preserve NULL in DB for truly unset macros
- [Phase 31-01]: MacroProgressCard uses React.Fragment for each macro row with divider, single editingMacro state for one-at-a-time inline edit

### Pending Todos

- [x] Confirm streak semantics with user before closing Phase 30 (protein-only — confirmed by implementation)
- [ ] Real-device test on Android for fat grams input visibility above keyboard (Phase 32 acceptance criterion)
- [ ] On-device v10 migration test (Phase 30 HUMAN-UAT: 2 items pending)

### Blockers/Concerns

None.

## Session Continuity

Last session: 2026-04-02T20:43:04.000Z
Stopped at: Completed 31-01-PLAN.md — MacroProgressCard and MacroGoalSetupForm created
Resume file: .planning/phases/31-goal-setting-progress-charts/31-02-PLAN.md
Next step: Execute Phase 31 Plan 02 — wire MacroProgressCard/MacroGoalSetupForm into ProteinScreen
