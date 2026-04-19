# Dashboard Nutrition Rings Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a "Today's Nutrition" card with 4 animated circular progress rings (Protein, Carbs, Fat, Hydration) below the weekly snapshot card on the Dashboard.

**Architecture:** Single new component `NutritionRingsCard` that fetches today's macro totals + water total on focus, computes percentages against saved goals, and renders 4 SVG ring progress indicators with staggered animation. Each ring is independently tappable, navigating to the Health tab's Macros or Hydration sub-tab.

**Tech Stack:** React Native, react-native-svg (Circle), React Native Animated API, existing SQLite DB functions

**Spec:** `docs/superpowers/specs/2026-04-13-dashboard-nutrition-rings-design.md`

---

## File Structure

| Action | File | Responsibility |
|--------|------|---------------|
| Create | `src/components/ProgressRing.tsx` | Reusable animated SVG circular progress ring |
| Create | `src/components/NutritionRingsCard.tsx` | Dashboard card with 4 ProgressRings, data fetching, tap navigation |
| Modify | `src/screens/DashboardScreen.tsx` | Import and render NutritionRingsCard below WeeklySnapshotCard |
| Modify | `src/screens/ProteinScreen.tsx` | Accept optional `initialTab` route param for deep-linking to Macros vs Hydration |
| Modify | `src/navigation/TabNavigator.tsx` | Add `initialTab` param to ProteinStackParamList and pass through |

---

### Task 1: ProgressRing Component

A reusable animated SVG circular progress ring. Takes a percentage, color, and size. Handles the stroke-dashoffset animation internally.

**Files:**
- Create: `src/components/ProgressRing.tsx`

- [ ] **Step 1: Create ProgressRing component**

```tsx
// src/components/ProgressRing.tsx
import React, { useEffect, useRef } from 'react';
import { Animated, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

interface ProgressRingProps {
  /** 0–100 */
  percentage: number;
  /** Stroke color for the filled arc */
  color: string;
  /** Outer diameter in pixels (default 62) */
  size?: number;
  /** Stroke width in pixels (default 5) */
  strokeWidth?: number;
  /** Animation delay in ms (default 0) */
  delay?: number;
}

export function ProgressRing({
  percentage,
  color,
  size = 62,
  strokeWidth = 5,
  delay = 0,
}: ProgressRingProps) {
  const animatedValue = useRef(new Animated.Value(0)).current;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const center = size / 2;

  useEffect(() => {
    animatedValue.setValue(0);
    Animated.timing(animatedValue, {
      toValue: percentage,
      duration: 600,
      delay,
      useNativeDriver: true,
      easing: undefined, // default ease
    }).start();
  }, [percentage, delay]);

  const strokeDashoffset = animatedValue.interpolate({
    inputRange: [0, 100],
    outputRange: [circumference, 0],
    extrapolate: 'clamp',
  });

  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {/* Background track */}
        <Circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke="#33373D"
          strokeWidth={strokeWidth}
        />
        {/* Animated progress arc */}
        <AnimatedCircle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          rotation={-90}
          origin={`${center}, ${center}`}
        />
      </Svg>
    </View>
  );
}
```

- [ ] **Step 2: Verify ProgressRing renders without errors**

Run the app and visually confirm import doesn't crash. Or run:
```bash
npx tsc --noEmit
```
Expected: No type errors in `ProgressRing.tsx`.

- [ ] **Step 3: Commit**

```bash
git add src/components/ProgressRing.tsx
git commit -m "feat: add reusable ProgressRing SVG component with animation"
```

---

### Task 2: NutritionRingsCard Component

The main card that fetches data, computes percentages, and renders 4 labeled rings with tap handlers.

**Files:**
- Create: `src/components/NutritionRingsCard.tsx`

- [ ] **Step 1: Create NutritionRingsCard component**

