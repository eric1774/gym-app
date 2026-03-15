jest.mock('../database');

import { db, executeSql, runTransaction } from '../database';
import { mockResultSet } from '@test-utils';
import { seedIfEmpty } from '../seed';

const mockExecuteSql = executeSql as jest.MockedFunction<typeof executeSql>;
const mockRunTransaction = runTransaction as jest.MockedFunction<typeof runTransaction>;

const mockDb = {};
jest.mocked(db as any);
const dbModule = require('../database');
Object.defineProperty(dbModule, 'db', {
  value: Promise.resolve(mockDb),
  writable: true,
});

beforeEach(() => {
  jest.clearAllMocks();
});

// ── seedIfEmpty ──────────────────────────────────────────────────────

describe('seedIfEmpty', () => {
  it('inserts 42 preset exercises via transaction when table is empty', async () => {
    // COUNT returns 0 → table is empty
    mockExecuteSql.mockResolvedValueOnce(mockResultSet([{ cnt: 0 }]));

    // Capture tx and invoke the callback synchronously so we can count calls
    const txExecuteSql = jest.fn();
    mockRunTransaction.mockImplementation(async (_database: any, work: (tx: any) => void) => {
      const tx = { executeSql: txExecuteSql };
      work(tx);
    });

    await seedIfEmpty();

    expect(mockRunTransaction).toHaveBeenCalledTimes(1);
    expect(txExecuteSql).toHaveBeenCalledTimes(42);
  });

  it('passes correct INSERT parameters for each preset exercise', async () => {
    mockExecuteSql.mockResolvedValueOnce(mockResultSet([{ cnt: 0 }]));

    const txExecuteSql = jest.fn();
    mockRunTransaction.mockImplementation(async (_database: any, work: (tx: any) => void) => {
      const tx = { executeSql: txExecuteSql };
      work(tx);
    });

    await seedIfEmpty();

    // Each INSERT call should have 4 params: [name, category, measurementType, createdAt]
    for (const call of txExecuteSql.mock.calls) {
      const [sql, params] = call;
      expect(sql).toContain('INSERT INTO exercises');
      expect(params).toHaveLength(4);
      // name: non-empty string
      expect(typeof params[0]).toBe('string');
      expect(params[0].length).toBeGreaterThan(0);
      // category: valid category string
      expect(typeof params[1]).toBe('string');
      // measurementType: 'reps' or 'timed'
      expect(['reps', 'timed']).toContain(params[2]);
      // createdAt: ISO datetime string
      expect(typeof params[3]).toBe('string');
    }
  });

  it('skips transaction when table is non-empty', async () => {
    // COUNT returns 10 → table already has exercises
    mockExecuteSql.mockResolvedValueOnce(mockResultSet([{ cnt: 10 }]));

    await seedIfEmpty();

    expect(mockRunTransaction).not.toHaveBeenCalled();
    // Only the COUNT query was called
    expect(mockExecuteSql).toHaveBeenCalledTimes(1);
  });

  it('COUNT query is the first and only executeSql call when non-empty', async () => {
    mockExecuteSql.mockResolvedValueOnce(mockResultSet([{ cnt: 5 }]));

    await seedIfEmpty();

    expect(mockExecuteSql).toHaveBeenCalledWith(
      mockDb,
      expect.stringContaining('COUNT'),
    );
    expect(mockExecuteSql).toHaveBeenCalledTimes(1);
  });
});
