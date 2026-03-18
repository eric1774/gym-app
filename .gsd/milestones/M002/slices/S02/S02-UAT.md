# S02: MiniSparkline & CategorySummaryCard Components — UAT

**Milestone:** M002
**Written:** 2026-03-17

## UAT Type

- UAT mode: artifact-driven
- Why this mode is sufficient: S02 delivers pure presentational components with no async behavior, side effects, or runtime dependencies. All behavior is fully verifiable through unit test assertions on rendered output, prop handling, and style values. Visual device testing is intentionally deferred to S03 when these components are wired into the dashboard.

## Preconditions

- Working directory is the M002 worktree with all S02 files present
- Node modules installed (`node_modules/` exists with jest, react-native-svg, @testing-library/react-native)
- No dev server required — tests run in Jest with mocked native modules

## Smoke Test

Run `npx jest src/components/__tests__/ --verbose` — should show 17 passing tests (8 MiniSparkline + 9 CategorySummaryCard) with 0 failures.

## Test Cases

### 1. MiniSparkline renders SVG polyline from numeric data

1. Run `npx jest src/components/__tests__/MiniSparkline.test.tsx --verbose -t "renders SVG with Polyline for valid data"`
2. **Expected:** Test passes. MiniSparkline renders an Svg container with a Polyline child whose `points` attribute contains normalized coordinate pairs derived from input data `[10, 20, 15, 25, 30]`.

### 2. MiniSparkline handles empty data gracefully

1. Run `npx jest src/components/__tests__/MiniSparkline.test.tsx --verbose -t "renders nothing for empty data"`
2. **Expected:** Test passes. Component returns null — no SVG elements rendered.

### 3. MiniSparkline handles single data point

1. Run `npx jest src/components/__tests__/MiniSparkline.test.tsx --verbose -t "handles single data point"`
2. **Expected:** Test passes. Polyline `points` attribute contains exactly 2 coordinate pairs (start and end of a horizontal line at mid-height).

### 4. MiniSparkline handles all-same values without division by zero

1. Run `npx jest src/components/__tests__/MiniSparkline.test.tsx --verbose -t "handles all-same values"`
2. **Expected:** Test passes. Polyline renders with all y-coordinates at the same value (flat line). No NaN, Infinity, or crash from zero range normalization.

### 5. MiniSparkline y-axis inversion

1. Run `npx jest src/components/__tests__/MiniSparkline.test.tsx --verbose -t "y-axis is inverted"`
2. **Expected:** Test passes. For data `[10, 50]`, the higher value (50) has a smaller y-coordinate in SVG space than the lower value (10), confirming proper y-axis inversion.

### 6. CategorySummaryCard renders category info

1. Run `npx jest src/components/__tests__/CategorySummaryCard.test.tsx --verbose -t "renders category name and exercise count"`
2. **Expected:** Test passes. Card displays the category name and exercise count text from the `CategorySummary` prop.

### 7. CategorySummaryCard onPress callback

1. Run `npx jest src/components/__tests__/CategorySummaryCard.test.tsx --verbose -t "calls onPress when card is pressed"`
2. **Expected:** Test passes. Pressing the card fires the `onPress` callback exactly once.

### 8. CategorySummaryCard stale dimming

1. Run `npx jest src/components/__tests__/CategorySummaryCard.test.tsx --verbose -t "applies stale dimming"`
2. Run `npx jest src/components/__tests__/CategorySummaryCard.test.tsx --verbose -t "renders with full opacity when not stale"`
3. **Expected:** Both tests pass. When `isStale=true`, the card wrapper has `opacity: 0.4`. When `isStale=false`, opacity is `1`.

### 9. CategorySummaryCard delta formatting — reps (weight)

1. Run `npx jest src/components/__tests__/CategorySummaryCard.test.tsx --verbose -t "shows positive delta for reps type as weight"`
2. **Expected:** Test passes. For a reps-type category with `currentBest=100` and `previousBest=90`, delta displays as "+10 kg".

### 10. CategorySummaryCard delta formatting — timed (duration)

1. Run `npx jest src/components/__tests__/CategorySummaryCard.test.tsx --verbose -t "shows positive delta for timed type as duration"`
2. **Expected:** Test passes. For a timed-type category with `currentBest=120` and `previousBest=100`, delta displays as "+20s".

### 11. CategorySummaryCard no delta for insufficient data

1. Run `npx jest src/components/__tests__/CategorySummaryCard.test.tsx --verbose -t "shows no delta when sparklinePoints has fewer than 2 points"`
2. **Expected:** Test passes. When `sparklinePoints` has fewer than 2 entries, no delta text is rendered.

### 12. DashboardScreen regression after formatRelativeTime extraction

1. Run `npx jest src/screens/__tests__/DashboardScreen.test.tsx --verbose`
2. **Expected:** All 13 DashboardScreen tests pass. The extraction of `formatRelativeTime` to `src/utils/formatRelativeTime.ts` did not change any existing behavior.

### 13. TypeScript type safety

1. Run `npx tsc --noEmit`
2. **Expected:** No new type errors. All errors in output are pre-existing (14 errors related to `@test-utils` module resolution, ExerciseListItem type, programs.mapper type, and calendar test type — none in S02 files).

## Edge Cases

### Empty sparklinePoints array on CategorySummaryCard

1. Create a `CategorySummary` with `sparklinePoints: []`
2. Render `CategorySummaryCard` with this summary
3. **Expected:** Card renders without crashing. MiniSparkline returns null (no SVG). No delta is shown (fewer than 2 points).

### All sparklinePoints same value

1. Create a `CategorySummary` with `sparklinePoints: [50, 50, 50]`, `currentBest: 50`, `previousBest: 50`
2. **Expected:** MiniSparkline renders a flat horizontal line. Delta shows '–' (non-positive difference).

### Very large data values

1. Pass `sparklinePoints: [10000, 50000, 30000]` to MiniSparkline
2. **Expected:** Normalization maps values to SVG coordinate space correctly. No overflow or rendering issues.

## Failure Signals

- Any test failure in `src/components/__tests__/MiniSparkline.test.tsx` or `src/components/__tests__/CategorySummaryCard.test.tsx`
- New TypeScript errors in `src/components/MiniSparkline.tsx`, `src/components/CategorySummaryCard.tsx`, or `src/utils/formatRelativeTime.ts`
- DashboardScreen test failures (would indicate `formatRelativeTime` extraction broke something)
- Import errors when S03 tries to `import { CategorySummaryCard } from '../components/CategorySummaryCard'`

## Not Proven By This UAT

- Visual rendering on actual device/emulator — deferred to S03 when components are wired into the dashboard
- Performance with large sparkline datasets (hundreds of points) — not load-tested
- Accessibility (screen reader support, touch target sizes) — not verified
- Animation or transition behavior — components are static

## Notes for Tester

- All tests run in ~2 seconds total — fast feedback loop
- The 14 TypeScript errors from `npx tsc --noEmit` are all pre-existing and unrelated to S02. To confirm no S02 regressions, check that none of the error file paths include `MiniSparkline`, `CategorySummaryCard`, or `formatRelativeTime`
- MiniSparkline tests use `ReactTestRendererJSON` type casting with helper functions — this is intentional for type-safe assertions on `toJSON()` output
- CategorySummaryCard tests mock MiniSparkline to a simple View with testID — this isolates card logic from SVG rendering concerns
