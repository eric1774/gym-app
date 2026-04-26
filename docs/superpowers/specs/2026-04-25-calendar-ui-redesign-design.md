# Calendar UI Redesign — Design Spec

**Date:** 2026-04-25
**Author:** Brainstorming session (Eric + Claude)
**Branch:** `feat/dashboard-v6-redesign`
**Status:** Ready for implementation planning

---

## Goal

Restyle `CalendarScreen` and `CalendarDayDetailScreen` so they feel like part of the v6 personality system that already lives in Dashboard, ProgressHub, ExerciseDetail, and SessionDayProgress — without changing any logic, navigation, or data flow. Pure visual polish: typography, spacing, color rationing, and one repeated atmospheric move (the mint radial gradient).

## Context

**Current state.** `CalendarScreen.tsx` is a pre-v6 month grid: bare `<` arrow, "April 2026" centered, weekday row, 7-wide cells where workout days are filled mint circles. No personality tokens used (`mintRadial`, `slateGlow`, `goldGlow`, `coralFill` are unused on this screen). `CalendarDayDetailScreen.tsx` is functional but visually anonymous — emoji 💧 in nutrition, dense text-only set lists, swipe-hint dash on every card duplicating the banner above.

**Design system.** `dark-mint-card-ui` v6 — Mint = action zone, Coral = streaks/recovery, Gold = achievement, Slate = neutral data. Anti-AI-slop principles, gold rationing, atmospheric radials over decoration.

**Research source.** NotebookLM notebook *"Mastering Modern UI: Glassmorphism and Bento Grid Design"* — auth was expired this session, but the same notebook's distilled findings already shipped in [`2026-04-25-progress-screen-redesign-design.md`](./2026-04-25-progress-screen-redesign-design.md): blur ≤ 30px on mobile, corner radii 8–18px, distinctive density earns bento, gold for achievement only.

**Brainstorm artifacts (visually approved).** Mockups served via the superpowers brainstorming companion at `192.168.1.180:57433`, persisted under `.superpowers/brainstorm/501171-1777168731/content/`:

| File | What it locks |
|---|---|
| `personality-intensity.html` | A vs B intensity comparison — locked **B** as direction |
| `chip-options.html` | B chip variants — locked **B1 (true B-lite)**: no chip, no footer |
| `rest-day-style.html` | Bare vs hairline — locked **A (bare numbers)** for rest days |
| `day-detail-blite.html` | Day detail at B-lite intensity — locked as design |

## Scope

**In scope.**
1. Restyle `src/screens/CalendarScreen.tsx`.
2. Restyle `src/screens/CalendarDayDetailScreen.tsx`.
3. Two new components:
   - `src/components/MintRadial.tsx` — atmospheric corner gradient used by both screens.
   - `src/components/WaterDropIcon.tsx` — SVG drop replacing 💧 emoji in nutrition card.
4. Drop the per-card swipe-hint dash on session cards (banner is sufficient).
5. Shorten day-detail header date format.

**Out of scope (NO changes).**
- Database queries (no new fetches; `getWorkoutDaysForMonth`, `getDaySessionDetails`, `getWaterTotalByDate`, `getMacroTotalsByDate` unchanged).
- Navigation (`CalendarStackParamList`, route params, `useFocusEffect` flow).
- Behavior (month-nav arrow disable rules, swipe-to-delete pan-responder, conditional section rendering).
- Calendar grid math (`getFirstSessionDate`, `firstDayOfMonth`, `daysInMonth`, padding rules).
- Any new theme tokens — every color this design needs already exists in `colors.ts`.
- Multi-session day indicators (locked Q5: invisible — tap into the day to see all sessions).
- Streak chip / month-summary footer (locked B-lite: dropped).
- Animation, haptics, sound.
- Snapshot tests (existing tests in `__tests__/CalendarScreen.test.tsx` and `__tests__/CalendarDayDetailScreen.test.tsx` continue to pass with restyle).

---

## Design language

