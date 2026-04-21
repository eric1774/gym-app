# Programs Screen — Visual-Only Overhaul

**Date:** 2026-04-21
**Target file:** `src/screens/ProgramsScreen.tsx`
**Visual reference:** `Programs_Screen.html` at repo root
**Scope:** Pure stylesheet / layout / visual-component pass. No changes to data fetching, navigation, state management, component architecture for existing features, or TypeScript types.

## Goal

Redesign `ProgramsScreen.tsx` to match `Programs_Screen.html`: a bolder typographic header, a stat-pills row, a tab switcher replacing section headers, and richer program cards with tag pills, arc progress, and state-specific treatments (ready-to-start / in-progress / completed).

## Constraints (explicit)

### Untouched
- Hooks: `useFocusEffect`, `loadPrograms`, `handleTap`, `handleMenuPress`, `handleExport`, `handleDeleteFromMenu`, `confirmDeleteProgram`, `onRefresh`, `handleCreated`.
- Sub-components kept as-is: `PopupMenu` (JSX logic), `ProgressBar`.
- External modules: `CreateProgramModal`, `ExportToast`, `getPrograms`, `getProgramDays`, `getProgramTotalCompleted`, `exportProgramData`.
- All TypeScript types in `src/types/index.ts`.
- `activePrograms` / `pastPrograms` derivation logic.

### Dead code (intentionally left in place for this pass)
- `CompletionCircle` sub-component + `circleStyles` — unreferenced after the overhaul.
- Style entries: `nestedCard`, `nestedCardLabel`, `nestedCardValue`, `sectionHeader`, `sectionHeaderSpaced`, `programSubtitle`, `emptyText`, `emptyHint` — unreferenced after the overhaul.

Rationale: user wants to test the visual changes on device first before any cleanup. Follow-up cleanup is tracked separately and will be handled in a subsequent pass once the visuals are verified.

## Data-model gap and resolution

`Program` type in `src/types/index.ts` has: `id, name, weeks, startDate, currentWeek, createdAt, archivedAt`. It has **no** `tag`, `focus`, or `lastSession` fields.

- **`tag` (used by the new category pill):** derived at render time via a keyword heuristic on `program.name`. See `getProgramTag` below. No migration, no schema change.
- **`focus` (HTML subtitle: "Upper / Lower Split"):** omitted. Would require new data.
- **`lastSession` (HTML "Last: 2 days ago"):** omitted. Would require new DB queries (out of scope).

## New inline helpers

```ts
type ProgramTag = 'STRENGTH' | 'POWER' | 'HYPERTROPHY' | 'CONDITIONING';

function getProgramTag(name: string): ProgramTag {
  const n = name.toLowerCase();
  if (/power|5.?3.?1|deadlift|squat.*max|strongman/.test(n)) return 'POWER';
  if (/hypertrophy|ppl|push.?pull|volume|mass|bodybuild/.test(n)) return 'HYPERTROPHY';
  if (/conditioning|shred|cardio|hiit|endurance|crossfit/.test(n)) return 'CONDITIONING';
  return 'STRENGTH';
}

const TAG_COLORS: Record<ProgramTag, { bg: string; text: string }> = {
  STRENGTH:     { bg: 'rgba(91,155,240,0.15)',  text: '#5B9BF0' },
  POWER:        { bg: 'rgba(240,184,48,0.15)',  text: '#F0B830' },
  HYPERTROPHY:  { bg: 'rgba(141,194,138,0.15)', text: '#8DC28A' },
  CONDITIONING: { bg: 'rgba(224,105,126,0.15)', text: '#E0697E' },
};
```

## New state

```ts
const [tab, setTab] = useState<'active' | 'past'>('active');
```

`activePrograms` and `pastPrograms` derivation is unchanged. The render path changes from "render both sections conditionally" to "render `shown = tab === 'active' ? activePrograms : pastPrograms`."

## New presentational sub-components (inline in `ProgramsScreen.tsx`)

All are pure presentational — no hooks, no state beyond local derivations.

