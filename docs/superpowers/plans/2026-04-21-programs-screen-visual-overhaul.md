# Programs Screen Visual Overhaul Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restyle `src/screens/ProgramsScreen.tsx` to match `Programs_Screen.html` — new header typography, stat pills, tab switcher, richer cards with tag pills and arc progress, and updated context menu and empty state. Visual-only pass; no logic, data, or navigation changes.

**Architecture:** All new sub-components live inline in `ProgramsScreen.tsx` (pure presentational). Five new icon files are added under `src/components/icons/` following the existing one-icon-per-file pattern. No data-model changes; `tag` is derived at render time from `program.name`.

**Tech Stack:** React Native 0.84, `react-native-svg` (already a dependency), Jest + `@testing-library/react-native` (existing test harness, no new deps).

**Spec reference:** `docs/superpowers/specs/2026-04-21-programs-screen-visual-overhaul-design.md`

**Dead code note:** Per user instruction, the unused `CompletionCircle` component, `circleStyles`, and unused style entries (`nestedCard*`, `sectionHeader*`, `programSubtitle`, `emptyText`, `emptyHint`) stay in place this pass. A follow-up cleanup task is tracked separately after on-device verification.

---

## File Map

**Created:**
- `src/components/icons/Dumbbell.tsx`
- `src/components/icons/Play.tsx`
- `src/components/icons/Export.tsx`
- `src/components/icons/Trash.tsx`
- `src/components/icons/Dots.tsx`

**Modified:**
- `src/screens/ProgramsScreen.tsx` (main target)
- `src/screens/__tests__/ProgramsScreen.test.tsx` (update assertions to match new UI text, add new behavior tests)

**Untouched:** All files under `src/db/`, `src/types/`, `src/navigation/`, `src/theme/`, `src/components/icons/Chevron.tsx` (already supports `dir="right"`), `Trophy.tsx` (reused).

---

## Task 1: Create five new icon components

**Files:**
- Create: `src/components/icons/Dumbbell.tsx`
- Create: `src/components/icons/Play.tsx`
- Create: `src/components/icons/Export.tsx`
- Create: `src/components/icons/Trash.tsx`
- Create: `src/components/icons/Dots.tsx`

All follow the pattern in `src/components/icons/Trophy.tsx`: `Svg` + `Path`/`Circle` from `react-native-svg`, `IconProps` from `./types`.

- [ ] **Step 1: Create `Dumbbell.tsx`**

```tsx
import React from 'react';
import Svg, { Path, Rect } from 'react-native-svg';
import type { IconProps } from './types';

export function Dumbbell({ size = 14, color = '#8E9298' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M6 5v14M18 5v14" stroke={color} strokeWidth={2.5} strokeLinecap="round" />
      <Path d="M6 12h12" stroke={color} strokeWidth={2} strokeLinecap="round" />
      <Rect x={3} y={7} width={3} height={10} rx={1.5} fill={color} />
      <Rect x={18} y={7} width={3} height={10} rx={1.5} fill={color} />
    </Svg>
  );
}
```

- [ ] **Step 2: Create `Play.tsx`**

```tsx
import React from 'react';
import Svg, { Path } from 'react-native-svg';
import type { IconProps } from './types';

export function Play({ size = 14, color = '#8DC28A' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M5 3l14 9-14 9V3z" fill={color} />
    </Svg>
  );
}
```

- [ ] **Step 3: Create `Export.tsx`**

```tsx
import React from 'react';
import Svg, { Path } from 'react-native-svg';
import type { IconProps } from './types';

export function Export({ size = 16, color = '#8E9298' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M12 3v13M8 12l4 4 4-4" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M5 20h14" stroke={color} strokeWidth={2} strokeLinecap="round" />
    </Svg>
  );
}
```

- [ ] **Step 4: Create `Trash.tsx`**

```tsx
import React from 'react';
import Svg, { Path } from 'react-native-svg';
import type { IconProps } from './types';

export function Trash({ size = 16, color = '#D9534F' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}
```

- [ ] **Step 5: Create `Dots.tsx`**

```tsx
import React from 'react';
import Svg, { Circle } from 'react-native-svg';
import type { IconProps } from './types';

export function Dots({ size = 18, color = '#8E9298' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx={5} cy={12} r={1.8} fill={color} />
      <Circle cx={12} cy={12} r={1.8} fill={color} />
      <Circle cx={19} cy={12} r={1.8} fill={color} />
    </Svg>
  );
}
```

- [ ] **Step 6: Verify test suite still green (no impact expected — pure additions)**

Run: `yarn test --testPathPattern=ProgramsScreen -u=false`
Expected: all existing tests pass. If not, nothing in this task should have affected them — investigate.

- [ ] **Step 7: Commit**

```bash
git add src/components/icons/Dumbbell.tsx src/components/icons/Play.tsx src/components/icons/Export.tsx src/components/icons/Trash.tsx src/components/icons/Dots.tsx
git commit -m "feat(icons): add Dumbbell, Play, Export, Trash, Dots icons"
```

---

## Task 2: Add helpers and presentational sub-components (inline, unused)

Adds the `ProgramTag` type, `getProgramTag` heuristic, `TAG_COLORS` constant, and all eight new inline sub-components. Nothing in `ProgramsScreen` uses them yet — the screen continues to render the old UI. This keeps the file compiling and tests green after each step.

**Files:**
- Modify: `src/screens/ProgramsScreen.tsx`

- [ ] **Step 1: Add imports**

At the top of the file, add imports for the new icons and `Svg, Circle` from `react-native-svg`:

```tsx
// After existing imports, add:
import Svg, { Circle } from 'react-native-svg';
import { Plus } from '../components/icons/Plus';
import { Dumbbell } from '../components/icons/Dumbbell';
import { Play } from '../components/icons/Play';
import { Export as ExportIcon } from '../components/icons/Export';
import { Trash } from '../components/icons/Trash';
import { Dots } from '../components/icons/Dots';
import { Trophy } from '../components/icons/Trophy';
import { Check } from '../components/icons/Check';
import { Chevron } from '../components/icons/Chevron';
```

Note: `Export` is re-exported as `ExportIcon` to avoid colliding with `export` keyword when read at a glance. Existing `Plus`, `Check`, `Chevron`, `Trophy` files already exist in the icons folder — just import them.

