# Phase 25: Connection Management - Context

**Gathered:** 2026-03-25
**Status:** Ready for planning

<domain>
## Phase Boundary

Users can scan for nearby BLE heart rate devices, select and connect to their Garmin Forerunner 245, have that device remembered for auto-reconnect on workout start, and see the live connection state in the workout header — including graceful "--" display on mid-workout disconnect with automatic reconnect attempt.

Requirements covered: BLE-01, BLE-02, BLE-03, BLE-05, HR-04.

</domain>

<decisions>
## Implementation Decisions

### Scan UI
- **D-01:** Scan screen appears as a **bottom sheet** sliding up over the current screen (Settings). Consistent with existing modal/sheet patterns in the app (AddMealModal, etc.).
- **D-02:** Each device row shows **device name + signal strength bars** (RSSI visualized as bars, not raw dBm). Enough to identify the right device without clutter.
- **D-03:** Tapping a device **connects immediately** — stop scanning, connect, persist device ID, close bottom sheet. One tap to pair. If connection fails, show error inline in the sheet and let user retry or pick another.
- **D-04:** Scan **auto-stops after 15 seconds** to save battery. User can tap "Scan Again" to restart. Most BLE HR devices advertise within 5-10 seconds.
- **D-05:** Empty state when no devices found shows: "No heart rate monitors found. Make sure your device is on and in range." with a "Scan Again" button.

### Connection State Indicator
- **D-06:** Indicator is a **small colored dot + text label** in the workout header. Green = connected, yellow = reconnecting, red = disconnected.
- **D-07:** Indicator is **only visible when a device is paired** (pairedDeviceId exists in AsyncStorage). Users who never use HR see no change to their workout header.
- **D-08:** Label shows **just the state** ("Connected" / "Reconnecting" / "Disconnected"), not the device name. User only pairs one device, so the name is redundant.

### Auto-reconnect & Pairing Flow
- **D-09:** Auto-reconnect fires **on workout start only**, not on app open. Saves battery, and HR data is only useful during workouts. Aligns with out-of-scope decision: "no persistent BLE connection across sessions."
- **D-10:** If saved device isn't found within ~10s, **silent timeout** — show "Disconnected" indicator. No popup, no interruption. User can still log sets normally. Manual re-scan from Settings if needed.
- **D-11:** Unpairing via an **"Unpair" button in Settings** when a device is paired. Clears pairedDeviceId from AsyncStorage and disconnects. Simple, discoverable.
- **D-12:** Scan/pair only available from **Settings**, not from the workout screen. Workout screen shows connection state only. Keeps workout screen focused on logging — pairing is a one-time setup.

### Disconnect Feedback
- **D-13:** Mid-workout disconnect triggers a **single short haptic** vibration. Enough to notice without being alarming. Consistent with existing PR detection haptic pattern.
- **D-14:** After all 5 reconnect attempts exhausted (exponential backoff per Phase 24 D-14), indicator stays as **red dot + "Disconnected"** for the rest of the workout. No further reconnect attempts. BPM shows "--". Workout logging continues normally — HR is supplementary.

### Carried Forward (from Phase 24)
- **D-15:** BLE permissions requested lazily — only when user first initiates scan (Phase 24 D-01).
- **D-16:** BleManager is module-level singleton in BLEHeartRateService.ts (Phase 24 D-09).
- **D-17:** Age required before scanning — inline age prompt at scan time if not set (Phase 24 D-06, D-07).
- **D-18:** pairedDeviceId stored in AsyncStorage via HRSettingsService (Phase 24 D-12).
- **D-19:** HeartRateContext mirrors TimerContext pattern (Phase 24 D-13).
- **D-20:** Reconnect uses exponential backoff: 1/2/4/8/16s, max 5 attempts, triggered by onDeviceDisconnected (Phase 24 D-14).