- `StatPill({ value, label })` — one of the three header pills.
- `TabSwitcher({ tab, onChange, activeCount, pastCount })` — pill switcher replacing section headers.
- `TagPill({ tag })` — category pill at the top of each card.
- `TopAccentLine({ progress })` — 3px strip at the top of active-in-progress cards.
- `ArcProgress({ progress, size?, stroke? })` — circular progress using `react-native-svg` `Circle` with `strokeDasharray`.
- `ReadyToStart({ weeks, days })` — dashed mint container with Play icon, chevron.
- `CompletedBadge()` — trophy "Done" pill.
- `EmptyState({ tab, onCreate })` — centered dumbbell icon + subtitle + optional "Create one" button.

## New icon components (one file each, `src/components/icons/`)

Matching the existing `Trophy.tsx` pattern (Svg + Path, `IconProps`). `Trophy.tsx` is reused.

- `Dumbbell.tsx` — path: `M6 5v14 M18 5v14` (handles), `M6 12h12` (bar), plus two filled rects for the weights.
- `Play.tsx` — filled triangle: `M5 3l14 9-14 9V3z`.
- `Export.tsx` — up-arrow with tray line: `M12 3v13 M8 12l4 4 4-4 M5 20h14`.
- `Trash.tsx` — lid + bin outline: `M3 6h18 M8 6V4h8v2 M19 6l-1 14H6L5 6`.
- `Dots.tsx` — three filled circles along x-axis (horizontal dots).

## Per-item visual mapping (the 10 changes)

### 1. Header

```
<View style={styles.header}>   // flexDirection: row, alignItems: flex-end, justifyContent: space-between, marginBottom: 18
  <View>
    <Text style={styles.eyebrow}>TRAINING</Text>  // color: colors.accent, fontSize: 11, fontWeight: '800', letterSpacing: 2, marginBottom: 4
    <Text style={styles.title}>Programs</Text>    // color: colors.primary, fontSize: 30, fontWeight: '900', letterSpacing: -1, lineHeight: 30
  </View>
  <TouchableOpacity style={styles.addButton}>     // existing 44×44 accent circle — unchanged structurally
    <Plus size={20} color={colors.onAccent} />    // swaps "+" text for existing Plus icon
  </TouchableOpacity>
</View>
```

Font family note: the app does not load Inter; we inherit system font. Weight `'900'` is valid on both platforms; rendering may be slightly less geometric than the HTML but is still bold-display at this size.

### 2. Stat pills row

Sourced from existing computed arrays:
- `activeCount = activePrograms.length`
- `completedCount = pastPrograms.length`
- `inProgressCount = activePrograms.filter(p => p.startDate !== null).length`

```
<View style={styles.statsRow}>   // flexDirection: row, gap: 8, marginBottom: 18
  <StatPill value={activeCount} label="ACTIVE" />
  <StatPill value={completedCount} label="COMPLETED" />
  <StatPill value={inProgressCount} label="IN PROGRESS" />
</View>
```

`StatPill` style: `flex: 1`, `backgroundColor: colors.surface`, `borderRadius: 14`, `paddingVertical: 10`, `paddingHorizontal: 8`, `borderWidth: 1`, `borderColor: colors.border`, `alignItems: 'center'`.
- Value: `fontSize: 19, fontWeight: '800', color: colors.primary`.
- Label: `fontSize: 10, fontWeight: '700', letterSpacing: 1.2, color: colors.secondaryDim, marginTop: 1`.

### 3. Tab switcher

Replaces `ACTIVE PROGRAMS` / `PAST PROGRAMS` section headers entirely.

Container: `flexDirection: row`, `gap: 4`, `backgroundColor: colors.surface`, `borderRadius: 14`, `padding: 4`, `borderWidth: 1`, `borderColor: colors.border`, `marginBottom: 14`.

