# Exercise Substitution & Multi-Category Muscle Groups

**Date:** 2026-04-12
**Status:** Draft

## Overview

Two interrelated features:

1. **Muscle Group System** — Replace the single-category model with a many-to-many muscle group taxonomy. Exercises can target multiple muscle groups spanning multiple parent categories, and appear in all relevant dashboard/library sections.
2. **Exercise Swap Flow** — A one-tap "Swap" button on exercises in active sessions and program days that suggests alternatives targeting the same muscle groups.

## Data Model

### New Table: `muscle_groups`

Seeded with ~23 entries. Not user-editable.

| Column            | Type                | Notes                              |
|-------------------|---------------------|------------------------------------|
| `id`              | INTEGER PK          | Auto-increment                     |
| `name`            | TEXT NOT NULL        | Display name (e.g., "Quads")       |
| `parent_category` | TEXT NOT NULL        | One of 8 dashboard categories      |
| `sort_order`      | INTEGER NOT NULL     | Display order within parent        |

### New Table: `exercise_muscle_groups`

Many-to-many join between exercises and muscle groups.

| Column            | Type                | Notes                              |
|-------------------|---------------------|------------------------------------|
| `exercise_id`     | INTEGER FK          | References `exercises(id)`         |
| `muscle_group_id` | INTEGER FK          | References `muscle_groups(id)`     |
| `is_primary`      | INTEGER DEFAULT 0   | 1 = primary target, 0 = secondary  |
|                   | PRIMARY KEY          | `(exercise_id, muscle_group_id)`   |

### Modified: `exercises` table

The `category` column remains as a cached value:
- Automatically set to the primary muscle group's `parent_category`
- Updated by a DB-layer helper whenever muscle groups change
- Enables fast dashboard queries without JOINs for the common case

The `ExerciseCategory` type gains `'stretching'` as the 8th value.

### Muscle Group Seed Data

| Parent Category | Muscle Groups                                          |
|-----------------|--------------------------------------------------------|
| chest           | Upper Chest, Lower Chest, Chest                        |
| back            | Lats, Upper Back, Lower Back, Traps                    |
| legs            | Quads, Hamstrings, Glutes, Calves, Hip Flexors         |
| shoulders       | Front Delts, Side Delts, Rear Delts                    |
| arms            | Biceps, Triceps, Forearms                              |
| core            | Abs, Obliques, Lower Back                              |
| conditioning    | Cardio, Plyometrics                                    |
| stretching      | Upper Body Flexibility, Lower Body Flexibility, Hip Mobility |

**Note:** "Lower Back" appears under both `back` and `core` as separate rows with different `parent_category` values. An exercise like Deadlift gets `back/Lower Back` while Plank gets `core/Lower Back`.

### Migration Strategy

1. Create `muscle_groups` and `exercise_muscle_groups` tables
2. Seed the `muscle_groups` table with ~23 entries
3. Map all existing 46+ preset exercises to appropriate muscle groups via a hardcoded mapping in the migration
4. Map any user-created custom exercises to muscle groups based on their current `category` value (assign the general/default muscle group for that category)
5. Add `'stretching'` to the `ExerciseCategory` TypeScript type
6. Keep `exercises.category` populated — no existing data loss

## Exercise Swap Flow

### Entry Points

1. **Active Session Screen** — Each exercise card shows a swap icon (rotate/arrows) in the header. Tap opens the Swap Sheet.
2. **Program Day Detail Screen** — Each exercise row gets the same swap icon. Tap opens the same Swap Sheet.

### Swap Sheet (Bottom Sheet Modal)

- **Header:** "Swap [Exercise Name]" with the current exercise's muscle group tags shown as chips
- **Two sections:**
  - **Exact Matches** — exercises sharing ALL the same muscle groups as the original, sorted alphabetically
  - **Partial Matches** — exercises sharing SOME muscle groups, sorted alphabetically
- **Each row shows:** exercise name, muscle group chips, measurement type indicator (reps/timed)
- **Tap** an exercise to select it as the replacement

**Filtering rules:**
- Exclude the current exercise
- Exclude exercises already in the current session or program day
- Match against ALL muscle groups on the original exercise (primary and secondary)

### Swap Behavior: Active Session

- **Zero sets logged** on original → clean swap, no prompt needed
- **One or more sets logged** → show dialog:
  > "You've logged N sets on [Exercise]. What would you like to do?"
  > - **Keep sets & add new exercise** — old exercise stays marked complete, new exercise added at the same position
  > - **Discard sets & replace** — old exercise and its sets removed, new exercise takes its place
- New exercise inherits the original's position in the session exercise order

### Swap Behavior: Program Day Editing

- Direct replacement — new exercise takes the old one's `sort_order`, `target_sets`, `target_reps`, `target_weight_kg`
- If the old exercise was in a superset group, the new exercise joins that same superset group

## Exercise Creation & Editing

### Two-Step Muscle Group Picker

Replaces the current single-category dropdown in `AddExerciseModal`.

**Step 1 — Pick Parent Categories:**
- Multi-select of the 8 parent categories displayed as tappable chips
- Toggle on/off
- At least one required

**Step 2 — Pick Muscle Groups:**
- Shows only muscle groups belonging to selected parent categories
- Grouped by parent category with section headers
- Tappable chips — toggle on/off
- First selected muscle group is automatically marked as primary (star/filled indicator)
- User can change primary by tapping a star icon on any selected group
- At least one muscle group required

### Where It Appears

- **AddExerciseModal** (new exercises) — replaces single category dropdown
- **Edit mode** (custom exercises) — pre-populates both steps with current muscle groups
- **Preset exercises** — muscle groups set via seed/migration, not editable by users

### Cached Category Sync

When muscle groups are saved (create or edit):
1. Look up the primary muscle group's `parent_category`
2. Write that value to `exercises.category`
3. This logic lives in the DB layer — single place to maintain

### Validation

- At least one muscle group selected
- Exactly one primary muscle group
- Exercise name required and unique (existing)

## Dashboard Changes

### Multi-Category Display

Exercises appear in every parent category card their muscle groups belong to.

**Example:** Dip (Triceps + Lower Chest) appears in both the Arms card and the Chest card.

### Query Changes: `getCategorySummaries`

- Join through `exercise_muscle_groups` → `muscle_groups` to get `parent_category`
- An exercise's sets contribute to every parent category it belongs to
- Sparkline points and exercise counts reflect multi-category membership
- `exerciseCount` = count of distinct exercises with at least one muscle group in that category
- **Exclude `stretching`** from dashboard category cards — no sparkline or progress tracking for stretching

### Stretching Category Behavior

- Appears as a tab in Library Screen and Exercise Picker Sheet
- Does **not** get a dashboard category card
- `getCategorySummaries` excludes `parent_category = 'stretching'`
- If an exercise has both stretching and non-stretching muscle groups (e.g., `Hip Mobility` + `Hamstrings`), it appears under the relevant non-stretching dashboard cards (Legs) but not a Stretching card

### Library Screen

- `ExerciseCategoryTabs` gains "Stretching" as the 8th tab
- Category filtering uses the muscle group join — exercises appear in all relevant category tabs
- Example: Dip appears under both "Arms" and "Chest" tabs

### Exercise Picker Sheet

- Same tab and filtering changes as Library Screen
- Exercises appear in all relevant category tabs