**Intensity: B-lite.** Personality where it earns its keep. One repeated atmospheric move (the mint radial), one repeated celebration move (gold ringing PRs). Calm everywhere else.

### Three discipline rules

1. **Radial repetition at nested scales.** Mint radial in the calendar's top-left corner. Same mint radial in the day-detail's top-left corner. Gold radial inside the PR callout panel. Same gesture, three scales — atmosphere instead of decoration.

2. **Gold rationing.** Every gold pixel = personal record. PR cells in the calendar grid (gold ring + gold dot). PR badge chip in the session header. ★-prefixed PR set rows. Gold callout panel. Nothing else gets gold. The user learns "gold = rare" within seconds.

3. **Mint = completed action.** Filled mint dots on workout days. Today's cell glows mint when it has a workout. Mint radial in the corners. No mint anywhere else (not in nav, not in chrome). The user learns "mint = I trained".

### Token usage (all already in `src/theme/colors.ts`)

| Surface | Token(s) | Treatment |
|---|---|---|
| Calendar background | `colors.background` (`#151718`) | Unchanged |
| Mint radial atmosphere | `colors.mintRadial` (`rgba(141,194,138,0.35)`) | New — used in both screens' corners |
| Hero text "April" | `colors.primary` (`#FFFFFF`) | 800 weight |
| Hero year "2026" | `colors.secondary` (`#8E9298`) | 600 weight |
| Pill nav arrow | `colors.border` (`rgba(255,255,255,0.05)`) | 1px border |
| Workout cell | `colors.accent` (`#8DC28A`) bg, `colors.onAccent` (`#1A1A1A`) text | Unchanged |
| Today glow | `colors.accentGlow` (`rgba(141,194,138,0.15)`) | NEW use — outer halo |
| PR ring | `colors.prGold` (`#FFB800`) | 2px ring at ~65% alpha |
| Future day text | `colors.secondaryDim` (`#6A6E74`) | 55% opacity |
| Session card bg | `colors.surfaceElevated` (`#24272C`) | Unchanged |
| PR callout bg | `colors.prGoldDim` (`#3D2E00`) | NEW use — at 6% alpha overlay, plus internal gold radial |
| PR badge chip | `colors.goldGlow` (`rgba(255,184,0,0.08)`) bg + `colors.goldBorder` (`rgba(255,184,0,0.15)`) border | Already exist |

**No new tokens needed.** This is purely a redistribution of the v6 palette.

---

## CalendarScreen redesign

### Visual structure (top to bottom)

```
┌─────────────────────────────────────┐
│ ░░  ← mint radial (atmosphere)       │
│ ░ April                             │
│   2026                              │
│                                      │
│ ‹    APRIL · 2026                ›  │  ← pill arrows + uppercase month
│                                      │
│ S  M  T  W  T  F  S                 │  ← weekday row
│                                      │
│       1  2  3  4                    │  ← grid
│ 5  6  7  8  9 10 11                 │
│ ...                                  │
│ 19 20 21 22 23 24 25                │
│                  ↑gold  ↑today       │
│ 26 27 28 29 30                      │  ← future days dim
└─────────────────────────────────────┘
```

### Element-by-element

**Mint radial (atmospheric).** Absolute-positioned `<MintRadial>` component, top: -70, left: -50, width/height 280, `pointerEvents: 'none'`. Renders below all other content. Implementation: linear-gradient to radial via `react-native-svg` `<RadialGradient>` or `react-native-linear-gradient` if already a dep. (Codebase already uses `react-native-svg` per `CalendarDayDetailScreen.tsx:17` — favor that.)

**Hero block.** "April" — `fontSize: 28-30`, `fontWeight: '800'`, `letterSpacing: -0.6`, `color: colors.primary`, `lineHeight: 1`. Below it: "2026" — `fontSize: 13`, `fontWeight: '600'`, `color: colors.secondary`, `letterSpacing: 0.6`, `marginTop: 4`. Left-aligned. Replaces the current centered `monthTitle`.

