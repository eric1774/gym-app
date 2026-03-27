---
phase: 26
plan: 01
subsystem: hr-data-persistence
tags: [heart-rate, sqlite, sessions, workout-summary, calendar]
dependency_graph:
  requires: [HeartRateContext, sessions.ts, calendar.ts, WorkoutScreen, CalendarDayDetailScreen]
  provides: [HR sample buffer flush, avg/peak HR persistence, HR stats in summary and calendar]
  affects: [WorkoutSession type, CalendarSessionDetail type, FullDataExport type]
tech_stack:
  added: []
  patterns: [useRef buffer pattern, batch DB flush on session end, conditional UI rendering]
key_files:
  created: []
  modified:
    - src/types/index.ts
    - src/db/sessions.ts
    - src/db/calendar.ts
    - src/db/dashboard.ts
    - src/context/HeartRateContext.tsx
    - src/screens/WorkoutScreen.tsx
    - src/screens/CalendarDayDetailScreen.tsx
    - src/db/__tests__/sessions.test.ts
    - src/db/__tests__/sessions.mapper.test.ts
decisions:
  - "D-05/D-06 honored: all BPM notifications buffered in hrSamplesRef, single batch flush on session end only"
  - "flushHRSamples returns {avgHr, peakHr} so caller can use values in summary screen without extra DB query"
  - "Avg HR computed as Math.round of arithmetic mean; peak HR as Math.max of buffered BPM values"
  - "No-HR sessions: avgHr/peakHr null in WorkoutSession and CalendarSessionDetail — UI hides HR rows entirely"
  - "dashboard.ts FullDataExport fixed to include avgHr/peakHr to satisfy TypeScript WorkoutSession contract"
metrics:
  duration: "9 minutes"
  completed: "2026-03-27"
  tasks: 8
  files_modified: 9
---

# Phase 26 Plan 01: HR Data Persistence Summary

HR samples accumulated in an in-memory useRef buffer during workout are batch-flushed to SQLite on session end, with avg/peak HR computed from the buffer and displayed on the workout summary card and calendar day detail view.

## Objective

Wire the HR sample buffer through to DB persistence and surface avg/peak HR in both post-workout and historical views.

## Tasks Completed

| Task | Description | Commit |
|------|-------------|--------|
| 1 | Add avgHr/peakHr to WorkoutSession type; update rowToSession mapper | 3ef312d |
| 2 | Add flushHRSamples and updateSessionHR functions to sessions.ts | b3daa77 |
| 3 | Add hrSamplesRef buffer and flushHRSamples context action to HeartRateContext | 2048e1d |
| 4 | Wire flushHRSamples into WorkoutScreen end-workout flow | e2ef40a |
| 5 | Add avgHr/peakHr to CalendarSessionDetail type; update getDaySessionDetails query | e68856f |
| 6 | Display avg/peak HR stat rows on WorkoutSummary component | baba016 |
| 7 | Display avg/peak HR stats in CalendarDayDetailScreen (second row below main stats) | 6e73c38 |
| 8 | Tests for flushHRSamples, updateSessionHR, and HR mapper; fix dashboard.ts | c0abd8d |

## Implementation Notes

### Sample Buffer Pattern

`HeartRateContext` now maintains `hrSamplesRef = useRef<HRSample[]>([])` where `HRSample = {bpm, recordedAt}`. Every valid BPM notification from BLE pushes to this array. All three `monitorCharacteristicForService` callbacks (connectToDevice, attemptAutoReconnect, reconnect backoff) were updated consistently.

### Flush on Session End

`flushHRSamples(sessionId)` in `HeartRateContext`:
1. Returns `{avgHr: null, peakHr: null}` and exits immediately if buffer is empty (no-HR session is a no-op)
2. Computes `avgHr = Math.round(mean(bpms))` and `peakHr = Math.max(...bpms)`
3. Calls `dbFlushHRSamples(sessionId, samples)` — sequential INSERT per sample
4. Calls `updateSessionHR(sessionId, avgHr, peakHr)` — single UPDATE on workout_sessions
5. Clears buffer: `hrSamplesRef.current = []`
6. Returns `{avgHr, peakHr}` to caller

WorkoutScreen destructures `flushHRSamples` from `useHeartRate()` and calls `await flushHRSamples(session.id)` before `endSession()`. The returned HR values are stored in `summaryData`.

### Display

**WorkoutSummary** — Two new stat rows added after the existing stats:
- "Avg HR" + value in "N bpm" format
- "Peak HR" + value in "N bpm" format
Both are conditionally rendered only when `avgHr != null`.

**CalendarDayDetailScreen** — A second `<View style={styles.statsRow}>` added below the main stats row, rendering the same HR stat items conditionally on `session.avgHr != null`.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] dashboard.ts TypeScript error after WorkoutSession type change**
- **Found during:** Task 8 TypeScript verification
- **Issue:** `src/db/dashboard.ts` builds `FullDataExport` sessions array using object literals without the new `avgHr`/`peakHr` fields, causing TS2345 type error
- **Fix:** Added `avgHr: r.avg_hr ?? null` and `peakHr: r.peak_hr ?? null` to the sessions.push() call in dashboard.ts
- **Files modified:** `src/db/dashboard.ts`
- **Commit:** c0abd8d

## Known Stubs

None — all HR data flows from real BPM buffer through DB functions to UI rendering. No hardcoded or placeholder values.

## Self-Check: PASSED

All 9 modified files verified to exist on disk. All 8 task commits verified in git history.
