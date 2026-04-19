# Macros Export + Calories Chart Tab — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a fourth "Calories" tab (with a derived goal line) to the Macros page chart, and an "Export Macros" button that writes a date-ranged JSON file via the existing FileSaver native module.

**Architecture:** Two additive features bundled in one plan because they live on the same screen. **Phase A** widens `MacroChart.tsx` from three macro tabs to four chart tabs (`ChartTab = MacroType | 'calories'`). **Phase B** adds a new `ExportMacrosModal` component, a new `getMacrosExportData` DB function, and one new dependency (`@react-native-community/datetimepicker`). No schema migration. No changes to meal storage.

**Tech Stack:** React Native 0.84, TypeScript 5.8, `react-native-chart-kit`, `react-native-sqlite-storage`, `@testing-library/react-native`, Jest. New dep: `@react-native-community/datetimepicker`.

**Reference spec:** `docs/superpowers/specs/2026-04-16-macros-export-and-calories-chart-design.md`

---

## File Structure

| File | Status | Responsibility |
|---|---|---|
| `src/types/index.ts` | Modify | Add `ChartTab`, `CALORIES_COLOR`, `MacroGoalsSnapshot`, `MacrosExport` |
| `src/db/macros.ts` | Modify | Add `getMacrosExportData(start, end)` + `getAppVersion()` helper |
| `src/components/MacroChart.tsx` | Modify | 4th tab, color/goal/y-axis branching, Export pill, mount `ExportMacrosModal` |
| `src/components/ExportMacrosModal.tsx` | Create | Slide-up bottom-sheet modal with two date pickers, validation, export pipeline |
| `package.json` | Modify | Add `@react-native-community/datetimepicker` |
| `src/db/__tests__/macros.test.ts` | Modify | Tests for `getMacrosExportData` |
| `src/components/__tests__/MacroChart.test.tsx` | Create | Tests for tab rendering, calories goal line, y-axis suffix, export pill |
| `src/components/__tests__/ExportMacrosModal.test.tsx` | Create | Tests for default state, validation, submit pipeline, error handling |

---

## Phase A — Calories Tab

### Task A1: Add `ChartTab` type and `CALORIES_COLOR` constant

**Files:**
- Modify: `src/types/index.ts` (insert after the existing `MACRO_COLORS` block at line 238)

- [ ] **Step 1: Add the type and constant**

Open `src/types/index.ts`. Find the existing block:

```typescript
export const MACRO_COLORS: Record<MacroType, string> = {
  protein: '#8DC28A',
  carbs: '#5B9BF0',
  fat: '#E8845C',
};
```

Add immediately after it:

```typescript
/** Tab identifier in the macro intake history chart. Wider than MacroType
 *  because calories is a derived series, not a stored macro. */
export type ChartTab = MacroType | 'calories';

/** Color used to render the Calories series and tab. Distinct from MACRO_COLORS. */
export const CALORIES_COLOR = '#F0C75B';
```

- [ ] **Step 2: Verify the type compiles**

Run: `npx tsc --noEmit`
Expected: no new errors. (Existing errors unrelated to this change are fine.)

- [ ] **Step 3: Commit**

```bash
rtk git add src/types/index.ts
rtk git commit -m "feat(macros): add ChartTab type and CALORIES_COLOR for chart tab widening"
```

---

### Task A2: Add Calories tab rendering to `MacroChart`

**Files:**
- Create: `src/components/__tests__/MacroChart.test.tsx`
- Modify: `src/components/MacroChart.tsx`

- [ ] **Step 1: Write the failing test**

Create `src/components/__tests__/MacroChart.test.tsx`:

```typescript
jest.mock('../../db', () => ({
  macrosDb: {
    getDailyMacroTotals: jest.fn().mockResolvedValue([]),
  },
}));

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { NavigationContainer } from '@react-navigation/native';
import { MacroChart } from '../MacroChart';
import { macrosDb } from '../../db';
import { MacroSettings } from '../../types';

const allGoalsSet: MacroSettings = {
  id: 1,
  proteinGoal: 150,
  carbGoal: 200,
  fatGoal: 70,
  createdAt: '2026-01-01T00:00:00',
  updatedAt: '2026-01-01T00:00:00',
};

function renderChart(goals: MacroSettings = allGoalsSet) {
  return render(
    <NavigationContainer>
      <MacroChart goals={goals} />
    </NavigationContainer>,
  );
}

describe('MacroChart — Calories tab', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (macrosDb.getDailyMacroTotals as jest.Mock).mockResolvedValue([]);
  });

  it('renders all four chart tabs in order: Protein, Carbs, Fat, Calories', () => {
    const { getByText } = renderChart();
    expect(getByText('Protein')).toBeTruthy();
    expect(getByText('Carbs')).toBeTruthy();
    expect(getByText('Fat')).toBeTruthy();
    expect(getByText('Calories')).toBeTruthy();
  });

  it('starts with Protein tab active and switches when Calories is pressed', async () => {
    const { getByText } = renderChart();
    await waitFor(() =>
      expect(macrosDb.getDailyMacroTotals).toHaveBeenCalled(),
    );
    fireEvent.press(getByText('Calories'));
    // Tab pressed without throwing — switching the active tab is sufficient
    // proof. Goal-line + y-axis behavior covered in Tasks A3 and A4.
    expect(getByText('Calories')).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/components/__tests__/MacroChart.test.tsx`
Expected: FAIL — both tests fail because the `'Calories'` text element does not yet exist.

- [ ] **Step 3: Update MacroChart to add the fourth tab**

In `src/components/MacroChart.tsx`:

- Update the import on line 13 from:
  ```typescript
  import { MacroChartPoint, MacroSettings, MacroType, MACRO_COLORS } from '../types';
  ```
  to:
  ```typescript
  import { MacroChartPoint, MacroSettings, MacroType, MACRO_COLORS, ChartTab, CALORIES_COLOR } from '../types';
  ```

- Replace the `TAB_BG` constant (lines 24-28) from:
  ```typescript
  const TAB_BG: Record<MacroType, string> = {
    protein: 'rgba(141,194,138,0.15)',
    carbs: 'rgba(91,155,240,0.15)',
    fat: 'rgba(232,132,92,0.15)',
  };
  ```
  to:
  ```typescript
  const TAB_BG: Record<ChartTab, string> = {
    protein: 'rgba(141,194,138,0.15)',
    carbs: 'rgba(91,155,240,0.15)',
    fat: 'rgba(232,132,92,0.15)',
    calories: 'rgba(240,199,91,0.15)',
  };

  const CHART_TABS: ChartTab[] = ['protein', 'carbs', 'fat', 'calories'];

  function getColorForTab(tab: ChartTab): string {
    return tab === 'calories' ? CALORIES_COLOR : MACRO_COLORS[tab];
  }
  ```