**Pill nav row.** Replaces the current bare `<` `>` arrows. Two 32×32 round buttons with `borderWidth: 1`, `borderColor: colors.border`, centered chevron glyph (`‹` / `›`) at `fontSize: 13`, `fontWeight: '700'`, `color: colors.textSoft` (`#BDC3CB`). Disabled state: `opacity: 0.3`. Between them, an uppercase month label "APRIL · 2026" at `fontSize: 11–12`, `fontWeight: '700'`, `letterSpacing: 1.1`, `color: colors.textSoft`.

**Weekday row.** Same labels (`S M T W T F S`). Restyle to `fontSize: 10–11`, `fontWeight: '700'`, `letterSpacing: 0.5`, `color: colors.secondary`. (Currently `colors.secondary` already, just lighten the weight from `weightSemiBold` to `'700'`.)

**Day cells.** 7-column CSS-grid-style layout. Each cell square (`aspect-ratio: 1`). Inside each cell, a centered circle ("dot") max 36–38px square, `borderRadius: 50%`, `fontSize: 13`, `fontWeight: '600'`. Cell variants:

| State | Background | Text | Effect |
|---|---|---|---|
| Workout (past) | `colors.accent` | `colors.onAccent` | None |
| Workout + today | `colors.accent` | `colors.onAccent` | `shadowColor: colors.accent` outer glow ≈ 16px radius @ 45% alpha + 4px halo @ 18% alpha |
| Workout + PR | `colors.accent` | `colors.onAccent` | 2px gold ring @ 65% alpha + 6×6 gold dot at top-right with 8px gold shadow glow |
| Workout + today + PR | as above | combined | both effects (rare; would only happen if today has a PR) |
| Rest (past) | transparent | `colors.primary` | Nothing — bare number floating in cell (Q6 locked: A) |
| Future | transparent | `colors.secondaryDim` @ 55% opacity | Nothing |
| Multi-session day | rendered same as Workout | unchanged | invisible (Q5 locked: A) |
| Empty (leading/trailing) | unchanged | unchanged | unchanged |

**Touchability.** Only workout cells are tappable (current behavior preserved). `TouchableOpacity` with `activeOpacity: 0.7` on workout-day wrapper. `onPress` calls existing `handleDayPress(day)` — unchanged.

**Footer.** None. (B-lite locked.)

### Container

`SafeAreaView` with `colors.background`, no horizontal padding change beyond what's needed for the wider hero (currently `spacing.md` ×2 = 32). The grid math (`getCellSize()`) continues to use the same `HORIZONTAL_PADDING` constant.

---

## CalendarDayDetailScreen redesign

### Visual structure

```
┌─────────────────────────────────────┐
│ ░░  ← mint radial                    │
│ ░  ‹    Sat, April 25, 2026         │  ← short date format
│      Swipe left on a workout to delete   ← italic hint
│                                      │
│ ┌─────────────────────────────────┐ │
│ │ 💧 32 oz  ← drop SVG, blue text   │ │  ← nutrition card
│ │ ─────────────────────────────── │ │
│ │ 2,045  145g   220g    65g        │ │
│ │  CAL  PROTEIN CARBS    FAT       │ │
│ └─────────────────────────────────┘ │
│ ┌─────────────────────────────────┐ │  ← session card
│ │ Push Day A          [★ 1 PR]    │ │
│ │ 5:42 PM                          │ │
│ │ ─────────────────────────────── │ │
│ │ 52:14   16    12,420   4         │ │
│ │ DURAT.  SETS   LBS   EXER.       │ │
│ │ ─────────────────────────────── │ │
│ │ ░ ★ PERSONAL RECORD ░░          │ │  ← gold callout w/ internal radial
│ │   Bench Press      245 lbs × 5   │ │
│ │ ─────────────────────────────── │ │
│ │ Bench Press                      │ │
│ │   Set 1  135 × 5 (warm-up)       │ │
│ │   Set 2  185 × 5                 │ │
│ │   …                              │ │
│ │ ★ Set 5  245 × 5                 │ │  ← gold star prefix
│ └─────────────────────────────────┘ │
└─────────────────────────────────────┘
```

