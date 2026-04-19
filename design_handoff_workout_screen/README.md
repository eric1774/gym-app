# Handoff: Workout Screen Redesign (V1 — Stacked Cards)

## Overview

This is a redesign of the `WorkoutScreen` in the existing React Native gym app (repo: `eric1774/gym-app`, file: `src/screens/WorkoutScreen.tsx`). It keeps the current information architecture (one screen per workout, exercises grouped by category, inline set logging) but makes **sets, reps, and history visually distinct**, makes adding a set a one-tap action, adds a **clearly distinct warm-up section**, and introduces a **live heart-rate readout** fed by the existing BLE integration.

## About the Design Files

The files in this bundle are **design references created in HTML / React (browser)** — prototypes showing intended look and behavior, not production code to ship. The task is to **recreate this design inside the existing React Native codebase**, using its established patterns:

- `StyleSheet.create` (not inline style objects)
- `View`, `Text`, `Pressable`, `ScrollView`, `Modal` (not `div`, `button`, etc.)
- Existing theme files: `src/theme/colors.ts`, `src/theme/spacing.ts`, `src/theme/typography.ts`
- Existing components where possible: `SetLoggingPanel`, `SetListItem`, `RestTimerBanner`, `GhostReference`

SVG icons from `icons.jsx` should be reimplemented with `react-native-svg` (same paths, same stroke widths).

## Fidelity

**High-fidelity.** Colors, spacing, typography, component sizes, and interaction behavior are all final. Recreate pixel-perfectly using the codebase's existing libraries. Where the codebase's theme tokens differ from the values below, prefer the token — the HTML already pulls from `src/theme/colors.ts`, so they should match.

---

## Screens / Views

One screen: **Workout Screen** (replaces current `WorkoutScreen.tsx`).

### Layout (top → bottom, fixed device viewport)

1. **Header** — fixed at top, `background: #151718`, bottom border `rgba(255,255,255,0.08)`, `padding: 14px 16px 12px`
2. **Rest Bar** — slides down under header when rest is active; hidden otherwise
3. **Scrollable content** — `flex: 1`, contains:
   - Warm-up section (always first)
   - Category groups (chest, back, legs, shoulders, core, conditioning) with exercise cards
4. **Number Pad** — slide-up modal overlay, 40% of screen height, triggered by tapping any weight/reps value

---

## Components

### 1. Header (`WorkoutHeader`)

- Row 1 (left): small pulsing green dot + `LIVE · PUSH DAY` label in `#8DC28A`, `fontSize: 10`, `fontWeight: 800`, `letterSpacing: 2`
- Row 1 (below label): elapsed time, `fontSize: 32`, `fontWeight: 800`, `letterSpacing: -1`, tabular-nums, color `#FFFFFF`, format `MM:SS`
- Row 1 (right side): **HR pill** + **FINISH button**, gap 8
  - HR pill: padding `8px 12px`, border-radius 12, background `linear-gradient(135deg, {zoneColor}22, {zoneColor}0a)`, border `1px solid {zoneColor}44`
    - Heart icon (filled, 16px, color = zoneColor)
    - Two columns inline: BPM number (fontSize 18, fontWeight 800, tabular) and `Z{zone} · BPM` label (fontSize 8, fontWeight 800, letterSpacing 1.2)
  - FINISH button: padding `8px 12px`, radius 10, bg `rgba(217,83,79,0.12)`, border `1px solid rgba(217,83,79,0.25)`, color `#D9534F`, fontSize 12, fontWeight 800
- Row 2: three stat columns separated by 1px vertical dividers (`#rgba(255,255,255,0.08)`, gap 16)
  - VOLUME (lb, formatted with commas)
  - SETS (integer)
  - PRS (trophy icon + count, gold `#FFB800` when > 0)
  - Each: label fontSize 10, fontWeight 700, letterSpacing 1.4, color `#8E9298`; value fontSize 15, fontWeight 700, tabular

**HR zones** (drives pill color):
- Z1 `< 114 bpm` → `#5B9BF0` (blue)
- Z2 `114–132` → `#8DC28A` (mint)
- Z3 `133–151` → `#FACC15` (yellow)
- Z4 `152–170` → `#E8845C` (orange)
- Z5 `≥ 171` → `#E0697E` (red)

**HR data source:** subscribe to the existing BLE service (`src/services/ble*`). When disconnected, show `--` instead of a number and desaturate the pill to `#6A6E74`. The HTML mock simulates drift with a small interval — in production the value comes from the BLE characteristic notification.

