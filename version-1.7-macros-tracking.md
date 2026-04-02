# Version 1.7 — Macros Tracking

## User Vision

Rename the protein page to macros. Incorporate carbs and fat. I want it to be a user friendly intuitive interface to easily manage carbs fats and protein. For example right now an entry can be made for just protein, but I want the addition of carbs and fats. I also want the ability to track the goals for carbs and fats just like protein. The chart is a great way to visualize. What would be a great way to have multiple charts? Or a tab selector that changes the chart and different colors indicate a different macro. The user should have the ability to store meals in the meal library, maybe recipes? I don't know how recipes would incorporate yet, but easy meal library to input fat protein and carbs for a quick entry and the user has the ability to manually enter a meal with all 3 macros. The goal is to be able to track my Macros by the gram adjust for goals for carbs example I want to hit 200g of protein 75g of fat and 330g of carbs, which is roughly 2800 calories. I want to be able to see percentages of what my total calories are protein fat and carbs, and I want to be able to edit my goals if needed. Like I said it should be super intuitive, clean interface beautiful and easy to track and manage and see what my status and daily goal progression is at a glance, ease of cycling between carb protein and fat charts to view daily consumption and where my goal is.

---

## Current State Analysis

### Existing Protein Feature Architecture

The protein tracking feature is a complete, self-contained vertical slice of the app with the following components:

**Main Screen: `src/screens/ProteinScreen.tsx`**
- Header with "Protein" title
- Goal setup flow: if no goal exists, displays `GoalSetupForm` (blocks all other content)
- Once goal is set, displays: ProteinProgressBar, "Meal Library" button, QuickAddButtons, ProteinChart, Logs section with date navigation
- FAB (+) button for manual meal entry
- Toast notifications for quick-add feedback

**Components:**
- `src/components/ProteinChart.tsx` — Line chart (react-native-chart-kit) with two lines: daily intake (solid mint) and goal (dotted secondary). Time range filter: 1W/1M/3M/All. Downsamples to max 50 points.
- `src/components/ProteinProgressBar.tsx` — Progress bar card showing current/goal, percentage, 7-day average. Tap to enter inline edit mode for goal.
- `src/components/GoalSetupForm.tsx` — Single number input for daily protein goal (grams). Blocks main UI until set.
- `src/components/MealListItem.tsx` — Swipe-to-delete meal log row. Shows meal type, description, and `{proteinGrams}g`.
- `src/components/QuickAddButtons.tsx` — Horizontal scrolling pills showing recent meals: `"{description} {proteinGrams}g"`.
- `src/components/MealTypePills.tsx` — Toggle pills for breakfast/lunch/dinner/snack.

**Screens:**
- `src/screens/AddMealModal.tsx` — Bottom sheet modal: meal type (required), protein grams (required), description (optional), date/time (default: now). Edit mode pre-fills from existing meal.
- `src/screens/MealLibraryScreen.tsx` — SectionList grouped by meal type. Tap to quick-log. Swipe to delete. Add button opens AddLibraryMealModal.
- `src/screens/AddLibraryMealModal.tsx` — Bottom sheet: meal type, protein grams, name. Saves template to meal_library table.

### Database Schema

**Database:** SQLite via `react-native-sqlite-storage`, name: `gymtrack.db`
**Migration system:** `src/db/migrations.ts` — version-based, currently at v9

**meals table:**
```sql
CREATE TABLE meals (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  protein_grams REAL NOT NULL,
  description TEXT NOT NULL,
  meal_type TEXT NOT NULL,        -- 'breakfast', 'lunch', 'dinner', 'snack'
  logged_at TEXT NOT NULL,         -- YYYY-MM-DDTHH:MM:SS (local, no Z)
  local_date TEXT NOT NULL,        -- YYYY-MM-DD for day-boundary queries
  created_at TEXT NOT NULL
)
```

**protein_settings table (single-row singleton):**
```sql
CREATE TABLE protein_settings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  daily_goal_grams REAL NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
)
```

**meal_library table:**
```sql
CREATE TABLE meal_library (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  protein_grams REAL NOT NULL,
  meal_type TEXT NOT NULL,
  created_at TEXT NOT NULL
)
```

### DB Functions (`src/db/protein.ts`)

