---
id: S02
milestone: M002
status: ready
---

# S02: MiniSparkline & CategorySummaryCard Components — Context

<!-- Slice-scoped context. Milestone-only sections (acceptance criteria, completion class,
     milestone sequence) do not belong here — those live in the milestone context. -->

## Goal

Build the `MiniSparkline` SVG component and `CategorySummaryCard` component that together render a complete category card with sparkline trend, signed delta, exercise count, and stale dimming.

## Why this Slice

S01 produces the data types and queries. This slice builds the presentational components that consume that data, which S03 (dashboard redesign) and S04 (CategoryProgressScreen) both need. Components must exist and render correctly before they can be wired into screens.

## Scope

### In Scope

- `MiniSparkline` component — SVG polyline rendered via `react-native-svg`, accepting `data: number[]` and optional `width`, `height`, `color` props
- `CategorySummaryCard` component — full-width card displaying category name, sparkline, signed delta with color, exercise count, and stale dimming
- Sparkline edge cases: flat horizontal line for 1 data point, placeholder (no sparkline, e.g. a dash) for 0 data points
- Stale dimming: reduced opacity (~0.5) on the entire card when `isStale` is true
- Delta display: signed number with color (green for positive, red/danger for negative, secondary for zero)
- Card must be tappable (`onPress` prop)
- Must use existing theme tokens (`colors`, `spacing`, `typography`)

### Out of Scope

- Wiring components to real DB data (S03 does that)
- Dashboard layout and ScrollView integration (S03)
- CategoryProgressScreen usage of MiniSparkline (S04)
- Animation or transitions on sparklines
- Per-category unique colors — all sparklines use mint green accent
- Downsampling logic for sparkline data points — component renders whatever array it receives

## Constraints

- Must use already-installed `react-native-svg` (`Svg`, `Polyline`) — no new chart libraries
- Must use existing theme tokens from `src/theme/colors.ts`, `spacing.ts`, `typography.ts`
- Components go in `src/components/` alongside existing components
- Card layout is full-width (one card per row), not a grid

## Integration Points

### Consumes

- `CategorySummary` type from S01 — provides `sparklinePoints`, `currentBest`, `previousBest`, `exerciseCount`, `lastTrainedAt`, `category`
- `src/theme/colors.ts` — `accent` (#8DC28A) for sparkline color, `danger` for negative delta, `secondary` for labels
- `src/theme/spacing.ts` — card padding and margins
- `src/theme/typography.ts` — font sizes and weights
- `react-native-svg` — `Svg` and `Polyline` for sparkline rendering

### Produces

- `MiniSparkline` component accepting `{ data: number[], width?, height?, color? }` — consumed by `CategorySummaryCard` (this slice), `DashboardScreen` (S03), and `CategoryProgressScreen` (S04)
- `CategorySummaryCard` component accepting `{ summary: CategorySummary, isStale: boolean, onPress: () => void }` — consumed by `DashboardScreen` (S03)

## Implementation Decisions

- **Sparkline color:** Mint green accent (#8DC28A) for all categories. No per-category color variation.
- **Sparkline edge cases:** 1 data point renders as a flat horizontal line. 0 data points renders a placeholder (no sparkline drawn, visually indicated).
- **Delta format:** Signed number with color — e.g. "+5 kg" in green, "-2 kg" in red/danger. Zero change uses secondary text color.
- **Stale dimming:** Entire card opacity reduced to ~0.5 when stale. Card remains tappable.
- **Card content:** Category name, sparkline, signed delta, and exercise count (e.g. "5 exercises"). No last-trained date on the card.
- **Card layout:** Full-width, one card per row. Not a 2-column grid.

## Open Questions

- None — all behavioral decisions resolved during discuss phase.
