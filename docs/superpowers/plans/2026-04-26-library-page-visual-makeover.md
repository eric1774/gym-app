# Library Page Visual Makeover Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restyle `LibraryScreen` and `WarmupTemplateListScreen` to the v6 B-lite intensity defined in [`docs/superpowers/specs/2026-04-26-library-page-visual-makeover-design.md`](../specs/2026-04-26-library-page-visual-makeover-design.md) — AB-1 header (eyebrow + display title + mint radial), category-tinted Exercises, amber-tinted Warmups, no DB or navigation changes.

**Architecture:** Lift `newNameModalVisible` from `WarmupTemplateListScreen` into `LibraryScreen` so the new header `+` button can route the create action by `activeSubTab`. Reuse the existing `<MintRadial>` component for page-level atmosphere (full-screen mode, no offsets). Reuse existing `<Plus />` and `<Dumbbell />` icons. One new icon: `<SearchIcon />`. Pure stylesheet work in `ExerciseCategoryTabs` (active/inactive pill colors) and `ExerciseListItem` (accent bar color).

**Tech Stack:** React Native + TypeScript + Jest + @testing-library/react-native + `react-native-svg` (already installed). No new npm dependencies. No new theme tokens.

**Out of scope for this plan:** AddExerciseModal styling, WarmupTemplateDetailScreen, DB queries, navigation, swipe-to-delete pan-responder, long-press-to-edit flow. (See spec.)

---

## File Structure

**New files:**
- `src/components/icons/SearchIcon.tsx` — magnifying-glass SVG, follows `Trophy.tsx` pattern
- `src/components/icons/__tests__/SearchIcon.test.tsx`

**Modified files:**
- `src/components/ExerciseCategoryTabs.tsx` — active/inactive pill colors driven by `getCategoryColor`
- `src/components/ExerciseListItem.tsx` — accent bar color driven by `getCategoryColor(exercise.category)`
- `src/screens/LibraryScreen.tsx` — header zone, sub-tab dynamic colors, search SVG, section eyebrow, FAB removed, empty state icon, lifted modal-visibility state, header `+` routing
- `src/screens/WarmupTemplateListScreen.tsx` — drop in-screen section row, accept new `newNameModalVisible`/`onCloseNewNameModal` props, add amber eyebrow, restyle template card with number chip
- `src/screens/__tests__/LibraryScreen.test.tsx` — update `'Exercise Library'` → `'Library'`, swap `getByText('+')` for `getByLabelText('Add')`, add coverage for warmups-tab + button routing

**Unchanged (verified):**
- All `src/db/*` files
- `src/navigation/LibraryStackNavigator.tsx`
- `src/theme/colors.ts` (every token already exists)
- `src/components/MintRadial.tsx` (used as-is in full-screen mode)
- `src/components/icons/Plus.tsx`, `src/components/icons/Dumbbell.tsx` (reused)
- `src/screens/AddExerciseModal.tsx`, `src/screens/WarmupTemplateDetailScreen.tsx`
- `src/types/index.ts`

---

## Task 1: Test prep — make existing tests resilient

**Why first:** Several existing assertions (`'Exercise Library'`, `getByText('+')`) will break under the redesign. We update the test file first so subsequent tasks can be verified continuously without false-failure noise.

**Files:**
- Modify: `src/screens/__tests__/LibraryScreen.test.tsx`

- [ ] **Step 1: Read the current test file**

Run: `cat src/screens/__tests__/LibraryScreen.test.tsx`

Note the assertions at lines 50, 122, 127, 134 — these are the four that change.

- [ ] **Step 2: Update the title assertion**

In `src/screens/__tests__/LibraryScreen.test.tsx`, change:

```typescript
it('renders Exercise Library title', async () => {
  const { getByText } = renderLibrary();
  expect(getByText('Exercise Library')).toBeTruthy();
});
```

to:

```typescript
it('renders Library title', async () => {
  const { getByText } = renderLibrary();
  expect(getByText('Library')).toBeTruthy();
});
```

- [ ] **Step 3: Update the FAB-presence test**

Change:

```typescript
it('shows + FAB button', async () => {
  const { getByText } = renderLibrary();
  expect(getByText('+')).toBeTruthy();
});
```

to:

```typescript
it('shows add button', async () => {
  const { getByLabelText } = renderLibrary();
  expect(getByLabelText('Add')).toBeTruthy();
});
```

- [ ] **Step 4: Update the FAB-press test**

Change:

```typescript
it('opens AddExerciseModal when + FAB is pressed', async () => {
  const { getByText, getAllByText } = renderLibrary();
  fireEvent.press(getByText('+'));
  await waitFor(() => expect(getAllByText('Add Exercise').length).toBeGreaterThanOrEqual(1));
});
```

to:

```typescript
it('opens AddExerciseModal when add button is pressed on Exercises tab', async () => {
  const { getByLabelText, getAllByText } = renderLibrary();
  fireEvent.press(getByLabelText('Add'));
  await waitFor(() => expect(getAllByText('Add Exercise').length).toBeGreaterThanOrEqual(1));
});
```

- [ ] **Step 5: Add new test for warmups-tab routing**

After the test from Step 4, add:

```typescript
it('opens new template modal when add button is pressed on Warmups tab', async () => {
  const { getByLabelText, getByText } = renderLibrary();
  fireEvent.press(getByText('Warmups'));
  fireEvent.press(getByLabelText('Add'));
  // New-template modal renders the heading "New Template"
  await waitFor(() => expect(getByText('New Template')).toBeTruthy());
});
```

- [ ] **Step 6: Run the suite — current code should still pass the unchanged tests**