- [ ] **Step 2: Add `ProgramTag`, `getProgramTag`, `TAG_COLORS` (above the `ProgressBar` component)**

```tsx
type ProgramTag = 'STRENGTH' | 'POWER' | 'HYPERTROPHY' | 'CONDITIONING';

function getProgramTag(name: string): ProgramTag {
  const n = name.toLowerCase();
  if (/power|5.?3.?1|deadlift|squat.*max|strongman/.test(n)) return 'POWER';
  if (/hypertrophy|ppl|push.?pull|volume|mass|bodybuild/.test(n)) return 'HYPERTROPHY';
  if (/conditioning|shred|cardio|hiit|endurance|crossfit/.test(n)) return 'CONDITIONING';
  return 'STRENGTH';
}

const TAG_COLORS: Record<ProgramTag, { bg: string; text: string }> = {
  STRENGTH:     { bg: 'rgba(91,155,240,0.15)',  text: '#5B9BF0' },
  POWER:        { bg: 'rgba(240,184,48,0.15)',  text: '#F0B830' },
  HYPERTROPHY:  { bg: 'rgba(141,194,138,0.15)', text: '#8DC28A' },
  CONDITIONING: { bg: 'rgba(224,105,126,0.15)', text: '#E0697E' },
};
```

- [ ] **Step 3: Add `StatPill`, `TabSwitcher`, `TagPill` components**

Place after `ProgressBar` / `CompletionCircle` and before `PopupMenu`:

```tsx
function StatPill({ value, label }: { value: number; label: string }) {
  return (
    <View style={newStyles.statPill}>
      <Text style={newStyles.statPillValue}>{value}</Text>
      <Text style={newStyles.statPillLabel}>{label}</Text>
    </View>
  );
}

function TabSwitcher({
  tab,
  onChange,
  activeCount,
  pastCount,
}: {
  tab: 'active' | 'past';
  onChange: (t: 'active' | 'past') => void;
  activeCount: number;
  pastCount: number;
}) {
  return (
    <View style={newStyles.tabSwitcherContainer}>
      <TouchableOpacity
        style={[newStyles.tabButton, tab === 'active' && newStyles.tabButtonActive]}
        onPress={() => onChange('active')}
        testID="tab-active"
      >
        <Text style={[newStyles.tabButtonText, tab === 'active' && newStyles.tabButtonTextActive]}>
          Active ({activeCount})
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[newStyles.tabButton, tab === 'past' && newStyles.tabButtonActive]}
        onPress={() => onChange('past')}
        testID="tab-past"
      >
        <Text style={[newStyles.tabButtonText, tab === 'past' && newStyles.tabButtonTextActive]}>
          Completed ({pastCount})
        </Text>
      </TouchableOpacity>
    </View>
  );
}

function TagPill({ tag }: { tag: ProgramTag }) {
  const style = TAG_COLORS[tag];
  return (
    <View style={[newStyles.tagPill, { backgroundColor: style.bg }]}>
      <Text style={[newStyles.tagPillText, { color: style.text }]}>{tag}</Text>
    </View>
  );
}
```

- [ ] **Step 4: Add `TopAccentLine`, `ArcProgress` components**

```tsx
function TopAccentLine({ progress }: { progress: number }) {
  const clamped = Math.max(0, Math.min(1, progress));
  return (
    <View
      style={{
        height: 3,
        width: `${clamped * 100}%`,
        backgroundColor: colors.accent,
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
      }}
    />
  );
}

function ArcProgress({
  progress,
  size = 60,
  stroke = 5,
}: {
  progress: number;
  size?: number;
  stroke?: number;
}) {
  const clamped = Math.max(0, Math.min(1, progress));
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - clamped);
  const pct = Math.round(clamped * 100);
  return (
    <View style={{ width: size, height: size }}>
      <Svg
        width={size}
        height={size}
        style={{ transform: [{ rotate: '-90deg' }] }}
      >
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="rgba(255,255,255,0.06)"
          strokeWidth={stroke}
        />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={colors.accent}
          strokeWidth={stroke}
          strokeDasharray={`${circ}`}
          strokeDashoffset={offset}
          strokeLinecap="round"
        />
      </Svg>
      <View style={StyleSheet.absoluteFill}>
        <View style={newStyles.arcCenter}>
          <Text style={newStyles.arcPercent}>{pct}</Text>
          <Text style={newStyles.arcPercentSymbol}>%</Text>
        </View>
      </View>
    </View>
  );
}
```

- [ ] **Step 5: Add `ReadyToStart`, `CompletedBadge`, `EmptyState` components**

```tsx
function ReadyToStart({ weeks, days }: { weeks: number; days: number }) {
  return (
    <View style={newStyles.readyContainer}>
      <View style={newStyles.readyIconContainer}>
        <Play size={14} color={colors.accent} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={newStyles.readyTitle}>Ready to start</Text>
        <Text style={newStyles.readySubtitle}>
          {days} days/week · {weeks} weeks
        </Text>
      </View>
      <Chevron size={14} color={colors.accent} dir="right" />
    </View>
  );
}

function CompletedBadge({ totalWorkouts, weeks }: { totalWorkouts: number; weeks: number }) {
  return (
    <View style={newStyles.completedRow}>
      <View style={newStyles.completedIconContainer}>
        <Check size={18} color={colors.accent} />
      </View>
      <View>
        <Text style={newStyles.completedTitle}>Completed</Text>
        <Text style={newStyles.completedSubtitle}>
          {totalWorkouts} sessions · {weeks} weeks
        </Text>
      </View>
      <View style={{ marginLeft: 'auto' }}>
        <View style={newStyles.donePill}>
          <Trophy size={12} color={colors.prGold} />
          <Text style={newStyles.donePillText}>Done</Text>
        </View>
      </View>
    </View>
  );
}

function EmptyState({ tab, onCreate }: { tab: 'active' | 'past'; onCreate: () => void }) {
  return (
    <View style={newStyles.emptyContainer}>
      <View style={newStyles.emptyIconContainer}>
        <Dumbbell size={28} color={colors.secondaryDim} />
      </View>
      <Text style={newStyles.emptyTitleNew}>
        {tab === 'active' ? 'No active programs' : 'No completed programs'}
      </Text>
      {tab === 'active' && (
        <TouchableOpacity style={newStyles.emptyCreateBtn} onPress={onCreate} testID="empty-create-button">
          <Text style={newStyles.emptyCreateText}>Create one</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}
```