### Element-by-element

**Mint radial.** Same `<MintRadial>` component as the calendar — top-left, atmospheric only.

**Header.** Replaces current `<` text arrow with a 32×32 pill (matches calendar nav pills). Date label centered, shortened format: **"Sat, April 25, 2026"** (Q7 locked) — formed by replacing `weekday: 'long'` with `weekday: 'short'` in the existing `formatDate()` helper. `fontSize: 13`, `fontWeight: '700'`, `color: colors.primary`. `numberOfLines: 1` + `adjustsFontSizeToFit` preserved. Right side gets a 32×32 spacer to keep date centered.

**Swipe hint banner.** Restyled: `fontSize: 10.5`, `color: colors.secondaryDim`, `fontStyle: 'italic'`, centered. Same copy ("Swipe left on a workout to delete"). Renders only when `sessions.length > 0` and not loading (current condition preserved).

**Per-card swipe-hint dash.** Removed (Q8 locked). Delete the `<View style={styles.swipeHint}>` block at line 246–248 of the current file. The pan-responder logic itself is unchanged; only the visual indicator goes away.

**Nutrition card** (`DayNutritionCard`). Conditional render preserved (only shows if any of water/protein/carbs/fat > 0). Restyle:
- Card uses `colors.surfaceElevated`, `borderRadius: 16`, `borderWidth: 1`, `borderColor: colors.border`, `padding: 14`.
- Water row: replace 💧 emoji with `<WaterDropIcon size={14} />` (new SVG component, mint-blue gradient using `colors.water`). Value: `fontSize: 16`, `fontWeight: '800'`, `color: colors.water`, `letterSpacing: -0.3`. Unit "oz": `fontSize: 12`, `fontWeight: '500'`, `color: colors.secondary`.
- Macro row: padding-top 10 with a 1px `colors.border` divider above. Four equal columns separated by 1×28 vertical dividers. Each column: value `fontSize: 14`, `fontWeight: '800'`, `color: colors.primary`, `letterSpacing: -0.3`. Label below: `fontSize: 9.5`, `fontWeight: '700'`, `color: colors.secondary`, `letterSpacing: 0.6`, **uppercase**.

**Session card** (`SwipeableSessionCard`). Same `Animated.View` + pan-responder mechanics. Restyle:
- Card: `colors.surfaceElevated`, `borderRadius: 16`, `borderColor: colors.border`, `padding: 14`. (Was 14.)
- Header layout: title block left, PR badge chip right (when `prCount > 0`).
  - Title (`programDayName ?? 'Workout'`): `fontSize: 16`, `fontWeight: '800'`, `letterSpacing: -0.2`, `color: colors.primary`.
  - Subtitle (start time): `fontSize: 11.5`, `fontWeight: '600'`, `color: colors.secondary`, `letterSpacing: 0.3`.
  - PR badge chip (NEW): `backgroundColor: colors.goldGlow`, `borderColor: colors.goldBorder`, `borderWidth: 1`, `borderRadius: 10`, `paddingV: 4`, `paddingH: 9`, `fontSize: 10`, `fontWeight: '800'`, `color: colors.prGold`, `letterSpacing: 0.5`. Content: `★ ${prCount} PR${prCount > 1 ? 's' : ''}`.
- Stats row(s): Same data, restyled. Each pill becomes a `flex: 1` column with min-width 60. Number: `fontSize: 15`, `fontWeight: '800'`, `letterSpacing: -0.3`. Label below: `fontSize: 9.5`, `fontWeight: '700'`, `color: colors.secondary`, `letterSpacing: 0.6`, **uppercase**. The PR-count `StatItem` is removed from the inline stats row (now lives in the header chip).
- HR row preserved. Same conditional, same restyle as primary stats row.

