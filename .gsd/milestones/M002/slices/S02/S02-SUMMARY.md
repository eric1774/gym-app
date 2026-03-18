---
id: S02
parent: M002
milestone: M002
provides:
  - MiniSparkline pure presentational SVG sparkline component
  - CategorySummaryCard pressable card component with stale dimming, delta formatting, and MiniSparkline
  - formatRelativeTime shared utility extracted from DashboardScreen for cross-component reuse
requires:
  - slice: S01
    provides: CategorySummary interface with sparklinePoints, currentBest, previousBest, measurementType, lastTrainedAt
affects:
  - S03
  - S04
key_files:
  - src/components/MiniSparkline.tsx
  - src/components/CategorySummaryCard.tsx
  - src/utils/formatRelativeTime.ts
  - src/components/__tests__/MiniSparkline.test.tsx
  - src/components/__tests__/CategorySummaryCard.test.tsx
  - __mocks__/react-native-svg.js
  - src/screens/DashboardScreen.tsx
key_decisions:
  - Extracted formatRelativeTime to src/utils/ for reuse — avoids duplication across DashboardScreen and CategorySummaryCard
  - Delta formatting hides delta entirely for <2 sparkline points, shows '–' for non-positive delta — avoids confusing or demotivating display
  - Used TouchableOpacity with inline opacity style for stale dimming (simpler than Animated.View for static opacity)
  - Used ReactTestRendererJSON type casting with helper functions for type-safe SVG test assertions
patterns_established:
  - MiniSparkline edge-case handling: empty→null, single-point→horizontal line at midY, all-same→flat line at midY, normal→normalized coordinates with y-inversion and 2px padding
  - CategorySummaryCard delta formatting: reps→"+X.X kg", timed→"+Xs", ≤0→"–", <2 points→hidden
  - Shared utility extraction: move inline helpers to src/utils/ with named export, re-import in original file
  - Dark Mint Card styling: surfaceElevated background, borderRadius 14, subtle border, theme color tokens
observability_surfaces:
  - npx jest src/components/__tests__/MiniSparkline.test.tsx --verbose — 8 tests covering all edge cases
  - npx jest src/components/__tests__/CategorySummaryCard.test.tsx --verbose — 9 tests covering render, press, stale, delta, relative time
  - npx tsc --noEmit — type-checks all component interfaces and theme imports
drill_down_paths:
  - .gsd/milestones/M002/slices/S02/tasks/T01-SUMMARY.md
  - .gsd/milestones/M002/slices/S02/tasks/T02-SUMMARY.md
duration: 20m
verification_result: passed
completed_at: 2026-03-17
---

# S02: MiniSparkline & CategorySummaryCard Components

**Delivered two reusable React Native components — MiniSparkline (SVG trend line) and CategorySummaryCard (pressable card with sparkline, delta formatting, stale dimming) — plus formatRelativeTime shared utility, with 17 passing tests and zero new TypeScript errors**

## What Happened

First, the `Polyline` component was added to the existing `react-native-svg` mock (`__mocks__/react-native-svg.js`) so SVG polyline rendering could be tested in Jest. Then `MiniSparkline` was built as a pure presentational component that takes a `number[]` data prop and renders an `<Svg><Polyline />` with normalized coordinates and y-axis inversion. Edge cases are handled cleanly: empty arrays return null, single points render a horizontal line at mid-height, and all-same values produce a flat line (avoiding division by zero). 8 unit tests verify all behaviors.

Next, `formatRelativeTime` was extracted from `DashboardScreen.tsx` into `src/utils/formatRelativeTime.ts` and re-imported in DashboardScreen. All 13 existing DashboardScreen tests continued to pass unchanged, confirming the extraction was behavior-preserving.

Finally, `CategorySummaryCard` was built as a pressable card following the Dark Mint Card design system (`surfaceElevated` background, `borderRadius: 14`, subtle border, theme tokens). It takes a `CategorySummary` prop (from S01) and renders: category name (capitalized), exercise count, embedded MiniSparkline, delta text (weight format for reps, duration format for timed), and relative time. Stale categories receive `opacity: 0.4`. Delta display is suppressed for categories with fewer than 2 sparkline points (insufficient data for comparison). 9 unit tests verify rendering, press callback, stale dimming, sparkline data pass-through, delta formatting for both measurement types, and relative time display.

