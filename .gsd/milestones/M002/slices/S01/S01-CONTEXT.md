---
id: S01
milestone: M002
status: ready
---

# S01: Data Layer — DB Queries & Types — Context

<!-- Slice-scoped context. Milestone-only sections (acceptance criteria, completion class,
     milestone sequence) do not belong here — those live in the milestone context. -->

## Goal

Implement SQLite queries and TypeScript types that return category summaries (with sparkline points) and per-category exercise progress (with deltas), forming the complete data contract for all downstream UI slices.

## Why this Slice

This is the foundation slice with no dependencies. S02 (components), S03 (dashboard redesign), and S04 (CategoryProgressScreen) all consume the types and query functions produced here. Getting the data shape and query performance right first de-risks the entire milestone — if queries are slow or return wrong shapes, every UI slice built on top would need rework.

## Scope

### In Scope

- `CategorySummary` type with `sparklinePoints: number[]`, `lastTrainedAt`, category metadata
- `CategoryExerciseProgress` type with `sparklinePoints`, `currentBest`, `previousBest`, exercise metadata
- `getCategorySummaries(timeRange?)` — returns summaries for categories with logged data only (no untrained categories)
- `getCategoryExerciseProgress(category, timeRange?)` — returns per-exercise progress within a category
- Time range parameter support (1M/3M/6M/All) baked into queries from the start
- Duration formatting awareness in types (timed exercises return duration values, not weights)

### Out of Scope

- UI components (S02)
- Dashboard screen changes (S03)
- CategoryProgressScreen and navigation (S04)
- Downsampling sparkline points — queries return all points, UI decides rendering density
- Computing `isStale` boolean — queries return `lastTrainedAt`, UI applies the 30-day threshold
- New DB migrations or schema changes — queries work against existing v7 schema

## Constraints

- Queries must work against existing SQLite schema (migration v7) — no schema changes
- Must use existing `db()` and `executeSql()` patterns from `src/db/database.ts`
- Types go in `src/types/index.ts` alongside existing types
- Query functions go in `src/db/dashboard.ts` alongside existing dashboard queries
- Must handle both `measurementType: 'reps'` and `measurementType: 'timed'` exercises correctly

## Integration Points

### Consumes

- `src/db/database.ts` — `db()` and `executeSql()` for query execution
- `src/types/index.ts` — existing `ExerciseCategory`, `ExerciseMeasurementType` types
- Existing SQLite schema: `exercises`, `workout_sets`, `workout_sessions` tables
- `src/db/dashboard.ts` — existing `getExerciseProgressData()` SQL pattern as reference

### Produces

- `CategorySummary` interface — consumed by `CategorySummaryCard` (S02) and `DashboardScreen` (S03)
- `CategoryExerciseProgress` interface — consumed by `CategoryProgressScreen` (S04)
- `getCategorySummaries(timeRange?)` function — consumed by `DashboardScreen` (S03)
- `getCategoryExerciseProgress(category, timeRange?)` function — consumed by `CategoryProgressScreen` (S04)

## Implementation Decisions

- **Category sparkline metric:** Each sparkline point = the highest best-weight across all exercises in that category for that session. Shows the category's peak progression per workout.
- **Sparkline granularity:** One point per session (raw workout-level data), not aggregated by week.
- **Mixed measurement types:** Category-level sparkline uses weight-based exercises only. Timed exercises appear in the per-exercise drill-down (`getCategoryExerciseProgress`) with their own duration values, but don't contribute to the category sparkline.
- **Delta computation:** `currentBest` = best value from the most recent session; `previousBest` = best value from the session before that. Delta = latest vs. previous session, showing recent change.
- **Staleness:** Queries return `lastTrainedAt` per category. UI decides staleness (30-day threshold) — clean separation of data and presentation.
- **Empty categories:** `getCategorySummaries()` returns only categories that have at least one logged workout set. Untrained categories are omitted.
- **Sparkline point count:** Queries return all data points within the time range. No server-side capping — the sparkline component handles downsampling if needed.
- **Time range filtering:** Queries accept time range parameters from the start (not deferred to UI). Cleaner API, less data transferred.

## Open Questions

- None — all behavioral decisions resolved during discuss phase.
