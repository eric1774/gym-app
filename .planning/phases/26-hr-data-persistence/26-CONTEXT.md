# Phase 26: HR Data Persistence - Context

**Gathered:** 2026-03-27
**Status:** Ready for planning

<domain>
## Phase Boundary

HR samples collected during a workout are reliably stored without impacting set-logging speed, and avg/peak HR computed from those samples is visible on the workout summary card and in the calendar day detail view.

Requirements covered: DATA-01, DATA-02, DATA-03, DATA-04.

</domain>

<decisions>
## Implementation Decisions

### Summary Card HR Display
- **D-01:** Avg HR and peak HR appear as **inline stat rows** in the existing workout completion summary stats list, alongside duration, sets, and volume. Same visual treatment as existing stats.
- **D-02:** No zone label on summary — just the BPM numbers. Zone display is Phase 27 scope.

### Calendar History HR Display
- **D-03:** Avg HR and peak HR appear **inline with session stats** in CalendarDayDetailScreen, consistent with summary card.
- **D-04:** HR stats render on a **second line below** the main stats row (duration/sets/volume) to avoid crowding on narrow screens.

### Sample Collection & Flush
- **D-05:** Buffer **every BLE notification** (~1/sec) into the in-memory useRef array. No downsampling. A 60-min workout produces ~3,600 samples; batch INSERT handles this in ~50ms.
- **D-06:** **Single batch flush on session end only** — no periodic background flushes during the workout. Protects set-logging speed (no DB writes during active workout). Aligns with Phase 24 D-10.
- **D-07:** If app crashes or is killed mid-workout, buffered HR samples are **lost and accepted**. The session itself is incomplete; keeping implementation simple is the priority.

### No-HR Session Behavior
- **D-08:** If avg_hr is null (no HR monitor connected), **hide the HR stat rows entirely** on both summary card and calendar view. Users who never use HR see zero change to existing UI. Consistent with Phase 25 D-07 (connection indicator only visible when device is paired).
- **D-09:** If HR monitor disconnects mid-workout producing partial data, **still compute and show avg/peak** from whatever samples were collected. Any data is better than none.

### Carried Forward (from Phase 24 & 25)
- **D-10:** HR samples buffer in a useRef during workout; batch-flushed to SQLite in one transaction on session end (Phase 24 D-10).
- **D-11:** BleManager is module-level singleton in BLEHeartRateService.ts (Phase 24 D-09).
- **D-12:** HeartRateContext mirrors TimerContext pattern (Phase 24 D-13).
- **D-13:** heart_rate_samples table and avg_hr/peak_hr columns on workout_sessions already exist (migration v8).

### Claude's Discretion
- Internal structure of the sample buffer (array of {bpm, timestamp} vs flat arrays)
- Exact SQL for batch INSERT of samples and UPDATE of avg_hr/peak_hr
- How avg_hr is computed (simple arithmetic mean of all buffered BPM values)
- How peak_hr is computed (max of all buffered BPM values)
- Where in the session completion flow the flush is triggered (before or after completeSession)
- WorkoutSession TypeScript type updates to include optional avgHr/peakHr fields
- DB query changes to return avg_hr/peak_hr in session fetches

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project Context
- `.planning/PROJECT.md` — Project overview, constraints, v1.6 milestone definition
- `.planning/REQUIREMENTS.md` — DATA-01 through DATA-04 requirements with traceability
- `.planning/ROADMAP.md` — Phase 26 success criteria (4 items), phase dependencies

### Phase 24 & 25 Foundation (prerequisite code)
- `.planning/phases/24-ble-foundation/24-CONTEXT.md` — All Phase 24 decisions (D-01 through D-14), especially D-10 (buffer/flush pattern) and D-09 (BleManager singleton)
- `.planning/phases/25-connection-management/25-CONTEXT.md` — Phase 25 decisions, especially D-07 (HR UI only when paired) and D-14 (disconnect behavior)

### Existing Code
- `src/context/HeartRateContext.tsx` — HeartRateProvider with live BPM state; sample buffering will be added here
- `src/db/sessions.ts` — completeSession(), deleteSession() (already cascades heart_rate_samples), session CRUD
- `src/db/schema.ts` — CREATE_HEART_RATE_SAMPLES_TABLE DDL (id, session_id, bpm, recorded_at)
- `src/db/migrations.ts` — Migration v8 (heart_rate_samples + avg_hr/peak_hr columns)
- `src/screens/WorkoutScreen.tsx` — Workout summary flow where HR stats will display
- `src/screens/CalendarDayDetailScreen.tsx` — Calendar day detail where HR stats will display
- `src/types/index.ts` — WorkoutSession interface (needs avg_hr/peak_hr fields added)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `HeartRateContext.tsx` — Already has `currentBpm` state updated from BLE characteristic monitoring; sample buffer can accumulate from the same callback
- `completeSession()` in sessions.ts — Natural hook point for triggering the batch flush
- `heart_rate_samples` table — Already created by migration v8, ready for INSERTs
- `avg_hr`/`peak_hr` columns — Already on workout_sessions via migration v8, ready for UPDATEs

### Established Patterns
- Context providers (TimerContext, SessionContext) — HeartRateContext follows this pattern
- Session completion flow — WorkoutScreen calls completeSession(), then renders summary
- Calendar data fetching — CalendarDayDetailScreen fetches session data including duration/volume

### Integration Points
- HeartRateContext → sessions.ts: New flush function called during session end
- WorkoutScreen summary → sessions.ts: Query must return avg_hr/peak_hr for completed session
- CalendarDayDetailScreen → calendar.ts/sessions.ts: Query must return avg_hr/peak_hr for past sessions

</code_context>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches for the data persistence layer. The key constraint is that no DB writes happen during an active workout to protect set-logging speed.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 26-hr-data-persistence*
*Context gathered: 2026-03-27*