- [ ] **Step 6: Add the `newStyles` StyleSheet at the bottom of the file (below `menuStyles`)**

```tsx
const newStyles = StyleSheet.create({
  // Header
  eyebrow: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.accent,
    letterSpacing: 2,
    marginBottom: 4,
  },
  titleLarge: {
    fontSize: 30,
    fontWeight: '900',
    color: colors.primary,
    letterSpacing: -1,
    lineHeight: 30,
  },

  // Screen layout
  topWrapper: {
    paddingHorizontal: 18,
    paddingTop: 18,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    marginBottom: 18,
  },

  // Stats row
  statsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 18,
  },
  statPill: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  statPillValue: {
    fontSize: 19,
    fontWeight: '800',
    color: colors.primary,
  },
  statPillLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.secondaryDim,
    letterSpacing: 1.2,
    marginTop: 1,
  },

  // Tab switcher
  tabSwitcherContainer: {
    flexDirection: 'row',
    gap: 4,
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: 4,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 14,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'transparent',
    backgroundColor: 'transparent',
  },
  tabButtonActive: {
    backgroundColor: colors.surfaceElevated,
    borderColor: colors.borderStrong,
  },
  tabButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.secondary,
    letterSpacing: 0.3,
  },
  tabButtonTextActive: {
    color: colors.primary,
  },

  // Tag pill
  tagPill: {
    paddingVertical: 3,
    paddingHorizontal: 9,
    borderRadius: 999,
    alignSelf: 'flex-start',
  },
  tagPillText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.6,
  },

  // Card body
  cardBody: {
    paddingTop: 16,
    paddingHorizontal: 16,
    paddingBottom: 14,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  menuButtonRound: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.04)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  programNameLarge: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.primary,
    letterSpacing: -0.5,
    lineHeight: 23,
    marginBottom: 14,
  },
  programNameCompleted: {
    color: colors.secondary,
    textDecorationLine: 'line-through',
  },

  // Progress row
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  statsColumns: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.secondaryDim,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  statValue: {
    fontSize: 17,
    fontWeight: '800',
    color: colors.primary,
  },
  statValueDim: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.secondary,
  },

  // Arc center overlay
  arcCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  arcPercent: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.primary,
    lineHeight: 14,
  },
  arcPercentSymbol: {
    fontSize: 8,
    fontWeight: '700',
    color: colors.secondaryDim,
    letterSpacing: 1,
  },

  // Ready to start
  readyContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: 'rgba(141,194,138,0.3)',
    backgroundColor: 'rgba(141,194,138,0.06)',
  },
  readyIconContainer: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: colors.accentGlow,
    alignItems: 'center',
    justifyContent: 'center',
  },
  readyTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.accent,
  },
  readySubtitle: {
    fontSize: 11,
    color: colors.secondaryDim,
  },

  // Completed state
  completedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  completedIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(141,194,138,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  completedTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.accent,
  },
  completedSubtitle: {
    fontSize: 11,
    color: colors.secondaryDim,
  },
  donePill: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 999,
    backgroundColor: 'rgba(255,184,0,0.12)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  donePillText: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.prGold,
  },

  // Empty state
  emptyContainer: {
    alignItems: 'center',
    paddingTop: 60,
    gap: 12,
  },
  emptyIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitleNew: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.secondary,
  },
  emptyCreateBtn: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 12,
    backgroundColor: colors.accentGlow,
    borderWidth: 1,
    borderColor: 'rgba(141,194,138,0.3)',
  },
  emptyCreateText: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.accent,
  },

  // Card chrome
  cardRounded: {
    borderRadius: 20,
    padding: 0,
    overflow: 'hidden',
    marginBottom: 12,
  },
});
```

Note: the `EmptyState` component (added in Step 5) uses `newStyles.emptyTitleNew` to match this StyleSheet entry. The `Title New` naming avoids any future confusion with the pre-existing `emptyText`/`emptyHint` entries in `styles` (which remain as dead code per instructions).

- [ ] **Step 7: Run type check and tests**

Run: `yarn tsc --noEmit`
Expected: no errors.

Run: `yarn test --testPathPattern=ProgramsScreen`
Expected: all existing tests pass. Nothing should have changed behaviorally — the new components are defined but unused.

- [ ] **Step 8: Commit**

```bash
git add src/screens/ProgramsScreen.tsx
git commit -m "feat(programs): add helpers and presentational components (unused)

Adds ProgramTag / getProgramTag / TAG_COLORS helpers plus StatPill,
TabSwitcher, TagPill, TopAccentLine, ArcProgress, ReadyToStart,
CompletedBadge, EmptyState sub-components. Also adds newStyles
StyleSheet. Nothing renders them yet; screen behavior unchanged."
```

---

## Task 3: Replace screen header (item #1)

Swap the current `<Text>Programs</Text>` + `+`-text add button for the TRAINING eyebrow + large Programs title + Plus-icon add button. Wrap with new header layout.

**Files:**
- Modify: `src/screens/ProgramsScreen.tsx`
- Modify: `src/screens/__tests__/ProgramsScreen.test.tsx`

- [ ] **Step 1: Update the "opens create modal when + pressed" test to use testID instead of text**

Open `src/screens/__tests__/ProgramsScreen.test.tsx`. Find the test at lines ~77-83 and change:

```tsx
// OLD:
it('opens create modal when + pressed', async () => {
  const { getByText, getAllByText } = renderWithProviders(<ProgramsScreen />);
  await waitFor(() => getByText('Programs'));
  fireEvent.press(getByText('+'));
  await waitFor(() => getAllByText('Create Program'));
  expect(getAllByText('Create Program').length).toBeGreaterThan(0);
});

// NEW:
it('opens create modal when add button pressed', async () => {
  const { getByText, getByTestId, getAllByText } = renderWithProviders(<ProgramsScreen />);
  await waitFor(() => getByText('Programs'));
  fireEvent.press(getByTestId('add-program-button'));
  await waitFor(() => getAllByText('Create Program'));
  expect(getAllByText('Create Program').length).toBeGreaterThan(0);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `yarn test --testPathPattern=ProgramsScreen -t "opens create modal"`
Expected: FAIL — no element with testID `add-program-button` yet.

- [ ] **Step 3: Replace the header JSX in `ProgramsScreen.tsx`**

Find the `<View style={styles.header}>` block (around lines 340-348 of the pre-task file) and replace with:

```tsx
<View style={newStyles.topWrapper}>
  <View style={newStyles.headerRow}>
    <View>
      <Text style={newStyles.eyebrow}>TRAINING</Text>
      <Text style={newStyles.titleLarge}>Programs</Text>
    </View>
    <TouchableOpacity
      style={styles.addButton}
      onPress={() => setModalVisible(true)}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      testID="add-program-button"
    >
      <Plus size={20} color={colors.onAccent} />
    </TouchableOpacity>
  </View>
  {/* Stats row will be added in Task 4 */}
  {/* Tab switcher will be added in Task 5 */}
