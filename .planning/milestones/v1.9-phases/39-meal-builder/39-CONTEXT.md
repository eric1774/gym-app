# Phase 39: Meal Builder - Context

**Gathered:** 2026-04-08
**Status:** Ready for planning

<domain>
## Phase Boundary

Multi-food meal composition UI. Users search and add multiple foods to a single meal, enter exact gram weights with live macro previews, see running totals, then select meal type/date and log everything in a single transaction (meals row + meal_foods rows). No remembered portions, copy/repeat, or edit-after-log — those belong in Phase 40.

</domain>

<decisions>
## Implementation Decisions

### Builder Screen Structure
- **D-01:** MealBuilder is a single full-screen component (not a modal or bottom sheet). Shows the food list, running totals, meal type/date controls, and Log Meal button all on one screen
- **D-02:** `FoodSearchModal` (built in Phase 38) opens as a modal overlay when user taps "+ Add Another Food." After food selection, modal closes and returns the Food object to the builder
- **D-03:** Entry point: a new "Build Meal" or "Search Foods" button in AddMealModal opens MealBuilderScreen. AddMealModal's existing manual entry flow remains untouched (per milestone D-05)
- **D-04:** MealBuilder screen is navigated to (not a modal) — uses the existing ProteinStackNavigator

### Gram Entry Interaction
- **D-05:** After selecting a food from search, an inline bottom card slides up within the builder screen. Contains: food name, numeric gram input (auto-focused, `keyboardType="numeric"`), live P/C/F + calorie preview updating as user types, and "Add to Meal" button
- **D-06:** Same bottom card pattern re-appears when user taps an existing food row to edit grams (reusable `FoodGramInput` component)
- **D-07:** Gram input auto-focuses with numeric keyboard immediately visible — minimize taps per food
- **D-08:** Live macro computation: `(grams / 100) * per_100g_value` for P/C/F, `computeCalories()` for total. Updates on every keystroke (no debounce needed — pure computation, no DB)

### Running Totals & Layout
- **D-09:** Sticky bottom bar always visible, showing combined P/C/F grams and total calories across all foods in the meal. Uses `surfaceElevated` styling with accent color on calorie count
- **D-10:** Per-food cards in a scrollable FlatList above the bottom bar, each showing: food name, gram weight, per-food P/C/F breakdown, per-food calories. `React.memo` on all list items, stable `keyExtractor` using food.id
- **D-11:** Remove button (X) on each food card to delete before logging
- **D-12:** "+ Add Another Food" button at bottom of the food list (above sticky bar), styled as a dashed-border card with mint accent

### Logging Step & Actions
- **D-13:** Meal type pills (Breakfast/Lunch/Dinner/Snack) integrated in the sticky bottom section, below running totals. Reuses existing `MealTypePills` component
- **D-14:** Auto-generated description from food names (e.g., "Chicken breast, White rice, Broccoli") — shown as editable text field. User can modify before logging
- **D-15:** Date/time defaults to now, shown as "Today 12:30 PM" with an edit tap to open date/time fields (same pattern as AddMealModal)
- **D-16:** Single primary CTA: "LOG MEAL" button in mint accent. Disabled until at least one food is added AND meal type is selected
- **D-17:** Logging writes both `meals` row (summed macros) and `meal_foods` rows (per-food breakdown with snapshotted macros) in a single transaction via `addMealWithFoods()`
- **D-18:** On successful log: haptic feedback, dismiss builder, return to MacrosView with updated data

