# Phase 39: Meal Builder - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-08
**Phase:** 39-meal-builder
**Areas discussed:** Builder screen flow, Gram entry interaction, Running totals & layout, Logging step & actions

---

## Builder Screen Flow

| Option | Description | Selected |
|--------|-------------|----------|
| Single screen + modal search | MealBuilder is one full screen; FoodSearchModal opens as overlay for adding foods. Gram entry slides up inline. Keeps builder context visible. | ✓ |
| Bottom sheet builder | Builder in a tall bottom sheet over current screen. More lightweight but dismissible by accident. | |
| Multi-step wizard | Separate screens per step with step indicator. Cleanest separation but more navigation overhead. | |

**User's choice:** Single screen + modal search (Recommended)
**Notes:** User selected the recommended option. Builder stays as persistent single screen with FoodSearchModal layered on top.

---

## Gram Entry Interaction

| Option | Description | Selected |
|--------|-------------|----------|
| Inline bottom card | Card slides up from bottom of builder with food name, gram input, live macro preview, Add button. Same card for editing. Auto-focused numeric keyboard. | ✓ |
| Modal overlay | Centered modal over builder with dimmed background. More visually distinct but adds modal layer. | |
| Expand-in-place | Food row expands inline to show gram input below it. Clean but pushes content and awkward with keyboard. | |

**User's choice:** Inline bottom card (Recommended)
**Notes:** User selected the recommended option. Same component reused for both initial entry and gram editing.

---

## Running Totals & Layout

| Option | Description | Selected |
|--------|-------------|----------|
| Sticky bottom bar | Fixed bar at bottom showing combined P/C/F + calories. Always visible during scroll. surfaceElevated styling. | ✓ |
| Compact one-line bar | Single line "P:51 C:53 F:6 \| 472cal". Minimal space but less readable. | |
| Inline summary card | Summary card scrolls with food list. Spacious but not always visible. | |

**User's choice:** Sticky bottom bar (Recommended)
**Notes:** User selected the recommended option. Always-visible totals with accent color on calorie count.

---

## Logging Step & Actions

| Option | Description | Selected |
|--------|-------------|----------|
| Integrated bottom section | Meal type pills, date/time, description all in sticky bottom below totals. Log Meal as primary CTA. Everything on one screen. | ✓ |
| Expandable confirm drawer | "Ready to Log" button reveals drawer with controls. Two-step confirmation. | |
| Separate confirm screen | Navigate to confirmation screen with full summary. Clearest review but extra navigation. | |

**User's choice:** Integrated bottom section (Recommended)
**Notes:** User selected the recommended option. All controls integrated — no extra steps to log.

---

## Claude's Discretion

- FoodGramInput animation timing and easing
- Per-food card internal layout details
- Empty state design when no foods added
- Description field visibility (always shown vs collapsible)
- Toast/haptic on successful log

## Deferred Ideas

None — discussion stayed within phase scope
