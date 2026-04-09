---
phase: 38
status: issues_found
depth: standard
files_reviewed: 9
findings:
  critical: 0
  warning: 4
  important: 0
  info: 5
  total: 9
---

# Phase 38 Code Review — Food Search & Custom Foods

**Reviewer:** Claude Sonnet 4.6 (code-review role)
**Date:** 2026-04-08
**Scope:** src/types/index.ts, src/db/foods.ts, src/db/index.ts,
           src/db/__tests__/foods.mapper.test.ts, src/components/FoodResultItem.tsx,
           src/components/FrequentFoodsSection.tsx, src/screens/FoodSearchModal.tsx,
           src/components/NoResultsCard.tsx, src/components/CustomFoodForm.tsx

---

## Summary

Plan alignment is strong. All required deliverables from Plans 01–03 are present: Food/FoodSearchResult types, four DB functions, namespaced barrel export, mapper tests, FoodResultItem, FrequentFoodsSection, FoodSearchModal, NoResultsCard, and CustomFoodForm. Security posture for the stated threat model is sound — all SQL uses parameterized bindings. No critical bugs found.

Four warnings require attention before Phase 39 consumers land, primarily a race condition in the modal's async state, a problematic `parseFloat || 0` pattern that silently ignores valid zero, and a missing `isSaving` reset after a successful save path. The remaining findings are informational quality improvements.

---

## Findings

### Warnings (must fix before Phase 39 integration)

---

**WR-01**
**File:** `src/screens/FoodSearchModal.tsx`
**Lines:** 40–57
**Title:** Stale-closure race condition on modal re-open — frequent foods fetch writes to state after unmount/re-render cycle

**Description:**
The `useEffect` that calls `foodsDb.getFrequentFoods()` has no cancellation guard. If the modal is opened, then immediately closed while the async call is still in flight, the `.then(setFrequentFoods)` continuation fires on an already-closed modal. In React Native this produces a "Can't perform a React state update on an unmounted component" warning and may produce a stale-state flash the next time the modal opens.

The second debounced search effect (lines 60–77) has the same gap — `foodsDb.searchFoods(query).then(setResults)` has no cancellation if `query` changes faster than the network/DB responds (though the 200ms debounce reduces the window, it does not eliminate it).

**Suggested fix:**
Use an `isMounted` / `isCurrent` flag scoped to the effect:
```typescript
useEffect(() => {
  if (!visible) return;
  let isCurrent = true;
  setFrequentLoading(true);
  foodsDb.getFrequentFoods()
    .then((foods) => { if (isCurrent) setFrequentFoods(foods); })
    .catch(() => { if (isCurrent) setFrequentFoods([]); })
    .finally(() => { if (isCurrent) setFrequentLoading(false); });
  return () => { isCurrent = false; };
}, [visible]);
```
Apply the same pattern to the debounce effect's inner async call.

---

**WR-02**
**File:** `src/components/CustomFoodForm.tsx`
**Lines:** 48–51
**Title:** `parseFloat(str) || 0` silently treats a valid explicit zero as "empty"

**Description:**
```typescript
const parsedProtein = parseFloat(proteinStr) || 0;
```
`parseFloat('0')` returns `0`, and `0 || 0` is fine here. However, `parseFloat('0.0')` also returns `0`. The real problem is that this expression means a user who intentionally enters `0` for a macro (e.g., a food with zero fat) gets `0` silently — which is correct — but invalid input like `'abc'` also falls through to `0`, bypassing the `validateAll()` call's guard that would normally catch it.

The deeper issue is the sequencing: `parsedProtein` is computed at render time unconditionally (line 48), before `validateAll()` is called (line 72 inside `handleSave`). This means `caloriePreview` (line 51) can show `0` or a misleading number even when inputs are invalid. This is a UX inaccuracy rather than a data-corruption bug (the actual DB insertion only occurs after validation passes), but it sets a confusing expectation.

Additionally, `validateMacroField` only returns `'Enter a number'` when `isNaN(parsed) || parsed < 0`. The value `'0'` passes validation correctly. The silent fallback in the render-time parse is redundant with proper validation — it may mask future regressions where the two branches diverge.

**Suggested fix:**
Keep the `|| 0` fallback only for the calorie preview display (it is harmless there), but add an explicit `isNaN` guard so the display does not use corrupted intermediate values:
```typescript
const parsedProtein = parseFloat(proteinStr);
const parsedCarbs   = parseFloat(carbsStr);
const parsedFat     = parseFloat(fatStr);
const allParseable  = !isNaN(parsedProtein) && !isNaN(parsedCarbs) && !isNaN(parsedFat);
const caloriePreview = allParseable
  ? Math.round(computeCalories(parsedProtein, parsedCarbs, parsedFat))
  : 0;
```
Pass `parsedProtein ?? 0` (with null-coalescing) to `createCustomFood` so the types remain safe.

---

