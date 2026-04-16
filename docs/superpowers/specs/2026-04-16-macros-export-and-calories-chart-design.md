# Macros Export + Calories Chart Tab — Design Spec

**Date:** 2026-04-16
**Status:** Approved

## Overview

Two additions to the Macros page (`MacrosView.tsx` → `MacroChart.tsx`):

1. **Calories tab** — fourth tab to the right of Fat in the *MACRO INTAKE HISTORY* card. Renders daily calories on the same `LineChart` infrastructure already used for Protein, Carbs, and Fat, with a derived goal line.
2. **Export Macros button + modal + JSON file** — small "Export" pill inline with the chart's section header. Opens a modal with two date pickers; on confirmation, writes a JSON file to a user-chosen location via the existing `FileSaver` native module.

Both features are additive and isolated. No schema migration. One new dependency: `@react-native-community/datetimepicker`.

## Decisions

| ID    | Decision                                                             | Rationale                                                                                                            |
| ----- | -------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| D-01  | Export button placement: inline pill with chart section header       | Contextual to the chart data, low visual weight, doesn't compete with primary CTAs.                                  |
| D-02  | Date range: prompt at export time                                    | Maximum flexibility; export usage is intentional, not frequent, so the extra modal step is acceptable.               |
| D-03  | Date picker UX: two date fields, no presets                          | Cleanest expression of intent ("pick start, pick end"). Mirrors typical Android date-picker patterns.                |
| D-04  | Date picker library: `@react-native-community/datetimepicker`        | Standard, native, maintained by RN core team. ~200 KB.                                                               |
| D-05  | JSON shape: wrapped object with metadata                             | Self-describing. Useful if file is shared, archived, or re-imported later. Includes `goals` snapshot at export time. |
| D-06  | Calories tab: shown with derived goal line                           | Maintains visual consistency with the other three tabs. No schema change required.                                   |
| D-07  | Calories goal: derived as `4·proteinGoal + 4·carbsGoal + 9·fatGoal`  | Avoids storing a redundant value. Hidden when any macro goal is unset (avoids misleading partial calculations).      |
| D-08  | Calories tab color: gold `#F0C75B`                                   | Distinct from the three macro colors (green/blue/orange). Reads as "energy."                                         |
| D-09  | Calories chart Y-axis suffix: empty string                           | Matches the `2,020 cal` rendering already used in `MacroProgressCard.tsx`. No need to repeat "cal" on every tick.    |
| D-10  | Days with no meals in range: omitted from `days` array               | Matches the existing `getDailyMacroTotals` SQL behavior (`GROUP BY local_date`). Honest about what data exists.      |
| D-11  | Empty range exports successfully with `"days": []`                   | Honor the user's request literally; don't second-guess.                                                              |
| D-12  | Default modal range: last 30 days                                    | Sensible starting point — captures recent history without overwhelming.                                              |
| D-13  | Save-cancel handling: silent (modal stays open)                      | Matches the existing `SettingsScreen.handleExport` pattern.                                                          |
| D-14  | Tab type widening: introduce `ChartTab = MacroType \| 'calories'`    | Keeps `MacroType` honest — calories is not a macro, it's derived. Localized to chart code.                           |

## TypeScript Types

Additions to `src/types/index.ts`:

```typescript
/** Tab identifier in the macro intake history chart. Wider than MacroType
 *  because calories is a derived series, not a stored macro. */
export type ChartTab = MacroType | 'calories';

/** Color used to render the Calories series and tab. Distinct from MACRO_COLORS. */
export const CALORIES_COLOR = '#F0C75B';

/** Snapshot of goals at export time. Individual fields nullable to mirror
 *  the partially-set state allowed by MacroSettings.
 *  `calories` is null whenever any of protein/carbs/fat goal is null. */
export interface MacroGoalsSnapshot {
  protein: number | null;
  carbs: number | null;
  fat: number | null;
  calories: number | null;
}

/** The full export envelope written to disk. */
export interface MacrosExport {
  exportedAt: string;          // ISO 8601 UTC timestamp
  appVersion: string;          // from package.json
  range: { start: string; end: string };  // YYYY-MM-DD, inclusive
  goals: MacroGoalsSnapshot | null;       // null if no goals are set at all
  days: MacroChartPoint[];                // already includes derived calories
}
```

## Database Layer

Add to `src/db/macros.ts`:

