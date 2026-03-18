# T02: 05-protein-tab-and-meal-logging 02

**Slice:** S02 — **Milestone:** M001

## Description

Build the Add/Edit Meal modal and swipeable meal list, then wire everything into ProteinScreen for complete meal CRUD.

Purpose: Users need to log meals with protein amounts, edit existing meals, and delete meals. This completes the core protein tracking workflow: set goal (Plan 01) -> log meals -> see progress update.

Output: Fully functional meal logging with add/edit modal, today's meal list with swipe-to-delete, and real-time progress bar updates after every mutation.

## Must-Haves

- [ ] "User can tap Add Meal button to open a full-screen modal with meal type pills, protein grams input, optional description, and backdate option"
- [ ] "User can view today's logged meals in a scrollable list below the Add Meal button, newest first"
- [ ] "User can tap a meal row to open the edit modal pre-filled with that meal's data"
- [ ] "User can swipe left on a meal to reveal a Delete button, then confirm deletion via alert"
- [ ] "After adding, editing, or deleting a meal, the list and progress bar update immediately"

## Files

- `src/screens/AddMealModal.tsx`
- `src/components/MealTypePills.tsx`
- `src/components/MealListItem.tsx`
- `src/screens/ProteinScreen.tsx`