**WR-03**
**File:** `src/components/CustomFoodForm.tsx`
**Lines:** 71–87
**Title:** `isSaving` is never reset to `false` on the success path — button stays disabled if parent re-renders the form

**Description:**
```typescript
async function handleSave() {
  if (!validateAll()) return;
  setIsSaving(true);
  try {
    const createdFood = await foodsDb.createCustomFood(...);
    Vibration.vibrate(50);
    onFoodCreated(createdFood);   // <-- parent closes modal
  } catch (_err) {
    setErrors(prev => ({ ...prev, name: 'Failed to save. Please try again.' }));
    setIsSaving(false);           // only reset on error path
  }
}
```
On the happy path, `isSaving` is set to `true` and never explicitly set back to `false`. The design relies on `onFoodCreated` triggering `onClose`, which unmounts the component — so in the current integration the button never visually gets stuck. However, if the parent decides to keep the form mounted (e.g., a future "save and add another" mode, or if the modal is kept alive for navigation reasons in Phase 39), the button remains permanently disabled. The error path correctly resets — the success path should too.

**Suggested fix:**
Add `setIsSaving(false)` after `onFoodCreated(createdFood)` as a defensive measure, or wrap the entire try block in a `finally`:
```typescript
} finally {
  setIsSaving(false);
}
```
(Remove the explicit `setIsSaving(false)` from the catch block since `finally` covers it.)

---

**WR-04**
**File:** `src/db/foods.ts`
**Lines:** 167–174
**Title:** `createCustomFood` re-fetches the inserted row by `insertId` — not atomic; subject to TOCTOU on shared databases

**Description:**
```typescript
const result = await executeSql(database, 'INSERT INTO foods ...', [...]);
const row = await executeSql(database, 'SELECT * FROM foods WHERE id = ?', [result.insertId]);
return rowToFood(row.rows.item(0));
```
These are two separate statements without a wrapping transaction. On a strictly local SQLite with a single writer this is safe in practice, but the pattern deviates from the `runTransaction` helper available in `database.ts` and creates a logical inconsistency: if another writer (e.g., a future sync feature) inserts a row between the INSERT and SELECT, `result.insertId` could theoretically become stale — though SQLite's AUTOINCREMENT makes that scenario extremely unlikely.

More importantly, the code does not check `result.insertId` for validity before using it (e.g., `insertId` could be `undefined` if the driver returns an unexpected result shape).

**Suggested fix:**
Add a null-check guard, and optionally consolidate into a transaction:
```typescript
if (result.insertId == null) {
  throw new Error('createCustomFood: INSERT did not return a valid insertId');
}
const row = await executeSql(database, 'SELECT * FROM foods WHERE id = ?', [result.insertId]);
if (row.rows.length === 0) {
  throw new Error('createCustomFood: inserted row not found');
}
return rowToFood(row.rows.item(0));
```
A full transaction is not strictly required here, but the null-check is.

---

### Informational (quality improvements)

---

**IR-01**
**File:** `src/components/FoodResultItem.tsx`
**Lines:** 34
**Title:** Macro values displayed without decimal clamping — long floats can overflow the card layout

**Description:**
```typescript
{`P:${food.proteinPer100g}g  C:${food.carbsPer100g}g  F:${food.fatPer100g}g  ...`}
```
USDA data values like `23.144` render as-is. On smaller devices or when the usage badge is showing, a long decimal string can cause the macro summary line to wrap or truncate unexpectedly. The calorie value is rounded with `Math.round` but the macro grams are not.

**Suggested fix:** Use `.toFixed(1)` for each macro gram value in the display string, consistently with how other parts of the app render nutrient values:
```typescript
`P:${food.proteinPer100g.toFixed(1)}g  C:${food.carbsPer100g.toFixed(1)}g  F:${food.fatPer100g.toFixed(1)}g  ...`
```

---

**IR-02**
**File:** `src/components/FrequentFoodsSection.tsx`
**Lines:** 19
**Title:** Loading state renders nothing — no visual indicator while frequent foods are fetching

**Description:**
```typescript
{loading ? null : foods.length === 0 ? ( ... ) : ( ... )}
```
Per Plan 02's task action: "show nothing (or a subtle placeholder — the search bar is enough visual feedback)". Rendering `null` means the section header "FREQUENTLY LOGGED" also disappears during load, causing a layout shift when data arrives. The header text should remain visible, or a skeleton placeholder should replace the list area.

**Suggested fix:** Render the header unconditionally and only gate the list/empty-state on `loading`:
```tsx
<View>
  <Text style={styles.sectionHeader}>FREQUENTLY LOGGED</Text>
  {loading ? (
    <Text style={styles.emptyState}>Loading...</Text>
  ) : foods.length === 0 ? (
    <Text style={styles.emptyState}>Your frequent foods will appear here</Text>
  ) : (
    // ... food list
  )}
</View>
```

---

