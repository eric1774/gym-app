import { mockResultSet, mockDatabase } from '../dbMock';

describe('mockResultSet', () => {
  it('returns a ResultSet with correct row count', () => {
    const rows = [{ id: 1, name: 'Test' }, { id: 2, name: 'Other' }];
    const rs = mockResultSet(rows);
    expect(rs.rows.length).toBe(2);
    expect(rs.rowsAffected).toBe(2);
  });

  it('returns rows via item()', () => {
    const rows = [{ id: 1, name: 'Test' }];
    const rs = mockResultSet(rows);
    expect(rs.rows.item(0)).toEqual({ id: 1, name: 'Test' });
  });

  it('returns rows via raw()', () => {
    const rows = [{ id: 1, name: 'Test' }, { id: 2, name: 'Other' }];
    const rs = mockResultSet(rows);
    expect(rs.rows.raw()).toEqual(rows);
  });

  it('uses provided insertId', () => {
    const rs = mockResultSet([], 42);
    expect(rs.insertId).toBe(42);
  });

  it('defaults to empty rows and insertId 0', () => {
    const rs = mockResultSet();
    expect(rs.rows.length).toBe(0);
    expect(rs.insertId).toBe(0);
    expect(rs.rowsAffected).toBe(0);
  });

  it('raw() returns a copy of the rows array', () => {
    const rows = [{ id: 1 }];
    const rs = mockResultSet(rows);
    const rawResult = rs.rows.raw();
    expect(rawResult).toEqual(rows);
    // Confirm it's a copy (spread)
    expect(rawResult).not.toBe(rows);
  });
});

describe('mockDatabase', () => {
  it('returns database, executeSql, and transaction', () => {
    const result = mockDatabase();
    expect(result.database).toBeDefined();
    expect(result.executeSql).toBeDefined();
    expect(result.transaction).toBeDefined();
  });

  it('database.executeSql resolves with a ResultSet', async () => {
    const { database } = mockDatabase();
    const result = await database.executeSql('SELECT 1', []);
    expect(result).toBeDefined();
    expect(Array.isArray(result)).toBe(true);
  });

  it('database.transaction calls the callback with a tx object', async () => {
    const { database } = mockDatabase();
    const callback = jest.fn();
    await database.transaction(callback);
    expect(callback).toHaveBeenCalledTimes(1);
    const tx = callback.mock.calls[0][0];
    expect(tx.executeSql).toBeDefined();
  });

  it('database.close resolves without error', async () => {
    const { database } = mockDatabase();
    await expect(database.close()).resolves.toBeUndefined();
  });

  it('executeSql mock is the same as database.executeSql', () => {
    const { database, executeSql } = mockDatabase();
    expect(database.executeSql).toBe(executeSql);
  });

  it('transaction mock is the same as database.transaction', () => {
    const { database, transaction } = mockDatabase();
    expect(database.transaction).toBe(transaction);
  });
});