**Meal Operations:**
- `addMeal(proteinGrams, description, mealType, loggedAt?)` — requires goal to be set first
- `updateMeal(id, proteinGrams, description, mealType, loggedAt)` — recalculates local_date
- `deleteMeal(id)` — delete by ID
- `getMealsByDate(localDate)` — all meals for YYYY-MM-DD, ordered newest first

**Goal Operations:**
- `getProteinGoal()` — returns goal grams or null
- `setProteinGoal(goalGrams)` — upsert (insert if no row, update otherwise)

**Analytics:**
- `getDailyProteinTotals(startDate, endDate)` — SUM(protein_grams) grouped by local_date for charts
- `getTodayProteinTotal()` — today's sum, or 0
- `get7DayAverage()` — avg daily intake over last 7 days (only days with meals)
- `getStreakDays()` — consecutive days meeting goal counting backwards

**Library Operations:**
- `addLibraryMeal(name, proteinGrams, mealType)` — save template
- `getLibraryMealsByType()` — return Record<MealType, LibraryMeal[]>
- `deleteLibraryMeal(id)` — remove template
- `getRecentDistinctMeals(limit)` — deduped recent meals for quick-add

### Type Definitions (`src/types/index.ts`)

```typescript
type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';
const MEAL_TYPES: MealType[] = ['breakfast', 'lunch', 'dinner', 'snack'];

interface Meal {
  id: number;
  proteinGrams: number;
  description: string;
  mealType: MealType;
  loggedAt: string;     // YYYY-MM-DDTHH:MM:SS
  localDate: string;    // YYYY-MM-DD
  createdAt: string;
}

interface ProteinSettings {
  id: number;
  dailyGoalGrams: number;
  createdAt: string;
  updatedAt: string;
}

interface ProteinChartPoint {
  date: string;                  // YYYY-MM-DD
  totalProteinGrams: number;
  goalGrams: number | null;
}

interface LibraryMeal {
  id: number;
  name: string;
  proteinGrams: number;
  mealType: MealType;
  createdAt: string;
}
```

### Navigation (`src/navigation/TabNavigator.tsx`)

- 6 bottom tabs: Home, Calendar, Library, Programs, Workout, **Protein**
- Protein tab uses `ProteinStackNavigator` with: `ProteinHome` → `MealLibrary`
- Tab icon: CarrotIcon (nutrition-themed SVG)
- Types: `ProteinStackParamList = { ProteinHome: undefined; MealLibrary: undefined }`

### Design System

**Dark Mint Card palette:**
- Background: `#151718` (deep charcoal)
- Surface: `#1E2024`
- Surface Elevated: `#24272C`
- Border: `rgba(255,255,255,0.05)`
- Accent: `#8DC28A` (mint green — CTAs, active states)
- On Accent: `#1A1A1A` (dark text on mint)
- Secondary: `#8E9298` (subtitles)
- Danger: `#D9534F`

**Existing category colors (reusable for macros):**
- chest: `#E8845C`, back: `#5B9BF0`, legs: `#B57AE0`, shoulders: `#4ECDC4`, arms: `#8DC28A`, core: `#F0B830`, conditioning: `#E0697E`

### App Architecture
- React Native 0.84.1, TypeScript 5.8.3
- State management: Context API (SessionContext, TimerContext, HeartRateContext)
- Styling: StyleSheet.create() per component
- Charts: react-native-chart-kit (LineChart)
- Navigation: React Navigation v7 (bottom tabs + native stacks)

---

## Implementation Plan

### Macro Colors

Fits the existing Dark Mint Card palette with good contrast:
- **Protein:** `#8DC28A` (mint green — existing accent, preserves visual continuity)
- **Carbs:** `#5B9BF0` (blue — matches `back` category color)
- **Fat:** `#E8845C` (coral/orange — matches `chest` category color)

**Calorie math:** protein = 4 cal/g, carbs = 4 cal/g, fat = 9 cal/g

---

### Step 1: DB Migration (v10)

**File:** `src/db/migrations.ts`

Add migration v10 — six `ALTER TABLE` statements, all additive with `DEFAULT 0`:

```sql
ALTER TABLE meals ADD COLUMN carb_grams REAL NOT NULL DEFAULT 0
ALTER TABLE meals ADD COLUMN fat_grams REAL NOT NULL DEFAULT 0
ALTER TABLE meal_library ADD COLUMN carb_grams REAL NOT NULL DEFAULT 0
ALTER TABLE meal_library ADD COLUMN fat_grams REAL NOT NULL DEFAULT 0
ALTER TABLE protein_settings ADD COLUMN daily_carb_goal_grams REAL NOT NULL DEFAULT 0
ALTER TABLE protein_settings ADD COLUMN daily_fat_goal_grams REAL NOT NULL DEFAULT 0
```

