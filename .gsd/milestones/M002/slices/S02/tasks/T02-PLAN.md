---
estimated_steps: 5
estimated_files: 5
---

# T02: Build CategorySummaryCard component with utility extraction and tests

**Slice:** S02 — MiniSparkline & CategorySummaryCard Components
**Milestone:** M002

## Description

Create the `CategorySummaryCard` component — a pressable card that displays a category's name, exercise count, MiniSparkline trend, delta text, relative time, and stale dimming. Also extract `formatRelativeTime` from `DashboardScreen.tsx` to a shared utility so both the existing screen and this new component can use it.

**Load skill: `dark-mint-card-ui`** before implementing — it defines card styling, the nested card system, typography rules, and color tokens.

## Steps

1. **Extract `formatRelativeTime` to shared utility** — Create `src/utils/formatRelativeTime.ts` with the function body currently at line 68 of `src/screens/DashboardScreen.tsx`. The function signature is:
   ```typescript
   export function formatRelativeTime(dateStr: string): string
   ```
   Implementation (copy exact logic from DashboardScreen):
   - Computes `diffMs = Date.now() - new Date(dateStr).getTime()`
   - Returns: `'just now'` (<1min), `'Xm ago'` (<60min), `'Xh ago'` (<24h), `'Xd ago'` (<7d), `'Xw ago'` (<5w), `'Xmo ago'` (else)
   
   Then update `src/screens/DashboardScreen.tsx`:
   - Remove the inline `formatRelativeTime` function (lines 68–83)
   - Add `import { formatRelativeTime } from '../utils/formatRelativeTime';` near the top imports
   - Verify the existing DashboardScreen usage on line 246 still works

