# Phase 24: BLE Foundation - Context

**Gathered:** 2026-03-24
**Status:** Ready for planning

<domain>
## Phase Boundary

Install the BLE infrastructure needed by all subsequent HR phases: Android BLE permissions (declared + runtime-requested), a memory-safe BleManager singleton, DB migration v8 (hr_samples table + avg_hr/peak_hr columns on workout_sessions), shared HR TypeScript types, HRSettingsService backed by AsyncStorage, and a Jest mock for react-native-ble-plx so the existing test suite continues to pass.

</domain>

<decisions>
## Implementation Decisions

### Permission Request Timing
- **D-01:** BLE permissions are requested lazily — only when the user first attempts to scan/connect to a device. Users who never use HR features never see the permission dialog.
- **D-02:** On Android 12+ request BLUETOOTH_SCAN + BLUETOOTH_CONNECT; on Android 11 and below request BLUETOOTH + ACCESS_FINE_LOCATION.

### Permission Denial Behavior
- **D-03:** If denied once, re-prompt with rationale ("needed to connect to your heart rate monitor"). If denied again or "Don't ask again" is checked, show an inline message pointing to Android Settings.
- **D-04:** After final denial, silent degradation — HR features don't appear in the workout header. No nagging on every workout start.
- **D-05:** HR Settings section is always visible even without permissions. If permissions are denied, it shows "Enable Bluetooth permissions to use heart rate monitoring" with a button to open Android Settings. User can see what's available.

### Default HR Settings
- **D-06:** Age is required before device pairing can begin. No default age — the user must enter their age before scanning for devices.
- **D-07:** When user taps "Scan for devices" without an age set, show an inline age input prompt before scanning starts. Keeps the user in the pairing flow rather than redirecting to Settings.
- **D-08:** Max HR is computed via Tanaka formula (208 - 0.7 x age) by default. User can optionally override with a custom max HR value in Settings (toggle to enter custom value).

### Carried Forward (from STATE.md)
- **D-09:** BleManager must be a module-level singleton in BLEHeartRateService.ts — never instantiated inside a component or hook (prevents native memory leaks).
- **D-10:** HR samples buffer in a useRef during workout; batch-flushed to SQLite in one transaction on session end (protects set-logging speed).
- **D-11:** Zone computation uses Tanaka formula (208 - 0.7 x age), not 220-age (more accurate for adults over 40).
- **D-12:** Age, maxHrOverride, and pairedDeviceId stored in AsyncStorage (not SQLite — three scalar preferences, never joined relationally).
- **D-13:** HeartRateContext mirrors TimerContext pattern — proven architecture for BLE-to-React bridge.
- **D-14:** Reconnect uses exponential backoff (1/2/4/8/16s, max 5 attempts) triggered by onDeviceDisconnected.

### Claude's Discretion
- Technical shape of hr_samples table schema (columns, indexes, types)
- Jest mock implementation strategy for react-native-ble-plx
- Internal API surface of HRSettingsService (method signatures, error handling)
- BleManager initialization approach (eager module-level vs lazy singleton)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project Context
- `.planning/PROJECT.md` — Project overview, constraints, key decisions, v1.6 milestone definition
- `.planning/REQUIREMENTS.md` — BLE-04 requirement (Android BLE permissions), full v1.6 requirements list with traceability
- `.planning/ROADMAP.md` — Phase 24 success criteria (5 items), phase dependencies, milestone structure

### Existing Patterns
- `src/db/migrations.ts` — Migration system pattern (v1-v7), Migration interface, how to add v8
- `src/db/schema.ts` — DDL constants pattern for CREATE TABLE statements
- `src/types/index.ts` — Type definition conventions and existing domain types
- `src/context/TimerContext.tsx` — Context provider pattern that HeartRateContext should mirror
- `src/context/SessionContext.tsx` — Session lifecycle context pattern
- `android/app/src/main/AndroidManifest.xml` — Current manifest (only has INTERNET permission)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **TimerContext pattern** (`src/context/TimerContext.tsx`): createContext + useRef + useState pattern with background timer integration — HeartRateContext should follow this structure
- **Migration system** (`src/db/migrations.ts`): Well-established Migration interface with version/description/up pattern — v8 follows the same convention
- **Schema constants** (`src/db/schema.ts`): DDL exported as named constants — new HR table DDL follows same pattern

### Established Patterns
- **Context providers**: createContext → useContext → Provider wrapping app tree (TimerContext, SessionContext)
- **DB modules**: One file per domain (sessions.ts, protein.ts, etc.) with row mappers and query functions
- **Type definitions**: All domain types in `src/types/index.ts`, grouped by feature with comment headers
- **Test mocking**: Jest mocks for native modules in test setup files

### Integration Points
- **AndroidManifest.xml**: BLE permissions must be declared here (BLUETOOTH_SCAN, BLUETOOTH_CONNECT, ACCESS_FINE_LOCATION)
- **package.json**: react-native-ble-plx and @react-native-async-storage/async-storage must be added as dependencies
- **src/db/migrations.ts**: Migration v8 added to MIGRATIONS array
- **src/types/index.ts**: HR-related types added (HRSample, HRSettings, HRZone, etc.)
- **Jest config / setup**: Mock for react-native-ble-plx registered so existing 82%+ coverage suite passes

</code_context>

<specifics>
## Specific Ideas

- Age is gated — no pairing without age configured. Inline prompt at scan time, not a redirect to Settings.
- Max HR override is optional — Tanaka-computed by default, toggle to enter a known max HR.
- Permission denial is graceful — silent degradation in workout, explanation in Settings. No nagging.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 24-ble-foundation*
*Context gathered: 2026-03-24*
