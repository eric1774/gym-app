---
phase: 28
plan: 02
name: dead-code-removal
subsystem: types, services, screens
tags: [dead-code, cleanup, types, HRSettings, WorkoutScreen]
requirements_completed: [BLE-03, HR-02, HR-03]
dependency_graph:
  requires: [28-01]
  provides: []
  affects: [src/types/index.ts, src/services/HRSettingsService.ts, src/screens/WorkoutScreen.tsx]
tech_stack:
  added: []
  patterns: [dead-code-removal, non-null-assertion]
key_files:
  modified:
    - src/types/index.ts
    - src/services/HRSettingsService.ts
    - src/screens/WorkoutScreen.tsx
    - src/services/__tests__/HRSettingsService.test.ts
    - src/screens/__tests__/SettingsScreen.test.tsx
decisions:
  - Replaced effectiveAge ?? 35 fallback with age! non-null assertion plus comment explaining the invariant
  - Removed entire getComputedMaxHR function and its test block (3 tests) — unused export
  - HRSample in types/index.ts was dead because HeartRateContext imports from db/sessions not from types
metrics:
  duration_seconds: 284
  tasks_completed: 3
  files_modified: 5
  completed_date: "2026-03-29"
---

# Phase 28 Plan 02: Dead Code Removal Summary

Remove three dead code items identified in the v1.6 milestone audit: unused HRSample type, unused getComputedMaxHR export, and dead effectiveAge fallback in WorkoutScreen bpmZone computation.

## What Was Built

Three targeted dead code removals across types, services, and screens:

1. **HRSample removed from `src/types/index.ts`** — The interface in types/index.ts (with `id`, `sessionId`, `bpm`, `recordedAt` fields) was never imported by production code. `HeartRateContext.tsx` imports the authoritative `HRSample` from `src/db/sessions.ts` (which has only `bpm` and `recordedAt` — the in-memory buffer type).

2. **getComputedMaxHR removed from `src/services/HRSettingsService.ts`** — This async function was exported but never called in production code. `SettingsScreen.tsx` imported it but never invoked it. Removed the function, cleaned the import in SettingsScreen, removed the 3-test describe block in HRSettingsService.test.ts, and removed the mock entry in SettingsScreen.test.tsx.

3. **effectiveAge fallback removed from `WorkoutScreen.tsx` bpmZone useMemo** — The `age ?? 35` fallback was dead because: when `age === null && override !== null`, `computeMaxHR` returns `override` directly and never uses the age argument. Replaced with `age!` non-null assertion plus an explanatory comment.

## Tasks Completed

| Task | Description | Commit |
|------|-------------|--------|
| 1 | Remove HRSample dead type from types/index.ts | 7cf71ce |
| 2 | Remove getComputedMaxHR dead export from HRSettingsService | 2f042d3 |
| 3 | Remove effectiveAge fallback dead code from WorkoutScreen.tsx | 81b0e8a |

## Verification

- TypeScript compilation produces no errors in the changed files
- Test infrastructure limitation: Jest ignores worktree paths (pre-existing) — tests verified logically correct via manual review
- All dead code successfully removed per success criteria

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None.

## Self-Check: PASSED

- `src/types/index.ts` modified — HRSample interface removed
- `src/services/HRSettingsService.ts` modified — getComputedMaxHR function removed
- `src/screens/WorkoutScreen.tsx` modified — effectiveAge variable removed
- Commits 7cf71ce, 2f042d3, 81b0e8a verified in git log
