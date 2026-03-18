# S02: MiniSparkline & CategorySummaryCard Components — Research

**Date:** 2026-03-17
**Depth:** Light — straightforward component work using established codebase patterns (react-native-svg already installed, card pattern well-established, data layer types ready from S01)

## Summary

This slice creates two new React Native components: `MiniSparkline` (an SVG polyline trend line) and `CategorySummaryCard` (a pressable card displaying category name, exercise count, sparkline, delta info, and stale dimming). Both consume the `CategorySummary` type from S01 and follow the project's established Dark Mint Card design system.

The work is straightforward: `react-native-svg` is already installed (v15.15.3) and used in `TabNavigator.tsx` and `WorkoutScreen.tsx` for icons. The `Polyline` element is exported from the package and is the ideal primitive for sparklines (accepts a `points` string of `"x1,y1 x2,y2 ..."` coordinates). The card pattern is well-established across the codebase (see `DashboardScreen.tsx` exercise cards, `nextWorkoutCard` styles). Testing infrastructure (`@testing-library/react-native`, jest mocks for `react-native-svg`) is ready. The only prep needed is adding `Polyline` to the existing SVG mock.

## Recommendation

Build `MiniSparkline` first as a pure presentational component, then `CategorySummaryCard` which composes it. Both are stateless — no DB calls, no navigation logic. Follow the Dark Mint Card design system skill for all styling decisions. Use `Svg` + `Polyline` from `react-native-svg` (not `Path` with manual path strings — Polyline is purpose-built for point series). Tests should use `@testing-library/react-native` with the existing mock setup.

## Implementation Landscape

### Key Files

- `src/types/index.ts` — Already has `CategorySummary` interface (category, exerciseCount, sparklinePoints, lastTrainedAt, measurementType). This is the prop source for `CategorySummaryCard`. No changes needed.
- `src/components/MiniSparkline.tsx` — **New file.** Pure SVG component: takes `data: number[]`, optional `width` (default ~80), `height` (default ~30), `color` (default `colors.accent`). Normalizes data to SVG coordinates, renders `<Svg><Polyline /></Svg>`.
- `src/components/CategorySummaryCard.tsx` — **New file.** Pressable card component: takes `summary: CategorySummary`, `isStale: boolean`, `onPress: () => void`. Renders category name, exercise count, MiniSparkline, delta text, and applies opacity dimming when stale.
- `src/components/__tests__/MiniSparkline.test.tsx` — **New file.** Tests: renders SVG, handles empty/single-point arrays, passes color prop through.
- `src/components/__tests__/CategorySummaryCard.test.tsx` — **New file.** Tests: renders category name and exercise count, calls onPress, applies stale dimming (opacity), renders sparkline, shows delta text.
- `__mocks__/react-native-svg.js` — **Modify.** Add `Polyline: createMockComponent('Polyline')` to the exports so tests can render MiniSparkline without errors.
- `src/theme/colors.ts` — Read-only reference. Use `colors.accent` (#8DC28A) for sparkline stroke, `colors.secondary` for labels, `colors.surfaceElevated` for card background.
- `src/screens/DashboardScreen.tsx` — Read-only reference for card styling patterns (`styles.card`, `styles.cardRow`, `borderRadius: 14`, `colors.surfaceElevated` background). Contains `formatRelativeTime()` which S02 may want to extract or duplicate for showing last-trained time.

### Build Order

1. **Add `Polyline` to SVG mock** (`__mocks__/react-native-svg.js`) — unblocks all component tests.
2. **Build `MiniSparkline`** — pure presentational, no dependencies beyond react-native-svg. Test it.
3. **Build `CategorySummaryCard`** — composes MiniSparkline, consumes `CategorySummary` type. Test it.

This is naturally 2 tasks (mock fix is trivial, fold into T01):
- **T01: MiniSparkline component + tests** (includes SVG mock update)
- **T02: CategorySummaryCard component + tests**

### Verification Approach

- `npx jest src/components/__tests__/MiniSparkline.test.tsx --verbose` — all tests pass
- `npx jest src/components/__tests__/CategorySummaryCard.test.tsx --verbose` — all tests pass
- `npx tsc --noEmit` — no new type errors
- Components importable from `src/components/MiniSparkline` and `src/components/CategorySummaryCard`

## Constraints

- **Must use `react-native-svg` Polyline** — no new chart libraries (project constraint from M002 context). The `Polyline` element takes a `points` attribute as a space-separated string of "x,y" pairs.
- **Dark Mint Card design system** — cards use `colors.surfaceElevated` (#24272C) background, `borderRadius: 14`, subtle border `colors.border`. Accent color for sparkline stroke is `colors.accent` (#8DC28A). Section labels are `colors.secondary`, `fontSize.sm`, `weightBold`, ALL-CAPS with `letterSpacing: 1.2`.
- **`sparklinePoints` is ordered oldest-first** (from S01 Forward Intelligence) — render left-to-right directly, index 0 = leftmost point.
- **`measurementType` on CategorySummary uses majority rule** (D001) — the card should format delta values as weight (kg/lb) for 'reps' type and duration for 'timed' type.
- **Both functions return `[]` for empty data** (S01 Forward Intelligence) — MiniSparkline must handle empty arrays gracefully (render nothing or a flat line).
- **`formatRelativeTime`** is currently defined inline in `DashboardScreen.tsx` (not exported). CategorySummaryCard will need it for showing "2d ago" etc. Either duplicate it in the component or extract to a shared utility. Extracting is cleaner but increases scope; duplicating is pragmatic for S02.

## Common Pitfalls

- **SVG coordinate system** — SVG y-axis is inverted (0 is top). When normalizing sparkline data, the highest value should map to the smallest y coordinate (near 0) and the lowest value to the largest y (near height). Use: `y = height - ((value - min) / (max - min)) * height`. Add a small padding (2-3px) so strokes aren't clipped at edges.
- **Division by zero in normalization** — If all sparkline points are the same value (max === min), render a flat horizontal line at mid-height rather than crashing.
- **Stale dimming** — Use `opacity: 0.4` on the entire card wrapper for stale categories (30+ days untrained). The `isStale` boolean is computed by the caller (S03), not by this component — keep it a simple prop.
- **Missing Polyline in SVG mock** — Tests will fail with "Polyline is not a function" if the mock isn't updated first. This is the #1 gotcha.
