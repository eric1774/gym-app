# WorkoutScreen V1 (Stacked Cards) — Design Spec

**Date:** 2026-04-18
**Branch:** `feat/workout-screen-v1`
**Worktree:** `.worktrees/workout-screen-v1`
**Restore point:** `fe9b89d` (design handoff) / `e60e720` (worktree setup)
**Input bundle:** `design_handoff_workout_screen/` (HTML prototype, JSX mocks, README, icon set)

## Overview

Redesign `src/screens/WorkoutScreen.tsx` to the "V1 Stacked Cards" layout documented in `design_handoff_workout_screen/README.md`. Keep the existing information architecture — one screen per workout, exercises grouped by category, inline set logging — but make sets/reps/history visually distinct, make adding a set a one-tap action, add a clearly distinct warm-up section, and introduce a live heart-rate readout fed by the existing BLE integration.

**This is a client-only redesign.** No DB schema changes, no new API endpoints, no new data sources.

## Goals

- Pixel-faithful port of the V1 design to React Native using the project's theme tokens.
- Keep every existing behavior (logging, PR detection, rest timer, superset rotation, warmup flow, BLE HR, edit targets, swap exercise) intact.
- Each rollout phase leaves a shippable, smoke-testable app.
- Zero DB migration risk.

## Non-Goals (Out of Scope)

- Post-finish `WorkoutSummary` visual redesign (extract to its own file for cleanliness only).
- Add-exercise-mid-workout UI (`ExercisePickerSheet`) styling.
- `DeviceScanSheet` internal design.
- Persistent `isPR` column on `WorkoutSet` (in-memory only for V1 — see Decisions).
- Per-superset `restSec` column (deferred — fallback to min of member rest).
- New unit tests (deploy + on-device smoke test per phase is the verification path).

---

## Decisions (from brainstorming Q&A)

| # | Decision | Rationale |
|---|----------|-----------|
| 1 | **Rollout strategy: component-first, screen-last (10 phases)** | Every commit leaves the app runnable and `/deploy`-testable. Dependency order dictates phase order. |
| 2 | **Next-set state hoisted to `WorkoutScreen`** | Spec's state shape has `nextW`/`nextR` per exercise; the external `NumberPad` at screen level needs to write into whichever card is active. `SetLoggingPanel` becomes a controlled component (or dissolves). |
| 3 | **`NumberPad` fully replaces the native keyboard** | Tap-to-open modal. No `<TextInput keyboardType="decimal-pad">`. Design was built around dedicated weight/reps affordances with mint caret. |
| 4 | **`isPR` is in-memory per session** | No schema change. Stars appear on sets logged this session; lost on app relaunch mid-session. Matches spec's ephemeral `{w, r, isPR?}` shape. |
| 5 | **Swap + Edit-target move to a `More` (⋯) menu** | Keeps card chrome clean; preserves features via ActionSheet routing to existing `SwapSheet` + `EditTargetsModal`. |
| 6 | **Verification: deploy + smoke test only** | No new unit tests written as part of V1. Existing `__tests__/` continue to run and must not regress. |

---

## Architecture & File Layout

**New screen structure** replacing current `WorkoutScreen.tsx`:

```
WorkoutScreen (orchestrator, post-rewrite ~400-500 lines)
├── WorkoutHeader         (fixed top: LIVE dot, elapsed, HrPill, FINISH, stats row)
├── RestTimerBanner       (conditional; below header; existing component reskinned)
└── ScrollView
    ├── WarmupSection     (always first; existing component reskinned)
    └── For each section of workout plan:
        ├── CategoryHeader (6px dot + CATEGORY + divider + N/M done)
        ├── ExerciseCard × N            (standalone)
        └── SupersetGroup
            └── ExerciseCard × 2+        (nested, with A1/A2 badge)
```

**Also mounted at screen level (siblings to the ScrollView):**

- `<NumberPad>` — single instance, driven by `pad` state
- `<PRToast>` — existing
- `<SwapSheet>`, `<EditTargetsModal>` — existing, invoked from `More` menu
- `<WorkoutSummary>` (extracted to own file in Phase 10) — shown post-finish

