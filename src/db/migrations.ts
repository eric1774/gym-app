import { SQLiteDatabase, Transaction } from 'react-native-sqlite-storage';
import { executeSql } from './database';
import {
  CREATE_BADGES_TABLE,
  CREATE_USER_BADGES_TABLE,
  CREATE_STREAK_SHIELDS_TABLE,
  CREATE_USER_LEVEL_TABLE,
  CREATE_MUSCLE_GROUPS_TABLE,
  CREATE_EXERCISE_MUSCLE_GROUPS_TABLE,
} from './schema';

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
 * - Version 4: Create meal_library table
 * - Version 5: Add program_week to workout_sessions
 * - Version 6: Deduplicate exercises, re-point history to winners
 * - Version 7: Add superset_group_id column to program_day_exercises
 * - Version 8: Create heart_rate_samples table, add avg_hr/peak_hr to workout_sessions
 * - Version 9: Repair program_week values (migration 5 backfill set all to 1)
 * - Version 10: Add macro columns to meals/meal_library and create macro_settings table
 * - Version 11: Create water_logs and water_settings tables for hydration tracking
 * - Version 12: Create meal_foods table for multi-food meal builder
 * - Version 13: Add food_name column to meal_foods (missing from Phase 37 schema)
 * - Version 14: Remove all USDA food entries (is_custom = 0) from foods table
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
  {
    version: 4,
    description: 'Create meal_library table for saved meal templates',
    up: (tx: Transaction) => {
      tx.executeSql(`
        CREATE TABLE IF NOT EXISTS meal_library (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          protein_grams REAL NOT NULL,
          meal_type TEXT NOT NULL,
          created_at TEXT NOT NULL
        )
      `);
    },
  },
  {
    version: 5,
    description: 'Add program_week column to workout_sessions and backfill existing rows',
    up: (tx: Transaction) => {
      tx.executeSql(
        'ALTER TABLE workout_sessions ADD COLUMN program_week INTEGER',
      );
      tx.executeSql(
        'UPDATE workout_sessions SET program_week = 1 WHERE program_day_id IS NOT NULL AND program_week IS NULL',
      );
    },
  },
  {
    version: 6,
    description: 'Deduplicate exercises by name+category, re-point history to winners',
    up: (tx: Transaction) => {
      // Re-point workout_sets from duplicate exercise ids to the winner (lowest id per name+category)
      tx.executeSql(`
        UPDATE workout_sets
        SET exercise_id = (
          SELECT MIN(e2.id)
          FROM exercises e2
          WHERE e2.name = (SELECT e3.name FROM exercises e3 WHERE e3.id = workout_sets.exercise_id)
            AND e2.category = (SELECT e3.category FROM exercises e3 WHERE e3.id = workout_sets.exercise_id)
        )
        WHERE exercise_id NOT IN (
          SELECT MIN(id) FROM exercises GROUP BY name, category
        )
      `);

      // Re-point program_day_exercises from duplicates to winners
      tx.executeSql(`
        UPDATE program_day_exercises
        SET exercise_id = (
          SELECT MIN(e2.id)
          FROM exercises e2
          WHERE e2.name = (SELECT e3.name FROM exercises e3 WHERE e3.id = program_day_exercises.exercise_id)
            AND e2.category = (SELECT e3.category FROM exercises e3 WHERE e3.id = program_day_exercises.exercise_id)
        )
        WHERE exercise_id NOT IN (
          SELECT MIN(id) FROM exercises GROUP BY name, category
        )
      `);

      // For exercise_sessions: delete rows that would conflict with the winner,
      // then re-point the rest
      tx.executeSql(`
        DELETE FROM exercise_sessions
        WHERE exercise_id NOT IN (
          SELECT MIN(id) FROM exercises GROUP BY name, category
        )
        AND EXISTS (
          SELECT 1 FROM exercise_sessions es2
          WHERE es2.session_id = exercise_sessions.session_id
            AND es2.exercise_id = (
              SELECT MIN(e2.id)
              FROM exercises e2
              WHERE e2.name = (SELECT e3.name FROM exercises e3 WHERE e3.id = exercise_sessions.exercise_id)
                AND e2.category = (SELECT e3.category FROM exercises e3 WHERE e3.id = exercise_sessions.exercise_id)
            )
        )
      `);

      tx.executeSql(`
        UPDATE exercise_sessions
        SET exercise_id = (
          SELECT MIN(e2.id)
          FROM exercises e2
          WHERE e2.name = (SELECT e3.name FROM exercises e3 WHERE e3.id = exercise_sessions.exercise_id)
            AND e2.category = (SELECT e3.category FROM exercises e3 WHERE e3.id = exercise_sessions.exercise_id)
        )
        WHERE exercise_id NOT IN (
          SELECT MIN(id) FROM exercises GROUP BY name, category
        )
      `);

      // Now safe to delete duplicate exercise rows
      tx.executeSql(`
        DELETE FROM exercises
        WHERE id NOT IN (
          SELECT MIN(id) FROM exercises GROUP BY name, category
        )
      `);
    },
  },
  {
    version: 7,
    description: 'Add superset_group_id column to program_day_exercises',
    up: (tx: Transaction) => {
      tx.executeSql(
        'ALTER TABLE program_day_exercises ADD COLUMN superset_group_id INTEGER',
      );
    },
  },
  {
    version: 8,
    description: 'Create heart_rate_samples table and add avg_hr/peak_hr to workout_sessions',
    up: (tx: Transaction) => {
      tx.executeSql(`
        CREATE TABLE IF NOT EXISTS heart_rate_samples (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          session_id INTEGER NOT NULL REFERENCES workout_sessions(id) ON DELETE CASCADE,
          bpm INTEGER NOT NULL,
          recorded_at TEXT NOT NULL
        )
      `);
      tx.executeSql(
        'CREATE INDEX IF NOT EXISTS idx_hr_samples_session ON heart_rate_samples(session_id)',
      );
      tx.executeSql(
        'ALTER TABLE workout_sessions ADD COLUMN avg_hr REAL',
      );
      tx.executeSql(
        'ALTER TABLE workout_sessions ADD COLUMN peak_hr INTEGER',
      );
    },
  },
  {
    version: 9,
    description: 'Repair program_week: re-rank by completion order per day',
    up: (tx: Transaction) => {
      // Migration 5 backfilled all pre-existing sessions with program_week = 1.
      // This repairs the data by setting program_week = the rank of each session
      // among completions of the same program day, ordered by completed_at.
      // The nth completion of a given day becomes week n.
      // Uses a correlated subquery (no window functions) for SQLite compatibility.
      tx.executeSql(`
        UPDATE workout_sessions
        SET program_week = (
          SELECT COUNT(*)
          FROM workout_sessions ws2
          WHERE ws2.program_day_id = workout_sessions.program_day_id
            AND ws2.completed_at IS NOT NULL
            AND (ws2.completed_at < workout_sessions.completed_at
                 OR (ws2.completed_at = workout_sessions.completed_at
                     AND ws2.id <= workout_sessions.id))
        )
        WHERE program_day_id IS NOT NULL
          AND completed_at IS NOT NULL
      `);
    },
  },
  {
    version: 10,
    description: 'Add macro columns to meals/meal_library and create macro_settings table',
    up: (tx: Transaction) => {
      // Add carb_grams and fat_grams to meals table (per DB-01)
      tx.executeSql(
        'ALTER TABLE meals ADD COLUMN carb_grams REAL NOT NULL DEFAULT 0',
      );
      tx.executeSql(
        'ALTER TABLE meals ADD COLUMN fat_grams REAL NOT NULL DEFAULT 0',
      );

      // Add carb_grams and fat_grams to meal_library table (per DB-01)
      tx.executeSql(
        'ALTER TABLE meal_library ADD COLUMN carb_grams REAL NOT NULL DEFAULT 0',
      );
      tx.executeSql(
        'ALTER TABLE meal_library ADD COLUMN fat_grams REAL NOT NULL DEFAULT 0',
      );

      // Create macro_settings table (per DB-02, D-01)
      tx.executeSql(`
        CREATE TABLE IF NOT EXISTS macro_settings (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          protein_goal REAL,
          carb_goal REAL,
          fat_goal REAL,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        )
      `);

      // Backfill macro_settings from protein_settings if a row exists (per D-03)
      // Only creates a macro_settings row if protein_settings has data.
      // NULL carb_goal and fat_goal mean "not set yet" (per D-02).
      tx.executeSql(`
        INSERT INTO macro_settings (protein_goal, carb_goal, fat_goal, created_at, updated_at)
        SELECT daily_goal_grams, NULL, NULL, created_at, updated_at
        FROM protein_settings
        LIMIT 1
      `);
    },
  },
  {
    version: 11,
    description: 'Create water_logs and water_settings tables for hydration tracking',
    up: (tx: Transaction) => {
      tx.executeSql(`
        CREATE TABLE IF NOT EXISTS water_logs (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          amount_oz INTEGER NOT NULL,
          logged_at TEXT NOT NULL,
          local_date TEXT NOT NULL,
          created_at TEXT NOT NULL
        )
      `);
      tx.executeSql(`
        CREATE TABLE IF NOT EXISTS water_settings (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          goal_oz INTEGER,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        )
      `);
    },
  },
  {
    version: 12,
    description: 'Ensure meal_foods table exists with food_name column',
    up: (tx: Transaction) => {
      // Fresh installs: table doesn't exist yet — create with all columns.
      // Existing installs (original v12 from phase 37): table already exists
      // with food_name — CREATE TABLE IF NOT EXISTS is a safe no-op.
      tx.executeSql(`
        CREATE TABLE IF NOT EXISTS meal_foods (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          meal_id INTEGER NOT NULL REFERENCES meals(id) ON DELETE CASCADE,
          food_id INTEGER NOT NULL REFERENCES foods(id),
          food_name TEXT NOT NULL DEFAULT '',
          grams REAL NOT NULL,
          protein REAL NOT NULL,
          carbs REAL NOT NULL,
          fat REAL NOT NULL
        )
      `);
    },
  },
  {
    version: 13,
    description: 'Add food_name column to meal_foods if missing',
    up: (tx: Transaction) => {
      // Only ALTER if the column doesn't already exist. The original phase 37
      // migration created meal_foods WITH food_name, so devices that ran that
      // already have it. Checking PRAGMA avoids a "duplicate column" error that
      // crashes the transaction on some Android versions.
      tx.executeSql(
        'SELECT COUNT(*) as cnt FROM pragma_table_info(\'meal_foods\') WHERE name = \'food_name\'',
        [],
        (_tx, result) => {
          if (result.rows.item(0).cnt === 0) {
            _tx.executeSql(
              "ALTER TABLE meal_foods ADD COLUMN food_name TEXT NOT NULL DEFAULT ''",
            );
          }
        },
      );
    },
  },
  {
    version: 14,
    description: 'Ensure foods table exists and remove USDA entries',
    up: (tx: Transaction) => {
      // Create foods table if it doesn't exist (phone may not have had
      // the original phase 37 migration that created it).
      tx.executeSql(`
        CREATE TABLE IF NOT EXISTS foods (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          fdc_id INTEGER,
          name TEXT NOT NULL,
          category TEXT,
          protein_per_100g REAL NOT NULL,
          carbs_per_100g REAL NOT NULL,
          fat_per_100g REAL NOT NULL,
          search_text TEXT NOT NULL,
          is_custom INTEGER NOT NULL DEFAULT 0
        )
      `);
      tx.executeSql(
        'CREATE INDEX IF NOT EXISTS idx_foods_search_text ON foods(search_text)',
      );
      // Delete all USDA-seeded foods, preserving any user-created custom foods.
      // Historical meal_foods rows are unaffected (macros are snapshotted at log time).
      tx.executeSql('DELETE FROM foods WHERE is_custom = 0');
    },
  },
  {
    version: 15,
    description: 'Gamification: badges, user_badges, streak_shields, user_level tables',
    up: (tx: Transaction) => {
      tx.executeSql(CREATE_BADGES_TABLE);
      tx.executeSql(CREATE_USER_BADGES_TABLE);
      tx.executeSql(CREATE_STREAK_SHIELDS_TABLE);
      tx.executeSql(CREATE_USER_LEVEL_TABLE);
      tx.executeSql(
        `INSERT OR IGNORE INTO user_level (id, current_level, title, consistency_score, volume_score, nutrition_score, variety_score, last_calculated)
         VALUES (1, 1, 'Beginner', 0, 0, 0, 0, datetime('now'))`,
      );
      tx.executeSql(`CREATE INDEX IF NOT EXISTS idx_user_badges_badge_id ON user_badges(badge_id)`);
      tx.executeSql(`CREATE INDEX IF NOT EXISTS idx_streak_shields_type ON streak_shields(shield_type)`);
    },
  },
  {
    version: 16,
    description: 'Muscle groups: create tables, seed groups, map all exercises',
    up: (tx: Transaction) => {
      tx.executeSql(CREATE_MUSCLE_GROUPS_TABLE);
      tx.executeSql(CREATE_EXERCISE_MUSCLE_GROUPS_TABLE);
      tx.executeSql('CREATE INDEX IF NOT EXISTS idx_emg_exercise ON exercise_muscle_groups(exercise_id)');
      tx.executeSql('CREATE INDEX IF NOT EXISTS idx_emg_muscle_group ON exercise_muscle_groups(muscle_group_id)');

      // Seed muscle groups
      const groups: Array<[string, string, number]> = [
        // chest
        ['Upper Chest', 'chest', 1],
        ['Lower Chest', 'chest', 2],
        ['Chest', 'chest', 3],
        // back
        ['Lats', 'back', 1],
        ['Upper Back', 'back', 2],
        ['Lower Back', 'back', 3],
        ['Traps', 'back', 4],
        // legs
        ['Quads', 'legs', 1],
        ['Hamstrings', 'legs', 2],
        ['Glutes', 'legs', 3],
        ['Calves', 'legs', 4],
        ['Hip Flexors', 'legs', 5],
        // shoulders
        ['Front Delts', 'shoulders', 1],
        ['Side Delts', 'shoulders', 2],
        ['Rear Delts', 'shoulders', 3],
        // arms
        ['Biceps', 'arms', 1],
        ['Triceps', 'arms', 2],
        ['Forearms', 'arms', 3],
        // core
        ['Abs', 'core', 1],
        ['Obliques', 'core', 2],
        ['Lower Back', 'core', 3],
        // conditioning
        ['Cardio', 'conditioning', 1],
        ['Plyometrics', 'conditioning', 2],
        // stretching
        ['Upper Body Flexibility', 'stretching', 1],
        ['Lower Body Flexibility', 'stretching', 2],
        ['Hip Mobility', 'stretching', 3],
      ];

      for (const [name, parentCategory, sortOrder] of groups) {
        tx.executeSql(
          'INSERT INTO muscle_groups (name, parent_category, sort_order) VALUES (?, ?, ?)',
          [name, parentCategory, sortOrder],
        );
      }

      // Map preset exercises to muscle groups.
      const presetMappings: Array<[string, Array<[string, string, number]>]> = [
        // Chest
        ['Bench Press', [['Chest', 'chest', 1], ['Triceps', 'arms', 0], ['Front Delts', 'shoulders', 0]]],
        ['Incline Bench Press', [['Upper Chest', 'chest', 1], ['Triceps', 'arms', 0], ['Front Delts', 'shoulders', 0]]],
        ['Cable Fly', [['Chest', 'chest', 1]]],
        ['Push-Up', [['Chest', 'chest', 1], ['Triceps', 'arms', 0], ['Front Delts', 'shoulders', 0]]],
        ['Chest Dip', [['Lower Chest', 'chest', 1], ['Triceps', 'arms', 0]]],
        ['Decline Bench Press', [['Lower Chest', 'chest', 1], ['Triceps', 'arms', 0]]],
        // Back
        ['Deadlift', [['Lower Back', 'back', 1], ['Hamstrings', 'legs', 0], ['Glutes', 'legs', 0], ['Traps', 'back', 0]]],
        ['Pull-Up', [['Lats', 'back', 1], ['Biceps', 'arms', 0]]],
        ['Barbell Row', [['Upper Back', 'back', 1], ['Lats', 'back', 0], ['Biceps', 'arms', 0]]],
        ['Lat Pulldown', [['Lats', 'back', 1], ['Biceps', 'arms', 0]]],
        ['Cable Row', [['Upper Back', 'back', 1], ['Lats', 'back', 0]]],
        ['Face Pull', [['Rear Delts', 'shoulders', 1], ['Upper Back', 'back', 0]]],
        // Legs
        ['Squat', [['Quads', 'legs', 1], ['Glutes', 'legs', 0]]],
        ['Romanian Deadlift', [['Hamstrings', 'legs', 1], ['Glutes', 'legs', 0], ['Lower Back', 'back', 0]]],
        ['Leg Press', [['Quads', 'legs', 1], ['Glutes', 'legs', 0]]],
        ['Leg Curl', [['Hamstrings', 'legs', 1]]],
        ['Leg Extension', [['Quads', 'legs', 1]]],
        ['Calf Raise', [['Calves', 'legs', 1]]],
        // Shoulders
        ['Overhead Press', [['Front Delts', 'shoulders', 1], ['Triceps', 'arms', 0]]],
        ['Lateral Raise', [['Side Delts', 'shoulders', 1]]],
        ['Front Raise', [['Front Delts', 'shoulders', 1]]],
        ['Arnold Press', [['Front Delts', 'shoulders', 1], ['Side Delts', 'shoulders', 0]]],
        ['Rear Delt Fly', [['Rear Delts', 'shoulders', 1]]],
        ['Shrug', [['Traps', 'back', 1]]],
        // Arms
        ['Bicep Curl', [['Biceps', 'arms', 1]]],
        ['Hammer Curl', [['Biceps', 'arms', 1], ['Forearms', 'arms', 0]]],
        ['Tricep Pushdown', [['Triceps', 'arms', 1]]],
        ['Skull Crusher', [['Triceps', 'arms', 1]]],
        ['Preacher Curl', [['Biceps', 'arms', 1]]],
        ['Dip', [['Triceps', 'arms', 1], ['Lower Chest', 'chest', 0]]],
        // Core
        ['Plank', [['Abs', 'core', 1]]],
        ['Crunch', [['Abs', 'core', 1]]],
        ['Hanging Leg Raise', [['Abs', 'core', 1], ['Hip Flexors', 'legs', 0]]],
        ['Cable Crunch', [['Abs', 'core', 1]]],
        ['Ab Wheel', [['Abs', 'core', 1]]],
        ['Russian Twist', [['Obliques', 'core', 1]]],
        // Conditioning
        ['Burpees', [['Cardio', 'conditioning', 1]]],
        ['Rowing', [['Cardio', 'conditioning', 1]]],
        ['Jump Rope', [['Cardio', 'conditioning', 1]]],
        ['Box Jumps', [['Plyometrics', 'conditioning', 1]]],
        ['Battle Ropes', [['Cardio', 'conditioning', 1]]],
        ['Mountain Climbers', [['Cardio', 'conditioning', 1], ['Abs', 'core', 0]]],
      ];

      for (const [exerciseName, muscles] of presetMappings) {
        for (const [mgName, mgParent, isPrimary] of muscles) {
          tx.executeSql(
            `INSERT OR IGNORE INTO exercise_muscle_groups (exercise_id, muscle_group_id, is_primary)
             SELECT e.id, mg.id, ?
             FROM exercises e, muscle_groups mg
             WHERE e.name = ? AND mg.name = ? AND mg.parent_category = ?`,
            [isPrimary, exerciseName, mgName, mgParent],
          );
        }
      }

      // Map custom exercises that aren't in the preset list.
      const defaultMuscleGroupPerCategory: Array<[string, string, string]> = [
        ['chest', 'Chest', 'chest'],
        ['back', 'Lats', 'back'],
        ['legs', 'Quads', 'legs'],
        ['shoulders', 'Front Delts', 'shoulders'],
        ['arms', 'Biceps', 'arms'],
        ['core', 'Abs', 'core'],
        ['conditioning', 'Cardio', 'conditioning'],
      ];

      for (const [category, mgName, mgParent] of defaultMuscleGroupPerCategory) {
        tx.executeSql(
          `INSERT OR IGNORE INTO exercise_muscle_groups (exercise_id, muscle_group_id, is_primary)
           SELECT e.id, mg.id, 1
           FROM exercises e, muscle_groups mg
           WHERE e.category = ? AND mg.name = ? AND mg.parent_category = ?
             AND e.id NOT IN (SELECT exercise_id FROM exercise_muscle_groups)`,
          [category, mgName, mgParent],
        );
      }
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
