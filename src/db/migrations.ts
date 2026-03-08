import { SQLiteDatabase, Transaction } from 'react-native-sqlite-storage';
import { executeSql } from './database';

/**
 * A single schema migration with a version number and DDL statements.
 */
interface Migration {
  version: number;
  description: string;
  up: (tx: Transaction) => void;
}

/**
 * All schema migrations, ordered by version.
 *
 * - Version 1: Create all 7 base tables (v1.0 schema)
 * - Version 2: Add measurement_type column to exercises
 * - Version 3: Create protein domain tables (meals, protein_settings)
 */
const MIGRATIONS: Migration[] = [
  {
    version: 1,
    description: 'Create base tables (exercises, sessions, sets, programs)',
    up: (tx: Transaction) => {
      tx.executeSql(`
        CREATE TABLE IF NOT EXISTS exercises (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          category TEXT NOT NULL,
          default_rest_seconds INTEGER NOT NULL DEFAULT 90,
          is_custom INTEGER NOT NULL DEFAULT 0,
          measurement_type TEXT NOT NULL DEFAULT 'reps',
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
  {
    version: 2,
    description: 'Add measurement_type column to exercises',
    up: (tx: Transaction) => {
      tx.executeSql(
        "ALTER TABLE exercises ADD COLUMN measurement_type TEXT NOT NULL DEFAULT 'reps'",
      );
    },
  },
  {
    version: 3,
    description: 'Create protein domain tables (meals, protein_settings)',
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
];

/**
 * Get the current schema version from the schema_version table.
 * Creates the table if it doesn't exist. Returns 0 if no version recorded.
 */
async function getCurrentVersion(database: SQLiteDatabase): Promise<number> {
  await executeSql(
    database,
    'CREATE TABLE IF NOT EXISTS schema_version (version INTEGER NOT NULL)',
  );
  const result = await executeSql(
    database,
    'SELECT MAX(version) as max_version FROM schema_version',
  );
  if (result.rows.length > 0) {
    const maxVersion = result.rows.item(0).max_version;
    return maxVersion ?? 0;
  }
  return 0;
}

/**
 * Detect and bootstrap pre-migration databases.
 *
 * If the exercises table exists but schema_version does not, this is a
 * v1.0 database that was created before the migration system. In that case,
 * we create the schema_version table and insert version 2 (migrations 1 and 2
 * were effectively already applied by the old initDatabase + ALTER TABLE).
 */
async function bootstrapExistingDatabase(
  database: SQLiteDatabase,
): Promise<void> {
  // Check if exercises table exists (sign of pre-migration database)
  const tablesResult = await executeSql(
    database,
    "SELECT name FROM sqlite_master WHERE type='table' AND name='exercises'",
  );
  const hasExercises = tablesResult.rows.length > 0;

  // Check if schema_version table exists (sign of migration system)
  const versionResult = await executeSql(
    database,
    "SELECT name FROM sqlite_master WHERE type='table' AND name='schema_version'",
  );
  const hasSchemaVersion = versionResult.rows.length > 0;

  if (hasExercises && !hasSchemaVersion) {
    // Pre-migration database detected: migrations 1 and 2 already applied
    await executeSql(
      database,
      'CREATE TABLE IF NOT EXISTS schema_version (version INTEGER NOT NULL)',
    );
    await executeSql(
      database,
      'INSERT INTO schema_version (version) VALUES (?)',
      [2],
    );
  }
}

/**
 * Run all pending schema migrations.
 *
 * Handles both fresh installs (version 0 -> latest) and upgrades from
 * pre-migration databases (bootstrap to version 2, then run remaining).
 *
 * Each migration's DDL runs inside a transaction. The version is recorded
 * separately after the transaction completes (per SQLite best practice:
 * DDL in transactions is supported but keeping version tracking separate
 * avoids edge cases).
 */
export async function runMigrations(database: SQLiteDatabase): Promise<void> {
  // Bootstrap pre-migration databases before checking version
  await bootstrapExistingDatabase(database);

  const currentVersion = await getCurrentVersion(database);

  // Filter to pending migrations and sort ascending
  const pending = MIGRATIONS.filter(m => m.version > currentVersion).sort(
    (a, b) => a.version - b.version,
  );

  for (const migration of pending) {
    // Run DDL inside a transaction
    await database.transaction(migration.up);

    // Record version outside the DDL transaction
    await executeSql(
      database,
      'INSERT INTO schema_version (version) VALUES (?)',
      [migration.version],
    );
  }
}
