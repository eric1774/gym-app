---
phase: 27-live-display-settings-ui
plan: 02
subsystem: settings-ui
tags: [settings, heart-rate, ble, hr-monitor, user-preferences]
dependency_graph:
  requires:
    - src/services/HRSettingsService.ts
    - src/context/HeartRateContext.tsx
    - src/screens/DeviceScanSheet.tsx
    - src/theme/colors.ts
    - src/theme/spacing.ts
    - src/theme/typography.ts
  provides:
    - src/screens/SettingsScreen.tsx (Heart Rate Monitor card)
  affects:
    - src/screens/__tests__/SettingsScreen.test.tsx
tech_stack:
  added: []
  patterns:
    - blur-to-save age input (no explicit Save button)
    - Switch component for Tanaka / custom max HR toggle
    - ScrollView replacing plain View for scrollable settings content
    - loadSettings reload on DeviceScanSheet close (picks up newly paired device)
key_files:
  created: []
  modified:
    - src/screens/SettingsScreen.tsx
    - src/screens/__tests__/SettingsScreen.test.tsx
decisions:
  - "Age blur-to-save pattern: setAge called on onBlur with 1-120 validation; invalid input silently restores previous value (per D-09)"
  - "Tanaka formula computed inline (208 - 0.7 * age, rounded) — no separate call to getComputedMaxHR for display (simpler, same result)"
  - "weightSemiBold removed from SettingsScreen import; exportButtonText.fontWeight migrated to weightBold (per font weight reduction decision in UI-SPEC)"
  - "maxHrSource state retained but display string already encodes source ('(Tanaka)' vs '(custom)') — state available for future consumers"
metrics:
  duration: "~8 minutes"
  completed: "2026-03-29"
  tasks_completed: 1
  files_modified: 2
---

# Phase 27 Plan 02: Settings Screen Heart Rate Monitor Card Summary

**One-liner:** Heart Rate Monitor card added to SettingsScreen with age/Tanaka max HR, custom override Switch, paired device management, and DeviceScanSheet integration.

## What Was Built

Updated `SettingsScreen.tsx` to add a "Heart Rate Monitor" card as the first card (above Export Data), with:

- **Age input:** Numeric keyboard, blur-to-save via `setAge()`, validates 1–120 (invalid silently restores previous value)
- **Max HR display:** Shows `{value} bpm (Tanaka)` after age entered, recalculates on blur
- **Custom max HR override:** Switch reveals a TextInput; on blur calls `setMaxHrOverride()`; toggling off reverts to Tanaka and calls `setMaxHrOverride(null)`
- **Paired device section:** Shows device name or "No device paired" with "Scan for Devices" button opening `DeviceScanSheet`
- **Unpair:** Alert confirmation ("Remove your paired heart rate monitor? You can re-pair at any time."), calls `clearPairedDevice()` on confirm
- **ScrollView:** Content area uses ScrollView to accommodate longer screen
- Settings card order: Heart Rate Monitor → Export Data → Repair Data → About

Also updated `SettingsScreen.test.tsx` to mock `HeartRateContext`, `HRSettingsService`, `DeviceScanSheet`, and `repairProgramData`, adding 4 new HR-specific test cases (9 tests total, all passing).

## Tasks Completed

| Task | Description | Commit | Files |
|------|-------------|--------|-------|
| 1 | Add Heart Rate Monitor card to SettingsScreen | 67b3050 | SettingsScreen.tsx, SettingsScreen.test.tsx |

## Verification Results

1. `npx tsc --noEmit` — no errors in SettingsScreen.tsx (pre-existing node_modules and test file errors unchanged)
2. Heart Rate Monitor card renders as first card with age input and device controls
3. Age blur saves via `setAge()` and recomputes max HR display (Tanaka formula)
4. Override Switch shows/hides custom TextInput and calls `setMaxHrOverride()`
5. "Scan for Devices" opens `DeviceScanSheet`
6. "Unpair Device" shows confirmation Alert, calls `clearPairedDevice()` on confirm
7. Tests: 541 passed, 20 failed (all 20 are pre-existing failures in WorkoutScreen, DashboardScreen, protein.test.ts — SettingsScreen went from 6 failing to 9 passing)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical Functionality] Updated SettingsScreen tests for new dependencies**
- **Found during:** Task 1 verification
- **Issue:** `SettingsScreen` now uses `useHeartRate()` which requires `HeartRateProvider` in context tree; tests rendered without it, causing all 6 existing tests to fail with "useHeartRate must be used within a HeartRateProvider"
- **Fix:** Added jest.mock for `HeartRateContext`, `HRSettingsService`, `DeviceScanSheet`, and `repairProgramData`; added 3 new HR-specific test cases; all 9 tests now pass
- **Files modified:** `src/screens/__tests__/SettingsScreen.test.tsx`
- **Commit:** 67b3050

## Known Stubs

None — all HR settings load from `AsyncStorage` via `HRSettingsService.getHRSettings()` on mount; paired device status reflects actual AsyncStorage state. No hardcoded empty values that flow to UI rendering.

## Self-Check: PASSED

- `src/screens/SettingsScreen.tsx` exists and contains "Heart Rate Monitor" card
- `src/screens/__tests__/SettingsScreen.test.tsx` exists with 9 passing tests
- Commit 67b3050 exists in git log
