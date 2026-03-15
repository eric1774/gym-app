---
phase: 15-test-infrastructure
plan: 01
subsystem: testing
tags: [jest, coverage, lcov, react-native, testing-infrastructure]

# Dependency graph
requires: []
provides:
  - Jest configuration with 80% line/statement and 70% function/branch coverage thresholds
  - lcov reporter producing coverage/lcov.info for tooling integration
  - jest.setup.js silencing console noise and mocking LogBox for all test runs
  - test:coverage npm script for CI/CD integration
  - coverage/ excluded from git tracking

affects:
  - 16-utility-tests
  - 17-db-layer-tests
  - 18-context-hook-tests
  - 19-component-tests
  - 20-screen-tests
  - 21-coverage-enforcement

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Jest coverageThreshold enforces 80% lines/statements and 70% functions/branches globally"
    - "lcov + text-summary reporters: machine-readable coverage/lcov.info plus human stdout summary"
    - "setupFilesAfterEnv loads jest.setup.js to silence console.warn/error and mock LogBox before each suite"
    - "transformIgnorePatterns includes @notifee and @react-navigation so their ESM source is babel-transformed"

key-files:
  created:
    - jest.setup.js
  modified:
    - jest.config.js
    - package.json
    - .gitignore

key-decisions:
  - "setupFilesAfterEnv (not setupFilesAfterFramework) is the correct Jest config key — plan had a typo that was auto-fixed"
  - "coverageThreshold uses 80% for lines/statements, 70% for functions/branches to accommodate UI-heavy conditional renders"
  - "collectCoverageFrom excludes src/types/, src/theme/, src/navigation/ — tested via screen tests not direct coverage"

patterns-established:
  - "All test suites run under jest.setup.js environment (console silenced, LogBox mocked)"
  - "Coverage threshold enforcement gates npm run test:coverage — intentionally fails until Phase 21 when tests are complete"

requirements-completed: [INFRA-01, INFRA-02]

# Metrics
duration: 2min
completed: 2026-03-15
---

# Phase 15 Plan 01: Jest Coverage Infrastructure Summary

**Jest configured with 80%/70% coverage thresholds, lcov reporter, and npm test:coverage script wiring all subsequent test phases together**

## Performance

- **Duration:** 2 min
- **Started:** 2026-03-15T19:51:53Z
- **Completed:** 2026-03-15T19:53:53Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments
- Full Jest coverage configuration replacing the single-line preset-only config
- jest.setup.js created to silence console noise and mock LogBox across all test suites
- test:coverage npm script added for CI and local coverage generation
- coverage/ directory gitignored to prevent lcov artifacts from entering the repository

## Task Commits

Each task was committed atomically:

1. **Task 1: Configure Jest with coverage thresholds and lcov reporter** - `108dfe4` (chore)
2. **Task 2: Add test:coverage npm script and verify end-to-end** - `32e19f7` (chore)

## Files Created/Modified
- `jest.config.js` - Full Jest config: preset, coverageThreshold (80/70), lcov reporter, collectCoverageFrom, transformIgnorePatterns
- `jest.setup.js` - Global test setup: silences console.warn/error, mocks LogBox
- `package.json` - Added "test:coverage": "jest --coverage" script
- `.gitignore` - Added coverage/ exclusion

## Decisions Made
- Used 80% lines/statements and 70% functions/branches to accommodate UI-heavy codebase with many conditional renders
- Excluded src/types/, src/theme/, src/navigation/ from coverage collection since these are tested transitively via screen tests
- Added @notifee and @react-navigation to transformIgnorePatterns to ensure their ESM source files are babel-transformed in tests

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed setupFilesAfterFramework typo to setupFilesAfterEnv**
- **Found during:** Task 2 (Jest showConfig verification)
- **Issue:** Plan specified `setupFilesAfterFramework` which is not a valid Jest option — Jest emitted "Unknown option" warning and the setup file was not loaded
- **Fix:** Corrected to `setupFilesAfterEnv` which is the actual Jest configuration key
- **Files modified:** jest.config.js
- **Verification:** `npx jest --showConfig` runs cleanly with no unknown option warnings; setup file is listed in setupFilesAfterEnv array
- **Committed in:** 32e19f7 (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 bug — typo in plan)
**Impact on plan:** Fix was essential for jest.setup.js to actually load. No scope creep.

## Issues Encountered
- Pre-existing App.test.tsx fails due to react-native-background-timer requiring native module in test environment — out of scope for this plan, not caused by config changes. Jest config itself loads cleanly.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Jest infrastructure complete: all test phases (16-21) can now add tests and run npm run test:coverage
- coverage/ will accumulate as tests are added; threshold enforcement intentionally fails until Phase 21
- No blockers for Phase 15 Plan 02

---
*Phase: 15-test-infrastructure*
*Completed: 2026-03-15*
