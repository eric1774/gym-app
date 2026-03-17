# T01: 11-quick-start-rest-timer 01

**Slice:** S08 — **Milestone:** M001

## Description

Add a "Next Workout" card to the top of the dashboard that identifies the next unfinished program day and allows one-tap workout start.

Purpose: Users currently must navigate Programs > Program > Day > Start Workout (4 taps). This card reduces that to 1 tap from the home screen — the most impactful UX improvement for daily use.

Output: Dashboard shows a card with program name, day name, exercise count, and a Start button. Tapping Start creates a session and navigates to the Workout tab. When a session is active, the card switches to an "ACTIVE WORKOUT" state with elapsed time and Continue.

## Must-Haves

- [ ] "User sees a Next Workout card at the top of the dashboard showing program name, day name, and exercise count"
- [ ] "Tapping Start on the Next Workout card creates a session and navigates to the workout screen with exercises pre-loaded"
- [ ] "When a workout session is active, the card shows ACTIVE WORKOUT with elapsed time and a Continue button"
- [ ] "If no programs exist, the Next Workout card is hidden entirely"
- [ ] "When all days are done for the current week, the card shows the first day of the next week"

## Files

- `src/db/dashboard.ts`
- `src/types/index.ts`
- `src/screens/DashboardScreen.tsx`
