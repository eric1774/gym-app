# Project Retrospective

*A living document updated after each milestone. Lessons feed forward into future planning.*

## Milestone: v1.9 — Food Database & Meal Builder

**Shipped:** 2026-04-09
**Phases:** 4 | **Plans:** 11 | **Sessions:** ~3

### What Was Built
- USDA build pipeline script generating ~8,000 food entries as bundled JSON asset, migration v12 with foods and meal_foods tables, first-launch seeding splash screen
- Fuzzy token search with 200ms debounce, frequency boosting, frequent foods list, FoodSearchModal with FoodResultItem and FrequentFoodsSection
- NoResultsCard and CustomFoodForm for inline custom food creation with macro validation and auto-computed calories
- MealBuilderScreen with multi-food composition, FoodGramInput slide-up component, MealFoodCard, MealTotalsBar with running macro totals
- Remembered portions via getLastUsedPortion — ghost text pre-fill in gram input, "last: Xg" badges on search results
- Meal repeat/edit: duplicateMealFoods, updateMealWithFoods, repeat icon on meal cards, builder edit mode with navigation params
- Library integration: BUILD MEAL button from AddLibraryMealModal, save-to-library toggle on MealBuilderScreen

### What Worked
- Four-phase split (DB foundation → search/custom → builder UI → smart features) kept each phase focused with clear boundaries
- Two-transaction pattern for addMealWithFoods (insert meals first, then meal_foods) worked around SQLite callback insertId limitation cleanly
- FoodGramInput as absolute-positioned component (not Modal) avoided modal stacking issues and kept MealBuilderScreen in control of z-ordering
- onBuildMeal callback prop pattern (same as AddMealModal D-13) kept modals testable without useNavigation dependency
- Reusing established patterns (FoodResultItem mirrors MealListItem, MealTotalsBar mirrors MacroProgressBars) made UI phases fast
- Phase 37 USDA pipeline was self-contained — no GSD phase directory needed, just the build script and migration

### What Was Inefficient
- Phase 37 had no `.planning/phases/37-*` directory — SUMMARY files are missing for archival, making one-liner extraction impossible
- SUMMARY one-liner extraction continues to be unreliable — CLI returned empty strings for several summaries (pattern from v1.8 persists)
- No REQUIREMENTS.md existed for v1.9 — requirements were tracked inline in PROJECT.md, which worked but broke the standard traceability flow

### Patterns Established
- Bundled asset seeding pattern: JSON asset in android/app/src/main/assets/, bulk INSERT via executeSql in migration callback
- Token-based fuzzy search: split query into tokens, match each with LIKE '%token%', boost by frequency count
- Slide-up gram input pattern: absolute-positioned component with Animated.Value for entry animation, onBlur dismiss
- Ghost text pre-fill: getLastUsedPortion query → placeholder text in TextInput, cleared on edit mode
- Navigation params for screen mode routing: `mode: 'add' | 'edit' | 'repeat' | 'library'` passed via route.params

### Key Lessons
1. Phase directories should always be created even for simple phases — missing Phase 37 directory means no SUMMARY files for automated extraction
2. Requirements tracking without a standalone REQUIREMENTS.md works for small milestones but loses traceability structure — consider always creating one
3. The four-phase pattern (data → search → builder → integration) is the right granularity for "add a data source + UI" features
4. Two-day milestones with 4 phases and 11 plans remain fast when building on established DB and component patterns

### Cost Observations
- Model mix: ~85% opus, ~15% sonnet
- Sessions: ~3 across 2 days
- Notable: 11 plans across 4 phases in 2 days — fastest plans-per-day rate, driven by pattern reuse from v1.7/v1.8

---

## Milestone: v1.8 — Hydration Tracker

**Shipped:** 2026-04-05
**Phases:** 3 | **Plans:** 6 | **Sessions:** ~2

### What Was Built
- DB migration v11 with water_logs and water_settings tables, hydration.ts module with 6 functions (getWaterGoal, setWaterGoal, logWater, getTodayWaterTotal, getStreakDays, get7DayAverage)
- TabBar component with underline active state, MacrosView extraction refactoring ProteinScreen into thin shell
- WaterCup gradient fill visualization proportional to daily water progress vs goal
- Quick-add buttons (+8/+16/+24 oz) with haptic feedback and LogWaterModal for custom amounts
- GoalSetupCard with pre-filled 64 oz default, inline goal editing with Save/Cancel
- HydrationStatCards showing hydration streak and weekly average stats

