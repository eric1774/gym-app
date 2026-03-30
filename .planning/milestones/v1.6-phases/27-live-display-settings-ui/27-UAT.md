---
status: diagnosed
phase: 27-live-display-settings-ui
source: [27-01-SUMMARY.md, 27-02-SUMMARY.md]
started: 2026-03-29T15:00:00Z
updated: 2026-03-29T15:15:00Z
---

## Current Test

[testing complete]

## Tests

### 1. Live BPM in Workout Header
expected: During a workout with an HR monitor connected, the workout header shows your current BPM value. The BPM text is colored to match your current HR zone.
result: issue
reported: "HR number and zone flickers every second — disappears and reappears instead of staying on screen. Want it to stay up persistently and update dynamically without disappearing."
severity: major

### 2. Zone Label in Workout Header
expected: A zone label (e.g., "Zone 3" or "Moderate") appears alongside or near the BPM value in the workout header.
result: issue
reported: "When HR and zone are displayed, the End Workout button gets pushed off screen and is untappable"
severity: blocker

### 3. Disconnected HR Display
expected: When no HR monitor is connected during a workout, the BPM area shows "--" instead of a number.
result: pass

### 4. HR Monitor Card in Settings
expected: The Settings screen shows a "Heart Rate Monitor" card as the first card, above Export Data, Repair Data, and About.
result: issue
reported: "I dont have a settings page"
severity: major

### 5. Age Input with Auto-Save
expected: Tapping the age field, entering a number (e.g., 30), and tapping away saves it automatically. Invalid values (0, 121+, letters) silently revert to the previous value.
result: blocked
blocked_by: other
reason: "Settings page not accessible — blocked by test 4 issue"

### 6. Tanaka Max HR Calculation
expected: After entering an age, the Max HR row shows a calculated value with "(Tanaka)" label (e.g., for age 30: "187 bpm (Tanaka)").
result: blocked
blocked_by: other
reason: "Settings page not accessible — blocked by test 4 issue"

### 7. Custom Max HR Override
expected: Toggling the custom override switch ON reveals a text input for entering a manual max HR. Toggling it OFF reverts the displayed max HR back to the Tanaka-calculated value.
result: blocked
blocked_by: other
reason: "Settings page not accessible — blocked by test 4 issue"

### 8. Paired Device Display
expected: If a device is paired, the HR Monitor card shows its name. If no device is paired, it shows "No device paired".
result: blocked
blocked_by: other
reason: "Settings page not accessible — blocked by test 4 issue"

### 9. Scan for Devices
expected: Tapping "Scan for Devices" opens the device scanning sheet where you can discover and pair an HR monitor.
result: blocked
blocked_by: other
reason: "Settings page not accessible — blocked by test 4 issue"

### 10. Unpair Device Confirmation
expected: Tapping "Unpair" shows a confirmation alert. Confirming removes the paired device and the display reverts to "No device paired".
result: blocked
blocked_by: other
reason: "Settings page not accessible — blocked by test 4 issue"

## Summary

total: 10
passed: 1
issues: 3
pending: 0
skipped: 0
blocked: 6

## Gaps

- truth: "Settings screen shows Heart Rate Monitor card as the first card, above Export Data, Repair Data, and About"
  status: failed
  reason: "User reported: I dont have a settings page"
  severity: major
  test: 4
  root_cause: "SettingsScreen is registered as a route in DashboardStack but no UI element navigates to it — no gear icon, button, or tab exists"
  artifacts:
    - path: "src/screens/DashboardScreen.tsx"
      issue: "No settings navigation button/icon in header"
    - path: "src/navigation/TabNavigator.tsx"
      issue: "Route registered but unreachable (line 167)"
  missing:
    - "Add gear icon TouchableOpacity to DashboardScreen header that calls navigation.navigate('Settings')"

- truth: "BPM value stays persistently visible in workout header and updates dynamically without flickering"
  status: failed
  reason: "User reported: HR number and zone flickers every second — disappears and reappears instead of staying on screen"
  severity: major
  test: 1
  root_cause: "Two cooperating issues: (1) WorkoutScreen.tsx lines 999-1013 uses conditional mount/unmount rendering — bpmBlock fully unmounts when any condition fails, causing visual flash. (2) HeartRateContext.tsx line 218 aggressively nulls currentBpm on disconnect events (micro-disconnects common with HR straps), and reconnect backoff starts at 1 second — matching the flicker interval exactly."
  artifacts:
    - path: "src/screens/WorkoutScreen.tsx"
      issue: "Lines 999-1013: conditional mount/unmount pattern causes visual flicker"
    - path: "src/context/HeartRateContext.tsx"
      issue: "Line 218: setCurrentBpm(null) on disconnect clears value during micro-reconnects; Line 372: attemptAutoReconnect unconditionally sets deviceState='connecting'"
  missing:
    - "Replace conditional mount/unmount with always-rendered view that swaps content (BPM value vs '--') without destroying component tree"
    - "Remove setCurrentBpm(null) from disconnect handler — keep last known value visible during reconnection"
    - "Guard attemptAutoReconnect to skip if already connected"
  debug_session: ".planning/debug/bpm-display-flicker.md"

- truth: "End Workout button remains visible and tappable when HR display is active"
  status: failed
  reason: "User reported: When HR and zone are displayed, the End Workout button gets pushed off screen and is untappable"
  severity: blocker
  test: 2
  root_cause: "Header row (line 986) uses flat flexDirection:'row' with justifyContent:'space-between' and no flex/flexShrink on children. Phase 27 added 2 new children (HRConnectionIndicator + bpmBlock) without restructuring layout. 5 children need ~445pt but only ~343pt available on a 375pt screen — End Workout button pushed past right edge."
  artifacts:
    - path: "src/screens/WorkoutScreen.tsx"
      issue: "Lines 986-1033: header row has 5 children overflowing available width; Lines 1200-1206: header style has no flexWrap/flexShrink"
    - path: "src/components/HRConnectionIndicator.tsx"
      issue: "Unconstrained width adds ~75pt to header row"
  missing:
    - "Restructure header into two rows — HR info on second row, End Workout stays in top row with timer/volume — OR compact HR elements into a single minimal display"
  debug_session: ".planning/debug/end-workout-pushed-off-screen.md"
