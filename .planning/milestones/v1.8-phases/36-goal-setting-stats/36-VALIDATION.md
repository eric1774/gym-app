---
phase: 36
slug: goal-setting-stats
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-05
---

# Phase 36 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Jest + React Native Testing Library (react-native preset) |
| **Config file** | `jest.config.js` |
| **Quick run command** | `npx jest --testPathPattern="GoalSetupCard\|HydrationStatCards" --no-coverage` |
| **Full suite command** | `npx jest --coverage` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx jest --testPathPattern="GoalSetupCard\|HydrationStatCards" --no-coverage`
- **After every plan wave:** Run `npx jest --coverage`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 36-01-01 | 01 | 1 | GOAL-01 | — | N/A | unit | `npx jest GoalSetupCard.test --no-coverage` | ❌ W0 | ⬜ pending |
| 36-01-02 | 01 | 1 | GOAL-01 | — | Input validation: parseInt + >0 check | unit | `npx jest GoalSetupCard.test --no-coverage` | ❌ W0 | ⬜ pending |
| 36-01-03 | 01 | 1 | GOAL-01 | — | N/A | unit | `npx jest GoalSetupCard.test --no-coverage` | ❌ W0 | ⬜ pending |
| 36-02-01 | 02 | 1 | GOAL-02 | — | N/A | unit | `npx jest HydrationStatCards.test --no-coverage` | ❌ W0 | ⬜ pending |
| 36-02-02 | 02 | 1 | GOAL-02 | — | N/A | unit | `npx jest HydrationStatCards.test --no-coverage` | ❌ W0 | ⬜ pending |
| 36-02-03 | 02 | 1 | HYD-04 | — | N/A | unit | `npx jest HydrationStatCards.test --no-coverage` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/components/__tests__/GoalSetupCard.test.tsx` — stubs for GOAL-01
- [ ] `src/components/__tests__/HydrationStatCards.test.tsx` — stubs for GOAL-02, HYD-04
- [ ] Mock for `hydrationDb` (follow pattern from GoalSetupForm.test.tsx: `jest.mock('../../db', () => ({ hydrationDb: { ... } }))`)

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Setup card → full view transition (no animation) | GOAL-01 D-03 | Visual rendering assertion requires device | Open app without goal set → set goal → verify immediate transition |
| Inline goal edit keyboard auto-focus | GOAL-02 D-06 | Keyboard behavior requires real device | Tap "GOAL: X fl oz" label → verify keyboard appears |
| Stat cards match quick-add button styling | HYD-04 D-14 | Visual consistency check | Compare stat card border-radius, background, border to quick-add buttons |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
