# Phase 25: Connection Management - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-03-25
**Phase:** 25-connection-management
**Areas discussed:** Scan UI & device list, Connection state indicator, Auto-reconnect & pairing flow, Disconnect feedback

---

## Scan UI & Device List

### Q1: How should the scan screen appear?

| Option | Description | Selected |
|--------|-------------|----------|
| Bottom sheet | Slides up from bottom over current screen. Keeps workout/settings context visible. Consistent with AddMealModal and other existing sheet patterns. | ✓ |
| Full-screen modal | Dedicated modal that takes over the screen. More room for device details but loses context. | |
| Inline in Settings | Device list appears directly in Settings below the Scan button. Simplest but could feel cramped. | |

**User's choice:** Bottom sheet (Recommended)
**Notes:** None

### Q2: What info should each device row show?

| Option | Description | Selected |
|--------|-------------|----------|
| Name + signal strength | Device name and RSSI as signal bars. Simple, enough to pick the right device. | ✓ |
| Name only | Just the device name. Cleanest but can't distinguish similar names. | |
| Name + signal + device ID | Full detail with truncated MAC. Useful for debugging but noisy. | |

**User's choice:** Name + signal strength (Recommended)
**Notes:** None

### Q3: What happens when user taps a device?

| Option | Description | Selected |
|--------|-------------|----------|
| Connect immediately | Tap → stop scan → connect → persist → close sheet. One tap to pair. Error shown inline. | ✓ |
| Confirm first | Show confirmation dialog before connecting. Extra safety but adds a tap. | |
| You decide | Claude picks. | |

**User's choice:** Connect immediately (Recommended)
**Notes:** None

### Q4: Scan timeout behavior?

| Option | Description | Selected |
|--------|-------------|----------|
| Auto-stop after 15s | Saves battery. User can restart. Most devices advertise within 5-10s. | ✓ |
| Manual stop only | Runs until user stops or selects. Full control but battery risk. | |
| You decide | Claude picks. | |

**User's choice:** Auto-stop after 15s (Recommended)
**Notes:** None

### Q5: Empty state when no devices found?

| Option | Description | Selected |
|--------|-------------|----------|
| Helpful message + retry | "No heart rate monitors found..." with Scan Again button. | ✓ |
| Just 'Scan Again' button | Minimal empty state. | |
| You decide | Claude picks. | |

**User's choice:** Helpful message + retry (Recommended)
**Notes:** None

---

## Connection State Indicator

### Q1: How should connection state show in workout header?

| Option | Description | Selected |
|--------|-------------|----------|
| Small colored dot + label | Green/yellow/red dot with text label. Fits minimal header style. | ✓ |
| Icon only, no text | Bluetooth icon changes color. Most compact but ambiguous states. | |
| You decide | Claude picks. | |

**User's choice:** Small colored dot + label (Recommended)
**Notes:** None

### Q2: When is the indicator visible?

| Option | Description | Selected |
|--------|-------------|----------|
| Only when paired | Appears only if pairedDeviceId exists. Non-HR users see no change. | ✓ |
| Always visible | Shows 'No device' even when nothing paired. Discoverable but cluttered. | |

**User's choice:** Only when paired (Recommended)
**Notes:** None

### Q3: What does the label show?

| Option | Description | Selected |
|--------|-------------|----------|
| Just state label | 'Connected' / 'Reconnecting' / 'Disconnected'. Clean, concise. | ✓ |
| Device name + state | 'Garmin FR 245 • Connected'. More informative but longer. | |
| You decide | Claude picks. | |

**User's choice:** Just state label (Recommended)
**Notes:** None

---

## Auto-reconnect & Pairing Flow

### Q1: When should auto-reconnect happen?

| Option | Description | Selected |
|--------|-------------|----------|
| On workout start only | Saves battery. HR only useful during workouts. Aligns with out-of-scope decisions. | ✓ |
| On app open | Faster workout start but drains battery during non-workout use. | |
| You decide | Claude picks. | |

**User's choice:** On workout start only (Recommended)
**Notes:** None

### Q2: If saved device isn't found?

| Option | Description | Selected |
|--------|-------------|----------|
| Silent timeout, show disconnected | Try ~10s, then show Disconnected. No popup. User can re-scan from Settings. | ✓ |
| Toast notification | Brief toast: 'Garmin FR 245 not found'. Non-blocking. | |
| Banner with action | Dismissible banner with Scan shortcut. Most visible. | |

**User's choice:** Silent timeout, show disconnected (Recommended)
**Notes:** None

### Q3: How should unpairing work?

| Option | Description | Selected |
|--------|-------------|----------|
| Unpair button in Settings | Paired device shows with Unpair button. Clears AsyncStorage + disconnects. | ✓ |
| Swipe to unpair | Swipe-left on device row. More gesture-based but less discoverable. | |
| You decide | Claude picks. | |

**User's choice:** Unpair button in Settings (Recommended)
**Notes:** None

### Q4: Where can user scan/pair?

| Option | Description | Selected |
|--------|-------------|----------|
| Settings only | Workout screen shows state only. Keeps workout focused on logging. | ✓ |
| Both Settings and workout | Scan shortcut from workout header. Handy but adds complexity. | |

**User's choice:** Settings only (Recommended)
**Notes:** None

---

## Disconnect Feedback

### Q1: Haptic on mid-workout disconnect?

| Option | Description | Selected |
|--------|-------------|----------|
| Single short haptic | Brief vibration. Consistent with PR detection haptic pattern. | ✓ |
| No haptic | Silent. Colored dot change is the only feedback. | |
| You decide | Claude picks. | |

**User's choice:** Single short haptic (Recommended)
**Notes:** None

### Q2: After all 5 reconnect attempts exhausted?

| Option | Description | Selected |
|--------|-------------|----------|
| Disconnected, stays visible | Red dot + 'Disconnected' remains. No further attempts. BPM shows '--'. Workout continues. | ✓ |
| Indicator hides after timeout | Fades out after 30s. Cleaner but loses disconnect awareness. | |
| You decide | Claude picks. | |

**User's choice:** Disconnected, stays visible (Recommended)
**Notes:** None

---

## Claude's Discretion

- Bottom sheet component implementation (library choice vs custom)
- Signal strength bar rendering approach
- HeartRateContext internal API surface
- BLE scan filtering strategy
- Connection timeout duration for initial pair
- Exact placement of indicator within workout header layout

## Deferred Ideas

None — discussion stayed within phase scope.
