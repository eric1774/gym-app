# Phase 36: Goal Setting & Stats - Research

**Researched:** 2026-04-05
**Domain:** React Native UI — conditional rendering, inline editing, stat card components
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**First-Use Setup Card**
- D-01: When goal_oz is null, display a full-width surface-colored card centered where the cup would be — the cup, quick-add buttons, and Log Water button are all hidden until a goal is set
- D-02: Setup card contains: title ("Set Your Daily Water Goal"), a TextInput pre-filled with 64, "fl oz" suffix label, and a mint "Set Goal" button
- D-03: After saving the goal, the setup card disappears and the full hydration view (cup + goal label + stats + quick-add + Log Water) renders instantly — no animation
- D-04: Conditional rendering at the HydrationView level: `goalOz === null ? <GoalSetupCard /> : <FullHydrationContent />`

**Goal Label & Inline Editing**
- D-05: A "GOAL: X fl oz" label centered below the cup, styled as secondary text — acts as the tap target for editing
- D-06: Tapping the goal label swaps it to an inline edit row: TextInput pre-filled with current goal + "fl oz" suffix + Save and Cancel buttons — same pattern as MacroProgressCard inline editing
- D-07: Save calls hydrationDb.setWaterGoal, then immediately recalculates cup fill percentage, streak, and weekly average via refreshData
- D-08: Cancel restores the label without changes, no keyboard dismiss animation needed

**Streak & Average Stats**
- D-09: Two stat cards side-by-side in a row below the goal label: left card shows streak (fire emoji + "X day streak"), right card shows weekly average (large percentage + "7-day avg" label)
- D-10: Weekly average displays as percentage: `Math.round((avgOz / goalOz) * 100)` + "%" (hydrationDb.get7DayAverage returns raw oz)
- D-11: When no data exists: cards always visible — streak shows "0 days", average shows "—" or "0%"
- D-12: Stat cards are new components — do NOT reuse StreakAverageRow (protein-specific with "Xg" formatting)

**Layout & Positioning**
- D-13: Full view element order (top to bottom): Cup hero → Goal label → Stat cards row → Quick-add section → Log Water button
- D-14: Stat cards use surfaceElevated background, border, and border-radius matching the quick-add buttons

### Claude's Discretion
- Exact spacing between goal label and stat cards
- GoalSetupCard internal layout (padding, input width, button sizing)
- Stat card icon/emoji choice for weekly average card
- Keyboard handling on inline goal edit (auto-focus, dismiss behavior)
- Validation for goal input (minimum value, non-numeric rejection)
- Whether stat card text uses weightBold or weightSemiBold

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope

</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| GOAL-01 | User sees a first-use setup card prompting them to set a daily water goal in fl oz (default 64) when no goal exists | GoalSetupCard component pattern from GoalSetupForm.tsx; HydrationView null-goal conditional render |
| GOAL-02 | User can tap the goal display to inline-edit their water goal, with save/cancel and immediate recalculation of stats | MacroProgressCard.tsx inline edit state pattern; hydrationDb.setWaterGoal + refreshData |
| HYD-04 | User can see their current hydration streak (consecutive days meeting goal) and weekly average (% of goal met over 7 days) | hydrationDb.getStreakDays and get7DayAverage already implemented; HydrationStatCards component |

</phase_requirements>

---

## Summary

Phase 36 is a pure UI build on top of a complete data foundation. All four required DB functions (`getWaterGoal`, `setWaterGoal`, `getStreakDays`, `get7DayAverage`) are implemented and tested in Phase 34. The hydration.ts module is frozen — this phase only adds UI state management, new child components, and wires them into the existing `HydrationView.tsx`.

The implementation follows two well-established patterns already in the codebase: `GoalSetupForm.tsx` (first-use onboarding card with TextInput + submit button) and `MacroProgressCard.tsx` (inline goal editing with `editingMacro` state toggling between display and edit modes). Both patterns can be adapted almost directly for their hydration equivalents.