### Claude's Discretion
- Bottom sheet component implementation (library choice vs custom)
- Signal strength bar rendering approach (number of bars, thresholds)
- HeartRateContext internal API surface (method names, state shape)
- BLE scan filtering strategy (filter by HR service UUID vs show all)
- Connection timeout duration for initial pair attempt
- Exact placement of indicator within workout header layout

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project Context
- `.planning/PROJECT.md` — Project overview, constraints, v1.6 milestone definition
- `.planning/REQUIREMENTS.md` — BLE-01, BLE-02, BLE-03, BLE-05, HR-04 requirements with traceability
- `.planning/ROADMAP.md` — Phase 25 success criteria (5 items), phase dependencies

### Phase 24 Foundation (prerequisite code)
- `.planning/phases/24-ble-foundation/24-CONTEXT.md` — All Phase 24 decisions (D-01 through D-14) that carry forward
- `src/services/BLEHeartRateService.ts` — bleManager singleton + HR service/char UUIDs
- `src/services/BLEPermissions.ts` — checkBLEPermissions, requestBLEPermissions, openAppSettings
- `src/services/HRSettingsService.ts` — getHRSettings, setAge, setPairedDeviceId, clearPairedDevice, getComputedMaxHR

### Existing Patterns
- `src/context/TimerContext.tsx` — Context provider pattern that HeartRateContext should mirror
- `src/context/SessionContext.tsx` — Session lifecycle context for workout start/end hooks
- `src/screens/WorkoutScreen.tsx` — Workout header (line ~892) where connection indicator goes; existing haptic patterns for PR detection
- `src/screens/SettingsScreen.tsx` — Settings screen where scan/pair/unpair UI will live
- `src/types/index.ts` — DeviceConnectionState type (5 states), HRSettings interface with pairedDeviceId

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **BLEHeartRateService.ts**: bleManager singleton + HR_SERVICE_UUID + HR_MEASUREMENT_CHAR_UUID — ready for scan/connect calls
- **BLEPermissions.ts**: Full permission check/request/openSettings flow — scan UI calls requestBLEPermissions before starting scan
- **HRSettingsService.ts**: setPairedDeviceId / clearPairedDevice / getHRSettings — persistence layer for pairing is done
- **DeviceConnectionState type**: 5 states already defined ('disconnected' | 'scanning' | 'connecting' | 'connected' | 'reconnecting')
- **TimerContext pattern**: createContext + useRef + useState — proven architecture for HeartRateContext

### Established Patterns
- **Context providers**: createContext -> useContext -> Provider wrapping app tree (TimerContext, SessionContext)
- **Modal/sheet patterns**: AddMealModal, AddExerciseModal — existing bottom sheet presentation pattern
- **Haptic feedback**: PR detection in WorkoutScreen uses ReactNativeHapticFeedback — reuse for disconnect notification
- **Test mocking**: Jest mocks for native modules in test setup files — will need BLE mock extensions

### Integration Points
- **WorkoutScreen.tsx header** (~line 892): Connection state indicator + "--" BPM display go here
- **SettingsScreen.tsx**: Scan button, paired device display, unpair button, bottom sheet trigger
- **HeartRateContext** (new): Wraps BLE logic, exposes currentBpm, deviceState, connect/disconnect to consumers
- **SessionContext**: Workout start event triggers auto-reconnect if pairedDeviceId exists

</code_context>

<specifics>
## Specific Ideas

- Bottom sheet for scan — slides over Settings, keeps context visible
- One-tap pairing — tap device to connect immediately, no confirmation dialog
- 15-second scan timeout — battery-conscious, restart available
- Indicator only for paired users — no UI changes for non-HR users
- State labels only, no device name in indicator — clean, concise
- Workout-start-only reconnect — no app-open BLE activity
- Silent timeout on device-not-found — no popup, no interruption to set logging
- Settings-only pairing — workout screen stays focused on logging
- Single haptic on disconnect — noticeable but not alarming
- Persistent disconnected state — indicator stays visible after max retries, workout continues normally

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 25-connection-management*
*Context gathered: 2026-03-25*