```tsx
// src/components/NutritionRingsCard.tsx
import React, { useCallback, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useFocusEffect, useNavigation, NavigationProp } from '@react-navigation/native';
import { ProgressRing } from './ProgressRing';
import { getMacroGoals, getTodayMacroTotals } from '../db/macros';
import { getWaterGoal, getTodayWaterTotal } from '../db/hydration';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { fontSize, weightBold, weightSemiBold } from '../theme/typography';
import type { MacroSettings, MacroValues } from '../types';
import type { TabParamList } from '../navigation/TabNavigator';

/** Per-ring color mapping matching the design spec. */
const RING_COLORS = {
  protein: colors.accent,     // #8DC28A mint
  carbs: '#F0B830',           // gold
  fat: '#E8845C',             // coral
  water: colors.water,        // #4A8DB7 ocean blue
} as const;

function pct(current: number, goal: number | null): number {
  if (!goal || goal <= 0) return 0;
  return Math.min(100, Math.round((current / goal) * 100));
}

export function NutritionRingsCard() {
  const navigation = useNavigation<NavigationProp<any>>();
  const [totals, setTotals] = useState<MacroValues>({ protein: 0, carbs: 0, fat: 0 });
  const [goals, setGoals] = useState<MacroSettings | null>(null);
  const [waterOz, setWaterOz] = useState(0);
  const [waterGoalOz, setWaterGoalOz] = useState<number | null>(null);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      (async () => {
        try {
          const [macroTotals, macroGoals, todayWater, waterSettings] = await Promise.all([
            getTodayMacroTotals(),
            getMacroGoals(),
            getTodayWaterTotal(),
            getWaterGoal(),
          ]);
          if (!cancelled) {
            setTotals(macroTotals);
            setGoals(macroGoals);
            setWaterOz(todayWater);
            setWaterGoalOz(waterSettings?.goalOz ?? null);
          }
        } catch (err) {
          console.warn('NutritionRingsCard fetch failed:', err);
        }
      })();
      return () => { cancelled = true; };
    }, []),
  );

  const proteinGoal = goals?.proteinGoal ?? null;
  const carbGoal = goals?.carbGoal ?? null;
  const fatGoal = goals?.fatGoal ?? null;

  const navigateToHealth = useCallback((tab: 'macros' | 'hydration') => {
    const parent = navigation.getParent<NavigationProp<TabParamList>>();
    if (parent) {
      parent.navigate('ProteinTab', {
        screen: 'ProteinHome',
        params: { initialTab: tab === 'macros' ? 0 : 1 },
      });
    }
  }, [navigation]);

  const rings = [
    {
      key: 'protein',
      label: 'Protein',
      color: RING_COLORS.protein,
      current: totals.protein,
      goal: proteinGoal,
      unit: 'g',
      tab: 'macros' as const,
      delay: 0,
    },
    {
      key: 'carbs',
      label: 'Carbs',
      color: RING_COLORS.carbs,
      current: totals.carbs,
      goal: carbGoal,
      unit: 'g',
      tab: 'macros' as const,
      delay: 50,
    },
    {
      key: 'fat',
      label: 'Fat',
      color: RING_COLORS.fat,
      current: totals.fat,
      goal: fatGoal,
      unit: 'g',
      tab: 'macros' as const,
      delay: 100,
    },
    {
      key: 'water',
      label: 'Water',
      color: RING_COLORS.water,
      current: waterOz,
      goal: waterGoalOz,
      unit: 'oz',
      tab: 'hydration' as const,
      delay: 150,
    },
  ];

  return (
    <View style={styles.card}>
      <Text style={styles.header}>TODAY&apos;S NUTRITION</Text>
      <View style={styles.row}>
        {rings.map((ring) => {
          const percentage = pct(ring.current, ring.goal);
          const hasGoal = ring.goal !== null && ring.goal > 0;
          const subLabel = hasGoal
            ? `${Math.round(ring.current)}/${Math.round(ring.goal!)}${ring.unit}`
            : undefined;

          return (
            <TouchableOpacity
              key={ring.key}
              style={styles.ringColumn}
              activeOpacity={0.7}
              onPress={() => navigateToHealth(ring.tab)}
            >
              <ProgressRing
                percentage={percentage}
                color={ring.color}
                delay={ring.delay}
              />
              <Text style={styles.pctText}>
                {percentage}%
              </Text>
              <Text style={styles.label}>{ring.label}</Text>
              {hasGoal ? (
                <Text style={styles.subLabel}>{subLabel}</Text>
              ) : (
                <Text style={styles.setGoal}>Set goal</Text>
              )}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.base,
    marginHorizontal: spacing.base,
    marginBottom: spacing.md,
  },
  header: {
    color: colors.secondary,
    fontSize: fontSize.sm,
    fontWeight: weightBold,
    letterSpacing: 1.2,
    marginBottom: spacing.md,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'flex-start',
  },
  ringColumn: {
    alignItems: 'center',
    minWidth: 62,
  },
  pctText: {
    position: 'absolute',
    top: 21,
    alignSelf: 'center',
    color: colors.primary,
    fontSize: 14,
    fontWeight: weightBold,
  },
  label: {
    color: colors.primary,
    fontSize: 11,
    fontWeight: weightSemiBold,
    marginTop: 6,
  },
  subLabel: {
    color: colors.secondary,
    fontSize: 10,
    marginTop: 2,
  },
  setGoal: {
    color: colors.accent,
    fontSize: 10,
    marginTop: 2,
  },
});
```

