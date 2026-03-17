# T01: 14-superset-support 01

**Slice:** S11 — **Milestone:** M001

## Description

Add superset data layer (migration v7, types, DB functions) and superset grouping UI in DayDetailScreen so users can create and manage superset exercise groups within program days.

Purpose: SUP-01 requires users to group 2-3 exercises as a superset with visual confirmation. This plan delivers the full data foundation and program-view UX.
Output: Working superset creation/removal in program day detail, with lightning bolt badges and shared container for grouped exercises.

## Must-Haves

- [ ] "User can tap SS button in DayDetailScreen header to enter multi-select mode"
- [ ] "User can select 2-3 adjacent exercises and group them as a superset"
- [ ] "Grouped exercises show a lightning bolt badge and shared accentDim background container in program view"
- [ ] "User can ungroup a superset by tapping the lightning bolt badge and confirming"

## Files

- `src/types/index.ts`
- `src/db/migrations.ts`
- `src/db/programs.ts`
- `src/screens/DayDetailScreen.tsx`
- `src/components/ExerciseTargetRow.tsx`