No table renames — SQLite makes table renames risky (requires CREATE-copy-DROP). The TypeScript layer provides clean naming. All existing rows get DEFAULT 0 for new columns. Existing protein data remains intact.

---

### Step 2: Type System Updates

**File:** `src/types/index.ts`

- **Meal** — add `carbGrams: number`, `fatGrams: number`
- **ProteinSettings → MacroSettings** — add `dailyCarbGoalGrams: number`, `dailyFatGoalGrams: number`; keep `ProteinSettings` as type alias
- **ProteinChartPoint → MacroChartPoint** — add `totalCarbGrams`, `totalFatGrams`, `carbGoalGrams`, `fatGoalGrams`; keep alias
- **LibraryMeal** — add `carbGrams: number`, `fatGrams: number`
- **New type:** `MacroType = 'protein' | 'carbs' | 'fat'`
- **New constants:**
  ```typescript
  MACRO_COLORS: Record<MacroType, string> = { protein: '#8DC28A', carbs: '#5B9BF0', fat: '#E8845C' }
  CALORIES_PER_GRAM: Record<MacroType, number> = { protein: 4, carbs: 4, fat: 9 }
  ```

---

### Step 3: DB Functions Update

**File:** `src/db/protein.ts` (keep filename to minimize import churn)

| Function | Change |
|---|---|
| `rowToMeal` | Map `carb_grams`, `fat_grams` |
| `rowToProteinSettings` → `rowToMacroSettings` | Map new goal columns |
| `rowToLibraryMeal` | Map `carb_grams`, `fat_grams` |
| `addMeal` | Add `carbGrams=0`, `fatGrams=0` params; update INSERT |
| `updateMeal` | Add `carbGrams`, `fatGrams` params; update SET clause |
| `getProteinGoal` → `getMacroGoals` | Return `{ protein, carbs, fat } \| null` |
| `setProteinGoal` → `setMacroGoals` | Accept/store all 3 goals |
| `getDailyProteinTotals` → `getDailyMacroTotals` | SUM all 3 macros; return `MacroChartPoint[]` |
| `getTodayProteinTotal` → `getTodayMacroTotals` | Return `{ protein, carbs, fat }` |
| `get7DayAverage` | Return `{ protein, carbs, fat }` (each nullable) |
| `getRecentDistinctMeals` | Include carbs/fat in SELECT and GROUP BY |
| `addLibraryMeal` | Add `carbGrams=0`, `fatGrams=0` params |

Keep old function names as backward-compat wrappers where possible.

**File:** `src/db/index.ts` — export new function names alongside old ones.

---

### Step 4: GoalSetupForm (Multi-Macro)

**File:** `src/components/GoalSetupForm.tsx`

- Title: "Set your daily macro goals"
- Subtitle: "Set targets for each macronutrient"
- Three input fields with colored left-accent indicators (P mint, C blue, F coral)
- Live "Estimated daily calories" display below inputs: `(P*4)+(C*4)+(F*9)` kcal
- Single "Set Goals" button calling `setMacroGoals`
- Validation: each field must be > 0
- Props: `onGoalSet: (goals: { protein: number; carbs: number; fat: number }) => void`

---

### Step 5: MacroProgressBar (replaces ProteinProgressBar)

**File:** `src/components/ProteinProgressBar.tsx` → rename to `MacroProgressBar.tsx`

**Design — three stacked progress bars + calorie summary:**

```
DAILY MACRO GOALS
┌──────────────────────────────────────────────┐
│ P ████████████░░░░░░░░  75%   150g / 200g    │
│ C █████████░░░░░░░░░░░  55%   182g / 330g    │
│ F ██████████████░░░░░░  85%    64g /  75g    │
│ ──────────────────────────────────────────── │
│ 1,876 kcal  •  32% P  •  39% C  •  29% F    │
│ ──────────────────────────────────────────── │
│ 7-day avg: 155g P  •  310g C  •  72g F       │
└──────────────────────────────────────────────┘
```

- Each bar uses its macro color fill against `#33373D` track
- Small colored circle with letter [P][C][F] as label
- Tap card → edit mode with 3 labeled inputs + Save/Cancel
- If a macro goal is 0 (unset), show "Tap to set" instead of progress bar
- Calorie percentages computed as display-only (never stored in DB)