Run: `npx jest src/screens/__tests__/LibraryScreen.test.tsx -t "renders category tabs|shows empty state|renders exercise list|searches exercises|hides category tabs|shows SEARCH section label|deletes exercise|opens edit modal|switches category"`

Expected: ALL PASS. (The four edited and one new test will FAIL — that is the TDD red bar. They drive the rest of the plan.)

- [ ] **Step 7: Confirm the new/edited tests fail for the right reason**

Run: `npx jest src/screens/__tests__/LibraryScreen.test.tsx -t "renders Library title|shows add button|opens AddExerciseModal when add button|opens new template modal"`

Expected: 4 FAIL. Failures should mention either `Unable to find an element with text: Library`, `Unable to find an element with accessibility label: Add`, or `Unable to find an element with text: Warmups`. If failures mention something else (a navigation crash, a DB import), stop and investigate.

- [ ] **Step 8: Commit**

```bash
git add src/screens/__tests__/LibraryScreen.test.tsx
git commit -m "test(library): prep for v6 visual makeover

Switch FAB-press tests to accessibilityLabel-based queries and add
warmups-tab + button routing test. Four tests now red, will pass
as the redesign tasks land.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 2: Add `<SearchIcon>` component

**Files:**
- Create: `src/components/icons/SearchIcon.tsx`
- Create: `src/components/icons/__tests__/SearchIcon.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `src/components/icons/__tests__/SearchIcon.test.tsx`:

```typescript
import React from 'react';
import { render } from '@testing-library/react-native';
import { SearchIcon } from '../SearchIcon';

describe('SearchIcon', () => {
  it('renders without crashing with default props', () => {
    const { toJSON } = render(<SearchIcon />);
    expect(toJSON()).toBeTruthy();
  });

  it('accepts size and color props', () => {
    const { toJSON } = render(<SearchIcon size={20} color="#FF0000" />);
    expect(toJSON()).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest src/components/icons/__tests__/SearchIcon.test.tsx`
Expected: FAIL with `Cannot find module '../SearchIcon'`.

- [ ] **Step 3: Implement `SearchIcon`**

Create `src/components/icons/SearchIcon.tsx`:

```typescript
import React from 'react';
import Svg, { Circle, Path } from 'react-native-svg';
import type { IconProps } from './types';

export function SearchIcon({ size = 16, color = '#8E9298' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx={11} cy={11} r={7} stroke={color} strokeWidth={1.6} />
      <Path d="M16 16l4 4" stroke={color} strokeWidth={1.6} strokeLinecap="round" />
    </Svg>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest src/components/icons/__tests__/SearchIcon.test.tsx`
Expected: PASS, 2 tests.

- [ ] **Step 5: Commit**

```bash
git add src/components/icons/SearchIcon.tsx src/components/icons/__tests__/SearchIcon.test.tsx
git commit -m "feat(icons): add SearchIcon SVG component

16×16 magnifying glass for the Library search row. Replaces the
🔍 emoji currently used as the search affordance.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 3: Restyle `<ExerciseCategoryTabs>` — category-tinted pills

**Files:**
- Modify: `src/components/ExerciseCategoryTabs.tsx`

- [ ] **Step 1: Read the current component**

Run: `cat src/components/ExerciseCategoryTabs.tsx`

Confirm it currently uses static `pillSelected`/`pillUnselected` styles with `colors.accent` and `#33373D`.

- [ ] **Step 2: Replace the file with the category-tinted version**

Overwrite `src/components/ExerciseCategoryTabs.tsx` with:

```typescript
import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity } from 'react-native';
import { colors, getCategoryColor } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { fontSize, weightBold } from '../theme/typography';
import { ExerciseCategory, EXERCISE_CATEGORIES } from '../types';

interface ExerciseCategoryTabsProps {
  selected: ExerciseCategory | null;
  onSelect: (c: ExerciseCategory) => void;
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** Append a hex alpha suffix to a 6-digit hex color. 0.14 → '24'. */
function withHexAlpha(hex: string, alpha: number): string {
  const a = Math.round(Math.max(0, Math.min(1, alpha)) * 255).toString(16).padStart(2, '0');
  return `${hex}${a}`;
}

export function ExerciseCategoryTabs({ selected, onSelect }: ExerciseCategoryTabsProps) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.container}
      contentContainerStyle={styles.content}>
      {EXERCISE_CATEGORIES.map(category => {
        const isSelected = category === selected;
        const tint = getCategoryColor(category);
        const pillStyle = isSelected
          ? { backgroundColor: tint }
          : { backgroundColor: withHexAlpha(tint, 0.14) };
        const textStyle = isSelected ? { color: colors.onAccent } : { color: tint };
        return (
          <TouchableOpacity
            key={category}
            onPress={() => onSelect(category)}
            style={[styles.pill, pillStyle]}>
            <Text style={[styles.pillText, textStyle]}>{capitalize(category)}</Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 0,
  },
  content: {
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
  pill: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: 20,
  },
  pillText: {
    fontSize: fontSize.sm,
    fontWeight: weightBold,
  },
});
```

- [ ] **Step 3: Run lint + typecheck**

Run: `npx tsc --noEmit && npx eslint src/components/ExerciseCategoryTabs.tsx`
Expected: clean, no errors.

- [ ] **Step 4: Run the full test suite for affected screens**

Run: `npx jest src/screens/__tests__/LibraryScreen.test.tsx`
Expected: same pass/fail set as after Task 1 — pill restyle is non-behavioral.

- [ ] **Step 5: Commit**