### 2. Rest Bar (`RestBar`)

Only rendered when `restSeconds > 0`.

- Full-width, `padding: 10px 16px`, `background: linear-gradient(180deg, rgba(250,204,21,0.14), rgba(250,204,21,0.06))`, bottom border `1px solid rgba(250,204,21,0.25)`
- Left: 32×32 circle, `rgba(250,204,21,0.2)` bg, timer icon in `#FACC15`
- Middle: `REST` label (fontSize 11, fontWeight 800, color `#FACC15`) + big `MM:SS` count (fontSize 20, fontWeight 800, tabular)
- Right: `+15s` pill button (neutral) and `SKIP` pill button (yellow bg, dark text)
- Bottom: 3px progress bar, `rgba(255,255,255,0.08)` track, `#FACC15` fill, width = `seconds / total * 100%`, transition `width 1s linear`

### 3. Warm-up Section (`WarmupSection`)

Always rendered as the first item in the scroll content. Distinct from exercise cards:

- **Incomplete state:** `background: linear-gradient(180deg, rgba(240,184,48,0.08), rgba(240,184,48,0.02))`, border `1px solid rgba(240,184,48,0.25)`, radius 18
- **Complete state:** background `rgba(141,194,138,0.04)`, border `rgba(141,194,138,0.25)`
- **Header row** (padding `14px 16px`, pressable to collapse/expand):
  - 38×38 rounded-square icon container. Incomplete: `rgba(240,184,48,0.15)` bg + flame icon in `#F0B830`. Complete: `rgba(141,194,138,0.15)` bg + check icon in `#8DC28A`.
  - Text column:
    - Eyebrow: `WARM-UP` (amber) or `WARM-UP COMPLETE` (mint), fontSize 10, fontWeight 800, letterSpacing 1.8, uppercase
    - Title: `Prime the body first` or `Ready to lift`, fontSize 16, fontWeight 700, color `#FFFFFF`
    - Progress row: 4px progress bar (amber or mint fill) + `{done}/{total}` counter right-aligned
  - Chevron, rotates on open/close
- **Expanded list** (padding `0 12px 12px`, gap 4):
  - Each drill: pressable row, padding `10px 12px`, radius 10
    - Done: `background: rgba(141,194,138,0.06)`
    - Pending: `background: rgba(255,255,255,0.02)`
    - 22×22 checkbox circle (`#8DC28A` filled + check when done; transparent with 1.5px `rgba(255,255,255,0.14)` border when pending)
    - Drill name (fontSize 14, fontWeight 600, strike-through + gray when done)
    - Detail text right-aligned, fontSize 11, color `#6A6E74`, tabular
  - **"Skip to workout" button** (only when not complete): full-width, transparent, `1px dashed rgba(240,184,48,0.4)`, amber text, fontSize 12, fontWeight 800

**Default warm-up drills** (can come from workout template in the DB):
1. Foam roll quads + glutes — `60s each side`
2. Hip 90/90 + ankle rocks — `8 reps / side`
3. Goblet squat — `2 × 8 @ 25 lb`
4. Banded glute bridge — `2 × 12`

### 3a. Superset Group (`SupersetGroup`)

Wraps 2+ exercises that should be rotated through (A1 → A2 → A1 → A2...). Rendered inline with its first member's category.

- Container: `background: linear-gradient(180deg, rgba(181,122,224,0.05), rgba(181,122,224,0.01))`, border `1px solid rgba(181,122,224,0.28)`, radius 20, padding 10, marginBottom 10.
- **Header row** (padding `4px 8px 10px`):
  - 26×26 rounded-square badge showing the group letter (`A`, `B`, …): bg `rgba(181,122,224,0.18)`, color `#B57AE0`, fontSize 13, fontWeight 800
  - Text column:
    - Eyebrow: `SUPERSET · {n} EXERCISES`, fontSize 10, fontWeight 800, color `#B57AE0`, letterSpacing 1.8
    - Flow line: last-word of each member name separated by a purple `→`. Current member rendered in white+700 weight, others gray+600.
  - Right: `{completedRounds}/{totalRounds} rounds` counter (fontSize 11, fontWeight 800, tabular). `completedRounds` = min sets-logged across members; `totalRounds` = max target sets.
- **Nested exercise cards**: rendered with a `supersetBadge` prop that adds:
  - An `A1` / `A2` / `B1`… pill above the exercise name (purple, filled when `isCurrent`)
  - A `← NOW` label in purple next to the pill on the current exercise
  - The 3px accent bar uses the superset purple instead of the category color
  - An extra 3px glowing purple rail (`box-shadow: 0 0 12px #B57AE080`) on the outer-left of the currently-active card
