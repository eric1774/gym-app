# Calendar UI Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restyle `CalendarScreen` and `CalendarDayDetailScreen` to the v6 B-lite intensity defined in [`docs/superpowers/specs/2026-04-25-calendar-ui-redesign-design.md`](../specs/2026-04-25-calendar-ui-redesign-design.md) — mint radial atmosphere, gold rationed to PR moments, no logic changes.

**Architecture:** Two new shared components — `<MintRadial>` (a thin wrapper around the existing `<GradientBackdrop>` for atmospheric corner gradients, tintable for both mint and gold uses) and `<WaterDropIcon>` (an SVG drop replacing the 💧 emoji). All existing data-flow, navigation, swipe-to-delete, and DB queries remain untouched. The two screens are restyled in place: `CalendarScreen` rewritten in full (small file), `CalendarDayDetailScreen` restyled in three focused tasks (`DayNutritionCard` → `SwipeableSessionCard` → main screen + container styles).

**Tech Stack:** React Native + TypeScript + Jest + @testing-library/react-native + `react-native-svg` (already installed) + react-navigation v6. No new npm dependencies.

**Out of scope for this plan:** Multi-session day indicators, streak chip, monthly stats footer, animation polish, accessibility audit, snapshot tests. (See spec scope section.)

---

## File Structure

**New files:**
- `src/components/MintRadial.tsx` — atmospheric corner gradient (wraps `<GradientBackdrop>`)
- `src/components/__tests__/MintRadial.test.tsx`
- `src/components/WaterDropIcon.tsx` — SVG teardrop, replaces 💧 emoji
- `src/components/__tests__/WaterDropIcon.test.tsx`

**Modified files:**
- `src/screens/CalendarScreen.tsx` — full rewrite (preserves logic, replaces JSX + styles)
- `src/screens/CalendarDayDetailScreen.tsx` — restyle in three focused passes (nutrition card, session card, main container)

**Unchanged (verified):**
- `src/db/calendar.ts`, `src/db/sessions.ts`, `src/db/hydration.ts`, `src/db/macros.ts`
- `src/navigation/TabNavigator.tsx` (CalendarStackParamList)
- `src/theme/colors.ts` (every token already exists)
- All other screens

---

## Task 1: Create `<MintRadial>` component

**Files:**
- Create: `src/components/MintRadial.tsx`
- Create: `src/components/__tests__/MintRadial.test.tsx`

**Note:** Read `src/components/GradientBackdrop.tsx` first — `MintRadial` is a thin wrapper. Don't reinvent SVG plumbing.

- [ ] **Step 1: Read `src/components/GradientBackdrop.tsx`** — understand the `Overlay` type and how radial overlays work.

- [ ] **Step 2: Write the failing test**

Create `src/components/__tests__/MintRadial.test.tsx`:

```typescript
import React from 'react';
import { render } from '@testing-library/react-native';
import { MintRadial } from '../MintRadial';

describe('MintRadial', () => {
  it('renders without crashing with default props', () => {
    const { toJSON } = render(<MintRadial />);
    expect(toJSON()).toBeTruthy();
  });

  it('renders at given size, top, left', () => {
    const { getByTestId } = render(
      <MintRadial size={100} top={-20} left={-10} testID="radial" />,
    );
    const wrapper = getByTestId('radial');
    expect(wrapper.props.style).toMatchObject({
      width: 100, height: 100, top: -20, left: -10,
      position: 'absolute', overflow: 'hidden',
    });
  });

  it('uses right anchor when corner=tr', () => {
    const { getByTestId } = render(
      <MintRadial corner="tr" right={-15} testID="radial" />,
    );
    const wrapper = getByTestId('radial');
    expect(wrapper.props.style).toMatchObject({ right: -15 });
    expect(wrapper.props.style).not.toHaveProperty('left');
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npx jest src/components/__tests__/MintRadial.test.tsx`
Expected: FAIL with "Cannot find module '../MintRadial'"

- [ ] **Step 4: Implement `MintRadial`**

Create `src/components/MintRadial.tsx`:

```typescript
import React from 'react';
import { View, ViewStyle } from 'react-native';
import { GradientBackdrop } from './GradientBackdrop';
import { colors } from '../theme/colors';

export interface MintRadialProps {
  /** Square dimension in pixels. Default 280. */
  size?: number;
  /** Vertical offset (negative = above parent). Default -70. */
  top?: number;
  /** Horizontal offset (negative = beyond left edge). Default -50. Ignored if corner='tr'. */
  left?: number;
  /** Mirrored horizontal offset for corner='tr'. Default -50. */
  right?: number;
  /** Which corner to anchor: top-left ('tl', default) or top-right ('tr'). */
  corner?: 'tl' | 'tr';
  /** Base color of the radial. Default colors.accent (mint). */
  tint?: string;
  /** Test ID for the wrapper view. */
  testID?: string;
}

/**
 * Atmospheric corner gradient — a soft radial fading to transparent.
 * Used at the top-left of CalendarScreen and CalendarDayDetailScreen,
 * and reused (with tint=prGold, corner='tr') inside the PR callout.
 *
 * Wraps GradientBackdrop with a single radial overlay anchored just
 * outside the visible square so the brightest pixel sits in the corner.
 */
export function MintRadial({
  size = 280,
  top = -70,
  left = -50,
  right = -50,
  corner = 'tl',
  tint = colors.accent,
  testID,
}: MintRadialProps) {
  const wrapperStyle: ViewStyle = {
    position: 'absolute',
    width: size,
    height: size,
    top,
    overflow: 'hidden',
    ...(corner === 'tl' ? { left } : { right }),
  };

  // Radial center sits just outside the wrapper toward the anchored corner
  // so the brightest pixel falls at the corner of the parent container.
  const cx = corner === 'tl' ? '15%' : '85%';

  return (
    <View pointerEvents="none" style={wrapperStyle} testID={testID}>
      <GradientBackdrop
        borderRadius={0}
        base={{ from: 'transparent', to: 'transparent', angleDeg: 0 }}
        overlays={[
          {
            type: 'radial',
            cx, cy: '15%',
            rx: '70%', ry: '70%',
            stops: [
              { offset: 0, color: tint, opacity: 0.35 },
              { offset: 0.4, color: tint, opacity: 0.10 },
              { offset: 0.7, color: tint, opacity: 0 },
            ],
          },
        ]}
      />
    </View>
  );
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx jest src/components/__tests__/MintRadial.test.tsx`
Expected: PASS (3 tests).

