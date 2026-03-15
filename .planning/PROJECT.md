# GymTrack

## What This Is

A local-only Android gym tracking app built with React Native. Designed for use in the gym — minimal UI that gets out of the way so you can focus on lifting. Tracks exercises, sets, reps, and weights across fully configurable multi-week programs, with progress graphs to visualize improvement over time.

## Core Value

Fast, frictionless set logging mid-workout — log weight + reps in two taps, start your rest timer, and get back to lifting.

## Requirements

### Validated

- ✓ User can log sets with weight + reps in two fields, then confirm — v1.0
- ✓ User can manually start a rest timer after logging a set — v1.0
- ✓ User can view the previous session's weight/reps as reference while logging — v1.0
- ✓ User can mark an exercise as complete and a day as complete with one tap — v1.0
- ✓ User can create multi-week programs with configurable length — v1.0
- ✓ User can build program days with named workouts — v1.0
- ✓ Each day contains a list of exercises with target sets/reps/weight — v1.0
- ✓ User can add and remove exercises from any day — v1.0
- ✓ User can add and remove entire workout days from a program — v1.0
- ✓ User can view a dashboard with graphs showing strength progression over time — v1.0
- ✓ User can view the full history of any exercise — v1.0
- ✓ User can track program progress — v1.0
- ✓ User can view a "Protein" tab with carrot icon in bottom navigation — v1.1
- ✓ User can set a daily protein goal with a progress bar that fills as meals are logged — v1.1
- ✓ User can view a line chart of protein intake filterable by 1W/1M/3M/All — v1.1
- ✓ User can log a meal with protein amount (grams) and description — v1.1
- ✓ User can view today's meal history and edit description, amount, or date — v1.1
- ✓ User can delete a meal entry from history — v1.1
- ✓ User can re-log a frequent meal with one tap via quick-add buttons — v1.1
- ✓ User can see a streak of consecutive days meeting protein goal — v1.1
- ✓ User can see a rolling 7-day average of daily protein intake — v1.1
- ✓ User can manage a meal library organized by type with add/delete — v1.2
- ✓ User can one-tap a library meal to log it to today's protein tracking — v1.2
- ✓ Weight steppers, auto-fill fix, haptic feedback for set logging — v1.3
- ✓ PR detection with animated toast and double haptic — v1.3
- ✓ Running volume total in workout header — v1.3
- ✓ Quick-start next workout from dashboard — v1.3
- ✓ Per-exercise rest timer configuration — v1.3
- ✓ Workout completion summary screen — v1.3
- ✓ Monthly calendar view with session details — v1.3
- ✓ Superset grouping with DB migration v7 — v1.3

## Current Milestone: v1.4 Test Coverage

**Goal:** Reach 80%+ line coverage across the codebase with Jest, integrated with SonarQube for continuous quality tracking.

**Target features:**
- Jest infrastructure setup with mocks, test utilities, and coverage config
- Unit tests for pure utility functions and DB row mappers
- Integration tests for DB business logic layer
- Component tests for simple and complex UI components
- Context provider tests (SessionContext, TimerContext)
- Screen tests for all app screens
- Gap-closing pass to ensure 80%+ global threshold
- SonarQube coverage integration via lcov reports

### Active

- [ ] Jest config with coverage thresholds, mocks, and test utilities
- [ ] Pure utility and DB row mapper tests
- [ ] DB business logic tests (exercises, sessions, sets, programs, protein, dashboard, calendar)
- [ ] Simple component tests (buttons, pills, list items, banners)
- [ ] Complex component and modal tests
- [ ] Context provider tests (SessionContext, TimerContext)
- [ ] Screen tests part 1 (simpler screens)
- [ ] Screen tests part 2 (complex screens — WorkoutScreen, ProgramDetail, DayDetail, SetLogging)
- [ ] Gap-closing pass to reach 80%+ threshold

### Out of Scope

- Social/sharing features — solo personal use only
- Cloud sync or internet connectivity — fully local
- iOS support — Android only for now
- AI-generated program suggestions — user builds their own programs
- Subscription or monetization — personal tool

## Context

- **Platform**: Android only, local storage (no internet)
- **Framework**: React Native with local SQLite or AsyncStorage for persistence
- **UI Directive**: Use ui-ux-pro-max for mobile UX best practices (layout, interaction patterns, accessibility) and dark-mint-card-ui for visual/aesthetic design (colors, cards, styling) — clean, minimal aesthetic that doesn't compete for attention during a workout
- **UX Priority**: Speed of data entry during an active workout is the #1 UX constraint — screens must be navigable with one hand, eyes-barely-on-phone
- **Rest Timer**: Manual start (user taps to start after logging a set), configurable duration per exercise
- **Progression Display**: Show last session's weight/reps as ghost data while logging — no auto-suggestions, user decides their own progression
- **Data Backup**: Manual export to JSON/CSV file (Android file system)

## Constraints

- **Platform**: Android only — React Native targeting Android API 26+
- **Connectivity**: Zero internet dependency — all data stored locally on device
- **UI Style**: Clean and minimal via ui-ux-pro-max + dark-mint-card-ui skills — no visual noise, dark theme with mint accents appropriate for gym environments
- **Input Speed**: Every data entry interaction must be optimized for speed — workout flow cannot be interrupted by complex navigation

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| React Native | Cross-platform capability, strong UI ecosystem, ui-ux-pro-max skill compatibility | — Pending |
| Local storage only | User explicitly wants offline-only, no internet dependency | — Pending |
| Manual rest timer start | User preference — they want to control when rest starts | — Pending |
| Show last session as reference | Supports manual progression decisions without auto-suggesting | — Pending |
| Export to file for backup | Simple, no cloud needed, user controls their data | — Pending |

---
*Last updated: 2026-03-15 after milestone v1.4 started*
