---
id: T02
parent: S02
milestone: M002
provides:
  - CategorySummaryCard pressable card component with stale dimming, delta formatting, and MiniSparkline
  - formatRelativeTime shared utility extracted from DashboardScreen
key_files:
  - src/components/CategorySummaryCard.tsx
  - src/utils/formatRelativeTime.ts
  - src/components/__tests__/CategorySummaryCard.test.tsx
  - src/screens/DashboardScreen.tsx
key_decisions:
  - Extracted formatRelativeTime to src/utils/ for reuse by CategorySummaryCard and DashboardScreen — avoids duplication across S03 dashboard integration
  - Used TouchableOpacity with inline opacity style for stale dimming (simpler than Animated.View for static opacity)
  - Delta formatting returns null for <2 points (conditionally rendered) and '–' for non-positive delta
patterns_established:
  - CategorySummaryCard delta formatting pattern: reps→"+X.X kg", timed→"+Xs", <=0→"–", <2 points→hidden
  - Shared utility extraction pattern: move inline helpers to src/utils/ with named export, re-import in original file
observability_surfaces:
  - npx jest src/components/__tests__/CategorySummaryCard.test.tsx --verbose — 9 tests covering render, press, stale, delta, relative time
  - npx tsc --noEmit — type-checks CategorySummary prop interface and theme token imports
duration: 8m
verification_result: passed
completed_at: 2026-03-17
blocker_discovered: false
---

# T02: Build CategorySummaryCard component with utility extraction and tests

**Extracted formatRelativeTime to shared utility and built CategorySummaryCard with stale dimming, delta formatting, MiniSparkline integration, and 9 passing tests**

## What Happened

1. Extracted `formatRelativeTime` from `DashboardScreen.tsx` (lines 68–83) to `src/utils/formatRelativeTime.ts`. Updated DashboardScreen to import from the new utility. All 13 existing DashboardScreen tests pass unchanged.

2. Created `CategorySummaryCard` component following Dark Mint Card design system: `surfaceElevated` background, `borderRadius: 14`, subtle border, theme color tokens. The card renders category name (capitalized), exercise count, delta text (weight for reps, duration for timed), relative time via `formatRelativeTime`, and a `MiniSparkline` on the right side. Stale dimming applies `opacity: 0.4` via inline style on the TouchableOpacity wrapper.

3. Created 9 unit tests using `@testing-library/react-native` with a `makeSummary()` helper. MiniSparkline is mocked to a simple View with testID for prop assertion. Tests cover: rendering, press callback, stale/non-stale opacity, sparkline data pass-through, delta formatting for both measurement types, no-delta for single points, and relative time rendering.

## Verification

- `npx jest src/components/__tests__/CategorySummaryCard.test.tsx --verbose` — **9/9 pass**
- `npx jest src/components/__tests__/MiniSparkline.test.tsx --verbose` — **8/8 pass** (regression check)
- `npx jest src/screens/__tests__/DashboardScreen.test.tsx --verbose` — **13/13 pass** (extraction didn't break anything)
- `npx tsc --noEmit` — no new errors in our files (pre-existing test-utils path alias errors only)

### Slice-level verification status (S02):
- ✅ `npx jest src/components/__tests__/MiniSparkline.test.tsx --verbose` — all tests pass
- ✅ `npx jest src/components/__tests__/CategorySummaryCard.test.tsx --verbose` — all tests pass
- ✅ `npx tsc --noEmit` — no new type errors
- ✅ Both components importable via named exports

**All S02 slice verification checks pass. This is the final task of S02.**

## Diagnostics

- Run `npx jest src/components/__tests__/CategorySummaryCard.test.tsx --verbose` to inspect all card behaviors
- Test names describe exact invariants: renders name/count, onPress fires, stale→0.4, not-stale→1, sparkline data, reps→kg, timed→s, <2 points→no delta, relative time
- Component is pure presentational — no async, no side effects, no logging. Failures surface only as test failures or TypeScript errors.

## Deviations

None — implementation followed the task plan exactly.

## Known Issues

None.

## Files Created/Modified

- `src/utils/formatRelativeTime.ts` — new file, extracted utility function with relative time formatting logic
- `src/screens/DashboardScreen.tsx` — removed inline `formatRelativeTime`, added import from shared utility
- `src/components/CategorySummaryCard.tsx` — new file, pressable category card with stale dimming, delta formatting, MiniSparkline
- `src/components/__tests__/CategorySummaryCard.test.tsx` — new file, 9 unit tests for CategorySummaryCard
- `.gsd/milestones/M002/slices/S02/tasks/T02-PLAN.md` — added Observability Impact section