### New files

```
src/components/icons/
  index.ts                    # barrel export
  Plus.tsx        Minus.tsx   Check.tsx       History.tsx     More.tsx
  Chevron.tsx     Swap.tsx    Flame.tsx       Trophy.tsx      Close.tsx
  Timer.tsx       Heart.tsx   Backspace.tsx
src/components/HrPill.tsx
src/components/WorkoutHeader.tsx
src/components/NumberPad.tsx
src/components/SupersetGroup.tsx
src/components/ExerciseCard.tsx        # extracted from WorkoutScreen + reshaped
src/components/NextSetPanel.tsx        # new — may be folded into ExerciseCard
src/components/SetRow.tsx              # new — 4-col grid for logged sets
```

### Reworked files

```
src/screens/WorkoutScreen.tsx          # layout rewrite (~1773 → ~500 lines)
src/components/SetLoggingPanel.tsx     # dissolved into ExerciseCard's expanded body;
                                       # file may be deleted or kept as thin facade
src/components/SetListItem.tsx         # repurposed OR replaced by SetRow
src/components/RestTimerBanner.tsx     # reskin only (amber gradient, icon, pills)
src/components/GhostReference.tsx      # reshaped as collapsible dashed "Last session" peek
src/components/WarmupSection.tsx       # reskin (amber↔mint), progress bar, SKIP TO WORKOUT
```

### Untouched

- `ExercisePickerSheet`, `SwapSheet`, `EditTargetsModal` — invoked from `More` menu
- `PRToast`, `HRConnectionIndicator`, `DeviceScanSheet` — unchanged
- `WorkoutSummary` — extracted to own file in Phase 10; visuals unchanged
- All contexts (`SessionContext`, `TimerContext`, `HeartRateContext`, `StopwatchContext`) — contract-stable; one new method on `SessionContext` (see State Model)
- All DB files — unchanged

### Icon library

- One `.tsx` per icon under `src/components/icons/`, barrel-exported via `index.ts`
- Paths, viewBox, and stroke widths match `design_handoff_workout_screen/icons.jsx` exactly
- Uses `react-native-svg` (already a dependency)
- 13 icons total: Plus, Minus, Check, History, More, Chevron, Swap, Flame, Trophy, Close, Timer, Heart, Backspace

---

## Component Interfaces

### ExerciseCard

Replaces the inline `ExerciseCard` helper in the current `WorkoutScreen.tsx`. Two visual states: collapsed (summary + chip row) and expanded (full logging UI). Only one card expanded at a time — governed by `activeExerciseId` at screen level.

```ts
interface ExerciseCardProps {
  exerciseSession: ExerciseSession;
  exercise: Exercise;
  isActive: boolean;                       // expanded = active
  programTarget: ProgramTarget | null;
  sets: SetState[];                        // session-scoped, from setsByExercise[id]
  nextW: number;                           // from nextByExercise[id].w
  nextR: number;                           // from nextByExercise[id].r
  restSeconds: number;                     // from restOverrides or session default
  lastSessionSets: WorkoutSet[] | null;    // null = not yet fetched
  supersetBadge?: {
    label: string;                         // "A", "B", ...
    index: number;                         // 0-based position within group
    isCurrent: boolean;                    // drives purple glow rail
    color: string;                         // '#B57AE0'
  };
  onExpand: () => void;
  onToggleComplete: () => void;
  onLog: () => void;                       // reads nextW/nextR from parent
  onNextChange: (field: 'w' | 'r', value: number) => void;
  onOpenPad: (field: 'w' | 'r') => void;
  onOpenHistory: () => void;               // toggles local history-peek state
  onMore: () => void;                      // opens ActionSheet (Swap/Edit/Delete)
}
```

**Collapsed state:** 3px category accent bar + exercise name + metadata row (`N/M sets` · `reps × weight lb` · optional `🏆 PR`) + check-circle. If any sets logged: chip row with `{w}×{r}` or `{w}×{r} ★` (PR).

**Expanded state:** Above + mint border/shadow + expanded body:
1. Logged sets list (`SetRow`s)
2. History peek (repurposed `GhostReference` — collapsible dashed button)
3. `NextSetPanel` (stepper rows or timer display)
4. `LOG SET {n}` button (mint, full-width)

