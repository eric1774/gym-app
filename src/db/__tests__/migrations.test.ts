jest.mock('react-native-sqlite-storage');
jest.mock('../database');

import { executeSql } from '../database';
import { mockResultSet } from '@test-utils/dbMock';
import { runMigrations } from '../migrations';

const mockExecuteSql = executeSql as jest.MockedFunction<typeof executeSql>;

function makeMockDatabase() {
  const txExecuteSql = jest.fn();
  const transaction = jest.fn((callback: (tx: { executeSql: jest.Mock }) => void) => {
    callback({ executeSql: txExecuteSql });
    return Promise.resolve();
  });
  return { transaction, txExecuteSql };
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('runMigrations', () => {
  it('runs all 10 migrations on a fresh database (version 0)', async () => {
    const { transaction, txExecuteSql } = makeMockDatabase();
    const db = { transaction } as any;

    // bootstrapExistingDatabase: no exercises table, no schema_version
    mockExecuteSql
      .mockResolvedValueOnce(mockResultSet([]))  // exercises table check -> not found
      .mockResolvedValueOnce(mockResultSet([]))  // schema_version table check -> not found

    // getCurrentVersion: CREATE schema_version table, SELECT MAX
    mockExecuteSql
      .mockResolvedValueOnce(mockResultSet([]))   // CREATE TABLE schema_version
      .mockResolvedValueOnce(mockResultSet([{ max_version: null }]));  // SELECT MAX -> 0

    // After each migration: INSERT version
    // 10 migrations = 10 INSERT version calls
    for (let i = 0; i < 10; i++) {
      mockExecuteSql.mockResolvedValueOnce(mockResultSet([], i + 1));
    }

    await runMigrations(db);

    // 10 migrations ran
    expect(transaction).toHaveBeenCalledTimes(10);
    // Each migration inserts a version
    const insertVersionCalls = mockExecuteSql.mock.calls.filter(
      ([, sql]) => typeof sql === 'string' && sql.includes('INSERT INTO schema_version'),
    );
    expect(insertVersionCalls.length).toBe(10);
  });

  it('skips already-applied migrations when at version 3', async () => {
    const { transaction, txExecuteSql } = makeMockDatabase();
    const db = { transaction } as any;

    // bootstrapExistingDatabase: exercises exists, schema_version also exists -> no bootstrap needed
    mockExecuteSql
      .mockResolvedValueOnce(mockResultSet([{ name: 'exercises' }]))  // exercises table
      .mockResolvedValueOnce(mockResultSet([{ name: 'schema_version' }]));  // schema_version

    // getCurrentVersion
    mockExecuteSql
      .mockResolvedValueOnce(mockResultSet([]))  // CREATE TABLE IF NOT EXISTS (no-op)
      .mockResolvedValueOnce(mockResultSet([{ max_version: 3 }]));  // version = 3

    // migrations 4, 5, 6, 7, 8, 9, 10 remaining
    for (let i = 4; i <= 10; i++) {
      mockExecuteSql.mockResolvedValueOnce(mockResultSet([], i));
    }

    await runMigrations(db);

    // Only 7 migrations ran (4,5,6,7,8,9,10)
    expect(transaction).toHaveBeenCalledTimes(7);
    // 7 version records inserted
    const insertCalls = mockExecuteSql.mock.calls.filter(
      ([, sql]) => typeof sql === 'string' && sql.includes('INSERT INTO schema_version'),
    );
    expect(insertCalls).toHaveLength(7);
    const versions = insertCalls.map(([, , params]) => (params as number[])[0]);
    expect(versions).toEqual([4, 5, 6, 7, 8, 9, 10]);
  });

  it('skips all migrations when already at latest version', async () => {
    const { transaction } = makeMockDatabase();
    const db = { transaction } as any;

    // bootstrapExistingDatabase: schema_version exists
    mockExecuteSql
      .mockResolvedValueOnce(mockResultSet([{ name: 'exercises' }]))
      .mockResolvedValueOnce(mockResultSet([{ name: 'schema_version' }]));

    // getCurrentVersion = 10 (latest)
    mockExecuteSql
      .mockResolvedValueOnce(mockResultSet([]))
      .mockResolvedValueOnce(mockResultSet([{ max_version: 10 }]));

    await runMigrations(db);

    expect(transaction).not.toHaveBeenCalled();
  });

  it('bootstraps a pre-migration database (exercises table exists, no schema_version)', async () => {
    const { transaction } = makeMockDatabase();
    const db = { transaction } as any;

    // bootstrapExistingDatabase: exercises exists, schema_version does NOT exist -> bootstrap
    mockExecuteSql
      .mockResolvedValueOnce(mockResultSet([{ name: 'exercises' }]))  // exercises exists
      .mockResolvedValueOnce(mockResultSet([]));                        // schema_version missing

    // bootstrapExistingDatabase inserts version 2
    mockExecuteSql
      .mockResolvedValueOnce(mockResultSet([]))   // CREATE TABLE schema_version
      .mockResolvedValueOnce(mockResultSet([], 1)); // INSERT version 2

    // getCurrentVersion after bootstrap
    mockExecuteSql
      .mockResolvedValueOnce(mockResultSet([]))   // CREATE TABLE IF NOT EXISTS (no-op)
      .mockResolvedValueOnce(mockResultSet([{ max_version: 2 }]));  // version = 2

    // Remaining migrations: 3,4,5,6,7,8,9,10
    for (let i = 3; i <= 10; i++) {
      mockExecuteSql.mockResolvedValueOnce(mockResultSet([], i));
    }

    await runMigrations(db);

    // 8 remaining migrations ran
    expect(transaction).toHaveBeenCalledTimes(8);
  });

  it('runs migration DDL inside a transaction', async () => {
    const { transaction, txExecuteSql } = makeMockDatabase();
    const db = { transaction } as any;

    // No existing exercises, no schema_version, version = 0
    mockExecuteSql
      .mockResolvedValueOnce(mockResultSet([]))
      .mockResolvedValueOnce(mockResultSet([]))
      .mockResolvedValueOnce(mockResultSet([]))
      .mockResolvedValueOnce(mockResultSet([{ max_version: 9 }]));

    // Only migration 10 remains
    mockExecuteSql.mockResolvedValueOnce(mockResultSet([], 10));

    await runMigrations(db);

    expect(transaction).toHaveBeenCalledTimes(1);
    // Migration 10 adds macro columns and macro_settings table
    expect(txExecuteSql).toHaveBeenCalledWith(
      expect.stringContaining('carb_grams'),
    );
  });

  it('passes correct SQL for each migration DDL', async () => {
    const txCalls: string[] = [];
    const transaction = jest.fn((callback: (tx: { executeSql: jest.Mock }) => void) => {
      const tx = { executeSql: jest.fn((sql: string) => { txCalls.push(sql); }) };
      callback(tx);
      return Promise.resolve();
    });
    const db = { transaction } as any;

    // No existing db, version = 0, run all
    mockExecuteSql
      .mockResolvedValueOnce(mockResultSet([]))  // no exercises
      .mockResolvedValueOnce(mockResultSet([]))  // no schema_version
      .mockResolvedValueOnce(mockResultSet([]))  // create schema_version
      .mockResolvedValueOnce(mockResultSet([{ max_version: null }]));  // version = 0

    for (let i = 1; i <= 10; i++) {
      mockExecuteSql.mockResolvedValueOnce(mockResultSet([], i));
    }

    await runMigrations(db);

    // Migration 1: creates base tables
    expect(txCalls.some(s => s.includes('CREATE TABLE IF NOT EXISTS exercises'))).toBe(true);
    expect(txCalls.some(s => s.includes('CREATE TABLE IF NOT EXISTS workout_sessions'))).toBe(true);
    expect(txCalls.some(s => s.includes('CREATE TABLE IF NOT EXISTS workout_sets'))).toBe(true);
    expect(txCalls.some(s => s.includes('CREATE TABLE IF NOT EXISTS programs'))).toBe(true);

    // Migration 2: measurement_type column
    expect(txCalls.some(s => s.includes('measurement_type'))).toBe(true);

    // Migration 3: protein tables
    expect(txCalls.some(s => s.includes('CREATE TABLE IF NOT EXISTS meals'))).toBe(true);
    expect(txCalls.some(s => s.includes('CREATE TABLE IF NOT EXISTS protein_settings'))).toBe(true);

    // Migration 4: meal_library table
    expect(txCalls.some(s => s.includes('CREATE TABLE IF NOT EXISTS meal_library'))).toBe(true);

    // Migration 5: program_week column
    expect(txCalls.some(s => s.includes('program_week'))).toBe(true);

    // Migration 6: deduplication
    expect(txCalls.some(s => s.includes('DELETE FROM exercises'))).toBe(true);

    // Migration 7: superset_group_id
    expect(txCalls.some(s => s.includes('superset_group_id'))).toBe(true);

    // Migration 8: heart_rate_samples table and HR columns
    expect(txCalls.some(s => s.includes('heart_rate_samples'))).toBe(true);
    expect(txCalls.some(s => s.includes('avg_hr'))).toBe(true);
    expect(txCalls.some(s => s.includes('peak_hr'))).toBe(true);

    // Migration 9: program_week repair (re-rank by completion order)
    expect(txCalls.some(s => s.includes('UPDATE workout_sessions') && s.includes('program_week'))).toBe(true);

    // Migration 10: macro columns and macro_settings
    expect(txCalls.some(s => s.includes('carb_grams'))).toBe(true);
    expect(txCalls.some(s => s.includes('fat_grams'))).toBe(true);
    expect(txCalls.some(s => s.includes('CREATE TABLE IF NOT EXISTS macro_settings'))).toBe(true);
    expect(txCalls.some(s => s.includes('INSERT INTO macro_settings'))).toBe(true);
  });
});
