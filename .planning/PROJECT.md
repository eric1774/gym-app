# GymTrack

## What This Is

A local-only Android gym tracking app built with React Native. Designed for use in the gym — minimal UI that gets out of the way so you can focus on lifting. Tracks exercises, sets, reps, and weights across fully configurable multi-week programs, with progress graphs, full macronutrient tracking (protein/carbs/fat), daily hydration tracking, workout intelligence (PR detection, calendar, supersets), live heart rate monitoring via BLE, and 82%+ test coverage.

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
- ✓ Program data export as JSON via share/save dialog — v1.5
- ✓ BLE foundation: Android permissions, BleManager singleton, DB migration v8, HR types, HRSettingsService — v1.6
- ✓ BLE connection management: device scan, connect, auto-reconnect, connection state indicator, disconnect UX — v1.6
- ✓ HR data persistence: in-session buffering, batch flush to SQLite, avg/peak HR on summary card and calendar — v1.6
- ✓ Live HR display: BPM in workout header, zone coloring, zone labels, age/max HR settings — v1.6
- ✓ Bug fixes: unpair disconnect, zone clamping for below-zone BPM, dead code removal — v1.6

### Active

- [ ] Offline USDA food database (~8,000 foods) bundled and seeded via migration v12
- [ ] Multi-food meal builder with search, per-food gram entry, running macro totals
- [ ] Per-food macro breakdown alongside combined meal totals
- [ ] Copy/repeat previous meals
- [ ] Edit logged meals at individual food level
- [ ] Food search available from both Add Meal and Meal Library flows

### Recently Validated

- ✓ Custom food creation for items not in USDA database — v1.9 (Phase 38)
- ✓ Fuzzy search with debounce and frequency boosting — v1.9 (Phase 38)
- ✓ Frequent foods list and remembered portions — v1.9 (Phase 38)
- ✓ Tab bar on ProteinScreen switching between Macros and Hydration views — v1.8
- ✓ Cup visualization with gradient fill proportional to daily water progress — v1.8
- ✓ Water goal setting in fl oz with first-use prompt and inline editing — v1.8
- ✓ Log Water modal for custom amounts — v1.8
- ✓ Quick-add buttons (+8/+16/+24 oz) with haptic feedback — v1.8
- ✓ Add-only water logging with daily running total — v1.8
- ✓ Hydration streak (consecutive days meeting goal) and weekly average stats — v1.8
- ✓ DB migration v11 with water_logs and water_settings tables — v1.8
- ✓ Multi-macro goal setting with per-macro daily targets and live calorie estimation — v1.7
- ✓ Three stacked progress bars showing P/C/F progress with calorie breakdown — v1.7
- ✓ Per-macro chart with tab selector and color-coded lines — v1.7
- ✓ 3-macro meal entry with colored inputs and calorie preview — v1.7
- ✓ 3-macro meal library support with one-tap logging — v1.7
- ✓ Colored macro badges on meal list items — v1.7
- ✓ Protein streak unchanged by carbs/fat goal additions — v1.7

## Current Milestone: v1.9 Food Database & Meal Builder

**Goal:** Eliminate manual nutrition lookups by bundling an offline USDA food database with a multi-food meal builder that auto-calculates macros from gram weights.

**Target features:**
- Offline USDA food database (~8,000 foods) seeded via migration v12
- Multi-food meal builder with search, per-food gram entry, and running totals
- Custom food creation for items not in USDA database
- Fuzzy search with frequency boosting and remembered portions
- Copy/repeat previous meals
- Edit logged meals at individual food level

**Spec:** `docs/superpowers/specs/2026-04-08-food-database-meal-builder-design.md`

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
- **DB Schema**: Migration v12 (latest — foods and meal_foods tables for food search and custom foods). v11 added water_logs and water_settings.
- **UI Directive**: Use ui-ux-pro-max for mobile UX best practices and dark-mint-card-ui for visual/aesthetic design — clean, minimal dark theme with mint accents
- **UX Priority**: Speed of data entry during an active workout is the #1 UX constraint
- **Rest Timer**: Manual start, configurable duration per exercise
- **Progression Display**: Show last session's weight/reps as ghost data while logging
- **Data Backup**: Manual export to JSON/CSV file (Android file system)
- **Shipped**: v1.0 MVP → v1.1 Protein → v1.2 Meal Library → v1.3 Workout Intelligence → v1.4 Test Coverage → v1.5 Program Data Export → v1.6 Heart Rate Monitoring → v1.7 Macros Tracking → v1.8 Hydration Tracker

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
| Module-level BleManager singleton | Prevents native memory leaks on re-render/hot reload | ✓ Good |
| AsyncStorage for HR settings | Three scalar preferences (age, maxHR, deviceId) — never joined relationally | ✓ Good |
| Tanaka formula (208 - 0.7*age) | More accurate for adults over 40 than 220-age | ✓ Good |
| HR samples buffered in useRef | Batch flush on session end protects set-logging speed from per-sample DB writes | ✓ Good |
| Exponential backoff reconnect | 1/2/4/8/16s intervals, max 5 attempts — prevents BLE stack flooding | ✓ Good |
| Two-row workout header | Row 1 (timer, volume, End Workout) always fits; Row 2 (HR) only when device paired | ✓ Good |
| water_settings separate from macro_settings | Hydration and macros are independent features with no shared state | ✓ Good |
| Add-only water logging | No delete/edit keeps hydration UX fast and simple — consistent with core value | ✓ Good |
| Tab-based Macros/Hydration switching | State-based activeTab on ProteinScreen, no new navigation dependencies | ✓ Good |
| WaterCup CUP_HEIGHT=200 constant | Fill fraction * constant height ensures consistent visual rendering | ✓ Good |
| LogWaterModal Math.round validation | Prevents fractional oz injection into DB — threat mitigation T-35-03 | ✓ Good |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd:transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd:complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-04-08 after v1.9 Food Database & Meal Builder milestone start*
