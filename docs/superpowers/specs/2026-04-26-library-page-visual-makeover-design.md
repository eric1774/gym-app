# Library Page Visual Makeover — Design Spec

**Date:** 2026-04-26
**Author:** Brainstorming session (Eric + Claude)
**Branch:** `main` (post `feat/dashboard-v6-redesign` merge)
**Status:** Ready for implementation planning

---

## Goal

Restyle `LibraryScreen` and the Warmups sub-screen so they feel like part of the v6 personality system that already lives in Dashboard, ProgressHub, Calendar, and Programs — without changing data fetching, navigation, or the core component model. Pure aesthetic work: typography, color rationing, atmospheric mint radial, category-color identity, and amber semantic distinction for warmups.

## Context

**Current state.** `LibraryScreen.tsx` is the last major surface still using pre-v6 styling: plain white "Exercise Library" title, neutral-grey category pills (`#33373D`), a `surface`-card "FILTERED: CHEST" strip, exercise cards with a single mint accent bar regardless of body part, a 🔍 emoji in the search bar, a floating FAB, and an underline sub-tab bar shared with Warmups. `WarmupTemplateListScreen.tsx` has its own internal section header row with a "+ New Template" button.

**Design system.** `dark-mint-card-ui` v6 — Mint = action, Coral/Blue/Purple/etc. = body-part identity (`categoryColors`), Amber = warmup domain (`warmupAmber`). B-lite intensity ceiling locked by the calendar redesign.

**Brainstorm artifacts (visually approved).** Mockups served via the superpowers brainstorming companion at `192.168.1.180:62750`, persisted under `.superpowers/brainstorm/603790-1777254737/content/`:

| File | What it locks |
|---|---|
| `header-options.html` | A/B/C/D header comparison — locked **A** typography direction |
| `header-hybrid-ab.html` | A's font + B's mint radial — locked **AB-1** (standard radial) |
| `body-color-strategy.html` | Mint-only vs Category-tinted body zone — locked **Variant 2 (Category-tinted)** |
| `warmups-treatment.html` | Mint vs Amber warmups — locked **Variant 2 (Amber, semantic token)** |

## Scope

**In scope.**
1. Restyle `src/screens/LibraryScreen.tsx` (header zone, sub-tab bar, search row, section eyebrow, FAB removal, empty state).
2. Restyle `src/components/ExerciseCategoryTabs.tsx` (active and inactive pill colors).
3. Restyle `src/components/ExerciseListItem.tsx` (accent bar driven by `getCategoryColor`).
4. Restyle `src/screens/WarmupTemplateListScreen.tsx` (drop in-screen section row, add amber eyebrow + number-chip cards).
5. Add `MintRadial` atmosphere to the Library screen (component already exists at `src/components/MintRadial.tsx`).
6. Two new icon components: `SearchIcon`, `DumbbellSmall` (for empty state). Reuse existing icons from `src/components/icons/` if equivalents exist.
7. Lift `newNameModalVisible` state ownership from `WarmupTemplateListScreen` to `LibraryScreen` so the header `+` button can route the create action by `activeSubTab`.
8. Remove the floating FAB from `LibraryScreen`.

**Out of scope (NO changes).**
- Database queries (`searchExercises`, `getExercisesByCategoryViaGroups`, `deleteExercise`, `getWarmupTemplates`, `getWarmupTemplatePreview`, `createWarmupTemplate`, `deleteWarmupTemplate`) — unchanged.
- Navigation (`LibraryStackParamList`, `WarmupTemplateDetail` route, `useNavigation` flow).
- Search debounce logic (the 300ms `searchDebounceRef` block).
- Swipe-to-delete pan-responder in `ExerciseListItem`.
- Long-press-to-edit flow (`handleLongPress`, `editingExercise` state, `AddExerciseModal` `editExercise` prop).
- `AddExerciseModal.tsx` itself — separate redesign session.
- `WarmupTemplateDetailScreen.tsx` — separate redesign session.
- The `EXERCISE_CATEGORIES` array, `Exercise.category` type, `Exercise.measurementType` rendering rules.
- All TypeScript types in `src/types/index.ts`.
- Any new theme tokens — every color this design needs already exists in `colors.ts`.
- Snapshot tests — existing tests in `src/screens/__tests__/LibraryScreen.test.tsx` continue to pass with the restyle.

---

## Design language

**Intensity: B-lite.** Personality where it earns its keep. One repeated atmospheric move (mint radial), one repeated identity move (category color on pills + accent bars), one semantic distinction (amber for warmups). Calm everywhere else.

