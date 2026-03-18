# S03: Dashboard Redesign — Category Cards — UAT

**Milestone:** M002
**Written:** 2026-03-17

## UAT Type

- UAT mode: artifact-driven
- Why this mode is sufficient: S03 is integration wiring — the dashboard renders S02 components with S01 data. Jest tests verify rendering, stale dimming, navigation, and preservation of existing cards. On-device visual UAT is deferred to S04 final assembly.

## Preconditions

- Working directory: `.gsd/worktrees/M002`
- Node modules installed (`node_modules` exists)
- All S01 and S02 files in place (db/dashboard.ts, types/index.ts, components/CategorySummaryCard.tsx, components/MiniSparkline.tsx)

## Smoke Test

Run `npx jest src/screens/__tests__/DashboardScreen.test.tsx --verbose` — all 9 tests pass.

## Test Cases

### 1. Dashboard title renders

1. Run `npx jest src/screens/__tests__/DashboardScreen.test.tsx -t "renders Dashboard title" --verbose`
2. **Expected:** Test passes. "Dashboard" text found in rendered output.

### 2. Empty state when no categories

1. Run `npx jest src/screens/__tests__/DashboardScreen.test.tsx -t "shows empty state when no categories" --verbose`
2. **Expected:** Test passes. "No exercises trained yet" text rendered when `getCategorySummaries` returns `[]`.

### 3. Category cards render from summary data

1. Run `npx jest src/screens/__tests__/DashboardScreen.test.tsx -t "renders category cards from summary data" --verbose`
2. **Expected:** Test passes. Two cards render showing capitalized category names ("Chest", "Legs") and exercise counts ("3 exercises", "4 exercises").

### 4. Stale card dimming

1. Run `npx jest src/screens/__tests__/DashboardScreen.test.tsx -t "renders stale card with dimmed opacity" --verbose`
2. **Expected:** Test passes. Card with `lastTrainedAt` 45 days ago has opacity 0.4.

### 5. Non-stale card full opacity

1. Run `npx jest src/screens/__tests__/DashboardScreen.test.tsx -t "renders non-stale card with full opacity" --verbose`
2. **Expected:** Test passes. Card with `lastTrainedAt` 5 days ago has opacity 1.

### 6. Next Workout card preserved

1. Run `npx jest src/screens/__tests__/DashboardScreen.test.tsx -t "renders Next Workout card when data exists" --verbose`
2. **Expected:** Test passes. Next Workout card renders with workout day name and exercise count.

### 7. Active Workout card preserved

1. Run `npx jest src/screens/__tests__/DashboardScreen.test.tsx -t "renders Active Workout card when session exists" --verbose`
2. **Expected:** Test passes. Active Workout card renders with "Continue Workout" button.

### 8. Navigation to CategoryProgress on card press

1. Run `npx jest src/screens/__tests__/DashboardScreen.test.tsx -t "navigates to CategoryProgress on card press" --verbose`
2. **Expected:** Test passes. Pressing a category card calls `navigation.navigate('CategoryProgress', { category: 'chest' })`.

### 9. Multiple category cards

1. Run `npx jest src/screens/__tests__/DashboardScreen.test.tsx -t "renders multiple category cards" --verbose`
2. **Expected:** Test passes. Three cards rendered when three `CategorySummary` objects are provided.

### 10. Dead code removal verification

1. Run `grep -c "getRecentlyTrainedExercises\|RecentExercise\|SubCategory\|GroupData\|CATEGORY_GROUP_ORDER\|groupByCategory" src/screens/DashboardScreen.tsx`
2. **Expected:** Output is `0` — no references to old flat-list code remain.

### 11. S02 regression check

1. Run `npx jest src/components/__tests__/CategorySummaryCard.test.tsx --verbose`
2. **Expected:** 9/9 tests pass — S02 CategorySummaryCard component unaffected by S03 changes.

### 12. TypeScript compilation

1. Run `npx tsc --noEmit 2>&1 | grep -v "test\." | grep "error TS"`
2. **Expected:** No output — no new type errors in non-test production files.

### 13. CategoryProgress route exists

1. Run `grep "CategoryProgress" src/navigation/TabNavigator.tsx`
2. **Expected:** Three matches: in `DashboardStackParamList` type, placeholder component registration, and `DashboardStack.Screen` entry.

## Edge Cases

### Empty database (no sessions ever recorded)

1. `getCategorySummaries()` returns `[]`
2. **Expected:** Dashboard shows "No exercises trained yet" empty state — no crash, no blank screen.

### All categories stale (30+ days old)

1. All `CategorySummary` objects have `lastTrainedAt` older than 30 days
2. **Expected:** All cards render with opacity 0.4 — dimmed but still visible and tappable.

### getCategorySummaries throws an error

1. Database query fails
2. **Expected:** Error caught silently, `categories` state stays `[]`, empty state renders. No crash.

### Single category with 1 exercise

1. Only one `CategorySummary` with `exerciseCount: 1`
2. **Expected:** Single card renders showing "1 exercises" (count formatting — cosmetic only).

## Failure Signals

- Any of the 9 DashboardScreen tests failing indicates broken integration
- `getRecentlyTrainedExercises` appearing anywhere in DashboardScreen.tsx means dead code wasn't fully removed
- `CategoryProgress` missing from TabNavigator.tsx means navigation will crash at runtime
- S02 CategorySummaryCard tests regressing means the component contract changed unexpectedly
- Full test suite showing new failures beyond the 4 pre-existing protein.test.ts streak failures indicates regressions

## Not Proven By This UAT

- On-device visual rendering of category cards, sparklines, and stale dimming (deferred to S04 device UAT)
- Real SQLite data flowing through the full pipeline (tests use mocks)
- CategoryProgress screen functionality (placeholder only — S04 builds the real screen)
- Navigation chain beyond Dashboard → CategoryProgress (S04 completes the chain)

## Notes for Tester

- The 4 failing tests in `protein.test.ts` (getStreakDays) are pre-existing and unrelated to this slice — ignore them.
- TypeScript compilation shows errors in test files due to `@test-utils` module alias not being in tsconfig — these are pre-existing and don't affect runtime or Jest execution.
- The `CategoryProgressPlaceholder` screen just renders "Category Progress — Coming Soon" — this is intentional and will be replaced in S04.
