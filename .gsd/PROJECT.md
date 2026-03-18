# GymTrack

## What This Is

A local-only Android gym tracking app built with React Native. Designed for use in the gym — minimal UI that gets out of the way so you can focus on lifting. Tracks exercises, sets, reps, and weights across fully configurable multi-week programs, with progress graphs, protein tracking, workout intelligence (PR detection, calendar, supersets), and 82%+ test coverage.

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
- ✓ Jest infrastructure with 80% coverage thresholds and native module mocks — v1.4
- ✓ Unit tests for date utilities and all DB row mapper functions — v1.4
- ✓ DB business logic tests for all 8 database modules — v1.4
- ✓ Component and context provider tests (rendering, interaction, lifecycle) — v1.4
- ✓ Screen tests for all app screens including complex workout flows — v1.4
- ✓ 82.26% global line coverage with Jest threshold enforcement — v1.4

### Active

- M002: Exercise Progression Dashboard Redesign — Category Drill-Down (all 4 slices complete, awaiting on-device UAT)

### Out of Scope

- Social/sharing features — solo personal use only
- Cloud sync or internet connectivity — fully local
- iOS support — Android only for now
- AI-generated program suggestions — user builds their own programs
- Subscription or monetization — personal tool

## Context

- **Platform**: Android only, local storage (no internet)
- **Framework**: React Native with local SQLite for persistence
- **Test Coverage**: 82.26% lines, 75.37% functions, 72.09% branches — Jest with 80/70 thresholds enforced
- **DB Schema**: Migration v7 (latest — superset support)
- **UI Directive**: Use ui-ux-pro-max for mobile UX best practices and dark-mint-card-ui for visual/aesthetic design — clean, minimal dark theme with mint accents
- **UX Priority**: Speed of data entry during an active workout is the #1 UX constraint
- **Rest Timer**: Manual start, configurable duration per exercise
- **Progression Display**: Show last session's weight/reps as ghost data while logging
- **Data Backup**: Manual export to JSON/CSV file (Android file system)
- **Shipped**: v1.0 MVP → v1.1 Protein → v1.2 Meal Library → v1.3 Workout Intelligence → v1.4 Test Coverage

## Constraints

- **Platform**: Android only — React Native targeting Android API 26+
- **Connectivity**: Zero internet dependency — all data stored locally on device
- **UI Style**: Clean and minimal via ui-ux-pro-max + dark-mint-card-ui skills — dark theme with mint accents
- **Input Speed**: Every data entry interaction must be optimized for speed

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| React Native | Cross-platform capability, strong UI ecosystem | ✓ Good |
| Local storage only | User wants offline-only, no internet dependency | ✓ Good |
| Manual rest timer start | User preference — control when rest starts | ✓ Good |
| Show last session as reference | Supports manual progression decisions | ✓ Good |
| Export to file for backup | Simple, no cloud needed, user controls their data | ✓ Good |
| SQLite with migration system | Reliable local storage, schema evolves with features | ✓ Good |
| Jest with 80/70 thresholds | Balance coverage quality with UI-heavy conditional renders | ✓ Good — achieved 82.26% |
| jest.mock auto-mock pattern | Prevents native module crashes in test environment | ✓ Good |
| renderWithProviders utility | Reusable test wrapper for screens needing context/navigation | ✓ Good |
| Object.defineProperty for db mock | Required because db export is read-only const | ✓ Good |

---
*Last updated: 2026-03-17 after M002-S04 complete (all slices done)*
