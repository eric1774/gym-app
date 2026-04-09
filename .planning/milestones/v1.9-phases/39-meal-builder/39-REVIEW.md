---
status: issues_found
files_reviewed: 10
findings:
  critical: 1
  warning: 3
  info: 3
  total: 7
reviewed_by: code-review-agent
reviewed_at: 2026-04-08
phase: 39-meal-builder
plans_reviewed: [39-01, 39-02, 39-03]
---

# Phase 39 Code Review: Meal Builder

## Scope

Reviewed 10 source files implementing the multi-food meal builder feature: type
definitions, DB layer (addMealWithFoods, getMealFoods, migrations v12/v13), three
UI components (MealFoodCard, MealTotalsBar, FoodGramInput), MealBuilderScreen
assembly, navigation wiring, and AddMealModal entry point.

---

## What Was Done Well

- **Type design is clean and well-separated.** MealFood (output) vs MealFoodInput
  (input) makes the data flow explicit. Fields match the DB schema 1:1 with proper
  camelCase mapping.

- **Parameterized queries throughout.** All SQL in `addMealWithFoods`, `getMealFoods`,
  `searchFoods`, and `getFrequentFoods` uses `?` placeholders. No string
  interpolation of user input into SQL.

- **Component decomposition is excellent.** MealFoodCard, MealTotalsBar, and
  FoodGramInput are well-isolated with clear prop interfaces. MealBuilderScreen
  acts purely as an orchestrator, which is exactly the right separation.

- **MealFoodCard memoization.** Wrapping in `React.memo` prevents unnecessary
  re-renders of food cards when sibling state changes.

- **FoodGramInput animation.** The slide-up/down animation with `shouldRender`
  lifecycle tracking avoids rendering the component tree when hidden while still
  allowing the exit animation to complete.

- **Computed values use `useMemo` correctly.** Per-food macro computation and
  running totals are properly memoized on the `foods` dependency in
  MealBuilderScreen.

- **Test coverage for rowToMealFood mapper** covers the three specified cases
  (full row, high-carb, zero macros) with numeric precision assertions.

- **Migration v12 handles both fresh and upgrade paths** with CREATE TABLE IF NOT
  EXISTS + ALTER TABLE with error suppression.

- **Accessibility.** MealFoodCard remove button has `accessibilityLabel` and 44px
  minimum touch targets.

---

## Findings

### CRITICAL-01: addMealWithFoods uses two separate transactions -- not atomic

**File:** `src/db/foods.ts` lines 269-294

The plan (39-01-PLAN.md) states: "Log a multi-food meal in a single transaction"
and "Transaction guarantees atomicity of meals + meal_foods writes."

The implementation uses three separate database operations:
1. Transaction 1: INSERT INTO meals (line 269)
2. Standalone query: SELECT id FROM meals WHERE ... (line 277)
3. Transaction 2: INSERT INTO meal_foods (line 285)

If the app crashes or the process is killed between transaction 1 and transaction 2,
the database will contain a meals row with no corresponding meal_foods rows. This
is an orphaned meal -- it would display in MacrosView with correct summed macros
(since the meals row has the totals) but would have no food breakdown if
getMealFoods is ever called for it.

The meal ID retrieval between transactions is also fragile. It queries by
`logged_at` and `created_at` with ORDER BY id DESC LIMIT 1. In the unlikely event
of two meals logged at the exact same second, this could return the wrong ID.

**Recommendation:** Consolidate into a single transaction. The `runTransaction`
wrapper calls `database.transaction(work)`, and within that callback `tx.executeSql`
can accept a success callback that receives the ResultSet with `insertId`. Rewrite
as:

```typescript
let mealId = 0;
await runTransaction(database, (tx) => {
  tx.executeSql(
    'INSERT INTO meals (...) VALUES (...)',
    [...params],
    (_tx, result) => {
      mealId = result.insertId;
      for (const f of foodRows) {
        _tx.executeSql(
          'INSERT INTO meal_foods (...) VALUES (...)',
          [mealId, ...params],
        );
      }
    },
  );
});
return mealId;
```

If the library's Transaction type does not expose insertId in the success callback,
an alternative is to use `SELECT last_insert_rowid()` inside the same transaction.

The plan's own notes acknowledge this: "IMPORTANT: Check if runTransaction callback
has access to tx.executeSql return values." The executor chose the two-transaction
approach as a fallback, but the `database.ts` wrapper uses `database.transaction()`
which does support success callbacks with ResultSet in the react-native-sqlite-storage
library.

**Severity:** Critical -- violates the stated atomicity guarantee. In practice,
the failure window is very small (milliseconds between local SQLite transactions),
but the plan explicitly required single-transaction atomicity.

---

### WARNING-01: Migration v13 is redundant with v12

**File:** `src/db/migrations.ts` lines 392-406

Migration v12 already includes both `CREATE TABLE IF NOT EXISTS meal_foods` (with
food_name) AND `ALTER TABLE meal_foods ADD COLUMN food_name` (with error
suppression). Migration v13 then does the exact same ALTER again.

