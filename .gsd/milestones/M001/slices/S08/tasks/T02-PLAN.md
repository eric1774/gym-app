# T02: 11-quick-start-rest-timer 02

**Slice:** S08 — **Milestone:** M001

## Description

Add visible rest duration per exercise and +/- 15s steppers for editing rest time during a workout.

Purpose: Users currently have no visibility into or control over per-exercise rest duration. The rest timer always uses the exercise default (90s fallback). This feature surfaces the rest duration in the exercise card, lets users customize it mid-workout, and persists changes for future sessions.

Output: Each expanded exercise card shows "Rest: Xs" label. Tapping reveals +/- 15s steppers (matching Phase 9 weight stepper UX). Changes persist to both `exercises.default_rest_seconds` and `exercise_sessions.rest_seconds`. The rest timer reads from `exercise_sessions.rest_seconds`.

## Must-Haves

- [ ] "Each exercise card shows its configured rest duration (e.g. 'Rest: 90s') inside the expanded panel"
- [ ] "User can tap the rest duration label to reveal +/- 15s stepper buttons"
- [ ] "Tapping a stepper changes the displayed rest duration and persists to both exercise default and session rest"
- [ ] "When user starts rest timer, it counts down using the exercise-specific duration from exercise_sessions.rest_seconds"
- [ ] "Rest steppers enforce 30s minimum and 180s maximum"

## Files

- `src/db/exercises.ts`
- `src/db/sessions.ts`
- `src/screens/WorkoutScreen.tsx`
