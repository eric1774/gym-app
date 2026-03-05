# GymTrack

## What This Is

A local-only Android gym tracking app built with React Native. Designed for use in the gym — minimal UI that gets out of the way so you can focus on lifting. Tracks exercises, sets, reps, and weights across fully configurable multi-week programs, with progress graphs to visualize improvement over time.

## Core Value

Fast, frictionless set logging mid-workout — log weight + reps in two taps, start your rest timer, and get back to lifting.

## Requirements

### Validated

(None yet — ship to validate)

### Active

- [ ] User can log sets with weight + reps in two fields, then confirm
- [ ] User can manually start a rest timer after logging a set
- [ ] User can view the previous session's weight/reps as reference while logging
- [ ] User can mark an exercise as complete and a day as complete with one tap
- [ ] User can create multi-week programs (e.g., 12-week) with configurable length
- [ ] User can build program days with named workouts (e.g., Day 1 = Legs, Day 2 = Chest)
- [ ] Each day contains a list of exercises with target sets/reps/weight
- [ ] User can add and remove exercises from any day
- [ ] User can add and remove entire workout days from a program
- [ ] User can copy/paste a workout day to quickly build new programs
- [ ] User can view a dashboard with graphs showing strength progression over time per exercise
- [ ] User can view the full history of any exercise (all sessions, weights, reps)
- [ ] User can track program progress — which days are completed in the current week/program
- [ ] User can export their data to a file (JSON or CSV) for backup

### Out of Scope

- Social/sharing features — solo personal use only
- Cloud sync or internet connectivity — fully local
- iOS support — Android only for now
- AI-generated program suggestions — user builds their own programs
- Subscription or monetization — personal tool

## Context

- **Platform**: Android only, local storage (no internet)
- **Framework**: React Native with local SQLite or AsyncStorage for persistence
- **UI Directive**: Use the ui-ux-pro-max skill for all UI design — clean, minimal aesthetic that doesn't compete for attention during a workout
- **UX Priority**: Speed of data entry during an active workout is the #1 UX constraint — screens must be navigable with one hand, eyes-barely-on-phone
- **Rest Timer**: Manual start (user taps to start after logging a set), configurable duration per exercise
- **Progression Display**: Show last session's weight/reps as ghost data while logging — no auto-suggestions, user decides their own progression
- **Data Backup**: Manual export to JSON/CSV file (Android file system)

## Constraints

- **Platform**: Android only — React Native targeting Android API 26+
- **Connectivity**: Zero internet dependency — all data stored locally on device
- **UI Style**: Clean and minimal via ui-ux-pro-max skill — no visual noise, dark or neutral theme appropriate for gym environments
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
*Last updated: 2026-03-04 after initialization*
