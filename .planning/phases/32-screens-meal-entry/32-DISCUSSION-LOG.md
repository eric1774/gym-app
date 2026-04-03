# Phase 32: Screens & Meal Entry - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-02
**Phase:** 32-screens-meal-entry
**Areas discussed:** Macro input layout, Meal badge display, Quick-add pill format, Library meal workflow

---

## Macro Input Layout

### Q1: How should the three macro inputs (P/C/F) be arranged in AddMealModal?

| Option | Description | Selected |
|--------|-------------|----------|
| Vertical stack | Three inputs stacked vertically, each with colored left border. Matches existing pattern, room for calorie preview. | ✓ |
| Horizontal row | Three compact inputs side by side. Saves vertical space but smaller tap targets. | |
| Hybrid | Protein full-width, carbs/fat side-by-side below. Emphasizes protein. | |

**User's choice:** Vertical stack
**Notes:** None

### Q2: Carbs and fat are optional — how should empty macro fields behave?

| Option | Description | Selected |
|--------|-------------|----------|
| Blank = 0 | Leave blank and they save as 0g. Only protein visually required. Fastest for protein-only users. | ✓ |
| All visible, none required | All three always visible with placeholder '0'. Any field > 0 satisfies requirement. | |
| Progressive disclosure | Show protein first, 'Add carbs & fat' link expands others. Extra tap for full-macro. | |

**User's choice:** Blank = 0
**Notes:** None

### Q3: Should the calorie preview update live as you type, or only after all fields have values?

| Option | Description | Selected |
|--------|-------------|----------|
| Live update | Updates on every keystroke. Matches MacroGoalSetupForm behavior. | ✓ |
| After all fields | Only appears once at least one macro has a valid number. | |

**User's choice:** Live update
**Notes:** None

---

## Meal Badge Display

### Q4: How should macro values appear on each meal row in today's history?

| Option | Description | Selected |
|--------|-------------|----------|
| Colored pills | Small rounded pills: [32g P] [45g C] [12g F] in macro colors. Zero-value hidden. | ✓ |
| Inline colored text | Colored text in a line: 32g · 45g · 12g. Lighter visual weight. | |
| Compact right-aligned | Total calories bold + small macro breakdown below. | |

**User's choice:** Colored pills
**Notes:** None

### Q5: Should the pill background be the macro color or dark background with colored text?

| Option | Description | Selected |
|--------|-------------|----------|
| Colored background | Macro color at ~20% opacity with macro-colored text. Subtle, matches dark theme. | ✓ |
| Solid colored background | Full macro color with white/dark text. More vivid but heavier. | |
| You decide | Claude picks. | |

**User's choice:** Colored background (20% opacity)
**Notes:** None

---

## Quick-Add Pill Format

### Q6: How should quick-add buttons display multi-macro info?

| Option | Description | Selected |
|--------|-------------|----------|
| Same colored pills | Description on top, colored macro pills below. Button becomes small card. | ✓ |
| Compact inline | Single-line: 'Chicken & rice 32P/45C/12F'. Stays horizontal. | |
| Primary macro only | Show only highest-value macro. Simplest but hides info. | |

**User's choice:** Same colored pills (initially)
**Notes:** User then requested removing the quick-add section entirely — "I feel like it will just clutter the page."

### Q7: Quick-add is in Phase 32 success criteria (SC4). What do you want to do?

| Option | Description | Selected |
|--------|-------------|----------|
| Remove from Phase 32 | Drop SC4. Quick-add removed from ProteinScreen. | ✓ |
| Keep but simplify | Less prominent — collapsed or smaller. Still satisfies SC4. | |
| Keep as-is | Keep and add macro pills as planned. | |

**User's choice:** Remove it from Phase 32
**Notes:** SC4 dropped from roadmap success criteria. Quick-add section removed entirely.

---

## Library Meal Workflow

### Q8: How should AddLibraryMealModal handle 3-macro input?

| Option | Description | Selected |
|--------|-------------|----------|
| Same as AddMealModal | Vertical stack P/C/F with colored borders, calorie preview, blank = 0. Consistent UX. | ✓ |
| Simplified — protein only required | Protein prominent, carbs/fat collapsed behind 'Add macros' link. | |
| You decide | Claude matches AddMealModal decisions. | |

**User's choice:** Same as AddMealModal
**Notes:** None

### Q9: How should MealLibraryScreen rows display macros?

| Option | Description | Selected |
|--------|-------------|----------|
| Same colored pills | Identical pill badges as MealListItem. Consistent everywhere. | ✓ |
| Compact text | Colored inline text: '32P · 45C · 12F' without pill backgrounds. | |
| You decide | Claude picks for SectionList layout. | |

**User's choice:** Same colored pills
**Notes:** None

### Q10: When tapping a library meal to log it, should it log immediately or show confirmation?

| Option | Description | Selected |
|--------|-------------|----------|
| Immediate log | One-tap logs all macros instantly. Toast confirms. Same as today. | ✓ |
| Preview before log | Bottom sheet with macro breakdown and 'Log' button. | |
| You decide | Claude picks based on current pattern. | |

**User's choice:** Immediate log
**Notes:** None

---

## Claude's Discretion

- Pill badge sizing, border radius, padding, spacing
- Whether to extract shared MacroPills component
- Edit modal pre-fill for pre-migration meals
- Toast component for library one-tap logging
- addMeal/updateMeal import switch strategy
- QuickAddButtons component cleanup

## Deferred Ideas

- Quick-add redesign — removed in this phase, could return as a separate phase with a different interaction pattern (search-based, favorites-based)
