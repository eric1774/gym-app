jest.mock('react-native-sqlite-storage');

import { executeSql, runTransaction } from '../database';
import { mockResultSet } from '@test-utils/dbMock';

beforeEach(() => {
  jest.clearAllMocks();
});

describe('executeSql', () => {
  it('returns the first result from database.executeSql', async () => {
    const rs = mockResultSet([{ id: 1, name: 'Bench Press' }]);
    const mockDb = {
      executeSql: jest.fn().mockResolvedValue([rs]),
    } as any;

    const result = await executeSql(mockDb, 'SELECT * FROM exercises');

    expect(mockDb.executeSql).toHaveBeenCalledWith('SELECT * FROM exercises', []);
    expect(result).toBe(rs);
  });

  it('passes params to database.executeSql', async () => {
    const rs = mockResultSet([]);
    const mockDb = {
      executeSql: jest.fn().mockResolvedValue([rs]),
    } as any;

    await executeSql(mockDb, 'SELECT * FROM exercises WHERE id = ?', [42]);

    expect(mockDb.executeSql).toHaveBeenCalledWith('SELECT * FROM exercises WHERE id = ?', [42]);
  });

  it('defaults params to empty array when not provided', async () => {
    const rs = mockResultSet([]);
    const mockDb = {
      executeSql: jest.fn().mockResolvedValue([rs]),
    } as any;

    await executeSql(mockDb, 'SELECT 1');

    expect(mockDb.executeSql).toHaveBeenCalledWith('SELECT 1', []);
  });
});

describe('runTransaction', () => {
  it('calls database.transaction with the work function', async () => {
    const work = jest.fn();
    const mockDb = {
      transaction: jest.fn().mockResolvedValue(undefined),
    } as any;

    await runTransaction(mockDb, work);

    expect(mockDb.transaction).toHaveBeenCalledWith(work);
  });

  it('propagates transaction errors', async () => {
    const work = jest.fn();
    const mockDb = {
      transaction: jest.fn().mockRejectedValue(new Error('tx error')),
    } as any;

    await expect(runTransaction(mockDb, work)).rejects.toThrow('tx error');
  });
});
