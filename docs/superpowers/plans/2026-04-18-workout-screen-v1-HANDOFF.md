# WorkoutScreen V1 — Session Handoff (Post-Phase 7)

> **Purpose:** Snapshot state so a compacted session can resume at Task 8.1. Read this first after `/compact`.

## Working environment

- **Worktree:** `C:/Users/eolson/wv1/` (short path — avoids Windows MAX_PATH issues)
- **Branch:** `feat/workout-screen-v1`
- **Backup ref:** `feat/workout-screen-v1-backup-pre-move` pinned at `7a973a4` (pre-move safety net)
- **Restore point on main:** `fe9b89d` (design handoff baseline)
- **Emulator:** `emulator-5554` on `adb devices`
- **Deploy flow:** build with `cd C:/Users/eolson/wv1/android && JAVA_HOME="C:/Program Files/Android/Android Studio/jbr" ./gradlew assembleRelease` (8-10 min), install with `"$LOCALAPPDATA/Android/Sdk/platform-tools/adb.exe" -s emulator-5554 install -r C:/Users/eolson/wv1/android/app/build/outputs/apk/release/app-release.apk`. Use short path — the long `.worktrees/workout-screen-v1/` path hits MAX_PATH on Windows. `local.properties` was copied from main tree and is gitignored.

## Plan + spec location

- **Spec:** `docs/superpowers/specs/2026-04-18-workout-screen-v1-design.md` (commit `cb2dc74`)
- **Plan:** `docs/superpowers/plans/2026-04-18-workout-screen-v1.md` (commit `22291d8`)

## Project conventions (CRITICAL — respect these verbatim)

1. **No new unit tests** (Decision #6). Existing Jest tests may be updated mechanically if they break due to refactoring; NEVER write new test coverage.
2. **Typecheck:** `npx tsc --noEmit 2>&1 | grep -c "error TS"`. Baseline **50** pre-existing errors in unrelated files. Each commit must keep count ≤ 50.
3. **Scope discipline:** every implementer brief says which files to touch. Before each commit, run `git status --short` — only the whitelisted files may appear. A prior commit included an unrelated 1-line change to `DashboardScreen.tsx` that crashed the app on launch.
4. **Commits:** Conventional Commits, all ending with `Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>`.
5. **Review mode:** Compressed for mechanical tasks (implementer + 1 combined review). Full two-stage review (implementer + spec review + code quality review) reserved for integration-heavy tasks — so far that's been 3.2, 7.5. For Phase 8-10 use full review on Task 8.1 (ExerciseCard extraction), 9.2 (superset wiring), and 10.3 (final verification sweep).

## Plan inaccuracies to remember (use these corrected values)

- `checkForPR(exerciseId, weightLbs, reps, currentSessionId)` takes **4 args**, not 3. It excludes the current session in its SQL (`session_id != ?`).
- `logSet(sessionId, exerciseId, weightLbs, reps, isWarmup?)` returns `WorkoutSet` with `id`, `setNumber`, `weightLbs`, `reps`, `isWarmup`.
- `PRToast` API is `prToastRef.current?.showPR(name, reps, weightLbs, unit)` — NOT `flash()` as the plan pseudocode wrote.
- `computeMaxHR(age, override)` takes `(age: number, override: number | null)` — NOT `computeMaxHR(hrSettings)` as the plan wrote.
- `getHRZone(bpm, maxHr)` returns `HRZoneInfo | null` (object with `.zone`, `.color`, etc.) — NOT a plain number. Use `bpmZone?.zone` to extract the 1-5 value.
- `HRZoneInfo.color` in `src/types/index.ts` carries LEGACY colors that diverge from V1 tokens. **Always use `colors.hrZone*` / `getHrZoneColor()`** from `src/theme/colors.ts`, never `HR_ZONES[n].color`.
- Android's `ActionSheetIOS` doesn't exist — use `Alert.alert(...)` for Task 8.1's More menu on Android (plan's sample code has the fallback).

## Phases 1-7 status

**COMPLETE.** On-device smoke test of Phases 3-7 passed (after 5 bug fixes). Commit chain:

