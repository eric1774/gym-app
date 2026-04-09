# Phase 38: Food Search & Custom Foods - Context

**Gathered:** 2026-04-08
**Status:** Ready for planning

<domain>
## Phase Boundary

Users can search the bundled USDA food database (~8,000 foods) by name with fuzzy token matching, see their most frequently-logged foods before typing, and create custom foods when search yields no results. A new `foods.ts` DB module exposes all search/CRUD operations. No meal builder UI — that is Phase 39.

</domain>

<decisions>
## Implementation Decisions

### Search UI & Interaction
- **D-01:** New full-screen `FoodSearchModal` component — slides up when triggered from AddMealModal or MealLibrary. Contains search bar at top, results below. Keeps existing flows untouched
- **D-02:** Instant filter with 200ms debounce — results update as user types, no search button needed. Local SQLite query on `search_text` column with LIKE tokens (decided in milestone planning as D-04)
- **D-03:** Max 20 results per query (SRCH-02 requirement)
- **D-04:** Search bar uses `colors.surface` background, `borderRadius: 10`, placeholder "Search foods..."

### Frequent Foods Display
- **D-05:** Before user types, show "FREQUENTLY LOGGED" section — vertical list of `surfaceElevated` cards, same visual pattern as search results
- **D-06:** Top 10 foods ranked by usage count (count of appearances in `meal_foods` table)
- **D-07:** Each frequent food card shows: food name, usage count badge (e.g., "12x"), macro summary per 100g (P/C/F + calories)
- **D-08:** Frequent foods list will be empty until the meal builder (Phase 39) is used. Show a subtle empty state hint: "Your frequent foods will appear here"

### Custom Food Creation
- **D-09:** Inline slide-up form within FoodSearchModal — appears when user taps "Create Custom Food" from the no-results card. Back arrow returns to search
- **D-10:** Search query pre-fills the food name field
- **D-11:** Required fields: name (text), protein per 100g (number), carbs per 100g (number), fat per 100g (number). Calories auto-computed and shown read-only using `computeCalories()` utility
- **D-12:** No category field for custom foods — category left null. Custom foods are identified by `is_custom = 1` in the foods table
- **D-13:** On save: insert into `foods` table with `is_custom = 1`, `fdc_id = NULL`, `search_text` = lowercased name. Return to search view with new food auto-selected (returned to caller immediately)

### No Results State
- **D-14:** Inline CTA card in results area: "No results for '[query]'" with a mint accent "+ Create Custom Food" button. Never show a blank no-results screen

### Result Display & Selection
- **D-15:** Each search result is a `surfaceElevated` card with: food name (primary text, white), category (secondary text, grey), macro summary line (P:X C:X F:X | Xkcal per 100g)
- **D-16:** Tapping a result selects it and closes FoodSearchModal, returning the food object to the calling screen via `onFoodSelected({ id, name, protein_per_100g, carbs_per_100g, fat_per_100g, is_custom })`
- **D-17:** Frequently-logged foods are boosted in search results (SRCH-04) — appear higher when matching the query
- **D-18:** Result list items must use `React.memo` for performance (memoized `renderItem` per React Native best practices)

