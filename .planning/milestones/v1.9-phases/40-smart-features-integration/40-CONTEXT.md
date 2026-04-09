# Phase 40: Smart Features & Integration - Context

**Gathered:** 2026-04-09
**Status:** Ready for planning

<domain>
## Phase Boundary

Remembered portions (gram pre-fill from last-used quantity), copy/repeat meals (pre-load builder from a previous meal), edit logged meals (full food-level editing), and integration of the meal builder with AddMealModal, AddLibraryMealModal, and MealLibraryScreen flows. Also includes save-to-library opt-in from the builder. No new food database features, no barcode scanning, no AI suggestions.

</domain>

<decisions>
## Implementation Decisions

### Remembered Portions
- **D-01:** Gram input pre-fills with **ghost text** (greyed placeholder) showing the last-used quantity for a previously-logged food. Typing replaces it cleanly. Consistent with how the app shows last session's weight/reps as ghost data
- **D-02:** `getLastUsedPortion(foodId)` query: `SELECT grams FROM meal_foods WHERE food_id = ? ORDER BY id DESC LIMIT 1`. First-time foods = empty field, subsequent = ghost text
- **D-03:** Frequent foods in FoodSearchModal show a **"last: Xg" badge** on each card alongside the existing usage count and macro summary
- **D-04:** Tapping a frequent food with a remembered portion opens the gram entry card with ghost text pre-fill — user confirms or adjusts before adding to meal. No auto-add

### Copy/Repeat Meals
- **D-05:** **Repeat icon** on each meal card in MacrosView meal list. Only visible on meals that have `meal_foods` data (builder-logged meals). Manual-entry meals show no repeat icon
- **D-06:** Repeat button appears on **all meals with food data across all history**, not just today's meals
- **D-07:** Repeating a meal: queries `meal_foods` for original meal's foods, opens MealBuilderScreen pre-loaded with those foods and quantities. Date defaults to now, meal type copies from original (e.g., original was Lunch → repeated defaults to Lunch). Both editable in builder
- **D-08:** `duplicateMealFoods(sourceMealId)` — returns foods/grams for pre-loading the builder. Original meal is untouched — repeat creates a new meal

### Edit Logged Meals
- **D-09:** **Tapping a meal card** in MacrosView opens it for editing. Routing depends on meal type:
  - Meals **with meal_foods data** → open in MealBuilderScreen (edit mode, foods pre-loaded)
  - Meals **without meal_foods data** (manual-entry) → open in existing AddMealModal edit flow (P/C/F fields)
- **D-10:** **Full editing** supported: change grams on existing foods, remove foods, add new foods via search, change meal type/date. Builder recalculates totals on save
- **D-11:** On save, meals row totals are **fully recalculated from meal_foods** — sum all meal_foods P/C/F/cal and overwrite the meals row. Single source of truth. Uses `updateMealWithFoods(mealId, foods[])`
- **D-12:** Edit mode visual cue: builder header shows "Edit Meal" instead of "Build Meal", CTA says "SAVE CHANGES" instead of "LOG MEAL"

### Integration Flows
- **D-13:** **AddMealModal** — existing `onBuildMeal` callback opens MealBuilderScreen (already wired in Phase 39). Manual entry flow preserved alongside
- **D-14:** **AddLibraryMealModal** — gets a new "Build Meal" button (same pattern as AddMealModal) that opens MealBuilderScreen in **library mode**
- **D-15:** **Library mode behavior:** When builder is opened from AddLibraryMealModal, it only saves to the meal library (no daily log). The 'Save to Library' checkbox is pre-checked and the CTA says "SAVE TO LIBRARY"
- **D-16:** **Save-to-library opt-in from normal flow:** A "Save to Meal Library" toggle/checkbox in the builder's logging section. When opened from AddMealModal (normal flow), this is unchecked by default. When enabled, the meal is both logged to daily macros AND saved to library
- **D-17:** Existing manual macro entry flow in both AddMealModal and AddLibraryMealModal remains **completely untouched** — success criterion #6

### Claude's Discretion
- Repeat icon design (size, position on meal card, icon choice)
- Edit mode visual styling beyond header text change
- Animation when pre-loading builder with repeated meal's foods
- Save-to-library checkbox position and styling within builder
- How the builder detects its context (normal vs library vs edit mode) — likely a navigation param
- Toast/haptic feedback patterns on successful repeat, edit save, and library save
- Whether the "last: Xg" badge on frequent foods uses the same grey as ghost text or a distinct style

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Spec & Design
- `docs/superpowers/specs/2026-04-08-food-database-meal-builder-design.md` — Full spec: Smart Features section (remembered portions, copy/repeat, frequent foods), Component Architecture, DB functions (`getLastUsedPortion`, `updateMealWithFoods`, `duplicateMealFoods`), backwards compatibility guarantees
- `docs/superpowers/specs/2026-04-08-food-database-meal-builder-design.md` §"Smart Features" — Remembered portions query, copy/repeat flow, frequent foods with last-used portion

