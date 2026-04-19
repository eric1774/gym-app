# WorkoutScreen V1 (Stacked Cards) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Port the "V1 Stacked Cards" design from `design_handoff_workout_screen/` into the live React Native `WorkoutScreen`, across 10 shippable phases with zero DB migrations.

**Architecture:** Component-first rollout. Build bottom-up (icons → primitives → header/timer/warmup reskins → NumberPad → state hoist with `SetRow`/`NextSetPanel` → `ExerciseCard` extraction → `SupersetGroup` rewrite → final polish). Every phase commit is `/deploy`-testable. Per-exercise set state (`setsByExercise`, `nextByExercise`, `lastSetsByExercise`) is hoisted from `SetLoggingPanel` up to `WorkoutScreen` so the single screen-level `NumberPad` can write into whichever card is expanded. PR flags are kept in-memory per session (no schema change). Supersets render a purple container with A1/A2 badges and auto-advance `activeExerciseId` on log.

**Tech Stack:** React Native 0.84, TypeScript 5.8, `react-native-svg` 15.15, `react-native-haptic-feedback`, `@notifee/react-native`, `react-native-background-timer`, `react-native-sqlite-storage`. No new runtime dependencies.

**Working directory:** all file paths are relative to the worktree root `C:/Users/eolson/WorkPC-Development/.worktrees/workout-screen-v1/`. All `git` and `npm` commands run from that directory.

**Spec:** `docs/superpowers/specs/2026-04-18-workout-screen-v1-design.md` (commit `cb2dc74`).

**Restore point:** `fe9b89d` on `main` (design handoff materials). Rollback target if the redesign is abandoned.

**Typecheck command:** `npx tsc --noEmit` (no `typecheck` npm script exists).
**Test command:** `npm test` (runs Jest).
**Lint command:** `npm run lint` (runs ESLint).
**Deploy command:** The `/deploy` skill. Invoke it after any phase that changes visible UI to build and install the debug APK on the emulator, then perform the per-phase smoke-test checklist on-device.

**Verification convention for this plan:** Since Decision #6 rules out new unit tests, each task's verification step is typecheck + (for UI-touching tasks) `/deploy` smoke test. The existing Jest suite must keep passing and is run at Phase 7 and Phase 10.

**Commit convention:** Conventional Commits (`feat:` / `refactor:` / `chore:` / `style:` / `fix:` / `docs:`). Each commit message in this plan ends with:

```
Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
```

Use a `git commit -m "$(cat <<'EOF' ... EOF)"` heredoc when the message has a body.

---

## File Structure

### New files

| Path | Responsibility |
|---|---|
| `src/components/icons/index.ts` | Barrel export of all 13 icon components |
| `src/components/icons/Plus.tsx` | `+` icon (24×24 viewBox, 2.4 stroke) |
| `src/components/icons/Minus.tsx` | `−` icon |
| `src/components/icons/Check.tsx` | `✓` icon (stroke, 2.6 weight) |
| `src/components/icons/History.tsx` | clock-arrow back icon |
| `src/components/icons/More.tsx` | three-dot ⋯ icon |
| `src/components/icons/Chevron.tsx` | rotatable chevron (up/down/left/right via `dir` prop) |
| `src/components/icons/Swap.tsx` | ↔ swap arrows |
| `src/components/icons/Flame.tsx` | filled flame for warmup |
| `src/components/icons/Trophy.tsx` | trophy for PRs |
| `src/components/icons/Close.tsx` | ✕ icon |
| `src/components/icons/Timer.tsx` | clock-with-knob timer icon |
| `src/components/icons/Heart.tsx` | filled heart for HR pill |
| `src/components/icons/Backspace.tsx` | backspace for NumberPad |
| `src/components/HrPill.tsx` | BPM + zone-colored pill |
| `src/components/WorkoutHeader.tsx` | LIVE badge, elapsed, HrPill, FINISH, stats row |
| `src/components/NumberPad.tsx` | Slide-up modal numeric keypad |
| `src/components/SupersetGroup.tsx` | Purple container with A1/A2 badges and auto-advance |
| `src/components/ExerciseCard.tsx` | Extracted + reshaped exercise card |
| `src/components/NextSetPanel.tsx` | Stepper rows / timer display within expanded card |
| `src/components/SetRow.tsx` | 4-col grid row for logged sets |

### Reworked files

| Path | Change type |
|---|---|
| `src/screens/WorkoutScreen.tsx` | Layout rewrite + state hoist + screen-level `NumberPad` host |
| `src/context/TimerContext.tsx` | Add `addTime(deltaSeconds: number)` method |
| `src/context/SessionContext.tsx` | Add `skipAllWarmupItems()` method |
| `src/components/SetLoggingPanel.tsx` | Dissolved; logic split across `ExerciseCard`/`NextSetPanel`/`SetRow`. File may be deleted in Phase 10 |
| `src/components/RestTimerBanner.tsx` | Amber reskin + `onAdd` prop + 32×32 icon circle + pill buttons + 3px progress |
| `src/components/WarmupSection.tsx` | Amber↔mint reskin + progress bar + SKIP TO WORKOUT button |
| `src/components/GhostReference.tsx` | Reshape as collapsible dashed "Last session · N sets" button |
| `src/components/SetListItem.tsx` | Either replaced by `SetRow` or updated to match 4-col grid |
| `src/theme/colors.ts` | Add V1-specific tokens (`warmupAmber`, `supersetPurple`, `hrZone1..5`, `borderStrong`, `secondaryDim`, `accentGlow`) |

### Extracted at end (Phase 10)

| Path | Origin |
|---|---|
| `src/components/WorkoutSummary.tsx` | Extracted from `WorkoutScreen.tsx` (no visual change) |

---

## Phase 0 — Restore point + worktree [DONE]

Already complete. No tasks.

- Commit `fe9b89d` on `main`: design handoff materials captured as restore point.
- Commit `e60e720` on `main`: `.gitignore` updated for `.worktrees/`.
- Worktree at `.worktrees/workout-screen-v1` on branch `feat/workout-screen-v1`.
- Commit `cb2dc74` on `feat/workout-screen-v1`: design spec.
- `npm install` completed cleanly.

---

## Phase 1 — Icon library

Creates `src/components/icons/` with 13 `react-native-svg` components. No consumers yet; typecheck-only verification.

### Task 1.1 — Extend theme with V1 color tokens

**Files:**
- Modify: `src/theme/colors.ts`

- [ ] **Step 1: Replace the file contents**

```ts
export const colors = {
  background: '#151718',          // Deep charcoal — NEVER pure black
  surface: '#1E2024',             // Container/section backgrounds
  surfaceElevated: '#24272C',     // Card backgrounds (nested inside surfaces)
  border: 'rgba(255,255,255,0.05)', // Subtle 1px edge definition
  borderStrong: 'rgba(255,255,255,0.14)', // Stronger 1.5px edges (check circles)
  primary: '#FFFFFF',             // Primary text, titles
  secondary: '#8E9298',           // Subtitles, timestamps, section headers
  secondaryDim: '#6A6E74',        // Dimmer meta text
  accent: '#8DC28A',              // Mint green — CTAs, active states, progress fills
  accentDim: '#1A3326',           // Very faint mint for subtle backgrounds
  accentGlow: 'rgba(141,194,138,0.15)', // Mint highlight fill
  onAccent: '#1A1A1A',            // Dark text on accent-colored backgrounds
  danger: '#D9534F',              // Muted red/coral for destructive actions
  timerActive: '#FACC15',         // Timer accent (keep existing)
  tabBar: '#151718',              // Match app background
  tabIconActive: '#8DC28A',       // Mint green for active tab
  tabIconInactive: '#555555',     // Medium grey for inactive tabs
  prGold: '#FFB800',              // Warm amber-gold for PR toasts and highlights
  prGoldDim: '#3D2E00',           // Subtle background behind PR toast text
  water: '#4A8DB7',               // Ocean blue for hydration cup fill
  waterDark: '#1A2F3D',           // Dark blue tint for empty cup background
  warmupAmber: '#F0B830',         // Warm-up pending eyebrow + border
  supersetPurple: '#B57AE0',      // Superset chrome + A1/A2 badges + glow
  hrZone1: '#5B9BF0',             // HR zone 1 (recovery) — blue
  hrZone2: '#8DC28A',             // HR zone 2 (aerobic) — mint
  hrZone3: '#FACC15',             // HR zone 3 (tempo) — yellow
  hrZone4: '#E8845C',             // HR zone 4 (threshold) — orange
  hrZone5: '#E0697E',             // HR zone 5 (anaerobic) — red
} as const;

export type ColorKey = keyof typeof colors;

/** Per-category accent colors for visual differentiation */
export const categoryColors: Record<string, string> = {
  chest: '#E8845C',
  back: '#5B9BF0',
  legs: '#B57AE0',
  shoulders: '#4ECDC4',
  arms: '#8DC28A',
  core: '#F0B830',
  conditioning: '#E0697E',
  stretching: '#9B8EC4',
};

export function getCategoryColor(category: string): string {
  return categoryColors[category] ?? colors.accent;
}

/** Map HR zone (1..5) to color. Returns disconnected-grey when null. */
export function getHrZoneColor(zone: 1 | 2 | 3 | 4 | 5 | null): string {
  if (zone === null) { return colors.secondaryDim; }
  const map = [colors.hrZone1, colors.hrZone2, colors.hrZone3, colors.hrZone4, colors.hrZone5];
  return map[zone - 1];
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: exit 0, no errors.

- [ ] **Step 3: Commit**

```bash
git add src/theme/colors.ts
git commit -m "feat(theme): add V1 color tokens for workout screen redesign

Adds warmupAmber, supersetPurple, hrZone1..5, borderStrong, secondaryDim,
accentGlow, and a getHrZoneColor helper. Existing tokens unchanged.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

### Task 1.2 — Create icon components (one per icon)

**Files:**
- Create: `src/components/icons/Plus.tsx`
- Create: `src/components/icons/Minus.tsx`
- Create: `src/components/icons/Check.tsx`
- Create: `src/components/icons/History.tsx`
- Create: `src/components/icons/More.tsx`
- Create: `src/components/icons/Chevron.tsx`
- Create: `src/components/icons/Swap.tsx`
- Create: `src/components/icons/Flame.tsx`
- Create: `src/components/icons/Trophy.tsx`
- Create: `src/components/icons/Close.tsx`
- Create: `src/components/icons/Timer.tsx`
- Create: `src/components/icons/Heart.tsx`
- Create: `src/components/icons/Backspace.tsx`
- Create: `src/components/icons/index.ts`

Paths, viewBoxes, and stroke widths are transcribed verbatim from `design_handoff_workout_screen/icons.jsx`.

- [ ] **Step 1: Create `Plus.tsx`**

```tsx
import React from 'react';
import Svg, { Path } from 'react-native-svg';

interface IconProps {
  size?: number;
  color?: string;
}

export function Plus({ size = 20, color = '#FFFFFF' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M12 5v14M5 12h14" stroke={color} strokeWidth={2.4} strokeLinecap="round" />
    </Svg>
  );
}
```

- [ ] **Step 2: Create `Minus.tsx`**

```tsx
import React from 'react';
import Svg, { Path } from 'react-native-svg';

interface IconProps {
  size?: number;
  color?: string;
}

export function Minus({ size = 20, color = '#FFFFFF' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M5 12h14" stroke={color} strokeWidth={2.4} strokeLinecap="round" />
    </Svg>
  );
}
```

- [ ] **Step 3: Create `Check.tsx`**

```tsx
import React from 'react';
import Svg, { Path } from 'react-native-svg';

interface IconProps {
  size?: number;
  color?: string;
}

export function Check({ size = 18, color = '#FFFFFF' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M4 12l5 5L20 6" stroke={color} strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}
```

- [ ] **Step 4: Create `History.tsx`**

```tsx
import React from 'react';
import Svg, { Path } from 'react-native-svg';

interface IconProps {
  size?: number;
  color?: string;
}

export function History({ size = 18, color = '#8E9298' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M12 8v4l3 3" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M3.1 11a9 9 0 1 1 .1 2" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M3 4v7h7" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}
```

- [ ] **Step 5: Create `More.tsx`**

```tsx
import React from 'react';
import Svg, { Circle } from 'react-native-svg';

interface IconProps {
  size?: number;
  color?: string;
}

export function More({ size = 20, color = '#8E9298' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx="5" cy="12" r="1.6" fill={color} />
      <Circle cx="12" cy="12" r="1.6" fill={color} />
      <Circle cx="19" cy="12" r="1.6" fill={color} />
    </Svg>
  );
}
```

- [ ] **Step 6: Create `Chevron.tsx`**

```tsx
import React from 'react';
import Svg, { Path } from 'react-native-svg';

type Dir = 'up' | 'down' | 'left' | 'right';

interface ChevronProps {
  size?: number;
  color?: string;
  dir?: Dir;
}

function rotationFor(dir: Dir): string {
  switch (dir) {
    case 'up':    return '180deg';
    case 'right': return '-90deg';
    case 'left':  return '90deg';
    default:      return '0deg';
  }
}

export function Chevron({ size = 18, color = '#8E9298', dir = 'down' }: ChevronProps) {
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      style={{ transform: [{ rotate: rotationFor(dir) }] }}>
      <Path d="M6 9l6 6 6-6" stroke={color} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}
```

- [ ] **Step 7: Create `Swap.tsx`**

```tsx
import React from 'react';
import Svg, { Path } from 'react-native-svg';

interface IconProps {
  size?: number;
  color?: string;
}

export function Swap({ size = 18, color = '#8E9298' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M7 4L3 8l4 4M3 8h13M17 20l4-4-4-4M21 16H8" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}
```

- [ ] **Step 8: Create `Flame.tsx`**

```tsx
import React from 'react';
import Svg, { Path } from 'react-native-svg';

interface IconProps {
  size?: number;
  color?: string;
}

export function Flame({ size = 16, color = '#FFB800' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
      <Path d="M12 2s4 4 4 8a4 4 0 1 1-8 0c0-2 1-3 1-3s-3 1-3 5a6 6 0 0 0 12 0c0-6-6-10-6-10z" />
    </Svg>
  );
}
```

- [ ] **Step 9: Create `Trophy.tsx`**

