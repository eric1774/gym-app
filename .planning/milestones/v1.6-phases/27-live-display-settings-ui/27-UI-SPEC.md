---
phase: 27
phase_name: Live Display & Settings UI
status: draft
created: 2026-03-28
tool: none
registry: none
---

# UI-SPEC: Phase 27 — Live Display & Settings UI

## Design System

**Tool:** None (custom React Native theme system)
**Approach:** Dark-mint-card-ui — project-established token set in `src/theme/`
**shadcn:** Not applicable (React Native, not web)

| Token File | Status |
|------------|--------|
| `src/theme/colors.ts` | Existing — pre-populated below |
| `src/theme/spacing.ts` | Existing — pre-populated below |
| `src/theme/typography.ts` | Existing — pre-populated below |

---

## Spacing Scale

**Scale:** 8-point system (with 4px as the base micro unit)

| Token | Value | Use |
|-------|-------|-----|
| `spacing.xs` | 4px | Dot-to-label gap in HRConnectionIndicator, icon margins |
| `spacing.sm` | 8px | Tight internal component gaps, divider marginVertical |
| `spacing.base` | 16px | Card padding, horizontal screen padding, section margins, header vertical padding |
| `spacing.xl` | 24px | BPM section vertical padding, large separators |
| `spacing.xxl` | 32px | Between major Settings sections |
| `spacing.xxxl` | 48px | Not used this phase |

**Touch targets:** All tappable elements use minimum 44×44px hit area (enforced via `hitSlop` or explicit `minHeight`). Applies to: age input tap zone, max HR override toggle, "Scan for Devices" button, "Unpair Device" destructive tap.

**BPM section vertical rhythm:**
- Top border/divider: 1px `colors.border` above section
- Vertical padding inside section: `spacing.xl` (24px) top and bottom
- Gap between BPM number and zone label: `spacing.xs` (4px)

---

## Typography

**Source:** `src/theme/typography.ts` — pre-populated, no changes for this phase.

### Font Sizes in Use This Phase

| Token | Value | Use |
|-------|-------|-----|
| `fontSize.sm` | 13px | Zone label ("Zone 3 — Aerobic"), Settings description text, device name secondary line |
| `fontSize.base` | 15px | Button labels ("Scan for Devices", "Save", "Unpair Device"), input field text |
| `fontSize.md` | 17px | Settings card titles ("Heart Rate Monitor", age field label), max HR computed value |
| `fontSize.xl` | 24px | BPM number — live workout display hero element |

**Weights in use (2 weights maximum):**
- `weightBold` (700) — BPM number, Settings card titles, section headers, button labels, age input value
- `weightRegular` (400) — Zone label, description text, secondary device info

**Line heights (React Native defaults apply):**
- BPM number: no explicit line height needed — single line, oversized element
- Zone label: default (effectively ~1.4 for 13px)
- Card body text: default (~1.5 for 15px base)

---

## Color Contract