- [ ] **Step 6: Type check**

Run: `npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/components/MintRadial.tsx src/components/__tests__/MintRadial.test.tsx
git commit -m "feat(components): add MintRadial atmospheric corner gradient"
```

---

## Task 2: Create `<WaterDropIcon>` component

**Files:**
- Create: `src/components/WaterDropIcon.tsx`
- Create: `src/components/__tests__/WaterDropIcon.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `src/components/__tests__/WaterDropIcon.test.tsx`:

```typescript
import React from 'react';
import { render } from '@testing-library/react-native';
import { WaterDropIcon } from '../WaterDropIcon';
import { colors } from '../../theme/colors';

describe('WaterDropIcon', () => {
  it('renders an Svg at the default size', () => {
    const { UNSAFE_getByType } = render(<WaterDropIcon testID="drop" />);
    // react-native-svg renders <Svg> at the top level
    const svg = UNSAFE_getByType(require('react-native-svg').default);
    expect(svg.props.width).toBe(14);
    expect(svg.props.height).toBe(14);
  });

  it('respects size prop', () => {
    const { UNSAFE_getByType } = render(<WaterDropIcon size={32} />);
    const svg = UNSAFE_getByType(require('react-native-svg').default);
    expect(svg.props.width).toBe(32);
    expect(svg.props.height).toBe(32);
  });

  it('uses colors.water as default fill', () => {
    const { UNSAFE_getByType } = render(<WaterDropIcon />);
    const Path = require('react-native-svg').Path;
    const path = UNSAFE_getByType(Path);
    expect(path.props.fill).toBe(colors.water);
  });

  it('respects custom color', () => {
    const { UNSAFE_getByType } = render(<WaterDropIcon color="#FF0000" />);
    const Path = require('react-native-svg').Path;
    const path = UNSAFE_getByType(Path);
    expect(path.props.fill).toBe('#FF0000');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest src/components/__tests__/WaterDropIcon.test.tsx`
Expected: FAIL with "Cannot find module '../WaterDropIcon'"

- [ ] **Step 3: Implement `WaterDropIcon`**

Create `src/components/WaterDropIcon.tsx`:

```typescript
import React from 'react';
import Svg, { Path } from 'react-native-svg';
import { colors } from '../theme/colors';

export interface WaterDropIconProps {
  size?: number;
  color?: string;
  testID?: string;
}

/**
 * Teardrop icon. Replaces the 💧 emoji in the day-detail nutrition card.
 * 24×24 viewBox so callers can request any rendered size.
 */
export function WaterDropIcon({
  size = 14,
  color = colors.water,
  testID,
}: WaterDropIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" testID={testID}>
      <Path
        d="M12 2 C7 8, 4 13, 4 16 a8 8 0 0 0 16 0 c0-3-3-8-8-14 z"
        fill={color}
      />
    </Svg>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest src/components/__tests__/WaterDropIcon.test.tsx`
Expected: PASS (4 tests).

- [ ] **Step 5: Type check**

Run: `npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/components/WaterDropIcon.tsx src/components/__tests__/WaterDropIcon.test.tsx
git commit -m "feat(components): add WaterDropIcon SVG (replaces 💧 emoji)"
```

---

## Task 3: Restyle `CalendarScreen.tsx`

**Files:**
- Modify: `src/screens/CalendarScreen.tsx` (full rewrite)

**Strategy:** Preserve all logic (state, useFocusEffect, handlers, grid math). Replace JSX structure (hero block, pill nav row, weekday row stays, grid stays but with new cell rendering) and the StyleSheet. Existing tests in `__tests__/CalendarScreen.test.tsx` should continue to pass — they only assert on month name regex, year regex, weekday letters, "Loading..." text, and day numbers.

- [ ] **Step 1: Read the existing file**

Run: read `src/screens/CalendarScreen.tsx` (340 lines).

- [ ] **Step 2: Replace the file with the restyled version**

Write `src/screens/CalendarScreen.tsx`:

```typescript
import React, { useCallback, useState } from 'react';
import {
  Dimensions,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors } from '../theme/colors';
import { fontSize, weightBold, weightSemiBold } from '../theme/typography';
import { spacing } from '../theme/spacing';
import { getWorkoutDaysForMonth, getFirstSessionDate } from '../db/calendar';
import { CalendarStackParamList } from '../navigation/TabNavigator';
import { MintRadial } from '../components/MintRadial';

type Nav = NativeStackNavigationProp<CalendarStackParamList, 'CalendarHome'>;

const WEEKDAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const HORIZONTAL_PADDING = spacing.md * 2;

function getScreenWidth(): number {
  return Dimensions.get('window').width;
}

function getCellSize(): number {
  return Math.floor((getScreenWidth() - HORIZONTAL_PADDING) / 7);
}

export function CalendarScreen() {
  const navigation = useNavigation<Nav>();
  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(today.getMonth());
  const [workoutDays, setWorkoutDays] = useState<Set<string>>(new Set());
  const [firstSessionDate, setFirstSessionDate] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      (async () => {
        try {
          setLoading(true);
          const [days, firstDate] = await Promise.all([
            getWorkoutDaysForMonth(currentYear, currentMonth + 1),
            getFirstSessionDate(),
          ]);
          if (!cancelled) {
            setWorkoutDays(new Set(days.map(d => d.date)));
            setFirstSessionDate(firstDate);
            setLoading(false);
          }
        } catch {
          if (!cancelled) { setLoading(false); }
        }
      })();
      return () => { cancelled = true; };
    }, [currentYear, currentMonth]),
  );

  function goToPrevMonth() {
    if (currentMonth === 0) {
      setCurrentYear(y => y - 1);
      setCurrentMonth(11);
    } else {
      setCurrentMonth(m => m - 1);
    }
  }

  function goToNextMonth() {
    if (currentMonth === 11) {
      setCurrentYear(y => y + 1);
      setCurrentMonth(0);
    } else {
      setCurrentMonth(m => m + 1);
    }
  }

  const isCurrentMonth =
    currentYear === today.getFullYear() && currentMonth === today.getMonth();

  let isEarliestMonth = true;
  if (firstSessionDate) {
    const [fYear, fMonth] = firstSessionDate.split('-').map(Number);
    isEarliestMonth =
      currentYear < fYear ||
      (currentYear === fYear && currentMonth + 1 <= fMonth);
  }

  const firstDayOfMonth = new Date(currentYear, currentMonth, 1).getDay();
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();

  const cells: (number | null)[] = [
    ...Array(firstDayOfMonth).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  const remainder = cells.length % 7;
  if (remainder !== 0) {
    cells.push(...Array(7 - remainder).fill(null));
  }
  const rows: (number | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) {
    rows.push(cells.slice(i, i + 7));
  }

  const cellSize = getCellSize();
  const monthName = new Date(currentYear, currentMonth, 1).toLocaleString('default', { month: 'long' });
  const monthLabelUppercase = `${monthName.toUpperCase()} · ${currentYear}`;

  function handleDayPress(day: number) {
    const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    navigation.navigate('CalendarDayDetail', { date: dateStr });
  }

  function renderDayCell(day: number | null, colIndex: number) {
    if (day === null) {
      return (
        <View
          key={`empty-${colIndex}`}
          style={[styles.cell, { width: cellSize, height: cellSize }]}
        />
      );
    }

    const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const isToday = dateStr === todayStr;
    const hasWorkout = workoutDays.has(dateStr);
    const isFuture = isCurrentMonth && day > today.getDate();
    // PR detection lives in day-detail; the calendar grid only shows mint dots
    // (PR rings would require additional per-day data — out of scope).
    const isPR = false;

    const dotSize = Math.min(cellSize - 8, 38);
    const dotStyle: any = {
      width: dotSize,
      height: dotSize,
      borderRadius: dotSize / 2,
      alignItems: 'center',
      justifyContent: 'center',
    };

    let textColor: string = colors.primary;
    if (hasWorkout) {
      dotStyle.backgroundColor = colors.accent;
      textColor = colors.onAccent;
    }
    if (isFuture && !hasWorkout) {
      textColor = colors.secondaryDim;
      dotStyle.opacity = 0.55;
    }

    const todayHaloStyle = isToday && hasWorkout ? styles.todayHalo : null;
    const prRingStyle = isPR ? styles.prRing : null;

    if (hasWorkout) {
      return (
        <TouchableOpacity
          key={dateStr}
          style={[styles.cell, { width: cellSize, height: cellSize }]}
          onPress={() => handleDayPress(day)}
          activeOpacity={0.7}
        >
          {todayHaloStyle && (
            <View
              style={[
                todayHaloStyle,
                { width: dotSize + 8, height: dotSize + 8, borderRadius: (dotSize + 8) / 2 },
              ]}
            />
          )}
          <View style={[dotStyle, prRingStyle]}>
            <Text style={[styles.dayText, { color: textColor }]}>{day}</Text>
          </View>
        </TouchableOpacity>
      );
    }

    return (
      <View
        key={dateStr}
        style={[styles.cell, { width: cellSize, height: cellSize }]}
      >
        <View style={dotStyle}>
          <Text style={[styles.dayText, { color: textColor }]}>{day}</Text>
        </View>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <MintRadial />

      {/* Hero block — "April" + "2026" stacked, left-aligned */}
      <View style={styles.hero}>
        <Text style={styles.heroTitle}>{monthName}</Text>
        <Text style={styles.heroYear}>{currentYear}</Text>
      </View>

      {/* Pill-arrow nav row */}
      <View style={styles.navRow}>
        <TouchableOpacity
          style={[styles.pillArrow, isEarliestMonth && styles.pillArrowDisabled]}
          onPress={goToPrevMonth}
          disabled={isEarliestMonth}
          activeOpacity={0.7}
        >
          <Text style={styles.pillArrowText}>{'‹'}</Text>
        </TouchableOpacity>

        <Text style={styles.monthMini}>{monthLabelUppercase}</Text>

        <TouchableOpacity
          style={[styles.pillArrow, isCurrentMonth && styles.pillArrowDisabled]}
          onPress={goToNextMonth}
          disabled={isCurrentMonth}
          activeOpacity={0.7}
        >
          <Text style={styles.pillArrowText}>{'›'}</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.weekdayRow}>
        {WEEKDAY_LABELS.map((label, idx) => (
          <View
            key={idx}
            style={[styles.cell, { width: cellSize, height: cellSize }]}
          >
            <Text style={styles.weekdayLabel}>{label}</Text>
          </View>
        ))}
      </View>

      <View style={styles.grid}>
        {loading ? (
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>Loading...</Text>
          </View>
        ) : (
          rows.map((row, rowIdx) => (
            <View key={rowIdx} style={styles.row}>
              {row.map((day, colIdx) => renderDayCell(day, colIdx))}
            </View>
          ))
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    paddingHorizontal: spacing.md,
  },
  hero: {
    paddingTop: spacing.lg,
    paddingHorizontal: spacing.xs,
    paddingBottom: spacing.sm,
  },
  heroTitle: {
    fontSize: 30,
    fontWeight: '800',
    color: colors.primary,
    letterSpacing: -0.6,
    lineHeight: 32,
  },
  heroYear: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.secondary,
    letterSpacing: 0.6,
    marginTop: 4,
  },
  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
  },
  pillArrow: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pillArrowDisabled: {
    opacity: 0.3,
  },
  pillArrowText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textSoft,
    lineHeight: 13,
  },
  monthMini: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textSoft,
    letterSpacing: 1.2,
  },
  weekdayRow: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  weekdayLabel: {
    fontSize: 11,
    color: colors.secondary,
    fontWeight: '700',
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  grid: {
    flex: 1,
  },
  row: {
    flexDirection: 'row',
  },
  cell: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  dayText: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    textAlign: 'center',
  },
  todayHalo: {
    position: 'absolute',
    backgroundColor: colors.accentGlow,
  },
  prRing: {
    borderWidth: 2,
    borderColor: colors.prGold,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 48,
  },
  loadingText: {
    color: colors.secondary,
    fontSize: fontSize.sm,
  },
});
```

**Note on `weightBold`/`weightSemiBold` import:** `weightBold` is no longer needed (we use literal `'800'`/`'700'` for hero/labels) but `weightSemiBold` is also removed. Drop those from the imports — the linter will flag unused imports otherwise.

If `weightBold` or `weightSemiBold` are still imported after the edit, remove them.

- [ ] **Step 3: Run existing tests**

Run: `npx jest src/screens/__tests__/CalendarScreen.test.tsx`
Expected: PASS — month name (regex), year (regex), weekday labels, "Loading...", day numbers all still render.

- [ ] **Step 4: Type check**

Run: `npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/screens/CalendarScreen.tsx
git commit -m "feat(calendar): restyle CalendarScreen at v6 B-lite intensity"
```

---

## Task 4: Update `formatDate` weekday from `'long'` to `'short'`

**Files:**
- Modify: `src/screens/CalendarDayDetailScreen.tsx` (one-line change in the `formatDate` helper)

- [ ] **Step 1: Read existing `formatDate` helper**

In `src/screens/CalendarDayDetailScreen.tsx` lines 39–46:

```typescript
function formatDate(dateStr: string): string {
  return new Date(dateStr + 'T12:00:00').toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}
