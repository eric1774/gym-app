# Program Customization — Per-Week-Per-Day Targets & Notes

**Date:** 2026-04-19
**Status:** Design approved. Ready for implementation plan.

## Goal

Let a user customize a program with per-week-per-day granularity. Editing Week 3 Day 1's sets/reps/weight or note must not affect Week 2 Day 1 or any other week. Customization must be possible **before** the program starts and **at any time** during it, including mid-workout.

## Scope

**In scope** — per week, per day, per exercise:
- Target sets
- Target reps
- Target weight
- Exercise notes

**In scope** — per workout session:
- Session-specific exercise note that overrides the program's note for that one session only

**Out of scope (phase 2+)**:
- Adding, removing, or reordering exercises on a per-week basis — the exercise lineup stays shared across weeks.
- Per-set-level targets (e.g. set 1 = 8 reps, set 2 = 10 reps).
- Bulk operations: "Copy from another week," "Deload all weights 10%," etc.

## Mental Model

Two layers stack to produce what the user sees:

1. **Base template** — one row per `(program_day, exercise)`. This is the current `program_day_exercises` row, unchanged except for a new nullable `notes` column.
2. **Per-week override** — a new row per `(program_day_exercise, week_number)` with **nullable** columns. A NULL field means "inherit from base." Any non-NULL field wins over base for that week.

Reads COALESCE per field. A session always resolves values live — no snapshot on the session itself.

Notes have a third layer at workout time:

3. **Session note** — a per-session override in `exercise_session_notes`. It does not mutate the program. When the session ends, the program's note is still whatever it was.

## Data Model

### Migration v23

```sql
-- 1. Base template gains a nullable note
ALTER TABLE program_day_exercises
  ADD COLUMN notes TEXT;

-- 2. Per-week per-day override rows (field-level, all nullable)
CREATE TABLE program_week_day_exercise_overrides (
  id                       INTEGER PRIMARY KEY AUTOINCREMENT,
  program_day_exercise_id  INTEGER NOT NULL,
  week_number              INTEGER NOT NULL,
  override_sets            INTEGER,
  override_reps            INTEGER,
  override_weight_kg       REAL,
  notes                    TEXT,
  created_at               INTEGER NOT NULL,
  updated_at               INTEGER NOT NULL,
  UNIQUE (program_day_exercise_id, week_number),
  FOREIGN KEY (program_day_exercise_id)
    REFERENCES program_day_exercises(id) ON DELETE CASCADE
);

CREATE INDEX idx_pwdx_lookup
  ON program_week_day_exercise_overrides (program_day_exercise_id, week_number);

-- 3. Per-session per-exercise note (independent of program)
CREATE TABLE exercise_session_notes (
  session_id   INTEGER NOT NULL,
  exercise_id  INTEGER NOT NULL,
  notes        TEXT,
  updated_at   INTEGER NOT NULL,
  PRIMARY KEY (session_id, exercise_id),
  FOREIGN KEY (session_id)  REFERENCES workout_sessions(id) ON DELETE CASCADE,
  FOREIGN KEY (exercise_id) REFERENCES exercises(id)        ON DELETE CASCADE
);
```

### Resolution query (the only read path needed)

```sql
-- getExercisesForWeekDay(programDayId, weekNumber)
SELECT
  pde.id                                AS program_day_exercise_id,
  pde.exercise_id,
  pde.sort_order,
  pde.superset_group_id,
  COALESCE(ov.override_sets,      pde.target_sets)       AS sets,
  COALESCE(ov.override_reps,      pde.target_reps)       AS reps,
  COALESCE(ov.override_weight_kg, pde.target_weight_kg)  AS weight_kg,
  COALESCE(ov.notes,              pde.notes)             AS notes,
  (ov.id IS NOT NULL)                                    AS override_row_exists,
  (ov.override_sets      IS NOT NULL)                    AS sets_overridden,
  (ov.override_reps      IS NOT NULL)                    AS reps_overridden,
  (ov.override_weight_kg IS NOT NULL)                    AS weight_overridden,
  (ov.notes              IS NOT NULL)                    AS notes_overridden
FROM program_day_exercises pde
LEFT JOIN program_week_day_exercise_overrides ov
  ON  ov.program_day_exercise_id = pde.id
  AND ov.week_number = :weekNumber
WHERE pde.program_day_id = :programDayId
ORDER BY pde.sort_order;
```