### Three discipline rules

1. **Mint = the action of training.** AB-1 header eyebrow ("TRAINING"), display title ("Library"), 38×38 mint `+` button, mint sub-tab underline (when on Exercises). Mint radial in the top-left corner — the same atmospheric gesture used by Calendar.

2. **Category color = body-part identity.** The active category pill takes its category's color (solid fill + dark text). Inactive pills get a 14%-alpha tint of their own color. Each exercise card's 3px accent bar uses `getCategoryColor(exercise.category)`. Search results across categories are then visually self-segregating.

3. **Amber = warmup domain.** When the Warmups sub-tab is active, the underline becomes `warmupAmber #F0B830`, the eyebrow strip turns amber, and template cards use an amber number-chip (item count) instead of a colored bar. The token already exists with the comment "Warm-up pending eyebrow + border" — we're cashing in a pre-allocated semantic, not inventing one.

### Token usage (all already in `src/theme/colors.ts`)

| Surface | Token(s) | Treatment |
|---|---|---|
| Page background | `colors.background` (`#151718`) | Unchanged |
| Mint radial atmosphere | `colors.mintRadial` (`rgba(141,194,138,0.35)`) | NEW use on Library — top-left corner |
| Header eyebrow "TRAINING" | `colors.accent` (`#8DC28A`) | 800 weight, letterSpacing 2.2 |
| Header display "Library" | `colors.primary` (`#FFFFFF`) | 900 weight, letterSpacing -0.6, fontSize 30 |
| `+` button | `colors.accent` bg, `colors.onAccent` text | 38×38 round |
| Sub-tab active (Exercises) | `colors.accent` | Underline + text |
| Sub-tab active (Warmups) | `colors.warmupAmber` (`#F0B830`) | Underline + text |
| Sub-tab inactive | `colors.secondary` (`#8E9298`) | Unchanged |
| Search container | `colors.surface` (`#1E2024`) bg + `colors.border` | Unchanged container, swap emoji icon for SVG |
| Category pill — active | `getCategoryColor(category)` solid bg + `colors.onAccent` text | NEW use on Library |
| Category pill — inactive | `getCategoryColor(category)` at 14% alpha bg + full-strength text | NEW use on Library |
| Section eyebrow text | `colors.secondaryDim` (`#6A6E74`) | 700 weight, letterSpacing 1.6, all-caps |
| Section eyebrow count | `colors.secondary` (`#8E9298`) | Right-aligned |
| Exercise card accent bar | `getCategoryColor(exercise.category)` | Replaces hardcoded `colors.accent` |
| Warmup card number chip | `colors.warmupAmber` text on `rgba(240,184,48,0.10)` bg + `rgba(240,184,48,0.18)` border | NEW use, cashing in `warmupAmber` |
| Warmup eyebrow color | `colors.warmupAmber` | Active-state color |

**No new tokens needed.** This is a pure redistribution of v6.

---

## LibraryScreen redesign

### Visual structure (top to bottom)

```
┌─────────────────────────────────────┐
│ ░░  ← mint radial (atmosphere)       │
│ ░ TRAINING                          │
│   Library                    [+]    │  ← AB-1 header
│                                      │
│ ─Exercises───  Warmups ────────     │  ← sub-tab bar (underline = mint OR amber)
│                                      │
│ [⌕ Search exercises…           ]    │  ← surface input, SVG search icon
│                                      │
│ [Chest] [Back] [Legs] [Arms] [Core] │  ← category pills (active = category color)
│                                      │
│ FILTERED · CHEST                12  │  ← thin uppercase eyebrow + count
│                                      │
│ ▌ Bench Press                       │  ← exercise card, 3px coral bar
│ ▌ Incline DB Press                  │
│ ▌ Cable Fly              [Timed]    │
│ ▌ Push-Up                           │
│ …                                    │
└─────────────────────────────────────┘
```

### 1. Header zone (replaces current title block)

```
<View style={styles.header}>                      // marginBottom: 14
  <MintRadial size={220} top={-50} left={-60}   // existing component, atmospheric
              opacity={0.42} fade={0.12} />
  <View style={styles.headerRow}>                 // flexDirection: row, alignItems: flex-end, justifyContent: space-between
    <View>
      <Text style={styles.eyebrow}>TRAINING</Text>
      <Text style={styles.title}>Library</Text>
    </View>
    <TouchableOpacity style={styles.addButton} onPress={handleAddPress}>
      <Plus size={20} color={colors.onAccent} />
    </TouchableOpacity>
  </View>
</View>
```

