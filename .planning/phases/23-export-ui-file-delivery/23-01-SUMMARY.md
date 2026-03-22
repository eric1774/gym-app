---
phase: 23-export-ui-file-delivery
plan: 01
subsystem: ui
tags: [react-native, share-api, modal, animated-toast, menu, export]

# Dependency graph
requires:
  - phase: 22-export-data-layer
    provides: exportProgramData function returning ProgramExport type
provides:
  - Three-dot menu on every program card with Export and Delete options
  - ExportToast component (mint-green success, red error, slide-down animation)
  - Full export flow: menu tap -> exportProgramData -> Share.share -> result toast
  - Filename pattern: ProgramName_YYYY-MM-DD.json with special-char sanitization
affects: []

# Tech tracking
tech-stack:
  added: []
  patterns:
    - forwardRef/useImperativeHandle toast pattern (ExportToast follows PRToast pattern)
    - Modal+Pressable backdrop for dismissible dropdown menu (PopupMenu component)
    - Ref-based imperative toast API for cross-component feedback

key-files:
  created:
    - src/components/ExportToast.tsx
    - src/components/__tests__/ExportToast.test.tsx
  modified:
    - src/screens/ProgramsScreen.tsx
    - src/screens/__tests__/ProgramsScreen.test.tsx

key-decisions:
  - "nativeEvent access guarded with optional chaining (?.) for test environment compatibility (fireEvent.press does not provide nativeEvent)"
  - "PopupMenu uses Modal with transparent + Pressable backdrop for native-feeling dismissal"
  - "menuStyles kept as separate StyleSheet from main styles for clean separation"

patterns-established:
  - "ExportToast pattern: forwardRef toast with show(message, type) API, queue-based sequencing, same 300ms/250ms/3s timing as PRToast"
  - "Menu button uses testID='menu-button' for reliable test selection without text matching"

requirements-completed: [UI-01, UI-02, UI-03, FILE-01, FILE-02]

# Metrics
duration: 6min
completed: 2026-03-22
---

# Phase 23 Plan 01: Export UI and File Delivery Summary

**Three-dot menu on program cards with Export (share dialog, ProgramName_YYYY-MM-DD.json) and Delete, plus mint-green ExportToast for success/error feedback**

## Performance

- **Duration:** ~6 min
- **Started:** 2026-03-22T17:57:52Z
- **Completed:** 2026-03-22T18:03:41Z
- **Tasks:** 3
- **Files modified:** 4

## Accomplishments

- ExportToast component with mint-green success and dark-red error styling, same forwardRef/queue/animation pattern as PRToast
- PopupMenu inline component with Modal transparent backdrop, three-dot button on every ProgramCard
- Full export flow: menu opens -> Export tap -> spinner in menu item -> exportProgramData -> Share.share with sanitized filename -> success/error toast
- Delete option in menu replaces long-press behavior entirely
- 17 tests pass: 4 ExportToast unit tests + 13 ProgramsScreen tests (including 5 new tests for menu and export flow)

## Task Commits

1. **Task 1: Create ExportToast component** - `a55c58d` (feat)
2. **Task 2: Add three-dot menu and export flow to ProgramsScreen** - `fe77183` (feat)
3. **Task 3: Update ProgramsScreen tests for menu behavior** - `b348dcd` (test)

## Files Created/Modified

- `src/components/ExportToast.tsx` - Mint-green slide-down toast with forwardRef show(message, type) API
- `src/screens/ProgramsScreen.tsx` - Three-dot menu, PopupMenu component, handleExport, handleDeleteFromMenu, ExportToast integration
- `src/components/__tests__/ExportToast.test.tsx` - 4 unit tests: null render, success, error, ref API
- `src/screens/__tests__/ProgramsScreen.test.tsx` - Updated delete tests (menu-driven) + 5 new tests for menu/export behavior

## Decisions Made

- `nativeEvent` access guarded with optional chaining (`?.`) on the menu button's `onPress` handler — `fireEvent.press` in `@testing-library/react-native` does not provide a synthetic event with `nativeEvent`, so the guard prevents test crashes without affecting production behavior (production always has `nativeEvent.pageY`)
- `PopupMenu` uses `Modal transparent` with a `Pressable` full-screen backdrop for backdrop-dismiss — this gives native modal stacking above the navigation stack while keeping implementation simple
- `menuStyles` is a separate `StyleSheet.create({})` from the main `styles` — keeps menu-specific styles cleanly separated and easy to identify

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Guarded nativeEvent access in menu button onPress for test compatibility**
- **Found during:** Task 3 (tests)
- **Issue:** `fireEvent.press` doesn't provide `nativeEvent`, causing `TypeError: Cannot read properties of undefined (reading 'nativeEvent')` in all 5 menu-related tests
- **Fix:** Changed `e.nativeEvent.pageY` to `(e?.nativeEvent?.pageY ?? 0)` in ProgramCard's three-dot button onPress
- **Files modified:** src/screens/ProgramsScreen.tsx
- **Verification:** All 13 ProgramsScreen tests pass after fix
- **Committed in:** b348dcd (Task 3 commit)

---

**Total deviations:** 1 auto-fixed (Rule 1 - bug)
**Impact on plan:** Minor guard addition for test environment compatibility. No behavior change in production.

## Issues Encountered

None beyond the nativeEvent guard documented above.

## Next Phase Readiness

- v1.5 Program Data Export milestone is complete: data layer (Phase 22) + UI/delivery (Phase 23) both done
- Export flow fully functional: menu -> data fetch -> share dialog -> result toast
- All acceptance criteria met: three-dot menu, spinner, share dialog, filename pattern, success/error toasts, no toast on cancel, delete via menu

---
*Phase: 23-export-ui-file-delivery*
*Completed: 2026-03-22*