### NumberPad

```ts
interface NumberPadProps {
  visible: boolean;
  field: 'weight' | 'reps';
  initialValue: number;
  label?: string;                          // e.g. "BENCH PRESS"
  onCommit: (value: number) => void;
  onCancel: () => void;
}
```

- Internal state: `buf: string`. On open, `buf = String(initialValue ?? '')`.
- Commits `parseFloat(buf) || 0`. 5-char cap.
- Uses RN `Modal` (transparent, slide animation) or `Animated.View` on an overlay.
- 3×4 grid: `7 8 9 / 4 5 6 / 1 2 3 / . 0 ⌫`. Bottom row: `CANCEL` (flex 1) + `CONFIRM` (flex 2, mint).

### HrPill

```ts
interface HrPillProps {
  bpm: number | null;                      // null = disconnected
  zone: 1 | 2 | 3 | 4 | 5 | null;
}
```

- Zone → color: `[#5B9BF0, #8DC28A, #FACC15, #E8845C, #E0697E]`
- Background: `linear-gradient(135deg, ${color}22, ${color}0a)` (RN: emulate via two layered `View`s or `react-native-linear-gradient` if already in deps; otherwise solid tint)
- Border: `1px solid ${color}44`
- When `bpm === null`: display `--`, use `#6A6E74`, ignore zone
- Heart icon (filled) + two-column inline layout: BPM (18/800/tabular) + `Z{zone} · BPM` label (8/800/letter-spacing 1.2)

### WorkoutHeader

```ts
interface WorkoutHeaderProps {
  title: string;                           // e.g. 'PUSH DAY' from program day name
  elapsed: number;                         // seconds
  volume: number;                          // lb
  setCount: number;
  prCount: number;
  hr: { bpm: number | null; zone: 1|2|3|4|5|null };
  onFinish: () => void;
}
```

- Row 1 left: `LIVE · {title}` eyebrow with pulsing mint dot (1.4s opacity cycle via `Animated.loop`) + big elapsed MM:SS (32/800/tabular).
- Row 1 right: `<HrPill>` + FINISH button (coral bg/border).
- Row 2: VOLUME | SETS | PRS stats with 1px vertical dividers.

### SupersetGroup

```ts
interface SupersetGroupProps {
  groupId: number;
  label: string;                           // 'A', 'B'
  memberIds: number[];
  exerciseMap: Map<number, Exercise>;
  sessionMap: Map<number, ExerciseSession>;
  setsByExercise: Record<number, SetState[]>;
  nextByExercise: Record<number, { w: number; r: number }>;
  lastSetsByExercise: Record<number, WorkoutSet[] | null>;
  programTargetsMap: Map<number, ProgramTarget>;
  restOverrides: Record<number, number>;
  currentMemberId: number;                 // drives "← NOW" + glow
  activeExerciseId: number | null;
  onExpand: (id: number) => void;
  onToggleComplete: (id: number) => void;
  onLog: (id: number) => void;
  onNextChange: (id: number, field: 'w'|'r', value: number) => void;
  onOpenPad: (id: number, field: 'w'|'r') => void;
  onOpenHistory: (id: number) => void;
  onMore: (id: number) => void;
}
```

- Purple container: `bg linear-gradient(180deg, rgba(181,122,224,0.05), rgba(181,122,224,0.01))`, border `1px rgba(181,122,224,0.28)`, radius 20.
- Header: 26×26 purple badge (`A`/`B`) + `SUPERSET · N EXERCISES` eyebrow + flow line (last-word of each member with purple `→` separators; current member in white/700, others gray/600) + `{completedRounds}/{totalRounds} rounds` counter.
- `completedRounds = min(sets.length across members)`, `totalRounds = max(target.sets across members)`.
- Nested `ExerciseCard`s with `supersetBadge` prop. Current member gets 3px purple glow rail on outer-left.
- **Auto-advance:** on `onLog(id)` for a member, parent rotates `ssCurrentByGroup[groupId]` to the next member and sets `activeExerciseId` to that member. Tapping a non-current member overrides (sets both `currentMemberId` and `activeExerciseId`).

