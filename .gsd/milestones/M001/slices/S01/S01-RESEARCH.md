# Phase 4: Data Foundation - Research

**Researched:** 2026-03-07
**Domain:** SQLite schema migration system, protein data layer, local-date boundary handling
**Confidence:** HIGH

## Summary

Phase 4 builds a versioned schema migration system that retrofits all existing v1.0 tables and adds new protein-tracking tables (meals, protein_settings). The migration system replaces the current `CREATE TABLE IF NOT EXISTS` + try/catch `ALTER TABLE` pattern with a sequential version-based runner. Additionally, a protein repository module provides CRUD operations for meals and protein goals, with local-date derivation ensuring correct day-boundary aggregation.

The existing codebase provides strong foundations: `executeSql()` and `runTransaction()` wrappers, the singleton `db` promise pattern, and established repository conventions (standalone async exports, `rowToX()` mappers, snake_case-to-camelCase conversion). The migration system slots directly into the existing `initDatabase()` function, and the protein repository follows the identical pattern seen in `sessions.ts`, `exercises.ts`, `programs.ts`, and `dashboard.ts`.

**Primary recommendation:** Build a simple sequential migration runner using a `schema_version` table, define migrations 1-3 as TypeScript functions (v1=base tables, v2=measurement_type column, v3=protein tables), and store `local_date` as a pre-computed TEXT column derived at insert/update time using JavaScript's local date components -- not `toISOString()` which converts to UTC.

<user_constraints>

## User Constraints (from CONTEXT.md)

### Locked Decisions
- Meal record shape: id, protein_grams (REAL), description (TEXT), meal_type (TEXT enum: breakfast/lunch/dinner/snack -- required, no default), logged_at (TEXT -- user-selectable datetime, defaults to now but allows custom time), local_date (TEXT -- derived YYYY-MM-DD)
- meal_type is required -- user must pick one each time (no auto-default)
- Optional custom time on add -- users can backdate meals
- v1.1 schema is protein-only -- no v2 macro columns now
- Add v2 columns later via migration system
- Retrofit ALL existing v1.0 tables into the versioned migration system
- Replace the try/catch ALTER TABLE hack with a proper migration
- Migration version 1: create base tables (exercises, workout_sessions, etc.)
- Migration version 2: add measurement_type column to exercises
- Migration version 3+: protein tables (meals, protein_settings)
- Use schema_version table (not PRAGMA user_version) for version tracking
- Default protein goal: 200g (shown as placeholder/suggestion, not pre-populated)
- No settings row created until user explicitly sets their goal
- Goal-setting is REQUIRED before meal logging
- Goal stored as single current value (REAL) -- no change history
- protein_settings: single row with daily_goal_grams (REAL), created_at (TEXT), updated_at (TEXT)
- Row only exists after user sets their goal

### Claude's Discretion
- Migration runner implementation details (sequential numbered functions, file-based, etc.)
- schema_version table structure
- Local-date derivation strategy (store alongside UTC, or compute at query time)
- Repository function signatures and return types
- Error handling patterns for migration failures
- Transaction boundaries for multi-statement migrations

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope

</user_constraints>

<phase_requirements>

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| DATA-01 | Protein data persists in local SQLite with proper schema migration | Migration system design (schema_version table + sequential runner), protein table DDL, repository CRUD functions |
| DATA-02 | Daily aggregation uses local date (not UTC) for correct day boundaries | Local-date derivation strategy (pre-computed local_date column), getLocalDateString() utility, query patterns using WHERE local_date = ? |

</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| react-native-sqlite-storage | 6.0.1 | SQLite database access | Already in use; all DB code built on this |
| TypeScript | 5.8.3 | Type safety for migration definitions and repository | Already in use project-wide |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| (none new) | - | - | Zero new npm dependencies per user constraint |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| schema_version table | PRAGMA user_version | User explicitly chose schema_version table; PRAGMA has Android-specific read issues noted in STATE.md |
| Pre-computed local_date column | SQLite localtime modifier at query time | Pre-computed is simpler, faster for queries, and avoids SQLite timezone configuration issues on Android |
| File-based migrations (.sql files) | TypeScript function migrations | TS functions work with existing executeSql/runTransaction wrappers; no file-loading complexity in RN |

## Architecture Patterns