```bash
git add src/components/ExerciseCategoryTabs.tsx
git commit -m "feat(library): category-tinted pills via getCategoryColor

Active pill takes the category's color (chest=coral, back=blue, etc.)
with onAccent text. Inactive pill uses a 14% alpha tint of the same
color, full-strength text. No new tokens — uses existing
categoryColors map. Adds a small withHexAlpha helper local to the
component since no project-wide alpha utility exists.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 4: Restyle `<ExerciseListItem>` — category-color accent bar

**Files:**
- Modify: `src/components/ExerciseListItem.tsx`

- [ ] **Step 1: Read the current component to confirm the accent-bar location**

Run: `grep -n "accentBar\|backgroundColor: colors.accent" src/components/ExerciseListItem.tsx`

Expected: matches at the `<View style={styles.accentBar} />` JSX (~line 103) and the `accentBar` style definition (~line 204).

- [ ] **Step 2: Update the import to include `getCategoryColor`**

In `src/components/ExerciseListItem.tsx`, change:

```typescript
import { colors } from '../theme/colors';
```

to:

```typescript
import { colors, getCategoryColor } from '../theme/colors';
```

- [ ] **Step 3: Make the accent bar color category-driven**

Find this JSX:

```typescript
<View style={styles.accentBar} />
```

Replace with:

```typescript
<View
  style={[
    styles.accentBar,
    { backgroundColor: getCategoryColor(exercise.category) },
  ]}
