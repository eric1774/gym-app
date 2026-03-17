# T01: 06-protein-intake-chart 01

**Slice:** S03 — **Milestone:** M001

## Description

Add a protein intake line chart with time range filter pills to the Protein screen.

Purpose: Users can visualize protein intake trends over time (VIS-01) and filter by 1W/1M/3M/All ranges (VIS-02), enabling them to track consistency and progress toward their daily goal.

Output: ProteinChart component with filter pills, goal line overlay, downsampling for performance; ProteinScreen restructured to place chart between Add Meal button and meal list.

## Must-Haves

- [ ] "User can scroll down on the Protein screen and see a line chart of daily protein totals"
- [ ] "User can tap filter pills (1W / 1M / 3M / All) to change the chart time range"
- [ ] "Chart shows a dashed goal line at the current protein goal value"
- [ ] "Chart renders smoothly with 60+ data points without lag"
- [ ] "No data yet placeholder appears when selected range has zero data"

## Files

- `src/components/ProteinChart.tsx`
- `src/screens/ProteinScreen.tsx`
