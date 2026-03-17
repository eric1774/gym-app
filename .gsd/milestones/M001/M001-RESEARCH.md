# Project Research Summary

**Project:** GymTrack v1.1 -- Protein Tracking
**Domain:** Nutrition tracking feature added to an existing React Native gym workout app
**Researched:** 2026-03-07
**Confidence:** HIGH

## Executive Summary

GymTrack v1.1 adds protein intake tracking to an existing, well-structured React Native workout app that uses SQLite for local-only storage, react-native-chart-kit for visualization, and bottom-tab navigation with four existing tabs. The research conclusively shows that **zero new npm dependencies are needed**. Every required capability -- charting, database, modals, navigation, animation -- is already present in the codebase. The protein feature is an architecturally independent domain (no foreign keys to workout tables) that slots into the existing patterns: a new bottom tab, a new DB repository file, two new SQLite tables, and UI components that follow established modal and screen conventions.

The recommended approach is to extend every existing pattern without introducing new ones. The data layer comes first (schema, types, repository), then the UI (tab, progress bar, meal logging), then the chart. This order is dictated by hard dependencies: nothing renders without the data layer, the progress bar needs the goal setting, meal logging needs the progress bar for feedback, and the chart needs accumulated meal data to display. The feature set for v1.1 launch includes 8 table-stakes capabilities (goal setting, progress bar, add/edit/delete meals, meal list, line chart with time filters) plus the new tab itself. Differentiators like quick-add buttons and streak indicators are deferred to v1.1.x patches.

The top risks are: (1) the lack of a schema migration system -- the current try/catch ALTER TABLE pattern will break when protein tables are added alongside future schema changes; (2) timezone-incorrect daily aggregation if meals are grouped by UTC boundaries instead of local dates; and (3) chart performance degradation with growing data due to react-native-chart-kit's known Math.random() key bug. All three have clear, well-documented prevention strategies that must be implemented in their respective phases, not bolted on later.

## Key Findings

### Recommended Stack

No new packages. The existing stack covers all protein tracking needs. This is an unusually clean situation -- the codebase already has charting (react-native-chart-kit), database (react-native-sqlite-storage), SVG icons (react-native-svg), and tab navigation (@react-navigation/bottom-tabs). The protein feature reuses each of these with only configuration-level changes.

**Core technologies (all existing, reused):**
- **react-native-chart-kit** (6.12.0): Line chart for protein intake history -- same LineChart component already used in ExerciseProgressScreen
- **react-native-sqlite-storage** (6.0.1): Two new tables (meals, protein_settings) in the existing gymtrack.db database
- **React Native built-in Animated API**: Progress bar fill animation -- no need for react-native-reanimated for a single horizontal bar
- **React Native built-in Modal**: Add Meal bottom sheet modal -- follows the existing AddExerciseModal pattern exactly
- **Native JavaScript Date**: Date boundaries and time filtering -- consistent with 35 existing usages across 10 files

**Explicitly rejected:** react-native-gifted-charts (duplicate charting lib), react-native-progress (overkill for one bar), date-fns/day.js (splits date paradigm), AsyncStorage (second persistence layer), react-native-reanimated (heavy for simple animation).

### Expected Features

**Must have (table stakes, v1.1.0 launch):**
- Configurable daily protein goal in grams (default 200g)
- Daily progress bar showing consumed vs. goal
- Add Meal modal with protein grams (required) and description (optional)
- Today's meal list with timestamps, sorted newest-first
- Edit meal (tap to open modal pre-filled)
- Delete meal with confirmation dialog
- Protein intake line chart (daily totals over time)
- Time range filter for chart (Day/Week/Month)
- Midnight auto-reset (query-time, not a scheduled job)

**Should have (differentiators, v1.1.x patches):**
- Quick-add buttons for frequent meals (single-tap logging)
- Goal streak indicator (consecutive days hitting target)
- Goal line overlay on the history chart
- Weekly average display
- Protein data included in JSON/CSV export

**Defer (v2+ or never):**
- Full macro tracking (carbs, fats, calories) -- scope explosion, contradicts protein-only positioning
- Food database / barcode scanning -- requires internet or massive offline DB
- AI photo meal logging -- requires cloud services, violates offline constraint
- Push notification reminders -- infrastructure overhead, #1 cause of uninstalls when done poorly
- Social sharing -- explicitly out of scope per PROJECT.md

### Architecture Approach

The protein feature is an isolated domain that plugs into the existing architecture at four integration points: TabNavigator (new 5th tab), schema.ts/database.ts (two new tables), types/index.ts (three new interfaces), and dashboard.ts (export extension). All state is screen-local using useState + useFocusEffect -- no ProteinContext needed because protein data is consumed by a single screen. The meals table has no foreign keys to any workout table. This isolation is correct and deliberate.

**Major components:**
1. **src/db/protein.ts** -- Repository with 8 functions: addMeal, updateMeal, deleteMeal, getTodayMeals, getProteinSettings, updateProteinGoal, getProteinChartData, getAllMeals
2. **src/screens/ProteinScreen.tsx** -- Main tab screen containing progress bar, meal list, and chart; orchestrates all data loading via useFocusEffect
3. **src/screens/AddMealModal.tsx** -- Bottom sheet modal for add/edit (single component with optional editMeal prop, matching AddExerciseModal pattern)
4. **src/components/ProteinProgressBar.tsx** -- Horizontal animated progress bar, ~30 lines, View + Animated
5. **src/components/ProteinChart.tsx** -- LineChart wrapper with time range filter pills
6. **src/components/MealListItem.tsx** -- Single meal row (grams, description, time, tap-to-edit)

### Critical Pitfalls

1. **No schema migration versioning** -- The existing try/catch ALTER TABLE pattern does not scale. Implement a versioned migration system (ordered array of migrations, stored version number) BEFORE adding protein tables. Recovery cost is HIGH if skipped.

2. **UTC timestamps for daily aggregation** -- Storing only UTC breaks "today's meals" for users outside UTC. Add a `local_date TEXT` column (YYYY-MM-DD, computed at insert time in local timezone) to the meals table and use it for all daily queries and chart grouping. This must be in the initial schema, not added retroactively.

3. **Chart performance with large datasets** -- react-native-chart-kit uses Math.random() for React keys, causing full re-renders. Downsample to max ~60 data points, disable dots above 10-15 points, and strip inner/outer lines and shadows. Implement this from the start in Phase 3.

4. **Add Meal modal friction** -- Meal logging happens 3-6x daily; it must be faster than workout logging. Protein grams field auto-focuses with numeric keyboard, description is optional and below, confirm button stays above keyboard. Target: under 3 seconds from tap to saved.

5. **Midnight reset edge case** -- useFocusEffect does not fire while the screen is visible at midnight. Add a 60-second interval check that compares current local date against last-queried date and refetches if changed.

## Implications for Roadmap

Based on research, suggested phase structure:

### Phase 1: Schema, Types, and Data Layer
**Rationale:** Every other phase depends on the data layer existing. The migration system must be built before any new tables to prevent the #1 critical pitfall. This phase has zero UI -- it is pure infrastructure.
**Delivers:** Versioned migration system, meals table (with local_date column), protein_settings table (single-row pattern), Meal/ProteinSettings/ProteinDayTotal types, protein.ts repository with all 8 CRUD/query functions, index on logged_at and local_date, data export extension.
**Addresses features:** Midnight auto-reset (via local_date), data export integration.
**Avoids pitfalls:** Schema migration versioning (#1), UTC daily aggregation (#2), missing data in export.

### Phase 2: Protein Tab, Progress Bar, and Meal Logging
**Rationale:** With the data layer complete, the core user-facing feature can be built. The tab, progress bar, and meal logging form a tight loop (add meal -> see progress) that must be designed together. This is the largest UI phase and the one where UX pitfalls (#4 modal friction, #5 midnight reset) must be addressed.
**Delivers:** 5th bottom tab with CarrotIcon, ProteinScreen with goal display and progress bar, ProteinGoalModal for setting daily target, AddMealModal (add + edit modes), MealListItem with tap-to-edit and delete, today's meal FlatList, animated progress bar fill, 60-second midnight date check.
**Addresses features:** All P1 table-stakes features except chart.
**Avoids pitfalls:** Modal friction (#4), midnight reset (#5), tab navigator crowding, inconsistent styling.

### Phase 3: Protein Intake Chart and History
**Rationale:** The chart depends on having meal data (which Phase 2 enables). It also has its own performance concerns (pitfall #3) that require careful data downsampling. Separating this allows Phase 2 to ship a functional protein tracker while the chart is built and performance-tested.
**Delivers:** ProteinChart component using react-native-chart-kit LineChart, time range filter pills (1W/1M/3M/All), SQL aggregation queries (daily/weekly/monthly), data downsampling to max 60 points, dot suppression above 15 points, goal line overlay (SVG absolute positioned).
**Addresses features:** Protein intake line chart, time range filter, goal line on chart.
**Avoids pitfalls:** Chart performance collapse (#3).

### Phase 4: Polish and Differentiators
**Rationale:** Quick-add buttons, streak indicator, and weekly average are low-complexity differentiators that enhance the core feature but are not required for launch. They depend on the full v1.1 feature being stable and in use.
**Delivers:** Quick-add pill buttons for frequent meals (new protein_quick_adds table), goal streak indicator (computed on read, no new table), weekly average stat below progress bar.
**Addresses features:** All P2 differentiator features.
**Avoids pitfalls:** None specific -- standard patterns apply.

### Phase Ordering Rationale

- **Data before UI:** The migration system and table schema must exist before any screen code references the repository. This is a hard dependency, not a preference.
- **Core loop before visualization:** The progress bar + meal logging loop is the product's primary value. The chart is secondary -- users can track daily protein without a chart, but not without the ability to log and see progress.
- **Chart separated from core UI:** The chart has its own performance concerns and can be developed and tested independently. Separating it de-risks Phase 2 delivery.
- **Differentiators last:** Quick-add and streaks are retention features that add value only after the core logging habit is established. Building them before the core is polished wastes effort.

### Research Flags

Phases likely needing deeper research during planning:
- **Phase 1:** The migration system design needs careful implementation. The PITFALLS.md documents an Android-specific issue where reading PRAGMA user_version can return errors -- use a schema_version table instead. Consider running `/gsd:research-phase` to validate the migration pattern on both platforms.

Phases with standard patterns (skip research-phase):
- **Phase 2:** All UI follows existing modal, screen, and navigation patterns already in the codebase. No novel integration required.
- **Phase 3:** The chart reuses react-native-chart-kit LineChart with the same config as ExerciseProgressScreen. Downsampling is straightforward SQL + JS array slicing.
- **Phase 4:** Quick-add buttons are a new table + horizontal ScrollView of TouchableOpacity pills. Streak is a pure SQL query. Both are well-documented patterns.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | All technologies are already installed and working in the codebase. Zero new dependencies. Verified by direct codebase analysis. |
| Features | HIGH | Feature set validated against 4 competitor apps (Proto, Protein Pal, DailyProtein, MacroFactor) and academic research on nutrition app usability. Clear consensus on table stakes. |
| Architecture | HIGH | Architecture is a direct extension of existing patterns. Every proposed component follows a concrete existing precedent in the codebase (same modal pattern, same db pattern, same chart pattern). |
| Pitfalls | HIGH | Critical pitfalls sourced from library issue trackers (react-native-chart-kit #132), community discussions (react-native-sqlite-storage #157), and published research on nutrition app abandonment. |

**Overall confidence:** HIGH

### Gaps to Address

- **Migration system implementation details:** The PITFALLS.md flags an Android-specific issue with PRAGMA user_version reads. During Phase 1 planning, validate whether the schema_version table approach works reliably on the minimum supported Android API level (26).
- **5-tab navigator on small screens:** The move from 4 to 5 bottom tabs may require label font size reduction or icon-only mode on devices under 5 inches. Verify during Phase 2 implementation on smallest target device.
- **react-native-chart-kit long-term viability:** The library has not been updated in ~4 years. It works today with RN 0.84.1, but a future React Native upgrade could break it. This is not a v1.1 concern but should be tracked as tech debt. If a migration becomes necessary, react-native-gifted-charts is the recommended replacement.
- **Chart goal line overlay precision:** The SVG Line overlay for the goal reference line requires computing the Y-axis pixel position from the goal value relative to chart scale. react-native-chart-kit does not expose chart dimensions or scale via props, so this may require measuring the chart container and computing the position manually. Validate feasibility during Phase 3.

## Sources

### Primary (HIGH confidence)
- Existing GymTrack codebase (direct file analysis): package.json, ExerciseProgressScreen.tsx, AddExerciseModal.tsx, TabNavigator.tsx, database.ts, schema.ts, dashboard.ts, sessions.ts, types/index.ts, theme/colors.ts
- [SQLite Date and Time Functions](https://sqlite.org/lang_datefunc.html) -- UTC handling and localtime modifier behavior
- [react-native-chart-kit Issue #132](https://github.com/indiespirit/react-native-chart-kit/issues/132) -- Math.random() key performance bug documentation

### Secondary (MEDIUM confidence)
- [Proto, Protein Pal, DailyProtein competitor analysis](https://www.stride-fuel.com/articles/protein-tracker-app) -- feature landscape validation
- [A React Native SQLite Database Upgrade Strategy](https://embusinessproducts.com/react-native-sqlite-database-upgrade-strategy) -- migration pattern reference
- [react-native-sqlite-storage Issue #157](https://github.com/andpor/react-native-sqlite-storage/issues/157) -- Android PRAGMA user_version read bug
- [PMC: User Perspectives of Diet-Tracking Apps](https://pmc.ncbi.nlm.nih.gov/articles/PMC8103297/) -- nutrition app usability research
- [PubMed: Food logging app usability challenges](https://pubmed.ncbi.nlm.nih.gov/30184514/) -- 18% food item omission rate due to entry friction

### Tertiary (LOW confidence)
- [Top Charting Solutions for React Native 2025](https://itnext.io/react-native-echarts-victory-native-or-react-native-chart-kit-deciphering-the-ideal-charting-90cbd22b0da3) -- chart library comparison (used for migration planning, not current decisions)

---
*Research completed: 2026-03-07*
*Ready for roadmap: yes*

# Architecture Patterns

**Domain:** Protein tracking features integrated into existing React Native gym tracking app
**Researched:** 2026-03-07

## Existing Architecture Summary

Before designing the protein tracking integration, here is the current architecture that the new feature must fit into:

| Layer | Current Pattern | Key Files |
|-------|----------------|-----------|
| **Database** | SQLite via `react-native-sqlite-storage`, singleton promise pattern, `executeSql` helper | `src/db/database.ts`, `src/db/schema.ts` |
| **DB Repositories** | One file per domain (`exercises.ts`, `sessions.ts`, `programs.ts`, `dashboard.ts`), each imports `db`/`executeSql` | `src/db/` |
| **Types** | All domain types in single `src/types/index.ts`, camelCase interfaces mapped from snake_case SQL | `src/types/index.ts` |
| **State Management** | React Context for active session state (`SessionContext`), screen-local `useState` for everything else, `useFocusEffect` for data refresh on tab/screen focus | `src/context/SessionContext.tsx` |
| **Navigation** | Bottom tab navigator (4 tabs: Home, Library, Programs, Workout) with nested stack navigators per tab | `src/navigation/TabNavigator.tsx` |
| **UI Components** | Screens in `src/screens/`, reusable components in `src/components/`, modals are `Modal` components with transparent overlay + bottom sheet pattern | `src/screens/`, `src/components/` |
| **Charting** | `react-native-chart-kit` `LineChart` already used for exercise progress | `ExerciseProgressScreen.tsx` |
| **Init Flow** | `App.tsx` calls `initDatabase()`, gates rendering on `dbReady`, wraps tree in `SessionProvider > TimerProvider > RootNavigator` | `App.tsx` |

## Recommended Architecture

### Principle: Extend the Existing Patterns, Do Not Introduce New Ones

The protein tracking feature should follow every established pattern exactly. No new state management libraries, no new ORM layer, no architectural innovation. The codebase is small, consistent, and well-structured. Match it.

### New Database Tables

Two new tables, defined as `CREATE TABLE IF NOT EXISTS` statements in `src/db/schema.ts`, following the exact same convention as existing tables:

```sql
-- Stores the user's daily protein goal. Single-row table (settings pattern).
CREATE TABLE IF NOT EXISTS protein_settings (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  daily_goal_grams INTEGER NOT NULL DEFAULT 200
)

-- Stores individual meal entries with protein amounts.
CREATE TABLE IF NOT EXISTS meals (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  protein_grams REAL NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  logged_at TEXT NOT NULL,
  created_at TEXT NOT NULL
)
```

**Design decisions:**

- `protein_settings` uses `CHECK (id = 1)` to enforce a single-row settings pattern. This avoids the complexity of a generic key-value settings table while remaining extensible (add columns for future settings like carbs, calories).
- `meals.protein_grams` is `REAL` not `INTEGER` because fractional grams are common (e.g., 12.5g from a food label).
- `meals.logged_at` is the meal's date/time (user may want to log a meal from earlier today). `created_at` is the row creation timestamp (for audit/debugging).
- No foreign keys to any existing tables. Protein tracking is a completely independent domain -- it does not relate to workout sessions, exercises, or programs. This isolation is deliberate and correct.
- An index on `meals.logged_at` will be necessary for date-range queries on the chart. Create it in `initDatabase()`.

### Component Boundaries

| Component | Responsibility | Type | Communicates With |
|-----------|---------------|------|-------------------|
| `ProteinScreen` | Main protein tab screen: goal progress bar, today's meals, line chart | Screen | `src/db/protein.ts` (reads/writes) |
| `AddMealModal` | Bottom sheet modal for logging a meal (protein grams + description) | Screen/Modal | `ProteinScreen` (via callback props) |
| `EditMealModal` | Bottom sheet modal for editing an existing meal's description, amount, or date | Screen/Modal | `ProteinScreen` (via callback props) |
| `ProteinProgressBar` | Circular or horizontal progress bar showing daily progress toward goal | Component | Receives `currentGrams` and `goalGrams` as props |
| `MealListItem` | Single meal entry row (description, grams, time, swipe-to-delete or tap-to-edit) | Component | Receives `Meal` and callbacks as props |
| `ProteinChart` | Line chart of protein intake over time with day/week/month filter | Component | Receives aggregated data as props |
| `ProteinGoalModal` | Small modal/sheet for setting the daily protein goal | Screen/Modal | `ProteinScreen` (via callback props) |
| `CarrotIcon` | SVG icon for the Protein tab in the bottom navigator | Component | `TabNavigator` |

### New Files to Create

```
src/db/protein.ts              -- DB repository for meals + protein_settings
src/types/index.ts             -- Add Meal, ProteinSettings, ProteinDayTotal types (modify existing)
src/db/schema.ts               -- Add CREATE_MEALS_TABLE, CREATE_PROTEIN_SETTINGS_TABLE (modify existing)
src/db/database.ts             -- Add new table creation to initDatabase() (modify existing)
src/db/index.ts                -- Re-export protein functions (modify existing)
src/screens/ProteinScreen.tsx  -- Main protein tab screen
src/screens/AddMealModal.tsx   -- Add meal bottom sheet
src/screens/EditMealModal.tsx  -- Edit meal bottom sheet (or combine with AddMealModal via editMeal prop, matching AddExerciseModal pattern)
src/components/ProteinProgressBar.tsx  -- Daily progress visualization
src/components/MealListItem.tsx        -- Single meal row
src/components/ProteinChart.tsx        -- Line chart wrapper
src/navigation/TabNavigator.tsx        -- Add ProteinTab (modify existing)
```

### Modified Files

```
src/db/schema.ts        -- Add 2 new CREATE TABLE constants
src/db/database.ts      -- Add table creation + index in initDatabase()
src/db/index.ts         -- Re-export new protein.ts functions
src/types/index.ts      -- Add Meal, ProteinSettings, ProteinDayTotal interfaces
src/navigation/TabNavigator.tsx  -- Add ProteinTab + ProteinStackNavigator + CarrotIcon
src/db/dashboard.ts     -- Add meals to exportAllData() for data backup
```

## Data Flow

### Meal Logging Flow

```
User taps "+" on ProteinScreen
  --> AddMealModal opens (Modal, transparent, bottom sheet)
  --> User enters protein grams (numeric input) + optional description (text input)
  --> User taps "Log Meal"
  --> AddMealModal calls addMeal() from src/db/protein.ts
      --> INSERT INTO meals (protein_grams, description, logged_at, created_at)
      --> Returns inserted Meal object
  --> AddMealModal calls onMealAdded(meal) callback prop
  --> ProteinScreen receives callback
      --> Appends meal to local state (optimistic, no full DB reload)
      --> Recalculates daily total from local state
      --> Progress bar updates reactively
  --> AddMealModal closes
```

### Meal Edit Flow

```
User taps a MealListItem on ProteinScreen
  --> EditMealModal opens (or AddMealModal in edit mode, matching AddExerciseModal pattern)
  --> Pre-filled with existing meal data
  --> User modifies protein_grams, description, or logged_at
  --> User taps "Update"
  --> Modal calls updateMeal() from src/db/protein.ts
      --> UPDATE meals SET ... WHERE id = ?
      --> Returns updated Meal object
  --> Callback updates local state in ProteinScreen
  --> Progress bar recalculates
```

### Meal Delete Flow

```
User long-presses or taps delete on MealListItem
  --> Alert.alert confirmation (matching deleteExerciseHistorySession pattern)
  --> On confirm: deleteMeal(id) from src/db/protein.ts
      --> DELETE FROM meals WHERE id = ?
  --> Remove from local state
  --> Progress bar recalculates
```

### Daily Progress Data Flow

```
ProteinScreen mounts / gains focus (useFocusEffect)
  --> getTodayMeals() from src/db/protein.ts
      --> SELECT * FROM meals
         WHERE date(logged_at, 'localtime') = date('now', 'localtime')
         ORDER BY logged_at DESC
  --> getProteinSettings() from src/db/protein.ts
      --> SELECT * FROM protein_settings WHERE id = 1
      --> If no row: INSERT default (200g) and return it
  --> setState: meals, dailyGoal
  --> ProteinProgressBar renders with sum(meals.proteinGrams) / dailyGoal
```

### Chart Data Aggregation Flow

```
ProteinChart renders with selected time range (Day/Week/Month filter)
  --> getProteinChartData(range) from src/db/protein.ts

  For "Day" view (last 7 days, one point per day):
      SELECT date(logged_at, 'localtime') AS day,
             SUM(protein_grams) AS total
      FROM meals
      WHERE logged_at >= datetime('now', '-7 days')
      GROUP BY date(logged_at, 'localtime')
      ORDER BY day ASC

  For "Week" view (last 4 weeks, one point per week):
      SELECT strftime('%Y-W%W', logged_at, 'localtime') AS week,
             AVG(daily_total) AS avg_daily
      FROM (
        SELECT date(logged_at, 'localtime') AS day,
               SUM(protein_grams) AS daily_total
        FROM meals
        WHERE logged_at >= datetime('now', '-28 days')
        GROUP BY date(logged_at, 'localtime')
      )
      GROUP BY week
      ORDER BY week ASC

  For "Month" view (last 6 months, one point per month):
      SELECT strftime('%Y-%m', logged_at, 'localtime') AS month,
             AVG(daily_total) AS avg_daily
      FROM (
        SELECT date(logged_at, 'localtime') AS day,
               SUM(protein_grams) AS daily_total
        FROM meals
        WHERE logged_at >= datetime('now', '-6 months')
        GROUP BY date(logged_at, 'localtime')
      )
      GROUP BY month
      ORDER BY month ASC

  --> Returns array of { label: string, value: number }
  --> ProteinChart renders using react-native-chart-kit LineChart (same as ExerciseProgressScreen)
```

### Daily Reset Logic

There is no "reset" operation needed. The "daily reset at midnight" described in the requirements is a **query-time concern, not a data concern**. The progress bar simply queries meals where `date(logged_at, 'localtime') = date('now', 'localtime')`. When midnight passes, the query naturally returns zero rows for the new day. No cron job, no background task, no scheduled operation.

If the user has the app open at midnight and is staring at the progress bar, it will update on next `useFocusEffect` trigger (when they navigate away and back to the Protein tab). This is acceptable -- the workout tracker has the same pattern. If a more immediate reset is desired, a `setInterval` in `ProteinScreen` could check hourly if the date has changed, but this is over-engineering for v1.1.

## Navigation Integration

### Tab Navigator Changes

Add a 5th tab to the bottom tab navigator. Insert it between Home and Library (or after Workout -- the position should match the product's priority hierarchy). Recommendation: place it second, after Home.

```typescript
// In TabNavigator.tsx, add to TabParamList:
export type TabParamList = {
  DashboardTab: undefined;
  ProteinTab: undefined;    // NEW
  LibraryTab: undefined;
  ProgramsTab: undefined;
  WorkoutTab: undefined;
};

// New stack for Protein tab (simple -- just the main screen for now):
export type ProteinStackParamList = {
  ProteinHome: undefined;
};

const ProteinStack = createNativeStackNavigator<ProteinStackParamList>();

function ProteinStackNavigator() {
  return (
    <ProteinStack.Navigator screenOptions={{ headerShown: false }}>
      <ProteinStack.Screen name="ProteinHome" component={ProteinScreen} />
    </ProteinStack.Navigator>
  );
}

// Add Tab.Screen in the Tab.Navigator, after DashboardTab:
<Tab.Screen
  name="ProteinTab"
  component={ProteinStackNavigator}
  options={{
    tabBarLabel: 'Protein',
    tabBarIcon: ({ color }) => <CarrotIcon color={color} />,
  }}
/>
```

Using a stack navigator even for a single screen follows the existing pattern (WorkoutStackNavigator wraps WorkoutScreen + ExerciseProgress) and allows future extensibility (e.g., a dedicated protein history screen, food database screen).

### CarrotIcon Component

Follow the exact SVG icon pattern used by the existing tab icons (HomeIcon, BookIcon, etc.) -- a functional component receiving `{ color }` props, rendering an SVG with `stroke={color}`, same `ICON_SIZE` constant. Define it inline in `TabNavigator.tsx` like the other icons.

## Patterns to Follow

### Pattern 1: Repository Functions (db layer)
**What:** Each database domain gets its own file in `src/db/` with async functions that import the `db` singleton and `executeSql` helper. Each function opens with `const database = await db;`.
**When:** Always, for all database operations.
**Example:**
```typescript
// src/db/protein.ts
import { db, executeSql } from './database';
import { Meal, ProteinSettings } from '../types';

function rowToMeal(row: any): Meal {
  return {
    id: row.id,
    proteinGrams: row.protein_grams,
    description: row.description,
    loggedAt: row.logged_at,
    createdAt: row.created_at,
  };
}

export async function addMeal(
  proteinGrams: number,
  description: string,
  loggedAt?: string,
): Promise<Meal> {
  const database = await db;
  const now = new Date().toISOString();
  const mealTime = loggedAt ?? now;
  const result = await executeSql(
    database,
    'INSERT INTO meals (protein_grams, description, logged_at, created_at) VALUES (?, ?, ?, ?)',
    [proteinGrams, description, mealTime, now],
  );
  const row = await executeSql(database, 'SELECT * FROM meals WHERE id = ?', [result.insertId]);
  return rowToMeal(row.rows.item(0));
}
```

### Pattern 2: Row Mapping Functions
**What:** Each repo file has a private `rowToXxx()` function that maps snake_case SQL columns to camelCase TypeScript interfaces.
**When:** Every function that reads from the database.
**Example:** See `rowToExercise()` in `exercises.ts`, `rowToSession()` in `sessions.ts`. The protein repo needs `rowToMeal()` and `rowToProteinSettings()`.

### Pattern 3: Bottom Sheet Modals
**What:** `Modal` with `animationType="slide"` and `transparent`, containing a `Pressable` overlay (for tap-to-dismiss) and a `View` sheet with `borderTopLeftRadius: 20` styling.
**When:** Any user input form (add meal, edit meal, set protein goal).
**Example:** See `AddExerciseModal.tsx`. The `AddMealModal` should follow this exact structure: `KeyboardAvoidingView > Pressable overlay > View sheet > ScrollView > inputs + submit/cancel buttons`.

### Pattern 4: useFocusEffect for Data Loading
**What:** Use `useFocusEffect(useCallback(() => { ... }, [deps]))` from `@react-navigation/native` to load data when a screen gains focus. This handles tab switches and back-navigation naturally.
**When:** Every screen that displays data from the database.
**Example:** See `DashboardScreen.tsx` lines 84-97. `ProteinScreen` should use the same pattern to load today's meals and the protein goal.

### Pattern 5: Optimistic Local State Updates
**What:** After a successful DB write, update local `useState` arrays directly instead of reloading everything from the database. Only do full DB refresh on focus.
**When:** After add/edit/delete operations.
**Example:** See `SessionContext.tsx` `addExercise` (line 149-164) where it appends to state after DB insert. `ProteinScreen` should append new meals to local state after `addMeal()` returns.

### Pattern 6: Screen-Local State (No Global Context for Protein)
**What:** The protein feature does NOT need a React Context provider. SessionContext exists because workout session state is needed across multiple screens simultaneously (WorkoutScreen, SetLoggingPanel, RestTimerBanner). Protein data is only needed on one screen -- the ProteinScreen. Use `useState` locally.
**When:** Single-screen features that don't share state across the navigation tree.
**Why this matters:** Adding an unnecessary ProteinContext would add complexity to App.tsx, increase bundle re-renders, and violate the existing pattern where only truly cross-cutting state gets a Context.

### Pattern 7: Time Range Filters for Charts
**What:** Array of filter options rendered as a row of `TouchableOpacity` buttons, stored in local state. Filter applied via `useMemo` over the data array.
**When:** Any chart with time-based filtering.
**Example:** See `ExerciseProgressScreen.tsx` lines 22-33 (TIME_RANGES) and 162-181 (filter row rendering). The protein chart should use `['1W', '1M', '3M', 'All']` or similar.

## Anti-Patterns to Avoid

### Anti-Pattern 1: Creating a ProteinContext Provider
**What:** Wrapping the app in a `ProteinProvider` that holds today's meals and goal in global state.
**Why bad:** Protein data is consumed by exactly one screen. A Context adds unnecessary re-renders to the entire component tree, complicates App.tsx, and violates the existing architectural decision to use Context only for cross-cutting concerns (active workout session, rest timer).
**Instead:** Use `useState` + `useFocusEffect` in `ProteinScreen`, exactly like `DashboardScreen` does.

### Anti-Pattern 2: Relating Meals to Workout Sessions
**What:** Adding a `session_id` foreign key to the meals table, or trying to connect protein intake to specific workouts.
**Why bad:** Protein tracking is a daily nutrition concern, not a workout concern. Users eat meals outside of workouts. The domains are independent.
**Instead:** Keep the `meals` table completely standalone with no foreign keys to workout tables.

### Anti-Pattern 3: Combining AddMealModal and EditMealModal into the Same Component with Complex Conditional Logic
**What:** Using a single modal component with extensive `isEditMode` branching that makes the component hard to follow.
**Why bad:** This CAN work (and `AddExerciseModal` does it), but the add-meal and edit-meal flows are similar enough that a single component with an optional `editMeal` prop is clean. The decision is: if the fields are identical between add and edit modes, combine them (like `AddExerciseModal`). If they diverge significantly, split.
**Recommendation:** Combine into `AddMealModal` with an optional `editMeal?: Meal` prop, matching the `AddExerciseModal` pattern exactly.

### Anti-Pattern 4: Using AsyncStorage for Protein Settings
**What:** Storing the protein goal in AsyncStorage instead of SQLite.
**Why bad:** The app already uses SQLite for everything. Introducing a second storage mechanism creates inconsistency, complicates data export, and fragments the backup strategy.
**Instead:** Use a `protein_settings` table with a single-row constraint.

### Anti-Pattern 5: Background Midnight Reset Timer
**What:** Running a `setInterval` or scheduling a background task to "reset" the protein counter at midnight.
**Why bad:** There is nothing to reset. The progress bar is a query result (`SUM WHERE date = today`). When "today" changes, the query naturally returns different results. React Native background tasks are unreliable on Android and add unnecessary complexity.
**Instead:** Let the query handle the day boundary. If the user is staring at the screen at midnight, it updates on next focus event.

## New Type Definitions

Add these to `src/types/index.ts`:

```typescript
// -- Protein domain types (v1.1) --

export interface Meal {
  id: number;
  proteinGrams: number;
  description: string;
  loggedAt: string;
  createdAt: string;
}

export interface ProteinSettings {
  id: number;
  dailyGoalGrams: number;
}

export interface ProteinDayTotal {
  date: string;
  totalGrams: number;
}
```

## Database Repository Design (src/db/protein.ts)

The protein repository should expose these functions:

| Function | Signature | SQL Operation |
|----------|-----------|---------------|
| `addMeal` | `(proteinGrams: number, description: string, loggedAt?: string) => Promise<Meal>` | INSERT |
| `updateMeal` | `(id: number, proteinGrams: number, description: string, loggedAt: string) => Promise<Meal>` | UPDATE |
| `deleteMeal` | `(id: number) => Promise<void>` | DELETE |
| `getTodayMeals` | `() => Promise<Meal[]>` | SELECT WHERE date = today |
| `getProteinSettings` | `() => Promise<ProteinSettings>` | SELECT (upsert default if empty) |
| `updateProteinGoal` | `(grams: number) => Promise<void>` | UPDATE protein_settings |
| `getProteinChartData` | `(range: 'day' \| 'week' \| 'month') => Promise<ProteinDayTotal[]>` | SELECT with GROUP BY date aggregation |
| `getAllMeals` | `() => Promise<Meal[]>` | SELECT all (for data export) |

## Database Init Changes

In `src/db/database.ts`, the `initDatabase()` function must:

1. Add `tx.executeSql(CREATE_MEALS_TABLE)` and `tx.executeSql(CREATE_PROTEIN_SETTINGS_TABLE)` to the existing transaction block.
2. After the transaction, create an index:
   ```sql
   CREATE INDEX IF NOT EXISTS idx_meals_logged_at ON meals(logged_at)
   ```
3. Insert the default protein settings row if it does not exist:
   ```sql
   INSERT OR IGNORE INTO protein_settings (id, daily_goal_grams) VALUES (1, 200)
   ```

This follows the same pattern as the existing `initDatabase()` which creates tables then runs migrations/seeds.

## Data Export Integration

The `exportAllData()` function in `src/db/dashboard.ts` must be extended to include meals and protein settings in the export. Add to the `FullDataExport` type:

```typescript
export interface FullDataExport {
  exportedAt: string;
  exercises: Exercise[];
  sessions: (WorkoutSession & { sets: WorkoutSet[] })[];
  programs: (Program & { days: (ProgramDay & { exercises: ProgramDayExercise[] })[] })[];
  meals: Meal[];                    // NEW
  proteinSettings: ProteinSettings; // NEW
}
```

## Suggested Build Order

Build order is driven by dependencies. Each step produces a working, testable increment.

### Step 1: Schema + Types + DB Repository
Create the schema constants, type definitions, and `src/db/protein.ts` with all CRUD functions. Wire the schema into `initDatabase()`. Update `src/db/index.ts` exports.

**Dependency:** Nothing else can work without the data layer.
**Testable:** Can verify table creation and CRUD via manual DB inspection or a temporary test screen.

### Step 2: Tab Navigator + Empty ProteinScreen
Add the `ProteinTab` to `TabNavigator.tsx` with the CarrotIcon. Create `ProteinScreen.tsx` as a skeleton (just a title and empty state). This proves navigation works.

**Dependency:** Step 1 (screen will import from protein.ts even if it shows nothing yet).
**Testable:** App launches, 5 tabs visible, Protein tab navigable.

### Step 3: Protein Goal + Progress Bar
Build `ProteinProgressBar` component. Add `getProteinSettings()` and `updateProteinGoal()` calls to `ProteinScreen`. Build `ProteinGoalModal` for changing the goal. Wire the progress bar into the screen.

**Dependency:** Step 1 (DB), Step 2 (screen exists).
**Testable:** Progress bar renders showing 0/200g. User can change goal.

### Step 4: Add Meal Modal + Today's Meal List
Build `AddMealModal` (following `AddExerciseModal` pattern) and `MealListItem` component. Wire into `ProteinScreen` with a "+" FAB or button. Show today's meals in a `FlatList` below the progress bar. Progress bar updates as meals are added.

**Dependency:** Step 3 (progress bar to update).
**Testable:** Full meal logging flow works. Add meal, see it in list, see progress bar fill.

### Step 5: Edit and Delete Meals
Add edit mode to `AddMealModal` (optional `editMeal` prop). Add delete with `Alert.alert` confirmation. Wire tap-to-edit on `MealListItem` and a delete action.

**Dependency:** Step 4.
**Testable:** Full CRUD on meals.

### Step 6: Protein Intake Chart
Build `ProteinChart` component using `react-native-chart-kit` `LineChart`. Add `getProteinChartData()` calls. Add time range filter (day/week/month). Place chart section in `ProteinScreen` between progress bar and meal list.

**Dependency:** Step 4 (needs meal data to chart).
**Testable:** Chart renders with real data, filters work.

### Step 7: Data Export Integration
Update `exportAllData()` to include meals and protein settings. Update `FullDataExport` type.

**Dependency:** Step 1 (types), but can be done anytime after Step 1.
**Testable:** Export JSON includes meals array.

## Scalability Considerations

| Concern | At 100 meals | At 1,000 meals | At 10,000 meals |
|---------|-------------|----------------|-----------------|
| Today's meals query | Instant (<1ms) | Instant with index | Instant with index |
| Chart aggregation | Instant | <10ms with index | <50ms with index -- still fine |
| FlatList rendering | No optimization needed | No optimization needed | Only shows today's meals, so still small |
| DB size | Negligible | ~100KB | ~1MB -- negligible for local SQLite |

At 3 meals/day, reaching 10,000 meals takes ~9 years. This architecture will not need optimization for the lifetime of the app.

## Sources

- Existing codebase analysis (all files read directly from repository)
- SQLite `date()` and `strftime()` functions: standard SQLite date handling, well-documented and reliable for local timezone aggregation when using the `'localtime'` modifier
- `react-native-chart-kit`: already a dependency in the project, used in `ExerciseProgressScreen.tsx`
- `react-native-sqlite-storage`: already a dependency, used throughout `src/db/`

# Stack Research

**Domain:** Protein tracking feature additions to React Native gym app
**Researched:** 2026-03-07
**Confidence:** HIGH

## Existing Stack (DO NOT change)

These are already installed and working. Listed for integration context only.

| Technology | Version | Purpose |
|------------|---------|---------|
| react-native | 0.84.1 | App framework |
| react | 19.2.3 | UI library |
| react-native-chart-kit | 6.12.0 | Line charts (exercise progress) |
| react-native-svg | 15.15.3 | SVG rendering (charts, icons) |
| react-native-sqlite-storage | 6.0.1 | Local database |
| @react-navigation/bottom-tabs | 7.15.5 | Tab navigation |
| @react-navigation/native-stack | 7.14.4 | Stack navigation |
| react-native-safe-area-context | 5.5.2 | Safe area handling |

## Recommended Stack Additions

### Summary: Zero new dependencies needed

The protein tracking milestone requires **no new npm packages**. Every capability needed is already available through the existing stack or built-in React Native APIs. This is the strongest recommendation because it avoids version conflicts, keeps the bundle size stable, and follows the patterns already established in the codebase.

### Charting: Use existing react-native-chart-kit

| Decision | Details |
|----------|---------|
| **Library** | `react-native-chart-kit` (already at 6.12.0) |
| **Why reuse** | Already renders LineChart with time filtering in `ExerciseProgressScreen.tsx`. The protein intake chart has identical requirements: line chart, date labels, time range filter buttons. |
| **Maintenance concern** | Last npm publish was ~4 years ago. This is a known risk, BUT it already works with RN 0.84.1 in this app, so no compatibility issue exists today. Switching charting libraries mid-project would be disruptive for zero user-facing benefit. |
| **Protein chart config** | Same `LineChart` component with `yAxisSuffix="g"`, bezier smoothing, accent color. Filter tabs change from `['1M','3M','6M','All']` to `['Day','Week','Month']`. |

**Integration pattern (from ExerciseProgressScreen.tsx lines 120-143):**
```typescript
// Protein chart follows the exact same pattern:
const chartData = {
  labels: filteredData.map(p => formatDateShort(p.date)),
  datasets: [{
    data: filteredData.map(p => p.totalProtein),
    color: () => colors.accent,
    strokeWidth: 2,
  }],
};

<LineChart
  data={chartData}
  width={CHART_WIDTH}
  height={220}
  yAxisSuffix="g"
  chartConfig={{ /* same as exercise charts */ }}
  bezier
/>
```

### Progress Bar: Custom View component (no library)

| Decision | Details |
|----------|---------|
| **Approach** | Build with React Native `View` + `Animated` |
| **Why no library** | A protein goal progress bar is a single horizontal bar showing `consumed / goal`. This is ~30 lines of code with `View` styling. Adding `react-native-progress` (or similar) for one bar component would be over-engineering. The app's existing pattern is custom components over libraries (see all SVG icons hand-built in `TabNavigator.tsx`). |
| **Animation** | Use React Native's built-in `Animated.timing()` for smooth fill transitions when meals are added. No `react-native-reanimated` needed for this simple case. |

**Implementation pattern:**
```typescript
// ProteinProgressBar.tsx - ~30 lines, no dependency
const fillWidth = Animated.multiply(
  progress, // Animated.Value 0-1
  containerWidth
);

<View style={styles.trackBar}>
  <Animated.View style={[styles.fillBar, { width: fillWidth }]} />
  <Text style={styles.label}>{consumed}g / {goal}g</Text>
</View>
```

### Date Handling: Native JavaScript Date (no library)

| Decision | Details |
|----------|---------|
| **Approach** | Use JavaScript `Date` constructor and arithmetic |
| **Why no date library** | The entire existing codebase uses native `Date` exclusively (35 occurrences across 10 files). ISO strings stored in SQLite, `new Date().toISOString()` for timestamps, manual date math for week calculations. Adding day.js or date-fns for this milestone would create two date paradigms in the codebase for no benefit. |
| **Daily reset logic** | Midnight boundary detection uses `new Date(year, month, day)` constructor (local timezone). SQLite query filters with `date(logged_at, 'localtime') = date('now', 'localtime')` for "today's meals". |
| **Time filtering** | Already implemented in `ExerciseProgressScreen.tsx` via `getDateThreshold()`. Protein chart uses the same pattern with day/week/month granularity. |

**Daily boundary pattern:**
```typescript
// Get today's date boundary at midnight local time
function getTodayStart(): string {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return today.toISOString();
}

function getTodayEnd(): string {
  const now = new Date();
  const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  return tomorrow.toISOString();
}
```

**SQLite query for today's meals:**
```sql
SELECT * FROM protein_entries
WHERE logged_at >= ? AND logged_at < ?
ORDER BY logged_at DESC
```

### Modal Pattern: React Native Modal (existing pattern)

| Decision | Details |
|----------|---------|
| **Approach** | Follow `AddExerciseModal.tsx` pattern exactly |
| **Why** | The app has an established modal pattern: `<Modal transparent animationType="slide">` with overlay `<Pressable>` for dismiss, `<KeyboardAvoidingView>` for input fields, bottom sheet styling. The "Add Meal" modal has identical interaction needs (text input + numeric input + submit). |

**Pattern from AddExerciseModal.tsx:**
- `Modal` with `transparent` + `animationType="slide"`
- `KeyboardAvoidingView` wrapping the content
- `Pressable` overlay for tap-to-dismiss
- Bottom sheet with `borderTopLeftRadius: 20`
- Consistent button styling (`colors.accent` background, `colors.background` text)

### Database Schema: Extend existing SQLite

| Decision | Details |
|----------|---------|
| **Approach** | Two new tables in existing `react-native-sqlite-storage` database |
| **Why** | All data is already in `gymtrack.db`. No second database or storage mechanism needed. |

**New tables:**
```sql
CREATE TABLE IF NOT EXISTS protein_entries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  protein_grams REAL NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  logged_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS user_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
-- Used for: daily_protein_goal (e.g., '200')
```

**Why `user_settings` as key-value:** The app currently has no settings storage. A simple key-value table handles the protein goal now and any future settings (e.g., default units, theme preference) without schema changes.

### Navigation: Add Protein tab to existing TabNavigator

| Decision | Details |
|----------|---------|
| **Approach** | Add `ProteinTab` to `TabParamList` in `TabNavigator.tsx` |
| **Icon** | Custom SVG carrot icon (following the pattern of hand-drawn SVG icons for Home, Library, Programs, Workout tabs) |
| **Stack** | `ProteinStack` with `ProteinHome` screen (contains progress bar, chart, meal list, and Add Meal modal) |

## Alternatives Considered

| Recommended | Alternative | Why Not |
|-------------|-------------|---------|
| react-native-chart-kit (existing) | react-native-gifted-charts | Would add a second charting library. The existing one works. Switching would require rewriting ExerciseProgressScreen too for consistency. |
| react-native-chart-kit (existing) | victory-native | Same problem: duplicate dependency. Also heavier bundle size. |
| Custom progress bar (View) | react-native-progress | Single-use component. The library adds react-native-svg dependency (already have it) but also brings circular progress, spinners, pie charts we do not need. 30 lines of View code is simpler. |
| Native Date | date-fns | Would split the codebase into two date paradigms. The protein date logic (today boundary, week/month ago) is identical to what already works in dashboard.ts. |
| Native Date | day.js | Same rationale. The app's date needs are simple: ISO string storage, local-timezone midnight boundaries, relative date thresholds. Native Date handles all of these. |
| SQLite `user_settings` table | AsyncStorage | The app is 100% SQLite. Adding AsyncStorage creates a second persistence layer. Key-value in SQLite is equally simple and keeps everything in one place. |

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| react-native-gifted-charts | Duplicate charting library; inconsistent chart rendering across screens | Reuse react-native-chart-kit already in project |
| victory-native | 600KB+ bundle addition for charts that react-native-chart-kit already handles | Reuse react-native-chart-kit |
| react-native-progress | Over-engineered for a single horizontal progress bar | Custom View + Animated (~30 lines) |
| @react-native-async-storage/async-storage | Introduces second persistence layer alongside SQLite | SQLite key-value table |
| date-fns / day.js / moment | Creates split date paradigm in codebase; native Date already used everywhere | Native JavaScript Date |
| react-native-reanimated | Heavy native dependency for a simple bar fill animation | React Native built-in Animated API |
| react-native-modal | The built-in Modal component works identically; app already uses it | React Native Modal (built-in) |

## Stack Patterns

**If the charting needs grow beyond line/bar charts later:**
- Consider migrating the entire app to `react-native-gifted-charts` or `victory-native` at that point, replacing react-native-chart-kit everywhere for consistency.
- Do NOT run two charting libraries simultaneously.

**If user settings grow beyond protein goal:**
- The `user_settings` key-value table scales to any number of settings.
- If settings become complex (nested objects), store JSON strings in the `value` column.

**If date logic becomes complex (recurring schedules, timezone-aware syncing):**
- Only then add `date-fns` (tree-shakeable, no mutation) as the date library.
- For this milestone's needs (midnight boundary, N-days-ago threshold), native Date is sufficient and consistent.

## Version Compatibility

| Existing Package | Protein Feature Uses | Compatibility Notes |
|------------------|---------------------|---------------------|
| react-native-chart-kit@6.12.0 | LineChart for protein intake over time | Already working with RN 0.84.1. No changes needed. |
| react-native-svg@15.15.3 | Carrot tab icon (SVG Path) | Already a dependency of react-native-chart-kit. No changes needed. |
| react-native-sqlite-storage@6.0.1 | Two new tables in existing database | Same database connection via `db` singleton. Schema migration in `initDatabase()`. |
| @react-navigation/bottom-tabs@7.15.5 | New "Protein" tab | Just add a Tab.Screen to existing TabNavigator. |

## Installation

```bash
# No new packages to install.
# All capabilities come from existing dependencies.
```

## Sources

- Existing codebase analysis (HIGH confidence): `package.json`, `ExerciseProgressScreen.tsx`, `AddExerciseModal.tsx`, `TabNavigator.tsx`, `database.ts`, `schema.ts`, `dashboard.ts`, `sessions.ts`, `types/index.ts`, `theme/colors.ts`
- [react-native-chart-kit npm](https://www.npmjs.com/package/react-native-chart-kit) -- last published ~4 years ago, v6.12.0, but already working in this project
- [react-native-chart-kit GitHub](https://github.com/indiespirit/react-native-chart-kit) -- supports LineChart, BarChart, ProgressChart (ring), PieChart, ContributionGraph
- [react-native-progress GitHub](https://github.com/oblador/react-native-progress) -- considered and rejected; overkill for single bar component
- [React Native Date handling best practices](https://dev.to/ugglr/react-native-getting-user-device-timezone-and-converting-utc-time-stamps-using-the-offset-3jh8) -- confirms native Date + local timezone constructor approach

---
*Stack research for: GymTrack v1.1 Protein Tracking*
*Researched: 2026-03-07*

# Feature Research

**Domain:** Protein intake tracking for a gym workout app (v1.1 milestone)
**Researched:** 2026-03-07
**Confidence:** HIGH

## Feature Landscape

### Table Stakes (Users Expect These)

Features users assume exist in any protein tracking tool. Missing these makes the feature feel broken or half-baked.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Configurable daily protein goal (grams) | Every protein tracker starts with "how much protein do you want to eat?" A goal-less tracker has no purpose. | LOW | Single numeric setting stored in SQLite. Expose via a settings modal or inline editable field on the Protein tab. Default to 200g as a sensible starting point. |
| Daily progress bar | Users need at-a-glance feedback on how close they are to their goal. This is the primary motivator to keep logging. Every competitor app (Proto, Protein Pal, DailyProtein) centers the experience around this visual. | LOW | Linear horizontal progress bar matches the app's existing minimal aesthetic better than a circular gauge. Show "Xg / Yg" text alongside the fill. Use existing `colors.accent` (#4ADE80 green) for fill. |
| Midnight auto-reset | Daily protein goals reset at the start of each day. Users expect this without thinking about it. Not resetting would break the mental model. | LOW | Not an actual timer or scheduled job. Query meals WHERE date = today (using `date('now', 'localtime')` in SQLite). No reset logic needed -- just filter by date. |
| Add Meal modal (protein grams + description) | The core logging interaction. Must be fast -- two fields (grams, optional description) and a confirm button. This mirrors the app's existing "log a set" pattern (two fields + confirm). | LOW | Reuse the existing bottom-sheet modal pattern from AddExerciseModal. Numeric input for grams (keyboardType="number-pad"), text input for description. Grams field should auto-focus. |
| Today's meal list with timestamps | Users need to see what they have already logged today to avoid double-logging and to feel progress. Shown below the progress bar. | LOW | Simple FlatList of today's meals, sorted by logged_at descending (newest first). Show protein amount, description, and relative time. |
| Edit a meal entry | Users make mistakes -- wrong amount, typo in description, logged to wrong time. Editing is expected. | LOW | Tap a meal entry to open the Add Meal modal pre-filled with existing values. Update in place. This matches the existing edit-exercise pattern (same modal, edit mode). |
| Delete a meal entry | Users log meals by mistake and need to remove them. Shown in competitor apps as swipe-to-delete or a delete button. | LOW | Confirm dialog before deleting (matches existing session-delete pattern). Either a delete button on each row or swipe-to-delete gesture. |
| Protein intake history chart (line chart) | Users want to see trends over time -- "am I consistently hitting my goal?" This is the equivalent of the existing exercise progress chart. | MEDIUM | Reuse `react-native-chart-kit` LineChart already in the project. X-axis = dates, Y-axis = total protein (grams). Plot daily totals. Requires an aggregate query: `SELECT date(logged_at, 'localtime') as day, SUM(protein_grams) FROM meals GROUP BY day`. |
| Time range filter for chart (Day/Week/Month) | Matching the project requirement. Users want to zoom in on recent trends or see long-term consistency. | LOW | Reuse the existing time-range filter pill pattern from ExerciseProgressScreen (1M/3M/6M/All). Adapt to Day (last 7 days), Week (last 4 weeks), Month (last 3 months) for nutrition context. |

### Differentiators (Competitive Advantage)

Features that are not expected but add meaningful value. These align with GymTrack's core value of speed and minimal friction.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Quick-add buttons for frequent amounts | Reduce meal logging to a single tap for common protein amounts (e.g., "Protein shake 30g", "Chicken breast 40g"). Proto and Protein Pal both highlight saved/quick meals as a key retention feature. | LOW | Store as user-created "quick add" entries in a separate `protein_quick_adds` table (name, grams). Show as horizontal pill row above the Add Meal button. Tap to instantly log without opening the modal. |
| Goal streak indicator | Show consecutive days the user hit their protein goal. Streaks are a proven engagement mechanic (Protein Panda uses "crowns", Proto uses streaks). Aligns with the progress-bar-fill dopamine loop. | LOW | Computed on read: count consecutive days where SUM(protein_grams) >= daily_goal, working backwards from yesterday. Display as "X day streak" badge near the progress bar. No separate table needed. |
| Protein intake in JSON/CSV data export | Users already have data export for workouts. Protein data should be included in the existing export. Completeness matters for users who want to share data with a coach. | LOW | Extend the existing `FullDataExport` type and export function. Add a `meals` array to the export JSON. Trivial addition to the existing export pipeline. |
| Goal line on history chart | Overlay a horizontal dashed line at the daily goal amount on the line chart. Instantly communicates "am I above or below target" without reading numbers. Standard in fitness dashboards. | LOW | `react-native-chart-kit` does not natively support reference lines, but an SVG `<Line>` can be overlaid on the chart container using absolute positioning. Calculate Y position from the goal value relative to chart scale. |
| Weekly average display | Show average daily protein intake for the current week alongside the daily total. Helps users see if they are trending well even if they miss one day. More useful than daily-only feedback. | LOW | Single aggregate query: `SELECT AVG(daily_total) FROM (SELECT SUM(protein_grams) as daily_total FROM meals WHERE date >= start_of_week GROUP BY date)`. Display as a secondary stat below the progress bar. |

### Anti-Features (Commonly Requested, Often Problematic)

Features that seem reasonable but conflict with GymTrack's design philosophy of speed, simplicity, and local-only operation.

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| Full macro tracking (carbs, fats, calories) | "If I'm tracking protein, why not track everything?" | Massively increases scope and complexity. Requires a food database, per-food macro breakdowns, serving sizes, and unit conversions. Transforms a simple logger into a MyFitnessPal competitor. The PROJECT.md explicitly scopes this as protein-only. Protein-only trackers like Proto succeed precisely because they do NOT track everything. | Keep it protein-only. Users who want full macros already use dedicated apps (MyFitnessPal, Cronometer, MacroFactor). GymTrack's protein tab complements those, not replaces them. |
| Food database / barcode scanning | "Let me search for foods instead of entering grams manually" | Requires either an internet-connected API (violates local-only constraint) or bundling a massive offline food database (bloats app size from MBs to 100+ MBs). Barcode scanning needs camera permissions and a barcode-to-food lookup service. Enormous implementation cost for a side feature. | Quick-add buttons for frequently eaten foods let users build their own personal "database" of common meals without any external dependency. User enters grams once, reuses with one tap forever. |
| AI photo meal logging | "Snap a photo and auto-detect protein" | Requires cloud AI services (violates offline constraint), camera integration, and the accuracy is questionable even in dedicated apps. Proto uses this as its primary input but it requires their cloud infrastructure. | Manual entry with quick-add buttons. Two taps is fast enough for a gym app. Users know their protein amounts for their regular meals. |
| Meal-by-meal protein pacing / distribution alerts | "Tell me if I need more protein at dinner" | Adds notification complexity, requires defining meal windows, and introduces judgment about eating habits that many users find annoying or anxiety-inducing. Research shows smart reminders help but the line between helpful and nagging is thin. | The progress bar already shows where you stand. Users can glance at it and self-correct. No push notifications needed. |
| Social sharing of protein stats | "Share my streak on social media" | PROJECT.md explicitly says "Social/sharing features -- solo personal use only". Adds complexity with no alignment to the app's purpose. | Data export to JSON/CSV covers the "share with my coach" use case without social features. |
| Protein goal auto-calculation from body weight | "Calculate my protein target based on my weight and activity level" | Requires collecting body weight, activity level, and applying opinionated formulas (0.8g/lb? 1g/lb? 1.2g/lb?). Different fitness communities have strong disagreements about protein recommendations. | Let the user set their own goal in grams. They know their target. A simple numeric input avoids all the controversy and extra data collection. |
| Reminders / push notifications to log meals | "Remind me to track my meals" | Push notification infrastructure adds complexity. Notifications are the #1 reason users uninstall apps when done poorly. PROJECT.md shows no notification infrastructure exists. | The app is already opened during workouts. Users build the habit of checking protein when they open the app for their workout. The streak indicator provides passive motivation. |

## Feature Dependencies

```
[Daily protein goal setting]
    +-- required by --> [Daily progress bar]
    +-- required by --> [Goal line on chart]
    +-- required by --> [Streak indicator]

[Meals table in SQLite]
    +-- required by --> [Add Meal modal]
    +-- required by --> [Today's meal list]
    +-- required by --> [Edit meal]
    +-- required by --> [Delete meal]
    +-- required by --> [History chart]
    +-- required by --> [Weekly average]
    +-- required by --> [Data export extension]

[Add Meal modal]
    +-- enhanced by --> [Quick-add buttons]

[Today's meal list]
    +-- required by --> [Edit meal]
    +-- required by --> [Delete meal]

[Protein tab in bottom navigator]
    +-- required by --> [All protein UI features]
    +-- depends on --> [Existing TabNavigator infrastructure]

[History chart]
    +-- enhanced by --> [Time range filter]
    +-- enhanced by --> [Goal line on chart]
    +-- depends on --> [react-native-chart-kit (already installed)]
```

### Dependency Notes

- **All protein UI requires Protein tab:** The new bottom tab must be added to the TabNavigator first. This is the container for all other protein features.
- **Progress bar requires goal setting:** Cannot show progress without a target. Goal setting must exist before the progress bar is functional.
- **Edit/delete require meal list:** Cannot edit or delete what is not displayed. The meal list provides the interaction surface for these actions.
- **Chart requires meals table with data:** The history chart aggregates data from the meals table. It degrades gracefully to an empty state when no data exists (matching the existing ExerciseProgressScreen pattern).
- **Quick-add enhances Add Meal:** Quick-add buttons are a shortcut that calls the same underlying `insertMeal` function. They can be added after the basic Add Meal flow works.

## Existing App Dependencies

The protein feature integrates with these existing systems:

| Existing System | How Protein Feature Uses It |
|----------------|---------------------------|
| SQLite database (`react-native-sqlite-storage`) | New `meals` and `protein_settings` tables added alongside existing tables in `schema.ts` and `database.ts` |
| `react-native-chart-kit` LineChart | Reuse for protein intake history chart (same library, same chart config patterns as ExerciseProgressScreen) |
| Bottom tab navigator (`@react-navigation/bottom-tabs`) | Add 5th "Protein" tab with carrot icon (SVG, matching existing icon pattern) |
| Modal pattern (AddExerciseModal bottom sheet) | Reuse for Add Meal modal (same overlay + sheet + form + submit pattern) |
| Theme system (colors, spacing, typography) | All protein UI uses existing theme tokens. No new colors needed -- green accent works for protein progress too. |
| Data export (`FullDataExport` type) | Extend to include meals array in the export JSON |

## MVP Definition

### Launch With (v1.1.0)

Minimum feature set that delivers the protein tracking promise.

- [x] Protein tab in bottom navigation with carrot icon -- the entry point for everything
- [x] Configurable daily protein goal (grams) with a settings control -- the foundation
- [x] Daily progress bar showing current intake vs goal -- the primary motivation loop
- [x] Add Meal modal with protein grams + description -- the core input action
- [x] Today's meal list below progress bar -- feedback and verification
- [x] Edit meal (tap to modify grams/description) -- error correction
- [x] Delete meal with confirmation dialog -- error correction
- [x] Protein intake line chart with time range filter -- trend visualization

### Add After Validation (v1.1.x)

Features to add once the core meal logging flow is stable and being used.

- [ ] Quick-add buttons for frequent meals -- add after users report logging the same meals repeatedly
- [ ] Goal streak indicator -- add after users have enough data to see streaks (1-2 weeks of use)
- [ ] Goal line overlay on history chart -- minor visual enhancement, add alongside streak
- [ ] Weekly average display -- add once chart is validated as useful
- [ ] Protein data in JSON/CSV export -- add when any user requests it

### Future Consideration (v2+)

Features to defer until there is a clear user need.

- [ ] Protein goal history (track when goal was changed over time) -- defer until users report changing goals frequently
- [ ] Meal templates / presets (saved full meals with multiple items) -- defer; quick-add covers most use cases
- [ ] Multiple nutrition metrics (water intake, fiber, etc.) -- defer indefinitely; each metric is a separate scope decision

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| Protein tab + navigation | HIGH | LOW | P1 |
| Daily protein goal setting | HIGH | LOW | P1 |
| Daily progress bar | HIGH | LOW | P1 |
| Add Meal modal | HIGH | LOW | P1 |
| Today's meal list | HIGH | LOW | P1 |
| Edit meal entry | HIGH | LOW | P1 |
| Delete meal entry | MEDIUM | LOW | P1 |
| Protein intake line chart | HIGH | MEDIUM | P1 |
| Time range filter for chart | MEDIUM | LOW | P1 |
| Quick-add buttons | HIGH | LOW | P2 |
| Streak indicator | MEDIUM | LOW | P2 |
| Goal line on chart | LOW | LOW | P2 |
| Weekly average display | LOW | LOW | P2 |
| Export extension | LOW | LOW | P2 |
| Protein goal history | LOW | MEDIUM | P3 |
| Meal templates | MEDIUM | MEDIUM | P3 |

**Priority key:**
- P1: Must have for v1.1 launch (matches PROJECT.md requirements)
- P2: Should have, add in follow-up patches
- P3: Nice to have, future consideration

## Competitor Feature Analysis

| Feature | Proto | Protein Pal | DailyProtein | GymTrack (Our Approach) |
|---------|-------|-------------|--------------|------------------------|
| Primary input method | AI photo scan | Barcode scan + search | Manual entry | Manual entry (grams + description) |
| Daily goal display | Progress bar | Progress bar | Progress bar | Linear progress bar with grams text |
| Quick re-logging | Saved meals (1 tap) | Custom foods | Not highlighted | Quick-add pill buttons |
| History chart | Yes, with export | Yes, over time | Analytics view | LineChart (reuse existing library) |
| Time range filter | Not specified | Step through days | Period comparison | Day/Week/Month pill filters |
| Streak/motivation | Implied | History insights | Not highlighted | Day streak badge |
| Food database | AI-powered (cloud) | US/UK/CA/AU database | Basic | None (offline-only, user enters grams) |
| Offline capability | No (requires AI cloud) | Partial (DB needs download) | Not specified | Full offline (local SQLite only) |
| Price | Subscription | Freemium (Pro tier) | Freemium | Free (personal tool) |
| Integration with workouts | No | No | No | Yes -- same app as workout tracking |

**GymTrack's competitive position:** The unique advantage is that protein tracking lives in the same app as workout tracking. Users do not need to switch between apps. The workout + nutrition combination in a single local-only app is genuinely uncommon -- most protein trackers are standalone, and most workout trackers do not include nutrition.

## Sources

- [Top 12 Nutrition Tracking Apps 2026 - Fitia](https://fitia.app/learn/article/top-12-nutrition-tracking-apps-2026/)
- [Best Protein Tracker App 2025 - Stride Fuel](https://www.stride-fuel.com/articles/protein-tracker-app)
- [Proto Protein Tracker - Best Protein Tracker App for iPhone](https://tinyideas.net/proto/blog/best-protein-tracker-app-iphone/)
- [Protein Pal - Official Site](https://www.proteinpalapp.com/)
- [MacroFactor vs MyFitnessPal 2025 - MacroFactor](https://macrofactor.com/macrofactor-vs-myfitnesspal-2025/)
- [MacroFactor vs MyFitnessPal - FeastGood](https://feastgood.com/macrofactor-vs-myfitnesspal/)
- [Fitness App UI Design Principles - Stormotion](https://stormotion.io/blog/fitness-app-ux/)
- [Best UX/UI Practices for Fitness Apps 2025 - Dataconomy](https://dataconomy.com/2025/11/11/best-ux-ui-practices-for-fitness-apps-retaining-and-re-engaging-users/)
- [User Perspectives of Diet-Tracking Apps - PMC/NIH](https://pmc.ncbi.nlm.nih.gov/articles/PMC8103297/)
- [Best Nutrition Tracking Apps 2026 - Nutrisense](https://www.nutrisense.io/blog/apps-to-track-nutrition)

---
*Feature research for: Protein tracking in GymTrack v1.1*
*Researched: 2026-03-07*

# Pitfalls Research

**Domain:** Adding protein/meal tracking to an existing React Native gym app (GymTrack v1.1)
**Researched:** 2026-03-07
**Confidence:** HIGH

## Critical Pitfalls

### Pitfall 1: No Schema Migration Versioning -- Ad-hoc ALTER TABLE Will Break on Multi-version Upgrades

**What goes wrong:**
The existing `initDatabase()` in `src/db/database.ts` uses a try/catch around `ALTER TABLE` to add columns ("safe to fail if already exists"). This pattern works for a single migration but becomes unmanageable as new tables and columns accumulate across releases. Users who skip an app version get partial migrations. There is no way to know which migrations have run, and the order of operations becomes fragile.

**Why it happens:**
The v1.0 app had a single schema -- no migrations were needed. The one ALTER TABLE for `measurement_type` was simple enough to wrap in try/catch. Developers naturally extend this pattern ("just add another try/catch") without realizing the approach does not scale. By v1.1 (protein tables) and any future features, the init function becomes a pile of unversioned, unordered statements that may or may not have run on any given user's device.

**How to avoid:**
Implement a proper migration system before adding protein tables. Use SQLite's `PRAGMA user_version` to track the current schema version (note: on Android with `react-native-sqlite-storage`, reading `PRAGMA user_version` can return errors, but *setting* it works on both platforms -- so use a dedicated `schema_version` table as the read mechanism and `PRAGMA user_version` as a fallback/sanity check). Define migrations as an ordered array:

```typescript
const MIGRATIONS = [
  // v1: baseline (existing schema, already applied on all devices)
  { version: 1, up: (tx) => { /* no-op, tables created by CREATE IF NOT EXISTS */ } },
  // v2: protein tracking tables
  { version: 2, up: (tx) => {
    tx.executeSql(`CREATE TABLE IF NOT EXISTS meals (...)`);
    tx.executeSql(`CREATE TABLE IF NOT EXISTS protein_goals (...)`);
  }},
];
```

Run only migrations with version > current stored version, in order, inside a single transaction. Update the stored version after each successful migration.

**Warning signs:**
- More than two try/catch ALTER TABLE blocks in `initDatabase()`
- A bug report where a user's data is missing columns or tables
- Different behavior between fresh installs and upgrades

**Phase to address:**
Phase 1 (Schema & Data Layer) -- migration system must exist before any new tables are created.

---

### Pitfall 2: Storing Meal Timestamps in UTC Without Local-Date Indexing -- "Today's Meals" Query Breaks Across Timezones and DST

**What goes wrong:**
The existing codebase stores all timestamps as ISO 8601 UTC strings (`new Date().toISOString()`). This works fine for workout sessions where you just need chronological order. But protein tracking requires "daily" aggregation -- "how much protein did I eat today?" If you query `WHERE logged_at >= '2026-03-07T00:00:00.000Z' AND logged_at < '2026-03-08T00:00:00.000Z'`, a user in UTC-5 sees meals from 7 PM yesterday through 7 PM today instead of their actual midnight-to-midnight window. During DST transitions, the offset shifts and the window is 23 or 25 hours long.

**Why it happens:**
Developers store UTC (which is correct for ordering and deduplication) but then naively use UTC boundaries for daily grouping. SQLite has no built-in timezone support, so developers assume "just use UTC everywhere" solves everything. It does not solve daily aggregation for local users.

**How to avoid:**
Store a `local_date TEXT` column (format: `YYYY-MM-DD`) alongside the UTC `logged_at` timestamp on every meal row. Compute it at insert time using the device's local timezone:

```typescript
const localDate = new Date().toLocaleDateString('en-CA'); // 'YYYY-MM-DD' format
```

Use `local_date` for all "today" queries, daily aggregation, and chart grouping. Use `logged_at` (UTC) for precise ordering within a day and for export. Index the `local_date` column for fast daily lookups.

This approach is simple, avoids runtime timezone conversion in SQL, and correctly handles DST because the local date is captured at the moment of logging.

**Warning signs:**
- "Today's" meal list shows yesterday's late-night meal or is missing this morning's entry
- Daily protein total changes when the user crosses a timezone (travel)
- Unit tests pass (they run in UTC) but real-device testing shows wrong grouping

**Phase to address:**
Phase 1 (Schema & Data Layer) -- the `local_date` column must be part of the initial meal table schema.

---

### Pitfall 3: react-native-chart-kit Performance Collapse With Growing Protein History Data

**What goes wrong:**
The app already uses `react-native-chart-kit` for exercise progress charts. This library has a documented, unfixed performance problem: it uses `Math.random()` for React keys on chart elements (dots, segments), causing React to destroy and recreate every element on every render instead of diffing. With 200+ data points, renders take 2-3 seconds and block the JS thread, freezing the entire app. For protein intake charted daily over 6+ months, that is 180+ data points -- enough to trigger visible lag.

The library appears no longer actively maintained (last meaningful commit was years ago, critical performance issues remain open).

**Why it happens:**
The library works fine with small datasets (10-30 points), which is common in early development and testing. The problem only surfaces after weeks or months of real usage, by which point the charting code is deeply integrated. Developers test with a handful of data points and ship.

**How to avoid:**
Two options, in order of preference:

1. **Downsample before rendering.** Limit chart data to ~60 points maximum. For "All time" views, aggregate to weekly averages. For 6-month views, use daily values (max ~180 points, but disable dots). Apply the same settings the exercise chart already uses: `withDots={filteredProgress.length <= 10}`, `withInnerLines={false}`, `withOuterLines={false}`, `withShadow={false}`.

2. **Stay with react-native-chart-kit for now** (since it is already a dependency) but add explicit data point limits. Do not introduce a second charting library for protein alone -- the consistency is worth the tradeoff. If performance becomes unacceptable even with downsampling, the migration path is to `react-native-gifted-charts` (actively maintained, SVG-based, similar API surface) or `victory-native` (Skia-based, better performance, but adds `react-native-reanimated` and `@shopify/react-native-skia` as peer deps).

**Warning signs:**
- Chart screen takes >500ms to appear after navigation
- JS thread drops below 30fps when switching chart time filters
- Users with 3+ months of data report the protein tab is "slow"

**Phase to address:**
Phase 3 (Chart & History) -- implement data downsampling from the start, not as a later optimization.

---

### Pitfall 4: The "Add Meal" Modal Requires Too Many Taps -- Violating the App's Core UX Principle

**What goes wrong:**
The app's #1 UX constraint is speed of data entry ("log weight + reps in two taps"). If the protein "Add Meal" modal requires: (1) open modal, (2) type description, (3) tap protein field, (4) type grams, (5) confirm -- that is already more friction than the core workout flow. If the description field is required, or the keyboard covers the confirm button, or the user has to scroll, the feature becomes annoying enough that users stop logging meals.

Research on nutrition logging apps consistently shows that excessive friction in food entry is the #1 reason users abandon tracking. MyFitnessPal community discussions reveal users routinely skip logging meals that are "too much work to enter."

**Why it happens:**
Developers design the modal with data completeness in mind (capture everything) rather than speed in mind (capture the essential thing fast). The protein tracking feature is secondary to workouts, so it gets less UX scrutiny. The existing modals in the app (CreateProgramModal, AddExerciseModal, AddDayModal) have more fields because they are used infrequently -- but meal logging happens 3-6 times per day.

**How to avoid:**
Design the Add Meal modal for the common case: protein amount is the only required field. Description is optional. The modal should:
- Auto-focus the protein grams numeric input on open (keyboard appears immediately)
- Use `keyboardType="numeric"` so the number pad shows, not the full keyboard
- Place the confirm button above the keyboard (use `KeyboardAvoidingView` or absolute positioning)
- Allow submission with the keyboard "Done" / return key (no need to tap a separate button)
- Show the daily progress bar in the modal header so the user gets instant feedback

Target: log a meal in under 3 seconds (open modal, type number, tap confirm).

**Warning signs:**
- The confirm button is hidden behind the keyboard on smaller screens
- Description field is `required` or positioned before the protein field
- Users must dismiss the keyboard to reach the confirm button
- No numeric keyboard -- user sees full QWERTY for a number-only input

**Phase to address:**
Phase 2 (Protein Tab & Meal Logging UI) -- this must be designed correctly from the start, not iterated on later.

---

### Pitfall 5: Daily Protein Goal Reset Logic Fails at Midnight Edge Cases

**What goes wrong:**
The progress bar shows "X / 200g" for today. But "today" is ambiguous at the boundary:
- A meal logged at 11:58 PM counts for today. The user opens the app at 12:02 AM -- the progress bar should show 0g (new day), but if the query uses a stale cached "today" date string, it still shows yesterday's total.
- The app is open at 11:59 PM with 180g showing. The user does not close the app. At 12:01 AM, the progress bar still shows 180g until the screen re-renders or the user navigates away and back.
- `useFocusEffect` (the pattern used throughout the app) only fires when the screen gains focus, not when midnight passes while the screen is visible.

**Why it happens:**
The existing app does not have any daily-reset logic -- workout sessions span arbitrary periods and are not grouped by day. "Today" is a new concept for this codebase. Developers compute `today = new Date().toLocaleDateString('en-CA')` once during component mount or focus, and never update it.

**How to avoid:**
- Compute the `local_date` for "today" at query time, not at mount time.
- On the Protein screen, use `useFocusEffect` to refetch data (consistent with existing patterns), which handles the common case of the user leaving and returning.
- For the midnight-while-visible edge case: add a simple interval check (every 60 seconds) that compares the current local date against the date used for the last query. If it changed, refetch. This is cheap and handles the edge without overcomplicating the architecture.
- Do NOT try to solve this with a background timer or system clock listener -- those add complexity disproportionate to the problem.

**Warning signs:**
- Yesterday's meals appear in "Today" after midnight
- The progress bar jumps when the user navigates away and back at 12:01 AM
- Tests pass because they complete in <1 second and never cross midnight

**Phase to address:**
Phase 2 (Protein Tab UI) -- the screen component must include the date-check interval from the start.

---

## Technical Debt Patterns

Shortcuts that seem reasonable but create long-term problems.

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Storing protein goal in AsyncStorage instead of SQLite | Faster to implement, no schema change | Cannot join with meal data, separate backup/export path, inconsistent storage layer | Never -- the app already uses SQLite for everything; mixing storage backends creates maintenance burden |
| Hardcoding the protein goal (e.g., 200g) instead of making it configurable | Skip the settings UI | Users with different body weights need different goals; must rewrite the query layer later to parameterize | Only in the very first development iteration, replace within the same phase |
| Skipping the `local_date` column and computing day boundaries in JS | Simpler schema, fewer columns | Every query that needs "today" must compute timezone-adjusted boundaries in JS, which is error-prone and not indexable | Never -- the column costs nothing and prevents an entire class of bugs |
| Using a flat list for meal history instead of SectionList grouped by date | Simpler component code | When users view multi-day history, all meals run together without date headers; editing a past-day meal is confusing | Only if the scope is strictly "today only" with no history view |
| Duplicating the chart component instead of extracting a shared chart wrapper | Ship faster, no refactoring of exercise progress chart | Two chart components that diverge in style, config, and bug fixes | Acceptable for initial development, extract shared component in polish phase |

## Integration Gotchas

Common mistakes when integrating protein tracking with the existing GymTrack codebase.

| Integration Point | Common Mistake | Correct Approach |
|-------------------|----------------|------------------|
| Tab Navigator (4 -> 5 tabs) | Adding the 5th tab without adjusting tab bar height or label sizing, resulting in cramped labels | Test on smallest supported screen (5" device). Android bottom tabs support max 5 tabs natively. Reduce label font size if needed, or hide labels and use icon-only with tooltips. The current tab bar height (60 + bottomInset) may need a slight increase. |
| Data Export (`exportAllData()`) | Forgetting to include meal and protein goal data in the JSON export | Add meals and protein_goals tables to the export function in `src/db/dashboard.ts`. Users expect backup to capture ALL app data. |
| `initDatabase()` function | Adding new `CREATE TABLE IF NOT EXISTS` statements alongside the migration system | All new tables should be created through the migration system, not as standalone CREATE TABLE calls. The migration system handles both fresh installs and upgrades uniformly. |
| TypeScript types (`src/types/index.ts`) | Defining meal types that do not follow existing naming conventions (e.g., using `timestamp` instead of `loggedAt`, or `amount` instead of a more specific name) | Follow existing patterns: use camelCase property names, match the `loggedAt` / `createdAt` timestamp naming, use explicit type names like `proteinGrams` rather than ambiguous `amount`. |
| Theme and styling | Using different card styles, spacing, or colors for the protein tab compared to existing screens | Import and use `colors`, `spacing`, `fontSize` from existing theme files. Match the card style from `DashboardScreen` and `ExerciseProgressScreen`. |

## Performance Traps

Patterns that work at small scale but fail as usage grows.

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Querying all meals for chart data without date filtering | Chart renders slowly, JS thread blocked | Always filter by date range before passing to chart component. Use SQL `WHERE local_date >= ?` with appropriate range. | ~90 days of data (270+ meals at 3/day) |
| Re-rendering the entire meal list on every protein entry | Visible flicker, slow response after adding a meal | Use `FlatList` with stable `keyExtractor` and `React.memo` on list items. Append new meal to state without refetching the full list. | ~20 meals visible (unlikely in one day, but matters for history view) |
| Running daily aggregation query on every render instead of caching | Noticeable delay opening the protein tab, especially on older devices | Cache today's total in component state. Update incrementally when meals are added/edited/deleted. Refetch only on focus or midnight reset. | Immediate on low-end Android devices with 50+ meals in DB |
| LineChart rendering all data points with dots enabled | Dots overlap, SVG becomes complex, render time spikes | Disable dots when data points exceed 10-15 (the exercise chart already does this). Downsample data for long time ranges. | ~30 data points with dots enabled |

## UX Pitfalls

Common user experience mistakes in nutrition tracking for fitness apps.

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| Requiring meal description before protein amount | User must think of what to name the meal before logging the number they care about -- adds friction, slows logging | Make protein grams the first and only required field. Description is optional, positioned below. |
| No visual feedback after logging a meal | User is unsure if the entry was saved -- may log duplicates | Dismiss modal with a brief success state (progress bar animation filling), or show the new meal immediately in the list below |
| Progress bar does not animate | Feels static and unresponsive compared to the rest of the app | Use `Animated` or `LayoutAnimation` to smoothly fill the progress bar when a meal is added. Match the "feel" of the rest timer animation. |
| Edit meal opens a full new screen instead of inline editing | User loses context of the meal list, disorienting navigation for a simple value change | Use the same modal pattern as "Add Meal" but pre-populated. Or allow inline tap-to-edit on the protein value directly in the list. |
| Chart and meal list on the same screen without clear section separation | Users cannot tell where the chart ends and the list begins, especially with few meals | Use section headers ("Today's Meals", "Intake History") and a visual divider. Match the section styling from `DashboardScreen`. |

## "Looks Done But Isn't" Checklist

Things that appear complete but are missing critical pieces.

- [ ] **Meal logging:** Often missing keyboard dismiss on background tap -- verify the modal closes the keyboard when user taps outside the input field
- [ ] **Daily progress bar:** Often missing the case where protein goal is 0 or unset -- verify it shows a "Set your goal" prompt instead of dividing by zero
- [ ] **Chart screen:** Often missing empty state for new users with no meal data -- verify it shows a meaningful message, not a blank area or a crash from empty dataset
- [ ] **Meal deletion:** Often missing the daily total recalculation after delete -- verify the progress bar updates immediately, not only on next focus
- [ ] **Meal editing:** Often missing validation that protein grams cannot be negative or unreasonably large (>1000g) -- verify input bounds
- [ ] **Data export:** Often missing the new meals table in the export -- verify exported JSON includes all meal entries and the protein goal
- [ ] **Tab navigator:** Often missing the icon rendering on older Android API levels -- verify the carrot SVG icon renders on API 26 (minimum supported)
- [ ] **Schema migration:** Often missing the "fresh install" path -- verify a brand new user gets both the existing tables AND the new protein tables in one init

## Recovery Strategies

When pitfalls occur despite prevention, how to recover.

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| No migration versioning (data loss on schema change) | HIGH | Add migration system retroactively. Set baseline version to 1 for existing installs. Assume all v1 tables exist. New migrations start at v2. Cannot recover already-lost data. |
| UTC-only timestamps (wrong daily grouping) | MEDIUM | Add `local_date` column via migration. Backfill by converting existing `logged_at` UTC timestamps to local dates using JS at migration time (approximate, but better than wrong). |
| Chart performance with large dataset | LOW | Add data downsampling. No data loss, pure presentation layer fix. Can be done at any time. |
| Overly complex Add Meal modal | LOW | Redesign the modal. Remove required fields, reorder inputs. No data migration needed. |
| Midnight reset bug | LOW | Add the 60-second date-check interval. Pure component-level fix, no data changes. |
| Missing data in export | LOW | Add the new tables to `exportAllData()`. Run the export again. No data was lost, just not exported. |

## Pitfall-to-Phase Mapping

How roadmap phases should address these pitfalls.

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| No schema migration versioning | Phase 1 (Schema & Data Layer) | Run `initDatabase()` on a device with v1.0 data, then verify new tables exist and old data is intact |
| UTC-only daily aggregation | Phase 1 (Schema & Data Layer) | Log a meal at 11:55 PM local time, check it appears in "today" not "tomorrow" |
| Chart performance collapse | Phase 3 (Chart & History) | Seed 365 days of meal data (1095 rows), verify chart renders in <1 second |
| Add Meal modal friction | Phase 2 (Protein Tab & Meal Logging) | Time the flow: tap "+" to meal saved. Must be <3 seconds with numeric entry. |
| Midnight reset edge case | Phase 2 (Protein Tab UI) | Open app at 11:59 PM with meals logged, wait until 12:01 AM, verify progress resets to 0 within 60 seconds |
| Missing data in export | Phase 1 (Schema & Data Layer) | Export data after logging meals, verify JSON contains `meals` array with all entries |
| Tab navigator crowding | Phase 2 (Protein Tab UI) | Screenshot on a 5" screen device, verify all 5 tab labels are legible and icons are not overlapping |
| Inconsistent styling | Phase 2 (Protein Tab UI) | Visual comparison of protein tab cards against dashboard cards -- colors, spacing, border radius must match |

## Sources

- [react-native-chart-kit Issue #132: Chart renders are VERY SLOW](https://github.com/indiespirit/react-native-chart-kit/issues/132) -- documents the `Math.random()` key bug causing full re-renders
- [react-native-chart-kit Issue #604: Axis cutting values with large datasets](https://github.com/indiespirit/react-native-chart-kit/issues/604) -- axis overflow with many data points
- [A React Native SQLite Database Upgrade Strategy](https://embusinessproducts.com/react-native-sqlite-database-upgrade-strategy) -- sequential versioned migration pattern
- [SQLite migrations gist for react-native-sqlite-storage](https://gist.github.com/spruce-bruce/97ed3d0fddab3a93082b71c228c7e5a8) -- PRAGMA user_version migration implementation
- [react-native-sqlite-storage Issue #157: Schema migration](https://github.com/andpor/react-native-sqlite-storage/issues/157) -- community discussion on migration approaches, Android PRAGMA read bug
- [SQLite Date and Time Functions](https://sqlite.org/lang_datefunc.html) -- official docs confirming UTC-only internal handling
- [MyFitnessPal Community: Change calorie reset time](https://community.myfitnesspal.com/en/discussion/10862758/change-time-calories-reset) -- real-world midnight reset timezone issues
- [MyFitnessPal Community: Tracking for overnight workers](https://community.myfitnesspal.com/en/discussion/10909379/tracking-for-overnight-workers) -- day boundary edge cases in nutrition apps
- [PubMed: Food logging app usability challenges](https://pubmed.ncbi.nlm.nih.gov/30184514/) -- users omit 18% of food items due to entry friction
- [PMC: Barriers to and Facilitators for Using Nutrition Apps](https://pmc.ncbi.nlm.nih.gov/articles/PMC8409150/) -- usability as primary barrier to adoption
- [Top Charting Solutions for React Native 2025](https://itnext.io/react-native-echarts-victory-native-or-react-native-chart-kit-deciphering-the-ideal-charting-90cbd22b0da3) -- chart library comparison with performance benchmarks
- [React Navigation: Bottom Tab Navigator docs](https://reactnavigation.org/docs/bottom-tab-navigator/) -- Android 5-tab limit documentation

---
*Pitfalls research for: Adding protein tracking to GymTrack v1.1*
*Researched: 2026-03-07*