# T02: 08-meal-library 02

**Slice:** S05 — **Milestone:** M001

## Description

Build the complete Meal Library screen and Add-to-Library modal, then wire them into navigation.

Purpose: Deliver the full user-facing Meal Library feature -- browse saved meals by type, add new meals to the library, swipe-to-delete, and one-tap log any meal to today's protein tracking.
Output: MealLibraryScreen.tsx, AddLibraryMealModal.tsx, updated TabNavigator replacing the placeholder.

## Must-Haves

- [ ] "User sees saved meals organized by meal type sections (Breakfast / Lunch / Dinner / Snack)"
- [ ] "Empty sections are hidden -- only types with meals appear"
- [ ] "Meals within each section are sorted alphabetically"
- [ ] "Each row shows meal name on left and protein grams on right"
- [ ] "User can swipe a meal row left to reveal delete action and delete it"
- [ ] "User can tap '+' in header to open Add to Library modal"
- [ ] "User can fill name, protein grams, meal type and save a new library meal"
- [ ] "User can tap any meal row to instantly log it to today's protein tracking"
- [ ] "Toast shows 'Name Xg logged' and auto-dismisses after 2 seconds"
- [ ] "User stays on library screen after logging -- no navigation occurs"
- [ ] "Empty library shows 'No saved meals yet' text with prominent Add Meal button"

## Files

- `src/screens/MealLibraryScreen.tsx`
- `src/screens/AddLibraryMealModal.tsx`
- `src/navigation/TabNavigator.tsx`
