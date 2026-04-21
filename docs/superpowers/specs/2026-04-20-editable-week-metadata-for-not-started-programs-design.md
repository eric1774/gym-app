# Editable Week Metadata for Not-Started Programs

**Status:** Draft
**Date:** 2026-04-20

## Problem

Users can edit a week's name and details on an **active** program via `ProgramDetailScreen` — the "WEEK N OF M" card, the "WEEK DETAILS" card, and the "+ Add week name & details" prompt all open `WeekEditModal` for `program.currentWeek`. For a **not-started** program (`startDate === null`), these entry points are hidden behind `isActivated && …` gates, so there is no way to prepare week metadata ahead of activation.

A parallel limitation exists even for active programs: the only editable week is the current one. To rename week 3 while sitting on week 1, a user would have to advance through weeks.

## Goal

Let the user edit week name and week details for **any week** of a program, regardless of whether the program has been started.

The modal experience must be identical to the existing "+ add week name & details" flow on active programs.

## Non-goals

- No changes to `ProgramDetailScreen`'s current activation-aware UI. The existing current-week editor stays exactly as it is.
- No changes to `WeekEditModal`'s visual design, props, or save behavior.
- No DB schema or migration changes.
- No per-day override changes. The existing `WeekDayEditor` navigation for each day stays as-is.

## Approach

Add a single entry point to `WeekEditModal` from `CustomizeWeeksScreen`: make each week's header row (`W{n} <name> ★` / `inherits base`) tappable. Tapping opens `WeekEditModal` seeded with that week's current name and details.

`CustomizeWeeksScreen` is the right place because:

- It is already reachable from not-started programs via the "Customize Weeks" button on `ProgramDetailScreen`.
- It already lists every week (`W1..WN`) and already fetches each week's name.
- Adding a second editor to `ProgramDetailScreen` would duplicate UI and require inventing a "current week" concept for not-started programs.

## UI

The entire `weekHeaderRow` `View` in `CustomizeWeeksScreen` is wrapped in a `TouchableOpacity`. No new visual chrome — no pencil icon, no "Edit" pill, no chevron. Press feedback is the standard `activeOpacity={0.7}` used elsewhere in the app.

Tapping *anywhere* inside the header row — including the `3 overrides` / `inherits base` indicator on the right — opens the editor for that week. The indicator stays a read-only visual element; it does not have its own tap handler.

```
W1  Ramp Phase  ★         3 overrides      ← tap anywhere on this row
  Day 1                                  ›
  Day 2                                  ›
W2  Volume Block          inherits base    ← tap to edit W2
  Day 1                                  ›
W3                        inherits base    ← empty-name week still tappable
  Day 1                                  ›
```

The per-day rows below each header keep their existing navigation to `WeekDayEditor` — unchanged.

## State and data flow

### CustomizeWeeksScreen

Widen the cached per-week state from "name only" to the full `ProgramWeek` row so the modal can seed both fields:

- Replace `weekNames: Record<number, string | null>` with `weekData: Record<number, ProgramWeek | null>`.
- Populate it in the same `Promise.all` already running in `refresh()` — one extra string per week, trivial overhead.
- Add `editingWeek: number | null` state to drive modal visibility and tell the modal which week's data to seed.

### Save handler

On save:

1. Call existing `upsertWeekData(programId, editingWeek, name, details)`.
2. Call existing `refresh()` so week names and override counts re-render.
3. Close the modal (clear `editingWeek`).

No optimistic update. `refresh()` is fast enough, and a second code path for optimistic updates would add divergence risk without meaningful UX benefit.

### No activation gate

`WeekEditModal` is purely presentational. `upsertWeekData` already handles not-started programs (inserts into `program_weeks` normally; deletes the row when both fields are cleared). No branching on `program.startDate` is needed anywhere.

## Files changed

- `src/screens/CustomizeWeeksScreen.tsx` — widen state, add `TouchableOpacity` wrapper on header row, add `editingWeek` state, render `WeekEditModal`, pass save handler.

No other files touched.

## Testing

### Automated

The DB path is already covered by existing `upsertWeekData` tests in `src/db/__tests__/`. No new DB tests needed — this change is UI-only.

### Manual (emulator)

1. **Not-started program, prepare week 2 ahead of time.** Create a new 5-week program. Do not start it. Tap **Customize Weeks** → tap the `W2` header row → modal opens with empty fields → enter "Volume" + details → **Save**. Row updates inline to show "W2 Volume".
2. **Re-edit seeds correctly.** Tap `W2` again. Modal opens pre-filled with "Volume" and previously-entered details.
3. **Clear reverts.** Clear both fields in the modal → **Save**. Row reverts to just `W2` with `inherits base` on the right. Underlying `program_weeks` row is deleted by existing logic.
4. **Active program parity gain.** On an activated program currently at week 3, open Customize Weeks, tap the `W5` header row, edit week 5's name. Confirm active-program current-week editing via `ProgramDetailScreen` still works as before.
5. **Week 1 current-week editor unchanged.** Activate a program, open `ProgramDetailScreen`, tap the "+ add week name & details" prompt. Confirm the existing flow is unaffected.

## Risks

- **Discoverability.** With no visible affordance (no pencil, no pill), users may not realize the week header is tappable. Mitigation: the active-program experience has trained users on tappable week headers (the week-name link on `ProgramDetailScreen` uses the same pattern). If this proves to be a problem post-ship, adding a subtle affordance is cheap.
- **Accidental taps during scroll.** React Native's `TouchableOpacity` already distinguishes taps from scroll gestures. No additional handling needed.
