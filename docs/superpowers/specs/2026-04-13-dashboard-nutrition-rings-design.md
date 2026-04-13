# Dashboard Nutrition Rings — Design Spec

**Date:** 2026-04-13
**Status:** Approved

## Overview

Add a "Today's Nutrition" card to the Dashboard screen, positioned directly below the existing "This Week" `WeeklySnapshotCard`. The card displays 4 circular progress rings showing today's progress toward daily goals for Protein, Carbs, Fat, and Hydration.

## Layout

- **New component:** `NutritionRingsCard`
- **Placement:** Below `WeeklySnapshotCard` in `DashboardScreen.tsx`
- **Card styling:** `colors.surface` background, `borderRadius: 14`, 1px `colors.border` edge, `marginHorizontal: spacing.base`, `marginBottom: spacing.md`, `padding: spacing.base`
- **Header:** "TODAY'S NUTRITION" — ALL-CAPS, `colors.secondary`, `fontSize.sm`, `fontWeight: weightBold`, `letterSpacing: 1.2`

### Ring Row

Single horizontal row (`flexDirection: 'row'`, `justifyContent: 'space-around'`) containing 4 ring columns, each centered:

1. **SVG circular ring** (~62px diameter)
   - Background track: `#33373D`, 5px stroke
   - Progress stroke: colored per-macro (see Color Mapping), 5px stroke, `strokeLinecap: 'round'`
   - Stroke is drawn clockwise from 12 o'clock (`rotate(-90)` transform)
   - Percentage text centered inside ring: white, bold, ~14px
2. **Label** below ring: macro name, `colors.primary`, 11px, `fontWeight: '600'`
3. **Sub-label** below label: "105/150g" or "64/80 oz", `colors.secondary`, 10px

### Color Mapping

| Ring     | Stroke Color              | Token/Hex   |
|----------|---------------------------|-------------|
| Protein  | Mint green                | `colors.accent` (#8DC28A) |
| Carbs    | Gold                      | `#F0B830`   |
| Fat      | Coral                     | `#E8845C`   |
| Water    | Ocean blue                | `colors.water` (#4A8DB7) |

## Data Sources

All data comes from existing database functions — no new DB code required.

| Data Point        | Function                  | Module              |
|-------------------|---------------------------|---------------------|
| Today's macros    | `getTodayMacroTotals()`   | `src/db/macros.ts`  |
| Macro goals       | `getMacroSettings()`      | `src/db/macros.ts`  |
| Today's water     | `getTodayTotal()`         | `src/db/hydration.ts` |
| Water goal        | `getWaterSettings()`      | `src/db/hydration.ts` |

### Percentage Calculation

```
percentage = Math.min(100, Math.round((current / goal) * 100))
```

Capped at 100% so the ring never overflows visually. The gram/oz sub-label still shows the real values (e.g. "180/150g" when exceeded).

## Interactions

### Tap Behavior

Each circle is independently tappable via `TouchableOpacity`:

- **Protein, Carbs, Fat** → Navigate to Health tab, Macros sub-tab
- **Water** → Navigate to Health tab, Hydration sub-tab

### No-Goal State

When a goal has not been set for a given macro or hydration:

- Ring shows 0% fill (empty track only)
- Percentage shows "0%"
- Sub-label shows **"Set goal"** in `colors.accent` instead of gram count
- Tap navigates to the appropriate Health tab where the user can configure the goal

## Animation

- On mount and on focus (via `useFocusEffect`), each ring animates from 0% to its current percentage
- **Timing:** ~600ms ease-out duration per ring
- **Stagger:** Each ring starts 50ms after the previous (Protein → Carbs → Fat → Water)
- Uses React Native `Animated` API to interpolate `strokeDashoffset`

## Data Refresh

Uses `useFocusEffect` (same pattern as `WeeklySnapshotCard`):
- Re-fetches macro totals, macro settings, water total, and water settings every time the Dashboard tab gains focus
- Logging a meal or water on the Health tab and switching back shows updated rings immediately

## Edge Cases

| Scenario | Behavior |
|----------|----------|
| All goals unset | 4 empty rings, all showing "Set goal" — acts as onboarding prompt |
| Meals logged, no goal set | 0% ring, "Set goal" sub-label (no denominator for %) |
| Goal exceeded (e.g. 180/150g) | Ring capped at 100%, sub-label shows real "180/150g" |
| No meals logged today | All macro rings at 0%, sub-labels show "0/150g" etc. |
| Mixed state (some goals set) | Each ring is independent — set goals show progress, unset show "Set goal" |

## Out of Scope

- No calorie ring — only Protein, Carbs, Fat, Hydration
- No streak indicators on the dashboard (remain on Health tab)
- No weekly/historical data — purely today's snapshot
- No new database tables or migrations
