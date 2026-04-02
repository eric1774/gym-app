# Phase 31: Goal Setting, Progress & Charts - Context

**Gathered:** 2026-04-02
**Status:** Ready for planning

<domain>
## Phase Boundary

Multi-macro progress display (MacroProgressBars), goal management (GoalSetupForm replacement + inline edit), and per-macro chart with tab selector (MacroChart). This phase builds UI components that consume the macros.ts DB functions from Phase 30. No changes to DB layer, meal entry, or navigation — those are Phase 32 and 33.

</domain>

<decisions>
## Implementation Decisions

### Progress card layout
- **D-01:** Single card with three compact stacked horizontal bars. Card header shows "DAILY MACROS" left-aligned and computed calorie total (from actual intake) right-aligned. Each bar row: macro label (P/C/F), colored fill bar, percentage, and "Xg / Yg" text. Entire card fits in ~120px height.
- **D-02:** Unset macros (NULL goal) show a muted text row: `C ───  Tap to set goal` in secondary color. Same row height as active bars to keep vertical rhythm consistent. Tapping opens inline edit for that macro.

### Goal setup form
- **D-03:** Replace existing single-input GoalSetupForm with a 3-input form. Shows P/C/F input fields stacked vertically. Protein is required, carbs and fat are optional. A live calorie estimate updates at the bottom as numbers are typed (`computeCalories(p, c, f)`). One "Set Goals" button saves all via `macrosDb.setMacroGoals()`.
- **D-04:** First-time setup form is shown when no macro_settings row exists (same trigger as current GoalSetupForm but checking macrosDb.getMacroGoals() returning null).

### Inline goal editing
- **D-05:** Tapping an individual bar row swaps just that row to an input field with Save/Cancel buttons. Other bars remain visible. One macro edited at a time. Save calls `macrosDb.setMacroGoals({ [macro]: value })` with partial update.
- **D-06:** Tapping an unset macro's "Tap to set goal" row opens the same inline edit mode for that macro.

### Chart tab switching
- **D-07:** Three tabs above the chart: Protein, Carbs, Fat. Active tab shows that macro's line in its color (mint/blue/coral from MACRO_COLORS). Inactive tabs are muted text. Tab switch swaps the data series plotted — instant, no re-fetch needed since MacroChartPoint has all three macros.
- **D-08:** Goal reference dashed line appears only when the active macro has a non-NULL goal. When goal is NULL, only the intake line is shown.
- **D-09:** Time range pills (1W/1M/3M/All) stay below the chart, same as current ProteinChart pattern. Both tab and range state are local to the component.

### Calorie display
- **D-10:** Daily calorie total appears right-aligned in the progress card header. Computed from actual intake: `computeCalories(todayTotals.protein, todayTotals.carbs, todayTotals.fat)`. Updates as meals are logged.
- **D-11:** Goal setup form shows live calorie estimate: `~ X,XXX calories/day` below the inputs. Computed from goal values as typed.

### Carried forward from Phase 30
- **D-12:** Macro colors: Protein #8DC28A (mint), Carbs #5B9BF0 (blue), Fat #E8845C (coral) — from MACRO_COLORS constant (D-09 in Phase 30).
- **D-13:** protein.ts frozen throughout — all macro reads go through macrosDb namespace (D-07 in Phase 30).
- **D-14:** Streak = protein-goal-only days (D-10 in Phase 30). StreakAverageRow continues using protein streak and protein 7-day avg.
- **D-15:** MacroValues `{ protein, carbs, fat }` object pattern for all macro data (D-05 in Phase 30).

