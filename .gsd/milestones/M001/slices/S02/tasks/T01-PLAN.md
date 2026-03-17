# T01: 05-protein-tab-and-meal-logging 01

**Slice:** S02 — **Milestone:** M001

## Description

Add the Protein tab to bottom navigation and build the ProteinScreen with daily goal setup and progress tracking.

Purpose: Users need a dedicated tab to access protein tracking. The screen must handle two states: first-time (no goal set) shows inline goal setup form; returning user sees a progress bar filling as meals are logged, with tap-to-edit for changing the goal.

Output: Working Protein tab with carrot icon, functional goal setup, and live progress bar that reads from the Phase 4 repository.

## Must-Haves

- [ ] "User can see a Protein tab with carrot icon as the 5th (rightmost) tab in bottom navigation"
- [ ] "User can set a daily protein goal via inline form on first visit (no modal)"
- [ ] "User can see a horizontal progress bar showing percentage and Xg / Yg text after goal is set"
- [ ] "Progress bar resets to zero on a new calendar day (midnight boundary)"
- [ ] "User can tap the progress bar to edit their goal inline with Save/Cancel"

## Files

- `src/navigation/TabNavigator.tsx`
- `src/screens/ProteinScreen.tsx`
- `src/components/ProteinProgressBar.tsx`
- `src/components/GoalSetupForm.tsx`
