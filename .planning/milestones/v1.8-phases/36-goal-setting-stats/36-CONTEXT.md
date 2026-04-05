# Phase 36: Goal Setting & Stats - Context

**Gathered:** 2026-04-05
**Status:** Ready for planning

<domain>
## Phase Boundary

Users can set and edit their daily water goal, and see hydration streak and weekly average stats below the cup. First-use prompt when no goal exists. No new DB work — Phase 34's hydrationDb already has getWaterGoal, setWaterGoal, getStreakDays, and get7DayAverage.

</domain>

<decisions>
## Implementation Decisions

### First-Use Setup Card
- **D-01:** When goal_oz is null, display a full-width surface-colored card centered where the cup would be — the cup, quick-add buttons, and Log Water button are all hidden until a goal is set
- **D-02:** Setup card contains: title ("Set Your Daily Water Goal"), a TextInput pre-filled with 64, "fl oz" suffix label, and a mint "Set Goal" button
- **D-03:** After saving the goal, the setup card disappears and the full hydration view (cup + goal label + stats + quick-add + Log Water) renders instantly — no animation, consistent with D-04 from Phase 35 (no animation on tab switch)
- **D-04:** Conditional rendering at the HydrationView level: `goalOz === null ? <GoalSetupCard /> : <FullHydrationContent />`

### Goal Label & Inline Editing
- **D-05:** A "GOAL: X fl oz" label centered below the cup, styled as secondary text — acts as the tap target for editing
- **D-06:** Tapping the goal label swaps it to an inline edit row: TextInput pre-filled with current goal + "fl oz" suffix + Save and Cancel buttons — same pattern as MacroProgressCard inline editing
- **D-07:** Save calls hydrationDb.setWaterGoal, then immediately recalculates cup fill percentage, streak, and weekly average via refreshData
- **D-08:** Cancel restores the label without changes, no keyboard dismiss animation needed

### Streak & Average Stats
- **D-09:** Two stat cards side-by-side in a row below the goal label: left card shows streak (fire emoji + "X day streak"), right card shows weekly average (large percentage + "7-day avg" label)
- **D-10:** Weekly average displays as percentage of goal met (hydrationDb.get7DayAverage returns raw oz, UI computes `Math.round((avgOz / goalOz) * 100)` + "%" — per Phase 34 D-09)
- **D-11:** When no data exists: cards always visible — streak shows "0 days", average shows "—" or "0%". Gives users a visual target to fill
- **D-12:** Stat cards are new components — do NOT reuse StreakAverageRow (which is protein-specific with "Xg" formatting). Build hydration-specific stat cards

### Layout & Positioning
- **D-13:** Full view element order (top to bottom): Cup hero → Goal label → Stat cards row → Quick-add section → Log Water button
- **D-14:** Stat cards use surfaceElevated background, border, and border-radius matching the quick-add buttons — keeps the Hydration tab visually cohesive with one consistent card style

### Claude's Discretion
- Exact spacing between goal label and stat cards
- GoalSetupCard internal layout (padding, input width, button sizing)
- Stat card icon/emoji choice for weekly average card
- Keyboard handling on inline goal edit (auto-focus, dismiss behavior)
- Validation for goal input (minimum value, non-numeric rejection)
- Whether stat card text uses weightBold or weightSemiBold

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements
- `.planning/REQUIREMENTS.md` — GOAL-01 (first-use setup card), GOAL-02 (inline goal editing), HYD-04 (streak + weekly avg stats)

### Prior phase context
- `.planning/phases/34-db-foundation/34-CONTEXT.md` — hydrationDb API decisions: D-08 (nullable goal_oz triggers first-use prompt), D-09 (get7DayAverage returns raw oz), D-10 (divides by 7 always), D-11 (streak counts days where total >= goal)
- `.planning/phases/35-tab-bar-hydration-core/35-CONTEXT.md` — HydrationView structure, WaterCup component, D-09 (hardcoded 64 oz default replaced by this phase)

### Source files to read
- `src/components/HydrationView.tsx` — Primary modification target: add goal state management, conditional first-use rendering, goal label, stats, inline editing
- `src/components/WaterCup.tsx` — Cup visualization receiving goalOz prop (no changes expected but understand the interface)
- `src/components/MacroProgressCard.tsx` — Reference implementation for inline goal editing pattern (editingMacro state, TextInput + Save/Cancel buttons)
- `src/db/hydration.ts` — hydrationDb module: getWaterGoal, setWaterGoal, getStreakDays, get7DayAverage (all already implemented)
- `src/theme/colors.ts` — surfaceElevated, border, accent colors for stat card styling

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `MacroProgressCard.tsx` inline edit pattern: `editingMacro` state toggles between display and edit mode with TextInput + Save/Cancel — direct reference for goal label inline editing
- `hydrationDb` module: All 4 required DB functions (getWaterGoal, setWaterGoal, getStreakDays, get7DayAverage) already implemented and tested in Phase 34
- `colors.surfaceElevated` + `colors.border`: Consistent card styling used by quick-add buttons — reuse for stat cards
- `HydrationView.tsx` already has refreshData callback that fetches goal + total — extend to also fetch streak and average

### Established Patterns
- Conditional rendering based on goal state: MacroProgressCard uses `goal !== null ? <ProgressBar /> : <TapToSetGoal />` — same pattern for setup card vs full view
- `useFocusEffect` for data loading on screen focus — already in HydrationView, streak/average fetch plugs into existing refreshData
- Inline edit state management: `editingMacro` / `editValue` / `editError` useState pattern in MacroProgressCard

### Integration Points
- `HydrationView.tsx` is the primary modification target — all new UI lives here or in new child components
- New components: `GoalSetupCard.tsx` (~60-80 lines), `HydrationStatCards.tsx` (~80-100 lines)
- `hydrationDb.getWaterGoal()` already called in HydrationView.refreshData — goal_oz null check drives setup card rendering
- `hydrationDb.setWaterGoal()` called from both setup card and inline edit save handlers

</code_context>

<specifics>
## Specific Ideas

- Setup card should feel like a focused onboarding step — one clear action ("Set Your Daily Water Goal") with a pre-filled default, not an empty form that requires the user to think about what to enter
- Stat cards should match the quick-add button visual style (surfaceElevated, same border-radius) so the Hydration tab has a unified card language
- The inline goal edit should feel identical to MacroProgressCard editing — users who've edited macro goals will find it familiar

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 36-goal-setting-stats*
*Context gathered: 2026-04-05*