**PR highlights callout.** Replaces the current `prHighlightsSection`. Container: `backgroundColor: 'rgba(255,184,0,0.06)'` (inline — lower than the existing `colors.prGoldDim` token; reserve the token for stronger fills elsewhere), `borderColor: colors.goldBorder`, `borderWidth: 1`, `borderRadius: 12`, `padding: 10–12`, `marginBottom: 12`, `overflow: 'hidden'`. Internal gold radial via the same `<MintRadial tint={colors.prGold} corner='tr' size={100} top={-30} />` component, positioned top-right inside the panel. Title: `★ PERSONAL RECORD` uppercase, `fontSize: 10.5`, `fontWeight: '800'`, `color: colors.prGold`, `letterSpacing: 0.7`. Each PR row: exercise name left + detail right, `fontSize: 12.5`, `fontWeight: '700'`, `color: colors.prGold`. Detail line at 90% opacity / 600 weight to differentiate from the exercise name.

**Exercise breakdown.** Same data and order. Restyle:
- Exercise name: `fontSize: 13`, `fontWeight: '700'`, `letterSpacing: -0.1`, `color: colors.primary`, `marginTop: 8`, `marginBottom: 4`. (First name has `marginTop: 0`.)
- Set rows: flex row with `set-num` (40-min-width slate dim) + `set-vals` (slate light).
  - Default set: `fontSize: 12`, `fontWeight: '600'`, `color: colors.textSoft` for vals, `colors.secondaryDim` for num.
  - Warm-up set: same row, both halves dimmed to `colors.secondaryDim`, `fontStyle: 'italic'`. Suffix `(warm-up)` retained inline with weight value.
  - PR set: `fontSize: 12`, `fontWeight: '800'`, `color: colors.prGold`. Prefixed by `★` glyph (10px). Replaces the current `🏆` emoji prefix.
- Divider between exercises: 1px `colors.border`, `marginTop: 10`, `marginBottom: 8`. (Was `spacing.md` only on top.)

---

## New components

### `src/components/MintRadial.tsx`

Reusable atmospheric corner gradient. Renders a `pointerEvents: 'none'` view positioned absolutely at the parent's top-left, with a soft mint radial fading to transparent.

**Props.**
- `size?: number` — square dimension, default 280.
- `top?: number` — default -70.
- `left?: number` — default -50.
- `tint?: string` — base color, default `colors.accent`. Pass `colors.prGold` to reuse for the PR callout's internal radial.

**Implementation.** The codebase already has `src/components/GradientBackdrop.tsx`, which renders SVG linear + radial gradients via `react-native-svg`. `MintRadial` should be a thin wrapper that calls `GradientBackdrop` with a single radial overlay anchored top-left, base layer fully transparent. Stops:
- `0%` — `tint` at opacity 0.35
- `40%` — `tint` at opacity 0.10
- `70%` — `tint` at opacity 0

The `size`/`top`/`left` props translate to a `cx`/`cy`/`rx`/`ry` overlay anchored outside the parent's top-left corner. Wrap the `GradientBackdrop` in a `View` of `width: size, height: size, position: 'absolute', top, left, overflow: 'hidden'` so the backdrop's `StyleSheet.absoluteFill` sizes to the wrapper, not the screen.

**Reuse.** The PR callout in `CalendarDayDetailScreen` uses the same component with `tint={colors.prGold}`, `size={100}`, `top={-30}`, anchored top-right (mirror via `right` instead of `left` — add a `right?: number` prop, or expose a `corner?: 'tl' | 'tr'` enum).

### `src/components/WaterDropIcon.tsx`

Replaces the 💧 emoji in the nutrition card.

**Props.** `size?: number` (default 14), `color?: string` (default `colors.water`).

**Implementation.** `react-native-svg` `<Svg>` with a single teardrop `<Path>`. Suggested path: `M12 2 C7 8, 4 13, 4 16 a8 8 0 0 0 16 0 c0-3-3-8-8-14 z` filled with `color`, plus optional inset highlight at the top using a slightly lighter fill. Size scales via `viewBox="0 0 24 24"` so it can render at any caller size.