### Design System
- **D-19:** All Phase 39 UI MUST follow Dark Mint Card design system — `surfaceElevated` cards, `borderRadius: 14` on cards, `colors.accent` (#8DC28A) for CTAs, ALL-CAPS section headers in `colors.secondary`
- **D-20:** Apply UI/UX Pro Max mobile guidelines — 44px minimum touch targets, numeric keyboard for gram input, smooth 150-300ms transitions, loading state on Log button during async save
- **D-21:** Use `/ui-ux-pro-max` skill for ALL UI/UX design choices during research and implementation

### DB Operations (new in foods.ts)
- **D-22:** `addMealWithFoods(meal, foods[])` — Transaction: insert meals row + meal_foods rows with snapshotted macros
- **D-23:** `getMealFoods(mealId)` — Get food breakdown for display (used by Phase 40 for edit, but needed now for the data layer)
- **D-24:** Macro snapshots on `meal_foods`: protein, carbs, fat computed at log time from `(grams / 100) * per_100g_value`. Historical accuracy preserved even if food data changes

### Claude's Discretion
- FoodGramInput animation (slide-up timing, easing, KeyboardAvoidingView behavior)
- Exact layout of per-food cards (spacing, typography hierarchy within card)
- Empty state when no foods added yet (likely a centered prompt to add first food)
- How "+ Add Another Food" button dismisses the gram entry card if it's open
- Whether description field is always visible or collapsible
- ScrollView vs FlatList for the food list (likely FlatList for consistency with Phase 38)
- Toast/haptic pattern on successful log (light haptic consistent with existing app patterns)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Spec & Design
- `docs/superpowers/specs/2026-04-08-food-database-meal-builder-design.md` — Full spec: data model, flow, component architecture, smart features. Sections "Multi-Food Meal Builder" and "Component Architecture" are primary references for Phase 39
- `docs/superpowers/specs/2026-04-08-food-database-meal-builder-design.md` SS "Data Model" — `meal_foods` table schema, relationships, migration v12 details

### Design System
- `.claude/skills/dark-mint-card-ui/index.md` — Dark Mint Card design system: color tokens, nested card system, typography rules, component specs. MANDATORY for all UI work
- `.claude/skills/ui-ux-pro-max/index.md` — UI/UX Pro Max guidelines: touch targets, form patterns, accessibility rules. MUST be invoked for all UI/UX design decisions

### Phase 38 Context (predecessor)
- `.planning/phases/38-food-search-custom-foods/38-CONTEXT.md` — Phase 38 decisions: FoodSearchModal patterns, foods.ts module structure, Food type, onFoodSelected callback, design system decisions

### Database Layer
- `src/db/foods.ts` — Existing search/frequent/custom food functions. Phase 39 adds `addMealWithFoods()`, `getMealFoods()` here
- `src/db/macros.ts` — Reference for meal logging pattern (`addMeal`, `updateMeal`). Phase 39's `addMealWithFoods` extends this with meal_foods rows
- `src/db/database.ts` — `executeSql` and `runTransaction` helpers
- `src/db/index.ts` — Barrel exports with namespace pattern

### Existing UI Integration Points
- `src/screens/FoodSearchModal.tsx` — Food search modal (Phase 38). Builder opens this to add foods
- `src/screens/AddMealModal.tsx` — Current manual macro entry. Builder is launched from here (new button). Manual flow stays untouched
- `src/components/MealTypePills.tsx` — Reuse for meal type selection in the builder
- `src/components/MacrosView.tsx` — Macros tab; builder returns here after logging

### Theme
- `src/theme/colors.ts` — Color tokens (background, surface, surfaceElevated, accent, etc.)
- `src/theme/spacing.ts` — Spacing scale
- `src/theme/typography.ts` — Font sizes and weights

### Utilities
- `src/utils/macros.ts` — `computeCalories()` for P*4 + C*4 + F*9
- `src/utils/dates.ts` — `getLocalDateString()`, `getLocalDateTimeString()` for meal timestamps

### Types
- `src/types/index.ts` — `Food`, `FoodSearchResult`, `MacroMeal`, `MealType`, `MacroValues` types. Phase 39 adds `MealFood` type here

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `FoodSearchModal` (Phase 38) — complete food search with debounce, frequent foods, custom food creation. Reuse directly via `onFoodSelected` callback
- `FoodResultItem` — memoized food result card component
- `MealTypePills` — horizontal pill selector for Breakfast/Lunch/Dinner/Snack
- `computeCalories()` in `src/utils/macros.ts` — computes kcal from P/C/F
- `colors`, `spacing`, `fontSize` from `src/theme/` — all styling tokens
- `AddMealModal` date/time handling pattern — `formatDateForInput`, `parseDate`, `parseTime` functions

### Established Patterns
- Namespace DB exports: `foodsDb`, `macrosDb` — Phase 39 adds `addMealWithFoods` and `getMealFoods` to `foodsDb`
- Row mapper functions: `rowToFood()`, `rowToMacroMeal()` — add `rowToMealFood()` for meal_foods rows
- Modal pattern: `FoodSearchModal` uses `<Modal>` with `KeyboardAvoidingView` — gram entry card follows similar keyboard handling
- `runTransaction` for atomic multi-table writes — critical for meals + meal_foods insert
- `React.memo` on all FlatList items per Phase 38 D-18

### Integration Points
- MealBuilderScreen added to ProteinStackNavigator
- AddMealModal gets a "Build Meal" button that navigates to MealBuilderScreen
- FoodSearchModal's `onFoodSelected` callback feeds foods into the builder
- After logging, navigate back to MacrosView and trigger data refresh (same pattern as AddMealModal's `onSaved`)

</code_context>

<specifics>
## Specific Ideas

- User explicitly requested `/ui-ux-pro-max` skill for ALL UI/UX design choices, research, and implementation — make it clean, beautiful, aesthetic, and efficient
- Inline bottom card for gram entry keeps the builder context visible while entering data — no extra modal layer
- Auto-generated description from food names reduces typing friction — editable for user control
- Single-screen design means the user always sees their running total and can adjust any food without navigating away

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 39-meal-builder*
*Context gathered: 2026-04-08*
