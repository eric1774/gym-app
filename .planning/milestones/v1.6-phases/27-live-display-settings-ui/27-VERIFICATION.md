---
phase: 27-live-display-settings-ui
verified: 2026-03-29T20:00:00Z
status: gaps_found
score: 4/5 success criteria verified
re_verification:
  previous_status: gaps_found
  previous_score: 4/5
  gaps_closed: []
  gaps_remaining:
    - "BPM below Zone 1 shows in gray with no zone label"
    - "BPM number has subtle pulse animation on each new reading"
  regressions: []
gaps:
  - truth: "BPM below Zone 1 shows in gray with no zone label"
    status: failed
    reason: "getHRZone still clamps below-zone BPM to Zone 1 instead of returning null/gray sentinel. Line 50 of hrZones.ts returns HR_ZONES[0] unconditionally for readings below 50% of maxHR. No branch for below-zone was added since the initial verification."
    artifacts:
      - path: "src/utils/hrZones.ts"
        issue: "Returns HR_ZONES[0] (Zone 1, color #90EE90, label 'Recovery') for pct < 50% readings. No null/gray branch exists. Line 49-51: comment says 'clamp to Zone 1' and does exactly that."
      - path: "src/screens/WorkoutScreen.tsx"
        issue: "bpmZone useMemo at line 969-981 calls getHRZone which always returns a zone object. The ternary 'bpmZone ? bpmZone.color : colors.primary' at line 1026 therefore always uses zone color, never colors.secondary (gray) for below-zone readings."
    missing:
      - "In getHRZone (src/utils/hrZones.ts), add a branch: if (pct < HR_ZONES[0].minPercent) return null (change return type to HRZoneInfo | null). Then update callers (WorkoutScreen bpmZone memo) to handle null as 'no zone' — render in colors.secondary with no label."
      - "Alternatively, add a below-zone guard in the WorkoutScreen bpmZone useMemo before calling getHRZone and return null for pct < 50, avoiding a type-signature change to the utility."
  - truth: "BPM number has subtle pulse animation on each new reading"
    status: failed
    reason: "No pulse animation exists in WorkoutScreen.tsx. Animated is not imported. No Animated.Text, Animated.Value ref, or Animated.sequence call present. The BPM Text element is a plain React Native Text with no animation. This was a documented deviation in 27-01-SUMMARY and has not been addressed in any subsequent plan."
    artifacts:
      - path: "src/screens/WorkoutScreen.tsx"
        issue: "grep for 'Animated' returns no results. BPM rendered at line 1023-1031 is a plain <Text> element with no scale or opacity animation."
    missing:
      - "Import Animated from react-native. Wrap the BPM Text in Animated.Text. Add useRef(new Animated.Value(1)) for scale. Add useEffect watching currentBpm with a prevBpmRef to fire Animated.sequence([timing 1.0->1.06, 100ms], [timing 1.06->1.0, 100ms]) on each BPM value change (excluding first mount and '--' state)."
---

# Phase 27: Live Display & Settings UI Verification Report

**Phase Goal:** Users see their live BPM color-coded by zone in the workout header throughout a session, and can configure age and max HR in Settings and initiate device pairing from Settings.
**Verified:** 2026-03-29T20:00:00Z
**Status:** gaps_found
**Re-verification:** Yes — previous verification dated 2026-03-29T18:00:00Z had 2 gaps; both remain open.

---

## Re-Verification Summary

| Gap | Previous Status | Current Status | Change |
|-----|----------------|----------------|--------|
| Below-zone gray rendering (hrZones.ts) | failed | failed | No change — `getHRZone` still clamps to Zone 1 |
| Pulse animation (WorkoutScreen.tsx) | failed | failed | No change — Animated not imported, no Animated.sequence |

**Regressions from previously-passing items:** None. All 5 success criteria and all key links confirmed intact.

---

## Goal Achievement