**Props:** `goals`, `current`, `average` (all `{ protein, carbs, fat }`), `onGoalChanged`

---

### Step 6: MacroChart (replaces ProteinChart)

**File:** `src/components/ProteinChart.tsx` → rename to `MacroChart.tsx`

**Design — macro tab selector above chart:**

```
[Protein] [Carbs] [Fat]       ← macro selector pills
┌─────────────────────────────┐
│ Legend: ── DAILY  ○ GOAL    │
│ (line chart in macro color) │
└─────────────────────────────┘
[1W] [1M] [3M] [All]         ← time range filter
```

- **Macro selector:** Three pill buttons above the chart card
  - Active pill: filled with macro color background, dark text (`onAccent`)
  - Inactive pill: `surfaceElevated` background, `secondary` text
- Chart line + dots change color to match selected macro
- Goal line uses `secondary` color (consistent with current)
- **Data fetched once** per time range change (`getDailyMacroTotals`), memo selects appropriate macro field — no extra DB call on macro tab switch, instant re-render
- Same downsample logic (max 50 points), same label logic

**State:** `selectedMacro: MacroType` (default 'protein'), `selectedRange: TimeRange` (default '1W')

**Props:** `goals: { protein, carbs, fat }`, `refreshKey`

---

### Step 7: AddMealModal (3-Macro Input)

**File:** `src/screens/AddMealModal.tsx`

- Replace single "Protein (grams)" field with a **horizontal row of 3 inputs**:
  ```
  Protein (g)    Carbs (g)     Fat (g)
  [  30  ]       [  45  ]      [  12  ]
  ```
- Each input has a subtle colored underline/border matching its macro color
- Show live calorie preview below the row: `"= 372 kcal"`
- Validation: at least one macro must be > 0 (not all required — a carb-only snack is valid)
- Pre-fill all 3 fields in edit mode from `editMeal.carbGrams` and `editMeal.fatGrams`
- Pass all 3 to `addMeal` / `updateMeal`

---

### Step 8: AddLibraryMealModal (3-Macro Input)

**File:** `src/screens/AddLibraryMealModal.tsx`

Same pattern as Step 7 — add carbs/fat inputs in horizontal row, pass to `addLibraryMeal`.

---

### Step 9: MealListItem Display Update

**File:** `src/components/MealListItem.tsx`

Change right-side display from `{proteinGrams}g` to compact colored macro badges:

```
[✓] Lunch:              30P  45C  12F
     Chicken & Rice
```

- `30P` in mint, `45C` in blue, `12F` in coral (small font)
- Only show macros that are > 0 (avoids clutter for protein-only historical entries)

---

### Step 10: QuickAddButtons Display Update

**File:** `src/components/QuickAddButtons.tsx`

- Update pill text: `"Chicken 30P 45C 12F"` instead of `"Chicken 30g"`
- Only show non-zero macros in pill text
- Update props/data types to include all 3 macros

---

### Step 11: MealLibraryScreen Update

**File:** `src/screens/MealLibraryScreen.tsx`

- `LibraryMealRow` right side: colored macro badges instead of single `{proteinGrams}g`
- `handleTapMeal`: pass all 3 macros from library meal to `addMeal`
- Toast message: `"{name} logged"` (simpler than listing all macros)

---

### Step 12: MacrosScreen (Main Screen)

**File:** `src/screens/ProteinScreen.tsx` → rename to `MacrosScreen.tsx`

Key changes:
- Title: `"Macros"` instead of `"Protein"`
- State changes:
  - `goal: number | null` → `goals: { protein: number; carbs: number; fat: number } | null`
  - `todayTotal: number` → `todayTotals: { protein: number; carbs: number; fat: number }`
  - `average: number | null` → `averages: { protein: number | null; carbs: number | null; fat: number | null }`
  - `recentMeals` type updated to include all 3 macros
- Use `getMacroGoals()`, `getTodayMacroTotals()`, updated `get7DayAverage()`
- Wire up `<MacroProgressBar>`, `<MacroChart>`, updated `<QuickAddButtons>`
- Update `handleQuickAdd` to pass all 3 macros to `addMeal`
- **Existing user handling:** If goals row exists with protein > 0 but carbs/fat = 0, show the main screen normally — protein bar works, carbs/fat bars show "Tap to set goal" prompt. Do NOT force the full GoalSetupForm. Only show GoalSetupForm when no settings row exists at all.

