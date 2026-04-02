---
phase: 31-goal-setting-progress-charts
plan: 02
subsystem: ui-components
tags: [macros, chart, protein-screen, react-native, v1.7]
requirements: [CHART-01, CHART-02, CHART-03]
dependency_graph:
  requires:
    - 31-01 (MacroProgressCard, MacroGoalSetupForm components)
    - 30-db-foundation/30-02 (macrosDb namespace — getDailyMacroTotals, getMacroGoals, getTodayMacroTotals, get7DayAverage, getStreakDays)
    - src/types/index.ts (MacroType, MACRO_COLORS, MacroChartPoint, MacroSettings)
  provides:
    - src/components/MacroChart.tsx (exported: MacroChart)
    - src/screens/ProteinScreen.tsx (updated: uses all Phase 31 components)
  affects:
    - ProteinScreen renders MacroProgressCard + StreakAverageRow + MacroChart instead of old protein components
tech_stack:
  added: []
  patterns:
    - Instant tab switch with no re-fetch: MacroChartPoint has all three macro values; tab state is local
    - Dynamic chart color: MACRO_COLORS[activeTab] passed as () => string to chartConfig.color and dataset color
    - Conditional goal dataset: goal dataset entry omitted entirely from datasets array when goal is null
    - useFocusEffect + useCallback for chart data fetching (same pattern as ProteinChart)
    - useMemo for chartData depending on [data, activeTab, activeGoal]
key_files:
  created:
    - src/components/MacroChart.tsx
  modified:
    - src/screens/ProteinScreen.tsx
key_decisions:
  - MacroChart position moved to after meal list (per UI-SPEC layout — MacroProgressCard is primary anchor above the fold)
  - StreakAverageRow added to ProteinScreen (was not previously rendered; now placed below MacroProgressCard per UI-SPEC)
  - TAB_BG map defined as file-level const for clarity on tab background colors
  - chartData useMemo depends on activeGoal (derived from goals prop) to re-compute when tab changes
metrics:
  duration_seconds: 420
  completed_date: "2026-04-02"
  tasks_completed: 2
  files_changed: 2
---

# Phase 31 Plan 02: MacroChart and ProteinScreen Wiring Summary

**One-liner:** MacroChart with three-tab macro selector (instant switch, no re-fetch), per-macro colored line chart, and conditional goal reference line — wired into ProteinScreen replacing all old protein-only components.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Create MacroChart component | e35e106 | src/components/MacroChart.tsx |
| 2 | Wire new components into ProteinScreen | 6027f80 | src/screens/ProteinScreen.tsx |

## What Was Built

### MacroChart (`src/components/MacroChart.tsx`)

A line chart with three-tab macro selector above and time range pills below, replacing `ProteinChart.tsx`.

- **Tab selector row (above chart card):** Three tabs — Protein, Carbs, Fat. Each uses `MACRO_COLORS[tab]` at 15% opacity background (`TAB_BG` map) and 1px border when active. Inactive tabs are transparent with `colors.secondary` text. Tab switch is instant — no re-fetch.
- **Chart card:** `backgroundColor: colors.surface`, `borderRadius: 14`, `borderWidth: 1`, `borderColor: colors.border`
- **Legend row (inside card):** Colored 16x2px intake line in `MACRO_COLORS[activeTab]` + "DAILY INTAKE". Goal legend `{value}g GOAL` shown only when active macro's goal is non-NULL.
- **LineChart:** `bezier`, height 180, `yAxisSuffix: "g"`, dynamic `color: () => MACRO_COLORS[activeTab]`. Goal dataset included in `datasets` array only when goal is non-null.
- **Empty state:** "No data yet" centered in 180px container.
- **Filter pills (below card):** 1W/1M/3M/All — same pattern as ProteinChart. Active pill uses `colors.accent` background.
- **Data fetching:** `useFocusEffect` + `useCallback` calling `macrosDb.getDailyMacroTotals(startDate, endDate)`. Re-fetches on `[selectedRange, refreshKey]` dependency change.
- Uses only `weightBold` and `weightRegular` from typography (per UI-SPEC constraint).

### ProteinScreen (`src/screens/ProteinScreen.tsx`) — Component Swaps

Three old protein-only components replaced with new macro-aware components:

| Old | New | Notes |
|-----|-----|-------|
| `GoalSetupForm` | `MacroGoalSetupForm` | Shown when `goals === null` |
| `ProteinProgressBar` | `MacroProgressCard` | 3 macro bars + calorie header |
| `ProteinChart` | `MacroChart` | Tabbed chart; moved after LOGS section per UI-SPEC |

**Added:**
- `StreakAverageRow` after `MacroProgressCard` (was not rendered before; added per UI-SPEC)
- `streak: number` state (from `macrosDb.getStreakDays()`)
- `todayTotals: MacroValues` state (from `macrosDb.getTodayMacroTotals()`)
- `goals: MacroSettings | null` replaces `goal: number | null`

**Data fetching updated:**
- `getProteinGoal()` → `macrosDb.getMacroGoals()`
- `getTodayProteinTotal()` → `macrosDb.getTodayMacroTotals()`
- `get7DayAverage()` → `macrosDb.get7DayAverage()` (`.protein` extracted for StreakAverageRow — protein-only per D-14)
- Added `macrosDb.getStreakDays()` for streak state

**Kept unchanged (Phase 32 scope):**
- `getMealsByDate`, `deleteMeal`, `addMeal`, `getRecentDistinctMeals` from `protein.ts` barrel
- `QuickAddButtons`, `MealListItem` components and their handlers

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None. All components are fully wired to macrosDb with real DB calls.

## Self-Check: PASSED

- [x] src/components/MacroChart.tsx exists
- [x] src/screens/ProteinScreen.tsx updated
- [x] Commit e35e106 exists
- [x] Commit 6027f80 exists