---

## What's NOT changing (logic preserved)

| Concern | Where | Confirmed unchanged |
|---|---|---|
| Workout-day fetch | `getWorkoutDaysForMonth(year, month)` | Same call, same result shape |
| First-session fetch | `getFirstSessionDate()` | Same call |
| Day-detail fetch | `getDaySessionDetails(date)` | Same call, same response shape |
| Nutrition fetches | `getWaterTotalByDate`, `getMacroTotalsByDate` | Same calls |
| Calendar grid math | first-day-of-month, days-in-month, padding to multiple of 7 | Same |
| Month-nav disable rules | `isCurrentMonth`, `isEarliestMonth` logic | Same |
| Tap-into-day | `handleDayPress` only on workout days | Same |
| Swipe-to-delete | `panResponder` thresholds, animation springs, alert flow, `deleteSession` | Same |
| Conditional sections | nutrition card hides when 0/0/0/0; HR row hides when null; PR section hides when prCount === 0 | Same |
| Time/duration/volume formatters | `formatDate`, `formatTime`, `formatDuration`, `formatVolume` | Same — only `formatDate` weekday changes from `'long'` → `'short'` |
| Existing tests | `__tests__/CalendarScreen.test.tsx`, `__tests__/CalendarDayDetailScreen.test.tsx` | Should continue to pass — restyle does not change rendered text, conditional logic, or test IDs |

---

## Risks & things to watch

1. **`react-native-svg` perf for radials.** `<RadialGradient>` is GPU-accelerated on both iOS and Android in current `react-native-svg` versions, but two on-screen radials per screen × redraws on month change could cost FPS on low-end Androids. Mitigation: render `<MintRadial>` once at the SafeAreaView level (above the month-nav re-renders), so it doesn't repaint when the user navigates months.

2. **Today's outer glow.** RN's `shadowColor` + `shadowOpacity` only renders shadows on iOS by default. Android needs `elevation` for depth, but `elevation` doesn't accept color. The today glow needs to be implemented as either (a) a transparent `View` sibling sized 4–8px larger with rounded corners + `backgroundColor: colors.accentGlow`, or (b) `<Svg>` with two stacked circles. Recommend (a) — simpler, doesn't fight the layout.

3. **PR ring + today glow interaction.** When today is also a PR day (rare), both effects must compose without one swallowing the other. Implementation order: PR ring (border) drawn first, today's halo rendered as an outer transparent layer behind. Verify visually on a device when this case arises.

4. **Color-only PR signal accessibility.** Users with red-yellow color blindness (deuteranomaly, the most common form) may struggle to distinguish gold-on-mint vs plain mint cells. Mitigation: PR cells already include a *shape* signal (the ring + corner dot), not only color. Acceptable for the redesign; flag as known limitation in a future a11y pass.

5. **Existing-test regression risk.** Verified: `__tests__/CalendarDayDetailScreen.test.tsx` only asserts on the `isPR: true/false` field shape, not on the rendered `🏆` glyph itself. Swapping the emoji for `★` should NOT break tests. Snapshot tests do not exist. Still, run the full test suite after the change.

6. **Test ID stability.** No existing tests reference the swipe-hint dash specifically (it's a presentational element). Removing it should not regress tests.

---

## Brainstorm artifacts (visual references for implementation)

The implementer should keep the browser companion running while building so visuals can be referenced live:

```
.superpowers/brainstorm/501171-1777168731/content/
├── personality-intensity.html       ← A vs B comparison; locked B
├── chip-options.html                ← B chip variants; locked B1 (no chip, no footer)
├── rest-day-style.html              ← bare vs hairline; locked bare
└── day-detail-blite.html            ← day-detail at B-lite; locked
```

Server: `scripts/start-server.sh --project-dir <repo>` from the superpowers brainstorming skill.