Each tab: `flex: 1`, `paddingVertical: 9`, `borderRadius: 10`, `alignItems: 'center'`, text `fontSize: 13, fontWeight: '700'`, `letterSpacing: 0.3`.
- Selected: `backgroundColor: colors.surfaceElevated`, `borderWidth: 1`, `borderColor: colors.borderStrong`, text color `colors.primary`.
- Unselected: `backgroundColor: 'transparent'`, `borderWidth: 1, borderColor: 'transparent'` (keeps layout stable), text color `colors.secondary`.
- Labels: `` `Active (${activePrograms.length})` `` and `` `Completed (${pastPrograms.length})` ``.

### 4. Program card + tag pill

`programCard` style updates:
- `borderRadius: 20` (was 14).
- `padding: 0` (was `spacing.base`) — inner content wrapped in a `cardBody` View with `paddingTop: 16, paddingHorizontal: 16, paddingBottom: 14`. Matches HTML `'16px 16px 14px'`.
- `overflow: 'hidden'` — so the `TopAccentLine` clips to the new radius.
- `borderWidth: 1, borderColor: colors.border` — unchanged.
- `marginBottom: 12`.

Card header row: `flexDirection: row`, `alignItems: center`, `justifyContent: space-between`, `marginBottom: 10`.

`TagPill({ tag })`: `paddingVertical: 3`, `paddingHorizontal: 9`, `borderRadius: 999`, `backgroundColor: TAG_COLORS[tag].bg`; text `color: TAG_COLORS[tag].text, fontSize: 10, fontWeight: '800', letterSpacing: 1.6`.

Menu button: `width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.04)', alignItems/justifyContent: center`, holds the new `Dots` icon (`size={18}, color: colors.secondary`). The `onPress` wiring (calling `onMenuPress` with anchor position) is unchanged.

Program name: `fontSize: 20, fontWeight: '800', letterSpacing: -0.5, lineHeight: 23, color: colors.primary, marginBottom: 14`. On complete: `color: colors.secondary, textDecorationLine: 'line-through'`.

### 5. Progress visualization (active-in-progress only, replaces both nestedCards)

```
<View style={styles.progressRow}>              // flexDirection: row, alignItems: center, gap: 14
  <ArcProgress progress={progress} size={60} stroke={5} />
  <View style={{ flex: 1 }}>
    <View style={styles.statsColumns}>         // flexDirection: row, justifyContent: space-between, marginBottom: 6
      <View>
        <Text style={styles.statLabel}>WEEK</Text>
        <Text style={styles.statValue}>
          {currentWeek}
          <Text style={styles.statValueDim}>/{weeks}</Text>
        </Text>
      </View>
      <View style={{ alignItems: 'flex-end' }}>
        <Text style={styles.statLabel}>SESSIONS</Text>
        <Text style={styles.statValue}>
          {completed}
          <Text style={styles.statValueDim}>/{total}</Text>
        </Text>
      </View>
    </View>
    <ProgressBar progress={progress} />        // existing ProgressBar — unchanged
  </View>
</View>
```

- `statLabel`: `fontSize: 11, fontWeight: '700', letterSpacing: 1.2, color: colors.secondaryDim, textTransform: 'uppercase'`.
- `statValue`: `fontSize: 17, fontWeight: '800', color: colors.primary`.
- `statValueDim`: `fontSize: 12, fontWeight: '500', color: colors.secondary`.

`ArcProgress` internals:
- `<Svg width={size} height={size} style={{ transform: [{ rotate: '-90deg' }] }}>`
- Track circle: `stroke="rgba(255,255,255,0.06)"`, `strokeWidth={stroke}`, no fill.
- Foreground circle: `stroke={colors.accent}`, `strokeWidth={stroke}`, `strokeDasharray={circumference}`, `strokeDashoffset={circumference * (1 - clampedProgress)}`, `strokeLinecap="round"`.
- Center overlay: absolutely positioned `<View>` with percent `<Text>` (`fontSize: 14, fontWeight: '800'`) and `%` symbol (`fontSize: 8, fontWeight: '700', color: colors.secondaryDim`).

Percent calculation: `const pct = Math.round(clampedProgress * 100)`.

### 6. Top accent line (active-in-progress cards only)