### NextSetPanel

Internal to `ExerciseCard` expanded body. May live as a nested component or as a function inside `ExerciseCard.tsx`.

**Reps mode:**
- Top row: 24×24 set-number badge + `NEXT SET` eyebrow
- Two `StepperRow`s: WEIGHT (step 5), REPS (step 1)
  - Each row: label (54px min-width) + value button (flex 1, tap → `onOpenPad`) + − (38×38) + + (38×38 mint)

**Timed mode:**
- Centered duration display (`MM:SS`, 28/700/mint) reading from existing `StopwatchContext` via `getStopwatch(exerciseId)`
- Preserves current stopwatch start/stop/reset UI (Phase 7 keeps the existing `SetLoggingPanel` stopwatch code path; reshapes only the reps-mode UI)

**Height-reps mode:**
- Same as reps mode but weight stepper uses step 2 (inches)
- Preserved from existing `SetLoggingPanel` logic

### SetRow

```ts
interface SetRowProps {
  setNumber: number;
  weightLbs: number;
  reps: number;
  type: 'done' | 'pr' | 'active' | 'pending';
  isTimed?: boolean;
  isHeightReps?: boolean;
  onLongPress?: () => void;                // reveal delete affordance
  onDelete?: () => void;
}
```

- 4-col grid: `28px 1fr 1fr 40px`, gap 12, padding `10px 14px`, min-height 44, radius 10
- Col 1: 24×24 status dot (PR gold+check / done mint+check / active white+number / pending transparent with border)
- Col 2: `{w} lb` (or `MM:SS` for timed)
- Col 3: `{r} reps` (empty for timed)
- Col 4: trophy icon if PR, else empty
- Row bg: regular transparent / active `rgba(141,194,138,0.06)` / PR `rgba(255,184,0,0.06)`
- **Long-press-to-delete preserved** from current `SetListItem`. Flag during Phase 7 deploy to confirm UX.

---

## State Model

### Screen-level state (owned by `WorkoutScreen`)

```ts
// Per-exercise session state — hoisted from SetLoggingPanel
type SetState = { id: number; w: number; r: number; isPR?: boolean };
const [setsByExercise, setSetsByExercise] = useState<Record<number, SetState[]>>({});
const [nextByExercise, setNextByExercise] = useState<Record<number, { w: number; r: number }>>({});
const [lastSetsByExercise, setLastSetsByExercise] = useState<Record<number, WorkoutSet[] | null>>({});

// UI state
const [activeExerciseId, setActiveExerciseId] = useState<number | null>(null);
const [pad, setPad] = useState<null | {
  exerciseId: number;
  field: 'w' | 'r';
  initialValue: number;
  label: string;
}>(null);
const [historyOpenFor, setHistoryOpenFor] = useState<number | null>(null);

// Superset rotation
const [ssCurrentByGroup, setSsCurrentByGroup] = useState<Record<number, number>>({});

// Derived aggregates (useMemo)
const volume  = useMemo(() => sum of w*r across setsByExercise, [setsByExercise]);
const setCount = useMemo(() => total set count, [setsByExercise]);
const prCount  = useMemo(() => count of sets where isPR, [setsByExercise]);
```

### Carried over (unchanged sources)

- `elapsed: number` — via existing `useElapsedSeconds(session.startedAt)`
- Rest timer — via `useTimer()` context (`remainingSeconds`, `totalSeconds`, `startTimer`, `stopTimer`)
- Heart rate — via `useHeartRate()` context (`deviceState`, `currentBpm`); `zone = getHRZone(currentBpm, hrMax)` where `hrMax = computeMaxHR(hrSettings, userAge)`
- Warmup — via `useSession()` (`warmupItems`, `warmupState`, `toggleWarmupItemComplete`, `collapseWarmup`, `expandWarmup`, `dismissWarmup`, `loadWarmupTemplate`)
- Supersets — via existing `supersetGroups: Map<number, number[]>` and `exerciseSupersetMap: Map<number, number>`
- Program targets — via existing `programTargetsMap: Map<number, ProgramTarget>`
- Rest overrides — via existing `restOverrides: Record<number, number>`

