---
phase: 40-smart-features-integration
plan: "02"
subsystem: meal-builder
tags: [meal-builder, repeat, edit, db, navigation, ui]
dependency_graph:
  requires: ["40-01"]
  provides: ["duplicateMealFoods", "updateMealWithFoods", "hasMealFoods", "getMealFoodsCounts", "repeat-icon", "builder-edit-mode"]
  affects: ["MacrosView", "MealListItem", "MealBuilderScreen", "MealTotalsBar", "TabNavigator"]
tech_stack:
  added: []
  patterns: ["LEFT JOIN for defensive null handling", "batch count query to avoid N+1", "single-transaction delete+insert+update", "navigation params for screen mode routing"]
key_files:
  created: []
  modified:
    - src/db/foods.ts
    - src/components/MealListItem.tsx
    - src/components/MacrosView.tsx
    - src/screens/MealBuilderScreen.tsx
    - src/components/MealTotalsBar.tsx
    - src/navigation/TabNavigator.tsx
decisions:
  - "Repeat creates a new meal (mode=normal) with pre-filled foods — date defaults to now, meal type copies from original (per D-07)"
  - "Edit mode uses descriptionOverride state pattern: applies prefill once on mount, then auto-generate from food names takes over"
  - "getMealFoodsCounts batch query fetches counts for all day meals in one SQL call, avoiding N+1 per-card queries (T-40-05)"
  - "updateMealWithFoods deletes+reinserts meal_foods in a single runTransaction for atomicity (T-40-03)"
  - "MealTotalsBar ctaLabel prop makes CTA text mode-aware without duplicating the component"
metrics:
  duration_minutes: 30
  completed_date: "2026-04-09"
  tasks_completed: 2
  tasks_total: 2
  files_modified: 6
---

# Phase 40 Plan 02: Repeat Meals and Builder Edit Mode Summary

**One-liner:** Atomic meal edit via updateMealWithFoods, repeat icon on builder-logged meal cards pre-loading builder, and edit/repeat mode routing through navigation params.

## What Was Built

### Task 1: DB Functions (src/db/foods.ts)

Four new exported functions added:

- **`duplicateMealFoods(mealId)`** — Returns food breakdown as `MealFoodInput[]` for builder pre-load. Uses LEFT JOIN to handle deleted foods defensively; macros fall back to 0 (T-40-04).
- **`updateMealWithFoods(mealId, description, mealType, foods, loggedAt?)`** — Atomically replaces meal_foods and recalculates meals row totals in a single `runTransaction` (T-40-03). Validates non-empty foods array.
- **`hasMealFoods(mealId)`** — COUNT check for repeat icon / edit routing decisions.
- **`getMealFoodsCounts(mealIds[])`** — Batch query returning `Record<number, number>` for a day's meals; avoids N+1 per-card queries (T-40-05).

### Task 2: UI Components

**TabNavigator.tsx** — `MealBuilder` param type expanded from `undefined` to a typed union with `mode`, `editMealId`, `prefillFoods`, `prefillMealType`, `prefillDescription`, `prefillLoggedAt`.

**MealListItem.tsx** — Added `onRepeat?: (meal: MacroMeal) => void` and `hasMealFoods?: boolean` props. Renders repeat icon (U+21BA, `colors.accent`) with 44pt minimum touch target and hitSlop when `hasMealFoods && onRepeat`.

**MacrosView.tsx** — Added `mealFoodsCounts` state; `getMealFoodsCounts` called after meal fetch in both `refreshData` and `useFocusEffect` load. `handleEdit` routes builder meals to `navigate('MealBuilder', {mode: 'edit', ...})` and manual meals to `setEditingMeal/setModalVisible`. New `handleRepeat` calls `duplicateMealFoods` then navigates with `mode: 'normal'` and prefillFoods.

**MealBuilderScreen.tsx** — Reads `route.params.mode` (default `'normal'`). Pre-fill `useEffect` on mount loads `prefillFoods`, `prefillMealType`, `prefillLoggedAt`. `descriptionOverride` pattern applies edit mode description once then hands off to auto-generate. Header shows `'EDIT MEAL'` when `mode === 'edit'`. `handleLogMeal` calls `updateMealWithFoods` for edit mode, `addMealWithFoods` otherwise. `ctaLabel` computed as `'SAVE CHANGES' | 'SAVE TO LIBRARY' | 'LOG MEAL'`.

**MealTotalsBar.tsx** — Optional `ctaLabel?: string` prop; button text renders `{ctaLabel ?? 'LOG MEAL'}`.

## Commits

| Hash | Message |
|------|---------|
| `0161523` | feat(40-02): add duplicateMealFoods, updateMealWithFoods, hasMealFoods, getMealFoodsCounts to foods.ts |
| `ac7cad0` | feat(40-02): repeat icon, builder edit/repeat modes, meal card routing |

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None — all data paths are fully wired.

## Threat Flags

None — all new SQL uses parameterized queries; threat mitigations T-40-03, T-40-04, T-40-05 applied as specified in the plan's threat model.

## Self-Check: PASSED

- `src/db/foods.ts` — modified, contains all 4 new exported functions
- `src/components/MealListItem.tsx` — modified, contains `onRepeat`, `hasMealFoods` props and repeat icon
- `src/components/MacrosView.tsx` — modified, contains `mealFoodsCounts` state and routing logic
- `src/screens/MealBuilderScreen.tsx` — modified, reads `route.params`, handles edit/repeat modes
- `src/components/MealTotalsBar.tsx` — modified, `ctaLabel` prop added
- `src/navigation/TabNavigator.tsx` — modified, MealBuilder params typed
- Commits `0161523` and `ac7cad0` exist in git log
- TypeScript: no errors in non-test source files (`npx tsc --noEmit` clean for src/)