```tsx
import React from 'react';
import Svg, { Path } from 'react-native-svg';

interface IconProps {
  size?: number;
  color?: string;
}

export function Trophy({ size = 14, color = '#FFB800' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M8 4h8v5a4 4 0 0 1-8 0V4zM6 6H3v2a3 3 0 0 0 3 3M18 6h3v2a3 3 0 0 1-3 3M10 16h4v4h-4z"
        stroke={color}
        strokeWidth={1.8}
        strokeLinejoin="round"
      />
    </Svg>
  );
}
```

- [ ] **Step 10: Create `Close.tsx`**

```tsx
import React from 'react';
import Svg, { Path } from 'react-native-svg';

interface IconProps {
  size?: number;
  color?: string;
}

export function Close({ size = 20, color = '#8E9298' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M6 6l12 12M18 6L6 18" stroke={color} strokeWidth={2.2} strokeLinecap="round" />
    </Svg>
  );
}
```

- [ ] **Step 11: Create `Timer.tsx`**

```tsx
import React from 'react';
import Svg, { Circle, Path } from 'react-native-svg';

interface IconProps {
  size?: number;
  color?: string;
}

export function Timer({ size = 16, color = '#FACC15' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="13" r="8" stroke={color} strokeWidth={2} />
      <Path d="M12 9v4l2 2M9 3h6" stroke={color} strokeWidth={2} strokeLinecap="round" />
    </Svg>
  );
}
```

- [ ] **Step 12: Create `Heart.tsx`**

```tsx
import React from 'react';
import Svg, { Path } from 'react-native-svg';

interface IconProps {
  size?: number;
  color?: string;
}

export function Heart({ size = 14, color = '#E0697E' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
      <Path d="M12 21s-7-4.5-9.5-9a5.5 5.5 0 0 1 9.5-5 5.5 5.5 0 0 1 9.5 5c-2.5 4.5-9.5 9-9.5 9z" />
    </Svg>
  );
}
```

- [ ] **Step 13: Create `Backspace.tsx`**

```tsx
import React from 'react';
import Svg, { Path } from 'react-native-svg';

interface IconProps {
  size?: number;
  color?: string;
}

export function Backspace({ size = 22, color = '#FFFFFF' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M22 5H9l-6 7 6 7h13a1 1 0 0 0 1-1V6a1 1 0 0 0-1-1z" stroke={color} strokeWidth={1.8} strokeLinejoin="round" />
      <Path d="M15 10l-4 4M11 10l4 4" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
    </Svg>
  );
}
```

- [ ] **Step 14: Create `index.ts` barrel**

```ts
export { Plus } from './Plus';
export { Minus } from './Minus';
export { Check } from './Check';
export { History } from './History';
export { More } from './More';
export { Chevron } from './Chevron';
export { Swap } from './Swap';
export { Flame } from './Flame';
export { Trophy } from './Trophy';
export { Close } from './Close';
export { Timer } from './Timer';
export { Heart } from './Heart';
export { Backspace } from './Backspace';
```

- [ ] **Step 15: Typecheck**

Run: `npx tsc --noEmit`
Expected: exit 0, no errors.

- [ ] **Step 16: Commit**

```bash
git add src/components/icons/
git commit -m "feat(icons): add react-native-svg icon set for workout screen v1

Adds 13 icons transcribed from design_handoff_workout_screen/icons.jsx:
Plus, Minus, Check, History, More, Chevron (rotatable), Swap, Flame,
Trophy, Close, Timer, Heart, Backspace. Same paths/viewBox/stroke
widths as reference. Barrel exported from icons/index.ts. No consumers
yet.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Phase 2 — HrPill

Single presentational component. Not yet consumed.

### Task 2.1 — Create HrPill

**Files:**
- Create: `src/components/HrPill.tsx`

- [ ] **Step 1: Write the component**

```tsx
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, getHrZoneColor } from '../theme/colors';
import { Heart } from './icons';

export type HrZone = 1 | 2 | 3 | 4 | 5;

interface HrPillProps {
  bpm: number | null;          // null = disconnected
  zone: HrZone | null;         // null when bpm is null
}

/** Blend a hex color with opacity hex suffix (RN doesn't parse 8-digit hex uniformly). */
function withAlpha(hex: string, alphaHex: string): string {
  // alphaHex is '22', '0a', '44', etc. — a 2-char hex alpha.
  // We append it to the 6-char base color; RN accepts #RRGGBBAA.
  return `${hex}${alphaHex}`;
}

export function HrPill({ bpm, zone }: HrPillProps) {
  const zoneColor = getHrZoneColor(zone);
  const disconnected = bpm === null;
  const bgFill = disconnected
    ? 'rgba(255,255,255,0.04)'
    : withAlpha(zoneColor, '22');
  const borderColor = disconnected
    ? colors.border
    : withAlpha(zoneColor, '44');

  return (
    <View style={[styles.pill, { backgroundColor: bgFill, borderColor }]}>
      <Heart size={16} color={zoneColor} />
      <View style={styles.valueColumn}>
        <Text style={styles.bpmText}>
          {disconnected ? '--' : bpm}
        </Text>
        <Text style={[styles.zoneLabel, { color: zoneColor }]}>
          {disconnected ? 'BPM' : `Z${zone} · BPM`}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
  },
  valueColumn: {
    alignItems: 'flex-start',
  },
  bpmText: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.primary,
    letterSpacing: -0.5,
    fontVariant: ['tabular-nums'],
    lineHeight: 18,
  },
  zoneLabel: {
    fontSize: 8,
    fontWeight: '800',
    letterSpacing: 1.2,
    marginTop: 2,
  },
});
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: exit 0.

- [ ] **Step 3: Commit**

```bash
git add src/components/HrPill.tsx
git commit -m "feat(hr): add HrPill component for workout header

Presentational pill showing BPM + zone label. Colors map 1..5 to
hrZone1..hrZone5 theme tokens via getHrZoneColor. Disconnected state
(bpm null) shows '--' with secondaryDim tint. Uses react-native-svg
Heart icon from icons barrel. Not yet consumed.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Phase 3 — WorkoutHeader (first visible UI change)

New header replaces the existing inline header in `WorkoutScreen.tsx`. Wires to existing contexts. Derived aggregates default to `0` until Phase 7 connects them fully.

### Task 3.1 — Create WorkoutHeader

**Files:**
- Create: `src/components/WorkoutHeader.tsx`

- [ ] **Step 1: Write the component**

```tsx
import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Easing,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { colors } from '../theme/colors';
import { HrPill, HrZone } from './HrPill';
import { Trophy } from './icons';

interface WorkoutHeaderProps {
  title: string;                 // e.g. 'PUSH DAY'
  elapsed: number;               // seconds
  volume: number;                // lb
  setCount: number;
  prCount: number;
  hr: { bpm: number | null; zone: HrZone | null };
  onFinish: () => void;
}

/** Format elapsed seconds as MM:SS (or H:MM:SS for >= 1 hour). */
function formatElapsed(seconds: number): string {
  if (seconds >= 3600) {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export function WorkoutHeader({
  title,
  elapsed,
  volume,
  setCount,
  prCount,
  hr,
  onFinish,
}: WorkoutHeaderProps) {
  const pulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 0.4, duration: 700, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: 700, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  return (
    <View style={styles.container}>
      <View style={styles.topRow}>
        <View style={styles.leftColumn}>
          <View style={styles.eyebrowRow}>
            <Animated.View style={[styles.liveDot, { opacity: pulse }]} />
            <Text style={styles.eyebrowText}>LIVE · {title.toUpperCase()}</Text>
          </View>
          <Text style={styles.elapsedText}>{formatElapsed(elapsed)}</Text>
        </View>
        <View style={styles.rightColumn}>
          <HrPill bpm={hr.bpm} zone={hr.zone} />
          <TouchableOpacity
            onPress={onFinish}
            style={styles.finishButton}
            activeOpacity={0.7}>
            <Text style={styles.finishText}>FINISH</Text>
          </TouchableOpacity>
        </View>
      </View>
      <View style={styles.statsRow}>
        <View style={styles.stat}>
          <Text style={styles.statLabel}>VOLUME</Text>
          <Text style={styles.statValue}>
            {volume.toLocaleString()} <Text style={styles.statUnit}>lb</Text>
          </Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.stat}>
          <Text style={styles.statLabel}>SETS</Text>
          <Text style={styles.statValue}>{setCount}</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.stat}>
          <View style={styles.prLabelRow}>
            <Trophy size={10} color={colors.prGold} />
            <Text style={styles.statLabel}>PRS</Text>
          </View>
          <Text style={[styles.statValue, prCount > 0 && { color: colors.prGold }]}>
            {prCount}
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 12,
    backgroundColor: colors.background,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: 8,
  },
  leftColumn: {
    flex: 1,
  },
  rightColumn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  eyebrowRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.accent,
  },
  eyebrowText: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.accent,
    letterSpacing: 2,
  },
  elapsedText: {
    fontSize: 32,
    fontWeight: '800',
    color: colors.primary,
    letterSpacing: -1,
    lineHeight: 32,
    marginTop: 4,
    fontVariant: ['tabular-nums'],
  },
  finishButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: 'rgba(217,83,79,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(217,83,79,0.25)',
  },
  finishText: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.danger,
    letterSpacing: 0.4,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 12,
    alignItems: 'center',
  },
  stat: {
    flexShrink: 0,
  },
  statDivider: {
    width: 1,
    alignSelf: 'stretch',
    backgroundColor: colors.border,
  },
  statLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.secondary,
    letterSpacing: 1.4,
  },
  statValue: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.primary,
    fontVariant: ['tabular-nums'],
    marginTop: 2,
  },
  statUnit: {
    fontSize: 11,
    fontWeight: '500',
    color: colors.secondary,
  },
  prLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
});
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: exit 0.

- [ ] **Step 3: Commit**

```bash
git add src/components/WorkoutHeader.tsx
git commit -m "feat(workout): add WorkoutHeader component

New top chrome for WorkoutScreen. LIVE eyebrow with pulsing mint dot
(Animated.loop), MM:SS elapsed (32px/800/tabular), HrPill, FINISH
button (coral), and VOLUME/SETS/PRS stats row. Not yet mounted.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

### Task 3.2 — Mount WorkoutHeader in WorkoutScreen

**Files:**
- Modify: `src/screens/WorkoutScreen.tsx`

The existing `WorkoutScreen` has an inline top region rendering elapsed time and session chrome. This task replaces that region with `<WorkoutHeader>`. Aggregates (`volume`, `setCount`, `prCount`) are threaded through initially as zeros; Phase 7 will derive real values from `setsByExercise`.

- [ ] **Step 1: Read the existing header region**

Run: `grep -n "HRConnectionIndicator\|formatElapsed\|elapsed\|DeviceScanSheet\|getHRZone" src/screens/WorkoutScreen.tsx | head -40`

Note the specific lines where the current header JSX begins and ends. Record the start and end line numbers.

- [ ] **Step 2: Add imports at top of file**

Add these imports near the other component imports:

```tsx
import { WorkoutHeader } from '../components/WorkoutHeader';
import { HrZone } from '../components/HrPill';
```

Remove any now-unused imports (e.g. `HRConnectionIndicator`) only if confirmed unused after the swap. Leave them if still referenced elsewhere in the file.

- [ ] **Step 3: Add header aggregate state (zeros for now)**

Inside the `WorkoutScreen` function, below the existing session state, add:

```tsx
// Phase 3: aggregate state placeholders. Real derivation lands in Phase 7.
const headerVolume = 0;
const headerSetCount = 0;
const headerPrCount = 0;
```

- [ ] **Step 4: Compute HR zone**

Add near the existing `const { deviceState, currentBpm } = useHeartRate();` line:

```tsx
// HR zone computation from existing bpm + user max HR
const computedMaxHr = hrSettings ? computeMaxHR(hrSettings) : null;
const hrZone: HrZone | null =
  currentBpm != null && computedMaxHr != null
    ? (getHRZone(currentBpm, computedMaxHr) as HrZone)
    : null;
```

If `computeMaxHR` has a different signature in the project (e.g. takes `(age, restingHr)`), match the existing call pattern already used elsewhere in `WorkoutScreen.tsx` rather than this exact form.

- [ ] **Step 5: Replace the existing header JSX with `<WorkoutHeader>`**

Identify the top region of the current `WorkoutScreen` return JSX — everything between the outermost `<SafeAreaView>` (or equivalent wrapper) opening tag and the start of the ScrollView / exercises list. Replace that region with:

```tsx
<WorkoutHeader
  title={programDayName ?? 'WORKOUT'}
  elapsed={elapsed}
  volume={headerVolume}
  setCount={headerSetCount}
  prCount={headerPrCount}
  hr={{ bpm: currentBpm, zone: hrZone }}
  onFinish={handleFinishWorkout}
/>
```

If the existing handler for FINISH is named differently (e.g. `handleEndWorkout`, `onFinishPress`), pass that instead of `handleFinishWorkout`. The point is to route to the existing end-session confirmation Alert.

- [ ] **Step 6: Typecheck**

Run: `npx tsc --noEmit`
Expected: exit 0. If you see errors about missing `computedMaxHr` or `hrZone`, confirm `getHRZone` and `computeMaxHR` are imported from `'../utils/hrZones'`.

- [ ] **Step 7: Deploy and smoke-test**

Invoke the `/deploy` skill to build and install on the emulator.

Smoke-test checklist (on-device):
- Open a workout session. The top header shows `LIVE · {WORKOUT/PUSH DAY}` with a pulsing mint dot.
- MM:SS elapsed ticks once per second.
- Stats row shows `VOLUME 0 lb | SETS 0 | 🏆 PRS 0` (all zeros — expected; Phase 7 wires real values).
- HrPill shows `--` when no BLE device is connected; shows a colored pill + `Z{n} · BPM` when connected.
- FINISH button opens the existing end-session Alert.

- [ ] **Step 8: Commit**

```bash
git add src/screens/WorkoutScreen.tsx
git commit -m "feat(workout): mount WorkoutHeader in place of legacy top chrome

Wires useElapsedSeconds + useHeartRate + getHRZone + computeMaxHR into
the new WorkoutHeader component. Aggregates (volume/setCount/prCount)
pass through as zero placeholders; real derivation follows in Phase 7
after the per-exercise set-state hoist.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Phase 4 — RestTimerBanner reskin

Amber gradient, timer icon, +15s / SKIP pills, 3px progress bar. Also adds `addTime(delta)` to `TimerContext`.

### Task 4.1 — Add `addTime` to TimerContext

**Files:**
- Modify: `src/context/TimerContext.tsx`

- [ ] **Step 1: Add `addTime` to the context value interface**

