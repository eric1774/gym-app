# M001: Migration

**Vision:** Build GymTrack from MVP through v1.4 — a local-only Android gym tracking app with exercise logging, protein tracking, workout intelligence, and 82%+ test coverage.

## Success Criteria


## Slices

- [x] **S01: Data Foundation** `risk:medium` `depends:[]`
  > After this: Build the versioned schema migration system that retrofits all existing v1.
- [x] **S02: Protein Tab And Meal Logging** `risk:medium` `depends:[S01]`
  > After this: Add the Protein tab to bottom navigation and build the ProteinScreen with daily goal setup and progress tracking.
- [x] **S03: Protein Intake Chart** `risk:medium` `depends:[S02]`
  > After this: Add a protein intake line chart with time range filter pills to the Protein screen.
- [x] **S04: Polish And Differentiators** `risk:medium` `depends:[S03]`
  > After this: Add streak and 7-day average data queries plus a compact display row component.
- [x] **S05: Meal Library** `risk:medium` `depends:[S04]`
  > After this: Create the data foundation and navigation wiring for the Meal Library feature.
- [x] **S06: Faster Set Logging** `risk:medium` `depends:[S05]`
  > After this: Add weight increment steppers, fix intra-session auto-fill, and wire haptic feedback throughout the workout flow.
- [x] **S07: Pr Detection Volume Tracking** `risk:medium` `depends:[S06]`
  > After this: Create the PR detection query and animated PR toast component as independent building blocks for Phase 10.
- [x] **S08: Quick Start Rest Timer** `risk:medium` `depends:[S07]`
  > After this: Add a "Next Workout" card to the top of the dashboard that identifies the next unfinished program day and allows one-tap workout start.
- [x] **S09: Workout Summary** `risk:medium` `depends:[S08]`
  > After this: Add a workout completion summary screen to WorkoutScreen that displays session stats (duration, total sets, total volume, exercises completed, PRs) as a full-screen card after ending a workout.
- [x] **S10: Calendar View** `risk:medium` `depends:[S09]`
  > After this: Create the calendar data layer, monthly grid screen, and tab navigation wiring so users can view a monthly calendar showing which days they trained.
- [x] **S11: Superset Support** `risk:medium` `depends:[S10]`
  > After this: Add superset data layer (migration v7, types, DB functions) and superset grouping UI in DayDetailScreen so users can create and manage superset exercise groups within program days.
- [x] **S12: Test Infrastructure — Jest config with coverage thresholds, native module mocks, and shared test utilities** `risk:medium` `depends:[S11]`
  > After this: unit tests prove Test Infrastructure — Jest config with coverage thresholds, native module mocks, and shared test utilities works
- [x] **S13: Utility and Mapper Tests — Pure date utility tests and DB row mapper tests across all database modules** `risk:medium` `depends:[S12]`
  > After this: unit tests prove Utility and Mapper Tests — Pure date utility tests and DB row mapper tests across all database modules works
- [x] **S14: DB Business Logic Tests — Full test coverage for all 8 database modules** `risk:medium` `depends:[S13]`
  > After this: unit tests prove DB Business Logic Tests — Full test coverage for all 8 database modules works
- [x] **S15: Component and Context Tests — Rendering and interaction tests for simple and complex components, modals, and context providers** `risk:medium` `depends:[S14]`
  > After this: unit tests prove Component and Context Tests — Rendering and interaction tests for simple and complex components, modals, and context providers works
- [x] **S16: Screens Part 1 — Tests for simpler screens and modal screens** `risk:medium` `depends:[S15]`
  > After this: unit tests prove Screens Part 1 — Tests for simpler screens and modal screens works
- [x] **S17: Screens Part 2 — Tests for complex screens (WorkoutScreen, ProgramDetailScreen, DayDetailScreen, SetLoggingPanel)** `risk:medium` `depends:[S16]`
  > After this: unit tests prove Screens Part 2 — Tests for complex screens (WorkoutScreen, ProgramDetailScreen, DayDetailScreen, SetLoggingPanel) works
- [x] **S18: Gap Closing — Coverage report analysis, targeted tests for files below 80%, threshold verification** `risk:medium` `depends:[S17]`
  > After this: unit tests prove Gap Closing — Coverage report analysis, targeted tests for files below 80%, threshold verification works
