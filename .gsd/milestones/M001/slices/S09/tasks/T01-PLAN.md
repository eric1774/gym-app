# T01: 12-workout-summary 01

**Slice:** S09 — **Milestone:** M001

## Description

Add a workout completion summary screen to WorkoutScreen that displays session stats (duration, total sets, total volume, exercises completed, PRs) as a full-screen card after ending a workout.

Purpose: Give users a satisfying punctuation mark at the end of a workout -- clean, glanceable stats before returning to the dashboard.
Output: Modified WorkoutScreen.tsx with inline summary view, prCount tracking, and Done-to-Dashboard navigation.

## Must-Haves

- [ ] "After tapping End Workout and confirming, user sees a full-screen summary card showing duration, total sets, total volume, exercises completed fraction, and PRs hit"
- [ ] "PR row only appears when prCount > 0, styled with prGold color and trophy icon"
- [ ] "User taps Done and is navigated to the Dashboard tab"
- [ ] "Empty sessions (zero sets) skip the summary and discard silently"

## Files

- `src/screens/WorkoutScreen.tsx`