### Recommended Project Structure
```
src/
├── db/
│   ├── database.ts          # Existing: db singleton, executeSql, runTransaction
│   ├── migrations.ts         # NEW: migration runner + migration definitions
│   ├── schema.ts             # Existing: keep for reference, but migrations now own DDL
│   ├── protein.ts            # NEW: protein repository (meals + settings CRUD)
│   ├── sessions.ts           # Existing: unchanged
│   ├── exercises.ts          # Existing: unchanged
│   ├── programs.ts           # Existing: unchanged
│   ├── dashboard.ts          # Existing: unchanged
│   ├── sets.ts               # Existing: unchanged
│   ├── seed.ts               # Existing: unchanged
│   └── index.ts              # Existing: add protein exports
├── types/
│   └── index.ts              # Existing: add Meal, ProteinSettings, ProteinChartPoint types
└── utils/
    └── dates.ts              # NEW: getLocalDateString() utility
```

### Pattern 1: Sequential Migration Runner
**What:** A function that reads current schema version, runs all pending migrations in order, and updates the version number.
**When to use:** Called once from `initDatabase()` on every app launch.
**Example:**
```typescript
// src/db/migrations.ts

import { SQLiteDatabase, Transaction } from 'react-native-sqlite-storage';
import { executeSql, runTransaction } from './database';

interface Migration {
  version: number;
  description: string;
  up: (tx: Transaction) => void;
}

const MIGRATIONS: Migration[] = [
  {
    version: 1,
    description: 'Create base tables (exercises, workout_sessions, workout_sets, exercise_sessions, programs, program_days, program_day_exercises)',
    up: (tx: Transaction) => {
      tx.executeSql(`CREATE TABLE IF NOT EXISTS exercises (...)`);
      tx.executeSql(`CREATE TABLE IF NOT EXISTS workout_sessions (...)`);
      tx.executeSql(`CREATE TABLE IF NOT EXISTS workout_sets (...)`);
      tx.executeSql(`CREATE TABLE IF NOT EXISTS exercise_sessions (...)`);
      tx.executeSql(`CREATE TABLE IF NOT EXISTS programs (...)`);
      tx.executeSql(`CREATE TABLE IF NOT EXISTS program_days (...)`);
      tx.executeSql(`CREATE TABLE IF NOT EXISTS program_day_exercises (...)`);
    },
  },
  {
    version: 2,
    description: 'Add measurement_type column to exercises',
    up: (tx: Transaction) => {
      tx.executeSql(
        "ALTER TABLE exercises ADD COLUMN measurement_type TEXT NOT NULL DEFAULT 'reps'"
      );
    },
  },
  {
    version: 3,
    description: 'Create protein tables (meals, protein_settings)',
    up: (tx: Transaction) => {
      tx.executeSql(`CREATE TABLE IF NOT EXISTS meals (...)`);
      tx.executeSql(`CREATE TABLE IF NOT EXISTS protein_settings (...)`);
    },
  },
];

async function getCurrentVersion(database: SQLiteDatabase): Promise<number> {
  // Create schema_version table if not exists
  await executeSql(database,
    'CREATE TABLE IF NOT EXISTS schema_version (version INTEGER NOT NULL)'
  );
  const result = await executeSql(database,
    'SELECT MAX(version) as current_version FROM schema_version'
  );
  const row = result.rows.item(0);
  return row.current_version ?? 0;
}

export async function runMigrations(database: SQLiteDatabase): Promise<void> {
  const currentVersion = await getCurrentVersion(database);

  const pending = MIGRATIONS
    .filter(m => m.version > currentVersion)
    .sort((a, b) => a.version - b.version);

  for (const migration of pending) {
    await database.transaction((tx: Transaction) => {
      migration.up(tx);
    });
    // Record version outside the DDL transaction
    await executeSql(database,
      'INSERT INTO schema_version (version) VALUES (?)',
      [migration.version]
    );
  }
}
```

