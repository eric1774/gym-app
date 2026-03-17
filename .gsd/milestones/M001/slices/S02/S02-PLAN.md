# S02: Protein Tab And Meal Logging

**Goal:** Add the Protein tab to bottom navigation and build the ProteinScreen with daily goal setup and progress tracking.
**Demo:** Add the Protein tab to bottom navigation and build the ProteinScreen with daily goal setup and progress tracking.

## Must-Haves


## Tasks

- [x] **T01: 05-protein-tab-and-meal-logging 01**
  - Add the Protein tab to bottom navigation and build the ProteinScreen with daily goal setup and progress tracking.

Purpose: Users need a dedicated tab to access protein tracking. The screen must handle two states: first-time (no goal set) shows inline goal setup form; returning user sees a progress bar filling as meals are logged, with tap-to-edit for changing the goal.

Output: Working Protein tab with carrot icon, functional goal setup, and live progress bar that reads from the Phase 4 repository.
- [x] **T02: 05-protein-tab-and-meal-logging 02**
  - Build the Add/Edit Meal modal and swipeable meal list, then wire everything into ProteinScreen for complete meal CRUD.

Purpose: Users need to log meals with protein amounts, edit existing meals, and delete meals. This completes the core protein tracking workflow: set goal (Plan 01) -> log meals -> see progress update.

Output: Fully functional meal logging with add/edit modal, today's meal list with swipe-to-delete, and real-time progress bar updates after every mutation.

## Files Likely Touched

- `src/navigation/TabNavigator.tsx`
- `src/screens/ProteinScreen.tsx`
- `src/components/ProteinProgressBar.tsx`
- `src/components/GoalSetupForm.tsx`
- `src/screens/AddMealModal.tsx`
- `src/components/MealTypePills.tsx`
- `src/components/MealListItem.tsx`
- `src/screens/ProteinScreen.tsx`