Style values:
- `eyebrow`: color `colors.accent`, fontSize 11, fontWeight '800', letterSpacing 2.2, marginBottom 4
- `title`: color `colors.primary`, fontSize 30, fontWeight '900', letterSpacing -0.6, lineHeight 30
- `addButton`: width 38, height 38, borderRadius 19, backgroundColor `colors.accent`, alignItems/justifyContent center

`handleAddPress`:
```ts
const handleAddPress = () => {
  if (activeSubTab === 'warmups') {
    setNewTemplateModalVisible(true);  // lifted state — see Section "Behavior changes"
  } else {
    setAddExerciseModalVisible(true);
  }
};
```

`MintRadial` is already used by Calendar and can be reused as-is. Verify its prop names during implementation; current call shape is approximate.

### 2. Sub-tab bar

Underline color is dynamic:

```
const subTabActiveColor = activeSubTab === 'warmups' ? colors.warmupAmber : colors.accent;

<View style={styles.subTabBar}>
  <TouchableOpacity style={[styles.subTab, activeSubTab === 'exercises' && { borderBottomColor: subTabActiveColor }]}
                    onPress={() => setActiveSubTab('exercises')}>
    <Text style={[styles.subTabText, activeSubTab === 'exercises' && { color: subTabActiveColor }]}>
      Exercises
    </Text>
  </TouchableOpacity>
  ...
</View>
```

Padding tightens from `spacing.md` to `spacing.sm + 2` per v6 sub-tab norms.

### 3. Search row

Container styling unchanged (`colors.surface` bg, 1px `colors.border`, borderRadius 10, paddingVertical `spacing.sm + 2`). The right-aligned 🔍 emoji is replaced by a 16×16 `<SearchIcon />` SVG component:
- stroke `colors.secondary`
- strokeWidth 1.6
- positioned absolutely at `right: spacing.md`

### 4. Category pills (`ExerciseCategoryTabs.tsx`)

Active style sources its color from `getCategoryColor(category)`:
```ts
const activeColor = getCategoryColor(category);  // e.g. '#E8845C' for chest
const inactiveBg = activeColor + '24';  // 14% alpha

style={isSelected ? {
  backgroundColor: activeColor,
} : {
  backgroundColor: inactiveBg,
}}

text={isSelected ? colors.onAccent : activeColor}
```

The 14%-alpha hex suffix `24` is exact at #36/255 ≈ 14%. Implementation may prefer a small helper `withAlpha(hex, 0.14)` if the codebase has one — otherwise a literal suffix is fine.

### 5. Section eyebrow (replaces `sectionHeaderStrip`)

```
<View style={styles.sectionEyebrow}>             // flexDirection: row, justifyContent: space-between, paddingHorizontal: 2, marginTop: 14, marginBottom: 8
  <Text style={styles.sectionEyebrowText}>{sectionLabel}</Text>
  <Text style={styles.sectionEyebrowCount}>{exercises.length}</Text>
</View>
```

- `sectionEyebrowText`: color `colors.secondaryDim`, fontSize 10, fontWeight '700', letterSpacing 1.6
- `sectionEyebrowCount`: color `colors.secondary`, fontSize 10, fontWeight '700'

`sectionLabel` formatting changes from `FILTERED: CHEST` / `SEARCH: "press"` to `FILTERED · CHEST` / `SEARCH · "press"` (middle dot replaces colon).

The current `sectionHeaderStrip` surface and its rounded card chrome are removed — eyebrow is just text.

### 6. Exercise card (`ExerciseListItem.tsx`)

Single change: the `accentBar` `backgroundColor` switches from hardcoded `colors.accent` to `getCategoryColor(exercise.category)`. Everything else (card surface, padding, swipe pan-responder, Timed badge, long-press) is unchanged.

```ts
// before
accentBar: { width: 3, backgroundColor: colors.accent, ... }

// after
<View style={[styles.accentBar, { backgroundColor: getCategoryColor(exercise.category) }]} />
```

### 7. FAB

Removed entirely. The header `+` button is the single add affordance.

### 8. Empty state

Icon is added above the existing two-line text:

```
<View style={styles.emptyContainer}>
  <DumbbellSmall size={40} color={colors.secondary} style={{ opacity: 0.16, marginBottom: spacing.md }} />
  <Text style={styles.emptyText}>No exercises in this category</Text>
  <Text style={styles.emptyHint}>Tap + to add a custom exercise</Text>
</View>
```

