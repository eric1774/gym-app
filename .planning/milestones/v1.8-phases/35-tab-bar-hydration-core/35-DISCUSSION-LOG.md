# Phase 35: Tab Bar & Hydration Core - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-04
**Phase:** 35-Tab Bar & Hydration Core
**Areas discussed:** Tab bar design, Cup visualization, Quick-add & Log Water flow, MacrosView extraction

---

## Pre-Decision: No-Goal Fallback

| Option | Description | Selected |
|--------|-------------|----------|
| Hardcoded 64 oz default | Cup always renders with 64 oz fallback when no goal set | ✓ |
| Simplified no-goal view | Minimal view without cup until Phase 36 adds goal setting | |

**User's choice:** Hardcoded 64 oz default
**Notes:** Cup always visible from Phase 35 onward. Phase 36 will replace the fallback with the real goal prompt.

---

## Tab Bar Design

### Tab Bar Style

| Option | Description | Selected |
|--------|-------------|----------|
| Underline tabs | Mint underline on active, secondary gray on inactive | ✓ |
| Pill toggle | Rounded pill with sliding highlight | |
| Segmented control | iOS-style with sharp divider | |

**User's choice:** Underline tabs
**Notes:** Matches existing MacroChart tab selector pattern

### Tab Position

| Option | Description | Selected |
|--------|-------------|----------|
| Below title | Keep header title, add tab bar below it | ✓ |
| Replace the title | Tab bar IS the header, no separate title | |
| Inside a header card | Tab bar embedded in a surface card | |

**User's choice:** Below title

### Header Title

| Option | Description | Selected |
|--------|-------------|----------|
| Keep 'Macros' | Existing title unchanged | |
| Change to 'Nutrition' | Neutral umbrella term for macros + hydration | ✓ |
| Remove title entirely | Just tab bar, no title row | |
| You decide | Claude picks during implementation | |

**User's choice:** Change to 'Nutrition'

### Tab Animation

| Option | Description | Selected |
|--------|-------------|----------|
| No animation — instant swap | Content switches immediately on tap | ✓ |
| Horizontal slide | Content slides left/right like a pager | |

**User's choice:** No animation — instant swap
**Notes:** Consistent with MacroChart tab selector behavior

---

## Cup Visualization

### Cup Style

| Option | Description | Selected |
|--------|-------------|----------|
| Rounded glass with gradient fill | Pure RN Views, mint gradient rises from bottom | ✓ |
| Circular progress ring | Ring/donut chart, percentage fills clockwise | |
| Tall narrow bottle | Water bottle silhouette with fill level | |

**User's choice:** Rounded glass with gradient fill
**Notes:** No SVG dependency, built with standard React Native Views

### Cup Size

| Option | Description | Selected |
|--------|-------------|----------|
| Medium — hero element | ~180-200px tall, centered, main visual focus | ✓ |
| Small — compact card | ~100-120px inside a card | |
| Large — full-width | ~250px+, nearly full screen width | |

**User's choice:** Medium hero element

### Cup Labels

| Option | Description | Selected |
|--------|-------------|----------|
| Current / Goal with percentage | '48 / 64 oz' primary, '75%' secondary, beside cup | ✓ |
| Current oz only | Just '48 oz', fill level conveys progress | |
| Inside the cup | Labels centered inside the cup shape | |

**User's choice:** Current / Goal with percentage

### Goal Met UX

| Option | Description | Selected |
|--------|-------------|----------|
| Full cup + checkmark badge | Full mint fill, checkmark or 'Goal met!' badge | ✓ |
| Overflow animation | Cup overflows with bubbles/splash effect | |
| Just stays full | No special indicator, cap at 100% fill | |

**User's choice:** Full cup + checkmark badge

---

## Quick-Add & Log Water Flow

### Quick-Add Layout

| Option | Description | Selected |
|--------|-------------|----------|
| Horizontal row below cup | 3 evenly-spaced buttons directly under the cup | ✓ |
| Inside a card with the cup | Buttons embedded in same card as the cup | |
| Fixed bottom bar | Pinned to bottom of screen | |

**User's choice:** Horizontal row below cup

### Quick-Add Button Style

| Option | Description | Selected |
|--------|-------------|----------|
| Surface cards with border | Surface-colored rounded rects, mint text | ✓ |
| Mint outline pills | Pill-shaped with mint border, no fill | |
| Solid mint buttons | Filled mint background, dark text | |

**User's choice:** Surface cards with border

### Log Water Button

| Option | Description | Selected |
|--------|-------------|----------|
| Full-width mint button | Accent-colored, matches Meal Library button | ✓ |
| FAB | Round '+' button in bottom-right corner | |
| Outlined/ghost button | Border-only, no fill | |

**User's choice:** Full-width mint button

### Log Water Modal

| Option | Description | Selected |
|--------|-------------|----------|
| Numeric input + Save | Simple input, Save/Cancel buttons, no presets | ✓ |
| Input + mini presets | Numeric input plus small preset chips inside | |
| You decide | Claude picks simplest approach | |

**User's choice:** Numeric input + Save

---

## MacrosView Extraction

### Split Strategy

| Option | Description | Selected |
|--------|-------------|----------|
| Thin parent + fat views | ProteinScreen becomes shell, each view self-contained | ✓ |
| Shared parent state | Parent owns macros + hydration state, passes as props | |
| You decide | Claude picks cleanest architecture | |

**User's choice:** Thin parent + fat MacrosView/HydrationView

### FAB Handling

| Option | Description | Selected |
|--------|-------------|----------|
| FAB stays on Macros tab | MacrosView keeps FAB, Hydration uses full-width button | ✓ |
| Unify to full-width on both | Remove FAB, both tabs use full-width buttons | |
| FAB on both tabs | Both tabs get a FAB for their primary action | |

**User's choice:** FAB stays on Macros tab only

### File Layout

| Option | Description | Selected |
|--------|-------------|----------|
| Separate files | MacrosView.tsx, HydrationView.tsx, WaterCup.tsx, LogWaterModal.tsx | ✓ |
| All in ProteinScreen.tsx | Local components in single file | |
| You decide | Claude picks based on size | |

**User's choice:** Separate files

### Tab Mount Behavior

| Option | Description | Selected |
|--------|-------------|----------|
| Unmount inactive tab | Only active tab rendered, re-fetches on switch | ✓ |
| Keep both mounted | Both stay mounted, inactive hidden | |

**User's choice:** Unmount inactive tab

---

## Claude's Discretion

- WaterCup internal implementation details
- TabBar reusability
- Exact spacing between cup, quick-add, and Log Water button
- Toast behavior on quick-add
- LogWaterModal keyboard handling and input validation
