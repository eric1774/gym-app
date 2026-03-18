# S05: Meal Library

**Goal:** Create the data foundation and navigation wiring for the Meal Library feature.
**Demo:** Create the data foundation and navigation wiring for the Meal Library feature.

## Must-Haves


## Tasks

- [x] **T01: 08-meal-library 01**
  - Create the data foundation and navigation wiring for the Meal Library feature.

Purpose: Establish the LibraryMeal type, database table, repository CRUD functions, navigation route, and the entry-point button on the Protein screen so that Plan 02 can build the full UI against concrete contracts.
Output: LibraryMeal type, meal_library migration, 3 repository functions, updated navigation, "Meal Library" button on ProteinScreen.
- [x] **T02: 08-meal-library 02**
  - Build the complete Meal Library screen and Add-to-Library modal, then wire them into navigation.

Purpose: Deliver the full user-facing Meal Library feature -- browse saved meals by type, add new meals to the library, swipe-to-delete, and one-tap log any meal to today's protein tracking.
Output: MealLibraryScreen.tsx, AddLibraryMealModal.tsx, updated TabNavigator replacing the placeholder.

## Files Likely Touched

- `src/types/index.ts`
- `src/db/migrations.ts`
- `src/db/protein.ts`
- `src/db/index.ts`
- `src/navigation/TabNavigator.tsx`
- `src/screens/ProteinScreen.tsx`
- `src/screens/MealLibraryScreen.tsx`
- `src/screens/AddLibraryMealModal.tsx`
- `src/navigation/TabNavigator.tsx`