### Pattern 2: Pre-Computed Local Date Column
**What:** Derive `local_date` (YYYY-MM-DD) from the user's local timezone at insert/update time and store it as a TEXT column alongside the UTC `logged_at` timestamp.
**When to use:** Any table that needs day-boundary grouping in the user's local timezone.
**Example:**
```typescript
// src/utils/dates.ts

/**
 * Get the local date as YYYY-MM-DD string.
 * Uses local date components (NOT toISOString() which converts to UTC).
 *
 * Critical for day-boundary correctness:
 * A meal logged at 11:30 PM EST must show as today's date,
 * not tomorrow (which toISOString() would produce for EST = UTC-5).
 */
export function getLocalDateString(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Get the local datetime as ISO-like string for logged_at.
 * Format: YYYY-MM-DDTHH:MM:SS (no Z suffix, indicates local time).
 */
export function getLocalDateTimeString(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`;
}
```

### Pattern 3: Protein Repository (Following Existing Conventions)
**What:** A repository module matching the established pattern in sessions.ts, exercises.ts, etc.
**When to use:** All protein data access.
**Example:**
```typescript
// src/db/protein.ts — follows exact pattern from sessions.ts / exercises.ts

import { db, executeSql } from './database';
import { Meal, ProteinSettings, ProteinChartPoint } from '../types';
import { getLocalDateString, getLocalDateTimeString } from '../utils/dates';

function rowToMeal(row: {
  id: number;
  protein_grams: number;
  description: string;
  meal_type: string;
  logged_at: string;
  local_date: string;
  created_at: string;
}): Meal {
  return {
    id: row.id,
    proteinGrams: row.protein_grams,
    description: row.description,
    mealType: row.meal_type as MealType,
    loggedAt: row.logged_at,
    localDate: row.local_date,
    createdAt: row.created_at,
  };
}

