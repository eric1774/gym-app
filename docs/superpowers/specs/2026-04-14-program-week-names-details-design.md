# Program Week Names & Details

**Date:** 2026-04-14
**Status:** Approved

## Overview

Add the ability to name individual weeks in a program (e.g., "Ramp Phase", "Overload Phase", "Deload") and attach freeform detail text to each week (e.g., "Aim for 35% volume this week and 85-90% of recent bests"). Week names display underneath the "WEEK X OF Y" header in the existing week card. Week details appear in a new card between the week card and the workout days section.

## Data Model

### New Table: `program_weeks`

```sql
CREATE TABLE IF NOT EXISTS program_weeks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  program_id INTEGER NOT NULL REFERENCES programs(id) ON DELETE CASCADE,
  week_number INTEGER NOT NULL,
  name TEXT,
  details TEXT,
  UNIQUE(program_id, week_number)
);
```

- Rows are sparse: only created when the user sets a name or details for a week.
- If both `name` and `details` are cleared, the row is deleted.
- `CASCADE` delete ensures cleanup when a program is deleted.

### New TypeScript Interface

```typescript
export interface ProgramWeek {
  id: number;
  programId: number;
  weekNumber: number;
  name: string | null;
  details: string | null;
}
```

Added to `src/types/index.ts` in the Program domain section.

## Database Operations

New functions in `src/db/programs.ts`:

### `getWeekData(programId: number, weekNumber: number): Promise<ProgramWeek | null>`

Returns the `ProgramWeek` row for a specific week, or `null` if no name/details have been set.

### `upsertWeekData(programId: number, weekNumber: number, name: string | null, details: string | null): Promise<void>`

Insert or update using `INSERT ... ON CONFLICT(program_id, week_number) DO UPDATE`. If both `name` and `details` are null/empty after the operation, delete the row to keep the table sparse.

### `getAllWeekData(programId: number): Promise<ProgramWeek[]>`

Returns all `ProgramWeek` rows for a program, ordered by `week_number`. Used by the Manage Weeks modal.

## UI Changes

All changes are on `ProgramDetailScreen.tsx`.

### 1. Week Name in Week Card (Modified Existing)

- Rendered directly below the `WEEK X OF Y` title text, inside the same card.
- Style: `colors.accent` (mint green), `fontSize: 14`, `fontWeight: 600`.
- Only displayed when `weekData.name` is non-null.
- Tapping the name opens the inline edit modal.

### 2. Week Details Card (New)

- New `surface`-colored card placed between the Week Card and the "WORKOUT DAYS" section header.
- Header row: "WEEK DETAILS" label (left, `colors.secondary`, ALL-CAPS, `letterSpacing: 1.2`) + "Edit" link (right, `colors.accent`, `fontSize: 12`, `fontWeight: 600`).
- Body: freeform text in `colors.primary` (white), `fontSize: 14`, `lineHeight: 1.5`.
- Only rendered when `weekData.details` is non-null.
- Tapping "Edit" opens the inline edit modal.

### 3. Empty State Prompt

- When no name AND no details exist for the current week, show a subtle card with `"+ Add week name & details"` in `colors.secondary`.
- Tapping opens the inline edit modal.
- Styled as a `surface` card with dashed border or reduced opacity to distinguish from content cards.

### 4. Inline Edit Modal (Current Week)

- Bottom sheet modal, consistent with existing rename modals in the app.
- Title: `"Week X of Y"`.
- Fields:
  - "Week Name" single-line `TextInput`, placeholder `"e.g., Ramp Phase"`.
  - "Week Details" multi-line `TextInput` (3-4 lines visible), placeholder `"e.g., Focus on technique this week..."`.
- Buttons: "Save" (primary CTA) and "Cancel".
- On save: calls `upsertWeekData()` and refreshes screen data.

### 5. Manage Weeks Modal (All Weeks)

- Accessed via a "Manage Weeks" text button placed in the week controls row (next to the Prev/Next week navigation buttons), only visible when the program is activated.
- Large bottom sheet modal.
- ScrollView listing all weeks: `Week 1`, `Week 2`, ... `Week N`.
- Each row displays: week number + current name (or "Unnamed" in `colors.secondary`).
- Tapping a row opens the inline edit modal pre-filled for that week number.
- Allows setting up all weeks without needing to advance through them.

## Migration

- New migration step added to `src/db/migrations.ts`.
- Creates the `program_weeks` table.
- No data backfill needed — existing programs simply have no week names/details until the user adds them.

## Scope Boundaries

- No changes to workout session creation, logging, or any existing data flows.
- No changes to the ProgramsScreen (list view) — week names are only visible on ProgramDetailScreen.
- No auto-generation of week names or details — purely user-entered freeform text.
- No changes to week advancement/decrement logic.