/>
```

- [ ] **Step 4: Drop the now-overridden background from the style entry**

Find the `accentBar` style at the bottom of the file:

```typescript
accentBar: {
  width: 3,
  alignSelf: 'stretch',
  backgroundColor: colors.accent,
  borderRadius: 2,
  marginRight: spacing.md,
  marginLeft: spacing.md,
},
```

Replace with:

```typescript
accentBar: {
  width: 3,
  alignSelf: 'stretch',
  borderRadius: 2,
  marginRight: spacing.md,
  marginLeft: spacing.md,
},
```

(The inline `backgroundColor` from Step 3 takes over.)

- [ ] **Step 5: Run typecheck + tests**

Run: `npx tsc --noEmit && npx jest src/screens/__tests__/LibraryScreen.test.tsx -t "renders exercise list"`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/components/ExerciseListItem.tsx
git commit -m "feat(library): exercise card accent bar uses category color

Each card's 3px accent bar reads getCategoryColor(exercise.category)
instead of the hardcoded mint accent. Search-result lists now
visually segregate by body part. Mint remains the fallback for any
unmapped category.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 5: Lift `newNameModalVisible` from `WarmupTemplateListScreen` into `LibraryScreen`

**Why this comes before the LibraryScreen header restyle:** the new header `+` button needs the parent to own warmup-modal visibility, and we want the wiring change isolated in its own commit.

**Files:**
- Modify: `src/screens/WarmupTemplateListScreen.tsx`
- Modify: `src/screens/LibraryScreen.tsx`

- [ ] **Step 1: Add the new prop interface to `WarmupTemplateListScreen`**

In `src/screens/WarmupTemplateListScreen.tsx`, immediately above the `export function WarmupTemplateListScreen()` declaration, add:

```typescript
interface WarmupTemplateListScreenProps {
  /** Parent-owned visibility of the new-template name modal. */
  newNameModalVisible: boolean;
  /** Called when the modal should close (cancel, submit success, or backdrop tap). */
  onCloseNewNameModal: () => void;
}
```

- [ ] **Step 2: Accept the props in the function signature**

Change:

```typescript
export function WarmupTemplateListScreen() {
```

to:

```typescript
export function WarmupTemplateListScreen({
  newNameModalVisible,
  onCloseNewNameModal,
}: WarmupTemplateListScreenProps) {
```

- [ ] **Step 3: Remove the local `newNameModalVisible` state and `handleOpenNewModal`**

Delete these two blocks:

```typescript
// New template modal state
const [newNameModalVisible, setNewNameModalVisible] = useState(false);
const [newTemplateName, setNewTemplateName] = useState('');
const [isCreating, setIsCreating] = useState(false);
```

Replace with (keep the other two):

```typescript
const [newTemplateName, setNewTemplateName] = useState('');
const [isCreating, setIsCreating] = useState(false);
```

And delete:

```typescript
const handleOpenNewModal = () => {
  setNewTemplateName('');
  setNewNameModalVisible(true);
};
```

- [ ] **Step 4: Reset `newTemplateName` when the modal opens (replaces the old `handleOpenNewModal`)**

Add this effect just below the remaining `useState` calls:

```typescript
useEffect(() => {
  if (newNameModalVisible) {
    setNewTemplateName('');
  }
}, [newNameModalVisible]);
```

If `useEffect` is not yet imported, add it: `import React, { useCallback, useEffect, useState } from 'react';` (it likely already is).

- [ ] **Step 5: Replace `setNewNameModalVisible` calls with `onCloseNewNameModal`**

In `handleCreateTemplate`, change:

```typescript
setNewNameModalVisible(false);
setNewTemplateName('');
```

to:

```typescript
onCloseNewNameModal();
setNewTemplateName('');
```

In the `<Modal onRequestClose>` prop, change:

```typescript
onRequestClose={() => setNewNameModalVisible(false)}
```

to:

```typescript
onRequestClose={onCloseNewNameModal}
```

In the modal-overlay `Pressable`, change:

```typescript
onPress={() => setNewNameModalVisible(false)}
```

to:

```typescript
onPress={onCloseNewNameModal}
```

In the cancel `TouchableOpacity`, change:

```typescript
onPress={() => setNewNameModalVisible(false)}
```

to:

```typescript
onPress={onCloseNewNameModal}
```

- [ ] **Step 6: Update the `<Modal visible>` prop**

Change:

```typescript
<Modal
  visible={newNameModalVisible}
```

(no functional change — `newNameModalVisible` is now a prop, not state). Confirm the binding still resolves. No code change needed in this step beyond verification.

- [ ] **Step 7: Pass props from `LibraryScreen`**

In `src/screens/LibraryScreen.tsx`, find:

```typescript
{activeSubTab === 'warmups' ? (
  <WarmupTemplateListScreen />
) : (
```

Add the visibility state at the top of the `LibraryScreen` function (next to the existing `modalVisible`):

```typescript
const [newTemplateModalVisible, setNewTemplateModalVisible] = useState(false);
```

Then change the `<WarmupTemplateListScreen />` render to:

```typescript
<WarmupTemplateListScreen
  newNameModalVisible={newTemplateModalVisible}
  onCloseNewNameModal={() => setNewTemplateModalVisible(false)}
/>
```

- [ ] **Step 8: Typecheck**

Run: `npx tsc --noEmit`
Expected: clean — `LibraryScreen` and `WarmupTemplateListScreen` types match.

- [ ] **Step 9: Run the test suite — no behavior change yet**

Run: `npx jest src/screens/__tests__/LibraryScreen.test.tsx`
Expected: same red/green count as after Task 1 (the four prep tests still red until the header lands; everything else green).

- [ ] **Step 10: Commit**

```bash
git add src/screens/LibraryScreen.tsx src/screens/WarmupTemplateListScreen.tsx
git commit -m "refactor(library): lift new-template modal visibility to parent

Parent (LibraryScreen) now owns whether the new-template modal is
shown. Child (WarmupTemplateListScreen) keeps the create handler
and the form-input state. Preparatory refactor — no UX change in
this commit; the header-routed + button lands in the next task.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 6: New header zone — eyebrow, display title, Plus button, MintRadial atmosphere; drop floating FAB

**Files:**
- Modify: `src/screens/LibraryScreen.tsx`

This is the largest stylesheet change. It also flips the four red tests from Task 1 to green by introducing the new title and accessibility-labeled add button.

- [ ] **Step 1: Add new imports**

In `src/screens/LibraryScreen.tsx`, update the imports to:

```typescript
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { WarmupTemplateListScreen } from './WarmupTemplateListScreen';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { ExerciseCategoryTabs } from '../components/ExerciseCategoryTabs';
import { ExerciseListItem } from '../components/ExerciseListItem';
import { MintRadial } from '../components/MintRadial';
import { Plus } from '../components/icons/Plus';
import { deleteExercise, searchExercises } from '../db/exercises';
import { getExercisesByCategoryViaGroups } from '../db/muscleGroups';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { fontSize, weightBold } from '../theme/typography';
import { Exercise, ExerciseCategory } from '../types';
import { AddExerciseModal } from './AddExerciseModal';
```

- [ ] **Step 2: Replace the header JSX**

Find the current header block (the `<View style={styles.header}>` containing only `<Text style={styles.title}>Exercise Library</Text>`).

Replace with:

```typescript
<View style={styles.header}>
  <View style={styles.headerRow}>
    <View>
      <Text style={styles.eyebrow}>TRAINING</Text>
      <Text style={styles.title}>Library</Text>
    </View>
    <TouchableOpacity
      style={styles.addButton}
      onPress={handleAddPress}
      accessibilityLabel="Add"
      accessibilityRole="button">
      <Plus size={20} color={colors.onAccent} />
    </TouchableOpacity>
  </View>
</View>
```

- [ ] **Step 3: Add the `MintRadial` at the top of the SafeAreaView**

Inside the returned `<SafeAreaView style={styles.safeArea} edges={['top']}>`, make the very first child the radial:

```typescript
return (
  <SafeAreaView style={styles.safeArea} edges={['top']}>
    <MintRadial corner="tl" />
    <View style={styles.header}>
      ...
```

- [ ] **Step 4: Add `handleAddPress` above the `return`**

Just above the final `return (`, add:

```typescript
const handleAddPress = useCallback(() => {
  if (activeSubTab === 'warmups') {
    setNewTemplateModalVisible(true);
  } else {
    setModalVisible(true);
  }
}, [activeSubTab]);
```

- [ ] **Step 5: Remove the floating FAB block**

Delete the entire `<TouchableOpacity style={[styles.fab, ...]}>` ... `</TouchableOpacity>` block that currently sits above `<AddExerciseModal>`. The header `+` button is now the sole add affordance.

- [ ] **Step 6: Update the stylesheet — replace header styles, drop FAB styles**

Find the existing `header`, `title`, `fab`, and `fabText` style entries. Replace and remove as follows:

```typescript
// Replace existing `header` and `title`:
header: {
  paddingHorizontal: spacing.base,
  paddingTop: spacing.lg,
  paddingBottom: spacing.md,
},
headerRow: {
  flexDirection: 'row',
  alignItems: 'flex-end',
  justifyContent: 'space-between',
  gap: spacing.sm,
},
eyebrow: {
  color: colors.accent,
  fontSize: 11,
  fontWeight: '800',
  letterSpacing: 2.2,
  marginBottom: 4,
},
title: {
  fontSize: 30,
  fontWeight: '900',
  letterSpacing: -0.6,
  lineHeight: 30,
  color: colors.primary,
},
addButton: {
  width: 38,
  height: 38,
  borderRadius: 19,
  backgroundColor: colors.accent,
  alignItems: 'center',
  justifyContent: 'center',
},
```

Delete entirely:

```typescript
fab: { ... },
fabText: { ... },
```

- [ ] **Step 7: Remove the now-unused `insets.bottom` reference**

The FAB used `bottom: spacing.xl + insets.bottom`. With the FAB gone, you can also drop the `insets` line if nothing else uses it. Check:

Run: `grep -n "insets\." src/screens/LibraryScreen.tsx`

If the only remaining reference was the deleted FAB, delete the line `const insets = useSafeAreaInsets();` and remove `useSafeAreaInsets` from the imports. If anything else uses `insets`, leave them.

- [ ] **Step 8: Typecheck and lint**

Run: `npx tsc --noEmit && npx eslint src/screens/LibraryScreen.tsx`
Expected: clean.

- [ ] **Step 9: Run the suite — the four red tests from Task 1 should now go green**

Run: `npx jest src/screens/__tests__/LibraryScreen.test.tsx`
Expected: ALL PASS, including the four tests Task 1 reddened.

- [ ] **Step 10: Commit**

```bash
git add src/screens/LibraryScreen.tsx
git commit -m "feat(library): AB-1 header + drop FAB

Eyebrow TRAINING / display title 'Library', mint radial atmosphere
in the top-left, 38×38 mint + button routed by activeSubTab. Drops
the floating FAB — header + is the sole add affordance for both
sub-tabs. accessibilityLabel='Add' for test stability.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 7: LibraryScreen sub-tab bar — dynamic active color

**Files:**
- Modify: `src/screens/LibraryScreen.tsx`

- [ ] **Step 1: Compute the active color above the return**

Just above the `return (`, after `handleAddPress`, add:

```typescript
const subTabActiveColor =
  activeSubTab === 'warmups' ? colors.warmupAmber : colors.accent;
```

- [ ] **Step 2: Apply the dynamic color to the active tab**

Replace the current sub-tab JSX:

```typescript
<View style={styles.subTabBar}>
  <TouchableOpacity
    style={[styles.subTab, activeSubTab === 'exercises' && styles.subTabActive]}
    onPress={() => setActiveSubTab('exercises')}>
    <Text style={[styles.subTabText, activeSubTab === 'exercises' && styles.subTabTextActive]}>
      Exercises
    </Text>
  </TouchableOpacity>
  <TouchableOpacity
    style={[styles.subTab, activeSubTab === 'warmups' && styles.subTabActive]}
    onPress={() => setActiveSubTab('warmups')}>
    <Text style={[styles.subTabText, activeSubTab === 'warmups' && styles.subTabTextActive]}>
      Warmups
    </Text>
  </TouchableOpacity>
</View>
```

with:

```typescript
<View style={styles.subTabBar}>
  <TouchableOpacity
    style={[
      styles.subTab,
      activeSubTab === 'exercises' && { borderBottomWidth: 2, borderBottomColor: subTabActiveColor, marginBottom: -2 },
    ]}
    onPress={() => setActiveSubTab('exercises')}>
    <Text style={[styles.subTabText, activeSubTab === 'exercises' && { color: subTabActiveColor }]}>
      Exercises
    </Text>
  </TouchableOpacity>
  <TouchableOpacity
    style={[
      styles.subTab,
      activeSubTab === 'warmups' && { borderBottomWidth: 2, borderBottomColor: subTabActiveColor, marginBottom: -2 },
    ]}
    onPress={() => setActiveSubTab('warmups')}>
    <Text style={[styles.subTabText, activeSubTab === 'warmups' && { color: subTabActiveColor }]}>
      Warmups
    </Text>
  </TouchableOpacity>
</View>
```

(`marginBottom: -2` overlaps the parent's bottom border so the active underline doesn't push the bar height up by 2px.)

- [ ] **Step 3: Update the stylesheet — drop the now-unused static-active styles**

Remove these entries:

```typescript
subTabActive: {
  borderBottomWidth: 2,
  borderBottomColor: colors.accent,
},
subTabTextActive: {
  color: colors.accent,
},
```

Update `subTab` padding for v6 norms:

```typescript
subTab: {
  flex: 1,
  alignItems: 'center',
  paddingVertical: spacing.sm + 2,
},
```

(was `spacing.md`).

- [ ] **Step 4: Run lint + tests**

Run: `npx tsc --noEmit && npx jest src/screens/__tests__/LibraryScreen.test.tsx`
Expected: clean, all green.

- [ ] **Step 5: Commit**

```bash
git add src/screens/LibraryScreen.tsx
git commit -m "feat(library): dynamic sub-tab active color

Active sub-tab underline + text take colors.accent on Exercises,
colors.warmupAmber on Warmups. Tightens vertical padding to v6 norm.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 8: LibraryScreen search row — SearchIcon SVG replaces 🔍 emoji

**Files:**
- Modify: `src/screens/LibraryScreen.tsx`

- [ ] **Step 1: Add the import**

At the top of `src/screens/LibraryScreen.tsx`, with the other icon imports:

```typescript
import { SearchIcon } from '../components/icons/SearchIcon';
```

- [ ] **Step 2: Replace the search icon JSX**

Find:

```typescript
<Text style={styles.searchIcon}>🔍</Text>
```

Replace with:

```typescript
<View style={styles.searchIcon} pointerEvents="none">
  <SearchIcon size={16} color={colors.secondary} />
</View>
```

- [ ] **Step 3: Update the `searchIcon` style**

Replace the current `searchIcon` entry:

```typescript
searchIcon: {
  position: 'absolute',
  right: spacing.md,
  fontSize: fontSize.base,
  opacity: 0.5,
},
```

with:

```typescript
searchIcon: {
  position: 'absolute',
  right: spacing.md,
  opacity: 0.6,
},
```

(drops `fontSize` since the child is a fixed-size SVG.)

- [ ] **Step 4: Verify on tests**

Run: `npx jest src/screens/__tests__/LibraryScreen.test.tsx`
Expected: ALL PASS.

- [ ] **Step 5: Commit**

```bash
git add src/screens/LibraryScreen.tsx
git commit -m "feat(library): swap 🔍 emoji for SearchIcon SVG

Crisper rendering at any zoom, accessibility-friendly stroke icon,
matches the rest of the v6 icon vocabulary.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 9: LibraryScreen section eyebrow — replace `sectionHeaderStrip`

**Files:**
- Modify: `src/screens/LibraryScreen.tsx`

- [ ] **Step 1: Update `sectionLabel` to use the middle-dot separator**

Find the existing line:

```typescript
const sectionLabel = isSearching
  ? `SEARCH: "${searchQuery.trim().toUpperCase()}"`
  : `FILTERED: ${selectedCategory.toUpperCase()}`;
```

Replace with:

```typescript
const sectionLabel = isSearching
  ? `SEARCH · "${searchQuery.trim().toUpperCase()}"`
  : `FILTERED · ${selectedCategory.toUpperCase()}`;
```

- [ ] **Step 2: Replace the section header JSX**

Find:

```typescript
{/* Section header */}
<View style={styles.sectionHeaderStrip}>
  <Text style={styles.sectionHeader}>{sectionLabel}</Text>
</View>
```

Replace with:

```typescript
<View style={styles.sectionEyebrow}>
  <Text style={styles.sectionEyebrowText}>{sectionLabel}</Text>
  <Text style={styles.sectionEyebrowCount}>{exercises.length}</Text>
</View>
```

- [ ] **Step 3: Update the stylesheet — drop the strip styles, add eyebrow styles**

Delete:

```typescript
sectionHeaderStrip: { ... },
sectionHeader: { ... },
```

Add:

```typescript
sectionEyebrow: {
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'space-between',
  paddingHorizontal: spacing.base + 2,
  marginTop: spacing.md,
  marginBottom: spacing.sm,
},
sectionEyebrowText: {
  color: colors.secondaryDim,
  fontSize: 10,
  fontWeight: '700',
  letterSpacing: 1.6,
},
sectionEyebrowCount: {
  color: colors.secondary,
  fontSize: 10,
  fontWeight: '700',
},
```

- [ ] **Step 4: Tests should still find the SEARCH label**

The existing test `'shows SEARCH section label when searching'` does `getByText(/SEARCH/)`. The new label `SEARCH · "BENCH"` still matches. Run:

`npx jest src/screens/__tests__/LibraryScreen.test.tsx -t "SEARCH section label"`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/screens/LibraryScreen.tsx
git commit -m "feat(library): section eyebrow replaces filtered-strip surface

Drops the rounded surface card that duplicated information already in
the active pill. New treatment: thin uppercase eyebrow + right-aligned
count. Uses · separator (FILTERED · CHEST) per v6 typographic norm.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 10: LibraryScreen empty state — Dumbbell icon + existing text

**Files:**
- Modify: `src/screens/LibraryScreen.tsx`

- [ ] **Step 1: Add the import**

```typescript
import { Dumbbell } from '../components/icons/Dumbbell';
```

- [ ] **Step 2: Update the empty-state JSX**

Find:

```typescript
<View style={styles.emptyContainer}>
  <Text style={styles.emptyText}>No exercises in this category</Text>
  <Text style={styles.emptyHint}>Tap + to add a custom exercise</Text>
</View>
```

Replace with:

```typescript
<View style={styles.emptyContainer}>
  <View style={styles.emptyIcon}>
    <Dumbbell size={40} color={colors.secondary} />
  </View>
  <Text style={styles.emptyText}>No exercises in this category</Text>
  <Text style={styles.emptyHint}>Tap + to add a custom exercise</Text>
</View>
```

- [ ] **Step 3: Add the `emptyIcon` style**

Add:

```typescript
emptyIcon: {
  opacity: 0.16,
  marginBottom: spacing.md,
},
```

- [ ] **Step 4: Tests**

Run: `npx jest src/screens/__tests__/LibraryScreen.test.tsx -t "empty state"`
Expected: PASS — the text strings are unchanged.

- [ ] **Step 5: Commit**

```bash
git add src/screens/LibraryScreen.tsx
git commit -m "feat(library): empty-state dumbbell icon

40px Dumbbell icon at 16% opacity above the existing 'No exercises'
text. Matches the Programs empty state pattern. Reuses the existing
Dumbbell icon component.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 11: WarmupTemplateListScreen — drop section row, add amber eyebrow

**Files:**
- Modify: `src/screens/WarmupTemplateListScreen.tsx`

- [ ] **Step 1: Drop the in-screen section header row**

Find:

```typescript
{/* Section header row */}
<View style={styles.sectionHeader}>
  <Text style={styles.sectionTitle}>Your Warmup Templates</Text>
  <TouchableOpacity style={styles.newButton} onPress={handleOpenNewModal}>
    <Text style={styles.newButtonText}>+ New Template</Text>
  </TouchableOpacity>
</View>
```

Delete the entire block. Replace with:

```typescript
<View style={styles.eyebrow}>
  <Text style={styles.eyebrowText}>YOUR TEMPLATES</Text>
  <Text style={styles.eyebrowCount}>{templates.length}</Text>
</View>
```

- [ ] **Step 2: Drop the now-unused styles, add eyebrow styles**

Delete: `sectionHeader`, `sectionTitle`, `newButton`, `newButtonText`.

Add:

```typescript
eyebrow: {
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'space-between',
  paddingHorizontal: spacing.base + 2,
  marginTop: spacing.md,
  marginBottom: spacing.sm,
},
eyebrowText: {
  color: colors.warmupAmber,
  fontSize: 10,
  fontWeight: '700',
  letterSpacing: 1.6,
},
eyebrowCount: {
  color: colors.secondary,
  fontSize: 10,
  fontWeight: '700',
},
```

- [ ] **Step 3: Remove imports that are no longer used**

If `TouchableOpacity` is still used elsewhere (yes — the card and the modal buttons), keep it. If `weightSemiBold` was only used by the removed buttons, drop it.

Run: `grep -n "weightSemiBold" src/screens/WarmupTemplateListScreen.tsx`
If only the imports line matches, remove `weightSemiBold` from the import.

- [ ] **Step 4: Lint + typecheck**

Run: `npx tsc --noEmit && npx eslint src/screens/WarmupTemplateListScreen.tsx`
Expected: clean.

- [ ] **Step 5: Tests — the warmups-tab + button test from Task 1 should still pass**

Run: `npx jest src/screens/__tests__/LibraryScreen.test.tsx -t "warmups"`
Expected: PASS — header + button still opens the new template modal via the lifted state.

- [ ] **Step 6: Commit**

```bash
git add src/screens/WarmupTemplateListScreen.tsx
git commit -m "feat(library): warmups eyebrow replaces section header row

Drops the in-screen 'Your Warmup Templates' + '+ New Template' row —
parent header now owns both. New eyebrow: amber 'YOUR TEMPLATES' +
right-aligned count, matches the Exercises section pattern.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 12: WarmupTemplateListScreen — restyle template card with amber number chip

**Files:**
- Modify: `src/screens/WarmupTemplateListScreen.tsx`

- [ ] **Step 1: Replace the card JSX inside `renderItem`**

Find the current card:

```typescript
<TouchableOpacity
  style={styles.card}
  onPress={...}
  onLongPress={() => handleLongPress(item)}
  activeOpacity={0.7}>
  <View style={styles.cardHeader}>
    <Text style={styles.cardName} numberOfLines={1}>
      {item.template.name}
    </Text>
    <Text style={styles.cardCount}>
      {item.itemCount} {item.itemCount === 1 ? 'item' : 'items'}
    </Text>
  </View>
  {item.previewNames.length > 0 && (
    <Text style={styles.cardPreview} numberOfLines={2}>
      {item.previewNames.join(' · ')}
      {item.itemCount > item.previewNames.length ? ' · ...' : ''}
    </Text>
  )}
</TouchableOpacity>
```

Replace with:

```typescript
<TouchableOpacity
  style={styles.card}
  onPress={() =>
    navigation.navigate('WarmupTemplateDetail', {
      templateId: item.template.id,
      templateName: item.template.name,
    })
  }
  onLongPress={() => handleLongPress(item)}
  activeOpacity={0.7}>
  <View style={styles.numberChip}>
    <Text style={styles.numberChipText}>{item.itemCount}</Text>
  </View>
  <View style={styles.cardBody}>
    <Text style={styles.cardName} numberOfLines={1}>
      {item.template.name}
    </Text>
    {item.previewNames.length > 0 && (
      <Text style={styles.cardPreview} numberOfLines={2}>
        {item.previewNames.join(' · ')}
        {item.itemCount > item.previewNames.length ? ' · …' : ''}
      </Text>
    )}
  </View>
</TouchableOpacity>
```

(Note: `…` Unicode ellipsis replaces the `...` triple-period — minor v6 typographic norm.)

- [ ] **Step 2: Update card styles**

Replace these style entries:

```typescript
card: {
  backgroundColor: colors.surface,
  borderRadius: 12,
  padding: spacing.base,
  marginBottom: spacing.sm,
  borderWidth: 1,
  borderColor: colors.border,
},
cardHeader: { ... },
cardName: { ... },
cardCount: { ... },
cardPreview: { ... },
```

with:

```typescript
card: {
  backgroundColor: colors.surfaceElevated,
  borderRadius: 12,
  padding: spacing.base - 2,
  marginBottom: spacing.sm,
  borderWidth: 1,
  borderColor: colors.border,
  flexDirection: 'row',
  alignItems: 'stretch',
  gap: 11,
},
numberChip: {
  width: 32,
  height: 32,
  borderRadius: 8,
  alignItems: 'center',
  justifyContent: 'center',
  backgroundColor: 'rgba(240,184,48,0.10)',
  borderWidth: 1,
  borderColor: 'rgba(240,184,48,0.18)',
},
numberChipText: {
  color: colors.warmupAmber,
  fontSize: 13,
  fontWeight: '800',
},
cardBody: {
  flex: 1,
  minWidth: 0,
  justifyContent: 'center',
},
cardName: {
  fontSize: fontSize.base,
  fontWeight: weightSemiBold,
  color: colors.primary,
  marginBottom: 3,
},
cardPreview: {
  fontSize: fontSize.sm,
  color: colors.secondary,
  lineHeight: 18,
},
```

- [ ] **Step 3: Re-add `weightSemiBold` import if Task 11 removed it**

Run: `grep -n "weightSemiBold" src/screens/WarmupTemplateListScreen.tsx`

If only the JSX usage matches but no import, add it back to the import line:

```typescript
import { fontSize, weightBold, weightSemiBold } from '../theme/typography';
```

- [ ] **Step 4: Lint + typecheck**

Run: `npx tsc --noEmit && npx eslint src/screens/WarmupTemplateListScreen.tsx`
Expected: clean.

- [ ] **Step 5: Run the suite**

Run: `npx jest src/screens/__tests__/LibraryScreen.test.tsx`
Expected: ALL PASS.

- [ ] **Step 6: Commit**

```bash
git add src/screens/WarmupTemplateListScreen.tsx
git commit -m "feat(library): warmup template cards use amber number chip

Replaces the right-aligned 'X items' label with a 32×32 amber number
chip on the left. Uses warmupAmber semantic token already defined for
warm-up domain. Card surface upgraded to surfaceElevated for v6
consistency with the Exercises card.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 13: WarmupTemplateListScreen empty state — Dumbbell icon

**Files:**
- Modify: `src/screens/WarmupTemplateListScreen.tsx`

- [ ] **Step 1: Add the import**

```typescript
import { Dumbbell } from '../components/icons/Dumbbell';
```

- [ ] **Step 2: Update the empty-state JSX**

Find:

```typescript
<View style={styles.emptyContainer}>
  <Text style={styles.emptyText}>No warmup templates yet</Text>
  <Text style={styles.emptyHint}>Tap "+ New Template" to create one</Text>
</View>
```

Replace with:

```typescript
<View style={styles.emptyContainer}>
  <View style={styles.emptyIcon}>
    <Dumbbell size={40} color={colors.secondary} />
  </View>
  <Text style={styles.emptyText}>No warmup templates yet</Text>
  <Text style={styles.emptyHint}>Tap + to create one</Text>
</View>
```

(Hint copy updates because there is no longer a "+ New Template" inline button.)

- [ ] **Step 3: Add `emptyIcon` style**

Add:

```typescript
emptyIcon: {
  opacity: 0.16,
  marginBottom: spacing.md,
},
```

- [ ] **Step 4: Lint + tests**

Run: `npx tsc --noEmit && npx jest src/screens/__tests__/LibraryScreen.test.tsx`
Expected: clean, all green.

- [ ] **Step 5: Commit**

```bash
git add src/screens/WarmupTemplateListScreen.tsx
git commit -m "feat(library): warmups empty state — dumbbell icon

40px Dumbbell at 16% opacity above the existing two-line text.
Updates the hint copy to point at the header + button, since the
in-screen 'New Template' button is gone.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 14: Final lint + full test sweep + on-device QA

**Files:**
- None (verification only)

- [ ] **Step 1: Full typecheck**

Run: `npx tsc --noEmit`
Expected: 0 errors.

- [ ] **Step 2: Full lint**

Run: `npx eslint "src/**/*.{ts,tsx}"`
Expected: 0 errors. Warnings unchanged from main.

- [ ] **Step 3: Full Jest suite**

Run: `npx jest`
Expected: ALL PASS. Pay attention to anything in `LibraryScreen.test.tsx` and `WarmupTemplateListScreen.test.tsx` (if it exists).

- [ ] **Step 4: Build the APK and deploy to emulator**

Use the project's `/deploy` skill or:

Run: `cd android && ./gradlew installDebug`

(Adjust if the project uses a different deploy flow.)

- [ ] **Step 5: On-device visual QA checklist**

Open the app, navigate to the Library tab. Verify each item below.

**Header zone:**
- [ ] Mint radial visible top-left, fades naturally toward the bottom-right
- [ ] "TRAINING" eyebrow in mint, all-caps, letter-spaced
- [ ] "Library" display title, bold, no descender clipping
- [ ] 38×38 mint round + button on the right, Plus icon centered

**Sub-tab bar:**
- [ ] Exercises tab: mint underline + mint text when active
- [ ] Tap Warmups: underline becomes amber, text becomes amber
- [ ] No layout shift when switching tabs

**Exercises sub-tab — search row:**
- [ ] SearchIcon SVG visible on the right edge of the input, secondary color
- [ ] No 🔍 emoji anywhere
- [ ] Type something — the icon stays put, debounce still ~300ms

**Exercises sub-tab — category pills:**
- [ ] Active "Chest" pill is solid coral with dark text
- [ ] Inactive "Back" pill is muted blue tint, blue text
- [ ] Tap each pill — color identity matches the categoryColors map
- [ ] Horizontal scroll still works

**Exercises sub-tab — section eyebrow:**
- [ ] Reads "FILTERED · CHEST" (middle dot, not colon)
- [ ] Right-aligned count matches list length
- [ ] No rounded surface card chrome around the eyebrow text

**Exercises sub-tab — exercise cards:**
- [ ] Bench Press, Push-Up, etc. show coral accent bar (chest)
- [ ] Search "press" — results show mixed accent colors per body part
- [ ] Timed badge still renders (try a timed exercise like Plank)
- [ ] Swipe-to-delete still reveals the red Delete action
- [ ] Long-press still opens edit modal
- [ ] No FAB visible — only the header + button

**Exercises sub-tab — empty state:**
- [ ] Pick a category with no exercises (or filter via Stretching if empty)
- [ ] 40px dumbbell icon at low opacity above the two-line text

**Header + button routing:**
- [ ] On Exercises tab: tap + → AddExerciseModal opens
- [ ] Switch to Warmups tab → tap + → "New Template" modal opens
- [ ] Cancel → modal closes cleanly
- [ ] Create a template → modal closes, navigates to detail

**Warmups sub-tab:**
- [ ] Mint radial still atmospheric in the top-left (page-level, not tab-level)
- [ ] "YOUR TEMPLATES" amber eyebrow + count on the right
- [ ] Each card shows a 32×32 amber number chip on the left, name + preview on the right
- [ ] No "+ New Template" button inside the screen — header + is the only one

**Warmups empty state (delete all templates):**
- [ ] 40px dumbbell + "No warmup templates yet" + "Tap + to create one"

- [ ] **Step 6: If any QA item fails, file a follow-up commit**

Don't write a new task entry — just a fix commit:

```bash
git commit -m "fix(library): <what was off>"
```

The redesign is locked once Steps 1–5 all pass. No celebratory commit needed.

---

## Summary

14 tasks. Each commit is atomic and visually verifiable. The four LibraryScreen test changes from Task 1 turn from red to green at Task 6 (header lands), giving a natural mid-plan checkpoint. Logic touches (lifted modal state + header + routing) are isolated to Tasks 5 and 6. All other tasks are pure stylesheet work. No new theme tokens, no new dependencies, no DB or navigation changes.