**IR-03**
**File:** `src/db/foods.ts`
**Lines:** 68–73
**Title:** Double empty-check is redundant — one guard is sufficient

**Description:**
```typescript
const trimmed = query.trim().toLowerCase();
if (trimmed === '') {
  return [];
}
const tokens = trimmed.split(/\s+/).filter(t => t.length > 0);
if (tokens.length === 0) {  // <-- unreachable given the guard above
  return [];
}
```
After `trimmed === ''` is checked, `trimmed.split(/\s+/).filter(t => t.length > 0)` cannot produce an empty array — a non-empty string split on whitespace always yields at least one non-empty token. The second guard is dead code. It is harmless but adds noise and could mislead future maintainers into thinking there is a case where it fires.

**Suggested fix:** Remove the second guard, or collapse both checks:
```typescript
const tokens = query.trim().toLowerCase().split(/\s+/).filter(t => t.length > 0);
if (tokens.length === 0) return [];
```

---

**IR-04**
**File:** `src/db/__tests__/foods.mapper.test.ts`
**Lines:** 1–108
**Title:** Test coverage gap — `rowToFood` does not test the `search_text` passthrough field

**Description:**
The test suite covers id, fdcId, name, category, proteinPer100g, carbsPer100g, fatPer100g, caloriesPer100g, and isCustom. The `searchText` field (mapped from `search_text`) is present in every test row but is only explicitly asserted once (line 28: `expect(result.searchText).toBe('chicken breast raw poultry')`). The remaining test cases omit this assertion. This is minor but leaves an unverified mapping that could silently break if the column name in a future migration changes.

**Suggested fix:** Add `expect(result.searchText).toBe(row.search_text)` to the second and third test cases.

---

**IR-05**
**File:** `src/screens/FoodSearchModal.tsx`
**Lines:** 102
**Title:** Back button uses a literal `'<'` character as chevron — renders inconsistently across fonts

**Description:**
```typescript
<Text style={styles.backButtonText}>{'<'}</Text>
```
This is an ASCII less-than character. On some Android fonts it renders with differing weight or baseline compared to a real chevron. The same pattern exists in `CustomFoodForm.tsx` at line 98. The plan spec did not mandate a specific icon approach, so this is acceptable as a placeholder, but it is worth noting for visual consistency with other back buttons in the app.

**Suggested fix:** Use `‹` (U+2039, single left-pointing angle quotation mark) or `←` (U+2190), or adopt a small icon library consistent with the rest of the app. This is a cosmetic issue with no functional impact.

---

## Plan Alignment Assessment

All three plans' `done` criteria are satisfied:

- Plan 01: `Food` and `FoodSearchResult` types present in `src/types/index.ts`. All four DB functions exported. `foodsDb` namespace in barrel. Mapper tests pass (5 test cases).
- Plan 02: `FoodResultItem` memoized, `React.memo` used, `borderRadius: 14`, `minHeight: 44`, `showUsageBadge` prop, `accessibilityLabel` per spec. `FrequentFoodsSection` with "FREQUENTLY LOGGED" header, empty state text, `letterSpacing: 0.8`. `FoodSearchModal` with 200ms debounce, `autoFocus`, `animationType="slide"`, `Vibration.vibrate(10)`, `keyboardShouldPersistTaps="handled"`.
- Plan 03: `NoResultsCard` with query-interpolated message and mint-colored CTA. `CustomFoodForm` with `initialName` pre-fill, `computeCalories` for live preview, `Required`/`Enter a number` validation, `foodsDb.createCustomFood`, `Vibration.vibrate(50)`. `FoodSearchModal` integrates both — `showCustomForm` gates the form, `setShowCustomForm(false)` restores query.

One deviation from Plan 02 was observed and is an improvement: Plan 02 specified the no-results state as a simple `<View style={styles.noResults}><Text>No results for "{query}"</Text></View>` placeholder, but the implementation directly uses `NoResultsCard` from Plan 03. This is a valid ahead-of-time integration — both plans arrived together — and no plan-specified placeholder code was left behind.

---

## What Was Done Well

- SQL injection surface is fully parameterized. No string interpolation of user input into any SQL statement across all functions in `foods.ts`.
- `React.memo` on `FoodResultItem` is correctly applied with stable `onPress` references via `useCallback` in the parent.
- The debounce implementation using `useRef<ReturnType<typeof setTimeout>>` is idiomatic and avoids the stale-closure trap for the timeout ID itself.
- Accessibility labels on all interactive elements meet the spec contract, including the composite `accessibilityLabel` on `FoodResultItem` that incorporates usage count.
- `createCustomFood` applies both client-side (form validation) and server-side (DB function) validation as independent layers — defense in depth for macro value constraints.
- The `rowToFoodSearchResult` spreading pattern (`{ ...rowToFood(row), usageCount }`) ensures no field divergence between Food and FoodSearchResult.
- `computeCalories` is not reimplemented inline — it is imported from the shared utility, keeping the calorie formula single-sourced.
