# Phase 13: Calendar View - Context

**Gathered:** 2026-03-13
**Status:** Ready for planning

<domain>
## Phase Boundary

Monthly calendar grid showing training history with workout day indicators, month-to-month navigation, and day-detail drill-down showing session stats and exercise breakdown. New bottom tab added to the app. No new DB migrations needed — queries existing `workout_sessions`, `workout_sets`, and `exercise_sessions` tables.

</domain>

<decisions>
## Implementation Decisions

### Calendar Screen Placement
- **New 6th bottom tab** — dedicated "Calendar" tab in bottom navigation
- **Tab position**: Second slot — Dashboard > Calendar > Library > Programs > Workout > Protein
- **Tab icon**: Calendar grid outline SVG (22px), matching existing tab icon style
- **Tab label**: "Calendar"

### Calendar Grid Visual Treatment
- **Workout day indicator**: Filled mint circle behind the date number (not a dot below)
- **Today indicator**: Mint outline ring (no fill) when no workout; filled mint bg + bright ring when workout exists
- **Selected day**: Brief bright highlight on tap, then immediately navigate to detail screen (no persistent selection state)
- **Multi-session days**: No visual distinction from single-session days on the grid — detail revealed on tap
- **Empty days / future dates**: Standard secondary-color text, no background treatment
- **Days outside current month**: Dimmed or hidden

### Month Navigation
- **Navigation method**: Left/right arrow buttons flanking the month title (no swipe gesture)
- **Month title format**: "March 2026" centered between arrows
- **Forward limit**: Right arrow disabled when viewing the current month — no navigating into the future
- **Backward limit**: Left arrow disabled when reaching the month of the user's first-ever completed session
- **Default view**: Always opens to the current month

### Day Detail Presentation
- **Interaction**: Tapping a workout day navigates to a separate detail screen (stack navigation within Calendar tab)
- **Tapping non-workout days**: No action (no navigation)
- **Multi-session handling**: Each session gets its own card on the detail screen, stacked vertically
- **Session card stats**: Match Phase 12 workout summary — duration, total sets, total volume, exercises completed, PRs. Plus program day name if applicable
- **Exercise list**: Each exercise shows name + all sets listed below it (e.g., "Set 1: 135 x 10, Set 2: 155 x 8, Set 3: 185 x 5")
- **PR indicator**: Use prGold color for PR rows, consistent with Phase 10/12 treatment

### Claude's Discretion
- Grid cell sizing, padding, and font sizes for the 7-column layout
- Day detail screen layout and spacing
- Header styling for month navigation row
- Loading state while fetching session data for a month
- How to structure the date-range query (single query for all days in a month vs per-day)
- Exercise set display formatting (compact vs expanded)
- Back navigation from detail screen to calendar

</decisions>

<specifics>
## Specific Ideas

- Calendar should feel like a quick history reference — open the tab, scan the month, see your consistency at a glance
- The filled mint circles create a satisfying visual pattern when the user has been training consistently
- Day detail is a full screen because it includes the complete exercise breakdown with all sets — needs the room
- Stacked session cards for multi-session days keep each workout's identity clear

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- `getLocalDateString()` in `src/utils/dates.ts`: Local timezone date handling — use for day boundary matching
- `colors.accent` (#8DC28A): Mint green for workout day indicators
- `colors.accentDim` (#1A3326): Faint mint for subtle backgrounds
- `colors.prGold` (#FFB800): PR highlight color for detail screen
- `TabNavigator.tsx`: Bottom tab configuration — add Calendar as 6th tab in position 2
- Phase 12 workout summary pattern: Duration, sets, volume, exercises, PRs stat display

### Established Patterns
- Card design: `colors.surfaceElevated` bg, `borderRadius: 14`, `borderWidth: 1`, `borderColor: colors.border`
- Screen structure: `SafeAreaView` + `ScrollView`, `useFocusEffect` with cancellation for data loading
- Stack navigation: Each tab has its own stack navigator (e.g., `DashboardStackNavigator`)
- Custom SVG tab icons: 22px, color-based active/inactive states

### Integration Points
- `TabNavigator.tsx`: Add CalendarTab between DashboardTab and LibraryTab
- `src/db/dashboard.ts` or new `src/db/calendar.ts`: Query for completed sessions in a date range
- `src/types/index.ts`: WorkoutSession type already has `startedAt`, `completedAt`, `programDayId`
- `workout_sets` table: Join for per-exercise set details and volume calculation
- `exercise_sessions` table: Join for exercise completion status and names

</code_context>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 13-calendar-view*
*Context gathered: 2026-03-13*
