---
phase: 35-tab-bar-hydration-core
plan: 02
subsystem: nutrition-ui
tags: [hydration, water-cup, modal, haptics, react-native]
dependency_graph:
  requires: [35-01, hydrationDb]
  provides: [WaterCup, HydrationView, LogWaterModal]
  affects: [ProteinScreen]
tech_stack:
  added: []
  patterns: [cup-fill-visualization, self-contained-tab-view, slide-modal, haptic-quick-add]
key_files:
  created:
    - src/components/WaterCup.tsx
    - src/components/HydrationView.tsx
    - src/screens/LogWaterModal.tsx
  modified:
    - src/screens/ProteinScreen.tsx
decisions:
  - "WaterCup uses CUP_HEIGHT=200 constant for fill calculation so fillFraction * CUP_HEIGHT is consistent with rendered dimensions"
  - "HydrationView refreshData is a stable useCallback — called on focus, after every quick-add, and after modal save"
  - "LogWaterModal uses Math.round(parsed) before DB write per T-35-03 threat mitigation — prevents fractional injection"
  - "Quick-add labels rendered via map([8,16,24]) — +{oz} oz template satisfies acceptance criteria for +8/+16/+24 oz at render time"
metrics:
  duration: "4 minutes"
  completed_date: "2026-04-05"
  tasks_completed: 2
  files_changed: 4
---

# Phase 35 Plan 02: Hydration View & LogWaterModal Summary

**One-liner:** WaterCup visualization (120x200 rounded glass, mint fill proportional to intake) with HydrationView self-container (quick-add haptics, LogWaterModal), wired into ProteinScreen replacing the Plan 01 placeholder.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Create WaterCup visualization component | 0ded4cc | src/components/WaterCup.tsx (new, 121 lines) |
| 2 | Create HydrationView, LogWaterModal, wire into ProteinScreen | 7f540df | src/components/HydrationView.tsx (new, 161 lines), src/screens/LogWaterModal.tsx (new, 153 lines), src/screens/ProteinScreen.tsx (modified, 40 lines) |

## What Was Built

### WaterCup.tsx (~121 lines)

Pure presentational component for cup visualization:

- Props: `currentOz: number`, `goalOz: number`
- Computed: `percentage` (0-100, capped), `fillFraction` (0-1, capped), `isGoalMet`
- Cup: 120x200px, `borderRadius: 16`, `colors.accentDim` empty background, `overflow: 'hidden'`
- Fill: absolutely positioned from bottom, height = `fillFraction * 200`, `colors.accent`
- Water-surface illusion: 8px inner View at top of fill with `opacity: 0.6`
- Goal met overlay: unicode checkmark `\u2713` centered in `colors.onAccent`, `fontSize: 32`
- Labels right of cup: primary "{currentOz} / {goalOz} oz" (`fontSize.lg`, `weightBold`), secondary "{percentage}%" (`fontSize.sm`, `weightRegular`), "Goal met!" badge (`fontSize.sm`, `weightBold`, `colors.accent`) when full
- Accessibility: `accessibilityRole="progressbar"` with descriptive `accessibilityLabel`
- No SVG dependency — pure React Native Views per D-05
- Export: `React.memo` wrapped

### HydrationView.tsx (~161 lines)

Self-contained hydration tab component:

- No props — fully manages its own state and data
- State: `isLoading`, `currentTotal`, `goalOz` (default 64 per D-09), `modalVisible`
- `refreshData` stable callback: `Promise.all([getTodayWaterTotal, getWaterGoal])` — updates both total and goal
- `useFocusEffect` for initial load on tab switch; `setIsLoading(false)` after first load
- Quick-add: `[8, 16, 24]` mapped to TouchableOpacity buttons — `impactMedium` haptic fires before DB write, `refreshData` called after
- Silent fail on quick-add error — cup doesn't update, user can retry (per D-04 clean UX)
- "+ Log Water" CTA opens LogWaterModal; `handleModalSaved` calls `refreshData` after save
- Loading state: full-screen `ActivityIndicator` with `colors.accent`
- ScrollView with `paddingBottom: 100` so content clears nav bar

### LogWaterModal.tsx (~153 lines)

Custom water amount modal following AddMealModal pattern:

- Props: `visible`, `onClose`, `onSaved`
- `Modal` with `animationType="slide"`, `transparent`, `onRequestClose={handleClose}`
- `KeyboardAvoidingView behavior="padding"` wrapping content
- `Pressable` overlay (`rgba(0,0,0,0.6)`) for backdrop dismiss
- Bottom sheet: `borderTopLeftRadius: 20`, `borderTopRightRadius: 20`, `colors.surface`
- TextInput: `keyboardType="decimal-pad"`, `autoFocus`, `accessibilityLabel="Water amount in fl oz"`
- Validation: `parseFloat > 0`, NaN rejected — inline error "Please enter a valid amount"
- `Math.round(parsed)` before `hydrationDb.logWater` — T-35-03 mitigation
- DB failure: inline "Could not save — please try again" (no stack trace per T-35-05)
- Discard button closes modal; `handleClose` resets all state

### ProteinScreen.tsx (updated, 40 lines)

- Added: `import { HydrationView } from '../components/HydrationView'`
- Replaced Plan 01 placeholder `<View>` with `<HydrationView />`
- Removed: `placeholder` and `placeholderText` styles
- No functional changes to Macros tab behavior

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None — all hydration functionality is fully wired. `goalOz` defaults to 64 when `water_settings` has no row (D-09 design decision, intentional for Phase 35; Phase 36 will add goal-setting UI).

## Threat Flags

None — no new network endpoints, auth paths, file access, or schema changes. All user input goes through `parseFloat > 0` validation + `Math.round` before DB write (T-35-03 mitigated). Error messages are generic (T-35-05 accepted).

## Self-Check: PASSED

- [x] src/components/WaterCup.tsx exists — FOUND
- [x] src/components/HydrationView.tsx exists — FOUND
- [x] src/screens/LogWaterModal.tsx exists — FOUND
- [x] src/screens/ProteinScreen.tsx modified (HydrationView imported, placeholder removed) — FOUND
- [x] Commit 0ded4cc exists — FOUND
- [x] Commit 7f540df exists — FOUND
- [x] TypeScript: no new errors in WaterCup.tsx, HydrationView.tsx, LogWaterModal.tsx, ProteinScreen.tsx — CONFIRMED
