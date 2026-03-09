# Phase 8: Meal Library - Context

**Gathered:** 2026-03-09
**Status:** Ready for planning

<domain>
## Phase Boundary

A dedicated Meal Library screen for managing saved meal templates, accessible from the Protein screen. Users can add meals to the library, view them organized by type, delete them, and one-tap any meal to instantly log it to today's protein tracking. No editing of library meals (delete and re-add per REQUIREMENTS.md). No new macros, no meal planning, no import/export.

</domain>

<decisions>
## Implementation Decisions

### Library list layout
- SectionList grouped by meal type: Breakfast, Lunch, Dinner, Snack
- Sections with no meals are hidden (not shown as empty sections)
- Each row shows: meal name (left) + protein grams (right, e.g. "35g") — two-column layout matching MealListItem pattern
- Meals ordered alphabetically (A-Z) within each section
- Swipe-to-delete on each row (reuse MealListItem swipe pattern from Phase 5)
- Empty library state: centered "No saved meals yet" text + prominent "Add Meal" button below

### Add to Library flow
- '+' button in top-right header/toolbar of the library screen
- Simplified bottom-sheet modal (same pattern as AddMealModal) with 3 fields:
  - Name (required) — text input
  - Protein grams (required) — numeric with decimal support
  - Meal type (required) — MealTypePills horizontal pill selector
- No date/time field — library meals are templates, not logged entries
- No duplicate detection — user can freely add duplicates (delete and re-add if wrong)

### One-tap logging UX
- Tapping a meal row instantly logs it to today's protein tracking — no modal, no confirmation dialog
- Logged meal uses: current date/time as timestamp, library meal's name as description, library meal's protein grams and meal type
- User stays on the library screen after logging (can log multiple meals without navigating)
- Toast confirmation: brief overlay message (e.g. "Chicken 35g logged") auto-dismisses after 2 seconds — reuse Phase 7 toast pattern
- If user needs a different time, they edit the logged meal on the Protein screen afterward

### Entry point on Protein screen
- Full-width outlined/secondary button (border-only, accent color text) labeled "Meal Library"
- Placement: below quick-add buttons in the list header (Progress bar → Streak/Avg → Add Meal → Quick-add → **Meal Library** → Chart)
- Visually distinct from the filled "Add Meal" button — signals navigation rather than action

### Navigation
- Stack navigation: Protein screen pushes Meal Library screen onto the stack
- Standard back arrow in header (auto-provided by React Navigation)
- User can swipe back or tap arrow to return to Protein screen

### Claude's Discretion
- Data model implementation (new table for library meals vs. flagged meals table)
- Library screen header styling and title treatment
- Section header styling (font size, color, spacing)
- Toast positioning and animation on library screen
- '+' button icon/styling in header
- Outlined button border width, corner radius, and spacing

</decisions>

<specifics>
## Specific Ideas

- Library meals are templates, not logged entries — conceptually separate from the meals table's consumed meal records
- "Delete and re-add" is the edit strategy per REQUIREMENTS.md — no edit modal needed for library meals
- Quick-add buttons on Protein screen (Phase 7) show recent logged meals; Meal Library is the curated/saved collection — complementary but separate features
- The outlined button style for "Meal Library" creates clear visual hierarchy: filled = action (Add Meal), outlined = navigation (Meal Library)

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- `MealListItem` (src/components/MealListItem.tsx): swipe-to-delete pattern with PanResponder — adapt for library rows
- `MealTypePills` (src/components/MealTypePills.tsx): horizontal pill selector for meal type — reuse in Add to Library modal
- `AddMealModal` (src/screens/AddMealModal.tsx): bottom-sheet modal pattern with form fields — pattern for simplified library add modal
- `addMeal()` (src/db/protein.ts): existing function to log a meal — one-tap logging calls this with library meal data
- Toast pattern (ProteinScreen.tsx): `toastMessage` state + absolute-positioned overlay with auto-dismiss — reuse for library logging feedback
- Theme tokens: colors, spacing, fontSize, weightBold/SemiBold — consistent styling

### Established Patterns
- FlatList/SectionList with ListHeaderComponent for stable header references
- `useFocusEffect` for data refresh on screen focus
- Repository functions as standalone async exports in src/db/ modules
- `React.memo` and `useCallback` for list item performance
- Bottom-sheet modals: Modal + KeyboardAvoidingView + Pressable overlay + View sheet

### Integration Points
- `src/screens/ProteinScreen.tsx`: add "Meal Library" button to `listHeader` useMemo, below QuickAddButtons
- ProteinStackNavigator: add MealLibraryScreen as a stack route
- `src/db/protein.ts` (or new file): library CRUD functions (addLibraryMeal, getLibraryMeals, deleteLibraryMeal)
- `src/db/migrations.ts`: new migration for meal_library table
- `src/db/index.ts`: barrel export for new library repository functions

</code_context>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 08-meal-library*
*Context gathered: 2026-03-09*