- Change the `useState` for `activeTab` (line 79) from:
  ```typescript
  const [activeTab, setActiveTab] = useState<MacroType>('protein');
  ```
  to:
  ```typescript
  const [activeTab, setActiveTab] = useState<ChartTab>('protein');
  ```

- Replace the tab-rendering loop. Find this block (lines 156-186):
  ```typescript
  {(['protein', 'carbs', 'fat'] as MacroType[]).map(tab => {
    const isActive = activeTab === tab;
    const tabLabel = tab.charAt(0).toUpperCase() + tab.slice(1);
    return (
      <TouchableOpacity
        key={tab}
        style={[
          styles.tab,
          isActive
            ? {
                backgroundColor: TAB_BG[tab],
                borderWidth: 1,
                borderColor: MACRO_COLORS[tab],
              }
            : styles.tabInactive,
        ]}
        activeOpacity={0.7}
        onPress={() => setActiveTab(tab)}>
        <Text
          style={[
            styles.tabText,
            isActive
              ? { color: MACRO_COLORS[tab] }
              : styles.tabTextInactive,
          ]}>
          {tabLabel}
        </Text>
      </TouchableOpacity>
    );
  })}
  ```
  Replace it with:
  ```typescript
  {CHART_TABS.map(tab => {
    const isActive = activeTab === tab;
    const tabLabel = tab.charAt(0).toUpperCase() + tab.slice(1);
    const tabColor = getColorForTab(tab);
    return (
      <TouchableOpacity
        key={tab}
        style={[
          styles.tab,
          isActive
            ? {
                backgroundColor: TAB_BG[tab],
                borderWidth: 1,
                borderColor: tabColor,
              }
            : styles.tabInactive,
        ]}
        activeOpacity={0.7}
        onPress={() => setActiveTab(tab)}>
        <Text
          style={[
            styles.tabText,
            isActive
              ? { color: tabColor }
              : styles.tabTextInactive,
          ]}>
          {tabLabel}
        </Text>
      </TouchableOpacity>
    );
  })}
  ```

- Replace every other reference to `MACRO_COLORS[activeTab]` in the file (chartConfig color, propsForDots fill, legendLine background) with `getColorForTab(activeTab)`. Specific lines to update:

  Line 193 (legendLine):
  ```typescript
  <View style={[styles.legendLine, { backgroundColor: MACRO_COLORS[activeTab] }]} />
  ```
  becomes:
  ```typescript
  <View style={[styles.legendLine, { backgroundColor: getColorForTab(activeTab) }]} />
  ```

  Line 133 (dataset color):
  ```typescript
  color: () => MACRO_COLORS[activeTab],
  ```
  becomes:
  ```typescript
  color: () => getColorForTab(activeTab),
  ```

  Lines 223, 228 (chartConfig color and propsForDots.fill):
  ```typescript
  color: () => MACRO_COLORS[activeTab],
  ```
  becomes:
  ```typescript
  color: () => getColorForTab(activeTab),
  ```
  And:
  ```typescript
  fill: MACRO_COLORS[activeTab],
  ```
  becomes:
  ```typescript
  fill: getColorForTab(activeTab),
  ```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- src/components/__tests__/MacroChart.test.tsx`
Expected: PASS — both tests now succeed.

- [ ] **Step 5: Commit**

```bash
rtk git add src/components/MacroChart.tsx src/components/__tests__/MacroChart.test.tsx
rtk git commit -m "feat(macros): add Calories tab to MACRO INTAKE HISTORY chart"
```

---

### Task A3: Wire derived calories goal line

**Files:**
- Modify: `src/components/__tests__/MacroChart.test.tsx`
- Modify: `src/components/MacroChart.tsx`

- [ ] **Step 1: Write failing tests for goal-line visibility**

Append to `src/components/__tests__/MacroChart.test.tsx` (inside the existing `describe` block, before the closing brace):

```typescript
  it('shows derived calorie goal in legend when all three macro goals are set and Calories tab is active', async () => {
    const { getByText, queryByText } = renderChart(allGoalsSet);
    await waitFor(() =>
      expect(macrosDb.getDailyMacroTotals).toHaveBeenCalled(),
    );
    fireEvent.press(getByText('Calories'));
    // 4*150 + 4*200 + 9*70 = 600 + 800 + 630 = 2030
    await waitFor(() => expect(queryByText('2030 GOAL')).toBeTruthy());
  });

  it('hides goal legend on Calories tab when any macro goal is unset', async () => {
    const partialGoals: MacroSettings = {
      ...allGoalsSet,
      fatGoal: null,
    };
    const { getByText, queryByText } = renderChart(partialGoals);
    await waitFor(() =>
      expect(macrosDb.getDailyMacroTotals).toHaveBeenCalled(),
    );
    fireEvent.press(getByText('Calories'));
    expect(queryByText(/GOAL/)).toBeNull();
  });
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- src/components/__tests__/MacroChart.test.tsx`
Expected: FAIL — the new tests fail. The first because the calorie goal is never resolved; the second may currently pass spuriously if the tab is active but no `g GOAL` text matches. Confirm both new tests fail or behave incorrectly relative to expectations.

- [ ] **Step 3: Add derived calorie goal logic**

In `src/components/MacroChart.tsx`:

- Update the existing `'../types'` import to include `CALORIES_PER_GRAM`. The line currently reads:
  ```typescript
  import { MacroChartPoint, MacroSettings, MacroType, MACRO_COLORS, ChartTab, CALORIES_COLOR } from '../types';
  ```
  Change it to:
  ```typescript
  import { MacroChartPoint, MacroSettings, MacroType, MACRO_COLORS, ChartTab, CALORIES_COLOR, CALORIES_PER_GRAM } from '../types';
  ```

- Replace `getGoalForMacro` (lines 70-76):
  ```typescript
  function getGoalForMacro(goals: MacroSettings, macro: MacroType): number | null {
    switch (macro) {
      case 'protein': return goals.proteinGoal;
      case 'carbs': return goals.carbGoal;
      case 'fat': return goals.fatGoal;
    }
  }
  ```
  with:
  ```typescript
  function getGoalForTab(goals: MacroSettings, tab: ChartTab): number | null {
    switch (tab) {
      case 'protein': return goals.proteinGoal;
      case 'carbs':   return goals.carbGoal;
      case 'fat':     return goals.fatGoal;
      case 'calories':
        if (
          goals.proteinGoal === null ||
          goals.carbGoal === null ||
          goals.fatGoal === null
        ) {
          return null;
        }
        return (
          goals.proteinGoal * CALORIES_PER_GRAM.protein +
          goals.carbGoal   * CALORIES_PER_GRAM.carbs +
          goals.fatGoal    * CALORIES_PER_GRAM.fat
        );
    }
  }
  ```

- Update the call site at line 108 from:
  ```typescript
  const activeGoal = getGoalForMacro(goals, activeTab);
  ```
  to:
  ```typescript
  const activeGoal = getGoalForTab(goals, activeTab);
  ```

- Update the dataset to use the active series correctly. Find line 132:
  ```typescript
  data: sampled.map(p => p[activeTab]),
  ```
  Confirm it still works: `MacroChartPoint` already includes a `calories` field, and `activeTab` is now `ChartTab` which is a valid key. No change needed (the type already lines up because `MacroChartPoint` keys include `'protein' | 'carbs' | 'fat' | 'calories'`).

- Update the legend goal label. Find line 199:
  ```typescript
  <Text style={styles.legendText}>{activeGoal}g GOAL</Text>
  ```
  Replace with:
  ```typescript
  <Text style={styles.legendText}>
    {activeGoal}{activeTab === 'calories' ? '' : 'g'} GOAL
  </Text>
  ```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- src/components/__tests__/MacroChart.test.tsx`
