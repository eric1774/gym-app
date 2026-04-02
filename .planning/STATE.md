---
gsd_state_version: 1.0
milestone: v1.7
milestone_name: Macros Tracking
status: planning
stopped_at: Phase 30 context gathered
last_updated: "2026-04-02T14:56:09.487Z"
last_activity: 2026-04-01 — Roadmap created for v1.7
progress:
  total_phases: 4
  completed_phases: 0
  total_plans: 0
  completed_plans: 0
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-04-01)

**Core value:** Fast, frictionless set logging mid-workout
**Current focus:** v1.7 Macros Tracking — Phase 30: DB Foundation

## Current Position

Phase: 30 — DB Foundation (not started)
Plan: —
Status: Roadmap ready, awaiting planning
Last activity: 2026-04-01 — Roadmap created for v1.7

```
Progress: [                    ] 0/4 phases complete
```

## Performance Metrics

| Metric | Value |
|--------|-------|
| Phases this milestone | 4 |
| Phases complete | 0 |
| Plans complete | 0 |
| Requirements mapped | 24/24 |

## Accumulated Context

### Decisions

**Streak semantics (Phase 30 gate):** Streak = protein goal met only. Backward compatible with existing streak counts. Adding carbs/fat goals does not change streak behavior. Locked in before macros.ts implements getStreakDays.

**Legacy meal badge display:** Hide zero-value macros on meal badges. Pre-migration meals with DEFAULT 0 carbs/fat show only protein badge (not "0g C" / "0g F"). Consistent with the general rule: only non-zero macros displayed.

**protein.ts frozen throughout:** Never modify protein.ts or its test suite. macros.ts is the new parallel module that replaces protein.ts as the DB layer for all screens.

**computeCalories location:** src/utils/macros.ts — single shared function prevents rounding inconsistency across 4+ display sites.

**Macro colors:** Protein #8DC28A (mint), Carbs #5B9BF0 (blue), Fat #E8845C (coral) — sourced from existing src/theme/colors.ts palette.

### Pending Todos

- [ ] Confirm streak semantics with user before closing Phase 30 (protein-only recommended)
- [ ] Real-device test on Android for fat grams input visibility above keyboard (Phase 32 acceptance criterion)

### Blockers/Concerns

None.

## Session Continuity

Last session: 2026-04-02T14:56:09.484Z
Stopped at: Phase 30 context gathered
Resume file: .planning/phases/30-db-foundation/30-CONTEXT.md
Next step: `/gsd:plan-phase 30`
