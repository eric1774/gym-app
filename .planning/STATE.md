---
gsd_state_version: 1.0
milestone: v1.7
milestone_name: Macros Tracking
status: executing
stopped_at: Completed 30-02-PLAN.md
last_updated: "2026-04-02T17:04:05.168Z"
last_activity: 2026-04-02
progress:
  total_phases: 4
  completed_phases: 1
  total_plans: 2
  completed_plans: 2
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-04-01)

**Core value:** Fast, frictionless set logging mid-workout
**Current focus:** Phase 30 — db-foundation

## Current Position

Phase: 30 (db-foundation) — EXECUTING
Plan: 2 of 2
Status: Ready to execute
Last activity: 2026-04-02

```
Progress: [==                  ] 0/4 phases complete (Plan 01/02 done in Phase 30)
```

## Performance Metrics

| Metric | Value |
|--------|-------|
| Phases this milestone | 4 |
| Phases complete | 0 |
| Plans complete | 1 |
| Requirements mapped | 24/24 |
| 30-01 duration | 16 min |
| 30-01 tasks | 2 |
| 30-01 files | 6 |
| Phase 30-db-foundation P02 | 8 | 2 tasks | 5 files |

## Accumulated Context

### Decisions

**Streak semantics (Phase 30 gate):** Streak = protein goal met only. Backward compatible with existing streak counts. Adding carbs/fat goals does not change streak behavior. Locked in before macros.ts implements getStreakDays.

**Legacy meal badge display:** Hide zero-value macros on meal badges. Pre-migration meals with DEFAULT 0 carbs/fat show only protein badge (not "0g C" / "0g F"). Consistent with the general rule: only non-zero macros displayed.

**protein.ts frozen throughout:** Never modify protein.ts or its test suite. macros.ts is the new parallel module that replaces protein.ts as the DB layer for all screens.

**computeCalories location:** src/utils/macros.ts — single shared function prevents rounding inconsistency across 4+ display sites.

**Macro colors:** Protein #8DC28A (mint), Carbs #5B9BF0 (blue), Fat #E8845C (coral) — sourced from existing src/theme/colors.ts palette.

- [Phase 30-db-foundation]: macrosDb namespace export instead of named re-exports — protein.ts is frozen (D-07) so same names can't coexist in barrel
- [Phase 30-db-foundation]: getStreakDays reads protein_goal from macro_settings (not protein_settings) per D-10 — streak is protein-only, carb/fat goals ignored

### Pending Todos

- [ ] Confirm streak semantics with user before closing Phase 30 (protein-only recommended)
- [ ] Real-device test on Android for fat grams input visibility above keyboard (Phase 32 acceptance criterion)

### Blockers/Concerns

None.

## Session Continuity

Last session: 2026-04-02T17:04:05.163Z
Stopped at: Completed 30-02-PLAN.md
Resume file: None
Next step: Execute 30-02-PLAN.md