## Verification

- `npx jest src/components/__tests__/MiniSparkline.test.tsx --verbose` — **8/8 pass**
- `npx jest src/components/__tests__/CategorySummaryCard.test.tsx --verbose` — **9/9 pass**
- `npx jest src/screens/__tests__/DashboardScreen.test.tsx --verbose` — **13/13 pass** (formatRelativeTime extraction regression check)
- `npx tsc --noEmit` — **no new errors** (all 14 errors are pre-existing: `@test-utils` module resolution, ExerciseListItem type, programs.mapper type, calendar test type)
- All three new files exist and export correctly: `MiniSparkline`, `CategorySummaryCard`, `formatRelativeTime`

## Deviations

None — implementation followed the slice plan exactly. Both tasks completed without blockers or scope changes.

## Known Limitations

- Components are unit-tested only with mocked SVG — visual rendering has not been verified on device (deferred to S03 device testing)
- MiniSparkline does not support touch interaction or animated transitions — it's a static trend indicator
- CategorySummaryCard delta formatting does not handle edge cases where currentBest/previousBest might be null (relies on S01 queries always providing numeric values)

## Follow-ups

- S03 will wire CategorySummaryCard into the dashboard, replacing the flat exercise list — this is where visual verification on device becomes possible
- S04 will reuse MiniSparkline in CategoryProgressScreen for per-exercise sparklines

## Files Created/Modified

- `__mocks__/react-native-svg.js` — added `Polyline` mock component to exports
- `src/components/MiniSparkline.tsx` — new pure presentational SVG sparkline component
- `src/components/__tests__/MiniSparkline.test.tsx` — 8 unit tests for MiniSparkline
- `src/utils/formatRelativeTime.ts` — new shared utility extracted from DashboardScreen
- `src/screens/DashboardScreen.tsx` — updated import to use extracted formatRelativeTime utility
- `src/components/CategorySummaryCard.tsx` — new pressable category card component
- `src/components/__tests__/CategorySummaryCard.test.tsx` — 9 unit tests for CategorySummaryCard

## Forward Intelligence

### What the next slice should know
- `CategorySummaryCard` accepts `{ summary: CategorySummary, isStale: boolean, onPress: () => void }` — S03 needs to compute `isStale` by comparing `lastTrainedAt` to a 30-day threshold and wire `onPress` for navigation
- `MiniSparkline` accepts `{ data: number[], width?: number, height?: number, color?: string }` — defaults are 80×40 with accent color. S04 may want different dimensions for the exercise-level sparklines in CategoryProgressScreen
- `formatRelativeTime(dateString)` is now in `src/utils/formatRelativeTime.ts` — S03/S04 should import from there, not duplicate
- The `CategorySummary.measurementType` field determines delta format: `'reps'` → "+X.X kg", `'timed'` → "+Xs" — S04's exercise-level cards should follow the same pattern

### What's fragile
- The SVG mock (`__mocks__/react-native-svg.js`) maps all SVG components to simple React Native Views with testIDs — if react-native-svg API changes or new SVG elements are needed, the mock must be extended
- CategorySummaryCard relies on `CategorySummary` having non-null `currentBest` and `previousBest` for delta calculation — if S01 queries can return null for these fields, the card will render NaN

### Authoritative diagnostics
- `npx jest src/components/__tests__/ --verbose` — runs all 17 component tests (MiniSparkline + CategorySummaryCard) in ~2s; this is the fastest check that S02 deliverables are intact
- `npx jest src/screens/__tests__/DashboardScreen.test.tsx --verbose` — confirms formatRelativeTime extraction didn't regress dashboard behavior

### What assumptions changed
- No assumptions changed — S01's `CategorySummary` interface matched exactly what was expected, and the Dark Mint Card design system tokens were available as planned
