# Height + Reps Measurement Type

**Date:** 2026-04-13
**Status:** Approved

## Problem

Exercises like Box Jumps don't measure progression by weight. The user wants to track box height (in inches) as the progression metric, logged alongside reps. The current app only supports `reps` (weight x reps) and `timed` (duration) measurement types.

## Approach

Add a third `ExerciseMeasurementType` value: `'height_reps'`. Repurpose the existing `weight_kg` column in `workout_sets` to store height in inches for this exercise type. No new database columns needed — the measurement type tells the UI how to label and interpret the value.

## Data Model

- `ExerciseMeasurementType` becomes `'reps' | 'timed' | 'height_reps'`
- For `height_reps` exercises:
  - `weight_kg` column stores height in inches
  - `reps` column stores reps as normal
- No DB migration needed. The `measurement_type` column is a TEXT field — `'height_reps'` is just a new application-level value. No DDL changes required.
- Volume calculations (`SUM(weight_kg * reps)`) exclude `height_reps` exercises from weekly snapshot and muscle group progress queries, since height x reps is not meaningful volume.

## Set Logging UI (SetLoggingPanel)

- Weight input placeholder: `"in"` instead of `"lb"`
- Stepper buttons: `-2/+2` instead of `-5/+5` (height increments are smaller)
- Reps input: unchanged, placeholder `"reps"`
- Confirm button: `"Log Set"` (unchanged)
- Pre-fill from last session: works the same way

## Set Display

- `SetListItem`: `"Set 1: 30in x 10 reps"` instead of `"Set 1: 135lb x 10 reps"`
- `GhostReference`: `"Set 1: 30in x 10"` instead of `"Set 1: 135lb x 10"`

## Progress Tracking (ExerciseDetailScreen)

- Hero stat label: `"Best (in)"` instead of `"Best (lbs)"`
- Volume hero stat: hidden entirely for `height_reps` exercises
- Sessions hero stat: unchanged
- Insight text: `"Height up X% in Y"` instead of `"Weight up X% in Y"`
- Chart Y-axis suffix: `" in"` instead of `" lb"`
- Strength/Volume toggle: hidden (only height progression chart shown)
- PR detection: unchanged logic (higher height at same rep count = PR)
- Session history rows: `"30in x 10"` format

## Library Editing (AddExerciseModal)

- Measurement type toggle expands to three options: `[Reps] [Timed] [Height]`
- Selecting "Height" sets `measurementType` to `'height_reps'`
- User edits existing Box Jumps exercise: switch from "Reps" to "Height", save

## Scope Boundaries

- No unit conversion (inches only)
- No changes to program targets (`target_weight_kg` repurposed as target height for `height_reps` exercises)
- No new exercise types beyond `height_reps`
- Existing logged sets for a converted exercise will display their old weight values as inches (cosmetic only, no data migration)

## Files to Modify

- `src/types/index.ts` — add `'height_reps'` to `ExerciseMeasurementType`
- `src/components/SetLoggingPanel.tsx` — conditional labels, stepper values, placeholder
- `src/components/SetListItem.tsx` — conditional display format
- `src/components/GhostReference.tsx` — conditional display format
- `src/screens/ExerciseDetailScreen.tsx` — hero stats, insight text, chart, toggle visibility
- `src/screens/AddExerciseModal.tsx` — third toggle option
- `src/db/progress.ts` — exclude `height_reps` from volume queries
