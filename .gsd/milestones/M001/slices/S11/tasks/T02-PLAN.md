# T02: 14-superset-support 02

**Slice:** S11 — **Milestone:** M001

## Description

Add superset visual treatment and auto-advance behavior to WorkoutScreen so users see grouped exercises in a shared container and experience seamless alternating-set flow during workouts.

Purpose: SUP-02 (visual grouping), SUP-03 (auto-advance), SUP-04 (rest after last) deliver the core workout experience for supersets — the auto-advance cycle that makes supersets feel fast and frictionless.
Output: WorkoutScreen renders superset containers with accent bar, auto-advances through exercises in a group, suppresses rest timer for non-last exercises, and shows round progress.

## Must-Haves

- [ ] "Superset exercises render inside a shared container with mint accent bar and SUPERSET header label during workout"
- [ ] "After logging a set for a non-last exercise in a superset, the next exercise auto-expands immediately"
- [ ] "After logging a set for the last exercise in a superset, the rest timer prompt appears"
- [ ] "Rest timer start button is hidden for non-last exercises in a superset"
- [ ] "SUPERSET header shows round progress (e.g. Round 2/3)"

## Files

- `src/screens/WorkoutScreen.tsx`