```typescript
/**
 * Build the macros-export payload for a date range.
 * Reuses getDailyMacroTotals for daily rows and getMacroGoals for the snapshot.
 */
export async function getMacrosExportData(
  startDate: string,
  endDate: string,
): Promise<MacrosExport> {
  const [days, settings] = await Promise.all([
    getDailyMacroTotals(startDate, endDate),
    getMacroGoals(),
  ]);

  let goals: MacroGoalsSnapshot | null = null;
  if (settings !== null) {
    const allSet =
      settings.proteinGoal !== null &&
      settings.carbGoal !== null &&
      settings.fatGoal !== null;
    goals = {
      protein: settings.proteinGoal,
      carbs: settings.carbGoal,
      fat: settings.fatGoal,
      calories: allSet
        ? settings.proteinGoal! * CALORIES_PER_GRAM.protein +
          settings.carbGoal!   * CALORIES_PER_GRAM.carbs +
          settings.fatGoal!    * CALORIES_PER_GRAM.fat
        : null,
    };
  }

  return {
    exportedAt: new Date().toISOString(),
    appVersion: getAppVersion(),
    range: { start: startDate, end: endDate },
    goals,
    days,
  };
}
```

`getAppVersion()` reads `version` from `package.json`. Implementation note: import the JSON directly (`import pkg from '../../package.json'`) — the value is baked in at bundle time.

## UI Components

### `MacroChart.tsx` — modify

**Tab list:** widen to four entries.

```typescript
const TABS: { id: ChartTab; label: string }[] = [
  { id: 'protein',  label: 'Protein' },
  { id: 'carbs',    label: 'Carbs' },
  { id: 'fat',      label: 'Fat' },
  { id: 'calories', label: 'Calories' },
];
```

**Color resolution:** small helper that returns `MACRO_COLORS[tab]` for macros, `CALORIES_COLOR` for calories. Used wherever `MACRO_COLORS[activeTab]` is referenced today.

**Tab background:** add `'calories': 'rgba(240,199,91,0.15)'` to the `TAB_BG` map.

**Goal resolution:** extend `getGoalForMacro` (rename to `getGoalForTab(goals, tab)`) to handle the calories case:
- For `'protein' | 'carbs' | 'fat'`: existing logic.
- For `'calories'`: return derived goal if all three macro goals are set, else `null`.

**Y-axis suffix:** branch in the `LineChart` props — `'g'` for macros, `''` for calories.

**Export pill:** add to the right side of the section header row.

```tsx
<View style={styles.headerRow}>
  <Text style={styles.sectionHeader}>MACRO INTAKE HISTORY</Text>
  <TouchableOpacity
    style={styles.exportPill}
    onPress={() => setExportModalVisible(true)}
    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
    <Text style={styles.exportPillText}>↓ EXPORT</Text>
  </TouchableOpacity>
</View>
```

**State:** new `[exportModalVisible, setExportModalVisible]`. Pass `onClose` to dismiss.

### `ExportMacrosModal.tsx` — new

Standalone component co-located with `MacroChart.tsx`.

**Props:**
```typescript
interface ExportMacrosModalProps {
  visible: boolean;
  onClose: () => void;
}
```

**Internal state:**
- `fromDate: Date` — defaults to today minus 30 days
- `toDate: Date` — defaults to today
- `showFromPicker: boolean`, `showToPicker: boolean`
- `submitting: boolean`

**Layout:**
- Modal title: "Export Macros"
- Subtitle: "Choose a date range"
- Two date fields stacked horizontally — each is a `TouchableOpacity` showing the formatted date; tapping opens `<DateTimePicker>` for that field.
- Inline error region (only rendered if `fromDate > toDate`): "End date must be on or after start date."
- Action row: Cancel | Export JSON
- Export button shows `ActivityIndicator` while `submitting === true` and is disabled when validation fails.

**Date formatting:** `Mar 17, 2026` for display; `YYYY-MM-DD` (via `getLocalDateString`) for the export payload and filename.

**Submit handler:**
```typescript
async function handleExport() {
  setSubmitting(true);
  try {
    const start = getLocalDateString(fromDate);
    const end = getLocalDateString(toDate);
    const data = await macrosDb.getMacrosExportData(start, end);
    const json = JSON.stringify(data, null, 2);
    const filename = `gymtrack-macros-${start}-to-${end}.json`;
    const saved = await saveFileToDevice(json, filename);
    if (saved) {
      onClose();
    }
    // saved === false means user cancelled the SAF dialog — keep modal open
  } catch (e: any) {
    Alert.alert('Export Failed', e?.message ?? 'Could not export macros.');
  } finally {
    setSubmitting(false);
  }
}
```

## Data Flow