```

- [ ] **Step 2: Edit the weekday key**

Change `weekday: 'long'` → `weekday: 'short'`. Final:

```typescript
function formatDate(dateStr: string): string {
  return new Date(dateStr + 'T12:00:00').toLocaleDateString('en-US', {
    weekday: 'short',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}
```

The output is now "Sat, April 25, 2026" instead of "Saturday, April 25, 2026".

- [ ] **Step 3: Run existing tests**

Run: `npx jest src/screens/__tests__/CalendarDayDetailScreen.test.tsx`
Expected: PASS (no test asserts on the literal weekday string format).

- [ ] **Step 4: Type check**

Run: `npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/screens/CalendarDayDetailScreen.tsx
git commit -m "feat(calendar): shorten day-detail header weekday to 3-letter form"
```

---

## Task 5: Restyle `DayNutritionCard` (in `CalendarDayDetailScreen.tsx`)

**Files:**
- Modify: `src/screens/CalendarDayDetailScreen.tsx` — `DayNutritionCard` component + `nutritionStyles` block

**Strategy:** Replace the 💧 emoji with `<WaterDropIcon>`, restructure macro row to use uppercase labels with `letterSpacing`, redesign card chrome to match the spec.

- [ ] **Step 1: Add the `WaterDropIcon` import**

At top of `src/screens/CalendarDayDetailScreen.tsx`, alongside other imports:

```typescript
import { WaterDropIcon } from '../components/WaterDropIcon';
```

- [ ] **Step 2: Replace the `DayNutritionCard` body**

Find the `DayNutritionCard` function (around line 335). Replace its return with:

```typescript
function DayNutritionCard({ data }: { data: NutritionData | null }) {
  if (!data) { return null; }
  const { waterOz, macros, calories } = data;
  if (waterOz === 0 && macros.protein === 0 && macros.carbs === 0 && macros.fat === 0) {
    return null;
  }

  return (
    <View style={nutritionStyles.card}>
      {waterOz > 0 && (
        <View style={nutritionStyles.waterRow}>
          <WaterDropIcon size={14} />
          <Text style={nutritionStyles.waterValue}>{parseFloat(waterOz.toFixed(2))}</Text>
          <Text style={nutritionStyles.waterUnit}>oz</Text>
        </View>
      )}

      {(macros.protein > 0 || macros.carbs > 0 || macros.fat > 0) && (
        <View style={nutritionStyles.macroRow}>
          <View style={nutritionStyles.macroItem}>
            <Text style={nutritionStyles.macroValue}>{parseFloat(calories.toFixed(2))}</Text>
            <Text style={nutritionStyles.macroLabel}>CAL</Text>
          </View>
          <View style={nutritionStyles.macroDivider} />
          <View style={nutritionStyles.macroItem}>
            <Text style={nutritionStyles.macroValue}>{parseFloat(macros.protein.toFixed(2))}g</Text>
            <Text style={nutritionStyles.macroLabel}>PROTEIN</Text>
          </View>
          <View style={nutritionStyles.macroDivider} />
          <View style={nutritionStyles.macroItem}>
            <Text style={nutritionStyles.macroValue}>{parseFloat(macros.carbs.toFixed(2))}g</Text>
            <Text style={nutritionStyles.macroLabel}>CARBS</Text>
          </View>
          <View style={nutritionStyles.macroDivider} />
          <View style={nutritionStyles.macroItem}>
            <Text style={nutritionStyles.macroValue}>{parseFloat(macros.fat.toFixed(2))}g</Text>
            <Text style={nutritionStyles.macroLabel}>FAT</Text>
          </View>
        </View>
      )}
    </View>
  );
}
```

- [ ] **Step 3: Replace the `nutritionStyles` block**

Find the `const nutritionStyles = StyleSheet.create({...})` block. Replace with:

```typescript
const nutritionStyles = StyleSheet.create({
  card: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    marginBottom: spacing.md,
  },
  waterRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
    marginBottom: 10,
  },
  waterValue: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.water,
    letterSpacing: -0.3,
    marginLeft: 4,
  },
  waterUnit: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.secondary,
  },
  macroRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  macroItem: {
    flex: 1,
    alignItems: 'center',
  },
  macroValue: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.primary,
    letterSpacing: -0.3,
  },
  macroLabel: {
    fontSize: 9.5,
    fontWeight: '700',
    color: colors.secondary,
    letterSpacing: 0.6,
    marginTop: 4,
  },
  macroDivider: {
    width: 1,
    height: 28,
    backgroundColor: colors.border,
  },
});
```

(Note: `divider` was renamed to `macroDivider` to avoid collision with the main file's `divider` style.)

- [ ] **Step 4: Run tests**

Run: `npx jest src/screens/__tests__/CalendarDayDetailScreen.test.tsx`
Expected: PASS — nutrition card still renders water/macros conditionally.

- [ ] **Step 5: Type check**

Run: `npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/screens/CalendarDayDetailScreen.tsx
git commit -m "feat(calendar): restyle DayNutritionCard — SVG drop, uppercase macro labels"
```

---

## Task 6: Restyle `SwipeableSessionCard` (in `CalendarDayDetailScreen.tsx`)

**Files:**
- Modify: `src/screens/CalendarDayDetailScreen.tsx` — `SwipeableSessionCard` component + supporting styles

**Strategy:** Pull the PR count out of the inline stats row and into a header chip. Add a refined PR callout panel with internal gold radial. Restyle stat pills with uppercase labels. Replace `🏆` emoji prefix with `★` glyph on PR set rows. Remove the per-card swipe-hint dash.

- [ ] **Step 1: Add `MintRadial` import**

At top of file (alongside other imports):

```typescript
import { MintRadial } from '../components/MintRadial';
```

- [ ] **Step 2: Replace the `StatItem` component**

Find the `StatItem` component (around line 116). Replace with:

```typescript
interface StatItemProps {
  label: string;
  value: string;
  unit?: string;
}

