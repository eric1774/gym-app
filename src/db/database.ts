import SQLite, { SQLiteDatabase, Transaction, ResultSet } from 'react-native-sqlite-storage';

// Enable promise-based API
SQLite.enablePromise(true);

/**
 * Singleton database promise.
 * All repository functions import this and await it to get the open connection.
 */
export const db: Promise<SQLiteDatabase> = SQLite.openDatabase({
  name: 'gymtrack.db',
  location: 'default',
});

/**
 * Thin Promise wrapper around db.executeSql so callers can use async/await uniformly.
 */
export async function executeSql(
  database: SQLiteDatabase,
  sql: string,
  params: (string | number | null)[] = [],
): Promise<ResultSet> {
  const [result] = await database.executeSql(sql, params);
  return result;
}

/**
 * Run a block of statements inside a single transaction.
 * Rolls back automatically on error.
 */
export async function runTransaction(
  database: SQLiteDatabase,
  work: (tx: Transaction) => void,
): Promise<void> {
  await database.transaction(work);
}

/**
 * Initialize the database: create all tables then seed preset data if the
 * exercises table is empty.
 *
 * Call this once from App.tsx on mount:
 *   useEffect(() => { initDatabase(); }, []);
 *
 * @param onMigrationStatus - Optional callback invoked with a status message
 *   when a migration that warrants user feedback is running (e.g. v12 food seeding).
 */
export async function initDatabase(
  onMigrationStatus?: (message: string) => void,
): Promise<void> {
  const database = await db;

  // Enable foreign key enforcement (required for ON DELETE CASCADE)
  await executeSql(database, 'PRAGMA foreign_keys = ON');

  // Lazy import to avoid circular dependency at module load time
  const { runMigrations } = await import('./migrations');
  await runMigrations(database, onMigrationStatus);

  // Lazy import to avoid circular dependency at module load time
  const { seedIfEmpty } = await import('./seed');
  await seedIfEmpty();

  // Import program data from prod export (idempotent — skips if data exists)
  const { importProgramData } = await import('./importProgram');
  await importProgramData();

  // Data repair is user-initiated only (Settings > Repair Data).
  // Never run repair automatically on boot — it must require explicit confirmation.
}