### Claude's Discretion
- Component file structure (single MacroProgressCard vs separate sub-components)
- Animation on bar fill changes (if any — keep it subtle)
- Chart legend design (adapt from current ProteinChart legend pattern)
- Tab component styling (pill-style vs underline)
- Whether to keep StreakAverageRow as-is or integrate streak into the progress card

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Existing components to replace/adapt
- `src/components/ProteinProgressBar.tsx` — Current single-bar progress with inline edit. MacroProgressCard replaces this with 3-bar compact layout.
- `src/components/GoalSetupForm.tsx` — Current single-input protein goal setup. Replaced with 3-input macro goal form.
- `src/components/ProteinChart.tsx` — Current line chart with time range pills. MacroChart adds tab selector above, uses MacroChartPoint data.
- `src/components/StreakAverageRow.tsx` — Streak and 7-day average display. May need adjustment for macro context.

### Screen that hosts these components
- `src/screens/ProteinScreen.tsx` — Orchestrates ProteinProgressBar, GoalSetupForm, ProteinChart, QuickAddButtons, MealListItem in a ScrollView. Phase 31 replaces the progress/goal/chart components here.

### DB layer (Phase 30 — read-only for this phase)
- `src/db/macros.ts` — `getMacroGoals()`, `setMacroGoals()`, `getTodayMacroTotals()`, `getDailyMacroTotals()`, `get7DayAverage()`, `getStreakDays()` — all consumed by Phase 31 components.
- `src/db/index.ts` — `macrosDb` namespace export for all macro DB functions.

### Types and utilities
- `src/types/index.ts` — `MacroValues`, `MacroSettings`, `MacroChartPoint`, `MacroType`, `MACRO_COLORS`, `CALORIES_PER_GRAM` types and constants.
- `src/utils/macros.ts` — `computeCalories(p, c, f)` utility for calorie computation.

### Theme
- `src/theme/colors.ts` — `colors.accent`, `colors.surface`, `colors.border`, `colors.secondary`, etc.
- `src/theme/spacing.ts` — spacing constants used by all components.
- `src/theme/typography.ts` — `fontSize`, `weightBold`, `weightSemiBold`, etc.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `ProteinProgressBar` inline edit pattern: `isEditing` state swaps bar to TextInput + Save/Cancel — reuse this pattern per-bar in MacroProgressCard.
- `ProteinChart` time range pills and data fetching pattern with `useFocusEffect` — extend for tab state.
- `LineChart` from `react-native-chart-kit` — same library, same config pattern.
- `computeCalories()` at `src/utils/macros.ts` — used for both progress card header and goal form estimate.
- `macrosDb.getDailyMacroTotals()` returns `MacroChartPoint[]` with all three macros per point — enables instant tab switching.

### Established Patterns
- Section headers: uppercase, `fontSize.sm`, `weightBold`, `colors.secondary`, `letterSpacing: 1.2`
- Cards: `colors.surface` background, `borderRadius: 14`, `borderWidth: 1`, `borderColor: colors.border`
- Inline editing: state toggle between display and edit mode within the same component
- Data loading: `useFocusEffect` with cleanup via cancelled flag
- Number inputs: `keyboardType="number-pad"`, `maxLength={5}`, `returnKeyType="done"`

### Integration Points
- `ProteinScreen.tsx` — swap ProteinProgressBar for MacroProgressCard, GoalSetupForm for MacroGoalSetupForm, ProteinChart for MacroChart
- `src/db/index.ts` — import `macrosDb` for all goal/total/chart queries
- `src/types/index.ts` — import `MacroValues`, `MacroSettings`, `MacroChartPoint`, `MACRO_COLORS`

</code_context>

<specifics>
## Specific Ideas

- Progress card should use `MACRO_COLORS[macroType]` for each bar's fill color rather than hardcoded values
- The "P", "C", "F" labels on bars should use the corresponding macro color for the letter
- When editing a bar inline, the input border should match that macro's color for visual continuity
- Calorie total in header should use `computeCalories()` from utils, not manual arithmetic
- Chart tab text for the active tab should use its macro color; inactive tabs in secondary color
- Goal setup form subtitle: "Set daily targets for your macros" (replace protein-specific copy)

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 31-goal-setting-progress-charts*
*Context gathered: 2026-04-02*
