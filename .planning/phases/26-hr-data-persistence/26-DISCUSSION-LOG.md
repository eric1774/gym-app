# Phase 26: HR Data Persistence - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-03-27
**Phase:** 26-hr-data-persistence
**Areas discussed:** Summary card HR display, Calendar history HR display, Sample collection rate, No-HR session behavior

---

## Summary Card HR Display

### Placement

| Option | Description | Selected |
|--------|-------------|----------|
| Inline stat row | Add avg HR and peak HR as two new stat items in the existing summary stats row (alongside volume, duration, sets, etc.). Consistent with current layout. | ✓ |
| Dedicated HR card | A separate card/section below the main stats showing avg HR, peak HR, and possibly a zone label. More prominent but takes more space. | |
| Compact footer line | A single line below the main stats: '❤️ 142 avg / 178 peak bpm'. Minimal footprint. | |

**User's choice:** Inline stat row
**Notes:** Keeps HR stats consistent with existing summary layout.

### Zone Label

| Option | Description | Selected |
|--------|-------------|----------|
| No zone label | Just the BPM numbers. Zone display is Phase 27's live display scope — keep the summary simple for now. | ✓ |
| Zone label on avg HR | Show which zone the average HR fell in (e.g., 'Zone 3 — Aerobic'). Gives workout intensity context. | |

**User's choice:** No zone label
**Notes:** Zone display deferred to Phase 27.

---

## Calendar History HR Display

### Placement

| Option | Description | Selected |
|--------|-------------|----------|
| Inline with session stats | Add avg/peak HR to the existing session detail row in CalendarDayDetailScreen, same style as duration/volume. Consistent with summary card decision. | ✓ |
| Separate HR section | A small sub-section under the session stats dedicated to HR data. More visible but adds vertical space. | |

**User's choice:** Inline with session stats

### Layout

| Option | Description | Selected |
|--------|-------------|----------|
| Second line below | HR stats on their own line under the main stats. Prevents the row from getting too crowded on narrow screens. | ✓ |
| Same row, appended | Everything on one line: duration, sets, volume, avg HR, peak HR. Compact but may wrap on small screens. | |

**User's choice:** Second line below
**Notes:** Avoids crowding on narrow phone screens.

---

## Sample Collection Rate

### Collection Method

| Option | Description | Selected |
|--------|-------------|----------|
| Every BLE notification | Buffer every BPM value the watch sends (~1/sec). A 60-min workout = ~3,600 rows. Simple, no data loss, and SQLite handles this easily in a single batch insert. | ✓ |
| Fixed interval (every 5s) | Only record one sample every 5 seconds, discarding intermediate values. 60-min workout = ~720 rows. Less data but loses beat-to-beat resolution. | |
| You decide | Claude picks the approach based on what makes sense technically. | |

**User's choice:** Every BLE notification

### Crash Safety

| Option | Description | Selected |
|--------|-------------|----------|
| Accept data loss | If the app dies, HR samples for that session are lost. Session itself is already incomplete. Keeps implementation simple and protects set-logging speed. | ✓ |
| Periodic flush every 5 min | Flush the buffer to SQLite every 5 minutes as a safety net. Adds background DB writes during the workout but preserves most HR data on crash. | |

**User's choice:** Accept data loss
**Notes:** Simplicity and set-logging speed take priority over crash recovery for HR data.

---

## No-HR Session Behavior

### Display When No HR Data

| Option | Description | Selected |
|--------|-------------|----------|
| Hide HR rows entirely | If avg_hr is null, don't render the HR stat rows at all. Users who never use HR see zero change. Consistent with Phase 25 D-07. | ✓ |
| Show dashes | Always show HR rows but display '-- bpm' when no data. Makes the feature discoverable but adds clutter for non-HR users. | |
| You decide | Claude picks based on existing patterns in the codebase. | |

**User's choice:** Hide HR rows entirely

### Partial Data

| Option | Description | Selected |
|--------|-------------|----------|
| Yes, show partial stats | Compute avg/peak from whatever samples were collected. Any data is better than none. User already saw the disconnect indicator during the workout. | ✓ |
| Only if >50% of session | Show HR stats only if samples span more than half the workout duration. Avoids misleading stats from a brief connection. | |

**User's choice:** Yes, show partial stats
**Notes:** Any collected data is useful; disconnect was already visible in real-time.

---

## Claude's Discretion

- Internal structure of the sample buffer
- SQL for batch INSERT and UPDATE
- avg_hr/peak_hr computation approach
- Flush trigger placement in session completion flow
- TypeScript type updates
- DB query changes for fetching HR data

## Deferred Ideas

None — discussion stayed within phase scope.