### Design System
- `.claude/skills/dark-mint-card-ui/index.md` — Dark Mint Card design system: color tokens, nested card system, typography rules. MANDATORY for all UI work
- `.claude/skills/ui-ux-pro-max/index.md` — UI/UX Pro Max guidelines: touch targets, form patterns, accessibility rules. MUST be invoked for all UI/UX decisions

### Phase 38 & 39 Context (predecessors)
- `.planning/phases/38-food-search-custom-foods/38-CONTEXT.md` — FoodSearchModal patterns, frequent foods display, onFoodSelected callback
- `.planning/phases/39-meal-builder/39-CONTEXT.md` — MealBuilderScreen structure, gram entry card, running totals, logging flow, addMealWithFoods

### Database Layer
- `src/db/foods.ts` — Existing: `searchFoods`, `getFrequentFoods`, `addMealWithFoods`, `getMealFoods`. Phase 40 adds: `getLastUsedPortion`, `updateMealWithFoods`, `duplicateMealFoods`
- `src/db/macros.ts` — Existing meal CRUD, library meal CRUD. Reference for update patterns
- `src/db/database.ts` — `executeSql` and `runTransaction` helpers

### Existing UI (modify in Phase 40)
- `src/screens/MealBuilderScreen.tsx` — Add edit mode, repeat pre-load, library mode, save-to-library toggle, ghost text on gram input
- `src/screens/AddMealModal.tsx` — Already has `onBuildMeal`. Phase 40: route meal card taps to builder (food meals) vs modal (manual meals)
- `src/screens/AddLibraryMealModal.tsx` — Add "Build Meal" button with library mode navigation
- `src/screens/FoodSearchModal.tsx` — Add "last: Xg" badge to frequent food cards
- `src/components/MacrosView.tsx` — Add repeat icon to meal cards, route taps to builder or modal based on meal_foods presence
- `src/components/MealFoodCard.tsx` — Existing per-food card in builder, used in edit mode

### Types
- `src/types/index.ts` — `MealFood`, `MealFoodInput`, `MacroMeal`, `Food`, `MealType`

### Utilities
- `src/utils/macros.ts` — `computeCalories()` for P×4 + C×4 + F×9

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `MealBuilderScreen` — full builder with food list, gram entry, running totals, logging. Phase 40 extends with edit/repeat/library modes
- `FoodSearchModal` — complete search with debounce, frequent foods, custom food creation
- `MealFoodCard` — per-food card component in builder
- `MealTypePills` — meal type selector, already integrated in builder
- `addMealWithFoods()` — transaction writing meals + meal_foods rows
- `getMealFoods()` — retrieves food breakdown for a meal (used for edit pre-load and repeat)
- `computeCalories()` — macro to calorie computation

### Established Patterns
- Navigation params for modal context: `onBuildMeal` callback on AddMealModal routes to builder
- Namespace DB exports: `foodsDb` in `src/db/index.ts`
- Row mapper functions: `rowToMealFood()` for meal_foods rows
- `runTransaction` for atomic multi-table writes
- `React.memo` on all FlatList items

### Integration Points
- MealBuilderScreen already in ProteinStackNavigator
- AddMealModal already wired with `onBuildMeal` callback
- AddLibraryMealModal needs same pattern added
- MacrosView meal cards need tap routing (builder vs modal) and repeat icon
- FoodSearchModal frequent food cards need "last: Xg" badge

</code_context>

<specifics>
## Specific Ideas

- Ghost text for remembered portions mirrors the app's existing pattern of showing last session's weight/reps as reference data — consistent mental model
- Repeat button only on meals with meal_foods data avoids confusing manual-entry users who don't use the builder
- Builder mode detection via navigation params (normal/edit/library) keeps the component flexible without separate screens
- Save-to-library as a toggle in the builder means library meals can be created from the food composition flow — no need to manually re-enter summed macros

</specifics>

<deferred>
## Deferred Ideas

- **Remove USDA foods** — ability to delete bundled USDA foods from the database and replace with custom entries. User wants full control over their food database. Belongs in a future food database management phase.

</deferred>

---

*Phase: 40-smart-features-integration*
*Context gathered: 2026-04-09*