The `*_overridden` booleans drive the per-field UI badges on the WeekDayEditor.

## Write Behaviors

| User action | Persists to |
|---|---|
| Program editor — edit base template | `UPDATE program_day_exercises` |
| Program editor — edit a week's override field | `UPSERT program_week_day_exercise_overrides` (set target field, other fields unchanged) |
| Program editor — revert a week's override field | Set that column to NULL. If all nullable fields are NULL, `DELETE` the row. |
| Mid-workout `EditTargetsModal` — edit sets/reps/weight | `UPSERT program_week_day_exercise_overrides` for `workout_sessions.program_week` |
| Mid-workout inline note editor | `UPSERT exercise_session_notes` (session-only; does not touch program) |
| Program editor — edit a week's note | `UPSERT program_week_day_exercise_overrides.notes` |

## UI Surfaces

### A. ProgramDetailScreen entry

Add a "Customize weeks" action in the existing Program action block (alongside Manage weeks and Warmup templates). Opens `CustomizeWeeksScreen`.

### B. CustomizeWeeksScreen

Hub listing:
- A single **Base template** row at the top → opens `BaseDayPickerScreen` (list of days → `WeekDayEditorScreen` scoped to base).
- One row per week. Each row shows:
  - Week number and name
  - Sublabel: "Inherits base" OR "N overrides"
  - A star badge on the current week (from `programs.current_week`)
  - Chevron → opens `WeekDayPickerScreen` for that week (list of days → `WeekDayEditorScreen` scoped to that week).

Week override counts are computed with a simple per-week aggregate:

```sql
SELECT week_number, COUNT(*) AS override_count
FROM program_week_day_exercise_overrides
WHERE program_day_exercise_id IN (
  SELECT id FROM program_day_exercises
  WHERE program_day_id IN (SELECT id FROM program_days WHERE program_id = ?)
)
GROUP BY week_number;
```

### C. WeekDayEditorScreen

Scoped to `(program_day_id, scope)` where `scope` is either `'base'` or `{ week: number }`.

Layout:
- Header: `W{n} · {dayName}` (or `Base · {dayName}`)
- When scope is a specific week, a read-only summary of the week's `name` and `details` (from the existing `program_weeks` row) appears under the header, with an "Edit" affordance that opens the existing `WeekEditModal`. Per-exercise notes are separate and edited inside each exercise row's modal.
- Exercise list — each row is read-only summary:
  - Exercise name
  - Compact target line: `{sets} × {reps} @ {weight}` with per-field badges showing `overridden` vs `inherits`
  - Note preview (one line, italic "inherits base" when empty from override)
  - Tap row → opens `EditTargetsModal`

### D. EditTargetsModal (extended)

The existing mid-workout modal is extended:
- New prop `scope: 'base' | { week: number }`
- New field `notes: string | null` with a "clear to inherit" toggle
- Each input has an accompanying "inherit from base" toggle (except when `scope === 'base'`)
- On save: calls `upsertOverride` (or `updateBase` when scope is `'base'`)

Used from:
- Program editor (via tap on exercise row in `WeekDayEditorScreen`)
- Mid-workout from `WorkoutScreen` (unchanged entry, but now writes to the week override instead of the shared base; scope derived from `workout_sessions.program_week`)

### E. InlineNoteEditor on WorkoutScreen

Per the user's original spec. Component placed inside `ExerciseCard` body, below the `NextSetPanel` confirm button. Behavior:

- Not editing: pressable row, pencil icon + note text (or "Add a note…" placeholder in muted italic).
- Editing: pencil icon + single-line `TextInput` (`multiline={false}`, `returnKeyType="done"`, `blurOnSubmit={true}`, autofocus driven by state). Transparent bg, 1px subtle border, radius 10.
- Save only on blur or Return (no debounced per-keystroke save). This avoids partial autosaves and keeps writes bounded.

**Default value precedence** when the card first opens:

1. `exercise_session_notes.notes` for current session if present
2. Resolved program note (`COALESCE(override.notes, base.notes)`) for current week
3. Last session's note for this exercise — **shown as muted placeholder text only**. Never written to `exercise_session_notes` until the user taps to edit and commits (blur/Return with text). Tapping to edit and submitting a blank input leaves no session note; the hint still shows.
4. Empty → "Add a note…" placeholder (when no prior session note exists)

## Edge Cases & Lifecycle

