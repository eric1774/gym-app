---
status: partial
phase: 36-goal-setting-stats
source: [36-VERIFICATION.md]
started: 2026-04-05T08:30:00Z
updated: 2026-04-05T08:30:00Z
---

## Current Test

[awaiting human testing]

## Tests

### 1. First-Use GoalSetupCard Display
expected: GoalSetupCard is displayed centered on screen — cup, quick-add buttons, and Log Water button are all hidden. The card shows "Set Your Daily Water Goal" title, a TextInput pre-filled with "64", an "fl oz" suffix label, and a green "Set Goal" button.
result: [pending]

### 2. Goal Save Transition
expected: Tapping "Set Goal" with default 64 — the setup card disappears instantly and the full hydration view renders: WaterCup, "GOAL: 64 fl oz" label, two stat cards, quick-add buttons, and Log Water button — no animation, no flash.
result: [pending]

### 3. Inline Edit Entry
expected: Tapping the "GOAL: 64 fl oz" label — the label is replaced inline by a TextInput pre-filled with "64", an "fl oz" suffix, and two buttons: "Save Goal" and "Cancel". The keyboard appears automatically.
result: [pending]

### 4. Inline Edit Save and Recalculation
expected: Typing "128" and tapping "Save Goal" — TextInput and buttons disappear, "GOAL: 128 fl oz" label reappears, and the cup fill percentage recalculates immediately. Streak and weekly average cards also update.
result: [pending]

### 5. Inline Edit Validation
expected: Typing "0" and tapping "Save Goal" — error message "Please enter a number greater than 0" appears below the input. The goal is not changed.
result: [pending]

### 6. Inline Edit Cancel
expected: Tapping "Cancel" — the TextInput disappears and the original "GOAL: X fl oz" label reappears unchanged. No DB write occurred.
result: [pending]

### 7. Stat Cards with Real Data
expected: With multiple days of logged water data, streak card shows correct count of consecutive days, weekly average card shows correct percentage. Fire emoji on streak card, droplet emoji on average card. Empty states show "0" streak and em-dash for avg.
result: [pending]

## Summary

total: 7
passed: 0
issues: 0
pending: 7
skipped: 0
blocked: 0

## Gaps