// Repository functions: addMeal, updateMeal, deleteMeal,
// getMealsByDate, getProteinGoal, setProteinGoal, getChartData
```

### Anti-Patterns to Avoid
- **Using `new Date().toISOString()` for local_date:** This converts to UTC. A meal logged at 11:30 PM in UTC-5 would produce a date of the next day. Use `getLocalDateString()` instead.
- **Running ALTER TABLE inside a transaction on SQLite:** SQLite does support DDL in transactions, but some drivers have edge cases. The existing `database.transaction()` wrapper handles this correctly, but each migration should be wrapped in its own transaction (not all migrations in one).
- **Putting migration DDL and version-tracking INSERT in the same transaction:** Keep version recording as a separate statement after the migration transaction succeeds. This way, if the version INSERT fails, the migration still applied and can be detected/handled.
- **Adding v2 columns prematurely:** The user explicitly decided to keep schema lean. Do not add calories, carbs, or fats columns.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Date formatting (YYYY-MM-DD) | Complex date parsing/formatting library | Simple `getLocalDateString()` utility with `getFullYear()`/`getMonth()`/`getDate()` | No new dependencies needed; 4 lines of code; avoids Intl API inconsistencies on Android |
| UUID generation for meal IDs | Custom UUID generator | SQLite `INTEGER PRIMARY KEY AUTOINCREMENT` | Consistent with all existing tables; simpler; no collision concerns |
| Schema diffing/declarative migrations | Automatic schema diff tool | Simple sequential numbered migrations | Project has <10 tables; sequential is clearer and more predictable |

**Key insight:** The existing codebase already has all needed infrastructure (`executeSql`, `runTransaction`, `db` singleton). The migration system and protein repository are pure application logic -- no new libraries or build changes required.

## Common Pitfalls

### Pitfall 1: UTC vs Local Date Boundary Bug
**What goes wrong:** A user logs a meal at 11:30 PM local time. If `toISOString()` is used, the date portion becomes the next day in UTC (for negative UTC offsets like US timezones). The meal appears under "tomorrow" instead of "today".
**Why it happens:** `new Date().toISOString()` always converts to UTC. The existing codebase uses this pattern for all timestamps.
**How to avoid:** Use `getLocalDateString()` which extracts year/month/day from local time components. Store `local_date` as a pre-computed column. Query by `local_date` for all day-based aggregation.
**Warning signs:** Meals logged late at night showing under the wrong date during testing.

### Pitfall 2: Migration Idempotency for Existing Users
**What goes wrong:** Existing users already have all v1.0 tables created by `CREATE TABLE IF NOT EXISTS`. Migration 1 must not fail for them. Migration 2 (ALTER TABLE add measurement_type) must not fail for users who already have that column.
**Why it happens:** The current `initDatabase()` uses `IF NOT EXISTS` and try/catch, which is inherently idempotent. The new migration system must achieve the same safety for users upgrading.
**How to avoid:** For the first-time migration system deployment:
  1. Check if tables already exist before creating them (IF NOT EXISTS in migration 1)
  2. Check if measurement_type column already exists before ALTER TABLE (query PRAGMA table_info in migration 2)
  3. Detect existing databases by checking if any tables exist before the schema_version table exists -- if so, these are pre-migration users whose version should be bootstrapped to 2 (since they have all v1.0 tables + measurement_type)
**Warning signs:** App crashes on launch for existing users after update.

### Pitfall 3: Forgetting to Derive local_date on Update
**What goes wrong:** When a meal is updated (e.g., user changes the logged_at time to a different day), the `local_date` column is not recomputed, so aggregation queries still show the meal under the old date.
**Why it happens:** Update logic only changes the fields the user edited, forgetting to recalculate the derived column.
**How to avoid:** Always recalculate `local_date` from `logged_at` in the `updateMeal()` function. Make `getLocalDateString()` accept a Date parameter so it can derive from any datetime, not just "now".
**Warning signs:** Editing a meal's time to a different day doesn't move it in the day view.

### Pitfall 4: Transaction Callback vs Promise API Mismatch
**What goes wrong:** The `database.transaction()` method takes a synchronous callback that receives a `tx` object. Attempting to use `await` inside the callback or calling `tx.executeSql` with promises causes silent failures.
**Why it happens:** react-native-sqlite-storage's transaction callback is NOT async. The `tx.executeSql()` inside transactions uses callback-style (success/error callbacks), not the promise-based `database.executeSql()`.
**How to avoid:** Inside transaction callbacks, use `tx.executeSql(sql, params)` synchronously (the callback-style overload). For operations needing async results, use `executeSql()` outside the transaction.
**Warning signs:** Migrations appear to succeed but tables are not created.

### Pitfall 5: Bootstrapping Version for Pre-Migration Users
**What goes wrong:** A user with v1.0 data (tables already exist, measurement_type already added) installs the update. The migration system sees version 0 and tries to run migrations 1-3. Migration 2's ALTER TABLE fails because the column already exists.
**Why it happens:** No migration history exists for databases created before the migration system.
**How to avoid:** During bootstrap, detect if tables exist (query `sqlite_master`). If tables exist but `schema_version` does not, this is a pre-migration database. Insert version 2 into `schema_version` (indicating migrations 1 and 2 are already applied) and only run migration 3+.
**Warning signs:** Crashes with "duplicate column name" errors.

## Code Examples

### Complete schema_version Table
```sql
-- Simple: just track the max version number
CREATE TABLE IF NOT EXISTS schema_version (
  version INTEGER NOT NULL
);
```

### Migration 1: Base Tables (Copied from existing schema.ts)
```typescript
{
  version: 1,
  description: 'Create base tables',
  up: (tx: Transaction) => {
    tx.executeSql(`
      CREATE TABLE IF NOT EXISTS exercises (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        category TEXT NOT NULL,
        default_rest_seconds INTEGER NOT NULL DEFAULT 90,
        is_custom INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL
      )
    `);
    tx.executeSql(`
      CREATE TABLE IF NOT EXISTS workout_sessions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        started_at TEXT NOT NULL,
        completed_at TEXT,
        program_day_id INTEGER
      )
    `);
    tx.executeSql(`
      CREATE TABLE IF NOT EXISTS workout_sets (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        session_id INTEGER NOT NULL REFERENCES workout_sessions(id),
        exercise_id INTEGER NOT NULL REFERENCES exercises(id),
        set_number INTEGER NOT NULL,
        weight_kg REAL NOT NULL,
        reps INTEGER NOT NULL,
        logged_at TEXT NOT NULL,
        is_warmup INTEGER NOT NULL DEFAULT 0
      )
    `);
    tx.executeSql(`
      CREATE TABLE IF NOT EXISTS exercise_sessions (
        exercise_id INTEGER NOT NULL REFERENCES exercises(id),
        session_id INTEGER NOT NULL REFERENCES workout_sessions(id),
        is_complete INTEGER NOT NULL DEFAULT 0,
        rest_seconds INTEGER NOT NULL DEFAULT 90,
        PRIMARY KEY (exercise_id, session_id)
      )
    `);
    tx.executeSql(`
      CREATE TABLE IF NOT EXISTS programs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        weeks INTEGER NOT NULL,
        start_date TEXT,
        current_week INTEGER NOT NULL DEFAULT 1,
        created_at TEXT NOT NULL
      )
    `);
    tx.executeSql(`
      CREATE TABLE IF NOT EXISTS program_days (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        program_id INTEGER NOT NULL REFERENCES programs(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        sort_order INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL
      )
    `);
    tx.executeSql(`
      CREATE TABLE IF NOT EXISTS program_day_exercises (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        program_day_id INTEGER NOT NULL REFERENCES program_days(id) ON DELETE CASCADE,
        exercise_id INTEGER NOT NULL REFERENCES exercises(id),
        target_sets INTEGER NOT NULL DEFAULT 3,
        target_reps INTEGER NOT NULL DEFAULT 10,
        target_weight_kg REAL NOT NULL DEFAULT 0,
        sort_order INTEGER NOT NULL DEFAULT 0
      )
    `);
  },
},
```

### Migration 2: Add measurement_type (Safe for Existing Users)
```typescript
{
  version: 2,
  description: 'Add measurement_type column to exercises',
  up: (tx: Transaction) => {
    // Uses IF NOT EXISTS-style safety via the runner's bootstrap detection
    tx.executeSql(
      "ALTER TABLE exercises ADD COLUMN measurement_type TEXT NOT NULL DEFAULT 'reps'"
    );
  },
},
```

### Migration 3: Protein Tables
```typescript
{
  version: 3,
  description: 'Create protein tables (meals, protein_settings)',
  up: (tx: Transaction) => {
    tx.executeSql(`
      CREATE TABLE IF NOT EXISTS meals (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        protein_grams REAL NOT NULL,
        description TEXT NOT NULL,
        meal_type TEXT NOT NULL,
        logged_at TEXT NOT NULL,
        local_date TEXT NOT NULL,
        created_at TEXT NOT NULL
      )
    `);
    tx.executeSql(`
      CREATE TABLE IF NOT EXISTS protein_settings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        daily_goal_grams REAL NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )
    `);
  },
},
```

### Bootstrap Detection for Pre-Migration Databases
```typescript
async function bootstrapExistingDatabase(database: SQLiteDatabase): Promise<void> {
  // Check if exercises table exists (indicates pre-migration v1.0 database)
  const result = await executeSql(database,
    "SELECT COUNT(*) as cnt FROM sqlite_master WHERE type='table' AND name='exercises'"
  );
  const hasExistingTables = result.rows.item(0).cnt > 0;

  // Check if schema_version table already exists
  const svResult = await executeSql(database,
    "SELECT COUNT(*) as cnt FROM sqlite_master WHERE type='table' AND name='schema_version'"
  );
  const hasSchemaVersion = svResult.rows.item(0).cnt > 0;

  if (hasExistingTables && !hasSchemaVersion) {
    // Pre-migration database: tables exist from CREATE TABLE IF NOT EXISTS era
    // Bootstrap to version 2 (base tables + measurement_type already applied)
    await executeSql(database,
      'CREATE TABLE IF NOT EXISTS schema_version (version INTEGER NOT NULL)'
    );
    await executeSql(database,
      'INSERT INTO schema_version (version) VALUES (?)', [2]
    );
  }
}
```

### Revised initDatabase()
```typescript
export async function initDatabase(): Promise<void> {
  const database = await db;

  // Enable foreign key enforcement
  await executeSql(database, 'PRAGMA foreign_keys = ON');

  // Bootstrap existing databases (pre-migration system)
  await bootstrapExistingDatabase(database);

  // Run pending migrations
  await runMigrations(database);

  // Seed preset exercises if empty
  const { seedIfEmpty } = await import('./seed');
  await seedIfEmpty();
}
```

### TypeScript Types for Protein Domain
```typescript
// Added to src/types/index.ts