### Context extension

**`SessionContext` gains one method:**

```ts
skipAllWarmupItems: () => Promise<void>;
```

Implementation: iterate `warmupItems` and call the existing item-toggle path for any incomplete item, OR add a dedicated DB function `markAllWarmupItemsComplete(sessionId)` for one-shot update. Decide during Phase 5.

### Flows

**Initialization (session loads):**
1. For each `sessionExercise`, seed `nextByExercise[id] = { w: programTarget?.targetWeightLbs ?? 0, r: programTarget?.targetReps ?? 0 }`.
2. Set `lastSetsByExercise[id] = null` (lazy-fetch on first expand).
3. `setsByExercise[id] = []`. On rehydrate mid-session, call `getSetsForExerciseInSession(sessionId, id)` and populate with `isPR: undefined`.

**Log-set:**
```
tap LOG SET in card[exId]
  → WorkoutScreen.handleLog(exId)
  → reads nextByExercise[exId]
  → await logSet(sessionId, exId, w, r)             # existing DB call
  → await checkForPR(exId, w, r, userBodyweight)     # existing
  → setsByExercise[exId].append({ ...newSet, isPR })
  → if isPR: prToastRef.current?.flash()
  → startTimer(restOverrides[exId] ?? sessionExercise.restSeconds)
  → if exercise is in superset:
      ssCurrentByGroup[groupId] = next member
      activeExerciseId = next member
  → nextByExercise[exId] unchanged (next set likely same w/r)
```

**Number-pad open/commit:**
```
tap weight value in card[exId]
  → ExerciseCard.onOpenPad('w')
  → WorkoutScreen.setPad({ exerciseId: exId, field: 'w',
                          initialValue: nextByExercise[exId].w,
                          label: exerciseName })
  → <NumberPad visible={pad !== null} {...pad}
      onCommit={v => {
        setNextByExercise({ ...n, [exId]: { ...n[exId], w: v } });
        setPad(null);
      }}
      onCancel={() => setPad(null)} />
```

**History peek lazy-fetch (first expand of card):**
```
on first tap to expand exerciseId
  → if lastSetsByExercise[exId] == null:
      const sets = await getLastSessionSets(exId, sessionId)
      setLastSetsByExercise({ ...lsb, [exId]: sets })
```

**Superset auto-advance:** see Log-set flow. Additionally, tapping a non-current member of a superset updates both `ssCurrentByGroup[groupId]` and `activeExerciseId`.

---

## Schema

**Zero DB migrations.**

The V1 redesign is purely presentational + state reorganization on the client. Every data structure the design needs already exists:

| Spec need | Existing source |
|-----------|-----------------|
| Warmup drills per session | `SessionContext.warmupItems` + `src/db/warmups.ts` + `WarmupSessionItem` |
| Superset groups | `supersetGroups: Map<number, number[]>` + `exerciseSupersetMap` (seeded from DB) |
| Per-exercise rest | `ExerciseSession.restSeconds` + `restOverrides` |
| Last-session history | `getLastSessionSets(exerciseId, sessionId)` |
| Program targets | `ProgramTarget` + `programTargetsMap` |
| PR detection | `checkForPR(exerciseId, weightLbs, reps, userBodyweight)` |