- **Advance behavior**: after `onLog` fires for a member, the group's `current` pointer rotates to the next member (`(idx + 1) % members.length`) and that next card auto-expands. The user can manually tap a different member to override.
- **Rest timer**: use the shorter of the two exercises' `restSec` (or a dedicated `supersetRestSec` from the template) — supersets typically rest between rounds, not between exercises.

**Data shape** — add to workout template:
```ts
type Superset = {
  id: string;
  label: string;      // "A", "B", …
  members: number[];  // ordered exercise IDs
  restSec?: number;   // between-round rest, overrides individual
};
```

### 4. Category Group Header

- Gap 20 above next group
- Row: 6×6 color dot (from category color map) + category name (fontSize 11, fontWeight 800, letterSpacing 1.8, uppercase, color `#8E9298`) + 1px divider line filling remaining width + `{done}/{total}` counter (fontSize 11, color `#6A6E74`, tabular)

**Category colors** (already used in current app; verify against `src/theme/colors.ts`):
```
chest:        #E8845C
back:         #5B9BF0
legs:         #B57AE0
shoulders:    #4ECDC4
arms:         #8DC28A
core:         #F0B830
conditioning: #E0697E
```

### 5. Exercise Card (`ExerciseCardV1`)

Two states: **collapsed** (summary only) and **expanded** (full logging UI). Only one card expanded at a time.

- Container: `background: #1E2024` (collapsed) or `#24272C` (expanded), radius 18, border `1px solid rgba(255,255,255,0.08)` (collapsed) or `rgba(141,194,138,0.28)` (expanded), marginBottom 10, `transition: all .2s`
- Expanded also gets box-shadow: `0 0 0 1px rgba(141,194,138,0.18), 0 8px 24px rgba(0,0,0,0.3)`

**Header row** (pressable, padding `14px 16px`):
- 3px-wide vertical accent bar in category color, stretches full card-header height, radius 2
- Text column:
  - Exercise name: fontSize 16, fontWeight 700, color `#FFFFFF`, letterSpacing -0.2. Strike-through + gray when `done === true`.
  - Metadata row (gap 10, small gray bullets as separators):
    - `{completed}/{target.sets} SETS` (uppercase, letterSpacing 1.2, fontSize 12)
    - `{target.reps} × {target.weight} lb` (or `{target.reps}s target` for timed)
    - `PR` with trophy icon in `#FFB800` (only if `state.prCount > 0`)
- Right: 32×32 "mark complete" circle button. `#8DC28A` bg + white check when done; transparent with `rgba(255,255,255,0.14)` border otherwise.

**Collapsed body:** if any sets logged, render chip row (padding `0 16px 14px`, flex-wrap, gap 6):
- Each chip: padding `4px 9px`, radius 999, fontSize 12, fontWeight 600, tabular
  - Regular set: bg `rgba(141,194,138,0.10)`, color `#8DC28A`, text `{w}×{r}`
  - PR: bg `rgba(255,184,0,0.12)`, color `#FFB800`, text `{w}×{r} ★`

**Expanded body** (padding `0 16px 16px`):

a. **Logged sets list** — each row:
  - grid `28px 1fr 1fr 40px`, gap 12, padding `10px 14px`, min-height 44, radius 10
  - Row bg: regular `transparent`, active `rgba(141,194,138,0.06)`, PR `rgba(255,184,0,0.06)`
  - First cell: 24×24 status dot (PR: gold with check; done: mint with check; active: white with number; pending: transparent with 1.5px border)
  - Second cell: `{w} lb` (or `MM:SS` for timed), fontSize 17, fontWeight 600, tabular
  - Third cell: `{r} reps` (empty for timed), same typography
  - Fourth cell: trophy icon if PR, else empty

b. **History peek** — collapsible button:
  - Full-width, bg `transparent`, border `1px dashed rgba(255,255,255,0.08)`, radius 10, padding `8px 12px`
  - Left: history icon + `Last session · {ex.last.length} sets` (fontSize 13, fontWeight 600, color `#8E9298`)
  - Right: chevron (rotates on open)
  - When open: expands below into a list of last session's sets (bg `rgba(255,255,255,0.02)`, radius 10, padding `8px 12px`), each row: `Set N` left-aligned + `{w} lb × {r}` right-aligned, fontSize 13, `#8E9298`