</View>
```

Note: the existing `styles.addButton` (44×44 accent circle) is reused; only its inner child changes from `<Text>+</Text>` to `<Plus ... />`. The old `styles.header` and `styles.addButtonText` become unused but stay as dead code per instruction.

- [ ] **Step 4: Run tests to verify they all pass**

Run: `yarn test --testPathPattern=ProgramsScreen`
Expected: all pass. The "renders Programs title" test still passes ("Programs" text present). The "opens create modal" test now finds the button by testID.

- [ ] **Step 5: Commit**

```bash
git add src/screens/ProgramsScreen.tsx src/screens/__tests__/ProgramsScreen.test.tsx
git commit -m "feat(programs): replace header with TRAINING eyebrow + Plus-icon add button"
```

---

## Task 4: Add stat pills row (item #2)

**Files:**
- Modify: `src/screens/ProgramsScreen.tsx`
- Modify: `src/screens/__tests__/ProgramsScreen.test.tsx`

- [ ] **Step 1: Add a test for the stats row**

In `ProgramsScreen.test.tsx`, add a new test (after the "renders Programs title" test):

```tsx
it('renders stat pills with counts', async () => {
  (getPrograms as jest.Mock).mockResolvedValue([
    { id: 1, name: 'PPL', weeks: 4, currentWeek: 1, startDate: null, createdAt: '' },
    { id: 2, name: 'Active One', weeks: 4, currentWeek: 2, startDate: '2025-01-01', createdAt: '' },
    { id: 3, name: 'Done One', weeks: 2, currentWeek: 2, startDate: '2025-01-01', createdAt: '' },
  ]);
  (getProgramDays as jest.Mock).mockImplementation(() => Promise.resolve([{ id: 1 }]));
  (getProgramTotalCompleted as jest.Mock).mockImplementation((programId: number) => {
    if (programId === 3) return Promise.resolve(2); // 1 day * 2 weeks = done
    return Promise.resolve(0);
  });

  const { getByText } = renderWithProviders(<ProgramsScreen />);
  await waitFor(() => getByText('ACTIVE'));
  expect(getByText('ACTIVE')).toBeTruthy();
  expect(getByText('COMPLETED')).toBeTruthy();
  expect(getByText('IN PROGRESS')).toBeTruthy();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `yarn test --testPathPattern=ProgramsScreen -t "renders stat pills"`
Expected: FAIL — no "ACTIVE" text rendered yet.

- [ ] **Step 3: Add the stats row to the screen**

In `ProgramsScreen.tsx`, find the `// Stats row will be added in Task 4` comment from Task 3 and replace with:

```tsx
<View style={newStyles.statsRow}>
  <StatPill value={activePrograms.length} label="ACTIVE" />
  <StatPill value={pastPrograms.length} label="COMPLETED" />
  <StatPill
    value={activePrograms.filter(p => p.startDate !== null).length}
    label="IN PROGRESS"
  />
</View>
```

- [ ] **Step 4: Run tests to verify all pass**

Run: `yarn test --testPathPattern=ProgramsScreen`
Expected: all pass including the new stat pills test.

- [ ] **Step 5: Commit**

```bash
git add src/screens/ProgramsScreen.tsx src/screens/__tests__/ProgramsScreen.test.tsx
git commit -m "feat(programs): add stat pills row (Active/Completed/In Progress)"
```

---

## Task 5: Add tab switcher and convert to single filtered list (item #3)

Replaces `ACTIVE PROGRAMS` / `PAST PROGRAMS` section headers with a pill switcher. Adds `tab` state. The card list renders only the current tab's programs.

**Files:**
- Modify: `src/screens/ProgramsScreen.tsx`
- Modify: `src/screens/__tests__/ProgramsScreen.test.tsx`

- [ ] **Step 1: Update tests that assert on "ACTIVE PROGRAMS" / "PAST PROGRAMS"**

In `ProgramsScreen.test.tsx`, find the test at line ~85:

```tsx
// OLD:
it('shows ACTIVE PROGRAMS section when programs exist', async () => {
  (getPrograms as jest.Mock).mockResolvedValue([
    { id: 1, name: 'PPL', weeks: 4, currentWeek: 1, startDate: null, createdAt: '' },
  ]);
  (getProgramDays as jest.Mock).mockResolvedValue([]);
  const { getByText } = renderWithProviders(<ProgramsScreen />);
  await waitFor(() => getByText('ACTIVE PROGRAMS'));
  expect(getByText('ACTIVE PROGRAMS')).toBeTruthy();
});

// NEW:
it('shows active tab label with count when programs exist', async () => {
  (getPrograms as jest.Mock).mockResolvedValue([
    { id: 1, name: 'PPL', weeks: 4, currentWeek: 1, startDate: null, createdAt: '' },
  ]);
  (getProgramDays as jest.Mock).mockResolvedValue([]);
  const { getByText } = renderWithProviders(<ProgramsScreen />);
  await waitFor(() => getByText('Active (1)'));
  expect(getByText('Active (1)')).toBeTruthy();
});
```

And the "shows PAST PROGRAMS" test at line ~95:

```tsx
// OLD:
it('shows PAST PROGRAMS section when completed programs exist', async () => {
  (getPrograms as jest.Mock).mockResolvedValue([
    { id: 1, name: 'Old Program', weeks: 2, currentWeek: 2, startDate: '2025-01-01', createdAt: '' },
  ]);
  (getProgramDays as jest.Mock).mockImplementation(() => Promise.resolve([{ id: 1 }]));
  (getProgramTotalCompleted as jest.Mock).mockResolvedValue(2);
  const { getByText } = renderWithProviders(<ProgramsScreen />);
  await waitFor(() => getByText('PAST PROGRAMS'));
  expect(getByText('PAST PROGRAMS')).toBeTruthy();
});

// NEW:
it('shows completed tab label with count when past programs exist', async () => {
  (getPrograms as jest.Mock).mockResolvedValue([
    { id: 1, name: 'Old Program', weeks: 2, currentWeek: 2, startDate: '2025-01-01', createdAt: '' },
  ]);
  (getProgramDays as jest.Mock).mockImplementation(() => Promise.resolve([{ id: 1 }]));
  (getProgramTotalCompleted as jest.Mock).mockResolvedValue(2);
  const { getByText } = renderWithProviders(<ProgramsScreen />);
  await waitFor(() => getByText('Completed (1)'));
  expect(getByText('Completed (1)')).toBeTruthy();
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `yarn test --testPathPattern=ProgramsScreen -t "tab label"`
Expected: FAIL — no "Active (1)" / "Completed (1)" text yet.

- [ ] **Step 3: Add `tab` state in `ProgramsScreen`**

At the top of the `ProgramsScreen` function (after the `refreshing` state, around existing state declarations):

```tsx
const [tab, setTab] = useState<'active' | 'past'>('active');
```

- [ ] **Step 4: Add the tab switcher to the top wrapper and change render path**

In the `topWrapper`, replace the `{/* Tab switcher will be added in Task 5 */}` placeholder with:

```tsx
<TabSwitcher
  tab={tab}
  onChange={setTab}
  activeCount={activePrograms.length}
  pastCount={pastPrograms.length}
/>
```

Then replace the whole render block that currently has two conditional sections (the `{activePrograms.length > 0 && ...}` and `{pastPrograms.length > 0 && ...}` blocks inside the `ScrollView`) with a single filtered list:

```tsx
{(() => {
  const shown = tab === 'active' ? activePrograms : pastPrograms;
  return shown.map(program => (
    <ProgramCard
      key={program.id}
      program={program}
      isDeleting={deletingId === program.id}
      completedWorkouts={programStats[program.id]?.completed ?? 0}
      dayCount={programStats[program.id]?.dayCount ?? 0}
      onTap={() => handleTap(program)}
      onMenuPress={(position) => handleMenuPress(program, position)}
    />
  ));
})()}
```

(You can hoist `shown` to just before the `return (` of `ProgramsScreen` instead of using an IIFE — preference is fine. If hoisted, the JSX becomes `{shown.map(...)}`.)

**Hoisted version (preferred):** Add this line just above the `return (` of `ProgramsScreen`:

```tsx
const shown = tab === 'active' ? activePrograms : pastPrograms;
```

Then use `{shown.map(...)}` in place of the IIFE.

- [ ] **Step 5: Run tests to verify all pass**

Run: `yarn test --testPathPattern=ProgramsScreen`
Expected: all pass. The empty-state test may still pass because with zero programs both lists are empty and the existing `programs.length === 0` gate renders the old empty state.

- [ ] **Step 6: Commit**

```bash
git add src/screens/ProgramsScreen.tsx src/screens/__tests__/ProgramsScreen.test.tsx
git commit -m "feat(programs): add tab switcher replacing section headers"
```

---

## Task 6: Rewrite ProgramCard with new visuals (items #4, #5, #6, #7, #8)

This is the largest task by LOC. The `ProgramCard` component is rewritten to use `TagPill`, `TopAccentLine`, `ArcProgress`, `ReadyToStart`, `CompletedBadge` and the new `cardBody` layout.

**Files:**
- Modify: `src/screens/ProgramsScreen.tsx`
- Modify: `src/screens/__tests__/ProgramsScreen.test.tsx`

- [ ] **Step 1: Update the "renders program card with name" test**

In `ProgramsScreen.test.tsx`, around line ~48:

```tsx
// OLD:
it('renders program card with name', async () => {
  (getPrograms as jest.Mock).mockResolvedValue([
    { id: 1, name: 'PPL', weeks: 4, currentWeek: 1, startDate: null, createdAt: '', isActive: true },
  ]);
  (getProgramDays as jest.Mock).mockImplementation((programId: number) => {
    if (programId === 1) return Promise.resolve([{ id: 1 }]);
    return Promise.resolve([]);
  });
  const { getByText } = renderWithProviders(<ProgramsScreen />);
  await waitFor(() => getByText('PPL'));
  expect(getByText('PPL')).toBeTruthy();
  expect(getByText('4 weeks · Not started')).toBeTruthy();
});

// NEW:
it('renders not-started program card with Ready to start panel', async () => {
  (getPrograms as jest.Mock).mockResolvedValue([
    { id: 1, name: 'PPL', weeks: 4, currentWeek: 1, startDate: null, createdAt: '', isActive: true },
  ]);
  (getProgramDays as jest.Mock).mockImplementation((programId: number) => {
    if (programId === 1) return Promise.resolve([{ id: 1 }]);
    return Promise.resolve([]);
  });
  const { getByText } = renderWithProviders(<ProgramsScreen />);
  await waitFor(() => getByText('PPL'));
  expect(getByText('PPL')).toBeTruthy();
  expect(getByText('Ready to start')).toBeTruthy();
  expect(getByText('1 days/week · 4 weeks')).toBeTruthy();
});
```

- [ ] **Step 2: Update the "renders active program with progress" test**

Around line ~62:

```tsx
// OLD assertions:
expect(getByText('Progress')).toBeTruthy();
expect(getByText('6 of 12 workouts')).toBeTruthy();

// NEW assertions (replace those two):
expect(getByText('WEEK')).toBeTruthy();
expect(getByText('SESSIONS')).toBeTruthy();
// Current week (2) + total (4) render in one Text node as "2/4";
// completed (6) + total (12) render in one Text node as "6/12".
// (Inner <Text> just styles the "/N" segment dimmer.)
expect(getByText('2/4')).toBeTruthy();
expect(getByText('6/12')).toBeTruthy();
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `yarn test --testPathPattern=ProgramsScreen -t "Ready to start"`
Run: `yarn test --testPathPattern=ProgramsScreen -t "renders active program"`
Expected: both FAIL — old UI strings still rendered.

- [ ] **Step 4: Rewrite the `ProgramCard` component**

Replace the entire `ProgramCard` function definition with:

```tsx
function ProgramCard({
  program,
  isDeleting,
  completedWorkouts,
  dayCount,
  onTap,
  onMenuPress,
}: {
  program: Program;
  isDeleting: boolean;
  completedWorkouts: number;
  dayCount: number;
  onTap: () => void;
  onMenuPress: (position: { top: number; right: number }) => void;
}) {
  const isActivated = program.startDate !== null;
  const totalWorkouts = dayCount * program.weeks;
  const isComplete = isActivated && totalWorkouts > 0 && completedWorkouts >= totalWorkouts;
  const progress =
    isActivated && totalWorkouts > 0 ? Math.min(completedWorkouts / totalWorkouts, 1) : 0;
  const tag = getProgramTag(program.name);

  return (
    <TouchableOpacity
      style={[
        styles.programCard,
        newStyles.cardRounded,
        isDeleting && styles.cardDeleting,
      ]}
      onPress={onTap}
      activeOpacity={0.7}
    >
      {isActivated && !isComplete && <TopAccentLine progress={progress} />}

      <View style={newStyles.cardBody}>
        {/* Card header: tag pill + menu button */}
        <View style={newStyles.cardHeaderRow}>
          <TagPill tag={tag} />
          <TouchableOpacity
            onPress={(e) => {
              onMenuPress({ top: (e?.nativeEvent?.pageY ?? 0) + 8, right: 16 });
            }}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            style={newStyles.menuButtonRound}
            testID="menu-button"
          >
            <Dots size={18} color={colors.secondary} />
          </TouchableOpacity>
        </View>

        {/* Program name */}
        <Text
          style={[
            newStyles.programNameLarge,
            isComplete && newStyles.programNameCompleted,
          ]}
        >
          {program.name}
        </Text>

        {/* State-specific body */}
        {isActivated && !isComplete && (
          <View style={newStyles.progressRow}>
            <ArcProgress progress={progress} size={60} stroke={5} />
            <View style={{ flex: 1 }}>
              <View style={newStyles.statsColumns}>
                <View>
                  <Text style={newStyles.statLabel}>WEEK</Text>
                  <Text style={newStyles.statValue}>
                    {program.currentWeek}
                    <Text style={newStyles.statValueDim}>/{program.weeks}</Text>
                  </Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={newStyles.statLabel}>SESSIONS</Text>
                  <Text style={newStyles.statValue}>
                    {completedWorkouts}
                    <Text style={newStyles.statValueDim}>/{totalWorkouts}</Text>
                  </Text>
                </View>
              </View>
              <ProgressBar progress={progress} />
            </View>
          </View>
        )}

        {!isActivated && (
          <ReadyToStart weeks={program.weeks} days={dayCount} />
        )}

        {isComplete && (
          <CompletedBadge totalWorkouts={totalWorkouts} weeks={program.weeks} />
        )}
      </View>
    </TouchableOpacity>
  );
}
```

Note: the old `CompletionCircle` JSX is gone from the header, but the `CompletionCircle` function definition above stays in place (dead code, intentional per user instruction).

- [ ] **Step 5: Run tests to verify all pass**

Run: `yarn test --testPathPattern=ProgramsScreen`
Expected: all pass. The menu-related tests still work because `testID="menu-button"` is preserved.

- [ ] **Step 6: Verify TypeScript type-checks**

Run: `yarn tsc --noEmit`
Expected: no errors.

- [ ] **Step 7: Commit**

```bash
git add src/screens/ProgramsScreen.tsx src/screens/__tests__/ProgramsScreen.test.tsx
git commit -m "feat(programs): rewrite ProgramCard with tag pill, arc progress, state pills"
```

---

## Task 7: Update context menu styles and add icons (item #9)

**Files:**
- Modify: `src/screens/ProgramsScreen.tsx`

No test changes needed — existing menu tests check for "Export" / "Delete" / "No workout data" text which is preserved.

- [ ] **Step 1: Update `menuStyles.container`**

In the `menuStyles` StyleSheet, replace:

```tsx
// OLD:
container: {
  backgroundColor: colors.surfaceElevated,
  borderRadius: 8,
  paddingVertical: spacing.xs,
  minWidth: 180,
  borderWidth: 1,
  borderColor: colors.border,
  elevation: 8,
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.3,
  shadowRadius: 8,
},

// NEW:
container: {
  backgroundColor: colors.surfaceElevated,
  borderRadius: 14,
  paddingVertical: spacing.xs,
  minWidth: 180,
  borderWidth: 1,
  borderColor: colors.borderStrong,
  overflow: 'hidden',
  elevation: 8,
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.3,
  shadowRadius: 8,
},
```

- [ ] **Step 2: Update `menuStyles.menuItem`**

```tsx
// OLD:
menuItem: {
  flexDirection: 'row',
  alignItems: 'center',
  paddingHorizontal: spacing.base,
  paddingVertical: spacing.md,
},

// NEW:
menuItem: {
  flexDirection: 'row',
  alignItems: 'center',
  paddingHorizontal: 16,
  paddingVertical: 13,
  gap: 10,
},
```

- [ ] **Step 3: Add icons to the menu item JSX**

In the `PopupMenu` children (the Export and Delete `<TouchableOpacity>` blocks near the bottom of `ProgramsScreen`), add icons before the text.

For the Export item:

```tsx
<TouchableOpacity
  style={[menuStyles.menuItem, !menuProgramHasData && menuStyles.menuItemDisabled]}
  onPress={menuProgramHasData && !isExporting ? handleExport : undefined}
  disabled={!menuProgramHasData || isExporting}
  activeOpacity={0.7}
>
  {isExporting ? (
    <ActivityIndicator size="small" color={colors.primary} />
  ) : (
    <>
      <ExportIcon size={16} color={colors.secondary} />
      <Text style={[menuStyles.menuItemText, !menuProgramHasData && menuStyles.menuItemTextDisabled]}>
        Export
      </Text>
      {!menuProgramHasData && (
        <Text style={menuStyles.menuItemSubtext}>No workout data</Text>
      )}
    </>
  )}
</TouchableOpacity>
```

For the Delete item:

```tsx
<TouchableOpacity
  style={menuStyles.menuItem}
  onPress={handleDeleteFromMenu}
  activeOpacity={0.7}
>
  <Trash size={16} color={colors.danger} />
  <Text style={[menuStyles.menuItemText, menuStyles.menuItemDanger]}>Delete</Text>
</TouchableOpacity>
```

- [ ] **Step 4: Run tests**

Run: `yarn test --testPathPattern=ProgramsScreen`
Expected: all pass. Menu tests still find "Export", "Delete", "No workout data" text.

- [ ] **Step 5: Commit**

```bash
git add src/screens/ProgramsScreen.tsx
git commit -m "feat(programs): update context menu with icons and rounded corners"
```

---

## Task 8: Tab-aware empty state (item #10)

Replaces the current empty state (rendered only when `programs.length === 0`) with a tab-aware version that renders whenever the current tab's list is empty. Header + stats + tab switcher remain visible above it.

**Files:**
- Modify: `src/screens/ProgramsScreen.tsx`
- Modify: `src/screens/__tests__/ProgramsScreen.test.tsx`

- [ ] **Step 1: Update the "shows empty state when no programs" test**

In `ProgramsScreen.test.tsx`, around line ~41:

```tsx
// OLD:
it('shows empty state when no programs', async () => {
  (getPrograms as jest.Mock).mockResolvedValue([]);
  const { getByText } = renderWithProviders(<ProgramsScreen />);
  await waitFor(() => getByText('No programs yet'));
  expect(getByText('Tap + to create one')).toBeTruthy();
});

// NEW:
it('shows empty state when no programs (active tab)', async () => {
  (getPrograms as jest.Mock).mockResolvedValue([]);
  const { getByText } = renderWithProviders(<ProgramsScreen />);
  await waitFor(() => getByText('No active programs'));
  expect(getByText('Create one')).toBeTruthy();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `yarn test --testPathPattern=ProgramsScreen -t "empty state"`
Expected: FAIL — old empty-state text still rendered ("No programs yet").

- [ ] **Step 3: Replace the empty-state rendering**

In `ProgramsScreen` render, the current structure is:

```tsx
{programs.length === 0 ? (
  <View style={styles.emptyContainer}>
    <Text style={styles.emptyText}>No programs yet</Text>
    <Text style={styles.emptyHint}>Tap + to create one</Text>
  </View>
) : (
  <ScrollView ...>
    ...
  </ScrollView>
)}
```

Change the conditional to be based on `shown.length`:

```tsx
{shown.length === 0 ? (
  <EmptyState tab={tab} onCreate={() => setModalVisible(true)} />
) : (
  <ScrollView
    style={styles.scrollView}
    contentContainerStyle={{ paddingHorizontal: 18, paddingBottom: 100 }}
    refreshControl={
      <RefreshControl
        refreshing={refreshing}
        onRefresh={onRefresh}
        tintColor={colors.accent}
        colors={[colors.accent]}
      />
    }
  >
    {shown.map(program => (
      <ProgramCard
        key={program.id}
        program={program}
        isDeleting={deletingId === program.id}
        completedWorkouts={programStats[program.id]?.completed ?? 0}
        dayCount={programStats[program.id]?.dayCount ?? 0}
        onTap={() => handleTap(program)}
        onMenuPress={(position) => handleMenuPress(program, position)}
      />
    ))}
  </ScrollView>
)}
```

Note: `contentContainerStyle` changed from `styles.scrollContent` to inline `{ paddingHorizontal: 18, paddingBottom: 100 }` to match HTML spacing. The old `styles.scrollContent` entry becomes unused (dead, intentional per instruction).

- [ ] **Step 4: Run all tests**

Run: `yarn test --testPathPattern=ProgramsScreen`
Expected: all pass.

- [ ] **Step 5: Commit**

```bash
git add src/screens/ProgramsScreen.tsx src/screens/__tests__/ProgramsScreen.test.tsx
git commit -m "feat(programs): tab-aware empty state with dumbbell icon and Create one CTA"
```

---

## Task 9: Add new behavior tests for tab switching

Adds tests that specifically cover the new behaviors: tab toggling, tab-aware empty messages, and tag-pill derivation.

**Files:**
- Modify: `src/screens/__tests__/ProgramsScreen.test.tsx`

- [ ] **Step 1: Add tab-switching test**

Append to the `describe('ProgramsScreen', ...)` block:

```tsx
it('switches to past tab and shows completed programs', async () => {
  (getPrograms as jest.Mock).mockResolvedValue([
    { id: 1, name: 'Active One', weeks: 4, currentWeek: 1, startDate: null, createdAt: '' },
    { id: 2, name: 'Finished One', weeks: 2, currentWeek: 2, startDate: '2025-01-01', createdAt: '' },
  ]);
  (getProgramDays as jest.Mock).mockImplementation(() => Promise.resolve([{ id: 1 }]));
  (getProgramTotalCompleted as jest.Mock).mockImplementation((programId: number) => {
    if (programId === 2) return Promise.resolve(2);
    return Promise.resolve(0);
  });

  const { getByText, getByTestId, queryByText } = renderWithProviders(<ProgramsScreen />);
  await waitFor(() => getByText('Active One'));
  // Initially on active tab
  expect(getByText('Active One')).toBeTruthy();
  expect(queryByText('Finished One')).toBeNull();

  // Switch to past tab
  fireEvent.press(getByTestId('tab-past'));
  await waitFor(() => getByText('Finished One'));
  expect(getByText('Finished One')).toBeTruthy();
  expect(queryByText('Active One')).toBeNull();
});

it('shows "No completed programs" when switching to empty past tab', async () => {
  (getPrograms as jest.Mock).mockResolvedValue([
    { id: 1, name: 'Active One', weeks: 4, currentWeek: 1, startDate: null, createdAt: '' },
  ]);
  (getProgramDays as jest.Mock).mockImplementation(() => Promise.resolve([{ id: 1 }]));
  (getProgramTotalCompleted as jest.Mock).mockResolvedValue(0);

  const { getByText, getByTestId } = renderWithProviders(<ProgramsScreen />);
  await waitFor(() => getByText('Active One'));

  fireEvent.press(getByTestId('tab-past'));
  await waitFor(() => getByText('No completed programs'));
  expect(getByText('No completed programs')).toBeTruthy();
});

it('renders correct tag pill based on program name heuristic', async () => {
  (getPrograms as jest.Mock).mockResolvedValue([
    { id: 1, name: '5/3/1 Powerlifting', weeks: 12, currentWeek: 2, startDate: '2025-01-01', createdAt: '' },
    { id: 2, name: 'Push Pull Legs', weeks: 6, currentWeek: 1, startDate: null, createdAt: '' },
    { id: 3, name: 'Summer Shred', weeks: 10, currentWeek: 5, startDate: '2025-01-01', createdAt: '' },
    { id: 4, name: 'Generic Program', weeks: 4, currentWeek: 1, startDate: null, createdAt: '' },
  ]);
  (getProgramDays as jest.Mock).mockImplementation(() => Promise.resolve([{ id: 1 }]));
  (getProgramTotalCompleted as jest.Mock).mockResolvedValue(0);

  const { getByText } = renderWithProviders(<ProgramsScreen />);
  await waitFor(() => getByText('POWER'));
  expect(getByText('POWER')).toBeTruthy();
  expect(getByText('HYPERTROPHY')).toBeTruthy();
  expect(getByText('CONDITIONING')).toBeTruthy();
  expect(getByText('STRENGTH')).toBeTruthy(); // fallback for Generic Program
});
```

- [ ] **Step 2: Run new tests to verify they pass**

Run: `yarn test --testPathPattern=ProgramsScreen -t "switches to past tab"`
Run: `yarn test --testPathPattern=ProgramsScreen -t "No completed programs"`
Run: `yarn test --testPathPattern=ProgramsScreen -t "tag pill based on program name"`
Expected: all PASS (implementation from prior tasks should cover these).

- [ ] **Step 3: Run full test file**

Run: `yarn test --testPathPattern=ProgramsScreen`
Expected: all tests pass (original + updated + new).

- [ ] **Step 4: Run full project test suite**

Run: `yarn test`
Expected: no new failures. Other test files should be unaffected since we only touched `ProgramsScreen.tsx` and its test file.

- [ ] **Step 5: Commit**

```bash
git add src/screens/__tests__/ProgramsScreen.test.tsx
git commit -m "test(programs): cover tab switching, empty past tab, tag heuristic"
```

---

## Task 10: Type-check, lint, and deploy to emulator for device verification

No code changes — verification pass. Catches anything a unit test can't: dashed border on Android, font weight rendering, arc clipping, shadow correctness.

- [ ] **Step 1: Type-check**

Run: `yarn tsc --noEmit`
Expected: no errors.

- [ ] **Step 2: Lint**

Run: `yarn lint src/screens/ProgramsScreen.tsx src/components/icons/Dumbbell.tsx src/components/icons/Play.tsx src/components/icons/Export.tsx src/components/icons/Trash.tsx src/components/icons/Dots.tsx`
Expected: no errors. Fix any lint findings before proceeding.

- [ ] **Step 3: Deploy to emulator using the `/deploy` skill**

Run the `/deploy` skill to build the release APK and install on the emulator. (The skill auto-triggers after code changes per project CLAUDE.md conventions.)

- [ ] **Step 4: On-device smoke test checklist**

Walk through the Programs tab and verify each visible item:

- Header renders with green "TRAINING" eyebrow above a large bold "Programs" title.
- Stat pills row shows three dark pills with numbers + all-caps labels (ACTIVE, COMPLETED, IN PROGRESS).
- Tab switcher shows "Active (N)" / "Completed (N)" pills with the current tab highlighted; tapping switches lists.
- Program cards have:
  - A colored tag pill at the top (blue STRENGTH, amber POWER, green HYPERTROPHY, coral CONDITIONING).
  - Rounded corners (20px).
  - Rounded menu button (circle with three dots) on the right.
- Not-started cards show the dashed mint "Ready to start" panel with play icon + "{N} days/week · {M} weeks" subtitle + right chevron.
  - **Android dashed-border check:** if the border renders solid on Android, fall back to a solid 1px border with color `rgba(141,194,138,0.3)`. This is a known RN Android limitation.
- Active in-progress cards show:
  - A 3px accent line at the top that grows from left based on progress.
  - Arc progress circle on the left with percent in center.
  - WEEK / SESSIONS stat columns on the right with current/total split styling.
  - The existing thin `ProgressBar` below.
- Completed cards show:
  - Title with strikethrough and muted color.
  - Green check circle + "Completed" / "{N} sessions · {M} weeks" on the left.
  - Gold "Done" trophy pill on the right.
- Context menu: rounded corners, icons left of each label, Export in grey, Delete in red.
- Empty state (switch to Completed tab with no completed programs): shows dumbbell icon in a rounded square + "No completed programs" text. No "Create one" button on the Completed tab (only on Active).
- Empty state (first install, zero programs, Active tab): shows "No active programs" + "Create one" button; tapping opens the Create modal.

- [ ] **Step 5: Report results to the user**

Summarize what rendered correctly and flag anything that needed a fallback (e.g., dashed border on Android). Do NOT mark the plan complete if there are visual regressions — fix first, then re-verify.

---

## Notes for the executor

**TDD cadence:** where a step says "run test to verify it fails," that's literal — run the command and confirm the failure message matches the expected reason. Don't skip the verify-fail step; it catches typos in test code.

**Commits:** each task is one commit. Do not combine tasks. If a task's tests reveal a problem, fix it within that task before committing, or create a new task for follow-up work.

**No logic changes:** under no circumstances modify `loadPrograms`, `handleTap`, `handleMenuPress`, `handleExport`, `handleDeleteFromMenu`, `confirmDeleteProgram`, `onRefresh`, `handleCreated`, `PopupMenu` JSX logic (style changes only), `CreateProgramModal`, `ExportToast`, `getPrograms`, `getProgramDays`, `getProgramTotalCompleted`, or any TypeScript types in `src/types/index.ts`.

**Dead code stays:** `CompletionCircle` function, `circleStyles`, and the unreferenced style entries in the `styles` StyleSheet (`nestedCard`, `nestedCardLabel`, `nestedCardValue`, `sectionHeader`, `sectionHeaderSpaced`, `programSubtitle`, `emptyText`, `emptyHint`, `scrollContent`, `header`, `addButtonText`, `title`) are left in place for this pass. They will be removed in a follow-up task after on-device verification.

**Android dashed border fallback:** if Task 10 step 4 shows the "Ready to start" dashed border rendering as solid on Android, replace the `newStyles.readyContainer` entry `borderStyle: 'dashed'` with the comment `// borderStyle: 'dashed' — removed (Android renders solid)` and leave the solid border. This is a visual acceptable degradation.