2. **Create `src/components/CategorySummaryCard.tsx`** — Build a pressable card component with these props:
   ```typescript
   interface CategorySummaryCardProps {
     summary: CategorySummary;
     isStale: boolean;
     onPress: () => void;
   }
   ```
   
   Implementation details — follow Dark Mint Card design system:
   - Import `CategorySummary` from `../types`, `MiniSparkline` from `./MiniSparkline`, `formatRelativeTime` from `../utils/formatRelativeTime`, theme tokens from `../theme`
   - Wrap in `TouchableOpacity` (or `Pressable`) with `onPress` callback
   - **Stale dimming:** Apply `opacity: 0.4` to the outer wrapper when `isStale` is true, `opacity: 1` otherwise
   - **Card styling** (Dark Mint Card system):
     - `backgroundColor: colors.surfaceElevated` (#24272C)
     - `borderRadius: 14`
     - `borderWidth: 1`, `borderColor: colors.border`
     - `padding: spacing.base` (16)
   - **Layout:** Row layout with text info on the left, sparkline on the right
     - Left side (flex: 1):
       - Category name: `fontSize.base`, `weightSemiBold`, `colors.primary` (white)
       - Exercise count: `fontSize.sm`, `colors.secondary` (e.g., "5 exercises")
       - Delta text: `fontSize.sm`, `colors.accent` for positive change, `colors.secondary` for no change
       - Relative time: `fontSize.xs`, `colors.secondary` — use `formatRelativeTime(summary.lastTrainedAt)`
     - Right side:
       - `<MiniSparkline data={summary.sparklinePoints} />` with default sizing
   - **Delta calculation:**
     - If `sparklinePoints.length >= 2`: delta = last point - first point
     - If delta > 0 and measurementType is `'reps'`: show `"+X.X kg"` (one decimal)
     - If delta > 0 and measurementType is `'timed'`: show `"+Xs"` (whole seconds)
     - If delta <= 0 or sparklinePoints.length < 2: show nothing or "–"
   - **testID props:** Add `testID="category-card"` on wrapper, `testID="category-name"` on name text, `testID="exercise-count"` on count text, `testID="delta-text"` on delta — these enable reliable test queries

3. **Create `src/components/__tests__/CategorySummaryCard.test.tsx`** — Write tests using `@testing-library/react-native`:
   
   Create a test helper `makeSummary()` that returns a valid `CategorySummary`:
   ```typescript
   const makeSummary = (overrides?: Partial<CategorySummary>): CategorySummary => ({
     category: 'Chest' as ExerciseCategory,
     exerciseCount: 3,
     sparklinePoints: [50, 55, 52, 60],
     lastTrainedAt: new Date().toISOString(),
     measurementType: 'reps',
     ...overrides,
   });
   ```
   
   Tests:
   - **"renders category name and exercise count"** — render with makeSummary, assert "Chest" and "3 exercises" are visible
   - **"calls onPress when card is pressed"** — render, fireEvent.press on wrapper, assert mock function called once
   - **"applies stale dimming with opacity 0.4"** — render with `isStale={true}`, assert wrapper has `opacity: 0.4` style
   - **"renders with full opacity when not stale"** — render with `isStale={false}`, assert wrapper has `opacity: 1`
   - **"renders MiniSparkline with sparklinePoints data"** — render, assert MiniSparkline element exists with correct data prop
   - **"shows positive delta for reps type as weight"** — pass `sparklinePoints: [50, 60]`, `measurementType: 'reps'`, assert "+10" or "+10.0 kg" visible
   - **"shows positive delta for timed type as duration"** — pass `sparklinePoints: [30, 45]`, `measurementType: 'timed'`, assert "+15s" visible
   - **"shows no delta when sparklinePoints has fewer than 2 points"** — pass `sparklinePoints: [50]`, assert no delta text rendered
   - **"renders relative time from lastTrainedAt"** — mock Date.now, pass known lastTrainedAt, assert relative time text is visible

4. **Run all S02 tests** — `npx jest src/components/__tests__/MiniSparkline.test.tsx src/components/__tests__/CategorySummaryCard.test.tsx --verbose`

5. **Run TypeScript check and verify DashboardScreen** — `npx tsc --noEmit` — no new errors. Run `npx jest src/screens/__tests__/ --verbose` to confirm DashboardScreen tests still pass after the formatRelativeTime extraction.

## Must-Haves

- [ ] `formatRelativeTime` extracted to `src/utils/formatRelativeTime.ts` and imported back into DashboardScreen without breaking existing behavior
- [ ] `CategorySummaryCard` renders category name, exercise count, sparkline, delta, and relative time
- [ ] `isStale={true}` applies `opacity: 0.4` to the card wrapper
- [ ] `onPress` callback is invoked when card is pressed
- [ ] Delta formats as weight (kg) for `measurementType: 'reps'` and duration (s) for `measurementType: 'timed'`
- [ ] Card follows Dark Mint Card design system: `surfaceElevated` background, `borderRadius: 14`, theme color tokens
- [ ] All 9 CategorySummaryCard tests pass
- [ ] Existing DashboardScreen tests still pass
- [ ] `npx tsc --noEmit` — no new errors

## Verification

- `npx jest src/components/__tests__/CategorySummaryCard.test.tsx --verbose` — all 9 tests pass
- `npx jest src/components/__tests__/MiniSparkline.test.tsx --verbose` — still passes (regression check)
- `npx jest src/screens/__tests__/ --verbose` — existing DashboardScreen tests pass
- `npx tsc --noEmit` — no new type errors

## Inputs

- `src/components/MiniSparkline.tsx` — T01 output, the sparkline component this card composes
- `src/types/index.ts` — `CategorySummary` interface: `{ category, exerciseCount, sparklinePoints, lastTrainedAt, measurementType }`
- `src/screens/DashboardScreen.tsx` — contains `formatRelativeTime` at line 68 to extract, used on line 246
- `src/theme/colors.ts` — `colors.surfaceElevated` (#24272C), `colors.accent` (#8DC28A), `colors.primary` (#FFFFFF), `colors.secondary` (#8E9298), `colors.border`
- `src/theme/spacing.ts` — `spacing.base` (16), `spacing.sm` (8)
- `src/theme/typography.ts` — `fontSize.base` (15), `fontSize.sm` (13), `fontSize.xs` (11), `weightSemiBold`, `weightBold`
- Dark Mint Card design system skill — card styling rules: surfaceElevated background, borderRadius 14, subtle border

## Observability Impact

- **Test surface:** `npx jest src/components/__tests__/CategorySummaryCard.test.tsx --verbose` — 9 tests cover rendering, press, stale dimming, delta formatting, and relative time. Test names describe exact invariants.
- **TypeScript signals:** `npx tsc --noEmit` catches type regressions on the `CategorySummary` prop interface and theme token imports.
- **No runtime logging:** Component is pure presentational with no async or side effects. Failures surface as test failures or TypeScript errors only.
- **Extracted utility:** `formatRelativeTime` is now independently testable at `src/utils/formatRelativeTime.ts` — future agents can add unit tests for edge cases without touching component tests.

## Expected Output

- `src/utils/formatRelativeTime.ts` — new file, extracted utility function
- `src/screens/DashboardScreen.tsx` — modified, inline function removed, import added
- `src/components/CategorySummaryCard.tsx` — new file, pressable card component
- `src/components/__tests__/CategorySummaryCard.test.tsx` — new file, 9 unit tests
