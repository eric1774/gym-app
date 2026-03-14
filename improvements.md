# GymTrack v1.3 — "Workout Intelligence & Speed"

## Context

GymTrack's core value is "log weight + reps in two taps, start rest timer, get back to lifting." After shipping v1.2 (Meal Library), the next step is reducing friction on the **most repeated action** (set logging), adding **motivation through PR detection**, and surfacing **workout intelligence** (volume, summaries, calendar). These 11 features are organized into 6 phases ordered by dependency and impact.

---

## Phase 1: Faster Set Logging
**Weight steppers, auto-fill fix, haptic feedback — the foundation everything else builds on.**

### 1a. Weight Increment Buttons (+/-5)
- Modify `src/components/SetLoggingPanel.tsx`
- Add `[-5] [TextInput] [+5]` layout around the weight input
- Buttons: 56px wide, `colors.surfaceElevated` bg, large bold text
- Handler: parse current weight, add/subtract 5, floor at 0
- TextInput stays available for manual override
- Disable `-5` when weight would go below 0

### 1b. Auto-Fill Same-as-Last-Set (Gap Fix)
- Modify `src/components/SetLoggingPanel.tsx` — `loadData` callback
- Current behavior: pre-fills from last **session** only when no sets exist in current session
- Fix: if sets exist in current session, pre-fill from the most recent intra-session set
- Handles the case where user collapses/re-expands the panel

### 1c. Haptic Feedback
- Already using `react-native-haptic-feedback` in `TimerContext` — extend the pattern
- `SetLoggingPanel.handleConfirm`: `HapticFeedback.trigger('impactMedium')`
- `WorkoutScreen.handleToggleComplete`: `HapticFeedback.trigger('impactLight')`
- `WorkoutScreen.handleEndWorkout`: `HapticFeedback.trigger('notificationSuccess')`

**Files:** `src/components/SetLoggingPanel.tsx`, `src/screens/WorkoutScreen.tsx`
**DB changes:** None

---

## Phase 2: PR Detection & Volume Tracking
**Make the app reward your effort — know when you hit a record, see your total volume.**

### 2a. PR Detection & Celebration
- New `src/db/records.ts` — query-based PR check (no new table)
- Query: find any previous completed-session set with weight >= W AND reps >= R for exercise E. If none exist → it's a PR
- Exclude current (incomplete) session from comparison
- Extend `onSetLogged` callback to include `isPR: boolean`
- New `src/components/PRToast.tsx` — animated gold banner, slides down, holds 3s, slides up
- Track PRs per session in WorkoutScreen state for the summary screen
- Double haptic on PR: `notificationSuccess` + 400ms delayed second trigger

### 2b. Volume Tracking
- New `src/db/volume.ts` — `getSessionVolume(sessionId): Promise<number>`
- Query: `SUM(weight_kg * reps)` from workout_sets for session
- Display running total in WorkoutScreen header next to elapsed timer
- Format: `Vol: 12,450 lb` in `fontSize.sm`, `colors.secondary`
- Update locally on each set logged (no re-query needed)

**Files:** `src/components/SetLoggingPanel.tsx`, `src/screens/WorkoutScreen.tsx`, new `src/db/records.ts`, new `src/db/volume.ts`, new `src/components/PRToast.tsx`
**DB changes:** None (computed from existing workout_sets)

---

## Phase 3: Quick-Start & Rest Timer
**Eliminate 3 screens of navigation to start a workout. Surface per-exercise rest configuration.**

### 3a. Quick-Start "Next Workout" from Dashboard
- New `src/db/nextWorkout.ts` — find next unfinished program day
  1. Find active programs (start_date NOT NULL, current_week <= weeks)
  2. Use `getProgramWeekCompletion()` to find first incomplete day
  3. Load that day's exercises
- New `src/components/NextWorkoutCard.tsx` — prominent card with accent left border
  - Shows: program name, day name, exercise count
  - One-tap "Start" button → checks for active session, calls `startSessionFromProgramDay()`, navigates to WorkoutTab
- Add to `DashboardScreen.tsx` above recently-trained exercises
- Refresh with `useFocusEffect`

### 3b. Rest Timer Per Exercise (UI Surface)
- DB already has `exercise_sessions.rest_seconds` and `exercise.defaultRestSeconds`
- Add rest duration label to exercise card in WorkoutScreen: `Rest: 90s`
- Tap to edit via Alert.prompt or inline stepper
- Add `updateExerciseRestSeconds()` to `SessionContext`
- When "Start Rest" is tapped, use exercise-specific rest duration instead of default

**Files:** `src/screens/DashboardScreen.tsx`, `src/screens/WorkoutScreen.tsx`, `src/context/SessionContext.tsx`, new `src/components/NextWorkoutCard.tsx`, new `src/db/nextWorkout.ts`
**DB changes:** None (existing schema supports this)

---

## Phase 4: Workout Summary & Notes
**Give every workout a satisfying conclusion. Capture gym context that would otherwise be lost.**

### 4a. DB Migration v5: Notes Columns
- `ALTER TABLE workout_sessions ADD COLUMN notes TEXT DEFAULT NULL`
- `ALTER TABLE exercise_sessions ADD COLUMN notes TEXT DEFAULT NULL`
- Update types in `src/types/index.ts`
- Update row mappers in `src/db/sessions.ts`

