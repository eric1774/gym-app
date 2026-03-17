# T01: 13-calendar-view 01

**Slice:** S10 — **Milestone:** M001

## Description

Create the calendar data layer, monthly grid screen, and tab navigation wiring so users can view a monthly calendar showing which days they trained.

Purpose: Lets users see their training consistency at a glance -- filled mint circles create a satisfying visual pattern of workout days.
Output: CalendarTab visible in bottom navigation, CalendarScreen rendering a 7-column grid with workout indicators and month navigation arrows.

## Must-Haves

- [ ] "A Calendar tab appears as the 2nd bottom tab (between Home and Library)"
- [ ] "Calendar screen shows a 7-column monthly grid for the current month"
- [ ] "Days that had completed workouts display a filled mint circle behind the date number"
- [ ] "Today shows a mint outline ring (no fill if no workout, filled + ring if workout exists)"
- [ ] "Left/right arrows flanking the month title navigate between months"
- [ ] "Right arrow is disabled on the current month"
- [ ] "Left arrow is disabled on the month of the first-ever completed session"
- [ ] "Grid updates when navigating months, showing correct workout indicators"

## Files

- `src/types/index.ts`
- `src/db/calendar.ts`
- `src/screens/CalendarScreen.tsx`
- `src/navigation/TabNavigator.tsx`