export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';

export const MEAL_TYPES: MealType[] = ['breakfast', 'lunch', 'dinner', 'snack'];

export interface Meal {
  id: number;
  proteinGrams: number;
  description: string;
  mealType: MealType;
  loggedAt: string;         // Local datetime string (YYYY-MM-DDTHH:MM:SS)
  localDate: string;        // YYYY-MM-DD for day-boundary queries
  createdAt: string;
}

export interface ProteinSettings {
  id: number;
  dailyGoalGrams: number;
  createdAt: string;
  updatedAt: string;
}

export interface ProteinChartPoint {
  date: string;             // YYYY-MM-DD
  totalProteinGrams: number;
  goalGrams: number | null; // null if no goal was set for that period
}
```

### Repository Function Signatures
```typescript
// src/db/protein.ts — complete API surface

// Meal CRUD
export async function addMeal(
  proteinGrams: number,
  description: string,
  mealType: MealType,
  loggedAt?: Date,          // Optional: defaults to now, allows backdating
): Promise<Meal>;

export async function updateMeal(
  id: number,
  proteinGrams: number,
  description: string,
  mealType: MealType,
  loggedAt: Date,
): Promise<Meal>;

export async function deleteMeal(id: number): Promise<void>;

// Queries
export async function getMealsByDate(localDate: string): Promise<Meal[]>;
// Returns meals for a given YYYY-MM-DD, ordered by logged_at DESC

