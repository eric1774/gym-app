# Phase 14: Superset Support - Context

**Gathered:** 2026-03-14
**Status:** Ready for planning

<domain>
## Phase Boundary

Users can group exercises as supersets in their programs and experience a seamless alternating-set flow during workouts. Includes DB migration v6 for superset grouping data. Does not include tri-sets beyond 3 exercises, drop sets, or circuit training.

</domain>

<decisions>
## Implementation Decisions

### Superset Creation UX
- **Entry point**: Header button ("SS") on DayDetailScreen, beside the existing "+ Add" button
- **Selection mode**: Tapping "SS" enters multi-select mode with "SELECT 2-3 EXERCISES" instruction, checkboxes appear on each exercise row, "Group as Superset" confirm button at bottom
- **Adjacency rule**: Only adjacent (consecutive) exercises can be grouped — if exercises aren't adjacent, user reorders first using existing move up/down controls
- **Group size**: 2-3 exercises per superset (enforced in selection mode)
- **Cancel**: "Cancel" button replaces header actions during selection mode to exit without grouping

### Superset Ungrouping
- **Mechanism**: Tap the lightning bolt badge on any grouped exercise to trigger an "Ungroup superset?" confirmation dialog with Cancel/Ungroup options
- **Effect**: All exercises in that group are ungrouped simultaneously — they remain in the list at their current positions but lose the superset association

### Workout Flow Behavior
- **Auto-advance**: After logging a set for a non-last exercise in a superset, current exercise auto-collapses and next exercise in the group auto-expands with LayoutAnimation (200-300ms)
- **Round cycling**: After the last exercise in the group, rest timer prompt appears. After rest timer ends, first exercise in the superset auto-expands for the next round (A→B→rest→A→B→rest)
- **User override**: Auto-advance is a suggestion, not a lock — user can tap any exercise card at any time to manually expand it, including outside the superset
- **Category override**: Superset exercises are grouped together in their superset container in WorkoutScreen, regardless of their individual exercise categories. Non-superset exercises still group by category as today

### Superset Visual Treatment — Workout View
- **Container**: Shared outer container wraps superset exercises with a vertical mint accent bar (3-4px wide) on the left edge
- **Individual cards**: Exercise cards sit inside the container, separated by dividers (not individual card borders)
- **Header label**: "SUPERSET" label above the container, includes round progress: "SUPERSET · Round 2/3"
- **Round calculation**: Round = min(sets logged across group) + 1; Total = max target sets in group

### Superset Visual Treatment — Program View
- **Badge**: Lightning bolt icon before each grouped exercise's name
- **Background**: Grouped exercises share a subtle accentDim background tint, visually connecting them as a unit
- **Separation**: Grouped exercises appear inside a shared container card, distinct from ungrouped exercises which render as individual rows

### Rest Timer in Supersets
- **No mid-superset rest**: "Start Rest Timer" button is hidden for non-last exercises in the superset — after logging a set, the next exercise auto-expands immediately with no rest prompt
- **Rest after last exercise**: "Start Rest Timer" button appears only after logging a set for the last exercise in the group
- **Duration source**: Uses the last exercise's configured rest_seconds (consistent with existing behavior where rest uses the active exercise's duration)
- **Manual override**: User can still manually start a rest timer at any time via the RestTimerBanner area, even mid-superset. Auto-advance continues regardless
- **Post-rest behavior**: When rest timer reaches 0 or is stopped, the first exercise in the superset automatically expands for the next round

### Claude's Discretion
- LayoutAnimation timing and easing for auto-advance transitions
- Exact accent bar width, color opacity, and container padding
- "SS" button styling in header (icon vs text, size)
- Multi-select checkbox styling and positioning
- How round counter handles exercises with mismatched target sets
- DB migration v6 schema design (superset_group_id column vs separate table)

</decisions>

<specifics>
## Specific Ideas

- The auto-advance cycle should feel seamless — log a set, eyes move down to the next exercise which is already expanded and ready. Minimal cognitive overhead
- Lightning bolt icon for superset badge — universally understood as "power/speed", fits the concept of back-to-back exercises
- Round counter ("SUPERSET · Round 2/3") gives users progress awareness without cluttering individual exercise cards
- The whole flow should maintain the app's #1 UX constraint: speed of data entry with one hand, eyes-barely-on-phone

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- `ExerciseCard` component (WorkoutScreen): Already handles expand/collapse, set logging, rest timer prompt — needs superset-awareness for hiding rest button and triggering auto-advance
- `LayoutAnimation` already imported and used in ProgramDetailScreen for drag reorder — reuse for auto-advance transitions
- `SetLoggingPanel`: Standalone component, no changes needed — it just logs sets and calls onSetLogged
- `ExerciseTargetRow` component (DayDetailScreen): Renders individual exercise rows — needs lightning bolt badge and selection mode checkbox
- `colors.accentDim`: Already exists for subtle accent backgrounds (used in cardComplete style)
- `RestTimerBanner`: Global banner component — works independently of exercise cards

### Established Patterns
- Card design: `colors.surface` background, `borderRadius: 14`, `borderWidth: 1`, `borderColor: colors.border`
- Haptic feedback: `impactLight` for interactions, `notificationSuccess` for completions
- Category grouping in WorkoutScreen: `groupByCategory()` function — needs to be extended to handle supersets-first grouping
- Rest timer priority chain: restOverrides > sessionExercises.restSeconds > exercise.defaultRestSeconds > 90

### Integration Points
- `program_day_exercises` table: Needs superset_group_id or equivalent column (DB migration v6)
- `DayDetailScreen`: Multi-select mode overlay, superset badge rendering, shared background container
- `WorkoutScreen`: New superset container component wrapping grouped ExerciseCards, auto-advance logic in handleSetLogged
- `SessionContext`: May need superset group awareness for the auto-advance cycle
- `db/programs.ts`: New functions for creating/removing superset groups
- `types/index.ts`: ProgramDayExercise needs superset_group_id field

</code_context>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 14-superset-support*
*Context gathered: 2026-03-14*
