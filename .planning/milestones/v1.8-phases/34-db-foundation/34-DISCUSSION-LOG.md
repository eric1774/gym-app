# Phase 34: DB Foundation - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-04
**Phase:** 34-db-foundation
**Areas discussed:** Module export pattern, Table schema design, Streak & average semantics

---

## Module Export Pattern

| Option | Description | Selected |
|--------|-------------|----------|
| Namespace export | `import * as hydrationDb` — consistent with macrosDb, avoids getStreakDays/get7DayAverage collision | ✓ |
| Direct named exports | `export { getWaterGoal, ... }` — simpler imports but risks collision | |
| You decide | Claude picks during implementation | |

**User's choice:** Namespace export (hydrationDb)
**Notes:** Consistency with macrosDb pattern was the deciding factor. Name collision with protein.ts exports (getStreakDays, get7DayAverage) confirmed the need.

---

## Table Schema Design

### amount_oz column type

| Option | Description | Selected |
|--------|-------------|----------|
| INTEGER | Whole ounces only — quick-add buttons are 8/16/24, simplest math | ✓ |
| REAL | Fractional ounces — more precise but unnecessary complexity | |

**User's choice:** INTEGER
**Notes:** All UI entry points use whole numbers.

### Description column on water_logs

| Option | Description | Selected |
|--------|-------------|----------|
| No description | Water is water — just amount, timestamps | ✓ |
| Source label | Optional text like 'water bottle' — useful if history view added later | |

**User's choice:** No description
**Notes:** Add-only model with no history list makes descriptions pointless.

### water_settings scope

| Option | Description | Selected |
|--------|-------------|----------|
| Just goal_oz | Minimal: id, goal_oz, created_at, updated_at | ✓ |
| Goal + unit preference | Add unit column for future metric support | |

**User's choice:** Just goal_oz
**Notes:** Metric units explicitly out of scope for v1.8.

---

## Streak & Average Semantics

### get7DayAverage return type

| Option | Description | Selected |
|--------|-------------|----------|
| Raw oz average | Return average daily oz — UI computes % from goal | ✓ |
| Percentage of goal | Return % directly — couples DB to goal value | |

**User's choice:** Raw oz average
**Notes:** Parallels macros get7DayAverage returning raw grams. UI computes display values.

### Zero-day handling

| Option | Description | Selected |
|--------|-------------|----------|
| Count zero days | Average across all 7 days including zeros — missed days drag average down | ✓ |
| Only active days | Average only days with logs — hides missed days | |

**User's choice:** Count zero days
**Notes:** Meaningful difference from macros. For hydration, missing a day should impact the average. Divide by 7 always, not by count of active days.

---

## Claude's Discretion

- Row mapper naming and structure
- SQL query structure for aggregations
- Test fixture design

## Deferred Ideas

None — discussion stayed within phase scope
