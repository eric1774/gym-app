# S07: Pr Detection Volume Tracking

**Goal:** Create the PR detection query and animated PR toast component as independent building blocks for Phase 10.
**Demo:** Create the PR detection query and animated PR toast component as independent building blocks for Phase 10.

## Must-Haves


## Tasks

- [x] **T01: 10-pr-detection-volume-tracking 01**
  - Create the PR detection query and animated PR toast component as independent building blocks for Phase 10.

Purpose: These are the two new artifacts needed before wiring into WorkoutScreen. Separating creation from integration keeps each plan focused.
Output: `checkForPR` function in db/sets.ts, `PRToast` component with imperative ref in PRToast.tsx, `prGold` color in theme.
- [x] **T02: 10-pr-detection-volume-tracking 02**
  - Wire PR detection, double haptic, and running volume total into WorkoutScreen. This integrates the building blocks from Plan 01 into the live workout flow.

Purpose: Connects the PR query and toast component to the actual set logging flow, and adds volume tracking to the header.
Output: Fully functional PR celebration and volume display in the workout screen.

## Files Likely Touched

- `src/db/sets.ts`
- `src/components/PRToast.tsx`
- `src/theme/colors.ts`
- `src/screens/WorkoutScreen.tsx`
