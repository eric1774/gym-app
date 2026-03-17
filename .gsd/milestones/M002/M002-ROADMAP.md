# M002: Exercise Progression Dashboard Redesign — Category Drill-Down

**Vision:** Replace the flat 30+ exercise dashboard list with ~7 compact category drill-down cards showing sparkline trends, with a new CategoryProgressScreen for per-exercise detail.

## Success Criteria

- Dashboard shows ~7 category cards with sparklines instead of 30+ flat exercise rows
- Tapping a category card navigates to CategoryProgressScreen with all exercises, sparklines, and deltas
- Stale categories (30+ days untrained) appear dimmed but visible
- Time range filter (1M/3M/6M/All) on CategoryProgressScreen updates sparkline data
- Timed exercises show duration format instead of weight
- Full navigation chain works: Dashboard → CategoryProgress → ExerciseProgress → back

## Key Risks / Unknowns

- DB query performance for batch sparkline aggregation — could be slow with many exercises/sessions
- Removing SubCategorySection — need to verify no other screens depend on it

## Proof Strategy

- DB query performance → retire in S01 by proving queries return correct data within acceptable latency on real workout data
- SubCategorySection removal → retire in S03 by verifying no other imports exist before removing

## Verification Classes

- Contract verification: build check, component rendering with correct props, DB queries return expected shapes
- Integration verification: full navigation flow Dashboard → CategoryProgress → ExerciseProgress with real data
- Operational verification: none
- UAT / human verification: visual check that sparklines render correctly, stale dimming looks right, card layout matches design intent

## Milestone Definition of Done

This milestone is complete only when all are true:

- All 4 slices are complete and verified
- Dashboard renders category cards with real sparkline data from SQLite
- CategoryProgressScreen shows exercises with sparklines, deltas, and time range filtering
- Full navigation chain works end-to-end on device/emulator
- Stale dimming and timed exercise formatting work correctly
- App builds and deploys to Android without errors
- Success criteria re-checked against live behavior on device

## Requirement Coverage

- Covers: Dashboard progression viewing (redesigned from flat list to category drill-down)
- Partially covers: none
- Leaves for later: none
- Orphan risks: none

## Slices

- [x] **S01: Data Layer — DB Queries & Types** `risk:medium` `depends:[]`
  > After this: `getCategorySummaries()` and `getCategoryExerciseProgress()` return correct data from SQLite; types are defined and exported
- [ ] **S02: MiniSparkline & CategorySummaryCard Components** `risk:low` `depends:[S01]`
  > After this: MiniSparkline renders SVG trend lines from data arrays; CategorySummaryCard renders a complete category card with sparkline, delta, stale dimming
- [ ] **S03: Dashboard Redesign — Category Cards** `risk:medium` `depends:[S01,S02]`
  > After this: Dashboard shows ~7 category cards with sparklines instead of flat exercise list; Next Workout card unchanged; stale categories dimmed
- [ ] **S04: CategoryProgressScreen & Navigation** `risk:low` `depends:[S01,S02,S03]`
  > After this: Tapping a category card opens CategoryProgressScreen with exercise list, sparklines, deltas, time range filter; tapping exercise navigates to ExerciseProgressScreen; full navigation chain works on device

## Boundary Map

### S01 → S02

Produces:
- `CategorySummary` interface with `sparklinePoints: number[]` for sparkline rendering
- `CategoryExerciseProgress` interface with `sparklinePoints`, `currentBest`, `previousBest` for delta display
- `getCategorySummaries()` function returning `CategorySummary[]`
- `getCategoryExerciseProgress(category)` function returning `CategoryExerciseProgress[]`

Consumes:
- nothing (first slice)

### S01 → S03

Produces:
- `getCategorySummaries()` for dashboard data fetching
- `CategorySummary` type for component props

Consumes:
- nothing (first slice)

### S02 → S03

Produces:
- `MiniSparkline` component accepting `{ data, width?, height?, color? }`
- `CategorySummaryCard` component accepting `{ summary, isStale, onPress }`

Consumes:
- `CategorySummary` type from S01

### S01,S02,S03 → S04

Produces:
- nothing (final slice)

Consumes:
- `getCategoryExerciseProgress(category)` from S01
- `CategoryExerciseProgress` type from S01
- `MiniSparkline` component from S02
- Dashboard navigation integration from S03
- Time range pills pattern from existing `ExerciseProgressScreen`