### Observable Truths (from Phase Success Criteria)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Live BPM updates in workout header ~once per second during active session | ✓ VERIFIED | `useHeartRate()` destructures `currentBpm` at WorkoutScreen line 578. BLE GATT notifications in HeartRateContext drive `setCurrentBpm(bpm)`. BPM rendered at line 1028-1030. |
| 2 | BPM display is color-coded to match user's current HR zone (5-zone model) | ✓ VERIFIED | `bpmZone` useMemo (line 969-981) calls `getHRZone(currentBpm, maxHr)`. `{ color: bpmZone ? bpmZone.color : colors.primary }` applied at line 1026. Zone colors Z1=#90EE90, Z2=#00BFFF, Z3=#FFD700, Z4=#FF8C00, Z5=#FF4500. |
| 3 | Zone label "Zone N — Name" shown alongside BPM | ✓ VERIFIED | Line 1034: `` `Zone ${bpmZone.zone} — ${bpmZone.name}` `` renders when bpmZone is non-null. Em dash confirmed. |
| 4 | User can enter age in Settings; app auto-calculates max HR via Tanaka formula | ✓ VERIFIED | SettingsScreen line 73: `Math.round(208 - 0.7 * parsed)` on age blur. `setAge()` persists to AsyncStorage. Display shows `"{value} bpm (Tanaka)"`. |
| 5 | User can initiate device scan from Settings screen | ✓ VERIFIED | SettingsScreen line 264/280: "Scan for Devices" button sets `scanSheetVisible(true)`. `<DeviceScanSheet visible={scanSheetVisible} ...>` at line 330. |

**Score: 4/5 success criteria verified** (The 5 ROADMAP success criteria all pass at their primary behavior level. The 2 open gaps come from plan 27-01 must_haves, which are finer-grained than the ROADMAP success criteria.)

---

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/utils/hrZones.ts` | Zone computation from BPM and maxHR | ✓ VERIFIED | Exports `getHRZone` and `computeMaxHR`. 51 lines, substantive. Wired in WorkoutScreen. |
| `src/components/HRLiveBpmDisplay.tsx` | Live BPM display component | ✗ MISSING (accepted deviation) | File does not exist. Inlined in WorkoutScreen per 27-01-SUMMARY deviation. Goal achieved via inline implementation. |
| `src/screens/WorkoutScreen.tsx` | WorkoutScreen with two-row header and BPM display | ✓ VERIFIED | Two-row header (headerTopRow + headerHRRow). BPM block always-rendered with ternary content swap. bpmBlock, bpmValue, bpmZoneLabel styles present. |
| `src/screens/SettingsScreen.tsx` | Settings with Heart Rate Monitor card | ✓ VERIFIED | HR Monitor card is first card (line 193). Age input, max HR display, override Switch, DeviceScanSheet, unpair handler. 492 lines. |
| `src/screens/DashboardScreen.tsx` | Gear icon navigating to Settings | ✓ VERIFIED | GearIcon component at line 29. TouchableOpacity at line 125 with `navigate('Settings')`, `testID="settings-button"`, proper accessibilityLabel. |
| `src/context/HeartRateContext.tsx` | Stable BPM through micro-disconnects | ✓ VERIFIED | Line 218: `setCurrentBpm(null)` removed from auto-disconnect handler, comment confirms intent. Line 367: `deviceStateRef.current === 'connected'` guard in attemptAutoReconnect. |
| `src/components/HRConnectionIndicator.tsx` | Compact indicator with maxWidth constraint | ✓ VERIFIED | `maxWidth: 100` at line 50. Rendered in headerHRRow of WorkoutScreen. |

---

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| WorkoutScreen.tsx | HeartRateContext.tsx | `useHeartRate()` consuming `currentBpm`, `deviceState` | ✓ WIRED | Line 578 destructures both. Used in bpmZone memo (line 970) and render (line 1018, 1028). |
| WorkoutScreen.tsx | src/utils/hrZones.ts | `getHRZone(currentBpm, maxHr)` and `computeMaxHR()` | ✓ WIRED | Line 40 imports both. Lines 979-980 call both in bpmZone useMemo. |
| SettingsScreen.tsx | src/services/HRSettingsService.ts | `getHRSettings`, `setAge`, `setMaxHrOverride`, `getComputedMaxHR`, `clearPairedDevice` | ✓ WIRED | Line 18 imports all five. All called in respective handlers. |
| SettingsScreen.tsx | src/screens/DeviceScanSheet.tsx | `<DeviceScanSheet visible={scanSheetVisible} onClose={...} />` | ✓ WIRED | Line 19 imports. Line 330 renders. Both scan buttons call `setScanSheetVisible(true)`. |
| DashboardScreen.tsx | src/screens/SettingsScreen.tsx | `navigation.navigate('Settings')` | ✓ WIRED | Line 126. Route registered in DashboardStackParamList. |
| HeartRateContext.tsx | WorkoutScreen.tsx | Stable `currentBpm` through reconnect cycles | ✓ WIRED | setCurrentBpm(null) absent from auto-disconnect handler (line 218). |

---

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|--------------------|--------|
| WorkoutScreen.tsx (BPM display) | `currentBpm` | `useHeartRate()` → BLE `monitorCharacteristicForService` callback → `parseHeartRate(characteristic.value)` → `setCurrentBpm(bpm)` | Yes — live BLE GATT notifications from physical device | ✓ FLOWING |
| WorkoutScreen.tsx (zone color/label) | `bpmZone` | `React.useMemo` → `getHRZone(currentBpm, maxHr)` using AsyncStorage-sourced hrSettings | Yes — computed from live BPM and persisted settings | ✓ FLOWING |
| SettingsScreen.tsx (age/device state) | `ageValue`, `pairedDeviceId` | `loadSettings()` → `getHRSettings()` → AsyncStorage reads | Yes — real AsyncStorage data; null until user configures | ✓ FLOWING |
| SettingsScreen.tsx (pairedDeviceName) | `pairedDeviceName` | `useHeartRate()` context value from HeartRateContext state | Yes — set during connectToDevice and attemptAutoReconnect | ✓ FLOWING |

---

### Behavioral Spot-Checks

Step 7b: SKIPPED — React Native app requires a running Android device/emulator to execute. No runnable CLI entry points exist for these UI behaviors.

Programmatic checks performed:

| Behavior | Check | Result | Status |
|----------|-------|--------|--------|
| Below-zone gray rendering | grep for `pct < HR_ZONES[0].minPercent` returning null in hrZones.ts | No such branch — returns `HR_ZONES[0]` (Zone 1) for all readings | ✗ FAIL |
| Pulse animation present | grep for `Animated` in WorkoutScreen.tsx | No matches — Animated not imported | ✗ FAIL |
| Disconnect handler preserves BPM | grep for `// Keep last known BPM` in HeartRateContext.tsx | Found at line 218 | ✓ PASS |
| Auto-reconnect guard | grep for `deviceStateRef.current === 'connected'` in HeartRateContext.tsx | Found at line 367 | ✓ PASS |
| Two-row header styles | grep for `headerTopRow\|headerHRRow` in WorkoutScreen.tsx | Both present (lines 988, 1016, 1212, 1217) | ✓ PASS |
| maxWidth constraint in HRConnectionIndicator | grep for `maxWidth: 100` | Found at line 50 | ✓ PASS |
| Gear icon + Settings navigation | grep for `navigate('Settings')` and `testID="settings-button"` in DashboardScreen.tsx | Both found (lines 126, 128) | ✓ PASS |
| HR Monitor card first in Settings | grep for `Heart Rate Monitor` as first card | Line 194, before Export Data card at line 288 | ✓ PASS |
| Tanaka formula in Settings | grep for `208 - 0.7` | Found at lines 51, 73, 86 | ✓ PASS |