### Calories tab
```
useFocusEffect → macrosDb.getDailyMacroTotals(start, end)
  → MacroChartPoint[] (already includes derived calories per row)
  → activeTab === 'calories'
       ? render p.calories series in gold (CALORIES_COLOR)
       : render p[activeTab] series in MACRO_COLORS[activeTab]
  → Goal line:
       activeTab === 'calories' AND all 3 macro goals set
         → derive 4P + 4C + 9F, render dashed reference line
       activeTab is a macro AND that macro's goal set
         → existing logic
       else
         → no goal line
```

### Export flow
```
Tap "↓ EXPORT" pill in chart header
  → ExportMacrosModal opens with [from = today - 30d, to = today]
  → User taps "From" or "To" field → native DatePickerDialog → selects date
  → Validation: from <= to (else inline error, Export button disabled)
  → Tap "Export JSON" → setSubmitting(true)
       → macrosDb.getMacrosExportData(from, to)
       → JSON.stringify(data, null, 2)
       → saveFileToDevice(content, "gymtrack-macros-{from}-to-{to}.json")
       → saved === true  → onClose()
       → saved === false → keep modal open (user dismissed SAF)
       → throw           → Alert("Export Failed", message), modal stays open
       → finally         → setSubmitting(false)
```

## Error Handling

| Scenario                              | Behavior                                                         |
| ------------------------------------- | ---------------------------------------------------------------- |
| `from > to`                           | Inline error under date fields; Export button disabled.          |
| Empty range (`days.length === 0`)     | Export succeeds with `"days": []`. Honor the request literally.  |
| `getMacrosExportData` throws          | `Alert.alert('Export Failed', ...)`; modal stays open.           |
| `saveFileToDevice` throws             | `Alert.alert('Save Failed', ...)`; modal stays open.             |
| `saveFileToDevice` resolves to `false` | Silent (user cancelled the SAF "Save As" dialog). Modal stays open. |
| User backs out of modal               | `onClose()`; no side effects.                                    |

No goal-line rendering for calories when any macro goal is unset — never show a partial / misleading line.

## Testing

### `src/db/__tests__/macros.test.ts` — extend
- `getMacrosExportData` returns wrapped envelope with all top-level keys.
- Empty range → `days: []`.
- All three macro goals set → `goals.calories === 4·P + 4·C + 9·F`.
- One macro goal unset → `goals.calories === null`; other macro goal fields preserved.
- Settings row missing entirely → `goals === null`.
- `range.start` / `range.end` echo the input parameters.
- `exportedAt` parses as a valid ISO 8601 timestamp.
- `appVersion` matches `package.json` version.

### `src/components/__tests__/MacroChart.test.tsx` — extend or create
- Renders 4 tab buttons in order: Protein, Carbs, Fat, Calories.
- Tapping the Calories tab marks it active and switches the chart series to calories.
- Calories goal line rendered when all three macro goals are set.
- Calories goal line hidden when any of protein/carbs/fat goal is null.
- Y-axis suffix is `'g'` on macro tabs and `''` on the calories tab.
- Export pill is rendered in the section header and toggles `ExportMacrosModal` visibility.

### `src/components/__tests__/ExportMacrosModal.test.tsx` — new
- Mounts with default range = last 30 days through today.
- Tapping each date field opens the corresponding `DateTimePicker`.
- `from > to` displays the inline error and disables the Export button.
- Tapping Export calls `getMacrosExportData(start, end)` then `saveFileToDevice` with the right filename.
- Successful save calls `onClose`; cancelled save keeps the modal open.
- DB and save errors surface via `Alert.alert`.

## Files Touched

**Modified:**
- `src/types/index.ts` — `ChartTab`, `CALORIES_COLOR`, `MacroGoalsSnapshot`, `MacrosExport`.
- `src/db/macros.ts` — `getMacrosExportData`, `getAppVersion`.
- `src/components/MacroChart.tsx` — fourth tab, color/goal/y-axis branching, export pill, modal mounting.
- `src/db/__tests__/macros.test.ts` — `getMacrosExportData` cases.
- `src/components/__tests__/MacroChart.test.tsx` — extended (or created).
- `package.json` — `@react-native-community/datetimepicker` dependency.

**New:**
- `src/components/ExportMacrosModal.tsx` — date-range modal + export pipeline.
- `src/components/__tests__/ExportMacrosModal.test.tsx` — modal tests.

## Out of Scope

- A standalone calorie goal stored in `macro_settings`. Calories goal stays derived.
- CSV export, sharing via Android intent, or cloud sync. JSON-to-disk only.
- Importing the exported JSON back into the app.
- Per-meal export (the export is daily totals only, per the user's request).
- Adding the export to `SettingsScreen` — the entry point is the Macros page only.
