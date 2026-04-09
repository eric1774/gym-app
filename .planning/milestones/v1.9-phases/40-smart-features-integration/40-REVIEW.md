---
status: findings
phase: 40
depth: standard
files_reviewed: 12
findings:
  critical: 1
  warning: 5
  info: 4
  total: 10
---

# Code Review: Phase 40

## Findings

---

### [critical] Non-atomic two-transaction insert in `addMealWithFoods` can produce orphaned meals row

**File:** `src/db/foods.ts:272–295`

**Description:** The function runs two separate transactions: the first inserts the `meals` row, then a separate `executeSql` call recovers the new `id` by querying `logged_at` + `created_at`, then a second transaction inserts `meal_foods` rows. If the app crashes or the DB throws between the two transactions, a `meals` row exists with no `meal_foods` children. The ID recovery query is also fragile: two concurrent inserts sharing the same `logged_at` + `created_at` string (timestamp resolution is 1-second) would match multiple rows and could return the wrong ID.

**Recommendation:** Combine both inserts into a single `runTransaction` call. Use `tx.executeSql`'s callback form (which receives the result including `insertId`) to capture the new meal ID without a second query, then insert `meal_foods` rows in the same callback chain — all within one atomic transaction block.

---

### [warning] `parseDate` accepts out-of-range day values (e.g. month 2, day 31)

**File:** `src/screens/MealBuilderScreen.tsx:61`

**Description:** `parseDate` validates that `month` is 1–12 and `day` is 1–31, but it does not validate that the day is valid for the given month. Constructing `new Date(year, month-1, 31)` in February silently rolls over to March 3 (or 2 in a leap year). The user sees the date bar update to a wrong date with no error feedback.

**Recommendation:** After constructing the `Date` object, verify that `date.getMonth() === month - 1`. If not, return `null` so the existing `dateError` state fires "Use YYYY-MM-DD format".

---

### [warning] `handlePrevDay` / `handleNextDay` fire without clearing `mealFoodsCounts`

**File:** `src/components/MacrosView.tsx:117–132`

**Description:** When navigating days, `setMeals` is updated via a bare `.then(setMeals)` call but `mealFoodsCounts` is not refreshed. The repeat icon and edit-routing logic in `MealListItem` / `handleEdit` will therefore show stale data from the previously viewed date until the next full `refreshData` call. There is also no error handling on the `.then()` promise — a DB failure silently leaves the view in an inconsistent state.

**Recommendation:** Call `refreshData()` (which already fetches counts) instead of the inline `macrosDb.getMealsByDate(newDate).then(setMeals)` pattern. Alternatively, chain `getMealFoodsCounts` in the same `.then()` and add a `.catch()`.

---

### [warning] `toastMessage` in `MacrosView` is set but never auto-cleared

**File:** `src/components/MacrosView.tsx:42, 289–292`

**Description:** `toastMessage` state is declared and rendered, but no code in `MacrosView.tsx` ever clears it after display. Once set, the toast persists on screen forever. (Contrast `MealLibraryScreen.tsx:159` which correctly uses `setTimeout(() => setToastMessage(null), 2000)`.)

**Recommendation:** After setting `toastMessage`, add `setTimeout(() => setToastMessage(null), 2000)` — or extract a shared `showToast` helper.

---

### [warning] `FoodGramInput` animation callback may `setShouldRender(false)` after unmount

**File:** `src/components/FoodGramInput.tsx:73–82`

**Description:** The slide-out animation's `.start()` callback calls `setShouldRender(false)`. If the parent unmounts the component before the 200 ms animation completes (e.g., rapid navigation), the setState call will fire on an unmounted component. In React Native this produces a "Can't perform a React state update on an unmounted component" warning and may be promoted to an error in future React versions.

**Recommendation:** Use a mounted ref (`const isMounted = useRef(true)`) and guard the callback: `if (isMounted.current) setShouldRender(false)`. Clean up with `return () => { isMounted.current = false; }` in the effect.

---

### [warning] `searchFoods` does not return `last_used_grams`; `rowToFoodSearchResult` silently returns `undefined`

**File:** `src/db/foods.ts:87–96` and `src/db/foods.ts:51`

**Description:** `getFrequentFoods` joins `meal_foods` and fetches `last_used_grams` via a correlated subquery. `searchFoods` does NOT include this subquery, so `row.last_used_grams` is always `undefined` for search results. `rowToFoodSearchResult` maps `undefined` to `undefined`, meaning the ghost-text / last-used badge features (D-01, D-03) will never show in search results — only in the frequent foods list.

**Recommendation:** Add the same correlated subquery to `searchFoods`:
```sql
(SELECT mf2.grams FROM meal_foods mf2 WHERE mf2.food_id = f.id ORDER BY mf2.id DESC LIMIT 1) as last_used_grams
```
This is already present in `getFrequentFoods` and can be lifted to a shared SQL fragment.

---

### [info] `capitalize` function is duplicated across two files

**File:** `src/components/MealListItem.tsx:27` and `src/screens/MealLibraryScreen.tsx:30`

**Description:** An identical `capitalize(s: string): string` function is defined in both files. This is minor dead-weight duplication.

**Recommendation:** Extract to a shared `src/utils/strings.ts` (or similar) and import from both call sites.

---

### [info] `descriptionOverride` pattern uses `null` as a sentinel but `null` is a valid initial state, making the flow fragile

**File:** `src/screens/MealBuilderScreen.tsx:186–258`

**Description:** The `descriptionOverride` / `setDescriptionOverride(null)` pattern uses `null` to mean "already consumed". This works in practice because the effect runs synchronously after mount, but it couples the auto-generate effect to a side-effectful null-assignment in the middle of the effect body. A future developer adding another condition could easily break the "apply once" contract.

**Recommendation:** Use a boolean `useRef` flag (`const prefillApplied = useRef(false)`) instead of null-state to track whether the prefill has been consumed. Refs don't re-trigger effects and are clearer in intent.

---

### [info] `isSubmitDisabled` check allows negative gram values through

**File:** `src/components/FoodGramInput.tsx:95`

**Description:** `isSubmitDisabled` is `false` when `grams !== 0`. A user who types `-50` will have `grams = -50`, which is non-zero, making the submit button active. `onSubmit(-50)` would be called, producing negative macro contributions.

**Recommendation:** Change the check to `grams <= 0` (replacing `grams === 0`). This blocks zero and negative inputs simultaneously.

---

### [info] `MealLibraryScreen.loadData` is defined but only called by `refreshData`, which is only called by `handleSaved` and `handleDeleteMeal`

**File:** `src/screens/MealLibraryScreen.tsx:110–124`

**Description:** `loadData` is a `useCallback` that `refreshData` wraps with no additional logic. `refreshData` is just `async () => { await loadData(); }`. The indirection adds no value.

**Recommendation:** Remove `loadData` and inline its body directly in `refreshData` (or just call `loadData` directly at the use sites). This simplifies the dependency chain.

---

## Summary

The codebase is well-structured with consistent patterns across components. Parameterized SQL is used correctly throughout `foods.ts`, and the type system is sound. The most impactful issue is the **non-atomic two-transaction insert** in `addMealWithFoods`, which can produce orphaned data and has a race-prone ID recovery query — this should be fixed before shipping. The second-highest priority is the **`searchFoods` missing `last_used_grams`** which silently breaks a Phase 40 feature (ghost text / last-used badge) for the search path. The remaining items are quality improvements: a stale counts bug during day navigation, an uncleaned toast, an animation setState-after-unmount risk, and minor duplication/clarity issues.
