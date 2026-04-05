# Phase 36: Goal Setting & Stats - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-05
**Phase:** 36-goal-setting-stats
**Areas discussed:** First-use setup card, Goal label & inline editing, Streak & average stats, Layout & positioning

---

## First-Use Setup Card

| Option | Description | Selected |
|--------|-------------|----------|
| Full-width card replacing cup | Surface-colored card centered where cup would be. Title, pre-filled 64 oz input, mint Set Goal button. Quick-add + Log Water hidden until goal set. | ✓ |
| Minimal inline prompt | Text prompt above cup area with tappable link. Cup still shows with 64 oz default. | |
| Modal on first focus | Auto-open modal when HydrationView mounts with null goal. Cup renders underneath. | |

**User's choice:** Full-width card replacing cup
**Notes:** None

### Follow-up: Hidden vs visible quick-add before goal set

| Option | Description | Selected |
|--------|-------------|----------|
| Hidden until goal set | Setup card is the only thing on screen — clean focus. Full view appears all at once after save. | ✓ |
| Always visible | Quick-add and Log Water show below setup card even before goal set. | |

**User's choice:** Hidden until goal set

### Follow-up: Transition animation

| Option | Description | Selected |
|--------|-------------|----------|
| Instant swap | Card disappears, full view renders immediately. Consistent with tab switch behavior. | ✓ |
| Fade transition | Setup card fades out, cup + stats fade in. More polished but adds complexity. | |

**User's choice:** Instant swap

---

## Goal Label & Inline Editing

| Option | Description | Selected |
|--------|-------------|----------|
| Below cup, styled label | "GOAL: 64 fl oz" label centered below cup, secondary text. Tap triggers inline edit. | ✓ |
| Inside cup label area | Replace current "48 / 64 oz" label with tappable version. More compact but cramped. | |
| Dedicated goal card | Surface-colored card below cup with edit icon. More visually distinct. | |

**User's choice:** Below cup, styled label
**Notes:** None

### Follow-up: Inline edit mode

| Option | Description | Selected |
|--------|-------------|----------|
| Replace label with input row | Goal label swaps to TextInput + fl oz suffix + Save/Cancel. Same as MacroProgressCard pattern. | ✓ |
| Open LogWaterModal repurposed | Reuse modal with "Set Goal" title instead of "Log Water". | |
| Bottom sheet | Bottom sheet slides up with goal input and Save button. | |

**User's choice:** Replace label with input row

---

## Streak & Average Stats

| Option | Description | Selected |
|--------|-------------|----------|
| Two stat cards side-by-side | Two surface-colored cards: streak (fire + X day streak) and weekly avg (72% large + 7-day avg label). | ✓ |
| Reuse StreakAverageRow | Adapt existing component, change "Xg" to "X%". Inline text row, simpler. | |
| Single combined card | One card with both stats on separate lines. | |

**User's choice:** Two stat cards side-by-side
**Notes:** None

### Follow-up: Empty state for stats

| Option | Description | Selected |
|--------|-------------|----------|
| Show cards with zero/dash | Cards always visible: streak "0 days", average "—" or "0%". Visual target to fill. | ✓ |
| Hide until data exists | Don't render until at least one day of logging. | |
| Show with motivational text | Placeholder text like "Start logging!" instead of numbers. | |

**User's choice:** Show cards with zero/dash

---

## Layout & Positioning

| Option | Description | Selected |
|--------|-------------|----------|
| Cup → Goal → Stats → Quick-add → Log Water | Stats between informational and action zones. | ✓ |
| Cup → Goal → Quick-add → Log Water → Stats | Stats at bottom as secondary glance area. | |
| Cup → Stats → Goal → Quick-add → Log Water | All informational content grouped above actions. | |

**User's choice:** Cup → Goal → Stats → Quick-add → Log Water
**Notes:** None

### Follow-up: Stat card styling

| Option | Description | Selected |
|--------|-------------|----------|
| Match surfaceElevated style | Same background, border, border-radius as quick-add buttons. Visually cohesive. | ✓ |
| Distinct card style | Different background to separate informational from action cards. | |
| Borderless/minimal | No border or background — just large text and labels. | |

**User's choice:** Match surfaceElevated style

---

## Claude's Discretion

- Exact spacing between goal label and stat cards
- GoalSetupCard internal layout details
- Stat card icon/emoji choice for weekly average
- Keyboard handling on inline goal edit
- Goal input validation
- Font weight choices for stat card text

## Deferred Ideas

None
