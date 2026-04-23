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

## Post-UAT fixes (added after on-device feedback)

### Replace modal + WEEK chart axis (commit 1cf9b4a)
- [ ] Collision "Replace existing reading?" renders as a dark-mint themed modal, not the white Android Alert
- [ ] Tapping the backdrop dismisses the modal
- [ ] WEEK chart: leftmost calorie bar does not cover the Y-axis weight labels

### Keyboard avoidance + DAY calorie rounding (commit a44069b)
- [ ] Dashboard log modal: tap Weight field — keyboard does not cover the input
- [ ] Dashboard log modal: tap Note field — keyboard does not cover the input
- [ ] DAY page: calorie number and over/under-goal delta are whole numbers (no decimals)

### Colors + scroll + program delete (commit 9b267ba)
- [ ] MONTH + WEEK bars: over-goal is mint (green), under-goal is amber (yellow)
- [ ] WEEK daily-breakdown row text: over-goal day is mint, under-goal day is amber, missing-data days stay neutral grey
- [ ] DAY over/under-goal delta text: over is mint, under is amber
- [ ] Dashboard scrolls — Today's Nutrition (NutritionRingsCard) is reachable below the weight card
- [ ] Delete a program → close app → reopen → program stays gone
- [ ] Delete a program → sessions logged under that program are also gone from history/progress views
- [ ] Delete a program → body-metric weight history still intact (weights survive via ON DELETE SET NULL)
