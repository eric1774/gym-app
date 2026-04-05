---
phase: 35-tab-bar-hydration-core
plan: 01
subsystem: nutrition-ui
tags: [tab-bar, macros-view, refactor, react-native]
dependency_graph:
  requires: []
  provides: [TabBar, MacrosView]
  affects: [ProteinScreen]
tech_stack:
  added: []
  patterns: [underline-tab-bar, thin-shell-parent, conditional-tab-rendering]
key_files:
  created:
    - src/components/TabBar.tsx
    - src/components/MacrosView.tsx
  modified:
    - src/screens/ProteinScreen.tsx
decisions:
  - "TabBar uses underline View (height 2, colors.accent) inside each tab item rather than borderBottomWidth on the tab item — cleaner layout control"
  - "MacrosView container uses flex: 1 + colors.background so loading/goal-setup states render correctly without safe area padding (parent handles insets)"
  - "ProteinScreen TABS constant defined at module level as ['Macros', 'Hydration'] — consistent with plan spec"
metrics:
  duration: "3 minutes"
  completed_date: "2026-04-04"
  tasks_completed: 2
  files_changed: 3
---

# Phase 35 Plan 01: Tab Bar & MacrosView Extraction Summary

**One-liner:** Underline TabBar component and verbatim MacrosView extraction from ProteinScreen — ProteinScreen reduced to 43-line thin shell with Nutrition header and conditional tab rendering.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Create TabBar component | a574b1b | src/components/TabBar.tsx (new, 74 lines) |
| 2 | Extract MacrosView and refactor ProteinScreen | 373522c | src/components/MacrosView.tsx (new, 382 lines), src/screens/ProteinScreen.tsx (modified, 43 lines) |

## What Was Built

### TabBar.tsx (~74 lines)

Reusable underline-style tab bar component implementing the UI-SPEC:

- Props: `tabs: string[]`, `activeIndex: number`, `onTabPress: (index: number) => void`
- Container: full-width `flexDirection: 'row'` with 1px `colors.border` separator at bottom
- Each tab: `TouchableOpacity` with `flex: 1`, `minHeight: 44` (touch target), `activeOpacity: 0.7`
- Active label: `colors.primary`, inactive: `colors.secondary` — both `fontSize.sm`, `weightBold`, uppercased
- Active underline: 2px height `View` with `colors.accent` background; inactive: transparent
- Accessibility: `accessibilityRole="tab"`, `accessibilityState={{ selected: isActive }}` per UI-SPEC
- No `Animated` import — instant re-render per D-04

### MacrosView.tsx (~382 lines)

Verbatim extraction of all state, callbacks, hooks, and JSX from ProteinScreen.tsx:

- Single prop: `navigation: NativeStackNavigationProp<ProteinStackParamList>` (for MealLibrary navigation)
- All state preserved: goals, todayTotals, meals, isLoading, modalVisible, editingMeal, average, streak, toastMessage, refreshing, chartRefreshKey, selectedDate
- All callbacks preserved: refreshData, handleRefresh, handlePrevDay, handleNextDay, handleAddMeal, handleEdit, handleDelete, handleMealSaved, handleCloseModal
- `useFocusEffect` hook for data loading on screen focus — preserved exactly
- Loading state: full-screen `ActivityIndicator` with `colors.accent`
- Goal-setup state: renders `MacroGoalSetupForm` without header (parent handles header)
- Main render: ScrollView with MacroProgressCard, StreakAverageRow, Meal Library button, logs section with date nav, MacroChart
- FAB: absolute positioned inside MacrosView per D-16 (invisible when Hydration tab active by unmounting)
- Toast message overlay preserved
- AddMealModal preserved
- `useSafeAreaInsets` removed — parent ProteinScreen owns safe area padding

### ProteinScreen.tsx (~43 lines)

Thin shell pattern per D-14:

- Header: "Nutrition" title (changed from "Macros" per D-03)
- Safe area: `useSafeAreaInsets` with `paddingTop: insets.top` on outer container
- Tab bar: `<TabBar tabs={TABS} activeIndex={activeTab} onTabPress={setActiveTab} />`
- Default tab: `useState(0)` — Macros is default per TAB-01
- Conditional rendering: `activeTab === 0 ? <MacrosView navigation={navigation} /> : <View placeholder />`
- Placeholder for Hydration tab: will be replaced by `<HydrationView />` in Plan 02
- No DB logic, no ScrollView, no macrosDb import

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

- ProteinScreen.tsx line 28-31: Hydration tab placeholder `<View>` with text "Hydration coming in Plan 02" — intentional per plan spec. Plan 02 will replace with `<HydrationView />`.

## Threat Flags

None — no new network endpoints, auth paths, or schema changes introduced. Tab switching is purely client-side state (activeIndex 0 or 1), consistent with T-35-01 acceptance from threat model.

## Self-Check: PASSED

- [x] src/components/TabBar.tsx exists — FOUND
- [x] src/components/MacrosView.tsx exists — FOUND  
- [x] src/screens/ProteinScreen.tsx modified — FOUND
- [x] Commit a574b1b exists — FOUND
- [x] Commit 373522c exists — FOUND
- [x] TypeScript: no new errors in TabBar.tsx, MacrosView.tsx, ProteinScreen.tsx