The key architectural change is that `HydrationView.tsx` must shift from its current hardcoded 64 oz default to proper null-awareness: `goalOz` state must become `number | null`, and the component must fetch streak + average in `refreshData` alongside the existing total + goal fetch. The two new components (`GoalSetupCard.tsx` and `HydrationStatCards.tsx`) are self-contained and receive their data as props from `HydrationView`.

**Primary recommendation:** Extend `HydrationView` state management first (null-aware goalOz, streak/average state, refreshData expansion), then build GoalSetupCard and HydrationStatCards as simple presentational components with local edit state where needed.

---

## Standard Stack

### Core (all already installed)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| react-native | project version | TextInput, TouchableOpacity, View, StyleSheet | Native primitives for all UI |
| @react-navigation/native | project version | useFocusEffect for data refresh on tab focus | Already used in HydrationView |
| react-native-haptic-feedback | project version | Haptic feedback on quick-add | Already used in HydrationView |

No new packages required. [VERIFIED: codebase grep of HydrationView.tsx imports]

---

## Architecture Patterns

### Recommended Component Structure
```
src/components/
├── HydrationView.tsx        # MODIFIED — null-aware goalOz, streak/avg state, refreshData expansion
├── GoalSetupCard.tsx        # NEW — first-use card (~60-80 lines)
└── HydrationStatCards.tsx   # NEW — two side-by-side stat cards (~80-100 lines)
```

### Pattern 1: Null-Aware goalOz State in HydrationView

**What:** Change `goalOz` from `number` (hardcoded 64 default) to `number | null`. When `null`, render `<GoalSetupCard />` instead of the full hydration content. When set, render full view including cup, goal label (or inline edit), stat cards, quick-add, and Log Water button.

**Current state (Phase 35 D-09, to be replaced):**
```typescript
// Source: src/components/HydrationView.tsx line 22
const [goalOz, setGoalOz] = useState<number>(64); // D-09: hardcoded 64 default
```

**Target state:**
```typescript
// goalOz is null until user sets a goal (Phase 36 GOAL-01)
const [goalOz, setGoalOz] = useState<number | null>(null);
const [streakDays, setStreakDays] = useState<number>(0);
const [weeklyAvgOz, setWeeklyAvgOz] = useState<number | null>(null);
```

**refreshData expansion — add streak and average fetches:**
```typescript
const refreshData = useCallback(async () => {
  const [total, settings, streak, avgOz] = await Promise.all([
    hydrationDb.getTodayWaterTotal(),
    hydrationDb.getWaterGoal(),
    hydrationDb.getStreakDays(),
    hydrationDb.get7DayAverage(),
  ]);
  setCurrentTotal(total);
  setGoalOz(settings?.goalOz ?? null);
  setStreakDays(streak);
  setWeeklyAvgOz(avgOz);
}, []);
```

**Conditional render (D-04):**
```typescript
{goalOz === null ? (
  <GoalSetupCard onGoalSet={refreshData} />
) : (
  <FullHydrationContent ... />
)}
```

[VERIFIED: codebase — HydrationView.tsx lines 22-35, hydration.ts exports]

### Pattern 2: GoalSetupCard — Onboarding Card

**What:** Displayed when `goalOz === null`. Mirrors `GoalSetupForm.tsx` pattern but for water goal with 64 oz pre-filled default and "fl oz" suffix label.

**Key differences from GoalSetupForm:**
- Pre-filled default (`value` state starts as `'64'`, not empty `''`)
- "fl oz" suffix label rendered next to the TextInput
- Uses `colors.surfaceElevated` background (not `colors.surface`) to match hydration card style (D-14)
- Submit button labeled "Set Goal", styled with `colors.accent` background
- On success: calls `onGoalSet()` callback (which triggers refreshData in parent) — no local state change needed, parent's goalOz going non-null triggers re-render

**Props interface:**
```typescript
interface GoalSetupCardProps {
  onGoalSet: () => Promise<void>;
}
```

**Validation pattern (from GoalSetupForm.tsx lines 24-28):**
```typescript
// Source: src/components/GoalSetupForm.tsx
const parsed = parseInt(value, 10);
if (isNaN(parsed) || parsed <= 0) {
  setError('Please enter a number greater than 0');
  return;
}
```

