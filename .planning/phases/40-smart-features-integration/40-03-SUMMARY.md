---
phase: 40-smart-features-integration
plan: "03"
subsystem: meal-builder
tags: [meal-builder, library, save-to-library, navigation, ui]
dependency_graph:
  requires: ["40-02"]
  provides: ["AddLibraryMealModal.onBuildMeal", "MealBuilderScreen.saveToLibrary", "library-mode-save"]
  affects: ["AddLibraryMealModal", "MealLibraryScreen", "MealBuilderScreen"]
tech_stack:
  added: []
  patterns: ["callback prop for cross-modal navigation", "NativeStackNavigationProp typed useNavigation", "mode-gated toggle with disabled+opacity pattern"]
key_files:
  created: []
  modified:
    - src/screens/AddLibraryMealModal.tsx
    - src/screens/MealLibraryScreen.tsx
    - src/screens/MealBuilderScreen.tsx
decisions:
  - "onBuildMeal callback prop pattern (same as AddMealModal D-13) — avoids useNavigation in modal, keeps modal testable"
  - "NativeStackNavigationProp<ProteinStackParamList, MealLibrary> typed useNavigation in MealLibraryScreen — eliminates ts-ignore and gives full type safety"
  - "saveToLibrary state initialized from mode===library — pre-checks toggle without extra effect; library mode locks toggle with disabled+opacity 0.5"
  - "Macro sums computed inline in handleLogMeal from mealFoodInputs — avoids re-using totalProtein/Carbs/Fat memos which may have rounding, ensures library entry matches exact food composition"
metrics:
  duration_minutes: 25
  completed_date: "2026-04-09"
  tasks_completed: 2
  tasks_total: 2
  files_modified: 3
---

# Phase 40 Plan 03: Library Integration and Save-to-Library Toggle Summary

**One-liner:** BUILD MEAL button in AddLibraryMealModal routes to builder in library mode; save-to-library Switch in builder footer enables dual-save in normal mode and library-only save in library mode.

## What Was Built

### Task 1: Full library integration across four files

**AddLibraryMealModal.tsx** — Added `onBuildMeal?: () => void` to `AddLibraryMealModalProps`. When provided, renders a "BUILD MEAL" `TouchableOpacity` between the title and the manual entry form. Button calls `handleClose()` then `onBuildMeal()` — ensures modal state is reset before navigation. Styled identically to the AddMealModal BUILD MEAL button: `colors.accent` background, `colors.onAccent` text, `borderRadius: 12`, `minHeight: 48`. Manual entry form (protein/carbs/fat fields, name, submit handler, validation) is completely untouched — the new button is purely additive.

**MealLibraryScreen.tsx** — Added `NativeStackNavigationProp<ProteinStackParamList, 'MealLibrary'>` typed `useNavigation` hook (previously untyped). Passes `onBuildMeal` callback to `AddLibraryMealModal` that sets `modalVisible(false)` then calls `navigation.navigate('MealBuilder', { mode: 'library' })`. The `useFocusEffect` already present ensures MealLibraryScreen auto-refreshes when returning from the builder, so newly saved library meals appear immediately.

**MealBuilderScreen.tsx** — Three additions:

1. **`saveToLibrary` state**: `useState(mode === 'library')` — pre-checked in library mode, unchecked in normal mode. Not declared in edit mode either, but the toggle is hidden so initial value is irrelevant.

2. **Save-to-library Switch row**: Rendered above `MealTotalsBar` when `mode !== 'edit'`. Row uses `flexDirection: 'row'`, `paddingHorizontal: spacing.base`, `paddingVertical: spacing.md`, `backgroundColor: colors.surface`. Switch uses `trackColor={{ false: colors.surfaceElevated, true: colors.accentDim }}`, `thumbColor={saveToLibrary ? colors.accent : colors.secondary}`. When `mode === 'library'`, Switch is `disabled` with `opacity: 0.5` applied via `saveToLibrarySwitchLocked` style — communicates locked state without removing the visual.

3. **`handleLogMeal` library paths**: Computes `totalProteinSum/CarbsSum/FatSum` inline from `mealFoodInputs`. Three branches: edit → `updateMealWithFoods`; library → `macrosDb.addLibraryMeal` only (no daily log, per D-15, T-40-07); normal → `addMealWithFoods` + conditional `macrosDb.addLibraryMeal` when `saveToLibrary` is true. Error message updated to match UI-SPEC copywriting contract ("Couldn't save meal. Try again.").

**MealTotalsBar.tsx** — No changes required; `ctaLabel?: string` prop was already added in Plan 02.

### Task 2: Human verification checkpoint (auto-approved in auto mode)

All Phase 40 features compiled cleanly. TypeScript check confirmed zero errors in modified source files.

## Commits

| Hash | Message |
|------|---------|
| `f2d2d14` | feat(40-03): library mode BUILD MEAL button, save-to-library toggle, library save path |

## Deviations from Plan

None — plan executed exactly as written. MealTotalsBar `ctaLabel` prop was confirmed already present from Plan 02, so no duplicate changes were needed.

## Known Stubs

None — all data paths are fully wired. Library mode calls `macrosDb.addLibraryMeal` directly. Normal mode with toggle calls both `foodsDb.addMealWithFoods` and `macrosDb.addLibraryMeal`. The `useFocusEffect` in MealLibraryScreen handles auto-refresh after navigation back from builder.

## Threat Flags

None — threat mitigations applied as specified:
- T-40-07: Macros computed from foods in-process (inline summation in handleLogMeal), not from user-editable input fields. `addLibraryMeal` uses parameterized SQL (existing implementation).
- T-40-09: Library save after daily log uses two independent DB calls. If library save fails after daily log completes, the daily meal is still logged — partial state is acceptable per plan disposition.

## Self-Check: PASSED

- `src/screens/AddLibraryMealModal.tsx` — modified, contains `onBuildMeal?: () => void` prop and BUILD MEAL TouchableOpacity with `colors.accent` background
- `src/screens/MealLibraryScreen.tsx` — modified, contains `NativeStackNavigationProp<ProteinStackParamList, 'MealLibrary'>` typed navigation and `onBuildMeal` callback passing `{ mode: 'library' }`
- `src/screens/MealBuilderScreen.tsx` — modified, contains `Switch` import, `macrosDb` import, `saveToLibrary` state, save-to-library row with Switch, library/normal/edit branches in handleLogMeal
- Commit `f2d2d14` exists in git log
- TypeScript: zero errors in modified source files (`npx tsc --noEmit` clean for src/screens/ modified files)
