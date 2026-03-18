# S02: MiniSparkline & CategorySummaryCard Components

**Goal:** Deliver two reusable React Native components — `MiniSparkline` (SVG trend line) and `CategorySummaryCard` (pressable category card with sparkline, delta, stale dimming) — ready for S03 dashboard integration.
**Demo:** Both components render correctly in unit tests: MiniSparkline draws an SVG polyline from numeric arrays, CategorySummaryCard renders category name, exercise count, sparkline, delta text, relative time, and applies opacity dimming when stale.

## Must-Haves

- `MiniSparkline` component renders `<Svg><Polyline />` from a `number[]` data prop, normalizing values to SVG coordinates with y-axis inversion
- `MiniSparkline` handles edge cases: empty array (renders nothing), single point (renders a dot/line), all-same values (flat horizontal line)
- `CategorySummaryCard` renders category name, exercise count, embedded MiniSparkline, delta text, and relative time from a `CategorySummary` prop
- `CategorySummaryCard` applies `opacity: 0.4` when `isStale` is true
- `CategorySummaryCard` calls `onPress` callback when pressed
- `CategorySummaryCard` formats delta as weight for `reps` measurementType and duration for `timed` measurementType
- Both components follow Dark Mint Card design system (colors from theme, `borderRadius: 14`, `surfaceElevated` card background)
- `formatRelativeTime` extracted to shared utility for reuse across S03/S04
- All tests pass, `tsc --noEmit` clean (no new errors)

## Proof Level

- This slice proves: contract (component rendering with correct props and behavior)
- Real runtime required: no (unit tests with mocked SVG)
- Human/UAT required: no (visual verification deferred to S03 device testing)

## Verification

- `npx jest src/components/__tests__/MiniSparkline.test.tsx --verbose` — all tests pass
- `npx jest src/components/__tests__/CategorySummaryCard.test.tsx --verbose` — all tests pass
- `npx tsc --noEmit` — no new type errors
- Both components importable: `import { MiniSparkline } from '../components/MiniSparkline'` and `import { CategorySummaryCard } from '../components/CategorySummaryCard'`

## Integration Closure

- Upstream surfaces consumed: `CategorySummary` interface from `src/types/index.ts` (S01), `colors`/`spacing`/`typography` from `src/theme/`, `Svg`/`Polyline` from `react-native-svg`
- New wiring introduced in this slice: none (components are standalone, wired in S03)
- What remains before the milestone is truly usable end-to-end: S03 wires CategorySummaryCard into dashboard, S04 adds CategoryProgressScreen and navigation

## Tasks

- [ ] **T01: Build MiniSparkline component with SVG mock fix and tests** `est:25m`
  - Why: MiniSparkline is a dependency of CategorySummaryCard and needs the SVG Polyline mock to be testable. Building this first unblocks T02.
  - Files: `__mocks__/react-native-svg.js`, `src/components/MiniSparkline.tsx`, `src/components/__tests__/MiniSparkline.test.tsx`
  - Do: Add `Polyline` to SVG mock. Build MiniSparkline as a pure presentational component using `Svg` + `Polyline` from `react-native-svg`. Normalize `number[]` data to SVG coordinate string with y-axis inversion and edge-case handling (empty, single-point, all-same-values). Write comprehensive tests. **Load skill: `dark-mint-card-ui`** for color token reference.
  - Verify: `npx jest src/components/__tests__/MiniSparkline.test.tsx --verbose` — all pass; `npx tsc --noEmit` — no new errors
  - Done when: MiniSparkline renders Polyline from data arrays, handles all edge cases, tests pass, TypeScript clean

- [ ] **T02: Build CategorySummaryCard component with utility extraction and tests** `est:30m`
  - Why: CategorySummaryCard is the card component S03 will use in the dashboard. It composes MiniSparkline and renders the full category card UI including delta formatting and stale dimming.
  - Files: `src/utils/formatRelativeTime.ts`, `src/screens/DashboardScreen.tsx`, `src/components/CategorySummaryCard.tsx`, `src/components/__tests__/CategorySummaryCard.test.tsx`
  - Do: Extract `formatRelativeTime` from DashboardScreen to `src/utils/formatRelativeTime.ts` and re-import in DashboardScreen. Build CategorySummaryCard as a pressable card following Dark Mint Card design system. It takes `summary: CategorySummary`, `isStale: boolean`, `onPress: () => void`. Renders category name, exercise count, MiniSparkline, delta text (weight vs duration based on measurementType), relative time. Applies `opacity: 0.4` for stale. Write comprehensive tests. **Load skill: `dark-mint-card-ui`** for styling rules.
  - Verify: `npx jest src/components/__tests__/CategorySummaryCard.test.tsx --verbose` — all pass; `npx jest src/screens/__tests__/ --verbose` — existing tests still pass; `npx tsc --noEmit` — no new errors
  - Done when: CategorySummaryCard renders complete card UI, stale dimming works, onPress fires, delta formatting correct for both measurement types, formatRelativeTime extracted without breaking DashboardScreen, all tests pass

## Files Likely Touched

- `__mocks__/react-native-svg.js` — add Polyline mock
- `src/components/MiniSparkline.tsx` — new file
- `src/components/__tests__/MiniSparkline.test.tsx` — new file
- `src/utils/formatRelativeTime.ts` — new file (extracted from DashboardScreen)
- `src/screens/DashboardScreen.tsx` — update import to use extracted utility
- `src/components/CategorySummaryCard.tsx` — new file
- `src/components/__tests__/CategorySummaryCard.test.tsx` — new file