### 4b. Workout Notes
- New `src/components/NotesButton.tsx` — small icon button + modal with multiline TextInput
- Session-level: in WorkoutScreen header row
- Exercise-level: in exercise card header (next to history button)
- Dot badge on icon when notes exist
- DB: `updateSessionNotes()`, `updateExerciseSessionNotes()` in sessions.ts

### 4c. Workout Completion Summary Screen
- New `src/screens/WorkoutSummaryScreen.tsx`
- Modify `SessionContext.endSession()` to return `{ sessionId, startedAt, completedAt }` instead of just boolean
- Navigate to summary instead of clearing immediately
- Summary shows: duration, total sets, total volume, exercises completed, PRs hit, session notes
- Optional: comparison to last similar program workout (+/- volume, sets, duration)
- "Done" button pops back to empty WorkoutScreen
- Add to `WorkoutStackParamList` in navigation

**Files:** `src/db/migrations.ts`, `src/db/sessions.ts`, `src/types/index.ts`, `src/context/SessionContext.tsx`, `src/screens/WorkoutScreen.tsx`, `src/navigation/TabNavigator.tsx`, new `src/screens/WorkoutSummaryScreen.tsx`, new `src/components/NotesButton.tsx`
**DB changes:** Migration v5 (notes columns)

---

## Phase 5: Calendar View
**See your training consistency at a glance — monthly view of every workout.**

### 5a. Calendar Data Layer
- New `src/db/calendar.ts`
- `getTrainedDaysForMonth(year, month)` → `{ date, sessionCount, hasProgram }[]`
- `getSessionsForDate(date)` → sessions with duration, exercise count, volume, program day name

### 5b. Calendar Screen
- New `src/screens/CalendarScreen.tsx` — custom 7-column grid (no external library)
- New `src/components/CalendarGrid.tsx` — the grid component
- Month navigation with left/right arrows
- Mint dot indicators on trained days
- Tap a day → inline section or bottom sheet with session cards
- Add to `DashboardStackParamList`, accessible from Dashboard via button/link

**Files:** `src/screens/DashboardScreen.tsx`, `src/navigation/TabNavigator.tsx`, new `src/screens/CalendarScreen.tsx`, new `src/components/CalendarGrid.tsx`, new `src/db/calendar.ts`
**DB changes:** None

---

## Phase 6: Superset Support
**Group exercises for alternating sets with automatic progression — the most architecturally complex feature.**

### 6a. DB Migration v6: Superset Groups
- `ALTER TABLE program_day_exercises ADD COLUMN superset_group_id INTEGER DEFAULT NULL`
- `ALTER TABLE exercise_sessions ADD COLUMN superset_group_id INTEGER DEFAULT NULL`
- Exercises sharing the same non-null `superset_group_id` within a day form a superset

### 6b. Superset Configuration (DayDetailScreen)
- Add "Group as Superset" action to DayDetailScreen
- Select 2-3 exercises → assign same `superset_group_id`
- Visual: accent-colored left border + "Superset" badge on grouped exercises
- New `setSupersetGroup()` in `src/db/programs.ts`

### 6c. Superset Workout Flow (WorkoutScreen)
- After logging a set for exercise A in a superset → auto-expand exercise B
- After logging a set for the LAST exercise in the group → show "Start Rest Timer"
- Use rest duration from the last exercise in the group
- Visual: grouped exercises rendered inside a shared container with connecting indicator

**Files:** `src/db/migrations.ts`, `src/db/programs.ts`, `src/screens/DayDetailScreen.tsx`, `src/screens/WorkoutScreen.tsx`, `src/context/SessionContext.tsx`, `src/components/SetLoggingPanel.tsx`
**DB changes:** Migration v6 (superset_group_id columns)

---

## Migration Plan

| Version | Phase | Changes |
|---------|-------|---------|
| 5 | Phase 4 | `workout_sessions.notes`, `exercise_sessions.notes` |
| 6 | Phase 6 | `program_day_exercises.superset_group_id`, `exercise_sessions.superset_group_id` |

## Dependency Graph

```
Phase 1 (Set Logging Speed)
   ↓
Phase 2 (PR + Volume)         ← uses haptic pattern from Phase 1
   ↓
Phase 3 (Quick Start + Rest)  ← independent, sequenced for incremental releases
   ↓
Phase 4 (Summary + Notes)     ← uses PR list + volume from Phase 2
   ↓
Phase 5 (Calendar)             ← benefits from summary data patterns
   ↓
Phase 6 (Supersets)            ← depends on rest timer per exercise from Phase 3
```

## Verification

After each phase:
1. Build APK and deploy to emulator
2. Test the specific feature flow end-to-end
3. Verify no regressions in existing workout logging, protein tracking, and program management
4. Test edge cases: empty state, no active program, mid-workout app background/resume

## Critical Files (Modified Across Multiple Phases)

- `src/components/SetLoggingPanel.tsx` — Phases 1, 2, 6
- `src/screens/WorkoutScreen.tsx` — Phases 1, 2, 3, 4, 6
- `src/context/SessionContext.tsx` — Phases 3, 4, 6
- `src/db/migrations.ts` — Phases 4, 6
- `src/screens/DashboardScreen.tsx` — Phases 3, 5
- `src/navigation/TabNavigator.tsx` — Phases 4, 5
- `src/types/index.ts` — Phases 4, 6
