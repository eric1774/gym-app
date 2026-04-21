# Editable Week Metadata for Not-Started Programs Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Allow editing week name and week details for any week of any program (active or not-started) by making the `W{n}` header row in `CustomizeWeeksScreen` tappable, opening the existing `WeekEditModal`.

**Architecture:** Single-file UI change to `src/screens/CustomizeWeeksScreen.tsx`. Widen the cached per-week state to hold full `ProgramWeek` rows (not just names) so the modal can seed both `name` and `details`. Wrap the existing `weekHeaderRow` `View` in a `TouchableOpacity` that sets `editingWeek` state, which gates rendering of the existing `WeekEditModal`. On save, call existing `upsertWeekData` then `refresh()`. No DB, type, or modal changes.

**Tech Stack:** React Native + TypeScript, React Navigation, jest with `@testing-library/react-native` for screen tests.

**Spec:** `docs/superpowers/specs/2026-04-20-editable-week-metadata-for-not-started-programs-design.md`

---

## File Structure

- **Modify:** `src/screens/CustomizeWeeksScreen.tsx` — widen state, wrap header row in `TouchableOpacity`, render `WeekEditModal`.
- **Create:** `src/screens/__tests__/CustomizeWeeksScreen.test.tsx` — new screen test covering the tap-to-open and save-and-refresh behavior. Mirrors the mocking pattern in `src/screens/__tests__/ProgramDetailScreen.test.tsx`.

No other files touched. No DB changes. No type changes (`ProgramWeek` already exists in `src/types/index.ts:91`).

---

## Task 1: Add failing test for tap-to-open behavior

**Files:**
- Create: `src/screens/__tests__/CustomizeWeeksScreen.test.tsx`

This test asserts the new behavior: tapping a week's header row opens the editor seeded with that week's data, and saving calls `upsertWeekData` with the right week number then triggers a refresh.

- [ ] **Step 1: Create the test file**

Write `src/screens/__tests__/CustomizeWeeksScreen.test.tsx`:

```tsx
import React from 'react';
import { render, waitFor, fireEvent, act } from '@testing-library/react-native';

const mockGoBack = jest.fn();
const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => {
  const actual = jest.requireActual('@react-navigation/native');
  return {
    ...actual,
    useNavigation: () => ({ goBack: mockGoBack, navigate: mockNavigate }),
    useRoute: () => ({ params: { programId: 1 } }),
    useFocusEffect: (cb: () => void) => {
      // eslint-disable-next-line react-hooks/rules-of-hooks
      const React = require('react');
      React.useEffect(() => { cb(); }, []);
    },
  };
});

jest.mock('../../db/programs', () => ({
  getProgram: jest.fn(),
  getProgramDays: jest.fn(),
  getWeekOverrideCounts: jest.fn(),
  getWeekData: jest.fn(),
  upsertWeekData: jest.fn().mockResolvedValue(undefined),
}));

import { CustomizeWeeksScreen } from '../CustomizeWeeksScreen';
const {
  getProgram,
  getProgramDays,
  getWeekOverrideCounts,
  getWeekData,
  upsertWeekData,
} = require('../../db/programs');

const mockProgram = {
  id: 1,
  name: 'Test Program',
  weeks: 3,
  startDate: null,
  currentWeek: 1,
  createdAt: '',
  archivedAt: null,
};

const mockDay = {
  id: 10,
  programId: 1,
  name: 'Day 1',
  sortOrder: 0,
  createdAt: '',
};

beforeEach(() => {
  jest.clearAllMocks();
  getProgram.mockResolvedValue(mockProgram);
  getProgramDays.mockResolvedValue([mockDay]);
  getWeekOverrideCounts.mockResolvedValue({});
  getWeekData.mockImplementation(async (_pid: number, wk: number) => {
    if (wk === 2) {
      return {
        id: 99,
        programId: 1,
        weekNumber: 2,
        name: 'Volume Block',
        details: 'Push intensity',
      };
    }
    return null;
  });
});

describe('CustomizeWeeksScreen — week header tap opens editor', () => {
  it('opens WeekEditModal seeded with week 2 data when W2 header is tapped', async () => {
    const { getByText, queryByDisplayValue } = render(<CustomizeWeeksScreen />);

    // Wait for week 2 row to render with its name
    await waitFor(() => {
      expect(getByText('Volume Block')).toBeTruthy();
    });

    // Modal not visible yet — its inputs should not be in the tree
    expect(queryByDisplayValue('Volume Block')).toBeNull();

    // Tap W2 header
    fireEvent.press(getByText('W2'));

    // Modal opens, fields seeded from week 2's data
    await waitFor(() => {
      expect(queryByDisplayValue('Volume Block')).toBeTruthy();
      expect(queryByDisplayValue('Push intensity')).toBeTruthy();
    });
  });

  it('saves edits via upsertWeekData and refreshes', async () => {
    const { getByText, getByDisplayValue } = render(<CustomizeWeeksScreen />);

    await waitFor(() => expect(getByText('Volume Block')).toBeTruthy());

    fireEvent.press(getByText('W2'));

    await waitFor(() => expect(getByDisplayValue('Volume Block')).toBeTruthy());

    // Edit the name
    fireEvent.changeText(getByDisplayValue('Volume Block'), 'Deload');

    // Tap Save
    await act(async () => {
      fireEvent.press(getByText('Save'));
    });

    expect(upsertWeekData).toHaveBeenCalledWith(1, 2, 'Deload', 'Push intensity');
    // refresh() re-runs the loaders; getProgram is called twice (initial + after save)
    expect(getProgram).toHaveBeenCalledTimes(2);
  });

  it('opens an empty editor for a week with no saved data', async () => {
    const { getByText, queryByDisplayValue } = render(<CustomizeWeeksScreen />);

    // Wait for the screen to finish loading (W3 header becomes visible)
    await waitFor(() => expect(getByText('W3')).toBeTruthy());

    // Tap W3 (no saved data per mock)
    fireEvent.press(getByText('W3'));

    await waitFor(() => {
      // Modal title is rendered, indicating the editor opened
      expect(getByText('Week 3 of 3')).toBeTruthy();
    });

    // Inputs are empty — neither field has a pre-filled value
    expect(queryByDisplayValue('Volume Block')).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest src/screens/__tests__/CustomizeWeeksScreen.test.tsx -t "opens WeekEditModal seeded"`