### What Worked
- Three-phase split (DB → core UI → polish) continues to be the right granularity for feature milestones — each phase was self-contained
- Thin shell refactor pattern (ProteinScreen → MacrosView + HydrationView with TabBar) kept the parent screen simple while enabling tab switching without navigation changes
- Reusing established patterns (GoalSetupCard mirrors MacroGoalSetupForm, HydrationStatCards mirrors stat card patterns from macros) made UI phases fast
- Promise.all for parallel data fetching in HydrationView refreshData (total + goal + streak + avg) — single stable useCallback called on focus, quick-add, and modal save
- Add-only water logging design decision eliminated edit/delete complexity — kept implementation scope tight

### What Was Inefficient
- REQUIREMENTS.md checkboxes for Phase 34 and 36 requirements weren't updated at phase transitions — 5 of 10 were still unchecked despite all phases being complete
- One-liner extraction from SUMMARY.md continues to be unreliable — CLI extracted "One-liner:" empty strings for 4 of 6 summaries
- No milestone audit was run before completion — all phases were complete but formal verification was skipped

### Patterns Established
- Tab-based view switching pattern: state-based activeTab on parent screen, no navigation stack changes
- CUP_HEIGHT constant pattern: fill visualization uses fixed dimension constant so fillFraction * height is consistent with rendered dimensions
- Math.round validation before DB write: prevents fractional oz injection (threat mitigation pattern)
- Null-aware goal conditional render: goalOz===null shows GoalSetupCard, non-null shows full content

### Key Lessons
1. REQUIREMENTS.md traceability status should be updated at each phase transition — stale checkboxes create false incompleteness signals at milestone completion
2. SUMMARY.md one-liner fields need consistent formatting for CLI extraction to work — consider enforcing a stricter template
3. The ProteinScreen thin-shell + tab-switching pattern works well for adding parallel tracking features (macros, hydration) without navigation complexity
4. Two-day milestones with 3 phases are the sweet spot for focused feature additions — minimal context loss between sessions

### Cost Observations
- Model mix: ~90% opus, ~10% sonnet
- Sessions: ~2 across 2 days
- Notable: Fastest feature milestone relative to scope — 3 phases in 2 days, all TDD with tests included

---

## Milestone: v1.6 — Heart Rate Monitoring

**Shipped:** 2026-03-30
**Phases:** 6 | **Plans:** 14 | **Sessions:** ~8

### What Was Built
- BLE foundation: Android permissions with API-level branching, singleton BleManager, DB migration v8, HRSettingsService with AsyncStorage CRUD
- Full device connection pipeline: DeviceScanSheet, connect/disconnect, paired device persistence, auto-reconnect with exponential backoff
- HR data persistence: in-session useRef sample buffering, single-transaction batch flush, avg/peak HR aggregates on workout_sessions
- Live BPM display: zone-colored BPM in two-row workout header, 5-zone model, zone labels, connection state indicator
- Settings HR configuration: age input with Tanaka formula, max HR override, device pairing/unpairing from Settings screen
- Bug fix pass: unpair BLE disconnect, below-zone neutral rendering (getHRZone returns null), dead code removal

### What Worked
- Phase sequencing (infra → connection → persistence → display → fixes → bookkeeping) meant each phase built on solid foundations from the previous
- HeartRateContext mirroring TimerContext pattern — proven architecture made BLE-to-React bridge predictable
- Milestone audit after Phase 27 caught real bugs (unpair disconnect, zone clamping) that Phases 28-29 then closed systematically
- Parallel worktree execution for Phase 28 plans (28-01 and 28-02 ran simultaneously) — merge was clean
- useRef for HR sample buffering was the right call — zero set-logging speed impact, single flush on session end

### What Was Inefficient
- Phase 27 required 4 plans (originally scoped for 2) — gap closure plans 27-03 (Settings navigation) and 27-04 (header overflow) were discovered during execution rather than planning
- Phase 27 VERIFICATION still shows gaps_found due to pulse animation deviation — the plan spec was too ambitious for the execution scope
- One-liner extraction from SUMMARY.md files was unreliable for milestone completion — many had empty or malformed one-liner fields
- Phase 27 plan 27-02 took 494 duration units and 27-04 took 1626 — Settings screen complexity was underestimated

### Patterns Established
- BLE permission pattern: requestBLEPermissions() with API-level branching (31+ vs older) before any BLE call
- HR zone utility pattern: getHRZone(bpm, maxHr) returns HRZoneInfo | null — null for below-zone enables neutral rendering
- Two-row workout header pattern: Row 1 always fits (timer, volume, End Workout), Row 2 conditional on paired device
- Blur-to-save input pattern: persist on onBlur with validation range, silently restore on invalid
- prevStateRef pattern: detect state transitions in useEffect without adding extra state variables (used for disconnect haptic)