Find the existing `TimerContextValue` interface and add `addTime`:

```ts
interface TimerContextValue {
  remainingSeconds: number | null;
  totalSeconds: number | null;
  isRunning: boolean;
  startTimer: (durationSeconds: number) => void;
  stopTimer: () => void;
  addTime: (deltaSeconds: number) => void;
}
```

- [ ] **Step 2: Implement `addTime` inside `TimerProvider`**

Add this `useCallback` next to the existing `stopTimer` definition:

```tsx
const addTime = useCallback((deltaSeconds: number) => {
  const current = remainingRef.current;
  if (current === null || !isRunning) { return; }
  const nextRemaining = Math.max(0, current + deltaSeconds);
  remainingRef.current = nextRemaining;
  setRemainingSeconds(nextRemaining);
  setTotalSeconds(prev => (prev === null ? null : prev + deltaSeconds));
  // Refresh the ongoing notification so the shown time matches
  showTimerNotification(nextRemaining).catch(() => {
    // non-fatal
  });
}, [isRunning]);
```

- [ ] **Step 3: Expose `addTime` on the provider value**

Update the `<TimerContext.Provider value={...}>` JSX to include `addTime`:

```tsx
<TimerContext.Provider
  value={{ remainingSeconds, totalSeconds, isRunning, startTimer, stopTimer, addTime }}>
  {children}
</TimerContext.Provider>
```

- [ ] **Step 4: Typecheck**

Run: `npx tsc --noEmit`
Expected: exit 0.

- [ ] **Step 5: Commit**

```bash
git add src/context/TimerContext.tsx
git commit -m "feat(timer): add addTime(deltaSeconds) to TimerContext

Extends the rest timer API with addTime so UI can bump both remaining
and total duration for the +15s affordance on RestTimerBanner. Updates
the persistent notification so the user sees the new remaining time.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

### Task 4.2 — Reskin RestTimerBanner

**Files:**
- Modify: `src/components/RestTimerBanner.tsx`

- [ ] **Step 1: Replace the file with the new design**

```tsx
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { colors } from '../theme/colors';
import { Timer } from './icons';

interface Props {
  remainingSeconds: number;
  totalSeconds: number;
  onStop: () => void;
  onAdd: () => void;
}

function formatCountdown(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export function RestTimerBanner({ remainingSeconds, totalSeconds, onStop, onAdd }: Props) {
  const progress = totalSeconds > 0 ? remainingSeconds / totalSeconds : 0;
  return (
    <View style={styles.wrapper}>
      <View style={styles.row}>
        <View style={styles.iconCircle}>
          <Timer size={16} color={colors.timerActive} />
        </View>
        <View style={styles.textColumn}>
          <Text style={styles.label}>REST</Text>
          <Text style={styles.countdown}>{formatCountdown(remainingSeconds)}</Text>
        </View>
        <TouchableOpacity onPress={onAdd} style={styles.addPill} activeOpacity={0.7}>
          <Text style={styles.addPillText}>+15s</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={onStop} style={styles.skipPill} activeOpacity={0.7}>
          <Text style={styles.skipPillText}>SKIP</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    // Approximation of `linear-gradient(180deg, rgba(250,204,21,0.14), rgba(250,204,21,0.06))`
    // using a single solid tint; visually close and avoids adding a gradient dep.
    backgroundColor: 'rgba(250,204,21,0.10)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(250,204,21,0.25)',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  iconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(250,204,21,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  textColumn: {
    flex: 1,
  },
  label: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.timerActive,
    letterSpacing: 1.5,
  },
  countdown: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.primary,
    fontVariant: ['tabular-nums'],
    lineHeight: 22,
  },
  addPill: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: colors.border,
  },
  addPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
  },
  skipPill: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: colors.timerActive,
  },
  skipPillText: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.onAccent,
    letterSpacing: 0.3,
  },
  progressTrack: {
    height: 3,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 2,
    marginTop: 8,
    overflow: 'hidden',
  },
  progressFill: {
    height: 3,
    backgroundColor: colors.timerActive,
    borderRadius: 2,
  },
});
```

- [ ] **Step 2: Wire `onAdd` in `WorkoutScreen.tsx`**

Find the existing `<RestTimerBanner ... />` usage and add the `onAdd` prop:

```tsx
<RestTimerBanner
  remainingSeconds={remainingSeconds}
  totalSeconds={totalSeconds}
  onStop={stopTimer}
  onAdd={() => addTime(15)}
/>
```

Also ensure `addTime` is destructured from `useTimer()`:

```tsx
const { remainingSeconds, totalSeconds, isRunning, startTimer, stopTimer, addTime } = useTimer();
```

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit`
Expected: exit 0. If `remainingSeconds` / `totalSeconds` are `number | null` in the context, guard the banner render at the screen level (render only when both are non-null and > 0).

- [ ] **Step 4: Deploy and smoke-test**

Invoke `/deploy`.

Smoke-test checklist:
- Log a set or manually trigger a rest timer. The banner slides under the header with the amber tint.
- The 32×32 icon circle shows a yellow timer icon.
- `REST` label + MM:SS countdown tick down once per second.
- `+15s` button bumps the remaining time by 15 seconds and updates the ongoing notification.
- `SKIP` clears the timer.
- The 3px progress bar shrinks smoothly over the rest duration.

- [ ] **Step 5: Commit**

```bash
git add src/components/RestTimerBanner.tsx src/screens/WorkoutScreen.tsx
git commit -m "feat(rest): reskin RestTimerBanner to V1 amber design

Amber tinted wrapper with 32x32 timer-icon circle, REST label,
MM:SS countdown, +15s neutral pill, SKIP yellow pill, 3px progress
bar. Adds onAdd prop wired to new TimerContext.addTime(15). Solid
yellow tint approximates the spec's vertical gradient without adding
a dependency.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Phase 5 — WarmupSection reskin

Amber↔mint state swap, progress bar, SKIP TO WORKOUT button. Extends `SessionContext` with `skipAllWarmupItems`.

### Task 5.1 — Add `skipAllWarmupItems` to SessionContext

**Files:**
- Modify: `src/context/SessionContext.tsx`

- [ ] **Step 1: Extend `SessionContextValue` interface**

Add `skipAllWarmupItems` to the context value interface near the other warmup methods:

```ts
skipAllWarmupItems: () => Promise<void>;
```

- [ ] **Step 2: Implement it in the provider**

Inside `SessionProvider`, next to `toggleWarmupItemComplete`, add:

```tsx
const skipAllWarmupItems = useCallback(async () => {
  // Mark every incomplete item as complete by invoking the DB toggle.
  // (dbToggleWarmupItem flips the is_complete column.)
  const incomplete = warmupItems.filter(i => !i.isComplete);
  for (const item of incomplete) {
    await dbToggleWarmupItem(item.id);
  }
  if (incomplete.length > 0) {
    setWarmupItems(prev => prev.map(i => ({ ...i, isComplete: true })));
    setWarmupState('collapsed');
  }
}, [warmupItems]);
```

- [ ] **Step 3: Expose it in the provider value**

Update the `useMemo<SessionContextValue>` object to include `skipAllWarmupItems` in both the value and the dependency array. The existing code returns a memoized object — add the new field to both the object literal and the deps array.

- [ ] **Step 4: Typecheck**

Run: `npx tsc --noEmit`
Expected: exit 0.

- [ ] **Step 5: Commit**

```bash
git add src/context/SessionContext.tsx
git commit -m "feat(session): add skipAllWarmupItems to SessionContext

Marks all incomplete warmup items complete in one action via the
existing dbToggleWarmupItem call (loops over incomplete items).
Transitions warmupState to 'collapsed' after skipping. Used by the
V1 WarmupSection's SKIP TO WORKOUT button.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

### Task 5.2 — Reskin WarmupSection

**Files:**
- Modify: `src/components/WarmupSection.tsx`

- [ ] **Step 1: Replace the file with the new design**

```tsx
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { fontSize } from '../theme/typography';
import { WarmupSessionItem } from '../types';
import { WarmupItemRow } from './WarmupItemRow';
import { Flame, Check, Chevron } from './icons';

interface WarmupSectionProps {
  items: WarmupSessionItem[];
  state: 'expanded' | 'collapsed' | 'dismissed' | 'none';
  onToggleItem: (itemId: number) => void;
  onCollapse: () => void;
  onExpand: () => void;
  onDismiss: () => void;
  onSkipAll: () => void;
}

export function WarmupSection({
  items,
  state,
  onToggleItem,
  onCollapse,
  onExpand,
  onDismiss,
  onSkipAll,
}: WarmupSectionProps) {
  if (state === 'none' || state === 'dismissed' || items.length === 0) {
    return null;
  }

  const completedCount = items.filter(i => i.isComplete).length;
  const totalCount = items.length;
  const complete = completedCount === totalCount && totalCount > 0;
  const progressPercent = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

  const accentColor = complete ? colors.accent : colors.warmupAmber;
  const containerBg = complete
    ? 'rgba(141,194,138,0.04)'
    : 'rgba(240,184,48,0.06)';
  const containerBorder = complete
    ? 'rgba(141,194,138,0.25)'
    : 'rgba(240,184,48,0.25)';
  const iconBg = complete
    ? 'rgba(141,194,138,0.15)'
    : 'rgba(240,184,48,0.15)';

  const headerOnPress = state === 'expanded' ? onCollapse : onExpand;

  return (
    <View
      style={[styles.container, { backgroundColor: containerBg, borderColor: containerBorder }]}
    >
      <TouchableOpacity
        style={styles.header}
        onPress={headerOnPress}
        activeOpacity={0.7}>
        <View style={[styles.iconBox, { backgroundColor: iconBg }]}>
          {complete ? <Check size={18} color={colors.accent} /> : <Flame size={20} color={colors.warmupAmber} />}
        </View>
        <View style={styles.textColumn}>
          <Text style={[styles.eyebrow, { color: accentColor }]}>
            {complete ? 'WARM-UP COMPLETE' : 'WARM-UP'}
          </Text>
          <Text style={styles.title}>
            {complete ? 'Ready to lift' : 'Prime the body first'}
          </Text>
          <View style={styles.progressRow}>
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${progressPercent}%`, backgroundColor: accentColor }]} />
            </View>
            <Text style={styles.progressCounter}>{completedCount}/{totalCount}</Text>
          </View>
        </View>
        <Chevron size={18} color={colors.secondary} dir={state === 'expanded' ? 'up' : 'down'} />
        <TouchableOpacity
          onPress={onDismiss}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          style={styles.dismissHit}>
          <Text style={styles.dismissText}>✕</Text>
        </TouchableOpacity>
      </TouchableOpacity>

      {state === 'expanded' && (
        <View style={styles.expandedBody}>
          {items.map(item => (
            <WarmupItemRow key={item.id} item={item} onToggle={onToggleItem} />
          ))}
          {!complete && (
            <TouchableOpacity
              onPress={onSkipAll}
              style={styles.skipButton}
              activeOpacity={0.7}>
              <Text style={styles.skipText}>SKIP TO WORKOUT</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderWidth: 1,
    borderRadius: 18,
    marginHorizontal: spacing.base,
    marginBottom: spacing.sm,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  iconBox: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  textColumn: {
    flex: 1,
    minWidth: 0,
  },
  eyebrow: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.8,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.primary,
    letterSpacing: -0.2,
    marginTop: 1,
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 6,
  },
  progressTrack: {
    flex: 1,
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: 4,
    borderRadius: 2,
  },
  progressCounter: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.secondary,
    fontVariant: ['tabular-nums'],
  },
  dismissHit: {
    paddingHorizontal: 4,
  },
  dismissText: {
    fontSize: 14,
    color: colors.secondary,
  },
  expandedBody: {
    paddingHorizontal: 12,
    paddingBottom: 12,
    gap: 4,
  },
  skipButton: {
    marginTop: 6,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(240,184,48,0.4)',
    borderStyle: 'dashed',
    alignItems: 'center',
  },
  skipText: {
    fontSize: fontSize.xs + 1,
    fontWeight: '800',
    color: colors.warmupAmber,
    letterSpacing: 0.8,
  },
});
```

- [ ] **Step 2: Thread `onSkipAll` through WorkoutScreen**

In `src/screens/WorkoutScreen.tsx`, find the existing `<WarmupSection>` JSX and add `onSkipAll` prop. Pull `skipAllWarmupItems` from `useSession()`:

```tsx
const { ..., skipAllWarmupItems } = useSession();
// ...
<WarmupSection
  items={warmupItems}
  state={warmupState}
  onToggleItem={toggleWarmupItemComplete}
  onCollapse={collapseWarmup}
  onExpand={expandWarmup}
  onDismiss={dismissWarmup}
  onSkipAll={skipAllWarmupItems}
/>
```

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit`
Expected: exit 0.

- [ ] **Step 4: Deploy and smoke-test**

Invoke `/deploy`.

Smoke-test checklist:
- Load a session with a warmup template attached. The section renders at the top of the scroll area with amber coloring and a flame icon.
- Progress bar reflects `done/total`.
- Check off a drill: progress bar advances; counter updates.
- Check off all drills: colors swap to mint, icon becomes a check, eyebrow becomes `WARM-UP COMPLETE`, title becomes `Ready to lift`.
- Collapse/expand toggles via tapping the header.
- `✕` dismisses the section.
- `SKIP TO WORKOUT` (only visible when incomplete) marks all drills complete; section turns mint and collapses.

- [ ] **Step 5: Commit**

```bash
git add src/components/WarmupSection.tsx src/screens/WorkoutScreen.tsx
git commit -m "feat(warmup): reskin WarmupSection to V1 amber/mint design

- 38x38 flame/check icon container with amber or mint tint.
- Eyebrow flips 'WARM-UP' -> 'WARM-UP COMPLETE' on completion.
- Title flips 'Prime the body first' -> 'Ready to lift'.
- 4px progress bar matches accent (amber or mint).
- New SKIP TO WORKOUT dashed amber button when incomplete; uses
  SessionContext.skipAllWarmupItems to mark every drill complete.
- Dismiss (x) and collapse/expand chevron preserved.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Phase 6 — NumberPad

Standalone component. Mounted at screen level in a dev-flag render so we can self-test before consumers exist.

### Task 6.1 — Create NumberPad

**Files:**
- Create: `src/components/NumberPad.tsx`

- [ ] **Step 1: Write the component**

```tsx
import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { colors } from '../theme/colors';
import { Backspace } from './icons';