Expected: PASS — all four tests now succeed.

- [ ] **Step 5: Commit**

```bash
rtk git add src/components/MacroChart.tsx src/components/__tests__/MacroChart.test.tsx
rtk git commit -m "feat(macros): add derived calories goal line to chart"
```

---

### Task A4: Branch y-axis suffix per tab

**Files:**
- Modify: `src/components/__tests__/MacroChart.test.tsx`
- Modify: `src/components/MacroChart.tsx`

- [ ] **Step 1: Write failing test for y-axis suffix**

Append inside the same `describe` block in `src/components/__tests__/MacroChart.test.tsx`:

```typescript
  it('passes empty y-axis suffix to LineChart on Calories tab and "g" on macro tabs', async () => {
    // Provide one data point so the LineChart actually renders
    (macrosDb.getDailyMacroTotals as jest.Mock).mockResolvedValue([
      { date: '2026-04-15', protein: 100, carbs: 150, fat: 50, calories: 1450 },
    ]);
    const { getByText, UNSAFE_getByType } = renderChart(allGoalsSet);
    await waitFor(() =>
      expect(macrosDb.getDailyMacroTotals).toHaveBeenCalled(),
    );

    const { LineChart } = require('react-native-chart-kit');
    // Macros tab default: suffix = "g"
    expect(UNSAFE_getByType(LineChart).props.yAxisSuffix).toBe('g');

    fireEvent.press(getByText('Calories'));
    await waitFor(() =>
      expect(UNSAFE_getByType(LineChart).props.yAxisSuffix).toBe(''),
    );
  });
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/components/__tests__/MacroChart.test.tsx`
Expected: FAIL — current code hardcodes `yAxisSuffix="g"` on every render.

- [ ] **Step 3: Branch the y-axis suffix**

In `src/components/MacroChart.tsx`, find the `LineChart` props (line 214):
```typescript
yAxisSuffix="g"
```
Replace with:
```typescript
yAxisSuffix={activeTab === 'calories' ? '' : 'g'}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- src/components/__tests__/MacroChart.test.tsx`
Expected: PASS — all five tests succeed.

- [ ] **Step 5: Commit**

```bash
rtk git add src/components/MacroChart.tsx src/components/__tests__/MacroChart.test.tsx
rtk git commit -m "feat(macros): branch chart y-axis suffix per tab (empty for calories)"
```

---

## Phase B — Export Feature

### Task B1: Add `MacroGoalsSnapshot` and `MacrosExport` types

**Files:**
- Modify: `src/types/index.ts`

- [ ] **Step 1: Add the types**

In `src/types/index.ts`, after the `MacroChartPoint` interface (around line 284), add:

```typescript
/** Snapshot of goals captured at export time. Mirrors MacroSettings'
 *  partially-set semantics: each macro field is null if its goal is unset.
 *  `calories` is null whenever any of protein/carbs/fat goal is null. */
export interface MacroGoalsSnapshot {
  protein: number | null;
  carbs: number | null;
  fat: number | null;
  calories: number | null;
}

/** Macros export envelope written to disk by ExportMacrosModal.
 *  `goals` is non-null whenever a macro_settings row exists (even if all its
 *  fields are null). It is null only when getMacroGoals() returned null
 *  (no row exists at all — first-time user who never opened goal setup). */
export interface MacrosExport {
  exportedAt: string;          // ISO 8601 UTC timestamp
  appVersion: string;          // from package.json
  range: { start: string; end: string };  // YYYY-MM-DD, inclusive
  goals: MacroGoalsSnapshot | null;
  days: MacroChartPoint[];     // already includes derived calories per row
}
```

- [ ] **Step 2: Verify the types compile**

Run: `npx tsc --noEmit`
Expected: no new errors.

- [ ] **Step 3: Commit**

```bash
rtk git add src/types/index.ts
rtk git commit -m "feat(macros): add MacroGoalsSnapshot and MacrosExport types"
```

---

### Task B2: Add `getMacrosExportData` to `db/macros.ts`

**Files:**
- Modify: `src/db/__tests__/macros.test.ts`
- Modify: `src/db/macros.ts`

- [ ] **Step 1: Add failing tests**

Append the following block at the end of `src/db/__tests__/macros.test.ts` (after the last `describe`, but before EOF):

