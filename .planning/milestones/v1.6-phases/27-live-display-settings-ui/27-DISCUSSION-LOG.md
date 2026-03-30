# Phase 27: Live Display & Settings UI - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-03-28
**Phase:** 27-live-display-settings-ui
**Areas discussed:** Live BPM display, Zone color styling, Settings screen layout, Below-zone behavior

---

## Live BPM Display

### BPM Prominence

| Option | Description | Selected |
|--------|-------------|----------|
| Large and central | BPM is the hero element — big number (24-28pt) with zone label below, readable at arm's length. Connection indicator stays small nearby. | ✓ |
| Compact inline | BPM tucked into existing header stats row — smaller text (16-18pt), same line as volume/sets. | |
| You decide | Claude picks based on existing header structure | |

**User's choice:** Large and central
**Notes:** None

### BPM Placement

| Option | Description | Selected |
|--------|-------------|----------|
| Below header stats | BPM section between header stats row (volume/sets) and exercise list. Always visible at top without scrolling. | ✓ |
| Inside header card | BPM within the existing header card alongside volume/sets/day info. More compact but header gets taller. | |
| Floating overlay | BPM as a floating pill/badge anchored to top-right, always visible while scrolling. | |

**User's choice:** Below header stats
**Notes:** None

### BPM Animation

| Option | Description | Selected |
|--------|-------------|----------|
| Subtle pulse | Brief scale pulse on each BPM change — mimics heartbeat. Alive feeling without distraction. | ✓ |
| No animation | Number swaps instantly. Simplest, zero distraction. | |
| You decide | Claude picks based on existing app animations | |

**User's choice:** Subtle pulse
**Notes:** None

### Disconnect Display

| Option | Description | Selected |
|--------|-------------|----------|
| Hide zone label | Just '- -' for BPM with no zone text. Clean — no data means no zone. | ✓ |
| Show 'No Signal' | Replace zone label with 'No Signal' in muted/gray. More explicit. | |
| You decide | Claude picks consistent with existing disconnect UX | |

**User's choice:** Hide zone label
**Notes:** None

---

## Zone Color Styling

### Color Target

| Option | Description | Selected |
|--------|-------------|----------|
| BPM text color | BPM number changes color to match zone (green/blue/gold/orange/red). Zone label stays neutral. | ✓ |
| Background accent bar | Thin colored bar behind BPM section changes color. BPM text stays white. | |
| Both text and accent | BPM zone-colored AND subtle background tint. Maximum signal. | |
| You decide | Claude picks based on dark-mint-card-ui and readability | |

**User's choice:** BPM text color
**Notes:** None

### Zone Transitions

| Option | Description | Selected |
|--------|-------------|----------|
| Instant snap | Color changes immediately when BPM crosses threshold. Simple, clear. | ✓ |
| Smooth color fade | 300ms animated interpolation. Polished but adds complexity. | |
| You decide | Claude picks based on 1/sec update practical considerations | |

**User's choice:** Instant snap
**Notes:** None

### Zone Colors

| Option | Description | Selected |
|--------|-------------|----------|
| Keep existing colors | Use HR_ZONES colors as defined in Phase 24 foundation. | ✓ |
| Adjust for dark theme | Claude tweaks hex values for dark background contrast, same color families. | |
| You decide | Claude evaluates contrast and adjusts only if needed | |

**User's choice:** Keep existing colors
**Notes:** None

---

## Settings Screen Layout

### Section Organization

| Option | Description | Selected |
|--------|-------------|----------|
| Single 'Heart Rate' section | One grouped section: age, max HR, paired device, scan/unpair buttons. | ✓ |
| Two sections split | Separate 'Profile' (age, max HR) and 'Device' (paired info, scan, unpair). | |
| You decide | Claude picks based on Settings complexity | |

**User's choice:** Single 'Heart Rate' section
**Notes:** None

### Age Input

| Option | Description | Selected |
|--------|-------------|----------|
| Inline number input | Tappable field opens numeric keyboard. Max HR updates in real-time on blur. | ✓ |
| Stepper (+/− buttons) | Age with +/− buttons, like weight steppers in set logging. | |
| You decide | Claude picks based on existing input patterns | |

**User's choice:** Inline number input
**Notes:** None

### No Device State

| Option | Description | Selected |
|--------|-------------|----------|
| Just empty fields | "No device paired" with "Scan for Devices" button. Age input available immediately. | ✓ |
| Guided setup CTA | Card with explanation and 'Get Started' button for age → scan flow. | |
| You decide | Claude picks based on minimal-UI approach | |

**User's choice:** Just empty fields
**Notes:** None

---

## Below-Zone Behavior

### Below Zone 1

| Option | Description | Selected |
|--------|-------------|----------|
| BPM in muted/gray, no zone label | Neutral gray BPM, no zone text. Zone label appears at Zone 1 threshold. | ✓ |
| Show 'Below Zones' label | Gray BPM + explicit 'Below Zones' text. More informative but non-standard. | |
| Show as Zone 1 (extend) | Treat anything below as Zone 1. Simpler but inaccurate. | |
| You decide | Claude picks cleanest approach | |

**User's choice:** BPM in muted/gray, no zone label
**Notes:** None

### Above Zone 5

| Option | Description | Selected |
|--------|-------------|----------|
| Stay Zone 5 color | Keep Zone 5 — Max with red color. 100%+ is still max effort. | ✓ |
| Flash/warning treatment | BPM pulses or extra visual cue above max HR. Safety signal. | |
| You decide | Claude picks based on simplicity | |

**User's choice:** Stay Zone 5 color
**Notes:** None

---

## Claude's Discretion

- Exact animation implementation for BPM pulse (Animated API vs LayoutAnimation)
- Heart icon treatment (static vs animated alongside BPM)
- Exact spacing/padding within the BPM display section
- Settings section card styling (consistent with dark-mint-card-ui)
- Zone computation utility function placement (inline vs shared util)
- How the custom max HR toggle/input is implemented (switch + conditional input)

## Deferred Ideas

None — discussion stayed within phase scope.