interface NumberPadProps {
  visible: boolean;
  field: 'weight' | 'reps';
  initialValue: number;
  label?: string;          // e.g. "BENCH PRESS"
  onCommit: (value: number) => void;
  onCancel: () => void;
}

const KEYS = ['7', '8', '9', '4', '5', '6', '1', '2', '3', '.', '0', '⌫'] as const;

export function NumberPad({ visible, field, initialValue, label, onCommit, onCancel }: NumberPadProps) {
  const [buf, setBuf] = useState<string>(String(initialValue ?? ''));
  const slideY = useRef(new Animated.Value(400)).current;
  const caretOpacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (visible) {
      setBuf(String(initialValue ?? ''));
      Animated.timing(slideY, {
        toValue: 0,
        duration: 220,
        easing: Easing.out(Easing.back(1.1)),
        useNativeDriver: true,
      }).start();
    } else {
      slideY.setValue(400);
    }
  }, [visible, initialValue, slideY]);

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(caretOpacity, { toValue: 0, duration: 500, useNativeDriver: true }),
        Animated.timing(caretOpacity, { toValue: 1, duration: 500, useNativeDriver: true }),
      ]),
    );
    if (visible) { loop.start(); }
    return () => loop.stop();
  }, [visible, caretOpacity]);

  const push = (k: string) => {
    setBuf(prev => {
      if (k === '.' && prev.includes('.')) { return prev; }
      if (prev === '0' && k !== '.') { return k; }
      if (prev.length >= 5) { return prev; }
      return prev + k;
    });
  };

  const back = () => setBuf(prev => prev.slice(0, -1));
  const clear = () => setBuf('');

  const handleKey = (k: string) => {
    if (k === '⌫') { back(); } else { push(k); }
  };

  const handleConfirm = () => {
    const v = parseFloat(buf || '0') || 0;
    onCommit(v);
  };

  const unitLabel = field === 'weight' ? 'pounds' : 'reps';
  const displayValue = buf || '0';

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <Pressable onPress={onCancel} style={styles.backdrop} />
      <Animated.View style={[styles.sheet, { transform: [{ translateY: slideY }] }]}>
        <View style={styles.handle} />
        <View style={styles.topRow}>
          <View style={styles.titleColumn}>
            {label ? <Text style={styles.labelEyebrow}>{label.toUpperCase()}</Text> : null}
            <Text style={styles.title}>Enter {field}</Text>
          </View>
          <TouchableOpacity onPress={clear} style={styles.clearButton} activeOpacity={0.7}>
            <Text style={styles.clearText}>CLEAR</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.displayBox}>
          <View style={styles.displayRow}>
            <Text style={styles.displayValue}>{displayValue}</Text>
            <Animated.View style={[styles.caret, { opacity: caretOpacity }]} />
          </View>
          <Text style={styles.unitLabel}>{unitLabel}</Text>
        </View>
        <View style={styles.grid}>
          {KEYS.map(k => (
            <TouchableOpacity
              key={k}
              onPress={() => handleKey(k)}
              style={[styles.key, k === '⌫' ? styles.backspaceKey : null]}
              activeOpacity={0.7}>
              {k === '⌫' ? (
                <Backspace size={22} color={colors.primary} />
              ) : (
                <Text style={styles.keyText}>{k}</Text>
              )}
            </TouchableOpacity>
          ))}
        </View>
        <View style={styles.actions}>
          <TouchableOpacity onPress={onCancel} style={styles.cancelButton} activeOpacity={0.7}>
            <Text style={styles.cancelText}>CANCEL</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={handleConfirm} style={styles.confirmButton} activeOpacity={0.85}>
            <Text style={styles.confirmText}>CONFIRM</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.surface,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 16,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.borderStrong,
    alignSelf: 'center',
    marginBottom: 12,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  titleColumn: {},
  labelEyebrow: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.6,
    color: colors.secondary,
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.primary,
    marginTop: 2,
  },
  clearButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  clearText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.secondary,
  },
  displayBox: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 16,
    alignItems: 'center',
    marginBottom: 12,
  },
  displayRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  displayValue: {
    fontSize: 48,
    fontWeight: '800',
    color: colors.primary,
    letterSpacing: -1,
    lineHeight: 48,
    fontVariant: ['tabular-nums'],
  },
  caret: {
    width: 2,
    height: 38,
    backgroundColor: colors.accent,
    marginLeft: 4,
  },
  unitLabel: {
    fontSize: 12,
    color: colors.secondary,
    marginTop: 4,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  key: {
    width: '32%',
    height: 56,
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backspaceKey: {
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  keyText: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.primary,
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  cancelButton: {
    flex: 1,
    height: 50,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.secondary,
  },
  confirmButton: {
    flex: 2,
    height: 50,
    borderRadius: 14,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmText: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.onAccent,
    letterSpacing: 0.3,
  },
});
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: exit 0.

- [ ] **Step 3: Commit**

```bash
git add src/components/NumberPad.tsx
git commit -m "feat(input): add NumberPad slide-up modal component

Full-screen RN Modal with backdrop, slide-up sheet, blinking mint
caret, 3x4 digit grid (7-9/4-6/1-3/./0/backspace), CANCEL + CONFIRM
row. 5-char input cap. Not yet consumed; wired in Phase 7 via the
WorkoutScreen-level pad state.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Phase 7 — State hoist + NextSetPanel + SetRow (highest-risk phase)

Hoists `setsByExercise`, `nextByExercise`, `lastSetsByExercise` from `SetLoggingPanel` up to `WorkoutScreen`. Creates `SetRow` and `NextSetPanel`. Swaps the expanded-card body. Wires the `NumberPad`. Preserves stopwatch for timed, height-reps step, long-press delete, PR toast, haptics.

Split into focused sub-tasks so each commit is reviewable on its own.

### Task 7.1 — Add `SetState` + helper types

**Files:**
- Create: `src/components/exerciseCardState.ts`

This small utility file holds the V1 types used by the hoisted state. Keeps `WorkoutScreen.tsx` lean.

- [ ] **Step 1: Write the file**

```ts
/** In-memory per-set state used by the V1 workout screen.
 *  isPR is ephemeral (not persisted) — it is set at log-time by
 *  checkForPR and lost if the session is rehydrated mid-run.
 */
export interface SetState {
  id: number;              // matches DB WorkoutSet.id after logSet returns
  setNumber: number;       // 1-based
  w: number;               // weight lb (0 for timed)
  r: number;               // reps OR duration seconds for timed
  isPR?: boolean;          // session-scoped only
  isWarmup: boolean;       // reflects the DB column
}

export interface NextSet {
  w: number;
  r: number;
}

export interface PadTarget {
  exerciseId: number;
  field: 'w' | 'r';
  initialValue: number;
  label: string;           // exercise name for eyebrow
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: exit 0.

- [ ] **Step 3: Commit**

```bash
git add src/components/exerciseCardState.ts
git commit -m "feat(workout): add SetState/NextSet/PadTarget helper types

Shared types used by the V1 screen-level state hoist. SetState mirrors
the DB WorkoutSet shape plus a session-scoped isPR flag. PadTarget
describes which field the screen-level NumberPad is currently editing.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

### Task 7.2 — Create SetRow

**Files:**
- Create: `src/components/SetRow.tsx`

- [ ] **Step 1: Write the component**

```tsx
import React, { useRef } from 'react';
import {
  Animated,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { colors } from '../theme/colors';
import { Check, Trophy } from './icons';

export type SetRowType = 'done' | 'pr' | 'active' | 'pending';

interface SetRowProps {
  setNumber: number;
  weightLbs: number;
  reps: number;
  type: SetRowType;
  isTimed?: boolean;
  isHeightReps?: boolean;
  onDelete?: () => void;
}

function formatDuration(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export const SetRow = React.memo(function SetRow({
  setNumber,
  weightLbs,
  reps,
  type,
  isTimed = false,
  isHeightReps = false,
  onDelete,
}: SetRowProps) {
  const deleteVisible = useRef(false);
  const animOpacity = useRef(new Animated.Value(0)).current;

  const handleLongPress = () => {
    deleteVisible.current = !deleteVisible.current;
    Animated.timing(animOpacity, {
      toValue: deleteVisible.current ? 1 : 0,
      duration: 150,
      useNativeDriver: true,
    }).start();
  };

  const backgroundColor =
    type === 'active' ? 'rgba(141,194,138,0.06)'
    : type === 'pr' ? 'rgba(255,184,0,0.06)'
    : 'transparent';

  const dotColor =
    type === 'pr' ? colors.prGold
    : type === 'done' ? colors.accent
    : type === 'active' ? colors.primary
    : 'transparent';

  const dotTextColor = type === 'pr' || type === 'done' ? colors.onAccent : colors.primary;
  const weightText = isTimed ? formatDuration(reps) : `${weightLbs} ${isHeightReps ? 'in' : 'lb'}`;
  const repsText = isTimed ? '' : `${reps} reps`;

  return (
    <TouchableOpacity
      onLongPress={handleLongPress}
      delayLongPress={400}
      activeOpacity={0.8}
      style={[styles.row, { backgroundColor }]}>
      <View style={styles.dotCell}>
        <View
          style={[
            styles.dot,
            {
              backgroundColor: dotColor,
              borderWidth: type === 'pending' ? 1.5 : 0,
              borderColor: type === 'pending' ? colors.borderStrong : 'transparent',
            },
          ]}>
          {(type === 'done' || type === 'pr') ? (
            <Check size={13} color={colors.onAccent} />
          ) : (
            <Text style={[styles.dotNumber, { color: dotTextColor }]}>{setNumber}</Text>
          )}
        </View>
      </View>
      <View style={styles.weightCell}>
        <Text style={styles.metricText}>{weightText}</Text>
      </View>
      <View style={styles.repsCell}>
        <Text style={styles.metricText}>{repsText}</Text>
      </View>
      <View style={styles.trophyCell}>
        {type === 'pr' ? <Trophy size={14} color={colors.prGold} /> : null}
      </View>
      {onDelete && (
        <Animated.View style={[styles.deleteWrapper, { opacity: animOpacity }]} pointerEvents={deleteVisible.current ? 'auto' : 'none'}>
          <TouchableOpacity
            style={styles.deleteButton}
            onPress={() => {
              deleteVisible.current = false;
              animOpacity.setValue(0);
              onDelete();
            }}>
            <Text style={styles.deleteText}>Delete</Text>
          </TouchableOpacity>
        </Animated.View>
      )}
    </TouchableOpacity>
  );
});

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    minHeight: 44,
  },
  dotCell: {
    width: 28,
    alignItems: 'center',
  },
  dot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dotNumber: {
    fontSize: 11,
    fontWeight: '700',
  },
  weightCell: {
    flex: 1,
  },
  repsCell: {
    flex: 1,
  },
  trophyCell: {
    width: 40,
    alignItems: 'flex-end',
  },
  metricText: {
    fontSize: 17,
    fontWeight: '600',
    color: colors.primary,
    fontVariant: ['tabular-nums'],
  },
  deleteWrapper: {
    position: 'absolute',
    right: 8,
    top: 4,
    bottom: 4,
    justifyContent: 'center',
  },
  deleteButton: {
    backgroundColor: colors.danger,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  deleteText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: exit 0.

- [ ] **Step 3: Commit**

```bash
git add src/components/SetRow.tsx
git commit -m "feat(workout): add SetRow component for logged-set display

4-column row: 24x24 status dot, weight/duration cell, reps cell,
trophy cell. Types: done (mint dot+check), pr (gold dot+check,
trophy), active (white dot with number), pending (outlined circle
with number). Preserves long-press-to-delete affordance from the
old SetListItem. Memoized.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

### Task 7.3 — Reshape GhostReference as history peek

**Files:**
- Modify: `src/components/GhostReference.tsx`

- [ ] **Step 1: Replace the file**

```tsx
import React, { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { colors } from '../theme/colors';
import { WorkoutSet } from '../types';
import { History, Chevron } from './icons';

interface Props {
  sets: WorkoutSet[];
  isTimed?: boolean;
  isHeightReps?: boolean;
}

function formatDuration(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export function GhostReference({ sets, isTimed = false, isHeightReps = false }: Props) {
  const [open, setOpen] = useState(false);
  if (!sets || sets.length === 0) { return null; }

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.toggle}
        onPress={() => setOpen(v => !v)}
        activeOpacity={0.7}>
        <View style={styles.toggleLeft}>
          <History size={14} color={colors.secondary} />
          <Text style={styles.toggleLabel}>
            Last session {open ? '' : `· ${sets.length} sets`}
          </Text>
        </View>
        <Chevron size={14} color={colors.secondary} dir={open ? 'up' : 'down'} />
      </TouchableOpacity>
      {open && (
        <View style={styles.list}>
          {sets.map((s, i) => (
            <View key={s.id} style={styles.row}>
              <Text style={styles.rowText}>Set {i + 1}</Text>
              <Text style={styles.rowText}>
                {isTimed
                  ? formatDuration(s.reps)
                  : `${s.weightLbs}${isHeightReps ? 'in' : 'lb'} × ${s.reps}`}
              </Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 10,
  },
  toggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    borderStyle: 'dashed',
    borderRadius: 10,
  },
  toggleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  toggleLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.secondary,
  },
  list: {
    backgroundColor: 'rgba(255,255,255,0.02)',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginTop: 8,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  rowText: {
    fontSize: 13,
    color: colors.secondary,
    fontVariant: ['tabular-nums'],
  },
});
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: exit 0. If TypeScript complains about callers passing the old prop shape, temporarily check where `GhostReference` is imported — only `SetLoggingPanel.tsx` uses it today, and that file will be dissolved in Task 7.5.

- [ ] **Step 3: Commit**

```bash
git add src/components/GhostReference.tsx
git commit -m "refactor(workout): reshape GhostReference as collapsible history peek

Replaces the always-visible 'Last session:' text with a dashed-border
toggle button. When collapsed: 'Last session · N sets' eyebrow and
chevron. When open: list of sets with set number and weight x reps.
Used inside the expanded exercise card body in Phase 7.5.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

### Task 7.4 — Create NextSetPanel

**Files:**
- Create: `src/components/NextSetPanel.tsx`

- [ ] **Step 1: Write the component**

```tsx
import React from 'react';
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import HapticFeedback from 'react-native-haptic-feedback';
import { colors } from '../theme/colors';
import { Plus, Minus, Check } from './icons';
import { ExerciseMeasurementType } from '../types';

interface StepperRowProps {
  label: string;
  value: number;
  unit: string;
  step: number;
  min?: number;
  onChange: (next: number) => void;
  onOpenPad: () => void;
}

function StepperRow({ label, value, unit, step, min = 0, onChange, onOpenPad }: StepperRowProps) {
  const handleMinus = () => {
    if (value <= min) { return; }
    onChange(Math.max(min, value - step));
    HapticFeedback.trigger('impactLight', { enableVibrateFallback: true });
  };
  const handlePlus = () => {
    onChange(value + step);
    HapticFeedback.trigger('impactLight', { enableVibrateFallback: true });
  };

  return (
    <View style={stepperStyles.row}>
      <Text style={stepperStyles.label}>{label}</Text>
      <TouchableOpacity style={stepperStyles.valueButton} onPress={onOpenPad} activeOpacity={0.7}>
        <Text style={stepperStyles.valueText}>
          {value}
          <Text style={stepperStyles.unitText}> {unit}</Text>
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[stepperStyles.stepButton, stepperStyles.minusButton, value <= min && stepperStyles.stepButtonDisabled]}
        onPress={handleMinus}
        disabled={value <= min}
        activeOpacity={0.7}>
        <Minus size={18} color={colors.primary} />
      </TouchableOpacity>
      <TouchableOpacity
        style={[stepperStyles.stepButton, stepperStyles.plusButton]}
        onPress={handlePlus}
        activeOpacity={0.7}>
        <Plus size={18} color={colors.accent} />
      </TouchableOpacity>
    </View>
  );
}

interface NextSetPanelProps {
  setNumber: number;                    // 1-based next-set number
  measurementType: ExerciseMeasurementType;
  nextW: number;
  nextR: number;
  onNextChange: (field: 'w' | 'r', value: number) => void;
  onOpenPad: (field: 'w' | 'r') => void;
  onLog: () => void;
  isLoggingDisabled?: boolean;
  timedStopwatchDisplay?: React.ReactNode; // for timed mode: render stopwatch UI
}

function formatDuration(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export function NextSetPanel({
  setNumber,
  measurementType,
  nextW,
  nextR,
  onNextChange,
  onOpenPad,
  onLog,
  isLoggingDisabled,
  timedStopwatchDisplay,
}: NextSetPanelProps) {
  const isTimed = measurementType === 'timed';
  const isHeightReps = measurementType === 'height_reps';
  const weightStep = isHeightReps ? 2 : 5;
  const weightUnit = isHeightReps ? 'in' : 'lb';

  const handleLog = () => {
    if (isLoggingDisabled) { return; }
    onLog();
    HapticFeedback.trigger('impactMedium', { enableVibrateFallback: true });
  };

  return (
    <View style={styles.panel}>
      <View style={styles.eyebrowRow}>
        <View style={styles.setBadge}>
          <Text style={styles.setBadgeText}>{setNumber}</Text>
        </View>
        <Text style={styles.eyebrowText}>NEXT SET</Text>
      </View>
      {isTimed ? (
        <View style={styles.timedDisplay}>
          {timedStopwatchDisplay ?? (
            <Text style={styles.timedValue}>{formatDuration(nextR)}</Text>
          )}
        </View>
      ) : (
        <View style={styles.stepperColumn}>
          <StepperRow
            label="WEIGHT"
            value={nextW}
            unit={weightUnit}
            step={weightStep}
            onChange={v => onNextChange('w', v)}
            onOpenPad={() => onOpenPad('w')}
          />
          <StepperRow
            label="REPS"
            value={nextR}
            unit="reps"
            step={1}
            onChange={v => onNextChange('r', v)}
            onOpenPad={() => onOpenPad('r')}
          />
        </View>
      )}
      <TouchableOpacity
        style={[styles.logButton, isLoggingDisabled && styles.logButtonDisabled]}
        onPress={handleLog}
        disabled={isLoggingDisabled}
        activeOpacity={0.85}>
        <Check size={18} color={colors.onAccent} />
        <Text style={styles.logButtonText}>LOG SET {setNumber}</Text>
      </TouchableOpacity>
    </View>
  );
}

const stepperStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 6,
    paddingLeft: 12,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
  },
  label: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.4,
    color: colors.secondary,
    minWidth: 54,
  },
  valueButton: {
    flex: 1,
    paddingVertical: 4,
  },
  valueText: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.primary,
    fontVariant: ['tabular-nums'],
  },
  unitText: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.secondary,
  },
  stepButton: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  minusButton: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  plusButton: {
    borderWidth: 1,
    borderColor: 'rgba(141,194,138,0.3)',
    backgroundColor: colors.accentGlow,
  },
  stepButtonDisabled: {
    opacity: 0.3,
  },
});

const styles = StyleSheet.create({
  panel: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    padding: 12,
  },
  eyebrowRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  setBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.accentGlow,
    alignItems: 'center',
    justifyContent: 'center',
  },
  setBadgeText: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.accent,
  },
  eyebrowText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.4,
    color: colors.secondary,
  },
  stepperColumn: {
    gap: 8,
  },
  timedDisplay: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  timedValue: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.timerActive,
    fontVariant: ['tabular-nums'],
  },
  logButton: {
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.accent,
    borderRadius: 14,
    paddingVertical: 14,
  },
  logButtonDisabled: {
    opacity: 0.5,
  },
  logButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.onAccent,
    letterSpacing: 0.3,
  },
});
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: exit 0.

