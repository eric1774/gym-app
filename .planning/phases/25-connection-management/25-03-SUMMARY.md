---
phase: 25-connection-management
plan: 03
subsystem: ui
tags: [ble, heart-rate, react-native, haptic, workout-screen]

# Dependency graph
requires:
  - phase: 25-connection-management/25-01
    provides: HeartRateContext (useHeartRate hook, deviceState, attemptAutoReconnect), HRConnectionIndicator component, HRSettingsService (getHRSettings)

provides:
  - WorkoutScreen with HR connection indicator in workout header
  - Auto-reconnect on workout start when paired device exists
  - '--' BPM placeholder when paired device is disconnected
  - Single impactMedium haptic on mid-workout disconnect

affects: [26-hr-data-persistence, 27-live-display-settings-ui]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "prevDeviceStateRef pattern for detecting state transitions in useEffect (connected -> disconnected/reconnecting)"
    - "hasPairedDevice state loaded from AsyncStorage via getHRSettings on mount + session change"
    - "Auto-reconnect via useEffect watching both session and hasPairedDevice — fires when workout starts with paired device"

key-files:
  created: []
  modified:
    - src/screens/WorkoutScreen.tsx

key-decisions:
  - "HRConnectionIndicator placed between volumeText and endButton in header — matches UI-SPEC layout"
  - "bpmPlaceholder shows '--' only when hasPairedDevice && deviceState !== 'connected' — hides when fully connected (live BPM shown in Phase 27)"
  - "Auto-reconnect useEffect depends on [session, hasPairedDevice, attemptAutoReconnect] — re-fires if session or pairing status changes during app lifecycle"
  - "Disconnect haptic guards on session truthy — no haptic if device disconnects while not in an active workout"

patterns-established:
  - "prevDeviceStateRef: track previous value with useRef to detect transitions in useEffect without adding more state"
  - "HR data gating by hasPairedDevice: all HR UI hidden behind this flag (per D-07), so users without a paired device see zero change"

requirements-completed: [BLE-05, HR-04]

# Metrics
duration: 8min
completed: 2026-03-25
---

# Phase 25 Plan 03: Connection Management Summary

**WorkoutScreen integration: HR connection indicator in header, auto-reconnect on workout start, '--' BPM placeholder when disconnected, and impactMedium haptic on mid-workout disconnect**

## Performance

- **Duration:** ~8 min
- **Started:** 2026-03-25T19:39:34Z
- **Completed:** 2026-03-25T19:47:00Z
- **Tasks:** 1
- **Files modified:** 1

## Accomplishments

- HRConnectionIndicator (colored dot + state label) appears in workout header whenever a paired device exists — invisible when no device is paired
- '--' BPM placeholder shown when paired but not in connected state (covers disconnected, connecting, reconnecting, scanning states)
- Auto-reconnect fires when a workout session starts and a paired device exists (D-09: workout-start only, silent failure per D-10)
- Single `impactMedium` haptic fires on `connected → disconnected` or `connected → reconnecting` transition during active workout (D-13)
- All existing WorkoutScreen functionality (PR toast, rest timer, exercise picker, superset rendering, haptic on toggle complete) fully preserved

## Task Commits

Each task was committed atomically:

1. **Task 1: HR indicator, auto-reconnect, BPM placeholder, disconnect haptic** - `81818a8` (feat)

## Files Created/Modified

- `src/screens/WorkoutScreen.tsx` — Added useHeartRate hook, hasPairedDevice state, prevDeviceStateRef, three useEffects (load paired status, auto-reconnect, disconnect haptic), HRConnectionIndicator + bpmPlaceholder in header JSX, bpmPlaceholder style

## Decisions Made

- **prevDeviceStateRef for transition detection:** The disconnect haptic needs to know the *previous* deviceState to detect a connected → disconnected transition. Using a ref updated at the end of each effect run is the standard React pattern for this, avoiding extra state renders.
- **hasPairedDevice re-checked on session change:** Covers edge case where user pairs a device while in a workout — re-check on session change ensures the indicator appears without requiring app restart.
- **Disconnect haptic only during active session:** The `session` guard prevents the haptic from firing during app start when the context initializes to disconnected state.

## Deviations from Plan

None — plan executed exactly as written. All three useEffects, the header JSX changes, and the style addition match the plan specification precisely.

## Issues Encountered

- Pre-merge required: this worktree (worktree-agent-af2d232b) was initialized from an older commit and was missing the phase 25-01 work (HeartRateContext, HRConnectionIndicator, HRSettingsService). A fast-forward merge from `worktree-agent-ad8047ee` (which contained commits 5c3a71d through 17c38c0) was applied before task execution. No conflicts.
- Pre-existing TypeScript errors in test files (missing @test-utils module alias, Exercise type missing isCustom/createdAt) are unrelated to this plan and were present before this merge.

## Next Phase Readiness

- Plan 25-02 (DeviceScanSheet + SettingsScreen HR card) can be implemented independently — it uses the same HeartRateContext
- Phase 26 (HR data persistence) can now read deviceState and currentBpm from WorkoutScreen's useHeartRate call
- Phase 27 (live BPM display) will replace the '--' placeholder with actual BPM from `currentBpm` — the bpmPlaceholder style and hasPairedDevice gate are already in place as the scaffold

---
*Phase: 25-connection-management*
*Completed: 2026-03-25*
