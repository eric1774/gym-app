# Phase 32: Screens & Meal Entry - Context

**Gathered:** 2026-04-02
**Status:** Ready for planning

<domain>
## Phase Boundary

Users can log meals with all three macros (protein, carbs, fat), see colored macro badges on every meal row, and the meal library stores and logs full macro data. This phase modifies AddMealModal, MealListItem, AddLibraryMealModal, MealLibraryScreen, and ProteinScreen. No DB layer changes (Phase 30 handles that), no navigation rename (Phase 33), no goal/chart changes (Phase 31).

</domain>

<decisions>
## Implementation Decisions

### Macro input layout (AddMealModal)
- **D-01:** Three inputs stacked vertically — Protein, Carbs, Fat — each with a colored left border in its macro color (mint/blue/coral). Same vertical stack pattern used in AddLibraryMealModal for consistency.
- **D-02:** Blank carbs/fat fields save as 0g. Only requirement: at least one macro > 0. Protein is not explicitly required — a fat-only entry is valid. This is the fastest path for protein-only users who can ignore the other fields.
- **D-03:** Live calorie preview updates on every keystroke below the inputs. Blank fields treated as 0 in the calculation. Uses `computeCalories()` from `src/utils/macros.ts`. Matches the live calorie behavior in MacroGoalSetupForm (Phase 31).

### Meal badge display (MealListItem)
- **D-04:** Colored pill badges in a row below the description: `[32g P] [45g C] [12g F]`. Each pill has its macro color background at ~20% opacity with macro-colored text. Zero-value macros hidden — pre-migration meals with DEFAULT 0 carbs/fat show only `[30g P]`.
- **D-05:** Pill badge row replaces the existing single `42g` accent-colored number on the right side of the row. Badges move below the description text for space.

### Quick-add buttons
- **D-06:** Quick-add section (QuickAddButtons component + RECENT TEMPLATES header) removed from ProteinScreen entirely. SC4 dropped from Phase 32 success criteria. Simplifies the screen layout.

### Library meal input (AddLibraryMealModal)
- **D-07:** Same vertical stack layout as AddMealModal — P/C/F inputs with colored borders, calorie preview, blank = 0 behavior. Consistent UX across both modals.

### Library meal display (MealLibraryScreen)
- **D-08:** Same colored pill badges as MealListItem — `[32g P] [45g C] [12g F]` on each library row. Zero-value macros hidden.

### Library meal one-tap logging
- **D-09:** Tap logs all three macros immediately (no confirmation sheet). Macro pills are visible on the row so user already sees what they're logging. Brief toast confirms: "Logged: [meal name]". Same one-tap pattern as today.

### Carried forward from Phase 30 & 31
- **D-10:** Macro colors: Protein #8DC28A (mint), Carbs #5B9BF0 (blue), Fat #E8845C (coral) — from MACRO_COLORS constant.
- **D-11:** protein.ts frozen throughout — all new DB calls go through `macrosDb` namespace.
- **D-12:** Streak = protein-goal-only days (unchanged by carbs/fat goals).
- **D-13:** MacroValues `{ protein, carbs, fat }` object pattern for all macro data.
- **D-14:** Hide zero-value macros on badges (D-11 in Phase 30). Pre-migration meals show only protein.
- **D-15:** `computeCalories()` at `src/utils/macros.ts` for all calorie computations.

### Claude's Discretion
- Pill badge sizing, border radius, padding, spacing between pills
- Whether to extract a shared `MacroPills` component used by both MealListItem and MealLibraryScreen
- Edit modal pre-fill behavior for carbs/fat when editing a pre-migration meal (likely show 0 in the fields)
- Toast component for library meal one-tap logging (reuse existing pattern or simple RN toast)
- How to handle the `addMeal`/`updateMeal` import switch from protein.ts to macrosDb in AddMealModal
- QuickAddButtons component cleanup (remove from ProteinScreen, optionally delete the component file)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Screens and modals to modify
- `src/screens/AddMealModal.tsx` — Current single-protein meal entry modal. Needs 3-macro inputs, calorie preview, validation change.
- `src/screens/AddLibraryMealModal.tsx` — Current single-protein library meal modal. Same 3-macro treatment as AddMealModal.
- `src/screens/MealLibraryScreen.tsx` — Library list with one-tap logging. Rows need macro pills, `addMeal` call needs all 3 macros.
- `src/screens/ProteinScreen.tsx` — Host screen. Remove QuickAddButtons import/usage, update meal data flow for macro-aware types.

