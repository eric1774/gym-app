# Warmup Section — Design Spec

**Date:** 2026-04-15
**Status:** Approved

## Overview

Add a warmup section to active workout sessions that is visually separated from working exercises. Warmup templates are reusable routines built in the Library tab. They can be baked into program days for auto-loading, selected at session start, or added mid-session. Warmup data is completely isolated from volume, PR, and exercise history tracking.

## Data Model

### New Tables

#### `warmup_exercises`

Warmup-only movements that don't belong in the main exercise library (e.g., Foam Roll Quads, Arm Circles, Jump Rope).

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | INTEGER | PK AUTOINCREMENT | |
| name | TEXT | NOT NULL | Display name |
| tracking_type | TEXT | NOT NULL | `'checkbox'`, `'reps'`, or `'duration'` |
| default_value | INTEGER | nullable | Default reps count or duration in seconds; null for checkbox |
| is_custom | INTEGER | NOT NULL DEFAULT 0 | 0 = built-in, 1 = user-created |
| created_at | TEXT | NOT NULL | ISO timestamp |

#### `warmup_templates`

Named, reusable warmup routines (e.g., "Upper Body Warmup", "Leg Day Warmup").

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | INTEGER | PK AUTOINCREMENT | |
| name | TEXT | NOT NULL | Template name |
| created_at | TEXT | NOT NULL | ISO timestamp |

#### `warmup_template_items`

Ordered items within a warmup template. Each item references either a main library exercise or a warmup-only exercise via a dual-FK pattern.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | INTEGER | PK AUTOINCREMENT | |
| template_id | INTEGER | FK -> warmup_templates, NOT NULL, ON DELETE CASCADE | |
| exercise_id | INTEGER | FK -> exercises, nullable | Main library exercise (mutually exclusive with warmup_exercise_id) |
| warmup_exercise_id | INTEGER | FK -> warmup_exercises, nullable | Warmup-only exercise (mutually exclusive with exercise_id) |
| tracking_type | TEXT | NOT NULL | `'checkbox'`, `'reps'`, or `'duration'` |
| target_value | INTEGER | nullable | Target reps count or duration in seconds; null for checkbox |
| sort_order | INTEGER | NOT NULL DEFAULT 0 | Display order within template |

Constraint: exactly one of `exercise_id` or `warmup_exercise_id` must be non-null.

#### `warmup_session_items`

Live warmup checklist items during an active workout session. Created when a warmup template is loaded into a session.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | INTEGER | PK AUTOINCREMENT | |
| session_id | INTEGER | FK -> workout_sessions, NOT NULL, ON DELETE CASCADE | |
| exercise_id | INTEGER | FK -> exercises, nullable | Source library exercise (if applicable) |
| warmup_exercise_id | INTEGER | FK -> warmup_exercises, nullable | Source warmup exercise (if applicable) |
| display_name | TEXT | NOT NULL | Snapshot of exercise name at creation time |
| tracking_type | TEXT | NOT NULL | `'checkbox'`, `'reps'`, or `'duration'` |
| target_value | INTEGER | nullable | Target reps count or duration in seconds |
| is_complete | INTEGER | NOT NULL DEFAULT 0 | 0 = not done, 1 = checked off |
| sort_order | INTEGER | NOT NULL DEFAULT 0 | Display order |

### Existing Table Changes

#### `program_days` — add column

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| warmup_template_id | INTEGER | FK -> warmup_templates, nullable | Baked-in warmup template for this program day |

## TypeScript Types

```typescript
export type WarmupTrackingType = 'checkbox' | 'reps' | 'duration';

export interface WarmupExercise {
  id: number;
  name: string;
  trackingType: WarmupTrackingType;
  defaultValue: number | null;
  isCustom: boolean;
  createdAt: string;
}

export interface WarmupTemplate {
  id: number;
  name: string;
  createdAt: string;
}

export interface WarmupTemplateItem {
  id: number;
  templateId: number;
  exerciseId: number | null;
  warmupExerciseId: number | null;
  trackingType: WarmupTrackingType;
  targetValue: number | null;
  sortOrder: number;
}

export interface WarmupSessionItem {
  id: number;
  sessionId: number;
  exerciseId: number | null;
  warmupExerciseId: number | null;
  displayName: string;
  trackingType: WarmupTrackingType;
  targetValue: number | null;
  isComplete: boolean;
  sortOrder: number;
}
```

