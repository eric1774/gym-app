---
status: partial
phase: 26-hr-data-persistence
source: [26-VERIFICATION.md]
started: "2026-03-27T23:30:00Z"
updated: "2026-03-27T23:30:00Z"
---

## Current Test

[awaiting human testing]

## Tests

### 1. HR samples accumulate during workout with connected device
expected: Start workout with Garmin Forerunner 245 connected, log at least one set, let HR data flow for 30+ seconds
result: [pending]

### 2. Summary card shows Avg HR after session end
expected: After ending workout, summary card displays "Avg HR" row with "N bpm" value (e.g., "142 bpm")
result: [pending]

### 3. Summary card shows Peak HR after session end
expected: Summary card displays "Peak HR" row with "N bpm" value, HR rows appear after "Exercises" and before "PRs"
result: [pending]

### 4. Calendar day detail shows HR stats
expected: Navigate to Calendar, tap today, session card shows second stats line with "Avg HR: N bpm" and "Peak HR: N bpm"
result: [pending]

### 5. No HR rows on summary without monitor
expected: Start and end workout WITHOUT HR monitor connected — summary card shows NO HR rows at all
result: [pending]

### 6. No HR stats in calendar without monitor
expected: Calendar day detail for session without HR data shows NO HR stats line
result: [pending]

### 7. Set logging speed unimpacted
expected: During HR monitoring, set logging feels as fast as before (no perceptible lag from HR buffering)
result: [pending]

### 8. HR values are reasonable
expected: Avg HR and Peak HR values match expected range for the workout intensity performed
result: [pending]

## Summary

total: 8
passed: 0
issues: 0
pending: 8
skipped: 0
blocked: 0

## Gaps