Expected: FAIL. The current `CustomizeWeeksScreen` renders `W2` as plain text inside a `View` (`weekHeaderRow`), not a `TouchableOpacity`, so `fireEvent.press(getByText('W2'))` will not open any modal — `queryByDisplayValue('Volume Block')` will stay null and the assertion fails.

- [ ] **Step 3: Commit the failing test**

```bash
git add src/screens/__tests__/CustomizeWeeksScreen.test.tsx
git commit -m "test(customize-weeks): tapping week header opens editor (failing)"
```

---

## Task 2: Implement tap-to-open editor

**Files:**
- Modify: `src/screens/CustomizeWeeksScreen.tsx`

This is the full implementation: widen state from `weekNames` to `weekData`, add `editingWeek` state, render `WeekEditModal`, wrap the `weekHeaderRow` in `TouchableOpacity`.

- [ ] **Step 1: Update imports and replace state**

In `src/screens/CustomizeWeeksScreen.tsx`:

Update the imports near the top (lines 1-22). Add `WeekEditModal` import and bring in `upsertWeekData`:

```tsx
import React, { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

import {
  getProgram,
  getProgramDays,
  getWeekOverrideCounts,
  getWeekData,
  upsertWeekData,
} from '../db/programs';
import type { Program, ProgramDay, ProgramWeek } from '../types';
import {
  colors,
  spacing,
  fontSize,
  weightRegular,
  weightSemiBold,
  weightBold,
} from '../theme';
import type { ProgramsStackParamList } from '../navigation/TabNavigator';
import { WeekEditModal } from '../components/WeekEditModal';
```

Then change the state declaration. Replace this block (around line 38):

```tsx
  const [weekNames, setWeekNames] = useState<Record<number, string | null>>({});
```

with:

```tsx
  const [weekData, setWeekData] = useState<Record<number, ProgramWeek | null>>({});
  const [editingWeek, setEditingWeek] = useState<number | null>(null);
```

- [ ] **Step 2: Update refresh() to populate full week data**

Replace the body of `refresh` (currently lines 40-58, which builds `weekNames`) with the version that stores full `ProgramWeek` rows:

```tsx
  const refresh = useCallback(async () => {
    const [p, d, c] = await Promise.all([
      getProgram(programId),
      getProgramDays(programId),
      getWeekOverrideCounts(programId),
    ]);
    setProgram(p);
    setDays(d);
    setCounts(c);
    if (p) {
      const entries = await Promise.all(
        Array.from({ length: p.weeks }, (_, i) => i + 1).map(async wk => {
          const w = await getWeekData(programId, wk);
          return [wk, w] as const;
        }),
      );
      setWeekData(Object.fromEntries(entries));
    }
  }, [programId]);
```

- [ ] **Step 3: Add the save handler**

Immediately below the `refresh` function (after the `useFocusEffect` call), add:

```tsx
  const handleSaveWeek = useCallback(
    async (name: string | null, details: string | null) => {
      if (editingWeek === null) return;
      try {
        await upsertWeekData(programId, editingWeek, name, details);
        await refresh();
      } catch {
        // ignore
      }
    },
    [programId, editingWeek, refresh],
  );
```

- [ ] **Step 4: Update the weekLabel reader and wrap header row in TouchableOpacity**

Inside the `Array.from(...).map(wk => { ... })` block (currently around lines 108-147), replace `const weekLabel = weekNames[wk];` with:

```tsx
          const wk_data = weekData[wk] ?? null;
          const weekLabel = wk_data?.name ?? null;
```

Then convert the header `<View style={styles.weekHeaderRow}>` (currently around lines 114-127) to a `TouchableOpacity`:

```tsx
              <TouchableOpacity
                style={styles.weekHeaderRow}
                activeOpacity={0.7}
                onPress={() => setEditingWeek(wk)}>
                <Text style={styles.weekHeaderText}>
                  <Text style={styles.weekNumber}>W{wk}</Text>
                  {weekLabel ? <Text style={styles.weekName}>{'  '}{weekLabel}</Text> : null}
                  {isCurrent ? <Text style={styles.currentStar}>  ★</Text> : null}
                </Text>
                {overrideCount > 0 ? (
                  <View style={styles.overridePill}>
                    <Text style={styles.overridePillText}>{overrideCount} overrides</Text>
                  </View>
                ) : (
                  <Text style={styles.inheritsMeta}>inherits base</Text>
                )}
              </TouchableOpacity>
```

- [ ] **Step 5: Render the WeekEditModal**

Just before the closing `</SafeAreaView>` (currently line 149), add:

```tsx
      {program && (
        <WeekEditModal
          visible={editingWeek !== null}
          weekNumber={editingWeek ?? 1}
          totalWeeks={program.weeks}
          currentName={editingWeek != null ? (weekData[editingWeek]?.name ?? '') : ''}
          currentDetails={editingWeek != null ? (weekData[editingWeek]?.details ?? '') : ''}
          onClose={() => setEditingWeek(null)}
          onSave={handleSaveWeek}
        />
      )}
```

- [ ] **Step 6: Run the new screen test**

Run: `npx jest src/screens/__tests__/CustomizeWeeksScreen.test.tsx`

Expected: All three tests PASS.

If a test fails on `getByText('W2')` because the text is split across multiple `<Text>` nodes, fall back to using `getByText(/^W2/)` with a regex — but try the literal match first since the rendered output should be a single text node containing exactly `W2` (the name follows in a sibling `<Text>`).

- [ ] **Step 7: Run the full test suite to confirm no regressions**

Run: `npx jest`

Expected: All tests PASS. The DB-layer tests for `upsertWeekData` already exist and should continue passing untouched. The `ProgramDetailScreen` test should be unaffected (no changes to that screen).

- [ ] **Step 8: Type-check**

Run: `npx tsc --noEmit`

Expected: No type errors. The new `WeekEditModal` import is valid, `ProgramWeek` is exported from `src/types`, and `upsertWeekData` is already exported from `src/db/programs`.

- [ ] **Step 9: Commit the implementation**

```bash
git add src/screens/CustomizeWeeksScreen.tsx
git commit -m "feat(customize-weeks): tap any week header to edit name & details

Lets users prep week metadata before starting a program, and lets
active-program users edit any week without advancing through it.
Reuses existing WeekEditModal — no UI/DB changes."
```

---

## Task 3: Manual verification on emulator

**Files:** none (verification only)

The change is UI-driven and the app's primary verification mode is on-device. Run through the spec's manual test cases.

- [ ] **Step 1: Build and deploy to emulator**

Use the `/deploy` skill (auto-builds release APK and installs on emulator):

```
/deploy
```

Expected: `BUILD SUCCESSFUL`, then `adb install` reports `Success`.

- [ ] **Step 2: Test case 1 — Not-started program, prepare week 2**

In the app:
1. Programs tab → create a new program with 5 weeks (do not start it).
2. Open the program → tap **Customize Weeks**.
3. Tap the **W2** header row.
4. Modal opens with both fields empty.
5. Enter name "Volume" and a short details string.
6. Tap **Save**.
7. The W2 row should now display `W2  Volume` with `inherits base` on the right.

- [ ] **Step 3: Test case 2 — Re-edit seeds correctly**

Tap the **W2** row again. The modal opens with "Volume" and the details string pre-populated.

- [ ] **Step 4: Test case 3 — Clear reverts**

Clear both the name and details fields. Tap **Save**. The W2 row reverts to just `W2` (no name suffix). The DB row was deleted via the existing logic in `upsertWeekData:503-509`.

- [ ] **Step 5: Test case 4 — Active-program parity gain**

1. Activate the same program (from the program detail screen, tap **Start Program**).
2. Stay on week 1 (current week is 1).
3. Open Customize Weeks.
4. Tap the **W5** header row.
5. Edit week 5's name (e.g., "Peak Week") and save.
6. Confirm W5 row shows the new name without advancing the current week.

- [ ] **Step 6: Test case 5 — Existing flows unchanged**

On the active program:
1. Return to the program detail screen.
2. Tap the "+ Add week name & details" prompt (visible because week 1 has no name).
3. The same `WeekEditModal` opens for week 1 — confirm it works as before.

Also confirm tapping an individual day row (e.g., `Day 1` under `W2`) still navigates to the per-day editor.

- [ ] **Step 7: Confirm completion**

If all six test cases pass, the implementation is complete. If any fail, capture the failure (screenshot + which step) and fix before declaring done.

---

## Out of scope (do not implement)

- Any change to `ProgramDetailScreen.tsx` — current activation-aware UI stays as-is.
- Any change to `WeekEditModal.tsx` — used as-is, no new props.
- Any DB migration — `program_weeks` table already supports this case.
- Any new visual chrome on the week header (no pencil, no pill, no chevron) — per spec.
- Optimistic UI updates — `refresh()` call is the source of truth.