---

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| HR-01 | 27-01-PLAN.md | User can see live BPM updating in workout header during active workout | ✓ SATISFIED | WorkoutScreen renders `String(currentBpm)` at line 1029, gated by `deviceState === 'connected' && currentBpm !== null`. BPM state driven by BLE GATT notifications. |
| HR-02 | 27-01-PLAN.md | Live BPM display is color-coded by HR zone (5-zone model: 50/60/70/80/90% of max HR) | ✓ SATISFIED (with below-zone caveat) | Zone colors applied from `bpmZone.color` at line 1026. Five-zone model in `getHRZone`. Below-50% clamped to Zone 1 color (gap, does not block the primary use case). |
| HR-03 | 27-01-PLAN.md | Zone label shown alongside BPM (e.g., "Zone 3 — Aerobic") | ✓ SATISFIED (with below-zone caveat) | Zone label rendered at line 1034. Below-50% shows "Zone 1 — Recovery" instead of no label (consistent with clamping behavior). |
| SET-01 | 27-02-PLAN.md | User can enter age in Settings; max HR calculated | ✓ SATISFIED | Age input with blur-to-save, Tanaka formula `208 - 0.7 * age` computed and displayed as "{value} bpm (Tanaka)". Note: REQUIREMENTS.md text says "220-age" but STATE.md locks Tanaka as the project decision — this is a stale requirement description, not a code defect. |
| SET-02 | 27-02-PLAN.md | User can initiate device pairing from Settings screen | ✓ SATISFIED | "Scan for Devices" button in SettingsScreen opens DeviceScanSheet (line 330) without requiring a workout to be active. |

No orphaned requirements: REQUIREMENTS.md maps HR-01, HR-02, HR-03, SET-01, SET-02 to Phase 27. All five are covered by plan frontmatter in 27-01-PLAN.md and 27-02-PLAN.md.

