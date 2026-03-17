# T01: 10-pr-detection-volume-tracking 01

**Slice:** S07 — **Milestone:** M001

## Description

Create the PR detection query and animated PR toast component as independent building blocks for Phase 10.

Purpose: These are the two new artifacts needed before wiring into WorkoutScreen. Separating creation from integration keeps each plan focused.
Output: `checkForPR` function in db/sets.ts, `PRToast` component with imperative ref in PRToast.tsx, `prGold` color in theme.

## Must-Haves

- [ ] "PR detection query correctly identifies when a set exceeds all previous weight at that rep count for that exercise"
- [ ] "PR toast component renders a gold/amber animated banner that slides in from top and auto-dismisses after 3 seconds"
- [ ] "PR toast queue shows toasts sequentially when multiple PRs fire close together"

## Files

- `src/db/sets.ts`
- `src/components/PRToast.tsx`
- `src/theme/colors.ts`