Placed as the first child of `programCard`, above `cardBody`:

```
<View style={{
  height: 3,
  width: `${progress * 100}%`,
  backgroundColor: colors.accent,
  borderTopLeftRadius: 20,
  borderTopRightRadius: 20,
}} />
```

Not rendered on unstarted or completed cards.

### 7. "Ready to start" state (unstarted cards)

Replaces the current `programSubtitle` "X weeks · Not started" text.

```
<View style={styles.readyContainer}>
  <View style={styles.playIconContainer}>
    <Play size={14} color={colors.accent} />
  </View>
  <View style={{ flex: 1 }}>
    <Text style={styles.readyTitle}>Ready to start</Text>
    <Text style={styles.readySubtitle}>
      {dayCount} days/week · {weeks} weeks
    </Text>
  </View>
  <Chevron size={14} color={colors.accent} direction="right" />
</View>
```

- `readyContainer`: `flexDirection: row`, `alignItems: center`, `gap: 10`, `paddingVertical: 10`, `paddingHorizontal: 12`, `borderRadius: 12`, `borderWidth: 1`, `borderStyle: 'dashed'`, `borderColor: 'rgba(141,194,138,0.3)'`, `backgroundColor: 'rgba(141,194,138,0.06)'`.
- `playIconContainer`: `width: 28, height: 28, borderRadius: 8, backgroundColor: colors.accentGlow`, centered.
- `readyTitle`: `fontSize: 13, fontWeight: '700', color: colors.accent`.
- `readySubtitle`: `fontSize: 11, color: colors.secondaryDim`.

**Caveat — `borderStyle: 'dashed'` on Android:** React Native on Android frequently renders dashed borders as solid, especially when combined with `borderRadius`. If device testing shows this, fall back to a solid border with the same color; the visual is still readable. Flag for smoke testing.

**Caveat — `Chevron` component:** confirm `src/components/icons/Chevron.tsx` supports `direction="right"`. If not, either extend the Chevron component minimally or use a rotated instance. Implementation note; not a design change.

### 8. Completed state

Replaces the current `programSubtitle` "X weeks" text.

```
<View style={styles.completedRow}>
  <View style={styles.completedIconContainer}>
    <Check size={18} color={colors.accent} />
  </View>
  <View>
    <Text style={styles.completedTitle}>Completed</Text>
    <Text style={styles.completedSubtitle}>
      {totalWorkouts} sessions · {weeks} weeks
    </Text>
  </View>
  <View style={{ marginLeft: 'auto' }}>
    <View style={styles.donePill}>
      <Trophy size={12} color={colors.prGold} />
      <Text style={styles.donePillText}>Done</Text>
    </View>
  </View>
</View>
```

Program name on completed cards gets `textDecorationLine: 'line-through'` and `color: colors.secondary`.

- `completedRow`: `flexDirection: row`, `alignItems: center`, `gap: 10`.
- `completedIconContainer`: `width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(141,194,138,0.12)'`, centered.
- `completedTitle`: `fontSize: 13, fontWeight: '700', color: colors.accent`.
- `completedSubtitle`: `fontSize: 11, color: colors.secondaryDim`.
- `donePill`: `paddingVertical: 4, paddingHorizontal: 10, borderRadius: 999, backgroundColor: 'rgba(255,184,0,0.12)', flexDirection: row, alignItems: center, gap: 4`.
- `donePillText`: `fontSize: 11, fontWeight: '800', color: colors.prGold`.

### 9. Context menu (updates to `menuStyles`)

`container`:
- `borderRadius: 14` (was 8).
- `overflow: 'hidden'` (new — so the border respects the radius).
- `minWidth: 180` unchanged.
- `backgroundColor: colors.surfaceElevated` unchanged.
- Existing shadow/elevation values unchanged.

`menuItem`:
- `paddingHorizontal: 16, paddingVertical: 13` (was `spacing.base` / `spacing.md`).
- `flexDirection: 'row', alignItems: 'center', gap: 10`.
- Icons added to the left of each label:
  - Export item: `<Export size={16} color={colors.secondary} />` before the "Export" text.
  - Delete item: `<Trash size={16} color={colors.danger} />` before the "Delete" text.