**Key implementation notes:**
- `pct()` returns 0 when goal is null or 0 (no-goal state).
- `pctText` is absolutely positioned to overlay the center of the ring at `top: 21` (vertically centered within 62px ring).
- The `navigateToHealth` callback uses `navigation.getParent()` to access the tab navigator, same pattern as `handleQuickStart` in `DashboardScreen.tsx:107`.
- Navigation passes `initialTab` param to `ProteinHome` — we'll wire this up in Task 4.

- [ ] **Step 2: Type check**

```bash
npx tsc --noEmit
```
Expected: No type errors. (Navigation params may show a warning until Task 4 wires `initialTab` — that's expected at this stage.)

- [ ] **Step 3: Commit**

```bash
git add src/components/NutritionRingsCard.tsx
git commit -m "feat: add NutritionRingsCard with data fetching and tap navigation"
```

---

### Task 3: Integrate into DashboardScreen

Add `NutritionRingsCard` below `WeeklySnapshotCard` in the dashboard.

**Files:**
- Modify: `src/screens/DashboardScreen.tsx:23,191-194`

- [ ] **Step 1: Add import**

At the top of `src/screens/DashboardScreen.tsx`, after the existing `WeeklySnapshotCard` import (line 23), add:

```tsx
import { NutritionRingsCard } from '../components/NutritionRingsCard';
```

- [ ] **Step 2: Render NutritionRingsCard below WeeklySnapshotCard**

In `DashboardScreen.tsx`, find this block (lines 191-194):

```tsx
      <WeeklySnapshotCard
        snapshot={snapshot}
        onPress={() => navigation.navigate('ProgressHub')}
      />
```

Add the new component directly after it:

```tsx
      <WeeklySnapshotCard
        snapshot={snapshot}
        onPress={() => navigation.navigate('ProgressHub')}
      />
      <NutritionRingsCard />
```

- [ ] **Step 3: Type check and visual test**

```bash
npx tsc --noEmit
```

Then open the app on the emulator and navigate to the Dashboard tab. Verify:
- The nutrition rings card appears below the "This Week" card
- 4 rings are visible with labels (Protein, Carbs, Fat, Water)
- Rings animate in with a staggered cascade
- If no goals are set, rings show 0% and "Set goal" in mint green

- [ ] **Step 4: Commit**

```bash
git add src/screens/DashboardScreen.tsx
git commit -m "feat: render NutritionRingsCard on dashboard below weekly snapshot"
```

---

### Task 4: Wire Up Deep-Link Navigation to Health Tab

Make tapping a ring navigate to the correct sub-tab (Macros or Hydration) on the Health screen.

**Files:**
- Modify: `src/navigation/TabNavigator.tsx:64-66` — Add `initialTab` param to `ProteinStackParamList`
- Modify: `src/screens/ProteinScreen.tsx:16-19` — Read `initialTab` from route params

- [ ] **Step 1: Add initialTab to ProteinStackParamList**

In `src/navigation/TabNavigator.tsx`, find (line 64-65):

```tsx
export type ProteinStackParamList = {
  ProteinHome: undefined;
```

Replace with:

```tsx
export type ProteinStackParamList = {
  ProteinHome: { initialTab?: number } | undefined;
```

This allows passing `initialTab: 0` (Macros) or `initialTab: 1` (Hydration) when navigating.

- [ ] **Step 2: Read initialTab in ProteinScreen**

In `src/screens/ProteinScreen.tsx`, update the imports and component to read the route param:

Replace the existing imports at the top (lines 1-5):

```tsx
import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ProteinStackParamList } from '../navigation/TabNavigator';
```

With:

```tsx
import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ProteinStackParamList } from '../navigation/TabNavigator';
```

Then update the component function (lines 16-19):

```tsx
export function ProteinScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NativeStackNavigationProp<ProteinStackParamList>>();
  const [activeTab, setActiveTab] = useState(0); // 0 = Macros (default per TAB-01)
```

Replace with:

```tsx
export function ProteinScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NativeStackNavigationProp<ProteinStackParamList>>();
  const route = useRoute<RouteProp<ProteinStackParamList, 'ProteinHome'>>();
  const [activeTab, setActiveTab] = useState(route.params?.initialTab ?? 0);

  useEffect(() => {
    if (route.params?.initialTab !== undefined) {
      setActiveTab(route.params.initialTab);
    }
  }, [route.params?.initialTab]);
```

The `useEffect` ensures that if the user is already on the Health tab and taps a ring on the Dashboard, the tab switches correctly even if `ProteinScreen` is already mounted.

- [ ] **Step 3: Type check and test navigation**

```bash
npx tsc --noEmit
```

Then on the emulator:
1. Navigate to Dashboard
2. Tap a Protein/Carbs/Fat ring → should jump to Health tab with Macros sub-tab selected
3. Go back to Dashboard
4. Tap the Water ring → should jump to Health tab with Hydration sub-tab selected
5. If no goals set, tapping "Set goal" ring should still navigate correctly

- [ ] **Step 4: Commit**

```bash
git add src/navigation/TabNavigator.tsx src/screens/ProteinScreen.tsx
git commit -m "feat: support deep-linking to Health tab macros/hydration sub-tab"
```

---

### Task 5: Visual Polish and Edge Case Testing

Final pass — verify all edge cases from the spec on-device.

**Files:**
- Possibly tweak: `src/components/NutritionRingsCard.tsx` (if visual adjustments needed)

- [ ] **Step 1: Test all edge cases on emulator**

Test each scenario from the spec:

| Scenario | How to test | Expected |
|----------|-------------|----------|
| All goals unset | Fresh install or clear `macro_settings` and `water_settings` | 4 rings at 0%, all showing "Set goal" in mint green |
| Meals logged, no goal | Log a meal via Health tab, don't set a goal | 0% ring, "Set goal" label |
| Goal exceeded | Set protein goal to 50g, log 80g of protein | Ring at 100%, sub-label shows "80/50g" |
| No meals today | Set goals but don't log any meals today | All macros at 0%, sub-labels show "0/150g" etc. |
| Mixed state | Set protein + water goals only, leave carbs/fat unset | Protein + Water show progress, Carbs + Fat show "Set goal" |

- [ ] **Step 2: Verify animation**

- Rings should animate from 0% to current percentage on first load
- Switch to another tab and back — rings should re-animate (useFocusEffect triggers)
- Stagger should be visible: Protein starts first, Water starts last (~150ms later)

- [ ] **Step 3: Verify visual alignment**

- Ring percentage text should be centered inside each ring
- Labels and sub-labels should be centered below rings
- Card should have consistent spacing with WeeklySnapshotCard above
- Colors should match spec: mint/gold/coral/blue

- [ ] **Step 4: Make any visual adjustments if needed and commit**

If `pctText` vertical centering needs adjustment (the `top: 21` value), tweak it. If ring spacing feels off, adjust `ringColumn.minWidth` or `row` padding.

```bash
git add -u
git commit -m "fix: visual polish for nutrition rings alignment and spacing"
```

(Only commit if changes were made.)