### Components to modify
- `src/components/MealListItem.tsx` — Currently shows `{meal.proteinGrams}g`. Needs colored pill badges for all non-zero macros.
- `src/components/QuickAddButtons.tsx` — Being removed from ProteinScreen (D-06). May delete or leave for future use.

### DB layer (read-only for this phase)
- `src/db/macros.ts` — `addMeal()`, `updateMeal()`, `getMealsByDate()` macro-aware functions.
- `src/db/index.ts` — `macrosDb` namespace export.

### Types and utilities
- `src/types/index.ts` — `MacroMeal`, `MacroValues`, `MacroType`, `MACRO_COLORS`, `CALORIES_PER_GRAM`, `Meal` (frozen).
- `src/utils/macros.ts` — `computeCalories(p, c, f)` utility.

### Theme
- `src/theme/colors.ts` — `colors.surface`, `colors.border`, `colors.accent`, `colors.secondary`, macro colors via `MACRO_COLORS`.
- `src/theme/spacing.ts` — spacing constants.
- `src/theme/typography.ts` — `fontSize`, `weightBold`, `weightSemiBold`.

### Prior phase context
- `.planning/phases/30-db-foundation/30-CONTEXT.md` — DB decisions, MacroValues pattern, frozen protein.ts.
- `.planning/phases/31-goal-setting-progress-charts/31-CONTEXT.md` — Progress card, goal form, chart decisions.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `MealTypePills` component (src/components/MealTypePills.tsx): pill-style selector for meal types — styling pattern reusable for macro pills.
- `MacroGoalSetupForm` (src/components/MacroGoalSetupForm.tsx): 3-input form with calorie preview — input layout pattern reusable in AddMealModal.
- `MACRO_COLORS` constant (src/types/index.ts): color mapping per macro type — use for pill backgrounds.
- `computeCalories()` (src/utils/macros.ts): calorie computation — use for live preview.
- `macrosDb` namespace (src/db/index.ts): macro-aware DB functions for addMeal, updateMeal, etc.

### Established Patterns
- Modal pattern: KeyboardAvoidingView > Modal > ScrollView with header, inputs, and action buttons.
- Pill styling: rounded corners, horizontal padding, semi-bold text — see MealTypePills.
- Swipe-to-delete: PanResponder on MealListItem and LibraryMealRow — no changes needed.
- Data refresh: `useFocusEffect` with `refreshData()` callback in ProteinScreen.
- Number inputs: `keyboardType="number-pad"`, `maxLength={5}`, `returnKeyType="done"`.

### Integration Points
- ProteinScreen imports: swap `addMeal`/`getMealsByDate`/`getRecentDistinctMeals` from `../db` to `macrosDb` equivalents.
- AddMealModal: swap `addMeal`/`updateMeal` from `../db` to `macrosDb` equivalents.
- MealLibraryScreen: swap `addMeal` to `macrosDb.addMeal` for one-tap logging with full macro data.
- AddLibraryMealModal: swap `addLibraryMeal` to macro-aware version.

</code_context>

<specifics>
## Specific Ideas

- Colored pill badge style: `backgroundColor: MACRO_COLORS[type] + '33'` (20% opacity hex), `color: MACRO_COLORS[type]`, `borderRadius: 8`, small horizontal padding.
- Pill text format: `{value}g {letter}` where letter is P/C/F — e.g., "32g P".
- AddMealModal colored border: 3px left border on each input row in the macro color, similar to the colored bar on MacroProgressCard.
- When editing a pre-migration meal, carbs/fat inputs show empty (blank = 0 behavior), not pre-filled with "0".
- Calorie preview line: muted secondary color, positioned below the three inputs: "~ 420 calories".

</specifics>

<deferred>
## Deferred Ideas

- **Quick-add redesign** — Quick-add section removed in this phase for simplicity. Could be re-introduced as a separate phase if needed, potentially with a different interaction pattern (e.g., search-based or favorites-based).
- SC4 from original Phase 32 roadmap entry dropped — quick-add pills with macro badges no longer in scope.

</deferred>

---

*Phase: 32-screens-meal-entry*
*Context gathered: 2026-04-02*
