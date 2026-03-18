---
estimated_steps: 5
estimated_files: 3
---

# T01: Build MiniSparkline component with SVG mock fix and tests

**Slice:** S02 — MiniSparkline & CategorySummaryCard Components
**Milestone:** M002

## Description

Create the `MiniSparkline` component — a pure presentational SVG polyline that renders a trend line from a `number[]` array. This is a dependency of `CategorySummaryCard` (T02) and the first visual component in the M002 dashboard redesign. Also fix the `react-native-svg` mock to include `Polyline` so tests work.

**Load skill: `dark-mint-card-ui`** before implementing — it defines the color tokens and chart styling rules.

## Steps

1. **Add `Polyline` to SVG mock** — Open `__mocks__/react-native-svg.js` and add `Polyline: createMockComponent('Polyline')` to the exports object. This unblocks all component tests that use Polyline.

2. **Create `src/components/MiniSparkline.tsx`** — Build a pure presentational component with these props:
   ```typescript
   interface MiniSparklineProps {
     data: number[];
     width?: number;   // default 80
     height?: number;  // default 30
     color?: string;   // default colors.accent ('#8DC28A')
     strokeWidth?: number; // default 2
   }
   ```
   
   Implementation details:
   - Import `Svg`, `Polyline` from `react-native-svg` and `colors` from `../theme/colors`
   - **Empty array:** Return `null` (render nothing)
   - **Single point:** Render a short horizontal line segment at mid-height (two identical y points at x=0 and x=width)
   - **All same values (max === min):** Render a flat horizontal line at mid-height
   - **Normal case:** Normalize data to SVG coordinates:
     - X: spread points evenly across width with small padding (2px on each side). `x = padding + (index / (length - 1)) * (width - 2 * padding)`
     - Y: Invert y-axis. `y = padding + (1 - (value - min) / (max - min)) * (height - 2 * padding)`
   - Build points string as `"x1,y1 x2,y2 x3,y3 ..."` 
   - Render: `<Svg width={width} height={height}><Polyline points={pointsString} fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinejoin="round" strokeLinecap="round" /></Svg>`

3. **Create `src/components/__tests__/MiniSparkline.test.tsx`** — Write tests using `@testing-library/react-native`:
   - **"renders nothing for empty data array"** — pass `data={[]}`, assert component returns null (use `toJSON()` returning null or container empty)
   - **"renders SVG with Polyline for valid data"** — pass `data={[1, 3, 2, 5, 4]}`, assert Polyline element exists with a `points` prop that is a non-empty string
   - **"handles single data point"** — pass `data={[42]}`, assert Polyline renders (doesn't crash), points string has two coordinate pairs
   - **"handles all-same values without division by zero"** — pass `data={[5, 5, 5, 5]}`, assert Polyline renders with a flat line (all y coordinates are equal)
   - **"respects custom color prop"** — pass `color="#FF0000"`, assert Polyline `stroke` prop is `"#FF0000"`
   - **"respects custom width and height"** — pass `width={120} height={40}`, assert Svg element has those dimensions
   - **"uses default accent color when no color provided"** — render without color prop, assert Polyline `stroke` is `colors.accent` (`'#8DC28A'`)
   - **"y-axis is inverted (highest value has smallest y)"** — pass `data={[0, 10]}`, parse points string, verify second point has smaller y than first

4. **Run tests** — `npx jest src/components/__tests__/MiniSparkline.test.tsx --verbose`

5. **Run TypeScript check** — `npx tsc --noEmit` — verify no new type errors introduced

## Must-Haves

- [ ] `Polyline` added to `__mocks__/react-native-svg.js` exports
- [ ] `MiniSparkline` component renders `Svg` + `Polyline` from `react-native-svg`
- [ ] Empty array returns null
- [ ] Single data point renders without crashing
- [ ] All-same values renders flat line (no division by zero)
- [ ] Y-axis is inverted (highest value = smallest y coordinate)
- [ ] Default color is `colors.accent` (`'#8DC28A'`)
- [ ] All 8 tests pass
- [ ] `npx tsc --noEmit` — no new errors

## Verification

- `npx jest src/components/__tests__/MiniSparkline.test.tsx --verbose` — all 8 tests pass
- `npx tsc --noEmit` — no new type errors

## Inputs

- `__mocks__/react-native-svg.js` — existing mock file, needs Polyline added to exports
- `src/theme/colors.ts` — provides `colors.accent` ('#8DC28A') for default sparkline color
- `src/types/index.ts` — `CategorySummary.sparklinePoints: number[]` defines the data shape this component will receive (reference only, component takes raw `number[]`)

## Expected Output

- `__mocks__/react-native-svg.js` — modified with `Polyline` export added
- `src/components/MiniSparkline.tsx` — new file, pure presentational SVG sparkline component
- `src/components/__tests__/MiniSparkline.test.tsx` — new file, 8 unit tests covering normal + edge cases