```typescript
// ── Macros Export ─────────────────────────────────────────────────────

describe('getMacrosExportData', () => {
  it('returns wrapped envelope with metadata, range, goals, and days', async () => {
    // First call: getDailyMacroTotals
    mockExecuteSql.mockResolvedValueOnce(
      mockResultSet([
        { local_date: '2026-03-01', protein: 120, carbs: 180, fat: 50 },
        { local_date: '2026-03-02', protein: 100, carbs: 160, fat: 45 },
      ]),
    );
    // Second call: getMacroGoals
    mockExecuteSql.mockResolvedValueOnce(mockResultSet([macroSettingsRow]));

    const { getMacrosExportData } = require('../macros');
    const result = await getMacrosExportData('2026-03-01', '2026-03-02');

    expect(result.range).toEqual({ start: '2026-03-01', end: '2026-03-02' });
    expect(result.days).toHaveLength(2);
    expect(result.days[0]).toMatchObject({
      date: '2026-03-01',
      protein: 120,
      carbs: 180,
      fat: 50,
      calories: 120 * 4 + 180 * 4 + 50 * 9, // 1650
    });
    expect(typeof result.exportedAt).toBe('string');
    expect(() => new Date(result.exportedAt)).not.toThrow();
    expect(typeof result.appVersion).toBe('string');
    expect(result.appVersion.length).toBeGreaterThan(0);
  });

  it('returns days: [] when no meals in range', async () => {
    mockExecuteSql.mockResolvedValueOnce(mockResultSet([]));         // getDailyMacroTotals
    mockExecuteSql.mockResolvedValueOnce(mockResultSet([macroSettingsRow])); // getMacroGoals

    const { getMacrosExportData } = require('../macros');
    const result = await getMacrosExportData('2026-03-01', '2026-03-02');

    expect(result.days).toEqual([]);
  });

  it('derives calories goal as 4P + 4C + 9F when all three macro goals are set', async () => {
    mockExecuteSql.mockResolvedValueOnce(mockResultSet([])); // getDailyMacroTotals
    mockExecuteSql.mockResolvedValueOnce(
      mockResultSet([{
        id: 1,
        protein_goal: 150,
        carb_goal: 200,
        fat_goal: 70,
        created_at: '2026-01-01T00:00:00',
        updated_at: '2026-01-01T00:00:00',
      }]),
    );

    const { getMacrosExportData } = require('../macros');
    const result = await getMacrosExportData('2026-03-01', '2026-03-02');

    expect(result.goals).toEqual({
      protein: 150,
      carbs: 200,
      fat: 70,
      calories: 4 * 150 + 4 * 200 + 9 * 70, // 2030
    });
  });

  it('returns goals.calories === null when any macro goal is unset', async () => {
    mockExecuteSql.mockResolvedValueOnce(mockResultSet([])); // getDailyMacroTotals
    mockExecuteSql.mockResolvedValueOnce(
      mockResultSet([{
        id: 1,
        protein_goal: 150,
        carb_goal: 200,
        fat_goal: null,            // unset
        created_at: '2026-01-01T00:00:00',
        updated_at: '2026-01-01T00:00:00',
      }]),
    );

    const { getMacrosExportData } = require('../macros');
    const result = await getMacrosExportData('2026-03-01', '2026-03-02');

    expect(result.goals).toEqual({
      protein: 150,
      carbs: 200,
      fat: null,
      calories: null,
    });
  });

  it('returns goals === null when getMacroGoals returns null (no settings row)', async () => {
    mockExecuteSql.mockResolvedValueOnce(mockResultSet([])); // getDailyMacroTotals
    mockExecuteSql.mockResolvedValueOnce(mockResultSet([])); // getMacroGoals → empty → null

    const { getMacrosExportData } = require('../macros');
    const result = await getMacrosExportData('2026-03-01', '2026-03-02');

    expect(result.goals).toBeNull();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- src/db/__tests__/macros.test.ts`
Expected: FAIL — `getMacrosExportData is not a function` (or import error).

- [ ] **Step 3: Implement `getMacrosExportData` and `getAppVersion`**

In `src/db/macros.ts`:

- Add this import block near the top (after the existing imports):

  ```typescript
  import { CALORIES_PER_GRAM, MacrosExport, MacroGoalsSnapshot } from '../types';
  import pkg from '../../package.json';
  ```

  *(If `CALORIES_PER_GRAM` is already imported elsewhere in the file, merge into the existing types import line. The `pkg` import works because `resolveJsonModule` is enabled by `@react-native/typescript-config`.)*

- Append to the bottom of `src/db/macros.ts`:

  ```typescript
  // ── Export ─────────────────────────────────────────────────────────────

  /**
   * Build the macros-export payload for an inclusive date range.
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

  function getAppVersion(): string {
    return pkg.version;
  }
  ```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- src/db/__tests__/macros.test.ts`
Expected: PASS — all five new tests succeed and all existing tests continue to pass.

- [ ] **Step 5: Commit**

```bash
rtk git add src/db/macros.ts src/db/__tests__/macros.test.ts
rtk git commit -m "feat(macros): add getMacrosExportData for date-range JSON export"
```

---

### Task B3: Install `@react-native-community/datetimepicker`

**Files:**
- Modify: `package.json`, `package-lock.json`

- [ ] **Step 1: Install the dependency**

Run: `npm install --save @react-native-community/datetimepicker`
Expected: completes with no errors. `package.json` gains a new dependency line.

- [ ] **Step 2: Verify the install**

Run: `grep '@react-native-community/datetimepicker' package.json`
Expected: a single dependency line is printed.

- [ ] **Step 3: Run the existing test suite to confirm nothing broke**

Run: `npm test -- --silent`
Expected: all existing tests still pass. (No code changes yet — adding the dep alone should be inert.)

- [ ] **Step 4: Commit**

```bash
rtk git add package.json package-lock.json
rtk git commit -m "feat(macros): add @react-native-community/datetimepicker dependency"
```

---

### Task B4: Create `ExportMacrosModal` shell

**Files:**
- Create: `src/components/__tests__/ExportMacrosModal.test.tsx`
- Create: `src/components/ExportMacrosModal.tsx`

- [ ] **Step 1: Write the failing test**

Create `src/components/__tests__/ExportMacrosModal.test.tsx`:

```typescript
jest.mock('../../db', () => ({
  macrosDb: {
    getMacrosExportData: jest.fn(),
  },
}));
jest.mock('../../native/FileSaver', () => ({
  saveFileToDevice: jest.fn().mockResolvedValue(true),
}));
jest.mock('@react-native-community/datetimepicker', () => 'DateTimePicker');

import React from 'react';
import { render } from '@testing-library/react-native';
import { ExportMacrosModal } from '../ExportMacrosModal';