### Design System
- **D-19:** All Phase 38 UI components MUST follow the Dark Mint Card design system — `surfaceElevated` cards, `borderRadius: 14` on cards, `colors.accent` (#8DC28A) for CTAs, nested card system, ALL-CAPS section headers in `colors.secondary`
- **D-20:** Apply UI/UX Pro Max mobile guidelines — 44px minimum touch targets, haptic feedback on food selection, debounced search with predictions, clear no-results state with actionable suggestion
- **D-21:** Prioritize a pleasurable, aesthetically clean user experience — smooth transitions, consistent spacing, typography hierarchy per the design system

### DB Module Pattern
- **D-22:** New `src/db/foods.ts` module — namespace export as `foodsDb` in `src/db/index.ts`, following `macrosDb`/`hydrationDb` convention
- **D-23:** Food types (Food, FoodSearchResult) defined in `src/types/index.ts`

### Claude's Discretion
- FoodSearchModal animation (slide-up timing, easing)
- FoodResultItem internal layout details (exact spacing between name/category/macros)
- Keyboard handling (auto-focus search bar on modal open, dismiss on scroll)
- Frequency count query implementation (JOIN on meal_foods with GROUP BY and COUNT)
- How frequency boost integrates with token LIKE search (e.g., UNION with ORDER BY, or single query with CASE)
- Toast/haptic behavior on custom food creation success
- FlatList vs ScrollView for results (likely FlatList given max 20 items + frequent foods)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Design System
- `.claude/skills/dark-mint-card-ui/index.md` — Dark Mint Card design system: color tokens, nested card system, typography rules, component specs. MANDATORY for all UI work
- `.claude/skills/ui-ux-pro-max/index.md` — UI/UX Pro Max guidelines: touch targets, search UX patterns, form best practices, accessibility rules

### Database Layer
- `src/db/macros.ts` — Reference implementation for foods.ts structure (row mappers, CRUD, namespace export pattern)
- `src/db/hydration.ts` — Another namespace module example
- `src/db/migrations.ts` — Foods table schema (migration v12, line ~374): id, fdc_id, name, category, protein/carbs/fat per 100g, search_text, is_custom
- `src/db/index.ts` — Barrel exports with namespace pattern; add `foodsDb` here
- `src/db/database.ts` — db singleton and executeSql/runTransaction helpers

### Existing UI Integration Points
- `src/screens/AddMealModal.tsx` — Current manual macro entry modal; will trigger FoodSearchModal
- `src/screens/AddLibraryMealModal.tsx` — Library meal entry; will also trigger FoodSearchModal
- `src/screens/MealLibraryScreen.tsx` — Meal library screen
- `src/components/MacrosView.tsx` — Macros tab containing meal logging flows

### Theme
- `src/theme/colors.ts` — Color tokens (background, surface, surfaceElevated, accent, etc.)
- `src/theme/spacing.ts` — Spacing scale
- `src/theme/typography.ts` — Font sizes and weights

### Utilities
- `src/utils/macros.ts` — `computeCalories()` function for P×4 + C×4 + F×9

### Requirements
- `.planning/REQUIREMENTS.md` — SRCH-01 (fuzzy token matching), SRCH-02 (250ms/20 results), SRCH-03 (frequent foods pre-search), SRCH-04 (frequency boost), CUST-01 (custom food creation), CUST-02 (custom foods in search)

### Types
- `src/types/index.ts` — Where Food and FoodSearchResult types should be added

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `computeCalories()` in `src/utils/macros.ts` — computes kcal from P/C/F, reuse for auto-calorie display
- `MealTypePills` component — horizontal pill selector pattern, could inform filter UI if needed
- `TabBar` component — established tab switching pattern
- `colors`, `spacing`, `fontSize` from `src/theme/` — all styling tokens

### Established Patterns
- Namespace DB exports: `macrosDb`, `hydrationDb` → `foodsDb`
- Row mapper functions: `rowToMacroMeal()` pattern → `rowToFood()`, `rowToFoodSearchResult()`
- Modal pattern: `AddMealModal` uses `<Modal>` with `KeyboardAvoidingView` → FoodSearchModal follows same pattern
- `executeSql` and `runTransaction` from `src/db/database.ts` for all DB operations

### Integration Points
- FoodSearchModal triggered from AddMealModal (new "Search Foods" button) and AddLibraryMealModal
- `onFoodSelected` callback returns food object to caller
- Phase 39 (Meal Builder) will consume the food object to build multi-food meals with gram entry

</code_context>

<specifics>
## Specific Ideas

- User wants the UI to feel "aesthetically beautiful and clean" with a "pleasurable user experience" — prioritize polish, smooth interactions, and visual consistency with the Dark Mint Card system
- Search query pre-fills custom food name — reduces friction when creating a food that wasn't found
- Auto-select newly created custom food — zero extra taps to use it after creation
- Frequent foods become populated organically as user logs meals in Phase 39+

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 38-food-search-custom-foods*
*Context gathered: 2026-04-08*
