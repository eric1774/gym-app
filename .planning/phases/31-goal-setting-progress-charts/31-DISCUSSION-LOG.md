# Phase 31: Goal Setting, Progress & Charts - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-02
**Phase:** 31-goal-setting-progress-charts
**Areas discussed:** Progress bar layout, Goal setup & edit flow, Chart tab switching, Calorie display

---

## Progress Bar Layout

| Option | Description | Selected |
|--------|-------------|----------|
| Compact stacked bars | Three thin bars inside one card, each with macro color. P/C/F rows: colored fill + percentage + grams. Card ~120px tall. | ✓ |
| Three separate cards | Keep current ProteinProgressBar style but shrink each. Three independent cards stacked. ~240px total. | |
| Ring/donut charts | Three circular progress rings side-by-side. Compact but different from existing bar pattern. | |

**User's choice:** Compact stacked bars
**Notes:** Card header shows "DAILY MACROS" left and calorie total right.

---

### Unset Macro State (follow-up)

| Option | Description | Selected |
|--------|-------------|----------|
| Muted text row | Same row height, "C ─── Tap to set goal" in secondary color. Keeps vertical rhythm. | ✓ |
| Hidden until set | Only show bars for macros with goals. Card starts with just protein. Layout shifts as goals are added. | |

**User's choice:** Muted text row
**Notes:** Tapping unset row opens inline edit for that macro.

---

## Goal Setup & Edit Flow

### First-time Setup

| Option | Description | Selected |
|--------|-------------|----------|
| Single 3-input form | Replace GoalSetupForm with P/C/F inputs stacked, live calorie estimate, one "Set Goals" button. Protein required, others optional. | ✓ |
| Progressive setup | Show protein first, then offer carbs/fat as follow-up cards. More guided but more taps. | |

**User's choice:** Single 3-input form
**Notes:** Live calorie estimate at bottom updates as numbers are typed.

### Inline Editing

| Option | Description | Selected |
|--------|-------------|----------|
| Tap individual bar row | Swap just that row to input + Save/Cancel. Other bars stay visible. One at a time. | ✓ |
| Edit-all mode | Tap anywhere on card switches all three bars to inputs. One Save/Cancel for all. | |
| Bottom sheet form | Tap opens bottom sheet with all 3 inputs. Keeps card clean but adds modal. | |

**User's choice:** Tap individual bar row
**Notes:** Matches SC#4 "edit any of the three macro goals."

---

## Chart Tab Switching

| Option | Description | Selected |
|--------|-------------|----------|
| Single colored line per tab | P/C/F tabs above chart. Active tab shows its line in macro color. Goal reference line stays. Instant switch (no re-fetch). | ✓ |
| All 3 lines, active highlighted | Always show all three lines. Active is thicker/opaque, others thin/faded. | |
| Stacked area chart | Three macros as stacked colored areas. Different chart type entirely. | |

**User's choice:** Single colored line per tab
**Notes:** Goal reference dashed line only shown when active macro has a non-NULL goal. Time range pills stay below.

---

## Calorie Display

| Option | Description | Selected |
|--------|-------------|----------|
| Card header right-aligned | "DAILY MACROS" left, "680 cal" right. Computed from actual intake. | ✓ |
| Separate calorie row below bars | Row below bars: "680 cal consumed / 1,960 cal goal". Extra line height. | |
| No calorie on progress card | Calories only in goal form and chart. Card focused on grams only. | |

**User's choice:** Card header right-aligned
**Notes:** Computed from actual daily intake, not goals.

---

## Claude's Discretion

- Component file structure (single vs split sub-components)
- Animation on bar fill
- Chart legend design
- Tab styling (pill vs underline)
- StreakAverageRow integration

## Deferred Ideas

None