- **`programs.weeks` extended (e.g. 4 → 6)** — new weeks inherit base automatically. No migration.
- **`programs.weeks` reduced (6 → 4)** — run `DELETE FROM program_week_day_exercise_overrides WHERE week_number > :new_count AND program_day_exercise_id IN (...)`. Hook into the existing `programs.weeks` update path.
- **Exercise removed from base day** — `ON DELETE CASCADE` on `program_day_exercise_id` removes overrides automatically.
- **Exercise added to base day** — no overrides yet; all weeks inherit. Expected.
- **Day duplicated** — `duplicateDay()` already copies `program_day_exercises`. It will **not** copy overrides. Duplicating a day yields a clean slate (base values only, no per-week edits). Documented behavior; revisit if feedback demands otherwise.
- **Last-session note hint** — reads most recent `exercise_session_notes.notes` for this exercise across all sessions, ordered by session date desc. Read-only placeholder; not auto-saved.

## Migration

Migration v23 runs on first launch after update:
1. `ALTER TABLE program_day_exercises ADD COLUMN notes TEXT`
2. `CREATE TABLE program_week_day_exercise_overrides`
3. `CREATE INDEX idx_pwdx_lookup`
4. `CREATE TABLE exercise_session_notes`

No data backfill. Existing programs read unchanged: `LEFT JOIN` returns no override rows, `COALESCE` falls through to base. Users see the same targets and no notes until they begin customizing.

## Files

New:
- `src/screens/CustomizeWeeksScreen.tsx`
- `src/screens/WeekDayEditorScreen.tsx` (parameterized by `scope`)
- `src/components/InlineNoteEditor.tsx`
- `src/db/notes.ts` (`upsertSessionNote`, `getSessionNote`, `getLastSessionNote`)

Modified:
- `src/db/migrations.ts` — add v23
- `src/db/programs.ts` — new functions: `getExercisesForWeekDay`, `getWeekOverrideCounts`, `upsertOverride`, `revertOverrideField`, `updateBaseTemplate`, `deleteOrphanedOverridesForWeekCountChange`
- `src/types/index.ts` — new types: `WeekExerciseResolved`, `WeekOverride`, `SessionNote`
- `src/screens/ProgramDetailScreen.tsx` — add "Customize weeks" action
- `src/components/EditTargetsModal.tsx` — add `scope` prop + `notes` field + per-field "inherit" toggles
- `src/components/ExerciseCard.tsx` — render `InlineNoteEditor`
- `src/screens/WorkoutScreen.tsx` — replace direct `program_day_exercises` reads with `getExercisesForWeekDay(programDayId, session.program_week)`; pass resolved note to `ExerciseCard`

## Testing

**Unit (resolution and writes):**
- Base only: no overrides → COALESCE returns base for all fields.
- Full override: all four fields non-NULL → all return override values.
- Partial override: only `override_sets` set → sets returns override, reps/weight/notes return base.
- Revert field: set column to NULL, row remains (other overrides still set). If all NULL after revert → row deleted.
- Orphaned override cleanup fires when `programs.weeks` decreases.

**Integration:**
- Create program → edit W3 bench to 4×6 @ 155 → start W3 workout → card shows 4×6 @ 155.
- Start W2 workout of the same program → card shows base values.
- Mid-workout edit on W3 → `program_week_day_exercise_overrides` row for week 3 updated. Re-enter W3 later → edit persisted.
- Mid-workout inline note edit on W3 → `exercise_session_notes` row written. Program's W3 note unchanged. Next W3 session inherits program note again (not the previous session's one-off note).
- Delete exercise from base day → CASCADE removes overrides across all weeks and sessions.
- Shrink `programs.weeks` → orphan cleanup runs; no rows beyond new week count.

**UAT:**
- "Customized" badge appears on weeks with any override.
- Per-field indicators on WeekDayEditor reflect which fields differ from base.
- `EditTargetsModal` opened from Program editor correctly scopes to week vs base; opened mid-workout scopes to current week.
- Inline note autofocus only fires on tap, never on render.
- Revert-to-base control brings a field back to base and removes the override row when it was the last overridden field.

## Non-Goals Recap

Per-week exercise lineup changes, per-set-level detail, "Copy from another week," cross-program bulk ops — all deferred. The core workflow here is: pick a week, tap a day, tap an exercise, adjust sets/reps/weight and the note. Repeat per week as needed. Live during workouts via the existing EditTargets entry point.