---

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `src/screens/WorkoutScreen.tsx` | 978 | `const effectiveAge = age ?? 35` — hardcoded 35 fallback when age is null | ⚠️ Warning | Dead code: the guard at lines 975-977 returns null before reaching this line when both age and override are null. Harmless but misleading. Unchanged from initial verification. |
| `src/utils/hrZones.ts` | 49-51 | `return HR_ZONES[0]` clamps sub-50% readings to Zone 1 | ⚠️ Warning (gap) | Causes below-zone BPM to display with Zone 1 green color and "Recovery" label instead of gray with no label. Functional but contradicts plan D-13 spec. |

---

### Human Verification Required

#### 1. Live BPM Color Update During Real Workout

**Test:** Start a workout with a paired Garmin Forerunner 245 connected. Increase effort (walk then jog then run) to move through zones.
**Expected:** BPM number updates approximately once per second. Color changes to match zone — green (Zone 1), blue (Zone 2), yellow (Zone 3), orange (Zone 4), red (Zone 5).
**Why human:** BLE GATT notification timing depends on physical device. Cannot verify 1Hz cadence or color transitions from code alone.

#### 2. Zone Label Accuracy at Zone Boundaries

**Test:** With age 35 set (maxHR = 184 via Tanaka), bring HR to exactly 60% of 184 = ~110 BPM.
**Expected:** Label shows "Zone 2 — Easy" with blue BPM text. At 109 BPM (59.8%), shows "Zone 1 — Recovery" with green text.
**Why human:** Boundary behavior at zone transitions requires a real device returning specific BPM values.

#### 3. Settings Age Input End-to-End

**Test:** Open Settings, tap Age field, enter "35", tap Done/dismiss keyboard.
**Expected:** Max HR row appears below Age showing "181 bpm (Tanaka)". Reopening Settings after backgrounding the app shows "35" in age field and "181 bpm (Tanaka)".
**Why human:** AsyncStorage persistence and UI refresh on blur require device interaction to verify.

#### 4. Device Scan from Settings

**Test:** Open Settings (via Dashboard gear icon) with no paired device. Tap "Scan for Devices".
**Expected:** DeviceScanSheet slides up, shows 15-second scan countdown, discovers nearby BLE HR devices.
**Why human:** BLE scanning requires physical hardware and permissions grant.

#### 5. End Workout Always Accessible

**Test:** Start a workout with a paired HR monitor. Observe the header with HR Row 2 visible.
**Expected:** End Workout button remains visible and tappable in Row 1, even on a 375pt-wide screen, with the HR indicator and BPM label in Row 2 below it.
**Why human:** Layout overflow requires a physical device to verify pixel-level accessibility.

---

### Gaps Summary

Two gaps remain open from the initial verification, unchanged after Plan 27-04 (which addressed BPM flicker and header overflow but did not revisit the 27-01 deviations):

**Gap 1 — Below-zone rendering (Medium priority)**
`getHRZone` in `src/utils/hrZones.ts` clamps BPM readings below 50% of maxHR to Zone 1 (line 50: `return HR_ZONES[0]`). A user walking at very low intensity sees "Zone 1 — Recovery" in green rather than a neutral gray with no zone label. This contradicts plan D-13 and the plan 27-01 must_have "BPM below Zone 1 shows in gray with no zone label." Fix: add `if (pct < HR_ZONES[0].minPercent) return null;` to `getHRZone` (changing return type to `HRZoneInfo | null`) and handle null in the WorkoutScreen bpmZone memo. All 5 ROADMAP success criteria still pass without this fix, making it a plan-spec gap rather than a goal-blocking gap.

**Gap 2 — Pulse animation absent (Low priority)**
No BPM pulse animation was implemented in any of the four plans. `Animated` is not imported in WorkoutScreen.tsx. The BPM number is a plain `Text` element. The plan specified `Animated.sequence` scale 1.0→1.06→1.0 (100ms each) per BPM value change. This reduces display polish but does not affect functional goal achievement — users can see zone-colored BPM updating live. Self-reported deviation in 27-01-SUMMARY.

Neither gap prevents users from seeing live zone-colored BPM updates, configuring age, or pairing devices from Settings. The 5 ROADMAP success criteria are all met at their primary behavior level.

---

_Verified: 2026-03-29T20:00:00Z_
_Verifier: Claude (gsd-verifier)_
_Re-verification: Yes — initial verification 2026-03-29T18:00:00Z_
