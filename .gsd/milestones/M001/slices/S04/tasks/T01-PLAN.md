# T01: 07-polish-and-differentiators 01

**Slice:** S04 — **Milestone:** M001

## Description

Add streak and 7-day average data queries plus a compact display row component.

Purpose: Users get motivational feedback (streak count) and informational context (weekly average) on their protein tracking consistency.
Output: Two new repository functions and a StreakAverageRow component ready for ProteinScreen integration.

## Must-Haves

- [ ] "Streak query returns correct count of consecutive days where total protein >= goal, counting backwards from today"
- [ ] "7-day average query returns average protein across only days with logged meals in the last 7 days"
- [ ] "StreakAverageRow displays flame emoji + streak text + dot separator + 7-day avg when both have data"
- [ ] "StreakAverageRow hides entirely when streak is 0 AND no meals in last 7 days"
- [ ] "Streak includes today if today's total already meets the goal"

## Files

- `src/db/protein.ts`
- `src/db/index.ts`
- `src/components/StreakAverageRow.tsx`