`menuSeparator` remains (alternative would be a `borderBottom` per item; the existing separator View is simpler to keep).

### 10. Empty state (tab-aware)

Rendered when the current tab's list is empty. **Behavior change:** the current empty state only renders when `programs.length === 0`; this version renders per-tab. Needed because a user with only active programs would otherwise see a blank view when tapping "Completed."

```
<View style={styles.emptyContainer}>
  <View style={styles.emptyIconContainer}>
    <Dumbbell size={28} color={colors.secondaryDim} />
  </View>
  <Text style={styles.emptyTitle}>
    {tab === 'active' ? 'No active programs' : 'No completed programs'}
  </Text>
  {tab === 'active' && (
    <TouchableOpacity style={styles.emptyCreateBtn} onPress={() => setModalVisible(true)}>
      <Text style={styles.emptyCreateText}>Create one</Text>
    </TouchableOpacity>
  )}
</View>
```

- `emptyContainer`: `alignItems: 'center'`, `paddingTop: 60`, `gap: 12`.
- `emptyIconContainer`: `width: 64, height: 64, borderRadius: 20, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border`, centered.
- `emptyTitle`: `fontSize: 16, fontWeight: '700', color: colors.secondary`.
- `emptyCreateBtn`: `paddingVertical: 10, paddingHorizontal: 20, borderRadius: 12, backgroundColor: colors.accentGlow, borderWidth: 1, borderColor: 'rgba(141,194,138,0.3)'`.
- `emptyCreateText`: `fontSize: 13, fontWeight: '800', color: colors.accent`.

Header + stats + tab switcher remain visible above the empty state because they live in the `topWrapper` View outside the conditional — see Layout Structure below.

## Layout structure inside `SafeAreaView`

```
<SafeAreaView>
  <View style={topWrapper}>         // paddingHorizontal: 18, paddingTop: 18
    <Header />                      // #1
    <StatsRow />                    // #2
    <TabSwitcher />                 // #3
  </View>
  {shown.length === 0 ? (
    <EmptyState tab={tab} onCreate={...} />    // #10 — rendered in place of ScrollView
  ) : (
    <ScrollView ...>                // existing RefreshControl wiring unchanged
      {shown.map(program => <ProgramCard ... />)}
    </ScrollView>
  )}
  <PopupMenu ... />                 // JSX unchanged; internal menuStyles updated (#9)
  <ExportToast ref={exportToastRef} />
  <CreateProgramModal ... />
</SafeAreaView>
```

Horizontal padding reconciliation: HTML uses `18px` padding; existing screen uses `spacing.base`. Both will be set to `18` literals on the top wrapper and scroll content to match the reference. `spacing.base` is not used for this file's new layout values since the HTML specifies concrete pixel values throughout.

## Open implementation details (low-risk, flagged here so the plan surfaces them)

1. **`borderStyle: 'dashed'` on Android** — test on device. Fallback: solid border, same color.
2. **`Chevron` direction prop** — verify existing component API supports `direction="right"`; if not, tiny extension to the Chevron component (single-file change, still purely presentational).
3. **System font weight `'900'`** — renders correctly on both platforms but may look slightly different from Inter. Acceptable.
4. **Completion circle + old styles stay as dead code** — see Constraints section. Follow-up cleanup task already queued.

## What the user will see

- Bold "TRAINING / Programs" header with a green eyebrow.
- Three dark stat pills under the header.
- A clean 2-tab pill switcher instead of two stacked section labels.
- Cards with colored category tag pills (derived from program name), an arc progress indicator on active programs, week/sessions stat columns, a mint dashed "Ready to start" CTA on new programs, a gold trophy "Done" pill on completed ones, and a strikethrough on finished program names.
- A richer context menu with icons and rounded corners.
- A tab-aware empty state with a dumbbell icon and "Create one" button on the active tab.

No feature behavior changes. No data migration. No touched hooks.
