# Sessions Progress Tab — Design Spec

**Date:** 2026-04-15
**Status:** Draft

## Summary

Add a "Sessions" tab to the Progress Hub screen alongside the existing "Categories" tab. The Sessions tab shows cards named after program day names (e.g., "Chest Triceps & Conditioning", "Legs Quad Focus"), tracking session-over-session volume and strength changes. A program selector allows switching between active and archived programs.

## Requirements

### Tab System
- Add a segmented tab bar at the top of ProgressHubScreen with two tabs: **Categories** (existing content) and **Sessions** (new)
- Categories tab remains exactly as-is — no changes to existing behavior
- Default tab: Categories (preserves current UX for existing users)

### Sessions Tab — Day Cards
- Display one card per program day, using the day's `name` field from `program_days` table
- Cards arranged in a 2-column grid (same layout as Categories tab)
- Each card shows:
  - **Day name** — pulled directly from `program_days.name`
  - **Volume % change** — labeled "Vol", comparing total `weight_kg × reps` between the two most recent completed sessions for that day
  - **Strength % change** — labeled "Str", comparing average best weight per exercise between the two most recent completed sessions for that day
  - **Last trained** — relative timestamp of most recent completion

### Session-over-Session Comparison Logic
- **Comparison pair:** The two most recent completed sessions (`completed_at IS NOT NULL`) sharing the same `program_day_id`, regardless of which week they occurred in
- **Volume calculation:** `SUM(weight_kg * reps)` for all non-warmup sets in the session, filtered to exercises belonging to that program day. Compare current session total vs previous session total: `((current - previous) / previous) * 100`
- **Strength calculation:** For each exercise in the session, find the max `weight_kg` among non-warmup sets. Average these per-exercise maxes across all exercises. Compare current session average vs previous session average: `((current - previous) / previous) * 100`
- **Edge cases:**
  - Only 1 session exists for a day: show "—" (em dash) for both metrics, display "1 session only" as last-trained text
  - No sessions exist for a day: show "—" for both metrics, display "Not started" as last-trained text
  - Exercise has 0 weight (bodyweight): exclude from strength calculation, include in volume calculation

### Color Coding
- **Green (`#8DC28A` / `colors.accent`):** Positive change (improvement)
- **Red (`#D9534F` / `colors.danger`):** Negative change (decline)
- **Grey (`#8E9298` / `colors.secondary`):** Neutral / no data available
- **Gold (`#FFB800` / `colors.prGold`):** PR achieved (if any exercise in the session set a PR)

### Program Selector
- Positioned between the tab bar and the card grid
- Shows: program name, "Active" or "Archived" badge, dropdown chevron
- Defaults to the most recent program with session data
- Dropdown lists all programs grouped by status:
  - **Active:** Programs with `archived_at IS NULL`
  - **Archived:** Programs with `archived_at IS NOT NULL`, sorted by `archived_at DESC`
- Selecting a program filters the day cards to show only days belonging to that program

### Program Archive Lifecycle
- Add `archived_at` (TEXT, nullable) column to `programs` table via migration
- A program is "active" when `archived_at IS NULL`
- A program is "archived" when `archived_at` has a timestamp
- Archive action: set `archived_at = NOW()` — no data is deleted, sessions remain queryable
- Unarchive action: set `archived_at = NULL` (reversible)
- UI for archiving: out of scope for this spec — can be added to the program management screen later. For now, programs are archived manually or via a future "complete program" flow.

### Drill-Down (Tap a Day Card)
- Navigate to a new **SessionDayProgressScreen**
- Shows a list of all exercises for that program day
- Each exercise displays:
  - Exercise name
  - Volume % change (session-over-session for that specific exercise)
  - Strength % change (best weight session-over-session for that specific exercise)
- Layout and behavior mirrors the existing CategoryProgressScreen pattern

## Data Model Changes

### Migration: Add `archived_at` to `programs`
```sql
ALTER TABLE programs ADD COLUMN archived_at TEXT;
```

### No New Tables Required
All session data already exists in `workout_sessions` (with `program_day_id` and `program_week`) and `workout_sets`. New DB functions compute comparisons via queries against existing tables.

## New DB Functions

### `getSessionDayProgress(programId: number): Promise<SessionDayProgress[]>`
Returns progress data for all days in a program. For each day:
1. Find the two most recent completed sessions with that `program_day_id`
2. Compute volume totals for each session
3. Compute average best weight per exercise for each session
4. Return the % deltas

### `getSessionDayExerciseProgress(programDayId: number): Promise<SessionDayExerciseProgress[]>`
Returns per-exercise progress for drill-down. For a given program day:
1. Find the two most recent completed sessions with that `program_day_id`
2. For each exercise performed in the most recent session:
   - Compute volume (weight × reps) for current vs previous session
   - Compute best weight for current vs previous session
   - Return % deltas per exercise

### `archiveProgram(programId: number): Promise<void>`
Sets `archived_at = new Date().toISOString()` on the program.

### `unarchiveProgram(programId: number): Promise<void>`
Sets `archived_at = NULL` on the program.

### `getProgramsWithSessionData(): Promise<ProgramSelectorItem[]>`
Returns all programs that have at least one completed session, with their archive status, for the program selector dropdown.

## New Types

```typescript
interface SessionDayProgress {
  programDayId: number;
  dayName: string;
  volumeChangePercent: number | null;
  strengthChangePercent: number | null;
  hasPR: boolean;
  lastTrainedAt: string | null;
  sessionCount: number;
}

interface SessionDayExerciseProgress {
  exerciseId: number;
  exerciseName: string;
  volumeChangePercent: number | null;
  strengthChangePercent: number | null;
}

interface ProgramSelectorItem {
  id: number;
  name: string;
  isArchived: boolean;
  archivedAt: string | null;
}
```

## New Screens & Components

### Components
- **SessionsTabContent** — Container for program selector + day cards grid (lives inside ProgressHubScreen)
- **SessionDayCard** — Individual day card with name, vol %, str %, last trained
- **ProgramSelectorBar** — Pressable bar showing current program with dropdown

### Screens
- **SessionDayProgressScreen** — Drill-down showing per-exercise breakdown for a program day

### Navigation
- Add `SessionDayProgress` route to `DashboardStackParamList` with params `{ programDayId: number; dayName: string }`

## Out of Scope
- Program archive/complete UI (future — program management screen)
- Session timeline/history view (future enhancement)
- Sparklines or trend charts on cards
- Notifications or badges for streaks