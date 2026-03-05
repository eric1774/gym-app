import SQLite, { SQLiteDatabase, Transaction, ResultSet } from 'react-native-sqlite-storage';
import {
  CREATE_EXERCISES_TABLE,
  CREATE_WORKOUT_SESSIONS_TABLE,
  CREATE_WORKOUT_SETS_TABLE,
  CREATE_EXERCISE_SESSIONS_TABLE,
} from './schema';

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
 */
export async function initDatabase(): Promise<void> {
  const database = await db;
  await database.transaction((tx: Transaction) => {
    tx.executeSql(CREATE_EXERCISES_TABLE);
    tx.executeSql(CREATE_WORKOUT_SESSIONS_TABLE);
    tx.executeSql(CREATE_WORKOUT_SETS_TABLE);
    tx.executeSql(CREATE_EXERCISE_SESSIONS_TABLE);
  });

  // Lazy import to avoid circular dependency at module load time
  const { seedIfEmpty } = await import('./seed');
  await seedIfEmpty();
}