// Goal management
export async function getProteinGoal(): Promise<number | null>;
// Returns daily_goal_grams or null if no goal set

export async function setProteinGoal(goalGrams: number): Promise<ProteinSettings>;
// Upserts: creates row if none exists, updates if exists

// Aggregation / chart data
export async function getDailyProteinTotals(
  startDate: string,   // YYYY-MM-DD
  endDate: string,     // YYYY-MM-DD
): Promise<ProteinChartPoint[]>;
// Returns daily aggregation for chart display

export async function getTodayProteinTotal(): Promise<number>;
// Convenience: SUM(protein_grams) WHERE local_date = today
```

### Day-Boundary Query Pattern
```typescript
// Querying meals for "today" using pre-computed local_date
export async function getMealsByDate(localDate: string): Promise<Meal[]> {
  const database = await db;
  const result = await executeSql(
    database,
    'SELECT * FROM meals WHERE local_date = ? ORDER BY logged_at DESC',
    [localDate],
  );
  const meals: Meal[] = [];
  for (let i = 0; i < result.rows.length; i++) {
    meals.push(rowToMeal(result.rows.item(i)));
  }
  return meals;
}

// Daily aggregation for charts
export async function getDailyProteinTotals(
  startDate: string,
  endDate: string,
): Promise<ProteinChartPoint[]> {
  const database = await db;
  const result = await executeSql(
    database,
    `SELECT local_date, SUM(protein_grams) as total_protein_grams
     FROM meals
     WHERE local_date >= ? AND local_date <= ?
     GROUP BY local_date
     ORDER BY local_date ASC`,
    [startDate, endDate],
  );
  // ... map rows to ProteinChartPoint
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| CREATE TABLE IF NOT EXISTS + try/catch ALTER | Versioned sequential migrations with schema_version table | This phase | All future schema changes go through migrations; no more ad-hoc ALTER hacks |
| `new Date().toISOString()` for all timestamps | `getLocalDateString()` for day-boundary columns, UTC ISO for general timestamps | This phase | Protein domain uses local dates; existing workout timestamps remain UTC (no migration needed) |
| Monolithic initDatabase() with inline DDL | initDatabase() delegates to runMigrations() | This phase | Cleaner separation; initDatabase becomes orchestrator |

**Note on existing timestamps:** The workout domain's existing UTC timestamps are correct for their use case (ordering, duration calculation). Only the protein domain needs local-date awareness for day-boundary grouping. No migration of existing timestamp data is needed.

## Open Questions

1. **logged_at storage format: local or UTC?**
   - What we know: The user wants `logged_at` as user-selectable datetime. Existing codebase stores all timestamps as UTC via `toISOString()`.
   - What's unclear: Should `logged_at` be stored as local time (breaking from existing convention) or UTC (maintaining consistency but requiring conversion for display)?
   - Recommendation: Store `logged_at` as local datetime string (no Z suffix) since the protein domain is isolated, `local_date` is derived from it, and the user-facing display should show local time. This avoids round-trip UTC conversion bugs. The existing workout domain keeps UTC -- the two domains are independent.

2. **Goal-setting enforcement: DB constraint or app logic?**
   - What we know: User decided goal-setting is REQUIRED before meal logging.
   - What's unclear: Should this be enforced via a DB trigger/constraint, or application-level check?
   - Recommendation: Application-level check in `addMeal()` -- query `protein_settings` first, throw if no row exists. DB triggers would add complexity without benefit in a single-app-writer scenario.

## Validation Architecture

> `workflow.nyquist_validation` is not set in config.json -- treating as enabled.

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Jest 29.x (preset: react-native) |
| Config file | `jest.config.js` |
| Quick run command | `npx jest --testPathPattern="protein\|migration" --no-coverage` |
| Full suite command | `npx jest --no-coverage` |

### Phase Requirements to Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| DATA-01 | Schema migration creates protein tables and tracks version | unit | `npx jest __tests__/migrations.test.ts -x` | No -- Wave 0 |
| DATA-01 | Protein repository CRUD (add/update/delete/query meals) | unit | `npx jest __tests__/protein.test.ts -x` | No -- Wave 0 |
| DATA-01 | Goal get/set operations work correctly | unit | `npx jest __tests__/protein.test.ts -x` | No -- Wave 0 |
| DATA-02 | Meal at 11:30 PM local appears under today's local_date | unit | `npx jest __tests__/dates.test.ts -x` | No -- Wave 0 |
| DATA-02 | getDailyProteinTotals groups by local_date correctly | unit | `npx jest __tests__/protein.test.ts -x` | No -- Wave 0 |

### Sampling Rate
- **Per task commit:** `npx jest --testPathPattern="protein|migration|dates" --no-coverage`
- **Per wave merge:** `npx jest --no-coverage`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `__tests__/migrations.test.ts` -- covers DATA-01 (migration system)
- [ ] `__tests__/protein.test.ts` -- covers DATA-01 (repository CRUD)
- [ ] `__tests__/dates.test.ts` -- covers DATA-02 (local date derivation)
- [ ] Jest mock for `react-native-sqlite-storage` -- needed since SQLite is native module

**Note:** Testing SQLite repository functions in a Jest unit test environment requires mocking `react-native-sqlite-storage` since it is a native module. The tests would verify TypeScript logic (date derivation, row mapping, query construction) but not actual SQLite execution. Actual SQLite correctness is validated by running the app and verifying the success criteria (meal at 11:30 PM appears under today).

## Sources

### Primary (HIGH confidence)
- Project source code: `src/db/database.ts`, `src/db/schema.ts`, `src/db/sessions.ts`, `src/db/exercises.ts`, `src/db/programs.ts`, `src/db/dashboard.ts`, `src/db/sets.ts`, `src/db/seed.ts`, `src/db/index.ts`, `src/types/index.ts`, `App.tsx`
- `.planning/phases/04-data-foundation/04-CONTEXT.md` -- locked user decisions
- `.planning/REQUIREMENTS.md` -- DATA-01, DATA-02 requirements
- `.planning/STATE.md` -- project state and accumulated decisions

### Secondary (MEDIUM confidence)
- [react-native-sqlite-storage GitHub](https://github.com/andpor/react-native-sqlite-storage) -- transaction API, executeSql signature
- [GitHub Gist: SQLite migrations for react-native](https://gist.github.com/spruce-bruce/97ed3d0fddab3a93082b71c228c7e5a8) -- migration runner pattern with schema_version table
- [React Native SQLite Database Upgrade Strategy](https://embusinessproducts.com/react-native-sqlite-database-upgrade-strategy) -- version tracking via version table, sequential execution
- [SQLite Official: Date and Time Functions](https://sqlite.org/lang_datefunc.html) -- localtime modifier behavior
- [MDN: Date](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date) -- getFullYear/getMonth/getDate for local date extraction

### Tertiary (LOW confidence)
- [Navigating SQLite Database Migrations in React Native (Medium)](https://medium.com/@hamzash863/navigating-sqlite-database-migrations-in-react-native-786d418655e6) -- general migration patterns (could not access full article)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- zero new dependencies; all patterns verified against existing codebase
- Architecture: HIGH -- migration pattern is well-established (multiple sources agree); repository follows existing project conventions exactly
- Pitfalls: HIGH -- UTC vs local date boundary issue is well-documented; bootstrap detection for existing users is a known migration challenge
- Local date derivation: HIGH -- using local date components (getFullYear/getMonth/getDate) is the standard approach; verified against MDN documentation

**Research date:** 2026-03-07
**Valid until:** 2026-04-07 (stable domain; no fast-moving library changes)