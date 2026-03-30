# Phase 27: Live Display & Settings UI - Context

**Gathered:** 2026-03-28
**Status:** Ready for planning

<domain>
## Phase Boundary

Users see their live BPM color-coded by HR zone in the workout header throughout a session, with a zone label alongside. Users can configure their age and max HR in Settings, and initiate device pairing from the Settings screen.

Requirements covered: HR-01, HR-02, HR-03, SET-01, SET-02.

</domain>

<decisions>
## Implementation Decisions

### Live BPM Display
- **D-01:** BPM is displayed as a **large, prominent element** (24-28pt) in the workout header — easy to read at arm's length between sets. Zone label sits below the BPM number.
- **D-02:** BPM section is placed **below the header stats row** (volume/sets) and above the exercise list. Always visible at the top without scrolling. Separated from header stats by a visual divider.
- **D-03:** BPM number has a **subtle pulse animation** on each new reading — mimics a heartbeat. Keeps the display feeling alive without being distracting.
- **D-04:** When device disconnects mid-workout, BPM shows "- -" and the **zone label is hidden entirely**. Clean signal — no data means no zone. Connection indicator continues showing state per Phase 25 D-14.

### Zone Color Styling
- **D-05:** The **BPM text color** changes to match the current HR zone. Zone label stays in neutral/secondary text color.
- **D-06:** Zone colors are the **existing HR_ZONES values** — Recovery=#90EE90, Easy=#00BFFF, Aerobic=#FFD700, Threshold=#FF8C00, Max=#FF4500. No adjustments.
- **D-07:** Zone transitions are **instant snap** — color changes immediately when BPM crosses a zone threshold. No smooth fade animation.

### Settings Screen Layout
- **D-08:** All HR settings in a **single "Heart Rate Monitor" section** in Settings: age input, max HR display (computed + override toggle), paired device info, and scan/unpair buttons.
- **D-09:** Age input is an **inline tappable number field** that opens the numeric keyboard. Computed max HR updates in real-time when age changes (on blur).
- **D-10:** Max HR shows the Tanaka-computed value with a toggle to enter a custom override (existing HRSettingsService.setMaxHrOverride already supports this).
- **D-11:** When no device is paired, Settings shows **empty fields** — "No device paired" with a "Scan for Devices" button. No special onboarding CTA. Age input is available immediately.
- **D-12:** Existing "Data" section (Export, Repair Database) moves below the Heart Rate section.

### Below/Above Zone Behavior
- **D-13:** When BPM is below Zone 1 (under 50% max HR), BPM is shown in **muted/gray color with no zone label**. Zone label appears once BPM crosses into Zone 1.
- **D-14:** When BPM exceeds Zone 5 (above 100% max HR), display stays as **Zone 5 — Max** with Zone 5 color. No special warning treatment.

### Carried Forward (from Phase 24, 25, 26)
- **D-15:** HR UI only visible when device is paired (Phase 25 D-07).
- **D-16:** Scan/pair only from Settings, not workout screen (Phase 25 D-12).
- **D-17:** Age required before pairing — inline prompt at scan time if not set (Phase 24 D-06/D-07).
- **D-18:** Max HR via Tanaka formula (208 - 0.7 x age), optional override (Phase 24 D-08/D-11).
- **D-19:** Connection indicator: green=connected, yellow=reconnecting, red=disconnected (Phase 25 D-06).
- **D-20:** Auto-reconnect on workout start only (Phase 25 D-09).

### Claude's Discretion
- Exact animation implementation for BPM pulse (Animated API vs LayoutAnimation)
- Heart icon treatment (static vs animated alongside BPM)
- Exact spacing/padding within the BPM display section
- Settings section card styling (consistent with dark-mint-card-ui)
- Zone computation utility function placement (inline vs shared util)
- How the custom max HR toggle/input is implemented (switch + conditional input)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project Context
- `.planning/PROJECT.md` — Project overview, constraints, v1.6 milestone definition, UI directive (dark-mint-card-ui)
- `.planning/REQUIREMENTS.md` — HR-01, HR-02, HR-03, SET-01, SET-02 requirements with traceability
- `.planning/ROADMAP.md` — Phase 27 success criteria (5 items), phase dependencies

