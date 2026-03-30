# Phase 24: BLE Foundation - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-03-24
**Phase:** 24-ble-foundation
**Areas discussed:** Permission request timing, Permission denial behavior, Default HR settings

---

## Permission Request Timing

| Option | Description | Selected |
|--------|-------------|----------|
| On first connect attempt (Recommended) | Permission dialog triggers when the user first tries to scan/connect to a device. Lazy — users who never use HR never see it | ✓ |
| When entering HR Settings | Permission requested as soon as the user navigates to the HR/device pairing section of Settings. Slightly earlier than connect, but still intent-driven | |
| On app launch after update | Permission requested immediately after updating to v1.6. Eager — gets it out of the way but may confuse users who don't know what BLE is for yet | |

**User's choice:** On first connect attempt (Recommended)
**Notes:** Lazy approach — only users who actively try to use HR features see the permission prompt.

---

## Permission Denial Behavior

### Q1: Behavior after denial

| Option | Description | Selected |
|--------|-------------|----------|
| One retry, then manual guidance (Recommended) | If denied once, re-prompt with rationale. If denied again or 'Don't ask again' checked, show inline message pointing to Android Settings | ✓ |
| Never re-prompt | Single permission attempt. If denied, show static message explaining how to enable in Android Settings | |
| Block until granted | Modal that won't dismiss until permissions granted | |

**User's choice:** One retry, then manual guidance (Recommended)
**Notes:** One retry with rationale, then graceful fallback to manual guidance.

### Q2: Subsequent session behavior

| Option | Description | Selected |
|--------|-------------|----------|
| Silent degradation (Recommended) | HR features simply don't appear in workout header. Settings shows a note with button to open Android Settings. No nagging | ✓ |
| Subtle banner on workout start | Dismissible banner at top of workout screen each session | |
| You decide | Claude picks based on existing UX patterns | |

**User's choice:** Silent degradation (Recommended)
**Notes:** No nagging — HR features hidden when permissions denied.

### Q3: Settings visibility

| Option | Description | Selected |
|--------|-------------|----------|
| Visible but gated (Recommended) | HR Settings section always visible. If permissions denied, shows explanation with button to open Android Settings | ✓ |
| Hidden until granted | HR Settings section doesn't render without BLE permissions | |
| You decide | Claude picks based on existing Settings screen patterns | |

**User's choice:** Visible but gated (Recommended)
**Notes:** User can see HR features exist even without permissions. Gated with explanation and fix-it button.

---

## Default HR Settings

### Q1: Before age is set

| Option | Description | Selected |
|--------|-------------|----------|
| Default age 30 (Recommended) | HRSettingsService returns age=30 as sensible default. Zones work immediately | |
| Require age before connecting | Device pairing blocked until user enters age. Ensures personalized zones from start | ✓ |
| No default — zones disabled | BPM displays raw number without zone coloring until age configured | |

**User's choice:** Require age before connecting
**Notes:** User explicitly chose to require age input before device pairing can begin. No default age.

### Q2: How to enforce age requirement

| Option | Description | Selected |
|--------|-------------|----------|
| Inline prompt in pairing flow (Recommended) | When user taps 'Scan for devices' without age, show quick age input inline before scanning. Minimal friction | ✓ |
| Redirect to Settings | Navigate to Settings with age field highlighted. User returns to pairing after | |
| You decide | Claude picks approach fitting existing navigation patterns | |

**User's choice:** Inline prompt in pairing flow (Recommended)
**Notes:** Keep the user in the pairing flow with an inline age input step.

### Q3: Max HR override

| Option | Description | Selected |
|--------|-------------|----------|
| Yes, optional override in Settings (Recommended) | Settings shows calculated max HR with 'Override' toggle for custom value | ✓ |
| No, age-only | Max HR always computed from age via Tanaka. Users adjust age to approximate | |
| You decide | Claude picks based on complexity vs. value trade-off | |

**User's choice:** Yes, optional override in Settings (Recommended)
**Notes:** Matches the maxHrOverride field already planned for AsyncStorage.

---

## Claude's Discretion

- Technical shape of hr_samples table schema
- Jest mock implementation for react-native-ble-plx
- HRSettingsService internal API surface
- BleManager initialization approach

## Deferred Ideas

None — discussion stayed within phase scope.