### Key Lessons
1. Milestone audits before completion catch real integration bugs — the unpair disconnect bug would have shipped without the audit
2. Plan-level must_haves that aren't ROADMAP success criteria (like pulse animation) should be explicitly marked as "nice to have" to avoid false verification failures
3. BLE features need more plan padding than pure UI features — hardware interaction surfaces edge cases (header overflow, flicker, reconnect timing) during execution
4. Bookkeeping phases (29) are cheap but necessary — 10 SUMMARY files needed frontmatter updates, 4 REQUIREMENTS.md checkboxes were stale
5. Parallel worktree execution works well for independent bug fix plans but creates documentation-code discrepancies when both plans touch the same file

### Cost Observations
- Model mix: ~85% opus, ~15% sonnet (integration checker and some agents ran on sonnet)
- Sessions: ~8 across 7 days
- Notable: Phases 28-29 (bug fixes + bookkeeping) added 2 phases to close audit gaps — plan for 1 cleanup phase per hardware-integration milestone

---

## Milestone: v1.5 — Program Data Export

**Shipped:** 2026-03-22
**Phases:** 2 | **Plans:** 2 | **Sessions:** 1

### What Was Built
- SQLite-backed exportProgramData function assembling completed workout data into hierarchical JSON (weeks > days > exercises > sets)
- Distinct-pair completion percentage calculation avoiding duplicate session inflation
- Three-dot PopupMenu on program cards with Export and Delete options
- Full export flow: menu tap -> data fetch -> Android share dialog -> success/error toast
- ExportToast component with mint-green success and red error styling (matches PRToast pattern)

### What Worked
- Two-phase split (data layer then UI) was clean — Phase 22 was fully testable in isolation, Phase 23 just called the function
- Reusing existing patterns (PRToast → ExportToast, forwardRef/useImperativeHandle) made UI phase fast
- Multi-query SQL assembly pattern (metadata, counts, sessions, sets) keeps each query simple and debuggable
- Both phases completed in a single session (~12 minutes total execution)

### What Was Inefficient
- Nothing significant — this was a well-scoped 2-phase milestone with clear boundaries

### Patterns Established
- Export assembly pattern: separate SQL queries for metadata/counts/sessions/sets, assembled in JS with Map insertion-order
- PopupMenu pattern: Modal transparent + Pressable backdrop for dropdown menus on cards
- Map.forEach() instead of for...of for Map iteration (ES5 target compatibility)
- nativeEvent optional chaining guard for test environment compatibility

### Key Lessons
1. Small, focused milestones (2 phases) execute cleanly with minimal overhead — no context resets needed
2. Data layer + UI layer split is the right granularity for export features
3. Android Share API handles file destination without needing custom file picker code

### Cost Observations
- Model mix: ~95% opus, ~5% sonnet
- Sessions: 1 (single session, same day)
- Notable: Fastest milestone yet — 2 phases in ~12 minutes of execution time

---

## Milestone: v1.4 — Test Coverage

**Shipped:** 2026-03-17
**Phases:** 7 | **Plans:** 14 | **Sessions:** ~6

### What Was Built
- Complete Jest test infrastructure with 8 native module mocks and reusable test utilities
- 30 unit tests for pure date utilities and DB row mapper functions
- 147 DB business logic tests across all 8 database modules
- 72 component and context provider tests (rendering, interaction, lifecycle)
- 79 screen tests covering all app screens including complex workout flows and modal validation
- Gap-closing pass achieving 82.26% global line coverage (up from 77.82%)