If a Dumbbell icon already exists in `src/components/icons/` (e.g., from Programs work), reuse it. Otherwise create `DumbbellSmall.tsx` following the `Trophy.tsx` pattern.

---

## WarmupTemplateListScreen redesign

### Visual structure (when Warmups sub-tab is active)

```
┌─────────────────────────────────────┐
│ ░░  ← same mint radial (page-level)  │
│ ░ TRAINING                          │
│   Library                    [+]    │
│                                      │
│  Exercises  ─Warmups──── (amber)    │
│                                      │
│ YOUR TEMPLATES (amber)            4 │
│                                      │
│ [5] Upper Body Warmup               │
│     Arm Circles · Band Pull-Apart…  │
│ [6] Lower Body Warmup               │
│     Bodyweight Squat · Hip Hinge…   │
│ …                                    │
└─────────────────────────────────────┘
```

### 1. Drop the in-screen section row

Remove the entire `<View style={styles.sectionHeader}>` block (the title text + the "+ New Template" `TouchableOpacity`). The Library page header now owns both.

### 2. Add the amber eyebrow row

Same shape as the Exercises section eyebrow but recolored:

```
<View style={styles.warmupEyebrow}>
  <Text style={styles.warmupEyebrowText}>YOUR TEMPLATES</Text>
  <Text style={styles.warmupEyebrowCount}>{templates.length}</Text>
</View>
```

- `warmupEyebrowText`: color `colors.warmupAmber`, fontSize 10, fontWeight '700', letterSpacing 1.6
- `warmupEyebrowCount`: color `colors.secondary`, fontSize 10, fontWeight '700'

### 3. Restyled card

```
<TouchableOpacity style={styles.card} onPress={...} onLongPress={...}>
  <View style={styles.numberChip}>
    <Text style={styles.numberChipText}>{item.itemCount}</Text>
  </View>
  <View style={styles.cardBody}>
    <Text style={styles.cardName} numberOfLines={1}>{item.template.name}</Text>
    {item.previewNames.length > 0 && (
      <Text style={styles.cardPreview} numberOfLines={2}>
        {item.previewNames.join(' · ')}
        {item.itemCount > item.previewNames.length ? ' · …' : ''}
      </Text>
    )}
  </View>
</TouchableOpacity>
```

Style values:
- `card`: backgroundColor `colors.surfaceElevated`, borderRadius 12, padding `spacing.base - 2`, marginBottom `spacing.sm`, borderWidth 1, borderColor `colors.border`, flexDirection 'row', alignItems 'stretch', gap 11
- `numberChip`: width 32, height 32, borderRadius 8, alignItems/justifyContent center, backgroundColor `rgba(240,184,48,0.10)`, borderWidth 1, borderColor `rgba(240,184,48,0.18)`
- `numberChipText`: color `colors.warmupAmber`, fontSize 13, fontWeight '800'
- `cardBody`: flex 1, minWidth 0
- `cardName`: color `colors.primary`, fontSize `fontSize.base`, fontWeight '600'
- `cardPreview`: color `colors.secondary`, fontSize `fontSize.sm`, lineHeight 18, marginTop 3

The "X items" right-aligned label is removed — the chip carries the count.

### 4. New-template modal

Unchanged styling. The visibility state moves out of this component — see "Behavior changes."

### 5. Empty state

Icon added above existing two-line text, same pattern as Exercises empty state. Color stays `colors.secondary` at 16% opacity. (No amber here — the empty state is neutral information.)

---

## Behavior changes (the only logic touches)

### 1. Lift `newNameModalVisible` state to `LibraryScreen`

Cleanest split: parent owns visibility, child owns the create action and post-create navigation.

**`WarmupTemplateListScreen` props change:**
```ts
interface WarmupTemplateListScreenProps {
  // NEW props from parent
  newNameModalVisible: boolean;
  onCloseNewNameModal: () => void;
}
```

The component keeps its existing `newTemplateName`, `isCreating` state and `handleCreateTemplate` logic — only `newNameModalVisible` and `handleOpenNewModal` move out.

**`LibraryScreen` adds:**
```ts
const [newTemplateModalVisible, setNewTemplateModalVisible] = useState(false);
const [addExerciseModalVisible, setAddExerciseModalVisible] = useState(false);  // renamed from `modalVisible` for clarity

const handleAddPress = () => {
  if (activeSubTab === 'warmups') {
    setNewTemplateModalVisible(true);
  } else {
    setAddExerciseModalVisible(true);
  }
};

// child render
<WarmupTemplateListScreen
  newNameModalVisible={newTemplateModalVisible}
  onCloseNewNameModal={() => setNewTemplateModalVisible(false)}
/>
```

