# T02: 10-pr-detection-volume-tracking 02

**Slice:** S07 — **Milestone:** M001

## Description

Wire PR detection, double haptic, and running volume total into WorkoutScreen. This integrates the building blocks from Plan 01 into the live workout flow.

Purpose: Connects the PR query and toast component to the actual set logging flow, and adds volume tracking to the header.
Output: Fully functional PR celebration and volume display in the workout screen.

## Must-Haves

- [ ] "When a logged set exceeds all previous weight at that rep count, a gold PR toast slides in from the top"
- [ ] "User feels two distinct haptic pulses 400ms apart on PR detection"
- [ ] "The workout header displays a running volume total that updates immediately after each set is logged"

## Files

- `src/screens/WorkoutScreen.tsx`