## Migration

Single migration (next version number after current latest) that:

1. Creates `warmup_exercises` table
2. Creates `warmup_templates` table
3. Creates `warmup_template_items` table
4. Creates `warmup_session_items` table
5. Adds `warmup_template_id` column to `program_days`

## Active Workout UX

### Warmup Section Component

The warmup section renders at the top of `WorkoutScreen`, above all working exercises, with clear visual separation.

**Visual treatment:**
- Green-tinted background/border (`#8DC28A33`) to distinguish from working exercise cards
- Header bar: fire emoji + "WARM UP" label + progress counter (e.g., "2/5")
- Collapse/expand toggle (▲/▼) and dismiss button (✕) in header
- "── WORKING SETS ──" divider label below the warmup section

**Item rows:**
- Each item is a tappable row: checkbox + display name + target label
- Target labels: "15 reps", "2 min", or "✓" for checkbox type
- Completed items show green checkmark + strikethrough text + dimmed color
- No set logging panel, no weight input — tap the row to toggle completion

**Three states:**

1. **Expanded** — Full item list visible, items can be tapped to complete. Default state when warmup is first loaded.
2. **Collapsed** — Slim summary bar showing progress counter + mini progress bar. Triggered by: (a) all items completed (auto-collapse), or (b) user taps collapse button. Tappable to re-expand.
3. **Dismissed** — Warmup section removed from view entirely. User taps ✕. Session items remain in DB but are not rendered. Cannot be re-added once dismissed (user would need to add a new warmup via the action menu).

### SessionContext Changes

Add warmup state to `SessionContext`:

- `warmupItems: WarmupSessionItem[]` — current warmup items for the active session
- `warmupState: 'none' | 'expanded' | 'collapsed' | 'dismissed'` — UI state
- `loadWarmupTemplate(templateId: number): Promise<void>` — load template items into session
- `toggleWarmupItemComplete(itemId: number): Promise<void>` — toggle item completion
- `dismissWarmup(): void` — set warmup state to dismissed
- `collapseWarmup(): void` / `expandWarmup(): void` — toggle collapse

When `startSessionFromProgramDay` is called and the program day has a `warmup_template_id`, automatically call `loadWarmupTemplate` after session creation.

## Library Tab — Warmup Templates

### Sub-tab Bar

The Library screen gains a sub-tab bar at the top: **Exercises** (existing, default) | **Warmups** (new).

The Exercises tab shows the current category-based exercise browser. The Warmups tab shows the warmup template management interface.

### Warmup Template List

- Shows all saved warmup templates as cards
- Each card: template name, item count, preview of first 2-3 item names
- Tap a card to open the template detail/editor
- "+ New Template" button at top creates a new empty template (prompts for name)

### Warmup Template Detail/Editor

- Header: template name (tappable to rename)
- Ordered list of items with drag handles for reordering
- Each item shows: drag handle + display name + source label + target
  - Source label: green "warmup exercise" for warmup-only movements, blue "from exercise library" for main library exercises
- Swipe-to-delete on items
- "+ Add Item" button at bottom opens the add-item modal
- Delete template option (with confirmation)

### Add Warmup Item Modal

Two-tab interface:

**Tab 1: Warmup Exercises**
- Browse/search warmup-only exercises from `warmup_exercises` table
- All exercises are user-created at launch (no pre-seeded built-ins; `is_custom` column exists for future seeding)
- "+ Create New Warmup Exercise" option opens inline creation form
  - Fields: name, tracking type (checkbox/reps/duration), default value
- Tap an exercise to select it

**Tab 2: From Library**
- Browse/search exercises from the main `exercises` table
- Same category tabs and search as existing exercise browser
- Tap an exercise to select it; tracking type defaults to 'reps'

**After selection:** Quick inline prompt for target value:
- Reps: number input, defaults to exercise's default_value
- Duration: number input (seconds), defaults to exercise's default_value
- Checkbox: no prompt, added immediately