```
3b116e9 fix(workout): wire derived aggregates into WorkoutHeader
851e142 fix(workout): label height_reps stepper + NumberPad correctly
35c3978 fix(workout): suppress PR toast for in-session non-best sets
267843b fix(input): NumberPad sheet clears Android navigation bar
729fdde chore(workout): dissolve SetLoggingPanel after V1 state hoist
6cf4a5e refactor(workout): stabilize handleExpandExercise callback
6279cc0 feat(workout): hoist state + wire NumberPad (CRITICAL)
042c67a feat(workout): NextSetPanel
09178ae refactor(workout): reshape GhostReference as history peek
53e74aa fix(workout): remove broken pointerEvents gate on SetRow
9fb026b feat(workout): add SetRow component
57ca577 feat(workout): exerciseCardState types
7a973a4 feat(input): NumberPad slide-up modal component
82a5b6a feat(warmup): reskin WarmupSection (+ buggy DashboardScreen 1-line, later fixed)
44e62bb fix(dashboard): remove broken setCategories call
19517ac feat(session): add skipAllWarmupItems
acbc94f feat(rest): reskin RestTimerBanner
c32c70d feat(timer): addTime(deltaSeconds)
22fe968 feat(workout): mount WorkoutHeader
34e6036 feat(workout): WorkoutHeader component
dde4d59 feat(hr): HrPill component
3b45f6a chore(workout): TODO markers
8b9c8cb refactor(icons): hoist IconProps + Dir to types barrel
56894f6 feat(icons): react-native-svg icon set
682a4ce feat(theme): V1 color tokens
22291d8 docs: implementation plan
cb2dc74 docs: spec
```

## Running parked items (address in the listed task)

1. **`programDayName` is never populated** — WorkoutHeader title falls back to `'WORKOUT'`. TODO comment at `src/screens/WorkoutScreen.tsx:619-622`. Wire from a DB call in Phase 10.2 cleanup OR before shipping.
2. **HrPill has no tap-to-pair entry point** — `scanSheetVisible` state is unreachable from the workout screen after Phase 3.2 removed the inline Bluetooth button. TODO comment at `src/screens/WorkoutScreen.tsx:631-634`. Possible follow-up: tap HrPill when disconnected → `setScanSheetVisible(true)`.
3. **Auto-start rest timer on log** — the V1 spec says logging should auto-start rest; implementation preserved the pre-existing two-step "Start Rest Timer" button flow. Smoke test was fine with two-step; flag for user decision during Phase 10 polish.
4. **Duplicate import of `getSetsForExerciseInSession`** — imported from both `'../db'` (barrel) and `'../db/sets'` (direct). Not a bug; consolidate in Phase 10.2 cleanup.
5. **`isActive` param on SupersetContainer.onPressExercise** is now unused after Phase 7.5. Clean up in Phase 10.2.
6. **`HrZone` vs `HRZoneNumber` type duplication** — `src/types/index.ts` exports `HRZoneNumber = 1|2|3|4|5`, `src/components/HrPill.tsx` re-exports its own `HrZone` of the same shape. Unify in Phase 10.2.

## Pending tasks (8.1 → 10.3) — ready to dispatch

### Task 8.1 — Extract ExerciseCard + CategoryHeader + More menu (FULL REVIEW)

**Files:**
- **Create:** `src/components/ExerciseCard.tsx` (~350 lines)
- **Modify:** `src/screens/WorkoutScreen.tsx` — replace inline ExerciseCard with import; add inline `CategoryHeader` helper; replace old category header JSX with `<CategoryHeader>`

**What:**
- Extract the inline `ExerciseCard` function from `WorkoutScreen.tsx` (lines ~173-330) into its own file.
- Apply V1 styling: 3px category accent bar, collapsed chip row (`{w}×{r}` mint / `{w}×{r} ★` gold for PRs), mint border + surfaceElevated bg when expanded, box-shadow via RN `shadow*` props.
- Add `More` menu (⋯ icon). iOS: `ActionSheetIOS.showActionSheetWithOptions`; Android: `Alert.alert` with `onPress` buttons. Options: Swap exercise → `handleSwap(exId)`, Edit target → `handleEditTarget(exId)`, Cancel.
- Metadata row: `{completed}/{target.sets} SETS` · `{target.reps} × {target.weight} lb` (or `{target.reps}s target` for timed, `{target.reps} × {target.height} in` for height_reps) · optional `🏆 PR` trophy if prCount > 0.
- `CategoryHeader` component: 6px colored dot + uppercase category + 1px divider + `{done}/{total}` counter.