- [ ] **Step 3: Commit**

```bash
git add src/components/NextSetPanel.tsx
git commit -m "feat(workout): add NextSetPanel for V1 logging UI

Renders NEXT SET eyebrow + set-number badge, two stepper rows
(WEIGHT, REPS) or a centered timed display, plus a full-width mint
LOG SET button. Stepper rows call onOpenPad('w'|'r') when the value
is tapped (screen-level NumberPad opens). Stepper step is 5 lb for
reps mode, 2 in for height-reps mode, 1 rep. Preserves impactLight
haptic on +/- and impactMedium on Log Set.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

### Task 7.5 — Hoist state + rewrite expanded card body in WorkoutScreen

This task is the largest single edit. It:
1. Adds the hoisted state (`setsByExercise`, `nextByExercise`, `lastSetsByExercise`, `pad`).
2. Adds the `handleLog`, `handleOpenPad`, `handleExpand`, `handleNextChange`, `handleDeleteSet` callbacks.
3. Replaces the existing `<SetLoggingPanel>` render inside the old `ExerciseCard` helper with: `SetRow[]` + `<GhostReference>` + `<NextSetPanel>`.
4. Derives `volume`, `setCount`, `prCount` aggregates and passes them to `<WorkoutHeader>`.
5. Mounts one `<NumberPad>` at the screen root.
6. Rehydrates `setsByExercise` from DB on mount for each sessionExercise.

**Files:**
- Modify: `src/screens/WorkoutScreen.tsx`

- [ ] **Step 1: Add imports**

Add near the top imports block:

```tsx
import { SetRow } from '../components/SetRow';
import { NextSetPanel } from '../components/NextSetPanel';
import { NumberPad } from '../components/NumberPad';
import { SetState, PadTarget } from '../components/exerciseCardState';
import { logSet, getSetsForExerciseInSession, getLastSessionSets, deleteSet, checkForPR } from '../db/sets';
import { WorkoutSet } from '../types';
```

Some of these may already be imported — de-duplicate.

- [ ] **Step 2: Add hoisted state near the top of `WorkoutScreen` function body**

Immediately after the existing `activeExerciseId` state, add:

```tsx
// ─── Phase 7: hoisted per-exercise state ────────────────────────────────
const [setsByExercise, setSetsByExercise] = useState<Record<number, SetState[]>>({});
const [nextByExercise, setNextByExercise] = useState<Record<number, { w: number; r: number }>>({});
const [lastSetsByExercise, setLastSetsByExercise] = useState<Record<number, WorkoutSet[] | null>>({});
const [pad, setPad] = useState<PadTarget | null>(null);

// Derived aggregates
const headerVolume = useMemo(() => {
  let total = 0;
  for (const id in setsByExercise) {
    for (const s of setsByExercise[id]) {
      total += s.w * s.r;
    }
  }
  return Math.round(total);
}, [setsByExercise]);

const headerSetCount = useMemo(() => {
  let total = 0;
  for (const id in setsByExercise) { total += setsByExercise[id].length; }
  return total;
}, [setsByExercise]);

const headerPrCount = useMemo(() => {
  let total = 0;
  for (const id in setsByExercise) {
    for (const s of setsByExercise[id]) { if (s.isPR) { total += 1; } }
  }
  return total;
}, [setsByExercise]);
```

Remove the three placeholder constants added in Phase 3 (`const headerVolume = 0;` etc.). Those are replaced by the useMemos above.

- [ ] **Step 3: Seed `nextByExercise` + rehydrate `setsByExercise` when the session loads**

Add after the existing session-loading effects:

```tsx
useEffect(() => {
  if (!session) { return; }
  let cancelled = false;

  (async () => {
    const seededNext: Record<number, { w: number; r: number }> = {};
    const rehydratedSets: Record<number, SetState[]> = {};
    for (const se of sessionExercises) {
      const tgt = programTargetsMap.get(se.exerciseId);
      seededNext[se.exerciseId] = {
        w: tgt?.targetWeightLbs ?? 0,
        r: tgt?.targetReps ?? 0,
      };
      const existing = await getSetsForExerciseInSession(session.id, se.exerciseId);
      rehydratedSets[se.exerciseId] = existing.map(s => ({
        id: s.id,
        setNumber: s.setNumber,
        w: s.weightLbs,
        r: s.reps,
        isWarmup: s.isWarmup,
        // isPR intentionally left undefined — ephemeral flag
      }));
      // If there's a most recent existing set, prefer it over program target for next-w/next-r
      if (existing.length > 0) {
        const last = existing[existing.length - 1];
        seededNext[se.exerciseId] = { w: last.weightLbs, r: last.reps };
      }
    }
    if (!cancelled) {
      setNextByExercise(seededNext);
      setSetsByExercise(rehydratedSets);
    }
  })();

  return () => { cancelled = true; };
}, [session, sessionExercises, programTargetsMap]);
```

- [ ] **Step 4: Add the log-set handler**

Add as a `useCallback`:

```tsx
const handleLog = useCallback(async (exerciseId: number) => {
  if (!session) { return; }
  const next = nextByExercise[exerciseId];
  if (!next) { return; }

  const exercise = exercises.find(e => e.id === exerciseId);
  const isTimed = exercise?.measurementType === 'timed';

  // Timed sets come from the stopwatch context — Phase 7 preserves the
  // existing stopwatch UI by rendering it inside NextSetPanel via the
  // timedStopwatchDisplay prop. The log path still uses nextR for duration.
  const w = isTimed ? 0 : next.w;
  const r = next.r;
  if (!isTimed && (w < 0 || r <= 0)) { return; }

  const newSet = await logSet(session.id, exerciseId, w, r);

  // PR check only for reps-measured exercises with a weight component
  let isPR = false;
  if (!isTimed && w > 0) {
    try {
      isPR = await checkForPR(exerciseId, w, r);
    } catch {
      isPR = false;
    }
  }

  setSetsByExercise(prev => ({
    ...prev,
    [exerciseId]: [
      ...(prev[exerciseId] ?? []),
      {
        id: newSet.id,
        setNumber: newSet.setNumber,
        w: newSet.weightLbs,
        r: newSet.reps,
        isWarmup: newSet.isWarmup,
        isPR,
      },
    ],
  }));

  if (isPR) {
    prToastRef.current?.flash?.();
  }

  // Pre-fill next set with the just-logged values (same as old panel)
  setNextByExercise(prev => ({
    ...prev,
    [exerciseId]: { w: newSet.weightLbs, r: newSet.reps },
  }));

  // Start rest timer
  const se = sessionExercises.find(s => s.exerciseId === exerciseId);
  const rest = restOverrides[exerciseId] ?? se?.restSeconds ?? 60;
  if (rest > 0) {
    startTimer(rest);
  }

  // Superset rotation (if applicable) — formalized in Phase 9 but no-op safe now
  const groupId = exerciseSupersetMapRef.current.get(exerciseId);
  if (groupId !== undefined) {
    const members = supersetGroupsRef.current.get(groupId) ?? [];
    const idx = members.indexOf(exerciseId);
    if (idx >= 0 && members.length > 1) {
      const nextMember = members[(idx + 1) % members.length];
      setActiveExerciseId(nextMember);
      // ssCurrentByGroup state added in Phase 9
    }
  }
}, [session, nextByExercise, exercises, sessionExercises, restOverrides, startTimer]);
```

If `prToastRef.current?.flash` does not match your existing PRToast API, adapt to whatever method the existing `PRToast` exposes (check `src/components/PRToast.tsx`).

- [ ] **Step 5: Add `handleOpenPad` and `handleNextChange` handlers**

```tsx
const handleOpenPad = useCallback((exerciseId: number, field: 'w' | 'r') => {
  const next = nextByExercise[exerciseId];
  const name = exercises.find(e => e.id === exerciseId)?.name ?? '';
  setPad({
    exerciseId,
    field,
    initialValue: next ? (field === 'w' ? next.w : next.r) : 0,
    label: name,
  });
}, [nextByExercise, exercises]);

const handleNextChange = useCallback((exerciseId: number, field: 'w' | 'r', value: number) => {
  setNextByExercise(prev => ({
    ...prev,
    [exerciseId]: {
      w: field === 'w' ? value : prev[exerciseId]?.w ?? 0,
      r: field === 'r' ? value : prev[exerciseId]?.r ?? 0,
    },
  }));
}, []);