**Deferred for future work (NOT in V1):**
- `Superset.restSec` column — spec mentions optional per-superset rest; V1 falls back to `min(member.restSec)`.
- `isPR` column on `WorkoutSet` — V1 keeps PR flag in memory (Decision #4).

---

## Rollout — 10 Phases

Each phase = one focused commit (or a small series within one logical boundary). Each phase must leave the app runnable and deployable via `/deploy`.

### Phase 0 — Restore point + worktree [DONE]
- Commit `fe9b89d`: design handoff materials.
- Commit `e60e720`: `.gitignore` update for `.worktrees/`.
- Worktree created at `.worktrees/workout-screen-v1` on branch `feat/workout-screen-v1`.
- `npm install` completed cleanly.

### Phase 1 — Icon library
- Create `src/components/icons/` with 13 `.tsx` files + `index.ts` barrel.
- Each icon uses `react-native-svg` with paths/strokes identical to `design_handoff_workout_screen/icons.jsx`.
- No consumers yet. Adds unused exports. Verification: `npm run typecheck` passes.

### Phase 2 — HrPill
- `src/components/HrPill.tsx`. Zone→color map, null-bpm disconnected state.
- Not consumed yet. Verification: `npm run typecheck` passes.

### Phase 3 — WorkoutHeader (first visible UI change)
- `src/components/WorkoutHeader.tsx` consuming `HrPill` + icons.
- `WorkoutScreen.tsx` replaces its current top chrome with `<WorkoutHeader>` wired to `useElapsedSeconds`, `useHeartRate`, `getHRZone`, plus the derived `volume`/`setCount`/`prCount` aggregates (initially zero — full wiring completes in Phase 7).
- `/deploy` + smoke: live badge pulses, stats render, HR pill color changes with zone, FINISH button triggers existing finish flow.

### Phase 4 — RestTimerBanner reskin (in-place)
- Edit `src/components/RestTimerBanner.tsx` styles: amber gradient, 32×32 timer-icon circle, MM:SS display, +15s neutral pill + SKIP yellow pill, 3px progress bar (`remainingSeconds / totalSeconds`).
- Prop shape unchanged. Add an `onAdd` prop for +15s if not present (wires to `TimerContext.addTime(15)` or equivalent — add the context method if needed).
- `/deploy` + smoke: start a rest → banner slides in amber, +15s adds time, SKIP clears.

### Phase 5 — WarmupSection reskin (in-place)
- Edit `src/components/WarmupSection.tsx`: amber→mint color swap on complete, 38×38 flame/check icon container, progress bar (amber or mint), chevron, SKIP TO WORKOUT dashed button.
- Behavior preserved (`onToggleItem`, `onCollapse`, `onExpand`, `onDismiss`).
- Extend `SessionContext` with `skipAllWarmupItems()` for the skip button.
- `/deploy` + smoke: incomplete warmup shows amber, all complete shows mint, skip button marks all complete.

### Phase 6 — NumberPad
- `src/components/NumberPad.tsx` as a modal (3×4 grid, slide-up animation, backdrop, 5-char buffer cap, blinking caret).
- Mounted at screen level in `WorkoutScreen` but not yet consumed for input (still gated by the hoist in Phase 7).
- Dev-only self-test: temporarily wire a dev trigger (e.g. tap an empty region) to verify digit entry, clear, confirm, cancel. Remove trigger before commit.
- `/deploy` + smoke: pad can be opened/closed in dev scaffold if kept under a dev flag; otherwise verify in Phase 7.

### Phase 7 — State hoist + NextSetPanel + SetRow (highest risk)
- Move `setsByExercise` / `nextByExercise` / `lastSetsByExercise` state from `SetLoggingPanel` up to `WorkoutScreen`.
- Introduce `NextSetPanel` (or fold into `ExerciseCard`) and `SetRow` (or update `SetListItem`) components.
- Swap `SetLoggingPanel` inside the expanded card body for the new composition: `SetRow[]` (logged sets) + repurposed `GhostReference` (history peek dashed button) + `NextSetPanel` (stepper rows + LOG SET button).
- Wire stepper value tap → `setPad({...})` → `<NumberPad>` → `onCommit` writes back into `nextByExercise`.
- Delete `SetLoggingPanel` internals or keep as a thin facade for `isTimed`/`isHeightReps` edge cases — decide during execution.
- **Preserve:** stopwatch for `isTimed` exercises (via existing `StopwatchContext`), 2-inch step for `isHeightReps`, long-press-to-delete on `SetRow`, PR toast flash, haptics (`impactLight` on steppers, `impactMedium` on confirm).
- **Rehydrate mid-session:** on mount, fetch existing sets via `getSetsForExerciseInSession` for each exercise and populate `setsByExercise` with `isPR: undefined`.
- `/deploy` + smoke: CRITICAL test pass — log 3+ sets across a reps exercise, a timed exercise, and a height-reps exercise. Verify: DB write succeeds, PR toast fires on PR, next-set pre-fills, pad opens/commits, long-press delete still works, rest timer starts on log.

### Phase 8 — ExerciseCard reshape + CategoryHeader + More menu
- Extract `ExerciseCard` helper from `WorkoutScreen.tsx` into `src/components/ExerciseCard.tsx`.
- Apply new card styling: 3px category accent bar, collapsed `{w}×{r}` / `{w}×{r} ★` chip row, expanded mint border + box-shadow equivalent (RN: combine `borderWidth` + `shadow*` props).
- Add `More` menu (⋯ icon → `ActionSheetIOS` on iOS / `Modal`-based action sheet on Android) with `Swap exercise`, `Edit target`, `Delete`. Routes to existing `SwapSheet` and `EditTargetsModal`.
- Category header: 6×6 color dot + uppercase name + 1px divider + `{done}/{total}` counter.
- `/deploy` + smoke: collapsed cards show chips + category accent; expanded shows mint border; `⋯` opens sheet with working Swap/Edit; cards toggle exclusively.

### Phase 9 — SupersetGroup (purple theme + auto-advance)
- Rewrite existing `SupersetContainer` → `src/components/SupersetGroup.tsx`: purple gradient container, `A`/`B` badge, flow line, rounds counter.
- Nested cards get `supersetBadge` prop → render A1/A2 pill + `← NOW` + purple 3px accent bar + glow rail on current member.
- Formalize auto-advance: on log of superset member → rotate `ssCurrentByGroup[groupId]` and `activeExerciseId`. Tapping another member overrides both.
- Rest on superset log: `min(member.restSec across group)`.
- `/deploy` + smoke: 2-member superset — log member 1 round 1 → member 2 expands with glow; log member 2 → member 1 expands for round 2; round counter increments correctly across 3 rounds.

### Phase 10 — Final polish + cleanup
- Extract `WorkoutSummary` into `src/components/WorkoutSummary.tsx` (no visual change).
- Delete dead code (old `SetLoggingPanel` if no longer a facade; unused styles; dead imports).
- Confirm rollback is viable (the branch has never deleted or rewritten restore point `fe9b89d`). A live rollback test is optional and should only be run if there's reason to doubt it.
- Run `npm run typecheck` + existing `__tests__/` suite — must pass.
- Merge prep via `/gsd-pr-branch` or equivalent.

---

## Design Tokens

All values pulled from `src/theme/*`. Where the spec's hex differs from the theme token, **prefer the token** (the handoff notes this explicitly).

**Colors** (resolved from `src/theme/colors.ts`):
- `background #151718`, `surface #1E2024`, `surfaceElevated #24272C`
- `border rgba(255,255,255,0.05)`, `primary #FFFFFF`, `secondary #8E9298`
- `accent #8DC28A`, `onAccent #1A1A1A`, `danger #D9534F`, `timerActive #FACC15`
- `prGold #FFB800`
- Category colors from `categoryColors` export (`chest #E8845C`, `back #5B9BF0`, `legs #B57AE0`, `shoulders #4ECDC4`, `arms #8DC28A`, `core #F0B830`, `conditioning #E0697E`, `stretching #9B8EC4`)

**V1-specific colors NOT in theme** (OK to use as inline hex or add to theme at execution time):
- `warmupAmber #F0B830`
- `supersetPurple #B57AE0`
- HR zone colors `#5B9BF0 / #8DC28A / #FACC15 / #E8845C / #E0697E`
- `borderStrong rgba(255,255,255,0.14)`, `secondaryDim #6A6E74`, `accentGlow rgba(141,194,138,0.15)`

During Phase 1-3 execution, decide whether to add these to `colors.ts` or keep inline. Recommendation: add to `colors.ts` with suggestive names (`warmupAmber`, `supersetPurple`, `hrZone1..5`, `borderStrong`, `secondaryDim`, `accentGlow`). It's 7 new lines in one file.

**Spacing:** existing `spacing.xs..xxxl` (4, 8, 12, 16, 20, 24, 32, 48). No change.

**Typography:** existing `fontSize.xs..display` (11, 13, 15, 17, 20, 24, 30, 40) + weight constants. No change. Use `fontVariant: ['tabular-nums']` on changing numbers.

**Border radius:** 10 (small controls), 12 (steppers), 14 (cards/buttons), 18 (exercise + warm-up containers), 999 (pills).

---

## Animations

Use only what RN does natively. Skip `cubic-bezier` exact matches — close is fine.

| Element | Mechanism |
|---------|-----------|
| Expand/collapse card | `LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut)` on `activeExerciseId` change |
| Rest banner slide-down | `Animated.timing(translateY)` 200ms |
| NumberPad slide-up | `Animated.timing(translateY)` 220ms with `Easing.out(Easing.back(1.1))` approximation |
| Backdrop fade | `Animated.timing(opacity)` 180ms |
| Progress-bar width (rest) | `Animated.timing(width)` 1s linear, re-triggered each second |
| LIVE dot pulse | `Animated.loop(sequence(timing 1, timing 0.4))` 1.4s |
| Caret blink | `Animated.loop(sequence(timing 1, timing 0))` 1s |

---

## Risk Register

| Risk | Likelihood | Cost | Mitigation |
|------|------------|------|------------|
| Phase 7 state hoist breaks `logSet` / PR flow | Medium | High (user loses data) | Most careful `/deploy` cycle; log 3-5 sets across reps/timed/height-reps before proceeding |
| Phase 9 superset auto-advance miscounts rounds | Medium | Medium | Deliberate 3-round, 2-member test |
| Layout animation jank on low-end Android | Low | Low | `LayoutAnimation` on Android requires `UIManager.setLayoutAnimationEnabledExperimental(true)` — verify |
| `react-native-linear-gradient` not installed for gradient pills | Low | Low | Check `package.json`; if absent, approximate with stacked tinted `View`s |
| Old tests (`__tests__/`) break due to moved `SetLoggingPanel` | Medium | Low | Run `npm test` at end of Phase 7; update any tests referencing the old panel |

---

## Open Threads (decided during execution)

1. **`SetListItem` long-press-to-delete on new `SetRow`** — keep as hidden affordance (preserves muscle memory) or surface via `More` menu. Default: keep hidden affordance; flag for user check at Phase 7 deploy.
2. **Gradient rendering** — use `react-native-linear-gradient` if already in deps; else layered `View`s or solid fallback.
3. **V1-specific color tokens** — add to `src/theme/colors.ts` (recommended) or keep inline.
4. **`SetLoggingPanel` disposition** — fully dissolve, or keep as a thin facade for `isTimed`/`isHeightReps`. Decide in Phase 7.
5. **`skipAllWarmupItems` implementation** — loop existing toggle or add a dedicated DB helper. Decide in Phase 5.
6. **`TimerContext.addTime(seconds)`** — add this method if it doesn't exist; needed for `+15s` pill on `RestTimerBanner`.
7. **Lazy vs eager last-session fetch** — default lazy on first expand; flip to eager if history peek needs to render without expanding.

---

## Verification

Per Decision #6, verification is `/deploy` + on-device smoke test after each phase. Existing `__tests__/` must continue to pass — run `npm test` at least at Phase 7 (state hoist) and Phase 10 (final).

**No *new* unit tests are written as part of V1.** Existing tests *may* need mechanical updates when refactored code moves (e.g., a test importing `SetLoggingPanel` if we fully dissolve it). Such updates are allowed and expected — they're maintenance, not new test coverage.

Smoke-test checklist per phase is encoded in each phase's description above. Phase 7 is the mandatory multi-mode test (reps, timed, height-reps).

---

## Success Criteria

1. `WorkoutScreen` pixel-matches the V1 design per `design_handoff_workout_screen/reference.html` within RN's animation constraints.
2. Every existing in-workout behavior (log, delete, PR, rest, swap, edit target, warmup, superset rotation, BLE HR, finish flow) works identically to pre-redesign.
3. Zero DB migration or schema change.
4. Every phase commit is independently `/deploy`-able and runnable.
5. `npm run typecheck` and `npm test` pass at Phase 10.
6. Rollback path verified: `git reset --hard fe9b89d` returns a runnable app.