function StatItem({ label, value, unit }: StatItemProps) {
  return (
    <View style={styles.statItem}>
      <Text style={styles.statValue}>
        {value}
        {unit ? <Text style={styles.statValueUnit}> {unit}</Text> : null}
      </Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}
```

(The label moves *below* the value to match the new design. The `valueColor` prop is removed since stat pills now use a uniform color — the PR count moved to a separate chip.)

- [ ] **Step 3: Replace the `SwipeableSessionCard` return JSX**

Find the `return (...)` at the bottom of `SwipeableSessionCard`. Replace with:

```typescript
  return (
    <View style={[index > 0 && styles.cardSpacing]}>
      {/* Delete action background */}
      <Animated.View style={[styles.deleteBackground, { opacity: deleteOpacity }]}>
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={handleDeletePress}
          activeOpacity={0.8}
        >
          <TrashIcon color="#FFFFFF" size={22} />
          <Text style={styles.deleteText}>Delete</Text>
        </TouchableOpacity>
      </Animated.View>

      {/* Swipeable card content (per-card swipe-hint dash removed — banner above is sufficient) */}
      <Animated.View
        style={[styles.card, { transform: [{ translateX }] }]}
        {...panResponder.panHandlers}
      >
        {/* Card header — title left, PR badge chip right */}
        <View style={styles.cardHeader}>
          <View style={styles.cardHeaderLeft}>
            <Text style={styles.cardTitle}>{cardTitle}</Text>
            <Text style={styles.cardSubtitle}>{startTime}</Text>
          </View>
          {session.prCount > 0 && (
            <View style={styles.prBadge}>
              <Text style={styles.prBadgeText}>
                {'★'} {session.prCount} PR{session.prCount > 1 ? 's' : ''}
              </Text>
            </View>
          )}
        </View>

        {/* Primary stats row (PR count is no longer here — it lives in the header chip) */}
        <View style={styles.statsRow}>
          <StatItem label="DURATION" value={formatDuration(session.durationSeconds)} />
          <StatItem label="SETS" value={String(session.totalSets)} />
          <StatItem label="LBS" value={session.totalVolume.toLocaleString('en-US')} />
          <StatItem label="EXERCISES" value={String(session.exerciseCount)} />
        </View>

        {/* HR row — only when HR was recorded */}
        {session.avgHr != null && (
          <View style={styles.statsRow}>
            <StatItem label="AVG HR" value={String(session.avgHr)} unit="bpm" />
            {session.peakHr != null && (
              <StatItem label="PEAK HR" value={String(session.peakHr)} unit="bpm" />
            )}
          </View>
        )}

        {/* PR highlights callout — gold-tinted panel with internal gold radial */}
        {session.prCount > 0 && (
          <View style={styles.prCallout}>
            <MintRadial
              tint={colors.prGold}
              corner="tr"
              size={100}
              top={-30}
              right={-30}
            />
            <Text style={styles.prCalloutTitle}>{'★'} PERSONAL RECORD{session.prCount > 1 ? 'S' : ''}</Text>
            {session.exercises.flatMap(exercise =>
              exercise.sets
                .filter(set => set.isPR)
                .map(set => (
                  <View key={`${exercise.exerciseId}-${set.setNumber}`} style={styles.prCalloutRow}>
                    <Text style={styles.prCalloutExercise}>{exercise.exerciseName}</Text>
                    <Text style={styles.prCalloutDetail}>
                      {set.weightLbs} lbs × {set.reps}
                    </Text>
                  </View>
                )),
            )}
          </View>
        )}

        {/* Exercise breakdown */}
        {session.exercises.map((exercise, exIdx) => (
          <View key={exercise.exerciseId}>
            {exIdx > 0 && <View style={styles.divider} />}
            <Text style={styles.exerciseName}>{exercise.exerciseName}</Text>
            {exercise.sets.map(set => {
              const warmupSuffix = set.isWarmup ? ' (warm-up)' : '';
              const prefix = set.isPR ? '★ ' : '';
              const label = `${prefix}Set ${set.setNumber}: ${set.weightLbs} × ${set.reps}${warmupSuffix}`;
              const rowStyle = set.isPR
                ? styles.setRowPR
                : set.isWarmup
                  ? styles.setRowWarmup
                  : styles.setRowDefault;
              return (
                <Text key={set.setNumber} style={[styles.setRow, rowStyle]}>
                  {label}
                </Text>
              );
            })}
          </View>
        ))}
      </Animated.View>
    </View>
  );
```

Key changes:
- Per-card `swipeHint` `View` removed.
- `prCount` `StatItem` removed from `statsRow` (now in the header `prBadge`).
- HR `StatItem` uses new `unit` prop.
- New `prCallout` panel replaces `prHighlightsSection` with internal `<MintRadial tint={prGold}>`.
- PR set lines use `★` glyph (`★`) in place of `🏆`.
- Warm-up sets get a dedicated `setRowWarmup` style (italic-dim) instead of being lumped into default.

- [ ] **Step 4: Update the main `styles` block to support the new structure**

Find the `const styles = StyleSheet.create({ ... })` block at the bottom of the file. Update/add the following keys (others stay):

Replace `cardTitle`, `cardSubtitle`, `card`, `swipeHint`, `swipeHintDash`, `statsRow`, `statItem`, `statLabel`, `statValue`, `prHighlightsSection`, `prHighlightsTitle`, `prHighlightRow`, `prExerciseName`, `prDetails`, `setRow`, `setRowDefault`, `setRowPR`, `exerciseName`, `divider` — and add `statValueUnit`, `prBadge`, `prBadgeText`, `prCallout`, `prCalloutTitle`, `prCalloutRow`, `prCalloutExercise`, `prCalloutDetail`, `setRowWarmup`. Final additions/replacements:

```typescript
  // Session card
  card: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    overflow: 'hidden',
  },
  cardSpacing: {
    marginTop: spacing.md,
  },
  // (delete swipeHint and swipeHintDash entirely — no replacement)

  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  cardHeaderLeft: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.primary,
    letterSpacing: -0.2,
  },
  cardSubtitle: {
    fontSize: 11.5,
    fontWeight: '600',
    color: colors.secondary,
    marginTop: 2,
    letterSpacing: 0.3,
  },

  // PR badge chip in card header
  prBadge: {
    backgroundColor: colors.goldGlow,
    borderColor: colors.goldBorder,
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 4,
    paddingHorizontal: 9,
  },
  prBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.prGold,
    letterSpacing: 0.5,
  },

  // Stats row (uppercase mini-labels, value above label)
  statsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  statItem: {
    flex: 1,
    minWidth: 60,
  },
  statValue: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.primary,
    letterSpacing: -0.3,
  },
  statValueUnit: {
    fontSize: 10,
    color: colors.secondary,
    fontWeight: '600',
  },
  statLabel: {
    fontSize: 9.5,
    color: colors.secondary,
    fontWeight: '700',
    letterSpacing: 0.6,
    marginTop: 2,
  },

  // PR callout (replaces prHighlightsSection)
  prCallout: {
    backgroundColor: 'rgba(255,184,0,0.06)',
    borderColor: colors.goldBorder,
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    overflow: 'hidden',
    position: 'relative',
  },
  prCalloutTitle: {
    fontSize: 10.5,
    fontWeight: '800',
    color: colors.prGold,
    letterSpacing: 0.7,
    marginBottom: 6,
  },
  prCalloutRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 2,
  },
  prCalloutExercise: {
    fontSize: 12.5,
    fontWeight: '700',
    color: colors.prGold,
    flex: 1,
  },
  prCalloutDetail: {
    fontSize: 12.5,
    fontWeight: '600',
    color: colors.prGold,
    opacity: 0.9,
  },

  // Exercise breakdown
  exerciseName: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.primary,
    marginTop: 8,
    marginBottom: 4,
    letterSpacing: -0.1,
  },
  setRow: {
    fontSize: 12,
    marginBottom: 2,
  },
  setRowDefault: {
    color: colors.textSoft,
    fontWeight: '600',
  },
  setRowWarmup: {
    color: colors.secondaryDim,
    fontWeight: '600',
    fontStyle: 'italic',
  },
  setRowPR: {
    color: colors.prGold,
    fontWeight: '800',
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginTop: 10,
    marginBottom: 8,
  },