For existing installs that had the table from Phase 37 without food_name:
- v12 CREATE TABLE is a no-op (table exists), but the ALTER succeeds and adds food_name
- v13 ALTER attempts the same thing, gets "duplicate column" error, suppressed

For fresh installs:
- v12 CREATE creates the table with food_name, ALTER gets suppressed
- v13 ALTER gets suppressed

v13 is dead code in all paths. It was presumably added as a safety net, but it
creates confusion about what each migration is responsible for. The description
"Add food_name column to meal_foods (missing from Phase 37 schema)" duplicates
v12's description.

**Recommendation:** This is harmless in production (the error callback swallows it),
but the migration should have a comment explaining it is intentionally a no-op
safety net, or it should be removed if it was added in error. Not a blocker.

---

### WARNING-02: Duplicated date/time utility functions

**File:** `src/screens/MealBuilderScreen.tsx` lines 41-71

Four utility functions (`formatDateForInput`, `formatTimeForInput`, `parseDate`,
`parseTime`) are copy-pasted from `AddMealModal.tsx`. This violates DRY and means
any bug fix must be applied in two places.

The plan (39-03-PLAN.md) explicitly acknowledged this: "Reuse the same pattern from
AddMealModal: formatDateForInput, formatTimeForInput -- copy these utility functions
(they are local to AddMealModal, not exported)." The plan chose duplication
intentionally, so this is a plan limitation rather than an implementation deviation.

**Recommendation:** Extract these into a shared utility (e.g.,
`src/utils/dateFormatting.ts`) in a follow-up refactoring pass. Not blocking for
Phase 39.

---

### WARNING-03: renderItem closure captures `computedFoods` in dependencies unnecessarily

**File:** `src/screens/MealBuilderScreen.tsx` line 382

```typescript
const renderItem = useCallback(({ item, index }) => (
  <MealFoodCard ... />
), [computedFoods, handleRemoveFood, handleEditFood]);
```

The `computedFoods` dependency is listed but `item` is already the data from
FlatList's `data` prop. Including `computedFoods` in the dependency array causes
the `renderItem` callback to be recreated on every food list change, which defeats
the purpose of `useCallback` since the callback only uses `item` (from FlatList)
and the handler functions. The `handleRemoveFood` and `handleEditFood` are stable
(no deps on `foods`... actually `handleEditFood` depends on `foods`), so this is
partially justified, but `computedFoods` itself is not referenced in the callback
body.

**Recommendation:** Remove `computedFoods` from the dependency array. The `item`
parameter already provides the data. Keep `handleRemoveFood` and `handleEditFood`
as dependencies since they are used in the callback.

---

### INFO-01: meal_foods table lacks an index on meal_id

**File:** `src/db/migrations.ts` (migration v12)

The `getMealFoods` query filters by `meal_id`. For tables with many rows, a
covering index on `meal_id` would improve query performance:
```sql
CREATE INDEX IF NOT EXISTS idx_meal_foods_meal_id ON meal_foods(meal_id);
```

For a personal fitness app where meal_foods will have hundreds to low thousands of
rows, SQLite will handle this fine without an index. This is a minor optimization
for future consideration.

---

### INFO-02: No index on meal_foods.food_id for searchFoods frequency boost

**File:** `src/db/foods.ts` lines 86-95

The `searchFoods` function joins on `meal_foods.food_id` to compute usage_count.
The `getFrequentFoods` function also joins on `food_id`. Neither query has an index
on `meal_foods.food_id`.

Same assessment as INFO-01: acceptable for current scale, but worth noting for
future performance work.

---

### INFO-03: FoodGramInput does not restrict negative numeric input

**File:** `src/components/FoodGramInput.tsx` line 92

The submit is disabled when `grams === 0`, but `parseFloat` of a negative number
string would produce a negative value. With `keyboardType="numeric"`, most mobile
keyboards do not show a minus key, so this is practically unreachable. However,
users could paste a negative value.

The downstream `addMealWithFoods` does not validate that grams is positive -- it
only checks that the foods array is non-empty. Negative grams would produce
negative macro snapshots.

**Recommendation:** Add `grams <= 0` to the submit-disabled check (currently just
`grams === 0`), or clamp to zero in the handler. Low risk since the numeric
keyboard makes this nearly impossible to trigger.

---

## Plan Alignment Summary

| Plan | Alignment | Notes |
|------|-----------|-------|
| 39-01 (DB layer) | Partial deviation | Two-transaction approach deviates from stated single-transaction requirement. Types, mapper, and getMealFoods match plan exactly. |
| 39-02 (UI components) | Fully aligned | MealFoodCard, MealTotalsBar, FoodGramInput all match UI-SPEC layout and prop interfaces. Design tokens used correctly. |
| 39-03 (Assembly) | Fully aligned | MealBuilderScreen state management, food flows, navigation wiring, AddMealModal entry point all match plan specification. |

## Verdict

The implementation is well-structured and delivers the intended feature. The
critical finding (non-atomic transaction) should be addressed because the plan
explicitly required atomicity and the underlying library supports it. The warnings
are non-blocking quality items suitable for a follow-up pass.
