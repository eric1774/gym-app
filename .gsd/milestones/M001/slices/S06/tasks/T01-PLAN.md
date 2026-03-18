# T01: 09-faster-set-logging 01

**Slice:** S06 — **Milestone:** M001

## Description

Add weight increment steppers, fix intra-session auto-fill, and wire haptic feedback throughout the workout flow.

Purpose: Reduce friction during set logging so users can adjust weight with one tap instead of typing, see correct pre-filled values when switching between exercises, and feel tactile confirmation at every interaction point.
Output: Modified SetLoggingPanel with stacked stepper layout and haptic-enabled WorkoutScreen.

## Must-Haves

- [ ] "User can tap +5 or -5 buttons flanking the weight input to adjust weight without typing"
- [ ] "The -5 button is disabled when weight would go below 0"
- [ ] "User can still tap the weight TextInput for manual override (e.g. 67.5)"
- [ ] "When user collapses and re-expands a logging panel mid-session, weight and reps pre-fill from the most recent intra-session set"
- [ ] "First set of a session still pre-fills from last session (existing behavior preserved)"
- [ ] "User feels impactLight haptic on stepper tap"
- [ ] "User feels impactMedium haptic on set confirm (rep-based and timed)"
- [ ] "User feels impactLight haptic on exercise complete toggle"
- [ ] "User feels notificationSuccess haptic on end workout"

## Files

- `src/components/SetLoggingPanel.tsx`
- `src/screens/WorkoutScreen.tsx`
