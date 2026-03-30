---
phase: 25-connection-management
plan: "02"
subsystem: ble-ui
tags: [ble, settings, scan-sheet, hr-monitor, react-native]
dependency_graph:
  requires:
    - "25-01 (HeartRateContext, DeviceListRow, HRSettingsService)"
    - "24 (BLE foundation: BleManager, HRSettings types, HRSettingsService)"
  provides:
    - "DeviceScanSheet bottom sheet (scan-pair flow from Settings)"
    - "SettingsScreen HR Monitor card (paired/unpaired states, unpair flow)"
  affects:
    - "src/screens/SettingsScreen.tsx"
    - "App.tsx (HeartRateProvider wraps app, already wired in 25-01)"
tech_stack:
  added: []
  patterns:
    - "Bottom sheet: Modal transparent + animationType=slide + TouchableWithoutFeedback overlay"
    - "Age gate: inline prompt before scan starts, persisted to AsyncStorage via setAge()"
    - "Auto-close on connect success (D-03)"
    - "Alert.alert with destructive style for unpair confirmation"
key_files:
  created:
    - src/screens/DeviceScanSheet.tsx
  modified:
    - src/screens/SettingsScreen.tsx
decisions:
  - "DeviceScanSheet resets all local state (connectingDeviceId, connectionError, hasScanned, needsAge, ageInput) on handleClose to prevent stale UI on re-open"
  - "SettingsScreen.loadHRSettings called both on mount and when scan sheet closes to pick up newly-paired device ID from AsyncStorage"
  - "stateColor/stateLabel computed inline in render (not memoized) — simple ternary chain, no perf concern at this scale"
  - "DeviceScanSheet sheet height: SCREEN_HEIGHT * 0.60 per UI-SPEC (60% minimum)"
  - "Overlay opacity rgba(0,0,0,0.5) per UI-SPEC (vs ExercisePickerSheet's 0.6)"
metrics:
  duration: "~15 minutes"
  completed: "2026-03-25"
  tasks_completed: 2
  files_changed: 2
requirements-completed: [BLE-01, BLE-02]
---

# Phase 25 Plan 02: DeviceScanSheet + SettingsScreen HR Card Summary

One-liner: DeviceScanSheet bottom sheet and SettingsScreen HR Monitor card provide the full scan-pair-unpair flow accessible from Settings.

## What Was Built

### Task 1: DeviceScanSheet (`src/screens/DeviceScanSheet.tsx`)

A bottom sheet modal following the ExercisePickerSheet pattern, providing the complete BLE device discovery and pairing flow:

- **Age gate**: If no age is set in `HRSettings`, an inline form appears with a numeric `TextInput` and "Set Age" CTA. On save, calls `setAge()` and then auto-starts scan.
- **Scanning state**: Shows "Scanning..." heading + `ActivityIndicator` side-by-side, countdown timer "Stops in Ns", and a live `FlatList` of `DeviceListRow` items as devices are discovered.
- **Connect flow**: Tapping a device sets `connectingDeviceId` (spinner replaces chevron in DeviceListRow), calls `connectToDevice()`. On success auto-closes via `onClose()`. On failure, shows "Couldn't connect. Try again." inline beneath the tapped row.
- **Post-scan empty state**: "No heart rate monitors found." + "Make sure your device is on and in range." + "Scan Again" accent button.
- **Post-scan devices found**: Device list remains visible with "Scan Again" as a secondary text link (accent color).
- **Cleanup**: `handleClose` calls `stopScan()` and resets all local state before calling `onClose()`.

### Task 2: SettingsScreen HR Monitor Card (`src/screens/SettingsScreen.tsx`)

Added a Heart Rate Monitor card between Export Data and About:

- **No device paired**: Shows "Scan for Device" accent CTA that opens `DeviceScanSheet`.
- **Device paired**: Shows `pairedDeviceName`, color-coded `stateLabel` (green=connected/scanning, yellow=connecting/reconnecting, red=disconnected), "Scan for Device" secondary text link, and "Unpair" destructive text link.
- **Unpair flow**: `Alert.alert('Unpair Device', ...)` with `style: 'destructive'` on confirm button, calls `disconnect()` and refreshes `hrSettings` state.
- **State management**: `loadHRSettings()` called on mount and when `DeviceScanSheet` closes (via `handleScanClose`) to reflect newly-paired devices.
- **Existing functionality preserved**: Export Data card and About card unchanged.

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None — both components are fully wired to real data sources (HeartRateContext, HRSettingsService, AsyncStorage).

## Self-Check

- [x] `src/screens/DeviceScanSheet.tsx` exists and exports `DeviceScanSheet`
- [x] `src/screens/SettingsScreen.tsx` contains `Heart Rate Monitor` card and `DeviceScanSheet` usage
- [x] TypeScript compilation passes (no errors in source files)
- [x] Task 1 commit: `f84afab`
- [x] Task 2 commit: `6b725ba`
