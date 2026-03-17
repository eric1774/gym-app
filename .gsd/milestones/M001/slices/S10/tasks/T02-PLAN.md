# T02: 13-calendar-view 02

**Slice:** S10 — **Milestone:** M001

## Description

Build the day detail screen that shows full session breakdowns when a user taps a workout day on the calendar.

Purpose: Users can drill into any training day to review exactly what they did -- exercises, sets, weights, reps, PRs -- giving them a complete workout history reference.
Output: CalendarDayDetailScreen rendering session cards with stats and per-exercise set lists, wired into the calendar stack navigator.

## Must-Haves

- [ ] "Tapping a workout day on the calendar navigates to a detail screen"
- [ ] "Detail screen shows session cards with duration, total sets, total volume, exercises completed, and PRs"
- [ ] "Each session card shows program day name if applicable"
- [ ] "Each session card lists exercises with all their sets (set number, weight, reps)"
- [ ] "PR sets are highlighted in prGold color"
- [ ] "Multi-session days show stacked session cards"
- [ ] "User can navigate back to the calendar grid"

## Files

- `src/screens/CalendarDayDetailScreen.tsx`
- `src/navigation/TabNavigator.tsx`
