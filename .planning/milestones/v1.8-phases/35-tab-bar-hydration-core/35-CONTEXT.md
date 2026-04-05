# Phase 35: Tab Bar & Hydration Core - Context

**Gathered:** 2026-04-04
**Status:** Ready for planning

<domain>
## Phase Boundary

Users can switch between Macros and Hydration tabs on the Protein screen and log water via quick-add buttons or a custom modal, with the cup filling as they log. Goal setting, first-use prompt, streak, and weekly average are Phase 36.

</domain>

<decisions>
## Implementation Decisions

### Tab Bar Design
- **D-01:** Underline tabs — mint underline on active tab, secondary gray text on inactive. Matches the MacroChart P/C/F tab selector pattern
- **D-02:** Tab bar positioned below the header title, not replacing it
- **D-03:** Header title renamed from "Macros" to "Nutrition" — neutral umbrella term for both tabs
- **D-04:** No animation on tab switch — instant content swap, consistent with MacroChart tab behavior

### Cup Visualization
- **D-05:** Rounded glass shape with mint gradient fill (#8DC28A), built with pure React Native Views — no SVG library dependency. Mint fill rises from bottom proportional to progress
- **D-06:** Medium hero size (~180-200px tall), centered on screen as the main visual focus of the Hydration tab
- **D-07:** Labels displayed beside the cup (right side): "48 / 64 oz" as primary text, "75%" as secondary text below
- **D-08:** When total >= goal: cup fills completely, checkmark badge or "Goal met!" indicator appears. Simple celebration, not distracting
- **D-09:** Hardcoded 64 oz default when goal_oz is null — cup always renders with fill percentage. Phase 36 replaces fallback with real goal prompt

### Quick-Add & Log Water Flow
- **D-10:** Three quick-add buttons (+8 oz, +16 oz, +24 oz) in a horizontal row directly below the cup visualization
- **D-11:** Quick-add button style: surface-colored rounded rects with subtle border and mint text — matches dark card aesthetic
- **D-12:** Full-width mint accent button ("+ Log Water") below the quick-add row — mirrors the "Meal Library" button pattern on the Macros tab
- **D-13:** LogWaterModal: simple numeric text input for custom oz amount, Save and Cancel buttons. No preset chips inside the modal — presets are the external quick-add buttons

### MacrosView Extraction
- **D-14:** Thin parent shell pattern — ProteinScreen becomes ~50 lines: header, tab bar, conditional rendering. ALL macros state/logic/UI moves into MacrosView as a self-contained component. HydrationView is similarly self-contained with its own state and data fetching
- **D-15:** Separate component files: MacrosView.tsx (~350 lines), HydrationView.tsx (~200 lines), WaterCup.tsx (~80 lines), LogWaterModal.tsx (~100 lines)
- **D-16:** FAB stays on Macros tab only (inside MacrosView). Hydration tab uses the full-width "+ Log Water" button instead — no FAB
- **D-17:** Unmount inactive tab via conditional rendering — only active tab is rendered. Re-mounts and re-fetches data on tab switch

### Claude's Discretion
- WaterCup internal implementation details (exact border radii, gradient approach, checkmark icon)
- TabBar component reusability — whether to make it generic or purpose-built
- Exact spacing between cup, quick-add row, and Log Water button
- Toast behavior on quick-add (brief confirmation or silent)
- LogWaterModal keyboard handling and input validation

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements
- `.planning/REQUIREMENTS.md` — TAB-01 (tab bar), TAB-02 (MacrosView extraction), HYD-01 (cup visualization), HYD-02 (Log Water modal), HYD-03 (quick-add buttons)

### Prior phase context
- `.planning/phases/34-db-foundation/34-CONTEXT.md` — hydrationDb API decisions: namespace export, table schemas, streak/average semantics, 6 function signatures

### Source files to read
- `src/screens/ProteinScreen.tsx` — Source for MacrosView extraction; all current macros UI lives here
- `src/db/hydration.ts` — hydrationDb module: getWaterGoal, setWaterGoal, logWater, getTodayWaterTotal, getStreakDays, get7DayAverage
- `src/db/index.ts` — Barrel exports with hydrationDb namespace
- `src/components/MacroChart.tsx` — Reference implementation for underline tab selector pattern (P/C/F tabs)
- `src/theme/colors.ts` — Dark mint card color system (accent, surface, surfaceElevated, border)
- `src/screens/AddMealModal.tsx` — Reference for modal pattern (LogWaterModal should follow similar structure)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `MacroChart.tsx` tab selector: Underline tab pattern with mint active state — direct reference for the new TabBar component
- `AddMealModal.tsx`: Modal with KeyboardAvoidingView, numeric input, Save/Cancel — template for LogWaterModal
- `StreakAverageRow.tsx`: Streak + average display component — will be reused on Macros tab, and a similar pattern needed for Phase 36 hydration stats
- `colors.ts` theme: Full dark mint card color palette ready to use
- `hydrationDb` module: All 6 DB functions implemented and tested (Phase 34)

### Established Patterns
- State management: useState + useCallback + useFocusEffect for data loading on screen focus
- ScrollView with RefreshControl for pull-to-refresh
- FAB pattern: absolute positioned TouchableOpacity in bottom-right
- Modal pattern: React Native Modal with KeyboardAvoidingView wrapper
- Haptic feedback: Used in set logging and other interactions — apply to quick-add buttons

### Integration Points
- `ProteinScreen.tsx` is the refactor target — will shrink from ~400 to ~50 lines
- Navigation: `ProteinStackParamList` in TabNavigator — screen name stays the same, internal content changes
- `src/db/index.ts` barrel: hydrationDb already exported as namespace
- New files: `src/components/MacrosView.tsx`, `src/components/HydrationView.tsx`, `src/components/WaterCup.tsx`, `src/screens/LogWaterModal.tsx`

</code_context>

<specifics>
## Specific Ideas

- Quick-add buttons should trigger haptic feedback on press (consistent with set logging haptics elsewhere in the app)
- The cup gradient fill should be visually smooth — not a hard line between filled and empty. Consider a slight gradient transition at the water line
- Tab bar should feel lightweight — the underline is the main visual indicator, not heavy borders or backgrounds

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 35-tab-bar-hydration-core*
*Context gathered: 2026-04-04*
