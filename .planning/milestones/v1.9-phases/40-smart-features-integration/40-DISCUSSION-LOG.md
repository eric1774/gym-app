# Phase 40: Smart Features & Integration - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-09
**Phase:** 40-smart-features-integration
**Areas discussed:** Remembered Portions, Copy/Repeat Meals, Edit Logged Meals, Integration Flows

---

## Remembered Portions

| Option | Description | Selected |
|--------|-------------|----------|
| Ghost text | Show last-used grams as greyed placeholder text. Typing replaces it. Consistent with weight/reps ghost data pattern. | ✓ |
| Pre-filled editable | Fill input with actual value in bold. Faster if same amount wanted. | |
| You decide | Claude picks based on existing patterns. | |

**User's choice:** Ghost text
**Notes:** Consistent with how the app shows last session's weight/reps as reference data.

---

| Option | Description | Selected |
|--------|-------------|----------|
| Yes, show hint | Each frequent food card shows "last: Xg" badge alongside usage count and macros. | ✓ |
| No, just name and count | Keep frequent foods as-is. Remembered portion only after selection. | |
| You decide | Claude picks based on screen real estate. | |

**User's choice:** Yes, show "last: Xg" hint on frequent food cards
**Notes:** Matches spec description of frequent foods showing last-used portion.

---

| Option | Description | Selected |
|--------|-------------|----------|
| Open gram entry | Tapping frequent food opens gram entry card with ghost text pre-fill. User confirms or adjusts. | ✓ |
| Auto-add with portion | Immediately adds food to meal with last-used grams. Fastest but risk of wrong portions. | |
| You decide | Claude picks best UX. | |

**User's choice:** Open gram entry with ghost text for confirmation
**Notes:** Prevents accidental wrong portions.

---

## Copy/Repeat Meals

| Option | Description | Selected |
|--------|-------------|----------|
| Meal list in MacrosView | Small repeat icon on each meal card. Only on meals with meal_foods data. | ✓ |
| Long-press context menu | Long-press reveals Repeat/Edit/Delete options. Cleaner but less discoverable. | |
| Both list + context menu | Icon AND long-press. Maximum discoverability but visual complexity. | |

**User's choice:** Repeat icon on meal card in MacrosView
**Notes:** Quick access from the main macros screen.

---

| Option | Description | Selected |
|--------|-------------|----------|
| Today + same meal type | Date defaults to now, meal type copies from original. Both editable. | ✓ |
| Today + no preset type | Date defaults to now, meal type unselected. One more tap. | |
| You decide | Claude picks defaults. | |

**User's choice:** Today + same meal type
**Notes:** Reduces taps when repeating a regular meal.

---

| Option | Description | Selected |
|--------|-------------|----------|
| All meals with food data | Any meal in MacrosView history with meal_foods data shows repeat icon. | ✓ |
| Today's meals only | Repeat only on today's meals. Simpler scope. | |
| You decide | Claude picks. | |

**User's choice:** All meals with food data across all history
**Notes:** Useful for repeating meals from any previous day.

---

## Edit Logged Meals

| Option | Description | Selected |
|--------|-------------|----------|
| Tap meal card | Tapping a meal card opens it for editing. Consistent with AddMealModal edit pattern. | ✓ |
| Edit button on card | Visible edit icon on each card. More discoverable but adds clutter alongside Repeat. | |
| You decide | Claude picks entry point. | |

**User's choice:** Tap meal card to enter edit mode
**Notes:** Routing differs based on meal type (food meals → builder, manual → existing modal).

---

| Option | Description | Selected |
|--------|-------------|----------|
| Full editing | Change grams, remove foods, add new foods, change meal type/date. | ✓ |
| Grams + remove only | Adjust weights and remove foods but no adding. Simpler scope. | |
| You decide | Claude picks scope. | |

**User's choice:** Full editing
**Notes:** Covers success criterion #5 completely.

---

| Option | Description | Selected |
|--------|-------------|----------|
| Builder for food meals, existing modal for manual | Meals with meal_foods → builder edit mode. Manual-entry → AddMealModal. Each in native editor. | ✓ |
| Always open builder | All meals in builder. Manual meals show as single custom entry. Potentially confusing. | |
| You decide | Claude picks routing. | |

**User's choice:** Builder for food meals, existing modal for manual
**Notes:** Clean separation — each meal type edits in its natural interface.

---

| Option | Description | Selected |
|--------|-------------|----------|
| Recalculate from meal_foods | Sum all meal_foods P/C/F/cal, overwrite meals row. Single source of truth. | ✓ |
| You decide | Claude picks data approach. | |

**User's choice:** Recalculate from meal_foods
**Notes:** Matches how addMealWithFoods already works.

---

## Integration Flows

| Option | Description | Selected |
|--------|-------------|----------|
| Add 'Build Meal' button to AddLibraryMealModal | Same pattern as AddMealModal. Opens builder in library mode. | ✓ |
| Build from MealLibraryScreen directly | Button on library screen. Skips AddLibraryMealModal. | |
| You decide | Claude picks integration point. | |

**User's choice:** Add 'Build Meal' button to AddLibraryMealModal
**Notes:** Consistent pattern across both entry points.

---

| Option | Description | Selected |
|--------|-------------|----------|
| Checkbox in builder | 'Save to Meal Library' toggle in builder's logging section. Explicit, visible opt-in. | ✓ |
| Post-log prompt | After logging, toast asks to save to library. Less clutter but extra step. | |
| You decide | Claude picks save UX. | |

**User's choice:** Checkbox in builder
**Notes:** Visible, explicit opt-in per success criterion #4.

---

| Option | Description | Selected |
|--------|-------------|----------|
| Save to library only | From library flow: only saves to library, no daily log. CTA says "SAVE TO LIBRARY". | ✓ |
| Both log + save | Always logs to today AND saves to library. | |
| User chooses | Both toggles shown. Most flexible but complex. | |
| You decide | Claude picks behavior per context. | |

**User's choice:** Save to library only (when opened from library flow)
**Notes:** Clean separation of intents — library flow saves to library, normal flow logs to daily.

---

## Claude's Discretion

- Repeat icon design, position, icon choice
- Edit mode visual styling beyond header text
- Builder mode detection mechanism (navigation params)
- Animation for pre-loading repeated meal's foods
- Save-to-library checkbox positioning
- Toast/haptic patterns on repeat, edit save, library save
- "last: Xg" badge styling on frequent foods

## Deferred Ideas

- **Remove USDA foods** — ability to delete bundled USDA foods and replace with custom entries. New capability — belongs in future food database management phase.