```

Delete the now-unused entries from the styles block: `swipeHint`, `swipeHintDash`, `prHighlightsSection`, `prHighlightsTitle`, `prHighlightRow`, `prExerciseName`, `prDetails`.

- [ ] **Step 5: Run tests**

Run: `npx jest src/screens/__tests__/CalendarDayDetailScreen.test.tsx`
Expected: PASS — session cards still render with title/time/stats/PRs/exercises.

- [ ] **Step 6: Type check**

Run: `npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/screens/CalendarDayDetailScreen.tsx
git commit -m "feat(calendar): restyle SwipeableSessionCard — header chip, gold callout, ★ PR sets"
```

---

## Task 7: Restyle `CalendarDayDetailScreen` main + container

**Files:**
- Modify: `src/screens/CalendarDayDetailScreen.tsx` — main `CalendarDayDetailScreen` component + remaining styles

**Strategy:** Add `<MintRadial>` to the SafeAreaView, replace bare back arrow with a 32×32 pill (matching the calendar's nav pill), refine the swipe hint banner.

- [ ] **Step 1: Replace the main `CalendarDayDetailScreen` return JSX**

Find the `return (...)` at the bottom of `CalendarDayDetailScreen` (around line 491). Replace the header + container portions:

```typescript
  return (
    <SafeAreaView style={styles.container}>
      <MintRadial />

      {/* Screen header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backPill}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
        >
          <Text style={styles.backArrow}>{'‹'}</Text>
        </TouchableOpacity>
        <Text style={styles.headerDate} numberOfLines={1} adjustsFontSizeToFit>
          {formattedDate}
        </Text>
        <View style={styles.backPill} />
      </View>

      {/* Swipe hint */}
      {!loading && sessions.length > 0 && (
        <View style={styles.swipeHintBanner}>
          <Text style={styles.swipeHintText}>Swipe left on a workout to delete</Text>
        </View>
      )}

      {/* Content */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator color={colors.accent} />
        </View>
      ) : sessions.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No workout data found</Text>
        </View>
      ) : (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <DayNutritionCard data={nutritionData} />
          {sessions.map((session, idx) => (
            <SwipeableSessionCard
              key={session.sessionId}
              session={session}
              index={idx}
              onDelete={handleDelete}
            />
          ))}
        </ScrollView>
      )}
    </SafeAreaView>
  );