**Props interface (from plan's Task 8.1):** see `ExerciseCardProps` + `SupersetBadge` in plan doc. Pass `sets`, `lastSets`, `next`, `onLog`, `onNextChange`, `onOpenPad`, `onDeleteSet`, `onSwap`, `onEditTarget`, `supersetBadge?`, `insideSuperset?`.

**Preserve:** per-card rest-seconds stepper UI; Start Rest Timer button when `pendingRest` is true.

**Dispatch model:** sonnet. Full two-stage review (spec + quality).

### Task 9.1 — SupersetGroup component (COMPRESSED REVIEW)

**Files:**
- **Create:** `src/components/SupersetGroup.tsx`

**What:** Purple container matching V1 design. Header has `A`/`B` letter badge (26×26), `SUPERSET · N EXERCISES` eyebrow, flow line showing last-word of each member (current highlighted white/700, others secondary/600, arrows purple), `{completedRounds}/{totalRounds} rounds` counter.

`completedRounds = min(sets.length across members)`; `totalRounds = max(target.sets across members)`.

Nested `<ExerciseCard supersetBadge={...} insideSuperset>` for each member. Current member renders a 3px purple glow rail on the outer-left (`shadowColor: supersetPurple, shadowRadius: 6, elevation: 4`).

**Dispatch model:** sonnet. Compressed review (implementer + 1 combined).

### Task 9.2 — Wire SupersetGroup + auto-advance (FULL REVIEW)

**Files:**
- **Modify:** `src/screens/WorkoutScreen.tsx` — add `ssCurrentByGroup` state, swap existing inline `SupersetContainer` for new `<SupersetGroup>`, update `handleLog` superset rotation, add `handleSupersetMemberSelect`, min-rest across members.

**What:**
- `const [ssCurrentByGroup, setSsCurrentByGroup] = useState<Record<number, number>>({});`
- Seed initial current member = first in each group via `useEffect` when `supersetGroups` changes.
- Update existing `handleLog`: when logging a superset member, set `ssCurrentByGroup[groupId] = nextMember` and `setActiveExerciseId(nextMember)`.
- Add `handleSupersetMemberSelect(memberId)` — updates `ssCurrentByGroup` (user override).
- Rest on superset log: `Math.min(...memberRests)` instead of single exercise rest.
- Delete inline `SupersetContainer` + `supersetStyles` block (replaced by `<SupersetGroup>`).
- Helper memos: `exerciseMap: Map<number, Exercise>`, `sessionExerciseMap: Map<number, ExerciseSession>`, `supersetLabelFor(groupId)`.

**Dispatch model:** sonnet. Full two-stage review (spec + quality).

### Task 10.1 — Extract WorkoutSummary (COMPRESSED REVIEW)

**Files:**
- **Create:** `src/components/WorkoutSummary.tsx`
- **Modify:** `src/screens/WorkoutScreen.tsx`

**What:** Pure mechanical move of the inline `WorkoutSummary` function + its `summaryStyles` block from `WorkoutScreen.tsx` into its own file. NO visual change.

**Dispatch model:** haiku or sonnet. Compressed review.

### Task 10.2 — Dead code cleanup (COMPRESSED REVIEW)

**Files:** varies — lint-driven.

**What:** Run `npm run lint` + `npx tsc --noEmit`. Remove unused imports in `WorkoutScreen.tsx` (check: `HRConnectionIndicator` import — already removed; `Svg`, `Path` — still used by `HistoryIcon` inline helper; `setCompletionMessage` — orphan if never called).

Delete `src/components/SetListItem.tsx` if no consumers. Confirm its tests (if any) were deleted in Phase 7.6 or delete now.

Address parked items from the list above (programDayName wiring optional, HrZone type unification, duplicate imports).

**Dispatch model:** sonnet. Compressed review.

### Task 10.3 — Final verification sweep (FULL REVIEW)

**What:**
- `npm test` — expect 34 failed / 55 passed (pre-existing SQLite mock issues). No new failures.
- `npm run lint` — address any warnings that this PR introduced.
- `npx tsc --noEmit` — confirm baseline ≤ 50.
- Deploy + full acceptance test walkthrough from the plan (see plan doc Phase 10 Task 10.3 Step 4).
- Verify `fe9b89d` still reachable as restore point: `git log --oneline main | head -3`.

**Dispatch model:** sonnet. Full two-stage review.

## Task IDs in current TaskList

IDs 25, 26, 27, 28, 29, 30 correspond to Plan Tasks 8.1, 9.1, 9.2, 10.1, 10.2, 10.3 respectively. All currently `pending`.

## How to resume after `/compact`

1. Read this file first.
2. Read `docs/superpowers/plans/2026-04-18-workout-screen-v1.md` Task 8.1 section for complete code.
3. Read `docs/superpowers/specs/2026-04-18-workout-screen-v1-design.md` §Component Interfaces → ExerciseCard, SupersetGroup sections.
4. Check worktree state: `cd C:/Users/eolson/wv1 && git log --oneline -5 && git status --short`.
5. Start with Task 8.1 implementer dispatch. Use `superpowers:subagent-driven-development` pattern (compressed or full review per this doc).
6. Ask user to smoke-test after Task 8.1 (first on-device regression risk since Phase 7).
