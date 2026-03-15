import { ResultSet } from 'react-native-sqlite-storage';

/**
 * Build a fake ResultSet from an array of row objects.
 * Matches the react-native-sqlite-storage ResultSet interface:
 *   { insertId, rowsAffected, rows: { length, item(i), raw() } }
 *
 * Usage in DB tests:
 *   const rs = mockResultSet([{ id: 1, name: 'Bench Press', ... }]);
 *   mockExecuteSql.mockResolvedValueOnce([rs]);
 */
export function mockResultSet(rows: Record<string, unknown>[] = [], insertId = 0): ResultSet {
  return {
    insertId,
    rowsAffected: rows.length,
    rows: {
      length: rows.length,
      item: (index: number) => rows[index],
      raw: () => [...rows],
    },
  };
}

/**
 * Create a mock database object that matches the SQLiteDatabase interface
 * used by all DB modules (executeSql, transaction, close).
 *
 * Usage:
 *   const { database, executeSql } = mockDatabase();
 *   jest.spyOn(dbModule, 'db', 'get').mockResolvedValue(database);
 *   executeSql.mockResolvedValueOnce([mockResultSet([...])]);
 */
export function mockDatabase() {
  const executeSql = jest.fn().mockResolvedValue([mockResultSet()]);
  const transaction = jest.fn((callback: (tx: { executeSql: jest.Mock }) => void) => {
    const tx = { executeSql: jest.fn() };
    callback(tx);
    return Promise.resolve();
  });
  const database = {
    executeSql,
    transaction,
    close: jest.fn().mockResolvedValue(undefined),
  };
  return { database, executeSql, transaction };
}
