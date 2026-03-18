---
id: S03
milestone: M002
status: ready
---

# S03: Dashboard Redesign — Category Cards — Context

<!-- Slice-scoped context. Milestone-only sections (acceptance criteria, completion class,
     milestone sequence) do not belong here — those live in the milestone context. -->

## Goal

Rewire `DashboardScreen` to render ~7 full-width `CategorySummaryCard` components with real sparkline data from `getCategorySummaries()`, replacing the flat 30+ exercise list while keeping the Next Workout card untouched.

## Why this Slice

S01 provides the data layer and S02 provides the presentational components. This slice wires them together into the actual dashboard — the primary user-facing surface. It must land before S04 (CategoryProgressScreen) because S04 depends on tapping a category card from this redesigned dashboard to navigate forward.

## Scope

### In Scope

- Replace flat exercise list in `DashboardScreen` with `CategorySummaryCard` components
- Call `getCategorySummaries()` on focus via existing `useFocusEffect` pattern
- Flat list of individual category cards — no group headers (STRENGTH TRAINING / CORE / CARDIO headers removed)
- Skeleton placeholder cards (~3 ghost cards) shown while data loads
- Compute `isStale` from `lastTrainedAt` (30-day threshold) and pass to each card
- `onPress` handler on each card — wired to navigate to `CategoryProgressScreen` (route added here, screen built in S04)
- Delete old flat exercise list code: `SubCategorySection`, `groupByCategory`, `CATEGORY_GROUP_ORDER`, `RecentExercise` interface, `getRecentlyTrainedExercises` import
- Next Workout card remains completely unchanged
- Existing empty state message preserved as-is

### Out of Scope

- Building `CategoryProgressScreen` (S04)
- Modifying `MiniSparkline` or `CategorySummaryCard` components (S02 delivered those)
- Pull-to-refresh — data refreshes on tab focus only
- Updating the empty state message text
- Changing the Next Workout card in any way
- Adding the `CategoryProgress` route to the navigator (may need a stub for `onPress` until S04 lands)

## Constraints

- Must use `CategorySummaryCard` from S02 as-is — no modifications to the component in this slice
- Must use `getCategorySummaries()` from S01 as-is — no query changes
- Must use existing theme tokens (dark-mint-card-ui)
- Stale threshold is 30 days, computed in the dashboard from `lastTrainedAt`
- Data refresh pattern: `useFocusEffect` only (matches existing behavior)

## Integration Points

### Consumes

- `getCategorySummaries()` from `src/db/dashboard.ts` — fetches category data on focus
- `CategorySummary` type from `src/types/index.ts` — data shape for each card
- `CategorySummaryCard` component from `src/components/` — renders each category card
- `src/theme/colors.ts`, `spacing.ts`, `typography.ts` — existing theme tokens

### Produces

- Redesigned `DashboardScreen` with category cards — consumed visually by the user, and by S04 which adds navigation from card taps
- `onPress` wiring on each card ready for `CategoryProgressScreen` navigation (S04 completes the route)

## Implementation Decisions

- **Category grouping:** Flat list of ~7 individual category cards. No group headers (STRENGTH TRAINING / CORE & STABILITY / CARDIO removed).
- **Old code removal:** Fully delete `SubCategorySection`, `groupByCategory`, `CATEGORY_GROUP_ORDER`, flat exercise rendering, and the `getRecentlyTrainedExercises` import. Clean break — no feature flags.
- **Loading state:** Skeleton placeholder cards (~3 ghost cards with muted backgrounds) while `getCategorySummaries()` resolves. Avoids layout shift and feels polished.
- **Data refresh:** Re-fetch on tab focus only (`useFocusEffect`). No pull-to-refresh.
- **Empty state:** Existing message preserved as-is: "No exercises trained yet. Start a workout to see your progress here."
- **Stale computation:** `isStale = (Date.now() - lastTrainedAt) > 30 days`, computed in the dashboard and passed as a prop to each card.

## Open Questions

- **CategoryProgress navigation stub:** If the `CategoryProgressScreen` route doesn't exist yet when this slice lands, the `onPress` handler may need a temporary no-op or console.warn. S04 will wire the real navigation. — Current thinking: add the route declaration with a placeholder screen in this slice so navigation doesn't crash; S04 replaces the placeholder with the real screen.
