# S10: Calendar View

**Goal:** Create the calendar data layer, monthly grid screen, and tab navigation wiring so users can view a monthly calendar showing which days they trained.
**Demo:** Create the calendar data layer, monthly grid screen, and tab navigation wiring so users can view a monthly calendar showing which days they trained.

## Must-Haves


## Tasks

- [x] **T01: 13-calendar-view 01**
  - Create the calendar data layer, monthly grid screen, and tab navigation wiring so users can view a monthly calendar showing which days they trained.

Purpose: Lets users see their training consistency at a glance -- filled mint circles create a satisfying visual pattern of workout days.
Output: CalendarTab visible in bottom navigation, CalendarScreen rendering a 7-column grid with workout indicators and month navigation arrows.
- [x] **T02: 13-calendar-view 02**
  - Build the day detail screen that shows full session breakdowns when a user taps a workout day on the calendar.

Purpose: Users can drill into any training day to review exactly what they did -- exercises, sets, weights, reps, PRs -- giving them a complete workout history reference.
Output: CalendarDayDetailScreen rendering session cards with stats and per-exercise set lists, wired into the calendar stack navigator.

## Files Likely Touched

- `src/types/index.ts`
- `src/db/calendar.ts`
- `src/screens/CalendarScreen.tsx`
- `src/navigation/TabNavigator.tsx`
- `src/screens/CalendarDayDetailScreen.tsx`
- `src/navigation/TabNavigator.tsx`
