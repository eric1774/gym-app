# Decisions Register

<!-- Append-only. Never edit or remove existing rows.
     To reverse a decision, add a new row that supersedes it.
     Read this file at the start of any planning or research phase. -->

| # | When | Scope | Decision | Choice | Rationale | Revisable? |
|---|------|-------|----------|--------|-----------|------------|
| D002 | M002-S01 | architecture | Category sparkline data representation | Per-session max best value across all exercises in that category, with JS-side Map grouping from a single SQL query | Avoids N+1 queries per category. Single SQL fetch + JS grouping is simpler and performant for the ~7 categories with modest data volumes. Sparkline shows category-level trend rather than per-exercise detail. | Yes |
| D001 | M002-S01 | architecture | Category measurementType determination | Majority rule across exercises in the category | A category with 4 reps exercises and 1 timed exercise should display as reps. Majority rule gives the most useful default for display formatting (weight vs duration). | Yes |
| D003 | M002-S02 | ui | CategorySummaryCard delta formatting for insufficient data | Return null (hide delta) when sparklinePoints has fewer than 2 data points; show '–' for non-positive delta | A delta needs at least 2 points to be meaningful. Hiding instead of showing '0' or a dash avoids confusing users who just started tracking. Non-positive deltas show '–' to avoid showing "-X kg" which could be demotivating. | Yes |
| D004 | M002-S03 | architecture | Where to compute 30-day stale threshold for category cards | Inline in DashboardScreen render map rather than in the data layer | Keeps the data layer pure (returns raw lastTrainedAt timestamps) and the presentation logic in the component. The 30-day threshold is a UI concern — if the threshold changes or becomes user-configurable, only the screen needs updating, not the DB queries. | Yes |
| D005 | M002-S04 | architecture | CategoryProgressScreen route params type handling | Use `category as any` cast when passing route param string to getCategoryExerciseProgress which expects ExerciseCategory union | Route params in React Navigation are typed as `string` but the DB function expects the `ExerciseCategory` union type. Runtime values always match because they originate from CategorySummary data. A stricter fix would narrow the type in DashboardStackParamList, but that's a cross-cutting change across navigation types — deferred as low risk. | Yes — could tighten DashboardStackParamList to use ExerciseCategory instead of string |