c. **Next-set input card** (bg `#1E2024`, border `rgba(255,255,255,0.08)`, radius 14, padding 12):
  - Top row: 24×24 set-number badge (`rgba(141,194,138,0.15)` bg, `#8DC28A` text) + `NEXT SET` eyebrow
  - Below: two stacked `StepperInput` rows (gap 8):
    - Each row: bg `#151718`, border `rgba(255,255,255,0.08)`, radius 12, padding `6px 6px 6px 12px`, horizontal flex (gap 8)
      - Label (min-width 54): `WEIGHT` or `REPS`, fontSize 11, fontWeight 800, letterSpacing 1.4, color `#8E9298`
      - Value button (flex 1, tappable → opens number pad): fontSize 24, fontWeight 700, tabular, white; unit suffix in gray
      - `−` button: 38×38, radius 10, bg `#1E2024`, border `rgba(255,255,255,0.08)`
      - `+` button: 38×38, radius 10, bg `rgba(141,194,138,0.15)`, border `rgba(141,194,138,0.3)`, text `#8DC28A`
  - Steppers: weight step = 5 (lb); reps step = 1
  - For `measurementType === 'timed'`: single centered duration display in `#FACC15`, fontSize 28, no steppers (keep the timer flow from existing `GhostReference`)

d. **LOG SET button** — full-width, marginTop 10, bg `#8DC28A`, color `#1A1A1A`, radius 14, padding 14, fontSize 15, fontWeight 700, letterSpacing 0.3; check icon + `LOG SET {n}` label. On press: append set to state, trigger rest timer for `ex.restSec`.

### 6. Number Pad (`NumberPad`)

Modal overlay, replaces the existing device keyboard for number entry.

- Backdrop: `rgba(0,0,0,0.55)`, tap to dismiss
- Sheet: anchored bottom, bg `#1E2024`, radius `22px 22px 0 0`, padding `10px 16px 16px`, slides up with `cubic-bezier(.2,.9,.3,1.1)` 220ms
- Drag handle: 40×4 rounded bar, `rgba(255,255,255,0.14)`
- Header: label eyebrow (e.g. `BENCH PRESS`) + `Enter weight` / `Enter reps` title; right side `CLEAR` button
- Display: large `{buf}` (fontSize 48, fontWeight 800, tabular) with blinking `#8DC28A` caret; unit text below (`pounds` / `reps`)
- 3×4 grid of buttons (gap 8), 56px tall, radius 14: `7 8 9 / 4 5 6 / 1 2 3 / . 0 ⌫`
- Bottom row: `CANCEL` (flex 1, transparent) + `CONFIRM` (flex 2, mint bg, dark text)
- Commit parses `parseFloat(buf) || 0` and calls back into the parent

### 7. SVG Icons

All custom-drawn in `icons.jsx`. Reimplement with `react-native-svg` keeping paths/strokes identical. Icons used: `Plus`, `Minus`, `Check`, `History`, `More`, `Chevron` (rotatable), `Swap`, `Flame`, `Trophy`, `Close`, `Timer`, `Heart`, `Backspace`.

---

## Interactions & Behavior

- **Superset rotation**: logging a set on an exercise that's part of a superset automatically advances the group's `current` pointer to the next member and expands that card. User can tap any member to override.
- **Tap exercise card header** → toggles expanded state (only one expanded at a time; tapping another collapses the current).
- **Tap complete-circle on card header** → marks exercise done without expanding.
- **Tap − / +** on stepper → adjusts value by step (weight 5, reps 1), clamped at `min` (0).
- **Tap value number** in stepper → opens `NumberPad` focused on that field. `onCommit` writes back into the exercise's `nextW` / `nextR`.
- **Tap LOG SET** → appends `{w, r, isPR?}` to `state.sets`, triggers rest timer (`ex.restSec`), increments global volume + set count, increments PR count if `isPR`.
- **Rest timer:** decrements once per second. `SKIP` → `0`. `+15s` → adds 15 to both current and total. Disappears at 0.
- **Warm-up:** independent checkbox state per drill. Section changes color scheme amber → mint when all drills checked. `SKIP TO WORKOUT` button auto-checks all.
- **History peek** inside a card is its own local toggle.

### Animations / transitions

- Expand/collapse exercise card: `transition: all .2s`
- Rest bar entrance: `slideDown` 200ms
- Number pad / bottom-sheet entrance: `slideUp` 220ms with `cubic-bezier(.2,.9,.3,1.1)`
- Backdrop fade-in: 180ms
- Progress bar width: `width 1s linear`
- LIVE dot pulse: 1.4s infinite (opacity 1 → 0.4 → 1)
- Caret blink: 1s infinite