### What Worked
- Phased test approach (infra → utils → DB → components → screens → gaps) meant each phase built on patterns from the previous one
- jest.mock auto-mock pattern kept test files clean and avoided native module crashes
- Object.defineProperty pattern for overriding read-only db exports was discovered early and reused consistently
- TestConsumer + onCtx ref pattern solved context testing without renderHook version headaches
- Parallel execution of independent test phases (18 didn't depend on 17) allowed faster throughput

### What Was Inefficient
- mockProviders.tsx side effects (auto-mocking db/exercises and db/sessions) caused conflicts in multiple phases — workaround was to avoid importing from @test-utils in DB and screen tests
- Several plans had unchecked checkboxes in ROADMAP.md despite being complete (SUMMARY.md existed) — the ROADMAP wasn't updated consistently during execution
- Phase 21 gap-closing took disproportionate effort (180 minutes) compared to other phases — earlier phases could have been more thorough
- STATE.md accumulated multiple frontmatter blocks instead of being cleanly updated

### Patterns Established
- DB test pattern: jest.mock('../database') as first statement → import named functions → Object.defineProperty for db override
- Component test pattern: pure components get direct import; screen components use NavigationContainer or renderWithProviders
- Context test pattern: TestConsumer with onCtx callback ref + jest.useFakeTimers() in beforeEach
- Screen test pattern: jest.mock context hooks with mutable module-level values, reset in beforeEach
- Accepted coverage gaps: PanResponder callbacks (RNTL limitation), dynamic import() in database.ts (Jest ESM limitation)

### Key Lessons
1. Mock side effects compound — mockProviders.tsx auto-mocking DB modules as an import side effect caused cascading issues. Future mock utilities should be pure/opt-in.
2. Gap-closing is cheaper when earlier phases write more thorough tests. The 77.82% → 82.26% gap-close required touching 20 files.
3. ROADMAP plan checkboxes should be updated by execution, not left for manual cleanup.
4. Coverage thresholds at 80% lines / 70% functions/branches is the right balance for a UI-heavy React Native app.

### Cost Observations
- Model mix: ~90% opus, ~10% sonnet
- Sessions: ~6 across 2 days
- Notable: All 7 phases completed in 2 calendar days — test infrastructure reuse made later phases fast

---

## Cross-Milestone Trends

### Process Evolution

| Milestone | Sessions | Phases | Key Change |
|-----------|----------|--------|------------|
| v1.0 MVP | ~3 | 3 | Initial GSD setup |
| v1.1 Protein | ~4 | 4 | Multi-phase feature milestone |
| v1.2 Meal Library | ~1 | 1 | Single-phase milestone |
| v1.3 Workout Intelligence | ~6 | 6 | Largest feature milestone, DB migration v7 |
| v1.4 Test Coverage | ~6 | 7 | First non-feature milestone, test-only |
| v1.5 Program Data Export | 1 | 2 | Smallest milestone, single-session completion |
| v1.6 Heart Rate Monitoring | ~8 | 6 | First hardware-integration milestone, BLE + DB migration v8 |
| v1.7 Macros Tracking | ~3 | 3 | Parallel DB module pattern (macros.ts alongside protein.ts) |
| v1.8 Hydration Tracker | ~2 | 3 | Tab-based view switching, fastest feature milestone |
| v1.9 Food Database & Meal Builder | ~3 | 4 | Bundled USDA DB, multi-food meal builder, 11 plans in 2 days |

### Cumulative Quality

| Milestone | Tests Added | Coverage | Key Quality Change |
|-----------|-------------|----------|-------------------|
| v1.0-v1.3 | 0 | 0% | No tests |
| v1.4 | ~358 | 82.26% | Full test suite from zero |
| v1.5 | ~14 | 82%+ | Export tests (10 unit + 4 toast) |
| v1.6 | ~20 | 82%+ | HRSettingsService tests (10), hrZones tests, SettingsScreen tests |
| v1.7 | ~14 | 82%+ | macros.ts tests, MacroProgressCard tests, MacroPills tests |
| v1.8 | ~14 | 82%+ | GoalSetupCard tests (7), HydrationStatCards tests (7) |
| v1.9 | 0 | 82%+ | No new tests — focused on feature delivery, existing coverage maintained |

### Top Lessons (Verified Across Milestones)

1. Infrastructure phases pay compound dividends — Jest setup in Phase 15 was reused by all 6 subsequent phases
2. Mock isolation matters — side effects in shared test utilities cause hard-to-debug conflicts across test files
3. Small milestones (2-3 phases) with clear data/UI splits execute fast with zero waste — confirmed by v1.5 (1 session), v1.8 (2 days)
4. Hardware-integration milestones need a cleanup/bug-fix phase budgeted upfront — confirmed by v1.6 (Phases 28-29 added post-audit)
5. Milestone audits catch real bugs that verification misses — v1.6 audit found unpair disconnect bug and zone clamping issue
6. REQUIREMENTS.md traceability must be updated at phase transitions, not deferred — stale checkboxes cause false incompleteness at milestone completion (v1.8)
7. Thin shell + tab-switching pattern scales well for parallel tracking features — confirmed by v1.8 (Macros + Hydration on same screen)
8. Phase directories should always be created, even for simple phases — missing Phase 37 directory in v1.9 means no SUMMARY files for automated extraction
9. Four-phase data→search→builder→integration pattern is the right granularity for "add data source + UI" features — confirmed by v1.9 (11 plans, 2 days)
