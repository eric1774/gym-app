# T02: 07-polish-and-differentiators 02

**Slice:** S04 — **Milestone:** M001

## Description

Add quick-add buttons and wire all Phase 7 features into the ProteinScreen.

Purpose: Users can re-log frequent meals with one tap (maximum speed), and see their streak + average feedback integrated into the existing screen layout.
Output: Complete Phase 7 ProteinScreen with quick-add, streak, and rolling average.

## Must-Haves

- [ ] "User sees up to 3 quick-add buttons below the Add Meal button, each showing description + grams of a recent distinct meal"
- [ ] "Tapping a quick-add button instantly logs that meal with current date/time and refreshes the screen data"
- [ ] "Brief visual confirmation appears after quick-add tap"
- [ ] "Quick-add buttons are hidden when no meals have been logged yet"
- [ ] "Streak indicator and 7-day average are visible on the Protein screen in the correct layout position"
- [ ] "Rolling 7-day average displays on the Protein screen below the progress bar"

## Files

- `src/db/protein.ts`
- `src/db/index.ts`
- `src/components/QuickAddButtons.tsx`
- `src/screens/ProteinScreen.tsx`