**Minimum validation recommendation (Claude's Discretion):** Enforce minimum of 1 oz (already covered by `parsed <= 0` check). No maximum needed — the DB stores whatever the user sets, and the cup caps at 100% fill.

[VERIFIED: codebase — GoalSetupForm.tsx]

### Pattern 3: Inline Goal Edit in HydrationView

**What:** A "GOAL: X fl oz" label (secondary text, centered) below the cup. Tapping it enters inline edit mode — a TextInput pre-filled with current goal + "fl oz" suffix label + Save and Cancel buttons.

**State required (local to HydrationView or extracted to FullHydrationContent):**
```typescript
const [editingGoal, setEditingGoal] = useState(false);
const [editGoalValue, setEditGoalValue] = useState('');
const [editGoalError, setEditGoalError] = useState<string | null>(null);
```

**handleStartGoalEdit:**
```typescript
const handleStartGoalEdit = useCallback(() => {
  setEditGoalValue(goalOz !== null ? String(goalOz) : '64');
  setEditGoalError(null);
  setEditingGoal(true);
}, [goalOz]);
```

**handleSaveGoal:**
```typescript
const handleSaveGoal = useCallback(async () => {
  const parsed = parseInt(editGoalValue, 10);
  if (isNaN(parsed) || parsed <= 0) {
    setEditGoalError('Please enter a number greater than 0');
    return;
  }
  setEditGoalError(null);
  try {
    await hydrationDb.setWaterGoal(parsed);
    await refreshData();    // D-07: recalculates cup fill, streak, avg
    setEditingGoal(false);
  } catch {
    setEditGoalError('Failed to update goal. Please try again.');
  }
}, [editGoalValue, refreshData]);
```

**handleCancelGoalEdit:**
```typescript
const handleCancelGoalEdit = useCallback(() => {
  setEditingGoal(false);
  setEditGoalError(null);
}, []);
```

[VERIFIED: codebase — MacroProgressCard.tsx lines 42-74 (reference pattern)]

### Pattern 4: HydrationStatCards — Two Side-by-Side Cards

**What:** Two equal-width cards in a flexDirection: 'row' container below the goal label. Left: streak (fire emoji + count + "day streak" label). Right: weekly average (percentage + "7-day avg" label). Always visible even when data is zero/null (D-11).

**Weekly average computation (D-10):**
```typescript
// weeklyAvgOz comes from hydrationDb.get7DayAverage() — raw oz or null
// goalOz is guaranteed non-null when stat cards are rendered
const weeklyAvgPct = weeklyAvgOz !== null && goalOz !== null
  ? Math.round((weeklyAvgOz / goalOz) * 100)
  : null;

// Display: weeklyAvgPct !== null ? `${weeklyAvgPct}%` : '—'
```

**Props interface:**
```typescript
interface HydrationStatCardsProps {
  streakDays: number;
  weeklyAvgOz: number | null;
  goalOz: number;  // guaranteed non-null when rendered
}
```

**Layout pattern (matching quick-add button style per D-14):**
```typescript
// Each card: flex 1, surfaceElevated bg, borderRadius 10, borderWidth 1, borderColor colors.border
// Container: flexDirection 'row', gap spacing.sm, paddingHorizontal spacing.base
```

**D-11 zero-state handling:**
- Streak: `streakDays === 0` → display "0 days" (not hidden)
- Average: `weeklyAvgOz === null` → display "—"; if `weeklyAvgPct === 0` → display "0%"

[VERIFIED: codebase — HydrationView.tsx quick-add button styles (lines 138-144); CONTEXT.md D-11, D-14]

### Anti-Patterns to Avoid

- **Reusing StreakAverageRow:** D-12 explicitly prohibits this — it shows protein grams ("Xg") and hides itself when both values are zero. Hydration stat cards always show and use percentage/day-count format.
- **Hardcoded 64 in HydrationView:** The current `useState<number>(64)` default must become `useState<number | null>(null)` — the setup card only appears because goalOz starts null from the DB.
- **WaterCup rendered when goalOz is null:** D-01 specifies the cup is hidden until goal is set. Passing `goalOz={64}` as a fallback while showing the setup card would render both simultaneously.
- **Fetching streak/average before goal is set:** `getStreakDays()` returns 0 if no goal exists (verified in hydration.ts lines 149-154), so it's safe to fetch always — no need to guard the Promise.all call.
- **Separate refreshData calls for save:** D-07 says `setWaterGoal` then `refreshData` — a single `refreshData` after `setWaterGoal` fetches goal + total + streak + average in one Promise.all, which is correct.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Upsert goal (insert or update) | Custom INSERT/UPDATE logic | `hydrationDb.setWaterGoal(oz)` | Already implements upsert pattern (hydration.ts lines 62-80) |
| Streak calculation | Custom day iteration | `hydrationDb.getStreakDays()` | Already handles today/yesterday edge cases and gap detection |
| 7-day average | Custom date range query | `hydrationDb.get7DayAverage()` | Already returns raw oz, divide-by-7-always (Phase 34 D-10) |
| Inline edit pattern | Custom input component | Copy MacroProgressCard pattern | editingMacro/editValue/editError pattern is battle-tested |
| Goal setup form | Custom form component | Copy GoalSetupForm pattern | Identical validation + submit pattern, just different content |

**Key insight:** All DB work is done. All UI patterns are already established in the codebase. This phase is pure assembly of known patterns into new components.

---

## Common Pitfalls

### Pitfall 1: WaterCup Division by Zero
**What goes wrong:** `WaterCup` receives `goalOz={0}` or `goalOz={null}` and produces NaN/Infinity for fill percentage.
**Why it happens:** If the conditional render guard (`goalOz === null`) is bypassed or goalOz somehow becomes 0.
**How to avoid:** The conditional render `goalOz === null ? <GoalSetupCard /> : <FullHydrationContent />` ensures WaterCup is never rendered when goalOz is null. Additionally, enforce `parsed > 0` validation in both GoalSetupCard and inline edit save (already covers the zero case).
**Warning signs:** Cup renders as empty or shows NaN% in the WaterCup accessibilityLabel.

### Pitfall 2: Stale goalOz After Inline Save
**What goes wrong:** After saving a new goal via inline edit, the cup fill percentage and stats don't update until the next focus event.
**Why it happens:** Calling `setWaterGoal` without also calling `refreshData` — the parent's state doesn't update.
**How to avoid:** D-07 is explicit: save calls `hydrationDb.setWaterGoal`, then immediately calls `refreshData`. The `refreshData` callback fetches goal + total + streak + average from DB, updating all state in one render cycle.
**Warning signs:** Goal label updates (local optimistic update) but cup fill % and stat cards show old values.

### Pitfall 3: goalOz State Type Mismatch
**What goes wrong:** TypeScript type errors because `goalOz` is typed as `number` but DB returns `number | null`.
**Why it happens:** HydrationView currently types goalOz as `number` with a hardcoded 64 default (line 22). Changing the DB fetch to pass `settings?.goalOz ?? null` without updating the state type causes a TS error.
**How to avoid:** Update state declaration to `useState<number | null>(null)` at the same time as changing the refreshData logic. Ensure `HydrationStatCards` props type `goalOz: number` (non-null, since it's only rendered when goalOz is non-null).
**Warning signs:** TypeScript compile error on `setGoalOz(settings?.goalOz ?? null)`.

### Pitfall 4: GoalSetupCard Not Pre-Filling 64
**What goes wrong:** User sees an empty TextInput instead of pre-filled 64.
**Why it happens:** Initializing `value` state as `''` (like GoalSetupForm) instead of `'64'`.
**How to avoid:** `const [value, setValue] = useState('64')`. The placeholder prop should not be used as the default — the state itself holds `'64'` so it appears in the input without user action.
**Warning signs:** Setup card shows an empty input, user must type a value to submit.

### Pitfall 5: Inline Edit Not Auto-Focusing
**What goes wrong:** Keyboard does not appear when user taps the goal label to edit.
**Why it happens:** TextInput rendered without `autoFocus` prop.
**How to avoid:** Add `autoFocus` to the inline edit TextInput (same as MacroProgressCard line 105 and GoalSetupForm line 59). This is a Claude's Discretion item but the MacroProgressCard reference is clear.
**Warning signs:** User taps goal label, edit mode renders, but keyboard stays hidden.

### Pitfall 6: Streak/Average fetch null-guarding
**What goes wrong:** `getStreakDays()` or `get7DayAverage()` throw or return unexpected values when no goal or no logs exist.
**Why it happens:** Misunderstanding the DB contracts.
**How to avoid:** Confirmed from hydration.ts:
- `getStreakDays()` returns `0` if no water_settings row exists or goal_oz is null (lines 149-154) — safe to call always.
- `get7DayAverage()` returns `null` if no logs in last 7 days (lines 247-252) — UI must handle null (show "—").
**Warning signs:** Runtime errors or unexpected NaN in stat cards.

---

## Code Examples

### HydrationView State Expansion
```typescript
// Source: src/components/HydrationView.tsx (current lines 20-35, to be modified)
// Change goalOz type from number to number | null
const [goalOz, setGoalOz] = useState<number | null>(null);
const [streakDays, setStreakDays] = useState<number>(0);
const [weeklyAvgOz, setWeeklyAvgOz] = useState<number | null>(null);

const refreshData = useCallback(async () => {
  const [total, settings, streak, avgOz] = await Promise.all([
    hydrationDb.getTodayWaterTotal(),
    hydrationDb.getWaterGoal(),
    hydrationDb.getStreakDays(),
    hydrationDb.get7DayAverage(),
  ]);
  setCurrentTotal(total);
  setGoalOz(settings?.goalOz ?? null);
  setStreakDays(streak);
  setWeeklyAvgOz(avgOz);
}, []);
```

### GoalSetupCard Skeleton
```typescript
// New file: src/components/GoalSetupCard.tsx
import React, { useState } from 'react';
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { hydrationDb } from '../db';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { fontSize, weightBold, weightSemiBold } from '../theme/typography';

interface GoalSetupCardProps {
  onGoalSet: () => Promise<void>;
}

export function GoalSetupCard({ onGoalSet }: GoalSetupCardProps) {
  const [value, setValue] = useState('64');  // Pre-filled default per D-02
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    const parsed = parseInt(value, 10);
    if (isNaN(parsed) || parsed <= 0) {
      setError('Please enter a number greater than 0');
      return;
    }
    setIsSubmitting(true);
    setError(null);
    try {
      await hydrationDb.setWaterGoal(parsed);
      await onGoalSet();
    } catch {
      setError('Failed to save goal. Please try again.');
      setIsSubmitting(false);
    }
  };

  return (
    <View style={styles.card}>
      <Text style={styles.title}>Set Your Daily Water Goal</Text>
      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          value={value}
          onChangeText={setValue}
          keyboardType="number-pad"
          maxLength={4}
          autoFocus
          returnKeyType="done"
          onSubmitEditing={handleSubmit}
        />
        <Text style={styles.suffix}>fl oz</Text>
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <TouchableOpacity
        style={[styles.button, isSubmitting && styles.buttonDisabled]}
        onPress={handleSubmit}
        disabled={isSubmitting}>
        <Text style={styles.buttonText}>Set Goal</Text>
      </TouchableOpacity>
    </View>
  );
}
```

### HydrationStatCards Skeleton
```typescript
// New file: src/components/HydrationStatCards.tsx
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { fontSize, weightBold, weightSemiBold } from '../theme/typography';

interface HydrationStatCardsProps {
  streakDays: number;
  weeklyAvgOz: number | null;
  goalOz: number;  // guaranteed non-null when rendered
}

export const HydrationStatCards = React.memo(function HydrationStatCards({
  streakDays,
  weeklyAvgOz,
  goalOz,
}: HydrationStatCardsProps) {
  const weeklyAvgPct = weeklyAvgOz !== null
    ? Math.round((weeklyAvgOz / goalOz) * 100)
    : null;

  return (
    <View style={styles.row}>
      {/* Streak card */}
      <View style={styles.card}>
        <Text style={styles.cardValue}>{streakDays}</Text>
        <Text style={styles.cardLabel}>day streak</Text>
      </View>

      {/* Weekly average card */}
      <View style={styles.card}>
        <Text style={styles.cardValue}>
          {weeklyAvgPct !== null ? `${weeklyAvgPct}%` : '—'}
        </Text>
        <Text style={styles.cardLabel}>7-day avg</Text>
      </View>
    </View>
  );
});
```

### Inline Goal Edit Pattern (from MacroProgressCard reference)
```typescript
// Source: src/components/MacroProgressCard.tsx lines 42-74
// In HydrationView, adapt as:
const [editingGoal, setEditingGoal] = useState(false);
const [editGoalValue, setEditGoalValue] = useState('');
const [editGoalError, setEditGoalError] = useState<string | null>(null);

// Display vs edit mode toggle:
{editingGoal ? (
  <View style={styles.goalEditRow}>
    <TextInput
      style={styles.goalEditInput}
      value={editGoalValue}
      onChangeText={setEditGoalValue}
      keyboardType="number-pad"
      maxLength={4}
      autoFocus
      returnKeyType="done"
      onSubmitEditing={handleSaveGoal}
    />
    <Text style={styles.goalEditSuffix}>fl oz</Text>
    <TouchableOpacity onPress={handleSaveGoal}>
      <Text>Save</Text>
    </TouchableOpacity>
    <TouchableOpacity onPress={handleCancelGoalEdit}>
      <Text>Cancel</Text>
    </TouchableOpacity>
  </View>
) : (
  <TouchableOpacity onPress={handleStartGoalEdit}>
    <Text style={styles.goalLabel}>GOAL: {goalOz} fl oz</Text>
  </TouchableOpacity>
)}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Hardcoded 64 oz default in HydrationView | null-aware goalOz driving setup card | Phase 36 (this phase) | Cup only renders when goal exists |
| No streak/avg data fetched | refreshData fetches all 4 hydration values | Phase 36 (this phase) | Single Promise.all keeps refresh efficient |

**Deprecated/outdated:**
- `goalOz: number` state type in HydrationView: Must become `number | null` (Phase 35 D-09 comment "hardcoded 64 default" is explicitly replaced by this phase per CONTEXT.md D-04).

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `getStreakDays()` is safe to call when no goal is set (returns 0) | Common Pitfalls 6 | If it throws, Promise.all in refreshData fails; LOW risk — verified in hydration.ts lines 149-154 |
| A2 | WaterCup.tsx requires no props changes this phase | Architecture Patterns | If WaterCup interface changes, task estimates are off; LOW risk — CONTEXT.md confirms "no changes expected" |

**Both assumptions are LOW risk and verified against source files.**

---

## Open Questions

1. **Inline goal edit placement in component tree**
   - What we know: D-06 says same pattern as MacroProgressCard inline editing; `editingGoal` state can live in HydrationView or in a dedicated `FullHydrationContent` sub-component
   - What's unclear: Whether to keep all inline-edit state in HydrationView (simpler) or extract FullHydrationContent as a separate component
   - Recommendation: Keep inline-edit state in HydrationView for simplicity. The component will grow but stays well under 200 lines. Only extract if the planner identifies that as a separate task boundary.

2. **"fl oz" suffix layout for inline edit**
   - What we know: Both GoalSetupCard (D-02) and inline edit (D-06) need an "fl oz" suffix next to the TextInput
   - What's unclear: Whether suffix is a View sibling to TextInput (flexDirection row) or appended text
   - Recommendation: `flexDirection: 'row'` container with TextInput + Text suffix. TextInput has `flex: 1` and the suffix Text has fixed width. This matches the MacroProgressCard pattern's `g` unit display.

---

## Environment Availability

Step 2.6: SKIPPED — this phase is UI-only (new components, state changes, no new external dependencies). All libraries are already installed.

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Jest + React Native Testing Library (react-native preset) |
| Config file | `jest.config.js` (project root) |
| Quick run command | `npx jest --testPathPattern="GoalSetupCard\|HydrationStatCards" --no-coverage` |
| Full suite command | `npx jest --coverage` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| GOAL-01 | GoalSetupCard renders with pre-filled 64 and "Set Your Daily Water Goal" title | unit | `npx jest GoalSetupCard.test --no-coverage` | Wave 0 |
| GOAL-01 | GoalSetupCard shows error for invalid input (0, empty, non-numeric) | unit | `npx jest GoalSetupCard.test --no-coverage` | Wave 0 |
| GOAL-01 | GoalSetupCard calls hydrationDb.setWaterGoal and onGoalSet callback on valid submit | unit | `npx jest GoalSetupCard.test --no-coverage` | Wave 0 |
| GOAL-02 | HydrationStatCards renders streak count and weekly avg percentage | unit | `npx jest HydrationStatCards.test --no-coverage` | Wave 0 |
| GOAL-02 | HydrationStatCards shows "—" when weeklyAvgOz is null | unit | `npx jest HydrationStatCards.test --no-coverage` | Wave 0 |
| GOAL-02 | HydrationStatCards shows "0 days" and "0%" / "—" when no data | unit | `npx jest HydrationStatCards.test --no-coverage` | Wave 0 |
| HYD-04 | Weekly avg percentage computed as Math.round(avgOz / goalOz * 100) | unit | `npx jest HydrationStatCards.test --no-coverage` | Wave 0 |

### Sampling Rate
- **Per task commit:** `npx jest --testPathPattern="GoalSetupCard\|HydrationStatCards" --no-coverage`
- **Per wave merge:** `npx jest --coverage`
- **Phase gate:** Full suite green before `/gsd-verify-work`

### Wave 0 Gaps
- [ ] `src/components/__tests__/GoalSetupCard.test.tsx` — covers GOAL-01
- [ ] `src/components/__tests__/HydrationStatCards.test.tsx` — covers GOAL-02, HYD-04
- [ ] Mock for `hydrationDb` (follow pattern from GoalSetupForm.test.tsx: `jest.mock('../../db', () => ({ hydrationDb: { ... } }))`)

---

## Security Domain

This phase contains no authentication, session management, cryptography, or network calls. All data is local SQLite via hydrationDb (already reviewed in Phase 34). Input validation (non-numeric rejection, minimum value enforcement) is the only applicable control.

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V5 Input Validation | yes | `parseInt(value, 10)` + `isNaN(parsed) || parsed <= 0` guard (same pattern as GoalSetupForm.tsx and MacroProgressCard.tsx) |
| V2 Authentication | no | Local-only app, no auth |
| V3 Session Management | no | Local-only app, no sessions |
| V4 Access Control | no | Single-user local app |
| V6 Cryptography | no | SQLite local storage, no encryption needed |

---

## Sources

### Primary (HIGH confidence)
- `src/components/HydrationView.tsx` — current state, modification target [VERIFIED: codebase read]
- `src/components/MacroProgressCard.tsx` — inline edit reference pattern [VERIFIED: codebase read]
- `src/components/GoalSetupForm.tsx` — setup card reference pattern [VERIFIED: codebase read]
- `src/db/hydration.ts` — all 4 required DB functions + null/zero return contracts [VERIFIED: codebase read]
- `src/theme/colors.ts` — color tokens [VERIFIED: codebase read]
- `src/theme/spacing.ts` — spacing scale [VERIFIED: codebase read]
- `src/theme/typography.ts` — fontSize + weight tokens [VERIFIED: codebase read]
- `src/components/StreakAverageRow.tsx` — confirmed NOT to reuse (protein-specific) [VERIFIED: codebase read]
- `.planning/phases/36-goal-setting-stats/36-CONTEXT.md` — locked decisions D-01 through D-14 [VERIFIED: read]
- `jest.config.js` + `src/components/__tests__/GoalSetupForm.test.tsx` — test patterns [VERIFIED: codebase read]

### Secondary (MEDIUM confidence)
None required — all research findings are verified against codebase source files.

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — no new packages; all imports verified in existing source files
- Architecture: HIGH — patterns copied from working MacroProgressCard and GoalSetupForm
- Pitfalls: HIGH — identified from actual type contracts in hydration.ts and current HydrationView state types
- Test patterns: HIGH — verified from existing test files in `src/components/__tests__/`

**Research date:** 2026-04-05
**Valid until:** 2026-05-05 (stable codebase, no moving dependencies)