const handleDeleteSet = useCallback(async (exerciseId: number, setId: number) => {
  await deleteSet(setId);
  setSetsByExercise(prev => ({
    ...prev,
    [exerciseId]: (prev[exerciseId] ?? []).filter(s => s.id !== setId),
  }));
}, []);
```

- [ ] **Step 6: Add lazy history fetch on expand**

Add to the existing `handleExpand` / `handlePressExercise` callback. Pseudocode:

```tsx
const handleExpandExercise = useCallback(async (exerciseId: number) => {
  setActiveExerciseId(prev => (prev === exerciseId ? null : exerciseId));
  if (!session) { return; }
  if (lastSetsByExercise[exerciseId] === undefined || lastSetsByExercise[exerciseId] === null) {
    const sets = await getLastSessionSets(exerciseId, session.id);
    setLastSetsByExercise(prev => ({ ...prev, [exerciseId]: sets }));
  }
}, [session, lastSetsByExercise]);
```

Replace the existing `onPress` handler passed to the `ExerciseCard` helper to call `handleExpandExercise`.

- [ ] **Step 7: Replace `<SetLoggingPanel>` usage in the inline `ExerciseCard`**

Locate the existing `ExerciseCard` function inside `WorkoutScreen.tsx` (~lines 195-330). Inside the `{isActive && (...)}` block, find the `<SetLoggingPanel .../>` element and replace that whole block with:

```tsx
{isActive && (
  <View style={[styles.cardExpanded, insideSuperset && styles.cardExpandedInSuperset]}>
    {/* Rest duration stepper (unchanged; keep existing restLabelRow/restStepperRow) */}
    {/* ... existing rest-stepper code stays here ... */}

    {/* Logged sets */}
    {(sets ?? []).map(s => (
      <SetRow
        key={s.id}
        setNumber={s.setNumber}
        weightLbs={s.w}
        reps={s.r}
        type={s.isPR ? 'pr' : 'done'}
        isTimed={measurementType === 'timed'}
        isHeightReps={measurementType === 'height_reps'}
        onDelete={() => onDeleteSet(s.id)}
      />
    ))}

    {/* Last-session history peek */}
    <GhostReference
      sets={lastSets ?? []}
      isTimed={measurementType === 'timed'}
      isHeightReps={measurementType === 'height_reps'}
    />

    {/* Next-set panel */}
    <NextSetPanel
      setNumber={(sets?.length ?? 0) + 1}
      measurementType={measurementType}
      nextW={next.w}
      nextR={next.r}
      onNextChange={(field, value) => onNextChange(field, value)}
      onOpenPad={(field) => onOpenPad(field)}
      onLog={onLog}
    />
  </View>
)}
```

Update the `ExerciseCardProps` interface and the `ExerciseCard` helper signature to accept new props:

```tsx
interface ExerciseCardProps {
  // ... existing props minus sessionId / onSetLogged / onSetDeleted from SetLoggingPanel wiring
  sets: SetState[];
  lastSets: WorkoutSet[] | null;
  next: { w: number; r: number };
  onLog: () => void;
  onNextChange: (field: 'w' | 'r', value: number) => void;
  onOpenPad: (field: 'w' | 'r') => void;
  onDeleteSet: (setId: number) => void;
  // ... retained existing props: programTarget, measurementType, restSeconds, etc.
}
```

Pass these props from the render site in `WorkoutScreen` JSX where `<ExerciseCard>` is instantiated — both the standalone render and the superset nested render. Example:

```tsx
<ExerciseCard
  exerciseSession={se}
  exerciseName={exercise.name}
  isActive={activeExerciseId === se.exerciseId}
  setCount={setsByExercise[se.exerciseId]?.length ?? 0}
  sessionId={session.id}
  pendingRest={pendingRestExerciseId === se.exerciseId}
  programTarget={programTargetsMap.get(se.exerciseId) ?? null}
  measurementType={exercise.measurementType}
  restSeconds={restOverrides[se.exerciseId] ?? se.restSeconds}
  sets={setsByExercise[se.exerciseId] ?? []}
  lastSets={lastSetsByExercise[se.exerciseId] ?? null}
  next={nextByExercise[se.exerciseId] ?? { w: 0, r: 0 }}
  onPress={() => handleExpandExercise(se.exerciseId)}
  onToggleComplete={() => toggleExerciseComplete(se.exerciseId)}
  onLog={() => handleLog(se.exerciseId)}
  onNextChange={(field, value) => handleNextChange(se.exerciseId, field, value)}
  onOpenPad={(field) => handleOpenPad(se.exerciseId, field)}
  onDeleteSet={(setId) => handleDeleteSet(se.exerciseId, setId)}
  onStartRest={() => handleStartRest(se.exerciseId)}
  onViewHistory={() => handleViewHistory(se.exerciseId)}
  onRestChange={(newRest) => handleRestChange(se.exerciseId, newRest)}
  onSwap={() => handleSwap(se.exerciseId)}
/>
```

Remove the old `<SetLoggingPanel>` import and any unused `onSetLogged` / `onSetDeleted` prop chains in this file.

- [ ] **Step 8: Mount `<NumberPad>` at the screen root**

At the root of the `WorkoutScreen` return JSX (sibling to the `<ScrollView>`), add:

```tsx
<NumberPad
  visible={pad !== null}
  field={pad?.field === 'w' ? 'weight' : 'reps'}
  initialValue={pad?.initialValue ?? 0}
  label={pad?.label}
  onCancel={() => setPad(null)}
  onCommit={(v) => {
    if (pad) {
      handleNextChange(pad.exerciseId, pad.field, v);
    }
    setPad(null);
  }}
/>
```

- [ ] **Step 9: Typecheck**

Run: `npx tsc --noEmit`
Expected: exit 0. If TypeScript errors reference `SetLoggingPanel` prop shapes, delete the imports and any prop plumbing that only existed for the old panel.

- [ ] **Step 10: Run unit tests**

Run: `npm test`
Expected: all tests pass. If tests fail because they import `SetLoggingPanel`, update those tests to use the new composition or skip them for this phase (mark with `describe.skip` + a TODO referencing Phase 10 cleanup).

- [ ] **Step 11: Deploy and smoke-test (CRITICAL)**

Invoke `/deploy`.

Smoke-test checklist — **run this thoroughly; this is the highest-risk phase.**

**Reps exercise (e.g. Bench Press):**
- Expand the card. History peek button shows `Last session · N sets`; tapping it expands the list.
- `NEXT SET` panel shows set-number `1` with stepper rows for `WEIGHT` and `REPS`.
- `+` on weight increments by 5 with a light haptic. `−` decrements; disabled at 0.
- Tap the weight value. NumberPad slides up from the bottom with the correct initial value + a blinking mint caret.
- Type `2`, `3`, `5`, `CONFIRM`. Weight updates to 235. Pad dismisses.
- Tap LOG SET 1. Haptic fires. A `SetRow` appears above with a mint dot + check + `235 lb` + `N reps`. Rest timer starts. Notification shows.
- Log a second set at a higher weight — PRToast flashes + the row has a gold trophy.
- Long-press a logged set row — Delete affordance appears; tapping Delete removes the set from the list and DB.

**Timed exercise (e.g. Plank):**
- Expand the card. The `NEXT SET` panel shows a centered duration in yellow.
- The existing stopwatch UI (start/stop/resume/reset) still works inside the timed display.
- After stopping, `LOG SET 1` persists the duration.

**Height-reps exercise (if configured):**
- Stepper step is 2 inches for weight (height).

**Aggregate stats:**
- After logging sets, the `WorkoutHeader` shows non-zero `VOLUME`, `SETS`, and if any PRs flashed, `PRS` > 0 in gold.

**Rehydration:**
- Close and reopen the app while a session is active. Returning to the workout should show previously-logged sets as `SetRow`s inside each card (rehydrated via `getSetsForExerciseInSession`). PR stars will not persist (per Decision #4).

- [ ] **Step 12: Commit**

```bash
git add src/screens/WorkoutScreen.tsx
git commit -m "feat(workout): hoist per-exercise state + wire NumberPad (V1 Phase 7)

- Moves setsByExercise / nextByExercise / lastSetsByExercise state from
  SetLoggingPanel up to WorkoutScreen.
- Replaces <SetLoggingPanel> in the expanded card body with SetRow list
  + GhostReference history peek + NextSetPanel.
- Mounts a single screen-level <NumberPad>; ExerciseCard callbacks
  (onOpenPad, onNextChange, onLog, onDeleteSet) route through it.
- Derives header VOLUME/SETS/PRS aggregates from setsByExercise via
  useMemo.
- Rehydrates existing sets from the DB on session load (isPR stays
  undefined — session-scoped flag).
- Preserves stopwatch for timed exercises, height-reps 2in step,
  long-press-to-delete, PR toast, haptics.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

### Task 7.6 — Dissolve or shim SetLoggingPanel

**Files:**
- Modify: `src/components/SetLoggingPanel.tsx` (reduce to thin shim) OR delete in Phase 10.

- [ ] **Step 1: Find remaining imports of `SetLoggingPanel`**

Run: `grep -rn "SetLoggingPanel" src/ __tests__/`
Expected: only `src/components/SetLoggingPanel.tsx` itself and maybe `src/components/__tests__/`.

If the only remaining imports are internal or test files referencing the module by name (not by its API), proceed to delete in Step 2. If other production files still import it, convert to a shim.

- [ ] **Step 2: Delete the file (if no production consumers)**

```bash
git rm src/components/SetLoggingPanel.tsx
```

If a test file references it, either update the test to use the new components or add a `// eslint-disable-next-line` skip on a `describe.skip(...)` with a `// TODO: rewrite for V1 screen` comment.

- [ ] **Step 3: Typecheck and test**

Run: `npx tsc --noEmit && npm test`
Expected: exit 0 for both.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "chore(workout): remove SetLoggingPanel (dissolved in Phase 7)

Logging responsibilities have moved to SetRow, NextSetPanel, and the
screen-level state hoist. Any tests still referencing this module are
either updated to the new composition or skipped with a follow-up
TODO.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Phase 8 — ExerciseCard reshape + CategoryHeader + More menu

Extracts the inline `ExerciseCard` helper into its own file, applies V1 styling (accent bar, chip row, mint border), adds the `More` ActionSheet, and replaces the existing category header.

### Task 8.1 — Extract ExerciseCard to its own file

**Files:**
- Create: `src/components/ExerciseCard.tsx`
- Modify: `src/screens/WorkoutScreen.tsx`

- [ ] **Step 1: Write the new ExerciseCard**

```tsx
import React from 'react';
import {
  ActionSheetIOS,
  Alert,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { colors, getCategoryColor } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { fontSize } from '../theme/typography';
import {
  Exercise,
  ExerciseCategory,
  ExerciseMeasurementType,
  ExerciseSession,
  WorkoutSet,
} from '../types';
import { SetRow } from './SetRow';
import { GhostReference } from './GhostReference';
import { NextSetPanel } from './NextSetPanel';
import { Check, Trophy, More } from './icons';
import { SetState } from './exerciseCardState';
import { ProgramTarget } from './ProgramTargetReference';

export interface SupersetBadge {
  label: string;               // "A", "B"
  index: number;               // 0-based member index
  isCurrent: boolean;
  color: string;               // supersetPurple
}

interface ExerciseCardProps {
  exerciseSession: ExerciseSession;
  exercise: Exercise;
  isActive: boolean;
  programTarget: ProgramTarget | null;
  measurementType: ExerciseMeasurementType;
  restSeconds: number;
  sets: SetState[];
  lastSets: WorkoutSet[] | null;
  next: { w: number; r: number };
  supersetBadge?: SupersetBadge;
  insideSuperset?: boolean;
  onExpand: () => void;
  onToggleComplete: () => void;
  onLog: () => void;
  onNextChange: (field: 'w' | 'r', value: number) => void;
  onOpenPad: (field: 'w' | 'r') => void;
  onDeleteSet: (setId: number) => void;
  onSwap: () => void;
  onEditTarget: () => void;
}

function presentMoreMenu(options: {
  onSwap: () => void;
  onEditTarget: () => void;
}) {
  const items = ['Swap exercise', 'Edit target', 'Cancel'];
  if (Platform.OS === 'ios') {
    ActionSheetIOS.showActionSheetWithOptions(
      { options: items, cancelButtonIndex: 2 },
      i => {
        if (i === 0) { options.onSwap(); }
        else if (i === 1) { options.onEditTarget(); }
      },
    );
  } else {
    Alert.alert('', undefined, [
      { text: 'Swap exercise', onPress: options.onSwap },
      { text: 'Edit target', onPress: options.onEditTarget },
      { text: 'Cancel', style: 'cancel' },
    ]);
  }
}

export function ExerciseCard({
  exerciseSession,
  exercise,
  isActive,
  programTarget,
  measurementType,
  sets,
  lastSets,
  next,
  supersetBadge,
  insideSuperset,
  onExpand,
  onToggleComplete,
  onLog,
  onNextChange,
  onOpenPad,
  onDeleteSet,
  onSwap,
  onEditTarget,
}: ExerciseCardProps) {
  const target = programTarget;
  const completed = sets.length;
  const isTimed = measurementType === 'timed';
  const isHeightReps = measurementType === 'height_reps';
  const isDone = exerciseSession.isComplete;
  const catColor = supersetBadge ? supersetBadge.color : getCategoryColor(exercise.category as ExerciseCategory);

  const targetLabel = target
    ? (isTimed
        ? `${target.targetReps}s target`
        : `${target.targetReps} × ${target.targetWeightLbs} lb`)
    : '';

  const prCount = sets.filter(s => s.isPR).length;

  return (
    <View
      style={[
        styles.card,
        insideSuperset ? styles.cardInSuperset : null,
        isActive ? styles.cardActive : styles.cardInactive,
      ]}>
      {/* Header row */}
      <TouchableOpacity style={styles.header} onPress={onExpand} activeOpacity={0.8}>
        {/* 3px category accent bar */}
        <View style={[styles.accentBar, { backgroundColor: catColor }]} />

        <View style={styles.textColumn}>
          {supersetBadge && (
            <View style={styles.ssBadgeRow}>
              <View
                style={[
                  styles.ssBadge,
                  {
                    backgroundColor: supersetBadge.isCurrent
                      ? supersetBadge.color
                      : 'rgba(181,122,224,0.15)',
                  },
                ]}>
                <Text
                  style={[
                    styles.ssBadgeText,
                    { color: supersetBadge.isCurrent ? '#FFFFFF' : supersetBadge.color },
                  ]}>
                  {supersetBadge.label}{supersetBadge.index + 1}
                </Text>
              </View>
              {supersetBadge.isCurrent && (
                <Text style={[styles.ssNow, { color: supersetBadge.color }]}>← NOW</Text>
              )}
            </View>
          )}
          <Text style={[styles.name, isDone && styles.nameDone]} numberOfLines={2}>
            {exercise.name}
          </Text>
          <View style={styles.metaRow}>
            <Text style={styles.metaText}>
              {completed}/{target?.targetSets ?? 3} SETS
            </Text>
            {targetLabel ? (
              <>
                <View style={styles.metaBullet} />
                <Text style={styles.metaText}>{targetLabel}</Text>
              </>
            ) : null}
            {prCount > 0 && (
              <>
                <View style={styles.metaBullet} />
                <View style={styles.prMeta}>
                  <Trophy size={12} color={colors.prGold} />
                  <Text style={styles.prText}>PR</Text>
                </View>
              </>
            )}
          </View>
        </View>

        <TouchableOpacity
          onPress={() => presentMoreMenu({ onSwap, onEditTarget })}
          style={styles.moreButton}
          hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
          <More size={20} color={colors.secondary} />
        </TouchableOpacity>

        <TouchableOpacity
          onPress={onToggleComplete}
          style={[styles.checkCircle, isDone ? styles.checkCircleDone : styles.checkCirclePending]}
          hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
          {isDone && <Check size={16} color={colors.onAccent} />}
        </TouchableOpacity>
      </TouchableOpacity>

      {/* Collapsed chip row */}
      {!isActive && completed > 0 && (
        <View style={styles.chipRow}>
          {sets.map((s, i) => (
            <View
              key={s.id ?? i}
              style={[
                styles.chip,
                s.isPR ? styles.chipPr : styles.chipRegular,
              ]}>
              <Text style={[styles.chipText, s.isPR ? styles.chipTextPr : styles.chipTextRegular]}>
                {isTimed
                  ? formatDuration(s.r)
                  : `${s.w}×${s.r}${s.isPR ? ' ★' : ''}`}
              </Text>
            </View>
          ))}
        </View>
      )}

      {/* Expanded body */}
      {isActive && (
        <View style={styles.expandedBody}>
          {sets.length > 0 && (
            <View style={styles.setsColumn}>
              {sets.map(s => (
                <SetRow
                  key={s.id}
                  setNumber={s.setNumber}
                  weightLbs={s.w}
                  reps={s.r}
                  type={s.isPR ? 'pr' : 'done'}
                  isTimed={isTimed}
                  isHeightReps={isHeightReps}
                  onDelete={() => onDeleteSet(s.id)}
                />
              ))}
            </View>
          )}
          <GhostReference sets={lastSets ?? []} isTimed={isTimed} isHeightReps={isHeightReps} />
          <NextSetPanel
            setNumber={completed + 1}
            measurementType={measurementType}
            nextW={next.w}
            nextR={next.r}
            onNextChange={onNextChange}
            onOpenPad={onOpenPad}
            onLog={onLog}
          />
        </View>
      )}
    </View>
  );
}

function formatDuration(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 10,
    overflow: 'hidden',
  },
  cardInSuperset: {
    marginBottom: 6,
  },
  cardActive: {
    backgroundColor: colors.surfaceElevated,
    borderColor: 'rgba(141,194,138,0.28)',
  },
  cardInactive: {
    borderColor: colors.border,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  accentBar: {
    width: 3,
    alignSelf: 'stretch',
    borderRadius: 2,
  },
  textColumn: {
    flex: 1,
    minWidth: 0,
  },
  ssBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 3,
  },
  ssBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
  },
  ssBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1,
  },
  ssNow: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1.2,
  },
  name: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.primary,
    letterSpacing: -0.2,
  },
  nameDone: {
    color: colors.secondary,
    textDecorationLine: 'line-through',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 2,
  },
  metaText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.secondary,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    fontVariant: ['tabular-nums'],
  },
  metaBullet: {
    width: 3,
    height: 3,
    borderRadius: 2,
    backgroundColor: colors.secondaryDim,
  },
  prMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  prText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.prGold,
  },
  moreButton: {
    padding: 4,
  },
  checkCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkCircleDone: {
    backgroundColor: colors.accent,
  },
  checkCirclePending: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: colors.borderStrong,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    paddingHorizontal: 16,
    paddingBottom: 14,
  },
  chip: {
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 999,
  },
  chipRegular: {
    backgroundColor: 'rgba(141,194,138,0.10)',
  },
  chipPr: {
    backgroundColor: 'rgba(255,184,0,0.12)',
  },
  chipText: {
    fontSize: 12,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  chipTextRegular: {
    color: colors.accent,
  },
  chipTextPr: {
    color: colors.prGold,
  },
  expandedBody: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    gap: 0,
  },
  setsColumn: {
    marginBottom: 10,
  },
});
```

