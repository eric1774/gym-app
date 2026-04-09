# Plan 40-01: Remembered Portions — Summary

## Status: COMPLETE

## What Was Built

### Task 1: DB Layer — getLastUsedPortion + getFrequentFoods extension
- `src/db/foods.ts`: Added `getLastUsedPortion(foodId)` — parameterized `SELECT grams FROM meal_foods WHERE food_id = ? ORDER BY id DESC LIMIT 1`
- `src/db/foods.ts`: Extended `getFrequentFoods` SQL with inline `last_used_grams` subquery
- `src/db/foods.ts`: Updated `rowToFoodSearchResult` mapper to include `lastUsedGrams`
- `src/types/index.ts`: Added `lastUsedGrams?: number` to `FoodSearchResult` interface (optional, backward-compatible)

### Task 2: UI Wiring — Ghost Text + Badge
- `src/components/FoodGramInput.tsx`: Added `lastUsedGrams?: number` prop; placeholder shows last quantity as ghost text in add mode; edit mode reverts to `"0"`
- `src/components/FoodResultItem.tsx`: Added `lastUsedGrams?: number` prop; renders `"last: Xg"` badge in `colors.secondary`, `fontSize.sm`, `weightRegular`
- `src/components/FrequentFoodsSection.tsx`: Passes `food.lastUsedGrams` through to `FoodResultItem`
- `src/screens/MealBuilderScreen.tsx`: Added `lastUsedGrams` state; `handleFoodSelected` made async, calls `foodsDb.getLastUsedPortion`; cleared in `handleEditFood` and `handleGramDismiss`

## Key Files

### Created
None (all modifications to existing files)

### Modified
- `src/db/foods.ts`
- `src/types/index.ts`
- `src/components/FoodGramInput.tsx`
- `src/components/FoodResultItem.tsx`
- `src/components/FrequentFoodsSection.tsx`
- `src/screens/MealBuilderScreen.tsx`

## Commits
- `751379a`: feat(40-01): add getLastUsedPortion DB function and extend getFrequentFoods with last-used grams
- `9cd16fb`: feat(40-01): ghost text pre-fill, last-used badge, and MealBuilder wiring

## Deviations
None

## Self-Check: PASSED
- TypeScript compilation: clean
- All functions exported and typed correctly
- Ghost text placeholder renders only for foods with prior usage
