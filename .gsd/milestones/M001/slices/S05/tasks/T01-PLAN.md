# T01: 08-meal-library 01

**Slice:** S05 — **Milestone:** M001

## Description

Create the data foundation and navigation wiring for the Meal Library feature.

Purpose: Establish the LibraryMeal type, database table, repository CRUD functions, navigation route, and the entry-point button on the Protein screen so that Plan 02 can build the full UI against concrete contracts.
Output: LibraryMeal type, meal_library migration, 3 repository functions, updated navigation, "Meal Library" button on ProteinScreen.

## Must-Haves

- [ ] "LibraryMeal type exists with id, name, proteinGrams, mealType, createdAt fields"
- [ ] "meal_library table is created by migration version 4"
- [ ] "Repository functions exist: addLibraryMeal, getLibraryMealsByType, deleteLibraryMeal"
- [ ] "ProteinStackParamList includes MealLibrary route"
- [ ] "Protein screen shows a 'Meal Library' outlined button below quick-add buttons"
- [ ] "Tapping the Meal Library button navigates to the MealLibrary route"

## Files

- `src/types/index.ts`
- `src/db/migrations.ts`
- `src/db/protein.ts`
- `src/db/index.ts`
- `src/navigation/TabNavigator.tsx`
- `src/screens/ProteinScreen.tsx`