## Program Day Integration

### DayDetailScreen Changes

A new "Warmup" section appears above the exercise list:

- **No warmup attached:** Shows "Warmup: None" with an "Attach Warmup" button
- **Warmup attached:** Shows green warmup badge with template name, item count, and "Change >" link
- Tapping "Attach Warmup" or "Change" opens the warmup template picker (same picker used in active workout)
- Option to detach/remove the warmup

### Session Start Logic

| Scenario | Behavior |
|----------|----------|
| Program day has `warmup_template_id` | Auto-load warmup items, no prompt |
| Program day has no warmup | Show optional "Add a warmup?" prompt with template list + "Skip" |
| Empty session (no program) | Same optional prompt |
| Mid-session, no warmup | "Add Warmup" option in workout action menu |
| Mid-session, warmup exists | Confirm replace before loading new template |

## DB Layer

### New file: `src/db/warmups.ts`

CRUD operations for warmup exercises, templates, template items, and session items:

- `getWarmupExercises(): Promise<WarmupExercise[]>`
- `searchWarmupExercises(query: string): Promise<WarmupExercise[]>`
- `createWarmupExercise(name, trackingType, defaultValue?): Promise<WarmupExercise>`
- `deleteWarmupExercise(id): Promise<void>`
- `getWarmupTemplates(): Promise<WarmupTemplate[]>`
- `getWarmupTemplateWithItems(id): Promise<{ template: WarmupTemplate; items: WarmupTemplateItemWithName[] }>`
- `createWarmupTemplate(name): Promise<WarmupTemplate>`
- `updateWarmupTemplateName(id, name): Promise<void>`
- `deleteWarmupTemplate(id): Promise<void>`
- `addWarmupTemplateItem(templateId, exerciseId?, warmupExerciseId?, trackingType, targetValue?, sortOrder): Promise<WarmupTemplateItem>`
- `removeWarmupTemplateItem(id): Promise<void>`
- `reorderWarmupTemplateItems(templateId, itemIds: number[]): Promise<void>`
- `loadWarmupIntoSession(sessionId, templateId): Promise<WarmupSessionItem[]>`
- `getWarmupSessionItems(sessionId): Promise<WarmupSessionItem[]>`
- `toggleWarmupSessionItemComplete(id): Promise<void>`
- `clearWarmupSessionItems(sessionId): Promise<void>`

### Changes to existing DB files

- `src/db/programs.ts`: Add `getWarmupTemplateIdForDay(dayId)`, `setWarmupTemplateIdForDay(dayId, templateId)`, `clearWarmupTemplateIdForDay(dayId)`

## New Screens & Components

| File | Type | Description |
|------|------|-------------|
| `src/screens/WarmupTemplateListScreen.tsx` | Screen | List of warmup templates in Library > Warmups tab |
| `src/screens/WarmupTemplateDetailScreen.tsx` | Screen | Template editor with reorderable item list |
| `src/components/WarmupSection.tsx` | Component | Warmup section in active workout (expanded/collapsed/dismissed states) |
| `src/components/WarmupItemRow.tsx` | Component | Single warmup item row with tap-to-complete |
| `src/components/WarmupTemplatePicker.tsx` | Component | Modal for selecting a warmup template (used in session start, mid-session, and program day) |
| `src/components/AddWarmupItemModal.tsx` | Component | Two-tab modal for adding items to a template |
| `src/components/CreateWarmupExerciseModal.tsx` | Component | Inline form for creating a new warmup-only exercise |

## Navigation Changes

- Library tab: convert from standalone `LibraryScreen` to a stack navigator with:
  - `LibraryHome` (sub-tabbed: Exercises / Warmups)
  - `WarmupTemplateDetail` (push from template list)
- No new bottom tabs

## Out of Scope

- Warmup analytics or progress tracking
- Warmup history screen (viewing past warmups from calendar)
- Warmup streaks or gamification badge integration
- Timer/stopwatch integration for duration-type warmup items
- Pre-seeded warmup exercises (all user-created; can be added later)
- Sharing or importing warmup templates
- Reordering warmup items within an active session (only in template editor)