---

### Step 13: Navigation Rename

**File:** `src/navigation/TabNavigator.tsx`

- `ProteinTab` → `MacrosTab` in `TabParamList`
- `ProteinStackParamList` → `MacrosStackParamList`
- `ProteinHome` → `MacrosHome`
- `ProteinStackNavigator` → `MacrosStackNavigator`
- Tab label: `"Macros"` (keep CarrotIcon — still nutrition-themed)
- Import `MacrosScreen` instead of `ProteinScreen`

---

### Step 14: Test Updates

Update test files alongside their component changes:
- `src/db/__tests__/protein.mapper.test.ts` — add carb/fat fields to row fixtures and expected output
- `src/db/__tests__/protein.test.ts` — update mock SQL and assertions for 3-macro functions
- Component test files — update props/mock data for new shapes
- Screen test — update title assertion ("Macros"), mock goal shape

---

### Step 15: Cleanup

- Delete old `ProteinScreen.tsx`, `ProteinProgressBar.tsx`, `ProteinChart.tsx` if renamed copies exist
- Remove backward-compat function aliases once all callers are updated
- Update `src/db/index.ts` exports to final state

---

## Files Modified (Complete List)

| File | Change Type |
|---|---|
| `src/db/migrations.ts` | Add v10 migration |
| `src/types/index.ts` | Expand types, add MacroType, constants |
| `src/db/protein.ts` | Expand all functions for 3 macros |
| `src/db/index.ts` | Update exports |
| `src/components/GoalSetupForm.tsx` | 3-macro input |
| `src/components/ProteinProgressBar.tsx` → `MacroProgressBar.tsx` | 3-bar + calorie summary |
| `src/components/ProteinChart.tsx` → `MacroChart.tsx` | Macro tab selector + per-macro chart |
| `src/components/MealListItem.tsx` | Colored macro badges |
| `src/components/QuickAddButtons.tsx` | 3-macro pill text |
| `src/screens/AddMealModal.tsx` | 3-macro horizontal inputs |
| `src/screens/AddLibraryMealModal.tsx` | 3-macro horizontal inputs |
| `src/screens/MealLibraryScreen.tsx` | Multi-macro display + logging |
| `src/screens/ProteinScreen.tsx` → `MacrosScreen.tsx` | Full rewrite for 3-macro state |
| `src/navigation/TabNavigator.tsx` | Rename tab, stack, imports |
| `src/theme/colors.ts` | Add `macroProtein`, `macroCarbs`, `macroFat` colors |
| Test files | Update fixtures and assertions |

---

## Key Design Decisions

1. **No SQLite table renames** — too risky (CREATE-copy-DROP). TypeScript layer provides clean names.
2. **Keep `src/db/protein.ts` filename** — minimizes import churn across the codebase.
3. **Calories are display-only** — never stored in DB, always computed: `(P*4)+(C*4)+(F*9)`. Avoids sync issues.
4. **Existing user upgrade path** — migration adds DEFAULT 0 columns. Users with protein goal see main screen with protein working, carbs/fat bars showing "tap to set." No forced re-setup.
5. **At least one macro > 0 for meal entry** — carb-only snacks (fruit, rice) are valid entries.
6. **Chart fetches all macros once** — switching macro tabs is instant (memo recalculation, no DB call).
7. **Only show non-zero macros in compact displays** — avoids clutter for historical protein-only entries.

---

## Verification Plan

1. **Fresh install**: App creates DB with v10 schema, GoalSetupForm shows 3 inputs, goals save correctly
2. **Upgrade path**: Existing user with protein data — migration adds columns, protein bar shows correctly, carbs/fat show "tap to set"
3. **Meal entry**: Add meal with all 3 macros, verify DB row, verify list display with colored badges
4. **Meal edit**: Edit existing protein-only meal, add carbs/fat, verify update
5. **Chart**: Switch between Protein/Carbs/Fat tabs, verify different colored lines + correct goal lines
6. **Library**: Add library meal with 3 macros, tap to log, verify all 3 recorded
7. **Quick add**: Recent templates show all macros, tap logs all 3
8. **Calories**: Verify `(P*4)+(C*4)+(F*9)` displayed correctly in progress bar and modal
9. **Goal edit**: Tap progress bar, change goals, verify persistence
10. **Run test suite**: `npx jest --passWithNoTests`