- [ ] **Step 2: Replace the inline `ExerciseCard` helper in `WorkoutScreen.tsx`**

Remove the entire inline `ExerciseCard` function from `WorkoutScreen.tsx` (including its `ExerciseCardProps` interface). Replace all call sites with:

```tsx
import { ExerciseCard } from '../components/ExerciseCard';
```

Update the call sites to match the new `ExerciseCard` prop signature (see Task 7.5 Step 7 — the prop shape is already what the new component accepts). The existing `onStartRest` / `onViewHistory` / `onRestChange` plumbing can be dropped if those features are unused; otherwise thread them through and add equivalent props on the new `ExerciseCard`.

- [ ] **Step 3: Add `CategoryHeader` inline component in `WorkoutScreen.tsx`**

Near the existing plan-rendering code, add:

```tsx
interface CategoryHeaderProps {
  category: ExerciseCategory;
  done: number;
  total: number;
}

function CategoryHeader({ category, done, total }: CategoryHeaderProps) {
  return (
    <View style={categoryHeaderStyles.row}>
      <View style={[categoryHeaderStyles.dot, { backgroundColor: getCategoryColor(category) }]} />
      <Text style={categoryHeaderStyles.label}>{category}</Text>
      <View style={categoryHeaderStyles.divider} />
      <Text style={categoryHeaderStyles.counter}>{done}/{total}</Text>
    </View>
  );
}

const categoryHeaderStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 16,
    marginBottom: 10,
    paddingHorizontal: 2,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  label: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.secondary,
    letterSpacing: 1.8,
    textTransform: 'uppercase',
  },
  divider: {
    flex: 1,
    height: 1,
    backgroundColor: colors.border,
  },
  counter: {
    fontSize: 11,
    color: colors.secondaryDim,
    fontVariant: ['tabular-nums'],
  },
});
```

Replace the existing category header JSX (the row that currently renders the category name as a section divider) with `<CategoryHeader category={...} done={...} total={...} />`.

- [ ] **Step 4: Typecheck**

Run: `npx tsc --noEmit`
Expected: exit 0.

- [ ] **Step 5: Deploy and smoke-test**

Invoke `/deploy`.

Smoke-test checklist:
- Category headers render with a colored 6px dot, uppercase letter-spaced category name, thin divider, `{done}/{total}` counter on the right.
- Collapsed exercise cards show the 3px accent bar, the exercise name, a metadata row (`0/N SETS · reps × weight lb`), and a `⋯ check-circle` cluster on the right.
- If any sets are logged (collapsed state), a chip row below shows `{w}×{r}` (mint) or `{w}×{r} ★` (gold) chips.
- Tapping the ⋯ opens an iOS ActionSheet or Android Alert with `Swap exercise` / `Edit target` / `Cancel`. Selecting Swap opens the existing `SwapSheet`. Selecting Edit target opens `EditTargetsModal`.
- Expanded card shows mint border + the full logging UI from Phase 7.

- [ ] **Step 6: Commit**

```bash
git add src/components/ExerciseCard.tsx src/screens/WorkoutScreen.tsx
git commit -m "feat(workout): extract ExerciseCard + add CategoryHeader and More menu

- ExerciseCard moves from inline helper in WorkoutScreen to its own
  file. V1 styling: 3px accent bar, collapsed chip row (mint for
  regular, gold w/ star for PR), mint border + surfaceElevated bg
  when expanded.
- Metadata row: N/M SETS | reps x weight | optional PR trophy.
- ⋯ More button opens ActionSheet (iOS) or Alert (Android) with
  Swap exercise / Edit target. Old SwapSheet + EditTargetsModal are
  unchanged and reachable from these actions.
- CategoryHeader: 6x6 color dot + uppercase category + divider + N/M.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Phase 9 — SupersetGroup (purple theme + auto-advance)

Rewrite of the existing `SupersetContainer` helper into its own file with V1 purple styling and formal auto-advance logic.

### Task 9.1 — Create SupersetGroup

**Files:**
- Create: `src/components/SupersetGroup.tsx`

- [ ] **Step 1: Write the component**

```tsx
import React from 'react';
import {
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { colors } from '../theme/colors';
import {
  Exercise,
  ExerciseSession,
  WorkoutSet,
} from '../types';
import { ExerciseCard, SupersetBadge } from './ExerciseCard';
import { SetState } from './exerciseCardState';
import { ProgramTarget } from './ProgramTargetReference';

interface SupersetGroupProps {
  groupId: number;
  label: string;                      // 'A', 'B'
  memberIds: number[];
  exerciseMap: Map<number, Exercise>;
  sessionMap: Map<number, ExerciseSession>;
  programTargetsMap: Map<number, ProgramTarget>;
  restOverrides: Record<number, number>;
  setsByExercise: Record<number, SetState[]>;
  nextByExercise: Record<number, { w: number; r: number }>;
  lastSetsByExercise: Record<number, WorkoutSet[] | null>;
  currentMemberId: number;
  activeExerciseId: number | null;
  onExpand: (id: number) => void;
  onToggleComplete: (id: number) => void;
  onLog: (id: number) => void;
  onNextChange: (id: number, field: 'w' | 'r', value: number) => void;
  onOpenPad: (id: number, field: 'w' | 'r') => void;
  onDeleteSet: (id: number, setId: number) => void;
  onSwap: (id: number) => void;
  onEditTarget: (id: number) => void;
  onMemberSelect: (memberId: number) => void;  // manual override of current
}

export function SupersetGroup({
  groupId,
  label,
  memberIds,
  exerciseMap,
  sessionMap,
  programTargetsMap,
  restOverrides,
  setsByExercise,
  nextByExercise,
  lastSetsByExercise,
  currentMemberId,
  activeExerciseId,
  onExpand,
  onToggleComplete,
  onLog,
  onNextChange,
  onOpenPad,
  onDeleteSet,
  onSwap,
  onEditTarget,
  onMemberSelect,
}: SupersetGroupProps) {
  const members = memberIds
    .map(id => ({ id, ex: exerciseMap.get(id), se: sessionMap.get(id) }))
    .filter(m => m.ex && m.se);

  const totalRounds = Math.max(
    ...members.map(m => programTargetsMap.get(m.id)?.targetSets ?? 3),
  );
  const completedRounds = Math.min(
    ...members.map(m => setsByExercise[m.id]?.length ?? 0),
  );
  const purple = colors.supersetPurple;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{label}</Text>
        </View>
        <View style={styles.textColumn}>
          <Text style={styles.eyebrow}>SUPERSET · {members.length} EXERCISES</Text>
          <View style={styles.flowRow}>
            {members.map((m, i) => (
              <React.Fragment key={m.id}>
                <Text
                  style={[
                    styles.flowWord,
                    m.id === currentMemberId ? styles.flowWordCurrent : null,
                  ]}>
                  {lastWord(m.ex!.name)}
                </Text>
                {i < members.length - 1 && (
                  <Text style={styles.flowArrow}>→</Text>
                )}
              </React.Fragment>
            ))}
          </View>
        </View>
        <View style={styles.counterColumn}>
          <Text style={styles.counterValue}>{completedRounds}/{totalRounds}</Text>
          <Text style={styles.counterLabel}>rounds</Text>
        </View>
      </View>
      <View style={styles.cardsColumn}>
        {members.map((m, i) => {
          const badge: SupersetBadge = {
            label,
            index: i,
            isCurrent: m.id === currentMemberId,
            color: purple,
          };
          return (
            <View key={m.id} style={styles.cardWrap}>
              {m.id === currentMemberId && <View style={styles.glowRail} />}
              <ExerciseCard
                exerciseSession={m.se!}
                exercise={m.ex!}
                isActive={activeExerciseId === m.id}
                programTarget={programTargetsMap.get(m.id) ?? null}
                measurementType={m.ex!.measurementType}
                restSeconds={restOverrides[m.id] ?? m.se!.restSeconds}
                sets={setsByExercise[m.id] ?? []}
                lastSets={lastSetsByExercise[m.id] ?? null}
                next={nextByExercise[m.id] ?? { w: 0, r: 0 }}
                supersetBadge={badge}
                insideSuperset={true}
                onExpand={() => {
                  onMemberSelect(m.id);
                  onExpand(m.id);
                }}
                onToggleComplete={() => onToggleComplete(m.id)}
                onLog={() => onLog(m.id)}
                onNextChange={(field, value) => onNextChange(m.id, field, value)}
                onOpenPad={(field) => onOpenPad(m.id, field)}
                onDeleteSet={(setId) => onDeleteSet(m.id, setId)}
                onSwap={() => onSwap(m.id)}
                onEditTarget={() => onEditTarget(m.id)}
              />
            </View>
          );
        })}
      </View>
      {/* groupId used for identity; silence lint warning */}
      {groupId === -999 ? null : null}
    </View>
  );
}

function lastWord(name: string): string {
  const parts = name.trim().split(/\s+/);
  return parts[parts.length - 1] ?? name;
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'rgba(181,122,224,0.03)',
    borderWidth: 1,
    borderColor: 'rgba(181,122,224,0.28)',
    borderRadius: 20,
    padding: 10,
    marginBottom: 10,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 8,
    paddingTop: 4,
    paddingBottom: 10,
  },
  badge: {
    width: 26,
    height: 26,
    borderRadius: 8,
    backgroundColor: 'rgba(181,122,224,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.supersetPurple,
  },
  textColumn: {
    flex: 1,
  },
  eyebrow: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.supersetPurple,
    letterSpacing: 1.8,
    textTransform: 'uppercase',
  },
  flowRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  flowWord: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.secondary,
  },
  flowWordCurrent: {
    color: colors.primary,
    fontWeight: '700',
  },
  flowArrow: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.supersetPurple,
  },
  counterColumn: {
    alignItems: 'flex-end',
  },
  counterValue: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.secondary,
    fontVariant: ['tabular-nums'],
    letterSpacing: 0.5,
  },
  counterLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.secondaryDim,
  },
  cardsColumn: {
    gap: 6,
  },
  cardWrap: {
    position: 'relative',
  },
  glowRail: {
    position: 'absolute',
    left: -4,
    top: 16,
    bottom: 16,
    width: 3,
    borderRadius: 2,
    backgroundColor: colors.supersetPurple,
    // RN approximation of box-shadow: 0 0 12px purple80
    shadowColor: colors.supersetPurple,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 6,
    elevation: 4,
  },
});
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: exit 0.

- [ ] **Step 3: Commit**