```

Key changes:
- `<MintRadial />` added at top of `SafeAreaView`.
- `backButton` → `backPill` (32×32 with hairline border).
- Back arrow glyph: `‹` (Unicode `‹`) instead of `<`.
- Right-side spacer reuses `backPill` style for symmetric centering of the date.

- [ ] **Step 2: Update the corresponding styles in the main `styles` block**

Replace the existing `header`, `backButton`, `backArrow`, `headerDate`, `swipeHintBanner`, `swipeHintText` keys with:

```typescript
  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  backPill: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backArrow: {
    fontSize: 14,
    color: colors.textSoft,
    fontWeight: '700',
    lineHeight: 14,
  },
  headerDate: {
    flex: 1,
    fontSize: 13,
    fontWeight: '700',
    color: colors.primary,
    textAlign: 'center',
    letterSpacing: 0.2,
  },

  // Swipe hint banner
  swipeHintBanner: {
    alignItems: 'center',
    paddingBottom: spacing.xs,
  },
  swipeHintText: {
    fontSize: 10.5,
    color: colors.secondaryDim,
    fontStyle: 'italic',
    letterSpacing: 0.2,
  },
```

Delete the old `backButton` style (replaced by `backPill`).

- [ ] **Step 3: Run tests**

Run: `npx jest src/screens/__tests__/CalendarDayDetailScreen.test.tsx`
Expected: PASS — header still renders date, back button still navigates, swipe hint still shows when sessions exist.

- [ ] **Step 4: Type check**

Run: `npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/screens/CalendarDayDetailScreen.tsx
git commit -m "feat(calendar): restyle CalendarDayDetailScreen container — pill back, mint radial, refined hint"
```

---

## Task 8: Verification

**Files:** none modified.

**Goal:** Confirm the redesign matches the spec on a real device, all tests stay green, and no orphaned styles linger.

- [ ] **Step 1: Run the full test suite**

Run: `npx jest`
Expected: PASS (no regressions in any screen or component test).

- [ ] **Step 2: Run lint + type check**

Run: `npm run lint 2>&1` *(if a lint script exists; check `package.json`)*
Run: `npx tsc --noEmit`
Expected: PASS — no unused imports, no missing types.

- [ ] **Step 3: Search for orphaned style references**

Run:

```bash
grep -nE 'swipeHint|swipeHintDash|prHighlightsSection|prHighlightsTitle|prHighlightRow|prExerciseName|prDetails|backButton' src/screens/CalendarDayDetailScreen.tsx
```

Expected: no matches in the styles block (all renamed/removed). Some matches inside `prCallout*` keys are fine — search is just to catch leftover names from before.

- [ ] **Step 4: Visual verification on emulator**

Build and deploy via the `deploy` skill (or `npx react-native run-android`).

Then in the running app:
1. Navigate to the **Calendar** tab.
2. Confirm: hero shows "[Month] / [Year]", soft mint radial in top-left, pill `‹ ›` arrows around an uppercase month label, weekday row, day grid with mint dots on workout days, today's mint dot has an ambient halo, future days are dim.
3. Tap a workout day with a PR (or any workout day — gold rings on the *grid* are out of scope for this plan; only day-detail shows gold).
4. Confirm day-detail header reads `‹ Sat, Apr DD, YYYY` (3-letter weekday).
5. Confirm a session with PRs shows the gold `★ N PR` chip in the card header, and the gold callout panel below the stats row with the internal gold radial.
6. Swipe a card left — confirm the swipe-to-delete still reveals the trash icon as before. Confirm there is no per-card swipe-hint dash on the right edge.

- [ ] **Step 5: Compare against locked mockups**

Run the brainstorming companion server (if not running):

```bash
.superpowers/brainstorm/501171-1777168731  # session dir already populated
scripts/start-server.sh --project-dir $(pwd)
```

Open the served URL and side-by-side compare the device against:
- `personality-intensity.html` — verify B variant matches the calendar grid look.
- `chip-options.html` — verify B1 (no chip, no footer) is what shipped.
- `rest-day-style.html` — verify rest days are bare numbers (no hairline ring).
- `day-detail-blite.html` — verify day-detail layout, nutrition card, session card, PR callout, set rows.

Note any deltas. Acceptable deltas: minor pixel-spacing differences (mockups are HTML approximations), font rendering between web and native. Unacceptable deltas: missing radial, missing PR ring/badge, wrong colors, swipe-hint dash still showing, "Saturday" instead of "Sat".

- [ ] **Step 6: Final commit (if any tweaks were needed)**

If verification surfaced a small fix, apply it and commit:

```bash
git add src/...
git commit -m "fix(calendar): <specific fix from device verification>"
```

If no fixes are needed, skip this step.

---

## Self-review notes

This plan covers every line item from the spec:

| Spec section | Task |
|---|---|
| New component: `MintRadial` | Task 1 |
| New component: `WaterDropIcon` | Task 2 |
| `formatDate` weekday change (`'long'` → `'short'`) | Task 4 |
| `CalendarScreen` hero, pill nav, today halo, future-day dim | Task 3 |
| `DayNutritionCard` SVG drop, uppercase labels | Task 5 |
| `SwipeableSessionCard` header chip, stats restyle, gold callout, ★ PR sets, no per-card dash | Task 6 |
| Main `CalendarDayDetailScreen` mint radial, pill back, refined hint banner | Task 7 |
| Verification (test suite, lint, device, mockup comparison) | Task 8 |

PR ring on the calendar grid (spec mentions it as a future-style for PR-day cells) is implemented as `prRing` style in Task 3 but currently disabled (`isPR = false` placeholder) because per-cell PR data is not fetched by `getWorkoutDaysForMonth`. Wiring it up would require either expanding that DB query or adding a new query — out of scope per spec ("no logic changes"). The style is in place so a future single-line edit can enable it.