The exact prop shape (callback vs setter, single visibility prop vs an open/close pair) is a planning-phase choice. The constraint: parent triggers visibility via the header `+`, child handles the create action and dismisses on success.

### 2. Drop the floating FAB

Delete the `<TouchableOpacity style={[styles.fab, ...]}>` block in `LibraryScreen` and its `fab`, `fabText` style entries.

### 3. Drop the in-screen "+ New Template" trigger

Delete the section-header row in `WarmupTemplateListScreen` (title text + `newButton` TouchableOpacity) and its `sectionHeader`, `sectionTitle`, `newButton`, `newButtonText` style entries.

---

## New components

### `src/components/icons/SearchIcon.tsx`

Pattern: match `Trophy.tsx` (Svg + Path, `IconProps`).

Path: standard magnifying-glass — circle (`cx=11 cy=11 r=7`) + handle line (`M16 16l4 4`). Stroke-only, strokeWidth 1.6, no fill.

### `src/components/icons/DumbbellSmall.tsx`

Reuse if Programs already shipped a `Dumbbell.tsx` icon. Otherwise: path matching the calendar/programs spec — `M6 5v14 M18 5v14` (handles), `M6 12h12` (bar), plus two filled rects for the weights. Stroke-only at small size.

---

## Risks & edge cases

- **Search results across categories.** With category-color accent bars, a search for "press" returns mixed colors (chest=coral, shoulders=teal, triceps=mint via arms). This is the intended behavior — color tells the user what body part each result hits.
- **Exercises with no/unknown category.** `getCategoryColor()` already returns `colors.accent` (mint) as fallback for any unmapped category. Custom user exercises always have a category, so the fallback path rarely fires — but it's safe.
- **Mint radial on Warmups tab.** The radial stays mint even when the active sub-tab is amber. It's the page-level atmosphere, not the tab-level. Calendar uses one radial across rest days and PR days for the same reason.
- **Performance.** Category color is a synchronous lookup from a static object. Zero impact on the FlatList. The pill row uses a `ScrollView` (existing) — no list virtualization concerns.
- **Accessibility.** Color-coded pills are not the only signal — the pill text "Chest", "Back", "Legs" remains. Color-coded accent bars are decorative; the exercise name carries the meaning. Color-blind users lose the body-part signal but retain full functionality.

---

## Files touched

| File | Change |
|---|---|
| `src/screens/LibraryScreen.tsx` | Header restyle, sub-tab dynamic colors, search SVG icon, section eyebrow, FAB removed, empty state icon, modal-visibility ownership for warmups |
| `src/screens/WarmupTemplateListScreen.tsx` | Drop section-header row, add amber eyebrow, restyle card with number chip, accept new modal-visibility props |
| `src/components/ExerciseCategoryTabs.tsx` | Active/inactive pill colors driven by `getCategoryColor` |
| `src/components/ExerciseListItem.tsx` | Accent bar color from `getCategoryColor(exercise.category)` |
| `src/components/icons/SearchIcon.tsx` | NEW — SVG magnifying glass |
| `src/components/icons/DumbbellSmall.tsx` | NEW (or reuse existing) — empty state icon |
| `src/screens/__tests__/LibraryScreen.test.tsx` | No changes — existing assertions continue to pass |

---

## Implementation order (suggested for plan-phase)

1. Add `SearchIcon` and `DumbbellSmall` icon components.
2. Restyle `ExerciseCategoryTabs` (smallest leaf change).
3. Restyle `ExerciseListItem` (one-line accent-bar change).
4. Restyle `LibraryScreen` header zone, sub-tabs, search row, section eyebrow, empty state.
5. Lift modal-visibility state, drop FAB, wire header `+` routing.
6. Restyle `WarmupTemplateListScreen` — drop section row, add amber eyebrow, restyle cards, accept new props.
7. On-device QA on emulator: verify mint radial position, category pill colors render correctly, sub-tab color toggles with `activeSubTab`, header `+` opens correct modal per sub-tab.

---

## Open question for plan-phase

The exact prop shape for the `WarmupTemplateListScreen` modal-visibility lift (single visibility prop vs an open/close pair vs imperative handle). The brainstorm settled on lifting state — the planning agent picks the cleanest TypeScript shape during plan generation.
