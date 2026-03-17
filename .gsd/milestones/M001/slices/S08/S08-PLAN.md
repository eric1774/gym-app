# S08: Quick Start Rest Timer

**Goal:** Add a "Next Workout" card to the top of the dashboard that identifies the next unfinished program day and allows one-tap workout start.
**Demo:** Add a "Next Workout" card to the top of the dashboard that identifies the next unfinished program day and allows one-tap workout start.

## Must-Haves


## Tasks

- [x] **T01: 11-quick-start-rest-timer 01**
  - Add a "Next Workout" card to the top of the dashboard that identifies the next unfinished program day and allows one-tap workout start.

Purpose: Users currently must navigate Programs > Program > Day > Start Workout (4 taps). This card reduces that to 1 tap from the home screen — the most impactful UX improvement for daily use.

Output: Dashboard shows a card with program name, day name, exercise count, and a Start button. Tapping Start creates a session and navigates to the Workout tab. When a session is active, the card switches to an "ACTIVE WORKOUT" state with elapsed time and Continue.
- [x] **T02: 11-quick-start-rest-timer 02**
  - Add visible rest duration per exercise and +/- 15s steppers for editing rest time during a workout.

Purpose: Users currently have no visibility into or control over per-exercise rest duration. The rest timer always uses the exercise default (90s fallback). This feature surfaces the rest duration in the exercise card, lets users customize it mid-workout, and persists changes for future sessions.

Output: Each expanded exercise card shows "Rest: Xs" label. Tapping reveals +/- 15s steppers (matching Phase 9 weight stepper UX). Changes persist to both `exercises.default_rest_seconds` and `exercise_sessions.rest_seconds`. The rest timer reads from `exercise_sessions.rest_seconds`.

## Files Likely Touched

- `src/db/dashboard.ts`
- `src/types/index.ts`
- `src/screens/DashboardScreen.tsx`
- `src/db/exercises.ts`
- `src/db/sessions.ts`
- `src/screens/WorkoutScreen.tsx`
