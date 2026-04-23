# Body Composition Tracking — Human UAT

Perform on the emulator + physical device.

## Smoke
- [ ] App launches without crash
- [ ] Dashboard shows new "WEIGHT · TODAY" card between Next Workout and Nutrition Rings
- [ ] Nutrition screen shows a third tab "BODY COMP"

## Daily log flow
- [ ] Tap "+ Log" on Dashboard card → modal opens with today's date
- [ ] Enter 177.4 → Save → card updates to show 177.4 (no delta since no yesterday)
- [ ] Relaunch app → Dashboard card still shows 177.4
- [ ] Tap the Edit icon on the card → modal pre-fills with 177.4 → change to 176.9 → Save → card updates

## Collision + edit modes
- [ ] With today's weight already logged, tap "+ Log" again → enter a different value → Save → replace prompt appears → Replace → value updates
- [ ] Long-press a day row in WEEK view → edit modal pre-fills that day's value → no replace prompt when saving

## BODY COMP tab
- [ ] Switch MONTH/WEEK/DAY — slider animates, content changes appropriately
- [ ] Date arrows step by scope-unit (month/7days/day); right arrow disables at today
- [ ] MONTH: chart shows weight line + MA + calorie bars; KPIs populated; month summary list shows reasonable values
- [ ] WEEK: 7 calorie bars + weight line with daily markers; daily breakdown list populates
- [ ] DAY: hero weight + macro rings + meals list (if any meals logged)

## Body fat
- [ ] Tap "+" in BODY COMP header → modal opens → toggle to Body Fat % → enter 18.0 for 2026-04-25 → save
- [ ] MONTH view shows a gold dot on the weight line at 2026-04-25
- [ ] Tap the gold dot → edit modal opens pre-filled with 18.0

## Program overlays (requires an active program)
- [ ] With a program spanning the visible MONTH, dashed vertical lines appear at program start and end
- [ ] Lines labeled "P1 start" / "P1 end" (tiny text at top)

## Edge cases
- [ ] No weights logged anywhere → BODY COMP shows Scale icon + "Log your first weight" CTA
- [ ] Delete a program → body-metric readings survive; program-overlay line disappears
- [ ] Backfill a weight from 10 days ago → MONTH chart updates with historical point
- [ ] Log a weight below 50 lb → Save button stays disabled; inline hint appears
- [ ] Log a body fat % above 60 → Save button stays disabled; inline hint appears
- [ ] Enter a note ("post-race") → saved and visible in edit mode next time

## Data integrity
- [ ] Launch on a fresh install — V24 migration runs, table exists, no errors
- [ ] Restart the app after logging — data persists