---

## State Management

Per-exercise state (already present in current app; keep the shape):
```ts
type ExState = {
  sets: { w: number; r: number; isPR?: boolean }[];
  nextW: number;  // seeded from ex.target.weight
  nextR: number;  // seeded from ex.target.reps
  done: boolean;
  prCount: number;
};
```

Session-level state:
- `elapsed: number` (seconds)
- `restSeconds: number`, `restTotal: number`
- `volume`, `setCount`, `prCount` (aggregates derived or tracked)
- `hr: number`, `hrZone: 1..5`, `hrConnected: boolean` — from existing BLE hook
- `expandedId: number | null` — which exercise is open
- `pad: { field, value, label, onCommit } | null` — number-pad controller
- `warmup: { id, done }[]`, `warmupOpen: boolean`
- `ssCurrent: Record<supersetId, exerciseId>` — which member of each superset is currently active (rotates on log)

Data fetching: workout + exercises + last-session sets should already come from the existing store; no new endpoints. The warm-up list should be part of the workout template (add a `warmup: WarmupDrill[]` field if it doesn't exist).

---

## Design Tokens

Pulled from `src/theme/colors.ts` / `spacing.ts` / `typography.ts`. Use codebase tokens; values below are the resolved hexes.

**Colors**
```
bg              #151718
surface         #1E2024
surfaceHi       #24272C
border          rgba(255,255,255,0.08)
borderStrong    rgba(255,255,255,0.14)
primary         #FFFFFF
secondary       #8E9298
secondaryDim    #6A6E74
accent          #8DC28A
accentDim       #1A3326
accentGlow      rgba(141,194,138,0.15)
onAccent        #1A1A1A
danger          #D9534F
timer           #FACC15   (rest timer + timed exercises)
prGold          #FFB800
warmupAmber     #F0B830
```

**Spacing** (from `src/theme/spacing.ts`)
```
xs 4 / sm 8 / md 12 / base 16 / lg 20 / xl 24 / xxl 32 / xxxl 48
```

**Typography** (from `src/theme/typography.ts`)
```
xs 11 / sm 13 / base 15 / md 17 / lg 20 / xl 24 / xxl 30 / display 40
weights: 400, 500, 600, 700, 800
```
Use `fontVariantNumeric: 'tabular-nums'` (RN equivalent: `fontVariant: ['tabular-nums']`) on every number that changes value.

**Border radius**: 10 (small controls), 12 (steppers), 14 (cards, buttons), 18 (exercise + warm-up containers), 999 (pills).

**Shadow (expanded card)**: `0 0 0 1px rgba(141,194,138,0.18), 0 8px 24px rgba(0,0,0,0.3)` — in RN, split into a real shadow + a thin border overlay.

---

## Assets

No image or font assets. All icons are inline SVG. Fonts: `Inter` (already in app, or fall back to `System`).

---

## Files in this bundle

- `reference.html` — open in a browser to see the full interactive prototype (V1 only)
- `v1-stacked-cards.jsx` — main layout: `V1StackedCards`, `ExerciseCardV1`, `StepperInput`, `SetRow`, `WarmupSection`, `SupersetGroup`, plus the `SUPERSETS` sample data at the top
- `shell.jsx` — shared chrome: `WorkoutHeader`, `RestBar`, `NumberPad`
- `icons.jsx` — all SVG icons
- `data.jsx` — mock exercise data + `GYM` color tokens + `fmtDuration` / `fmtElapsed` helpers
- `android-frame.jsx` — device frame used only by the prototype; ignore for production

## Codebase files to edit

- `src/screens/WorkoutScreen.tsx` — replace layout with the new structure above
- `src/components/SetLoggingPanel.tsx` — reshape into the stacked stepper + LOG SET button described above
- `src/components/SetListItem.tsx` — adapt to the new 4-column grid row
- `src/components/RestTimerBanner.tsx` — update to match new `RestBar` styling
- `src/components/GhostReference.tsx` — repurpose as the "Last session" peek inside the expanded card
- **New:** `src/components/WorkoutHeader.tsx`, `src/components/WarmupSection.tsx`, `src/components/NumberPad.tsx`, `src/components/HrPill.tsx`, `src/components/SupersetGroup.tsx`, `src/components/icons/*.tsx`
- **Schema:** extend workout template type with `supersets: Superset[]` and `warmup: WarmupDrill[]` fields