### Prior Phase Decisions
- `.planning/phases/24-ble-foundation/24-CONTEXT.md` — Foundation decisions (D-06 age gating, D-08 Tanaka formula, D-09 BleManager singleton, D-12 AsyncStorage)
- `.planning/phases/25-connection-management/25-CONTEXT.md` — Connection UX decisions (D-06 indicator, D-07 paired-only UI, D-12 Settings-only pairing)
- `.planning/phases/26-hr-data-persistence/26-CONTEXT.md` — Data persistence decisions (D-02 no zone on summary, D-08 hide HR when null)

### Existing Code
- `src/context/HeartRateContext.tsx` — HeartRateProvider with `currentBpm` state, `deviceState`, scan/connect/disconnect methods, `flushHRSamples`
- `src/services/HRSettingsService.ts` — `getHRSettings()`, `setAge()`, `setMaxHrOverride()`, `getComputedMaxHR()`, `setPairedDeviceId()`, `clearPairedDevice()`
- `src/services/BLEHeartRateService.ts` — `bleManager` singleton, HR service/characteristic UUIDs
- `src/types/index.ts` — `HR_ZONES` constant (5 zones with names, colors, percentages), `HRZoneThresholds`, `HRZoneInfo`, `HRZoneNumber`, `DeviceConnectionState`
- `src/components/HRConnectionIndicator.tsx` — Existing connection state indicator component in workout header
- `src/screens/WorkoutScreen.tsx` — Workout screen with existing HR integration (auto-reconnect, flush, connection indicator, hasPairedDevice gating)
- `src/screens/SettingsScreen.tsx` — Settings screen (currently minimal: repair + export)
- `src/components/DeviceScanSheet.tsx` — Existing bottom sheet scan UI from Phase 25

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **HeartRateContext** (`src/context/HeartRateContext.tsx`): `currentBpm` already updates ~1/sec from BLE characteristic monitoring — live display consumes this directly
- **HRSettingsService** (`src/services/HRSettingsService.ts`): `setAge()`, `setMaxHrOverride()`, `getComputedMaxHR()` — Settings UI calls these, no new service code needed
- **HR_ZONES constant** (`src/types/index.ts`): 5 zones with names, colors, and percent ranges — zone computation reads this
- **HRConnectionIndicator** (`src/components/HRConnectionIndicator.tsx`): Existing indicator component — live BPM display sits alongside/above this
- **DeviceScanSheet** (`src/components/DeviceScanSheet.tsx`): Bottom sheet scan UI already built — Settings just triggers it

### Established Patterns
- Context providers (TimerContext, SessionContext, HeartRateContext) — consuming `useHeartRate()` for live BPM
- Dark-mint-card-ui design system — dark background, mint accents, card-based sections
- Haptic feedback patterns — PR detection pulse (WorkoutScreen)
- AsyncStorage for scalar preferences — age, maxHrOverride already use this

### Integration Points
- **WorkoutScreen.tsx header**: New BPM display section between header stats and exercise list
- **SettingsScreen.tsx**: New "Heart Rate Monitor" section above existing "Data" section
- **HeartRateContext**: Consumed via `useHeartRate()` for `currentBpm` and `deviceState`
- **HRSettingsService**: Called from Settings UI for age/maxHR CRUD
- **getComputedMaxHR()**: Called to compute zone thresholds from current settings

</code_context>

<specifics>
## Specific Ideas

- BPM is the hero element in workout header — large, readable at arm's length
- Heartbeat pulse animation on each BPM update — alive feeling without distraction
- Zone label hidden (not "No Signal") when disconnected — clean absence of data
- Settings is straightforward empty fields, not a guided onboarding wizard
- Below-zone BPM in gray with no zone label — clean warm-up state
- Above Zone 5 stays Zone 5 — no special warning, max effort is max effort

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 27-live-display-settings-ui*
*Context gathered: 2026-03-28*