**60% dominant** — `colors.background` (#151718, deep charcoal): screen backgrounds, SafeAreaView fill
**30% secondary** — `colors.surface` (#1E2024): Settings cards, BPM section background, DeviceScanSheet
**10% accent** — `colors.accent` (#8DC28A, mint green): CTAs, "Scan for Devices" button, age save button, active input border

### Accent Reserved For
- Primary action buttons: "Scan for Devices", "Save" (age/max HR), "Set Age" in scan gate
- Active input border highlight when age TextInput is focused
- ActivityIndicator when scanning/saving

### HR Zone Colors (from `HR_ZONES` in `src/types/index.ts`)

| Zone | Name | Color | Hex | BPM Text Color |
|------|------|-------|-----|----------------|
| Below Zone 1 | (warm-up / no zone) | Muted | `colors.secondary` (#8E9298) | Gray — no zone label shown |
| Zone 1 | Recovery | Light green | `#90EE90` | Zone 1 color |
| Zone 2 | Easy | Sky blue | `#00BFFF` | Zone 2 color |
| Zone 3 | Aerobic | Gold | `#FFD700` | Zone 3 color |
| Zone 4 | Threshold | Deep orange | `#FF8C00` | Zone 4 color |
| Zone 5 | Max | Red-orange | `#FF4500` | Zone 5 color |

Zone colors apply ONLY to the BPM number text. Zone label text always uses `colors.secondary` (#8E9298). This is locked per D-05 and D-06.

### Semantic Colors

| Color | Hex | Use |
|-------|-----|-----|
| `colors.danger` | #D9534F | "Unpair Device" destructive button, disconnect dot in HRConnectionIndicator |
| `colors.timerActive` | #FACC15 | Reconnecting dot in HRConnectionIndicator (existing, unchanged) |
| `colors.secondary` | #8E9298 | Zone label text, description text, below-zone BPM number |
| `colors.border` | rgba(255,255,255,0.05) | Divider between header stats row and BPM section |

---

## Component Inventory

### New Components This Phase

#### `HRLiveBpmDisplay` (new)

A self-contained section rendered inside WorkoutScreen between the header stats row and the exercise list.

**Visibility:** Only rendered when `hasPairedDevice === true` (per D-15).

**States:**

| State | BPM Number | Zone Label | Color |
|-------|-----------|-----------|-------|
| Connected, BPM received, below Zone 1 | e.g. "58" | Hidden | `colors.secondary` |
| Connected, Zone 1-5 | e.g. "142" | "Zone 3 — Aerobic" | Zone color (e.g. `#FFD700`) |
| Disconnected / reconnecting | "- -" | Hidden | `colors.secondary` |

**Layout:**
```
[1px divider: colors.border]
[paddingVertical: spacing.xl]
  [BPM number — fontSize.xl, weightBold, zone-color or secondary]
  [spacing.xs gap]
  [Zone label — "Zone N — Name" — fontSize.sm, weightRegular, colors.secondary]
  [spacing.sm gap]
  [HRConnectionIndicator — existing component, unchanged]
[paddingVertical: spacing.xl]
```

**Animation:** BPM number has a brief scale pulse (1.0 → 1.06 → 1.0 over 200ms) on each new BPM reading using React Native `Animated.sequence`. Implementation choice: `Animated.spring` with low tension (per Claude's discretion — see D-03). Pulse only fires when BPM value actually changes (not on re-renders).

**Transition behavior:** Zone color change is an instant snap — no fade or interpolation (per D-07).

**Disconnected state:** When `deviceState !== 'connected'`, BPM shows "- -" in `colors.secondary` and zone label is hidden entirely (not replaced with any text). Clean absence. (Per D-04.)

---

#### Settings Screen — "Heart Rate Monitor" Section Card (new, inline in SettingsScreen)

**Card structure:** `backgroundColor: colors.surface`, `borderRadius: 12`, `padding: spacing.base`, `marginBottom: spacing.base` — matches existing card pattern from SettingsScreen.

**Card title:** "Heart Rate Monitor" — `fontSize.md`, `weightBold`, `colors.primary`, `marginBottom: spacing.xs`

**Section layout (top to bottom within card):**

1. **Age Row**
   - Label: "Age" — `fontSize.base`, `weightBold`, `colors.primary`
   - Inline TextInput: numeric keyboard (`keyboardType="number-pad"`), right-aligned value display, `fontSize.md`, `weightBold`, `colors.primary`
   - Placeholder: "Enter age" in `colors.secondary`
   - On blur: calls `HRSettingsService.setAge(value)` and recomputes max HR display
   - Width: sufficient to show 3-digit numbers (min 64px)

2. **Max HR Row** (shown below Age row)
   - Label: "Max HR" — `fontSize.base`, `weightRegular`, `colors.secondary`
   - Computed value display: e.g. "181 bpm (Tanaka)" — `fontSize.md`, `weightBold`, `colors.primary`
   - Override toggle: Switch component to the right of computed value
   - When override enabled: shows a second TextInput for custom value (same styling as age input)
   - Override input placeholder: "e.g. 175"

3. **Divider** — `height: 1`, `backgroundColor: colors.border`, `marginVertical: spacing.sm`

4. **Paired Device Row** (state-conditional)

   State A — No device paired:
   - Label: "No device paired" — `fontSize.sm`, `colors.secondary`
   - "Scan for Devices" button — full-width, `backgroundColor: colors.accent`, `borderRadius: 10`, `paddingVertical: spacing.base`, `minHeight: 44`, label in `colors.background` at `fontSize.base`, `weightBold`

   State B — Device paired:
   - Device name/ID truncated to 1 line — `fontSize.sm`, `colors.secondary`
   - "Scan for Devices" button (replaces/re-pairs) — same styling as State A
   - "Unpair Device" text button — `fontSize.sm`, `colors.danger`, no background, `paddingVertical: spacing.sm`, `minHeight: 44`, `marginTop: spacing.xs`

---

### Modified Components This Phase

#### `WorkoutScreen.tsx` — Header Section

The existing compact header (timer, volume, HRConnectionIndicator, "--" placeholder) is replaced with a structured layout:

**Before (Phase 25/26 placeholder):**
- Single header row containing: timer, volume, HRConnectionIndicator, "--" text placeholder, "End Workout" button

**After (Phase 27):**
- Header row unchanged: timer text, volume text, "End Workout" button
- Below header row: `HRLiveBpmDisplay` component (new, conditional on `hasPairedDevice`)

The `HRConnectionIndicator` moves inside `HRLiveBpmDisplay` — it no longer sits directly in the header row when a device is paired. The "- -" placeholder text is removed and replaced by the `HRLiveBpmDisplay` disconnected state.

The "Pair HR monitor" heart icon button (shown when `!hasPairedDevice`) remains unchanged in the header row — it triggers `DeviceScanSheet`.

**Accessibility:** The heart icon pair button (`!hasPairedDevice` state) is icon-only and must declare `accessibilityLabel="Pair heart rate monitor"`.

#### `SettingsScreen.tsx` — Section Order

Current order:
1. Export Data card
2. Repair Data card
3. About card

New order (per D-12):
1. **Heart Rate Monitor card** (new)
2. Export Data card (unchanged)
3. Repair Data card (unchanged)
4. About card (unchanged)

---

## Screen-Level Layout Specifications

### WorkoutScreen — BPM Section

```
WorkoutScreen
├── SafeAreaView (flex: 1, backgroundColor: colors.background)
│   ├── Header row (existing — unchanged)
│   │   ├── Timer text
│   │   ├── Volume text
│   │   ├── [heart icon pair button — when !hasPairedDevice]
│   │   │   accessibilityLabel="Pair heart rate monitor"
│   │   └── End Workout button
│   │
│   ├── HRLiveBpmDisplay (conditional — hasPairedDevice only)
│   │   ├── 1px top divider (colors.border)
│   │   ├── Center-aligned container (paddingVertical: spacing.xl)
│   │   │   ├── BPM text (fontSize.xl, weightBold, zone color OR secondary)
│   │   │   ├── [spacing.xs]
│   │   │   ├── Zone label (fontSize.sm, colors.secondary) — hidden when no zone
│   │   │   ├── [spacing.sm]
│   │   │   └── HRConnectionIndicator (existing component)
│   │   └── 1px bottom divider (colors.border) — optional visual separator
│   │
│   ├── [Session title banner — existing, unchanged]
│   ├── [Rest timer banner — existing, unchanged]
│   └── [Exercise list — existing, unchanged]
```

### SettingsScreen — Heart Rate Monitor Card

```
SettingsScreen
├── SafeAreaView
│   ├── Header row (back button + "Settings" title — existing, unchanged)
│   └── ScrollView content
│       ├── Heart Rate Monitor card (new)
│       │   ├── Card title: "Heart Rate Monitor"
│       │   ├── Age row: label + inline numeric TextInput
│       │   ├── Max HR row: label + computed display + override switch
│       │   ├── [Override TextInput — conditional on switch state]
│       │   ├── 1px divider (marginVertical: spacing.sm)
│       │   ├── Paired device section (state-conditional)
│       │   │   ├── State A: "No device paired" + "Scan for Devices" button
│       │   │   └── State B: device name + "Scan for Devices" + "Unpair Device"
│       │   └── [DeviceScanSheet — existing, triggered from this card]
│       ├── Export Data card (existing, unchanged)
│       ├── Repair Data card (existing, unchanged)
│       └── About card (existing, unchanged)
```

---

## Interaction Contracts

### BPM Pulse Animation

- **Trigger:** Each new `currentBpm` value received from `useHeartRate()` that differs from the previous value
- **Implementation:** `Animated.sequence([scale to 1.06 over 100ms, scale back to 1.0 over 100ms])` on the BPM Text element
- **Duration:** 200ms total
- **No pulse on:** Initial mount, "- -" state, re-renders without BPM change
- **API choice:** `Animated.sequence` + `Animated.timing` (React Native built-in, no library) — per Claude's discretion (D-03)

### Zone Color Snap

- **Trigger:** `currentBpm` crosses a zone boundary
- **Transition:** Instant — no animation, no interpolation (per D-07)
- **Computed from:** `getComputedMaxHR()` result → zone boundary lookup against `HR_ZONES` percentages
- **Below Zone 1 (< 50% maxHR):** BPM color = `colors.secondary`, zone label hidden
- **Above Zone 5 (> 100% maxHR):** BPM color = `#FF4500` (Zone 5 color), zone label = "Zone 5 — Max" (per D-14)

### Age Input

- **Keyboard:** `keyboardType="number-pad"` — numeric only
- **Save trigger:** `onBlur` (when user dismisses keyboard or taps elsewhere)
- **Validation:** Must be a positive integer 1-120. If invalid, show no toast — silently ignore and restore previous valid value
- **Real-time max HR update:** After valid age blur, recompute and redisplay max HR row immediately — no confirmation required
- **No explicit "Save" button** for age — blur-to-save matches existing AsyncStorage pattern

### Max HR Override Toggle

- **Control:** React Native `Switch` component, `trackColor={{ true: colors.accent }}`
- **Toggle off behavior:** Reverts to Tanaka-computed value, calls `HRSettingsService.setMaxHrOverride(null)`
- **Toggle on behavior:** Shows TextInput, user enters custom value, saves on blur
- **Display when override active:** "181 bpm (custom)" in `colors.primary`
- **Display when Tanaka active:** "181 bpm (Tanaka)" in `colors.primary`

### Scan for Devices

- **Trigger:** "Scan for Devices" button in Settings Heart Rate Monitor card
- **Action:** Opens `DeviceScanSheet` (existing component, Phase 25) — no changes to sheet itself
- **Age gate:** If no age set, `DeviceScanSheet` shows inline age prompt (existing behavior from Phase 25)

### Unpair Device

- **Trigger:** "Unpair Device" text button
- **Confirmation:** `Alert.alert('Unpair Device', 'Remove your paired heart rate monitor? You can re-pair at any time.', [Cancel, Unpair])`
- **On confirm:** Calls `HRSettingsService.clearPairedDevice()`, updates local state to show "No device paired"
- **No toast needed** — the card immediately reflects the unpaired state

---

## Copywriting Contract

### BPM Display

| State | BPM Text | Zone Label |
|-------|----------|-----------|
| Connected, below Zone 1 | "58" (raw number, no unit) | — (hidden) |
| Connected, Zone 1 | "72" | "Zone 1 — Recovery" |
| Connected, Zone 2 | "105" | "Zone 2 — Easy" |
| Connected, Zone 3 | "142" | "Zone 3 — Aerobic" |
| Connected, Zone 4 | "165" | "Zone 4 — Threshold" |
| Connected, Zone 5 | "188" | "Zone 5 — Max" |
| Disconnected / reconnecting | "- -" | — (hidden) |

Zone label format: "Zone {N} — {Name}" with an em dash (—), not a hyphen. Example: "Zone 3 — Aerobic".

BPM number has no "bpm" unit suffix in the workout header — the number alone at `fontSize.xl` is self-explanatory at a glance.

### Settings — Heart Rate Monitor Card

| Element | Copy |
|---------|------|
| Card title | "Heart Rate Monitor" |
| Age field label | "Age" |
| Age input placeholder | "Enter age" |
| Max HR field label | "Max HR" |
| Max HR computed (Tanaka) | "{value} bpm (Tanaka)" |
| Max HR computed (override) | "{value} bpm (custom)" |
| Override toggle label | "Custom max HR" |
| Override input placeholder | "e.g. 175" |
| No device paired label | "No device paired" |
| Primary scan CTA | "Scan for Devices" |
| Unpair action | "Unpair Device" |
| Unpair alert title | "Unpair Device" |
| Unpair alert body | "Remove your paired heart rate monitor? You can re-pair at any time." |
| Unpair alert confirm | "Unpair" |
| Unpair alert cancel | "Cancel" |

### Accessibility Labels

| Element | accessibilityLabel |
|---------|-------------------|
| Heart icon pair button (header, `!hasPairedDevice`) | "Pair heart rate monitor" |

### Empty States

| Context | Copy |
|---------|------|
| No device paired in Settings | "No device paired" (secondary text, not a headline — per D-11) |
| No age set — shown inside DeviceScanSheet age gate | Existing Phase 25 copy — no changes this phase |
| BPM when disconnected | "- -" (not "No signal", not "--" with touching chars) |

### Error States

| Error | Treatment |
|-------|-----------|
| Age input out of range (not 1-120) | Silent: restore previous value on blur. No toast, no alert. |
| Max HR override input invalid | Silent: restore previous value on blur. |
| Unpair fails (AsyncStorage error) | `Alert.alert('Error', 'Could not remove paired device. Please try again.')` |

No destructive actions require typing to confirm — `Alert.alert` with Cancel/Confirm is sufficient for Unpair (single device, easily re-paired).

---

## Visual Divider Specification

A single 1px horizontal rule separates the header stats row from the BPM section in WorkoutScreen:

```js
{
  height: 1,
  backgroundColor: colors.border,  // rgba(255,255,255,0.05)
  marginHorizontal: 0,              // full-width
}
```

This matches the existing subtle border token already used for card edges throughout the app.

The intra-card divider in the Settings Heart Rate Monitor card uses `marginVertical: spacing.sm` (8px).

---

## Registry

Not applicable. This project uses no component library or registry. All components are custom React Native using the project's own theme tokens.

---

## Design Decisions Log

| Decision | Source | Value |
|----------|--------|-------|
| BPM font size | CONTEXT.md D-01 | `fontSize.xl` (24px) — readable at arm's length |
| BPM section position | CONTEXT.md D-02 | Below header stats row, above exercise list |
| BPM pulse animation | CONTEXT.md D-03 | Scale 1.0 → 1.06 → 1.0, 200ms total, React Native Animated API |
| Disconnected display | CONTEXT.md D-04 | "- -" with no zone label — clean data absence |
| Zone color on BPM text only | CONTEXT.md D-05 | Zone colors apply to BPM number only; label stays secondary |
| Zone color values | CONTEXT.md D-06 | Exact `HR_ZONES` hex values, no adjustments |
| Zone transition | CONTEXT.md D-07 | Instant snap, no animation |
| Settings section grouping | CONTEXT.md D-08 | Single "Heart Rate Monitor" card with all HR controls |
| Age input interaction | CONTEXT.md D-09 | Inline tappable field, blur-to-save, real-time max HR update |
| Max HR toggle/override | CONTEXT.md D-10 | Switch + conditional TextInput |
| No-device empty state | CONTEXT.md D-11 | "No device paired" secondary text, not onboarding wizard |
| Section order | CONTEXT.md D-12 | HR Monitor first, Data section (Export/Repair) second |
| Below-zone behavior | CONTEXT.md D-13 | Gray BPM, no zone label |
| Above-zone-5 behavior | CONTEXT.md D-14 | Zone 5 color + "Zone 5 — Max" label, no special warning |
| HR UI visibility gating | CONTEXT.md D-15 | hasPairedDevice gate — unchanged from Phase 25 |
| Scan-from-Settings only | CONTEXT.md D-16 | DeviceScanSheet triggered from Settings card |
| Age gate at scan time | CONTEXT.md D-17 | Existing DeviceScanSheet age prompt — no changes |
| Tanaka formula | STATE.md decisions | 208 − 0.7×age — locked from Phase 24 |
| AsyncStorage prefix | STATE.md decisions | `hr_settings_` prefix — locked from Phase 24 |
| Color tokens | `src/theme/colors.ts` | All values pre-populated from existing token file |
| Spacing tokens | `src/theme/spacing.ts` | All values pre-populated from existing token file |
| Typography tokens | `src/theme/typography.ts` | All values pre-populated from existing token file |
| Font weight reduction | UI checker revision | `weightSemiBold` (600) removed — uses reassigned to `weightBold` (700) |
| Spacing normalisation | UI checker revision | `spacing.md` (12px) replaced with `spacing.sm` (8px); `spacing.lg` (20px) replaced with `spacing.base` (16px) |
| Icon-only accessibility | UI checker revision | Heart icon pair button declared `accessibilityLabel="Pair heart rate monitor"` |

---

## Pre-Population Sources

| Source | Decisions Used |
|--------|---------------|
| CONTEXT.md | 20 locked decisions (D-01 through D-20) |
| REQUIREMENTS.md | HR-01, HR-02, HR-03, SET-01, SET-02 success criteria |
| STATE.md accumulated decisions | Tanaka formula, AsyncStorage prefix, zone colors |
| `src/theme/colors.ts` | All color tokens |
| `src/theme/spacing.ts` | All spacing tokens |
| `src/theme/typography.ts` | All font sizes and weights |
| `src/types/index.ts` | HR_ZONES hex values and zone names |
| `src/screens/SettingsScreen.tsx` | Card structure pattern, button styling pattern |
| `src/components/HRConnectionIndicator.tsx` | Existing indicator integration point |
| User input this session | 0 — all fields answered by upstream artifacts |
| UI checker revision (2026-03-28) | 3 fixes applied — weights, spacing, accessibility |