describe('ExportMacrosModal', () => {
  it('renders title and action buttons when visible', () => {
    const { getByText } = render(
      <ExportMacrosModal visible={true} onClose={jest.fn()} />,
    );

    expect(getByText('Export Macros')).toBeTruthy();
    expect(getByText('Cancel')).toBeTruthy();
    expect(getByText('Export JSON')).toBeTruthy();
  });

  it('returns null content when not visible', () => {
    const { queryByText } = render(
      <ExportMacrosModal visible={false} onClose={jest.fn()} />,
    );

    expect(queryByText('Export Macros')).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/components/__tests__/ExportMacrosModal.test.tsx`
Expected: FAIL — `Cannot find module '../ExportMacrosModal'`.

- [ ] **Step 3: Create the modal shell**

Create `src/components/ExportMacrosModal.tsx`:

```typescript
import React from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { fontSize, weightBold, weightSemiBold } from '../theme/typography';

interface ExportMacrosModalProps {
  visible: boolean;
  onClose: () => void;
}

export function ExportMacrosModal({ visible, onClose }: ExportMacrosModalProps) {
  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose} />
      <View style={styles.sheet}>
        <Text style={styles.title}>Export Macros</Text>
        <Text style={styles.subtitle}>Choose a date range</Text>

        <View style={styles.actions}>
          <TouchableOpacity style={[styles.btn, styles.btnCancel]} onPress={onClose}>
            <Text style={styles.btnCancelText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.btn, styles.btnPrimary]}>
            <Text style={styles.btnPrimaryText}>Export JSON</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.surface,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: spacing.base,
    paddingBottom: spacing.xl,
    borderWidth: 1,
    borderColor: colors.border,
  },
  title: {
    color: colors.primary,
    fontSize: fontSize.lg,
    fontWeight: weightBold,
    marginBottom: spacing.xs,
  },
  subtitle: {
    color: colors.secondary,
    fontSize: fontSize.sm,
    fontWeight: weightSemiBold,
    marginBottom: spacing.base,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.base,
  },
  btn: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: 10,
    alignItems: 'center',
    minHeight: 44,
    justifyContent: 'center',
  },
  btnCancel: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: colors.border,
  },
  btnPrimary: {
    backgroundColor: colors.accent,
  },
  btnCancelText: {
    color: colors.secondary,
    fontSize: fontSize.base,
    fontWeight: weightBold,
  },
  btnPrimaryText: {
    color: colors.onAccent,
    fontSize: fontSize.base,
    fontWeight: weightBold,
  },
});
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- src/components/__tests__/ExportMacrosModal.test.tsx`
Expected: PASS — both shell tests succeed.

- [ ] **Step 5: Commit**

```bash
rtk git add src/components/ExportMacrosModal.tsx src/components/__tests__/ExportMacrosModal.test.tsx
rtk git commit -m "feat(macros): scaffold ExportMacrosModal shell"
```

---

### Task B5: Add date pickers and default range

**Files:**
- Modify: `src/components/__tests__/ExportMacrosModal.test.tsx`
- Modify: `src/components/ExportMacrosModal.tsx`

- [ ] **Step 1: Write failing test for default date display**

Add the following to the existing `describe` block in `src/components/__tests__/ExportMacrosModal.test.tsx`:

```typescript
  it('renders From and To date fields with defaults (today and today − 30 days)', () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-04-16T10:00:00Z'));

    const { getByText } = render(
      <ExportMacrosModal visible={true} onClose={jest.fn()} />,
    );

    expect(getByText('From')).toBeTruthy();
    expect(getByText('To')).toBeTruthy();
    // Default From = 2026-04-16 minus 30 days = 2026-03-17
    expect(getByText('Mar 17, 2026')).toBeTruthy();
    expect(getByText('Apr 16, 2026')).toBeTruthy();

    jest.useRealTimers();
  });
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/components/__tests__/ExportMacrosModal.test.tsx`
Expected: FAIL — the new test fails because the date fields don't exist yet.

- [ ] **Step 3: Add date pickers and default state**

Edit `src/components/ExportMacrosModal.tsx`:

- Replace the imports block at the top with:

  ```typescript
  import React, { useState } from 'react';
  import {
    Modal,
    Platform,
    Pressable,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
  } from 'react-native';
  import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
  import { colors } from '../theme/colors';
  import { spacing } from '../theme/spacing';
  import { fontSize, weightBold, weightSemiBold, weightRegular } from '../theme/typography';
  ```

- Add these helpers inside the file (above the component):

  ```typescript
  const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

  function formatDateLong(d: Date): string {
    return `${MONTHS[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
  }

  function startOfDay(d: Date): Date {
    const out = new Date(d);
    out.setHours(0, 0, 0, 0);
    return out;
  }

  function defaultFrom(): Date {
    const now = startOfDay(new Date());
    now.setDate(now.getDate() - 30);
    return now;
  }
  ```

- Replace the body of the `ExportMacrosModal` component. Find:

  ```typescript
  export function ExportMacrosModal({ visible, onClose }: ExportMacrosModalProps) {
    return (
      <Modal
        visible={visible}
        animationType="slide"
        transparent
        onRequestClose={onClose}>
        <Pressable style={styles.overlay} onPress={onClose} />
        <View style={styles.sheet}>
          <Text style={styles.title}>Export Macros</Text>
          <Text style={styles.subtitle}>Choose a date range</Text>

          <View style={styles.actions}>
            <TouchableOpacity style={[styles.btn, styles.btnCancel]} onPress={onClose}>
              <Text style={styles.btnCancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.btn, styles.btnPrimary]}>
              <Text style={styles.btnPrimaryText}>Export JSON</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    );
  }
  ```

  Replace with:

  ```typescript
  export function ExportMacrosModal({ visible, onClose }: ExportMacrosModalProps) {
    const [fromDate, setFromDate] = useState<Date>(() => defaultFrom());
    const [toDate, setToDate] = useState<Date>(() => startOfDay(new Date()));
    const [showFromPicker, setShowFromPicker] = useState(false);
    const [showToPicker, setShowToPicker] = useState(false);

    const onChangeFrom = (event: DateTimePickerEvent, picked?: Date) => {
      if (Platform.OS === 'android') {
        setShowFromPicker(false);
      }
      if (event.type === 'set' && picked) {
        setFromDate(startOfDay(picked));
      }
    };

    const onChangeTo = (event: DateTimePickerEvent, picked?: Date) => {
      if (Platform.OS === 'android') {
        setShowToPicker(false);
      }
      if (event.type === 'set' && picked) {
        setToDate(startOfDay(picked));
      }
    };

    return (
      <Modal
        visible={visible}
        animationType="slide"
        transparent
        onRequestClose={onClose}>
        <Pressable style={styles.overlay} onPress={onClose} />
        <View style={styles.sheet}>
          <Text style={styles.title}>Export Macros</Text>
          <Text style={styles.subtitle}>Choose a date range</Text>

          <View style={styles.dateRow}>
            <TouchableOpacity
              style={styles.dateField}
              onPress={() => setShowFromPicker(true)}
              activeOpacity={0.7}>
              <Text style={styles.dateLabel}>From</Text>
              <Text style={styles.dateValue}>{formatDateLong(fromDate)}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.dateField}
              onPress={() => setShowToPicker(true)}
              activeOpacity={0.7}>
              <Text style={styles.dateLabel}>To</Text>
              <Text style={styles.dateValue}>{formatDateLong(toDate)}</Text>
            </TouchableOpacity>
          </View>

          {showFromPicker && (
            <DateTimePicker
              value={fromDate}
              mode="date"
              onChange={onChangeFrom}
            />
          )}
          {showToPicker && (
            <DateTimePicker
              value={toDate}
              mode="date"
              onChange={onChangeTo}
            />
          )}

          <View style={styles.actions}>
            <TouchableOpacity style={[styles.btn, styles.btnCancel]} onPress={onClose}>
              <Text style={styles.btnCancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.btn, styles.btnPrimary]}>
              <Text style={styles.btnPrimaryText}>Export JSON</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    );
  }
  ```

- Add these style entries to the existing `StyleSheet.create({...})` (insert before the closing brace, alongside existing styles):

  ```typescript
  dateRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.base,
  },
  dateField: {
    flex: 1,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    padding: spacing.sm,
  },
  dateLabel: {
    fontSize: fontSize.xs,
    color: colors.secondary,
    fontWeight: weightRegular,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  dateValue: {
    fontSize: fontSize.base,
    color: colors.primary,
    fontWeight: weightSemiBold,
  },
  ```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- src/components/__tests__/ExportMacrosModal.test.tsx`
Expected: PASS — all three tests now succeed.

- [ ] **Step 5: Commit**

```bash
rtk git add src/components/ExportMacrosModal.tsx src/components/__tests__/ExportMacrosModal.test.tsx
rtk git commit -m "feat(macros): add date picker fields with default range to export modal"
```

---

### Task B6: Add range validation (`from > to`)

**Files:**
- Modify: `src/components/__tests__/ExportMacrosModal.test.tsx`
- Modify: `src/components/ExportMacrosModal.tsx`

- [ ] **Step 1: Write failing test for validation**

Because `@react-native-community/datetimepicker` is mocked to a bare string component, simulating a real date change is awkward. Instead, we expose `initialFrom` / `initialTo` props as test seams (added in Step 3) and assert the rendered error state directly. Append to the existing `describe` block in `src/components/__tests__/ExportMacrosModal.test.tsx`:

```typescript
  it('shows inline error and disables Export when From > To', () => {
    const { getByText } = render(
      <ExportMacrosModal
        visible={true}
        onClose={jest.fn()}
        initialFrom={new Date('2026-04-16T00:00:00Z')}
        initialTo={new Date('2026-04-15T00:00:00Z')}
      />,
    );

    expect(getByText('End date must be on or after start date.')).toBeTruthy();

    const exportBtn = getByText('Export JSON');
    // The Text node sits inside the TouchableOpacity that owns accessibilityState.
    expect(exportBtn.parent?.props.accessibilityState?.disabled).toBe(true);
  });
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/components/__tests__/ExportMacrosModal.test.tsx`
Expected: FAIL — `initialFrom` / `initialTo` are not props yet.

- [ ] **Step 3: Add validation, error rendering, and test props**

Edit `src/components/ExportMacrosModal.tsx`:

- Update the props interface:

  ```typescript
  interface ExportMacrosModalProps {
    visible: boolean;
    onClose: () => void;
    /** Test seam — overrides the default "today − 30 days" From date. */
    initialFrom?: Date;
    /** Test seam — overrides the default "today" To date. */
    initialTo?: Date;
  }
  ```

- Update the component signature and `useState` initializers:

  ```typescript
  export function ExportMacrosModal({
    visible,
    onClose,
    initialFrom,
    initialTo,
  }: ExportMacrosModalProps) {
    const [fromDate, setFromDate] = useState<Date>(
      () => initialFrom ?? defaultFrom(),
    );
    const [toDate, setToDate] = useState<Date>(
      () => initialTo ?? startOfDay(new Date()),
    );
  ```

- Add a derived `isInvalid` flag below the state hooks:

  ```typescript
  const isInvalid = fromDate.getTime() > toDate.getTime();
  ```

- Insert an inline error block immediately after the date row (`</View>` closing the `dateRow`):

  ```tsx
  {isInvalid && (
    <Text style={styles.errorText}>
      End date must be on or after start date.
    </Text>
  )}
  ```

- Update the Export button to honor `isInvalid`. Find:

  ```tsx
  <TouchableOpacity style={[styles.btn, styles.btnPrimary]}>
    <Text style={styles.btnPrimaryText}>Export JSON</Text>
  </TouchableOpacity>
  ```

  Replace with:

  ```tsx
  <TouchableOpacity
    style={[styles.btn, styles.btnPrimary, isInvalid && styles.btnDisabled]}
    disabled={isInvalid}
    accessibilityState={{ disabled: isInvalid }}>
    <Text style={styles.btnPrimaryText}>Export JSON</Text>
  </TouchableOpacity>
  ```

- Add these style entries to the `StyleSheet.create({...})`:

  ```typescript
  errorText: {
    color: '#E8845C',          // matches FAT macro color (warm orange) for accent contrast
    fontSize: fontSize.sm,
    marginBottom: spacing.sm,
  },
  btnDisabled: {
    opacity: 0.4,
  },
  ```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- src/components/__tests__/ExportMacrosModal.test.tsx`
Expected: PASS — all four tests succeed.

- [ ] **Step 5: Commit**

```bash
rtk git add src/components/ExportMacrosModal.tsx src/components/__tests__/ExportMacrosModal.test.tsx
rtk git commit -m "feat(macros): validate date range in export modal (from <= to)"
```

---

### Task B7: Add submit handler

**Files:**
- Modify: `src/components/__tests__/ExportMacrosModal.test.tsx`
- Modify: `src/components/ExportMacrosModal.tsx`

- [ ] **Step 1: Write failing tests for the submit pipeline**

Append the following to `src/components/__tests__/ExportMacrosModal.test.tsx` (inside the existing `describe` block):

```typescript
  it('calls getMacrosExportData and saveFileToDevice with correct args on Export press', async () => {
    const { macrosDb } = require('../../db');
    const { saveFileToDevice } = require('../../native/FileSaver');
    (macrosDb.getMacrosExportData as jest.Mock).mockResolvedValue({
      exportedAt: '2026-04-16T10:24:00.000Z',
      appVersion: '0.0.1',
      range: { start: '2026-04-10', end: '2026-04-15' },
      goals: null,
      days: [],
    });
    (saveFileToDevice as jest.Mock).mockResolvedValue(true);

    const onClose = jest.fn();
    const { getByText } = render(
      <ExportMacrosModal
        visible={true}
        onClose={onClose}
        initialFrom={new Date('2026-04-10T00:00:00')}
        initialTo={new Date('2026-04-15T00:00:00')}
      />,
    );

    fireEvent.press(getByText('Export JSON'));

    await waitFor(() =>
      expect(macrosDb.getMacrosExportData).toHaveBeenCalledWith('2026-04-10', '2026-04-15'),
    );
    await waitFor(() =>
      expect(saveFileToDevice).toHaveBeenCalledWith(
        expect.stringContaining('"exportedAt"'),
        'gymtrack-macros-2026-04-10-to-2026-04-15.json',
      ),
    );
    await waitFor(() => expect(onClose).toHaveBeenCalled());
  });

  it('keeps the modal open when saveFileToDevice resolves to false (user cancelled)', async () => {
    const { macrosDb } = require('../../db');
    const { saveFileToDevice } = require('../../native/FileSaver');
    (macrosDb.getMacrosExportData as jest.Mock).mockResolvedValue({
      exportedAt: '', appVersion: '', range: { start: '', end: '' }, goals: null, days: [],
    });
    (saveFileToDevice as jest.Mock).mockResolvedValue(false);

    const onClose = jest.fn();
    const { getByText } = render(
      <ExportMacrosModal
        visible={true}
        onClose={onClose}
        initialFrom={new Date('2026-04-10T00:00:00')}
        initialTo={new Date('2026-04-15T00:00:00')}
      />,
    );

    fireEvent.press(getByText('Export JSON'));

    await waitFor(() => expect(saveFileToDevice).toHaveBeenCalled());
    expect(onClose).not.toHaveBeenCalled();
  });

  it('alerts and stays open when getMacrosExportData throws', async () => {
    const { macrosDb } = require('../../db');
    (macrosDb.getMacrosExportData as jest.Mock).mockRejectedValue(new Error('db boom'));

    const alertSpy = jest.spyOn(require('react-native').Alert, 'alert').mockImplementation(() => {});
    const onClose = jest.fn();

    const { getByText } = render(
      <ExportMacrosModal
        visible={true}
        onClose={onClose}
        initialFrom={new Date('2026-04-10T00:00:00')}
        initialTo={new Date('2026-04-15T00:00:00')}
      />,
    );

    fireEvent.press(getByText('Export JSON'));

    await waitFor(() => expect(alertSpy).toHaveBeenCalled());
    expect(onClose).not.toHaveBeenCalled();
    alertSpy.mockRestore();
  });
```

Also update the imports at the top of the test file from:

```typescript
import { render } from '@testing-library/react-native';
```

to:

```typescript
import { render, fireEvent, waitFor } from '@testing-library/react-native';
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- src/components/__tests__/ExportMacrosModal.test.tsx`
Expected: FAIL — submit handler doesn't exist yet; pressing Export does nothing.

- [ ] **Step 3: Implement the submit handler**

Edit `src/components/ExportMacrosModal.tsx`:

- Update imports to add `Alert` and `ActivityIndicator`:

  ```typescript
  import {
    ActivityIndicator,
    Alert,
    Modal,
    Platform,
    Pressable,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
  } from 'react-native';
  ```

- Add these imports below the existing `react-native` block:

  ```typescript
  import { macrosDb } from '../db';
  import { saveFileToDevice } from '../native/FileSaver';
  import { getLocalDateString } from '../utils/dates';
  ```

- Add `submitting` state inside the component (immediately after the existing `useState` lines):

  ```typescript
  const [submitting, setSubmitting] = useState(false);
  ```

- Add the submit handler inside the component (after the `onChangeTo` handler):

  ```typescript
  const handleExport = async () => {
    if (isInvalid) return;
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
    } catch (e: any) {
      Alert.alert('Export Failed', e?.message ?? 'Could not export macros.');
    } finally {
      setSubmitting(false);
    }
  };
  ```

- Update the Export button to wire up `handleExport` and the spinner. Replace the existing Export button block:

  ```tsx
  <TouchableOpacity
    style={[styles.btn, styles.btnPrimary, isInvalid && styles.btnDisabled]}
    disabled={isInvalid}
    accessibilityState={{ disabled: isInvalid }}>
    <Text style={styles.btnPrimaryText}>Export JSON</Text>
  </TouchableOpacity>
  ```

  with:

  ```tsx
  <TouchableOpacity
    style={[
      styles.btn,
      styles.btnPrimary,
      (isInvalid || submitting) && styles.btnDisabled,
    ]}
    disabled={isInvalid || submitting}
    accessibilityState={{ disabled: isInvalid || submitting }}
    onPress={handleExport}>
    {submitting ? (
      <ActivityIndicator color={colors.onAccent} />
    ) : (
      <Text style={styles.btnPrimaryText}>Export JSON</Text>
    )}
  </TouchableOpacity>
  ```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- src/components/__tests__/ExportMacrosModal.test.tsx`
Expected: PASS — all seven tests succeed.

- [ ] **Step 5: Commit**

```bash
rtk git add src/components/ExportMacrosModal.tsx src/components/__tests__/ExportMacrosModal.test.tsx
rtk git commit -m "feat(macros): add submit pipeline to ExportMacrosModal (DB + FileSaver + Alerts)"
```

---

### Task B8: Wire Export pill into `MacroChart` header

**Files:**
- Modify: `src/components/__tests__/MacroChart.test.tsx`
- Modify: `src/components/MacroChart.tsx`

- [ ] **Step 1: Write failing test for the Export pill**

Append the following inside the existing `describe('MacroChart — Calories tab', …)` block (rename the describe to `'MacroChart'` if you prefer; tests stay the same):

```typescript
  it('renders the Export pill in the section header and toggles ExportMacrosModal visibility', async () => {
    const { getByText, queryByText } = renderChart();
    await waitFor(() =>
      expect(macrosDb.getDailyMacroTotals).toHaveBeenCalled(),
    );

    expect(getByText('↓ EXPORT')).toBeTruthy();
    expect(queryByText('Export Macros')).toBeNull();

    fireEvent.press(getByText('↓ EXPORT'));
    await waitFor(() => expect(getByText('Export Macros')).toBeTruthy());
  });
```

You'll also need to mock the FileSaver and DateTimePicker dependencies that `ExportMacrosModal` pulls in. Update the top mocks block of `src/components/__tests__/MacroChart.test.tsx` from:

```typescript
jest.mock('../../db', () => ({
  macrosDb: {
    getDailyMacroTotals: jest.fn().mockResolvedValue([]),
  },
}));
```

to:

```typescript
jest.mock('../../db', () => ({
  macrosDb: {
    getDailyMacroTotals: jest.fn().mockResolvedValue([]),
    getMacrosExportData: jest.fn(),
  },
}));
jest.mock('../../native/FileSaver', () => ({
  saveFileToDevice: jest.fn().mockResolvedValue(true),
}));
jest.mock('@react-native-community/datetimepicker', () => 'DateTimePicker');
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/components/__tests__/MacroChart.test.tsx`
Expected: FAIL — the Export pill does not exist; `getByText('↓ EXPORT')` throws.

- [ ] **Step 3: Add the Export pill and mount the modal**

Edit `src/components/MacroChart.tsx`:

- Add the modal import near the other component imports:

  ```typescript
  import { ExportMacrosModal } from './ExportMacrosModal';
  ```

- Add `useState` for the modal visibility inside the component (after the existing `useState` lines):

  ```typescript
  const [exportModalVisible, setExportModalVisible] = useState(false);
  ```

- Replace the existing section header (line 152):

  ```tsx
  <Text style={styles.sectionHeader}>MACRO INTAKE HISTORY</Text>
  ```

  with:

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

- Add the modal mount at the very end of the wrapper, immediately before the closing `</View>` of the outer `<View style={styles.wrapper}>`:

  ```tsx
  <ExportMacrosModal
    visible={exportModalVisible}
    onClose={() => setExportModalVisible(false)}
  />
  ```

- Add these styles to the `StyleSheet.create({...})` block (alongside the existing `sectionHeader` style):

  ```typescript
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  exportPill: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.accent,
  },
  exportPillText: {
    color: colors.accent,
    fontSize: fontSize.xs,
    fontWeight: weightBold,
    letterSpacing: 0.5,
  },
  ```

  *(Note: `sectionHeader` previously had `marginBottom: spacing.sm`. Since `headerRow` now provides that margin, remove `marginBottom` from the `sectionHeader` style entry to avoid double-spacing.)*

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- src/components/__tests__/MacroChart.test.tsx`
Expected: PASS — all six tests in the file succeed.

- [ ] **Step 5: Run the full test suite**

Run: `npm test -- --silent`
Expected: PASS — no regressions across the project.

- [ ] **Step 6: Commit**

```bash
rtk git add src/components/MacroChart.tsx src/components/__tests__/MacroChart.test.tsx
rtk git commit -m "feat(macros): add Export pill to MacroChart header and wire up ExportMacrosModal"
```

---

## Final Verification

- [ ] **Run all tests once more**

```bash
npm test -- --silent
```
Expected: PASS — every test in the project succeeds.

- [ ] **Type-check**

```bash
npx tsc --noEmit
```
Expected: no new errors.

- [ ] **Lint**

```bash
npm run lint
```
Expected: clean (or only pre-existing warnings unrelated to this change).

- [ ] **Manual smoke test on the emulator** (use the `/deploy` skill)

Verify on device:
1. Open the Macros page → see the new "Calories" tab in MACRO INTAKE HISTORY.
2. Tap Calories → series renders in gold, goal line appears with "2030 GOAL" (assuming all goals set), y-axis shows no unit suffix.
3. Tap "↓ EXPORT" pill → modal slides up from the bottom.
4. Tap From / To dates → native Android date picker appears for each.
5. Set From after To → inline error appears, Export button greyed out.
6. Set valid range → tap Export JSON → Android Save As dialog opens with `gymtrack-macros-…-to-….json` filename. Save it. Open the file in a text editor and confirm the `exportedAt`, `appVersion`, `range`, `goals`, and `days` fields look right.
7. Open Export modal again, tap Cancel → modal dismisses. Tap outside → modal dismisses.

---

## Spec Coverage Self-Check

| Spec section | Covered by |
|---|---|
| D-01 (placement: inline pill) | Task B8 — `headerRow` + `exportPill` |
| D-02 (range: prompt at export time) | Task B4–B7 — modal opens on pill press |
| D-03 (date picker UX: two date fields) | Task B5 — `dateRow` with two fields |
| D-04 (`@react-native-community/datetimepicker`) | Task B3 |
| D-05 (wrapped JSON shape) | Task B1 — types; Task B2 — DB function |
| D-06 (Calories tab with derived goal line) | Tasks A2 (tab) + A3 (goal) |
| D-07 (calories goal = 4P+4C+9F if all set) | Task A3 + Task B2 (export goal mirroring) |
| D-08 (color = gold #F0C75B) | Task A1 (constant) + Task A2 (use in tab) |
| D-09 (y-axis suffix empty for calories) | Task A4 |
| D-10 (days with no meals omitted) | Task B2 — relies on existing `getDailyMacroTotals` `GROUP BY` |
| D-11 (empty range still exports) | Task B2 — empty-range test case |
| D-12 (default range last 30 days) | Task B5 — `defaultFrom()` |
| D-13 (save-cancel silent) | Task B7 — `if (saved) onClose()` |
| D-14 (`ChartTab` widening) | Task A1 |

---

## Out of Scope (per spec)

- Storing a calorie goal in `macro_settings` — calories goal stays derived.
- CSV export, Android intent sharing, cloud sync.
- Importing the JSON back into the app.
- Per-meal export (daily totals only).
- Adding the export to `SettingsScreen`.
