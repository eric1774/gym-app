---
phase: 31-goal-setting-progress-charts
plan: 01
subsystem: ui-components
tags: [macros, progress-card, goal-setup, react-native, v1.7]
requirements: [GOAL-01, GOAL-02, GOAL-03, GOAL-04, GOAL-05, GOAL-06]
dependency_graph:
  requires:
    - 30-db-foundation/30-02 (macrosDb namespace — getMacroGoals, setMacroGoals, getTodayMacroTotals)
    - src/types/index.ts (MacroType, MACRO_COLORS, MacroValues, MacroSettings)
    - src/utils/macros.ts (computeCalories)
  provides:
    - src/components/MacroProgressCard.tsx (exported: MacroProgressCard)
    - src/components/MacroGoalSetupForm.tsx (exported: MacroGoalSetupForm)
  affects:
    - ProteinScreen.tsx (Plan 02 will wire these in)
tech_stack:
  added: []
  patterns:
    - Per-bar inline edit: state toggle swaps one bar row to TextInput + Save/Discard at a time
    - MacroType array map: iterate ['protein','carbs','fat'] for all three bar rows
    - Macro color lookup: MACRO_COLORS[macroType] for all colored elements
    - computeCalories from utils for calorie total and live estimate
key_files:
  created:
    - src/components/MacroProgressCard.tsx
    - src/components/MacroGoalSetupForm.tsx
  modified: []
key_decisions:
  - MacroProgressCard uses React.Fragment with dividers between rows rather than separate card sections
  - MacroGoalSetupForm sends only non-zero carbs/fat to setMacroGoals to preserve NULL in DB
  - Calorie total formatted with toLocaleString for comma separators on large numbers
metrics:
  duration_seconds: 228
  completed_date: "2026-04-02"
  tasks_completed: 2
  files_changed: 2
---

# Phase 31 Plan 01: Goal Setting & Progress Card Components Summary

**One-liner:** MacroProgressCard with three P/C/F progress bars and inline per-bar goal editing, plus MacroGoalSetupForm 3-input first-time setup with live calorie estimate — both consuming macrosDb from Phase 30.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Create MacroProgressCard component | bfe9633 | src/components/MacroProgressCard.tsx |
| 2 | Create MacroGoalSetupForm component | 4f482e5 | src/components/MacroGoalSetupForm.tsx |

## What Was Built

### MacroProgressCard (`src/components/MacroProgressCard.tsx`)

A single card with three stacked macro progress bar rows and a calorie total header, replacing `ProteinProgressBar.tsx`.

- **Header row:** "DAILY MACROS" label left, computed calorie total right (via `computeCalories(todayTotals.protein, todayTotals.carbs, todayTotals.fat)`)
- **Three bar rows (P/C/F):** Each shows the macro letter in its color, a colored fill bar (height 8px), percentage text, and gram values below (`{current}g / {goal}g`)
- **Inline edit mode:** Tapping a bar row swaps it to a TextInput with borderColor matching the macro's color, "Save Goal" and "Discard" buttons. One macro edits at a time.
- **Unset placeholder:** When goal is null, shows `{letter} ─── Tap to set goal` using a 1px View line, tapping opens inline edit
- **Goal save:** Calls `macrosDb.setMacroGoals({ [macroType]: value })` on save, then fires `onGoalChanged()` callback
- Complies with UI-SPEC: `borderRadius: 14`, only `weightBold`/`weightRegular`, `MACRO_COLORS` for all macro-colored elements, `spacing.sm/base` standard tokens

### MacroGoalSetupForm (`src/components/MacroGoalSetupForm.tsx`)

A first-time 3-input goal setup form shown when no macro_settings row exists, replacing `GoalSetupForm.tsx`.

- **Three stacked inputs:** Protein (required), Carbs (optional), Fat (optional) with `spacing.sm` gap
- **Focus chaining:** `useRef` on Carbs and Fat inputs, `returnKeyType="next"` advances focus via `onSubmitEditing`
- **Live calorie estimate:** Updates per keystroke — `~ {N} calories/day` using `computeCalories`
- **Validation:** Protein must be positive integer; Carbs/Fat default to 0 (not sent as null) if empty
- **Save:** Calls `macrosDb.setMacroGoals({ protein, carbs?, fat? })` — only sends carbs/fat if > 0 to preserve NULL in DB
- **Button state:** `opacity: 0.5` when protein is empty/invalid; enabled once protein has a valid value
- Complies with UI-SPEC: `borderRadius: 16`, `padding: spacing.xl`, `marginTop: spacing.xxxl`

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None. Both components fully wired to macrosDb functions with real DB calls.

## Self-Check: PASSED

- [x] src/components/MacroProgressCard.tsx exists
- [x] src/components/MacroGoalSetupForm.tsx exists
- [x] Commit bfe9633 exists
- [x] Commit 4f482e5 exists