```bash
git add src/components/SupersetGroup.tsx
git commit -m "feat(superset): add SupersetGroup component (V1 purple design)

Purple container with 26x26 label badge (A/B), 'SUPERSET · N EXERCISES'
eyebrow, flow line (last-word of each member joined by purple arrows;
current member rendered white/700), and rounds counter
(min sets logged across members / max target sets). Nested ExerciseCard
members receive supersetBadge prop for A1/A2 pill + NOW tag. Current
member renders a glowing purple rail on the outer-left edge.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

### Task 9.2 — Replace existing SupersetContainer + formalize auto-advance in WorkoutScreen

**Files:**
- Modify: `src/screens/WorkoutScreen.tsx`

- [ ] **Step 1: Add `ssCurrentByGroup` state**

Near the existing superset state, add:

```tsx
const [ssCurrentByGroup, setSsCurrentByGroup] = useState<Record<number, number>>({});

// Seed initial current member = first in group
useEffect(() => {
  if (supersetGroups.size === 0) { return; }
  const init: Record<number, number> = {};
  supersetGroups.forEach((members, gid) => {
    if (members.length > 0) { init[gid] = members[0]; }
  });
  setSsCurrentByGroup(prev => ({ ...init, ...prev }));
}, [supersetGroups]);
```

- [ ] **Step 2: Update `handleLog` to rotate `ssCurrentByGroup`**

Inside the existing `handleLog` (added in Task 7.5), find the superset-rotation block and replace it with:

```tsx
const groupId = exerciseSupersetMapRef.current.get(exerciseId);
if (groupId !== undefined) {
  const members = supersetGroupsRef.current.get(groupId) ?? [];
  const idx = members.indexOf(exerciseId);
  if (idx >= 0 && members.length > 1) {
    const nextMember = members[(idx + 1) % members.length];
    setSsCurrentByGroup(prev => ({ ...prev, [groupId]: nextMember }));
    setActiveExerciseId(nextMember);
  }
}
```

- [ ] **Step 3: Add an `onMemberSelect` handler**

```tsx
const handleSupersetMemberSelect = useCallback((memberId: number) => {
  const groupId = exerciseSupersetMapRef.current.get(memberId);
  if (groupId === undefined) { return; }
  setSsCurrentByGroup(prev => ({ ...prev, [groupId]: memberId }));
}, []);
```

- [ ] **Step 4: Swap `<SupersetContainer>` for `<SupersetGroup>`**

Delete the inline `SupersetContainer` helper + its `supersetStyles` block from `WorkoutScreen.tsx`. Replace its call site in the render with:

```tsx
<SupersetGroup
  groupId={section.groupId}
  label={supersetLabelFor(section.groupId)}
  memberIds={section.exerciseIds}
  exerciseMap={exerciseMap}
  sessionMap={sessionExerciseMap}
  programTargetsMap={programTargetsMap}
  restOverrides={restOverrides}
  setsByExercise={setsByExercise}
  nextByExercise={nextByExercise}
  lastSetsByExercise={lastSetsByExercise}
  currentMemberId={ssCurrentByGroup[section.groupId] ?? section.exerciseIds[0]}
  activeExerciseId={activeExerciseId}
  onExpand={handleExpandExercise}
  onToggleComplete={toggleExerciseComplete}
  onLog={handleLog}
  onNextChange={handleNextChange}
  onOpenPad={handleOpenPad}
  onDeleteSet={handleDeleteSet}
  onSwap={(id) => handleSwap(id)}
  onEditTarget={(id) => handleEditTarget(id)}
  onMemberSelect={handleSupersetMemberSelect}
/>
```

`exerciseMap` and `sessionExerciseMap` are helper memos:

```tsx
const exerciseMap = useMemo(() => {
  const m = new Map<number, Exercise>();
  for (const ex of exercises) { m.set(ex.id, ex); }
  return m;
}, [exercises]);

const sessionExerciseMap = useMemo(() => {
  const m = new Map<number, ExerciseSession>();
  for (const se of sessionExercises) { m.set(se.exerciseId, se); }
  return m;
}, [sessionExercises]);
```

`supersetLabelFor(groupId)` assigns 'A', 'B', 'C'... based on the order groups appear. Example:

```tsx
const supersetLabelFor = useCallback((groupId: number) => {
  const ids = Array.from(supersetGroups.keys());
  const index = ids.indexOf(groupId);
  return index < 0 ? '?' : String.fromCharCode(65 + index);
}, [supersetGroups]);
```

- [ ] **Step 5: Rest on superset log**

Update `handleLog` to compute rest for superset members as the minimum of member rest values:

```tsx
// inside handleLog, replacing the simple `rest = restOverrides[exerciseId] ?? se?.restSeconds ?? 60`
let rest: number;
const groupId = exerciseSupersetMapRef.current.get(exerciseId);
if (groupId !== undefined) {
  const members = supersetGroupsRef.current.get(groupId) ?? [];
  const memberRests = members.map(id => {
    const over = restOverrides[id];
    if (typeof over === 'number') { return over; }
    return sessionExercises.find(s => s.exerciseId === id)?.restSeconds ?? 60;
  });
  rest = Math.max(0, Math.min(...memberRests));
} else {
  rest = restOverrides[exerciseId] ?? se?.restSeconds ?? 60;
}
```

Note: the `groupId` local variable already exists from Step 2's edit — reuse that single declaration rather than re-declaring.

- [ ] **Step 6: Typecheck**

Run: `npx tsc --noEmit`
Expected: exit 0.

- [ ] **Step 7: Deploy and smoke-test**

Invoke `/deploy`.

Smoke-test checklist — **2-member superset, 3 rounds:**
- Superset renders inside a purple container with the `A` badge, `SUPERSET · 2 EXERCISES` eyebrow, and a flow line like `Bench → Pull-up`.
- The counter shows `0/N rounds`.
- Member 1's card has the purple glow rail on the outer-left. Its A1 badge is filled purple/white with a `← NOW` label.
- Log a set on member 1. The timer starts. Member 2 becomes the current member (glow rail moves, `← NOW` moves), and its card expands automatically.
- Log a set on member 2. Member 1 becomes current again; card expands.
- Counter increments from 0/N to 1/N only when both members have been logged (min across members).
- Tap member 1's collapsed header directly — current rotates back to member 1 and the card expands.

- [ ] **Step 8: Commit**

```bash
git add src/screens/WorkoutScreen.tsx
git commit -m "feat(superset): wire SupersetGroup with rotation + formalize advance

- Adds ssCurrentByGroup state (per-group current member pointer),
  seeded from supersetGroups on load.
- handleLog rotates to the next member and expands it after a log.
- Tapping a non-current member overrides current.
- Rest on superset log uses min(member.restSec).
- Replaces inline SupersetContainer helper with the new
  SupersetGroup component.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Phase 10 — Final polish + cleanup

### Task 10.1 — Extract WorkoutSummary to its own file

**Files:**
- Create: `src/components/WorkoutSummary.tsx`
- Modify: `src/screens/WorkoutScreen.tsx`

- [ ] **Step 1: Copy the existing `WorkoutSummary` helper from `WorkoutScreen.tsx` into the new file**

Locate the existing inline `WorkoutSummary` function + its `summaryStyles` block in `src/screens/WorkoutScreen.tsx`. Move them verbatim into `src/components/WorkoutSummary.tsx`. Add imports:

```tsx
import React from 'react';
import { SafeAreaView, Text, TouchableOpacity, View, StyleSheet } from 'react-native';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { fontSize, weightBold, weightSemiBold } from '../theme/typography';
// … whatever else the existing helper uses
```

Export the component:

```tsx
export function WorkoutSummary(props: WorkoutSummaryProps) {
  // ... existing body unchanged
}

export interface WorkoutSummaryProps {
  // existing shape
}
```

- [ ] **Step 2: Import it in `WorkoutScreen.tsx`**

```tsx
import { WorkoutSummary } from '../components/WorkoutSummary';
```

Remove the old inline `WorkoutSummary` function and its `summaryStyles` block.

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit`
Expected: exit 0.

- [ ] **Step 4: Commit**

```bash
git add src/components/WorkoutSummary.tsx src/screens/WorkoutScreen.tsx
git commit -m "refactor(workout): extract WorkoutSummary to its own file

Pure move; no visual change. Shrinks WorkoutScreen.tsx further and
aligns WorkoutSummary with the project's one-component-per-file
convention.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

### Task 10.2 — Dead code cleanup

**Files:**
- Modify: `src/screens/WorkoutScreen.tsx`
- Modify: `src/components/SetListItem.tsx` (delete if unused)

- [ ] **Step 1: Search for unused imports**

Run: `npx tsc --noEmit` and `npm run lint`.

Fix any unused-import warnings in `WorkoutScreen.tsx` (e.g. `HRConnectionIndicator` if it was fully replaced by the HrPill inside WorkoutHeader; old `HistoryIcon` helper if no longer rendered; unused `LayoutAnimation` / `Platform` / etc.).

- [ ] **Step 2: Check whether `SetListItem` is still referenced**

Run: `grep -rn "SetListItem" src/ __tests__/`

If the only reference is the file itself, delete it:

```bash
git rm src/components/SetListItem.tsx
```

If a test references it, either delete the test (if the behavior is now covered by `SetRow`) or update the test to use `SetRow`.

- [ ] **Step 3: Typecheck + tests**

Run: `npx tsc --noEmit && npm test`
Expected: exit 0 for both.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "chore(workout): prune dead code after V1 redesign

Removes unused imports in WorkoutScreen, deletes SetListItem (now
replaced by SetRow), and clears orphan helpers from the pre-V1
implementation. No behavior change.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

### Task 10.3 — Final verification sweep

- [ ] **Step 1: Run the full test suite**

Run: `npm test`
Expected: all tests pass (any remaining Jest suites that exercise moved code should still be green; update or skip any that aren't).

- [ ] **Step 2: Run lint**

Run: `npm run lint`
Expected: exit 0, or only pre-existing warnings unrelated to V1 changes.

- [ ] **Step 3: Typecheck once more**

Run: `npx tsc --noEmit`
Expected: exit 0.

- [ ] **Step 4: Final deploy + acceptance checklist**

Invoke `/deploy`.

**Full acceptance walk-through:**
1. Start a program workout. WorkoutHeader shows the LIVE badge pulsing, live elapsed time, and (if BLE paired) the colored HrPill.
2. Warmup section renders amber. Check off all drills → section flips mint. Collapse it.
3. Pick a standalone exercise. Expand it. Log 3 sets with different weights, at least one PR-eligible. Verify: `SetRow`s render with mint or gold dots; PRToast fires; header `VOLUME`/`SETS`/`PRS` update.
4. Tap a weight value → NumberPad slides up → enter a new weight → CONFIRM → stepper updates.
5. Tap `⋯` → ActionSheet → `Edit target` → existing modal opens → change target → save → metadata row updates on close.
6. Start a rest → `RestTimerBanner` slides down amber; `+15s` works; `SKIP` clears.
7. Superset: log member 1 → member 2 auto-expands with purple glow → log member 2 → rotates back → round counter increments.
8. Finish workout → existing Summary modal shows (post-extraction; visuals unchanged).
9. Kill the app mid-session, relaunch → logged sets rehydrate inside their cards as `SetRow`s.

- [ ] **Step 5: Verify rollback target is intact**

Run: `git log --oneline main | head -3`
Expected: `fe9b89d` appears as the restore point commit.

Run: `git show fe9b89d --stat`
Expected: shows the design handoff materials, no code regression.

- [ ] **Step 6: Final commit (if any cleanup changes)**

If Step 1-3 required any fixes:

```bash
git add -A
git commit -m "chore(workout): final verification pass for V1

Addresses lint/typecheck nits surfaced during the end-of-phase
acceptance sweep. No behavior change.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

Otherwise, no commit needed — the phase closes on the smoke test.

---

## Post-Execution

After Phase 10 completes:

- [ ] Optionally create a PR via `/gsd-pr-branch` or the project's standard PR workflow, targeting `main` from `feat/workout-screen-v1`.
- [ ] Protect the ROADMAP per user memory (`feedback_protect_roadmap.md`) — verify no `.planning/ROADMAP.md` lines were lost during any commit.
- [ ] Delete the worktree after merge: `git worktree remove .worktrees/workout-screen-v1` (only after merge is confirmed green on `main`).

---

## Self-Review Notes

**Spec coverage:**
- Decisions 1-6 — each has at least one phase implementing it (1: all phases, 2: Phase 7, 3: Phase 6+7, 4: Phase 7.4, 5: Phase 8, 6: all phase verification steps).
- Non-goals respected: no schema migrations, no WorkoutSummary redesign (just extract), no new unit tests, no persistent `isPR`, no per-superset `restSec`.
- Risk register items: Phase 7 has the CRITICAL-labeled multi-mode smoke test; Phase 9 has the deliberate 3-round 2-member test; dead-code cleanup in Phase 10 handles `SetListItem` removal and orphan imports.
- All 7 open threads from the spec are resolved in-plan:
  1. Long-press-to-delete preserved in `SetRow` (Task 7.2) and flagged for smoke-test verification in Task 7.5 Step 11.
  2. Gradient rendering falls back to solid tinted Views (Task 4.2 and Task 2.1) — no `react-native-linear-gradient` dep added.
  3. V1 color tokens added to `colors.ts` in Task 1.1.
  4. `SetLoggingPanel` fully dissolved in Task 7.6 (no facade).
  5. `skipAllWarmupItems` loops existing DB toggle (Task 5.1).
  6. `TimerContext.addTime` added (Task 4.1).
  7. Lazy last-session fetch on first expand (Task 7.5 Step 6).

**Type consistency:**
- `SetState` is defined once in `exerciseCardState.ts` and consumed identically by `WorkoutScreen`, `ExerciseCard`, and `SupersetGroup`.
- `PadTarget.field` = `'w' | 'r'` everywhere; the NumberPad prop `field` is `'weight' | 'reps'` and is translated at the screen level (Task 7.5 Step 8).
- `HrZone = 1|2|3|4|5` exported from `HrPill.tsx`, imported by `WorkoutScreen.tsx` for the zone computation.
- `SupersetBadge` exported from `ExerciseCard.tsx`, imported by `SupersetGroup.tsx`.

**Placeholder scan:** No "TBD", "TODO", "implement later", vague "add error handling", or "similar to Task N" back-references. Every step shows the exact code or exact command.

---

Plan complete and saved to `docs/superpowers/plans/2026-04-18-workout-screen-v1.md`.
