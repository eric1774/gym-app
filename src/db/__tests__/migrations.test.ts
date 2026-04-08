jest.mock('react-native-sqlite-storage');
jest.mock('../database');
jest.mock('../../../assets/usda-foods.json', () => [
  { fdc_id: 1, name: 'Test Food', category: 'Test', protein_per_100g: 10, carbs_per_100g: 20, fat_per_100g: 5 },
], { virtual: true });

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
  it('runs all 12 migrations on a fresh database (version 0)', async () => {
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
    // 12 migrations = 12 INSERT version calls
    for (let i = 0; i < 12; i++) {
      mockExecuteSql.mockResolvedValueOnce(mockResultSet([], i + 1));
    }

    await runMigrations(db);

    // 12 migrations ran
    expect(transaction).toHaveBeenCalledTimes(12);
    // Each migration inserts a version
    const insertVersionCalls = mockExecuteSql.mock.calls.filter(
      ([, sql]) => typeof sql === 'string' && sql.includes('INSERT INTO schema_version'),
    );
    expect(insertVersionCalls.length).toBe(12);
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

    // migrations 4, 5, 6, 7, 8, 9, 10, 11, 12 remaining
    for (let i = 4; i <= 12; i++) {
      mockExecuteSql.mockResolvedValueOnce(mockResultSet([], i));
    }

    await runMigrations(db);

    // Only 9 migrations ran (4,5,6,7,8,9,10,11,12)
    expect(transaction).toHaveBeenCalledTimes(9);
    // 9 version records inserted
    const insertCalls = mockExecuteSql.mock.calls.filter(
      ([, sql]) => typeof sql === 'string' && sql.includes('INSERT INTO schema_version'),
    );
    expect(insertCalls).toHaveLength(9);
    const versions = insertCalls.map(([, , params]) => (params as number[])[0]);
    expect(versions).toEqual([4, 5, 6, 7, 8, 9, 10, 11, 12]);
  });

  it('skips all migrations when already at latest version', async () => {
    const { transaction } = makeMockDatabase();
    const db = { transaction } as any;

    // bootstrapExistingDatabase: schema_version exists
    mockExecuteSql
      .mockResolvedValueOnce(mockResultSet([{ name: 'exercises' }]))
      .mockResolvedValueOnce(mockResultSet([{ name: 'schema_version' }]));

    // getCurrentVersion = 12 (latest)
    mockExecuteSql
      .mockResolvedValueOnce(mockResultSet([]))
      .mockResolvedValueOnce(mockResultSet([{ max_version: 12 }]));

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

    // Remaining migrations: 3,4,5,6,7,8,9,10,11,12
    for (let i = 3; i <= 12; i++) {
      mockExecuteSql.mockResolvedValueOnce(mockResultSet([], i));
    }

    await runMigrations(db);

    // 10 remaining migrations ran
    expect(transaction).toHaveBeenCalledTimes(10);
  });

  it('runs migration DDL inside a transaction', async () => {
    const { transaction, txExecuteSql } = makeMockDatabase();
    const db = { transaction } as any;

    // No existing exercises, no schema_version, version = 11
    mockExecuteSql
      .mockResolvedValueOnce(mockResultSet([]))
      .mockResolvedValueOnce(mockResultSet([]))
      .mockResolvedValueOnce(mockResultSet([]))
      .mockResolvedValueOnce(mockResultSet([{ max_version: 11 }]));

    // Only migration 12 remains
    mockExecuteSql.mockResolvedValueOnce(mockResultSet([], 12));

    await runMigrations(db);

    expect(transaction).toHaveBeenCalledTimes(1);
    // Migration 12 creates foods table
    expect(txExecuteSql).toHaveBeenCalledWith(
      expect.stringContaining('foods'),
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

    for (let i = 1; i <= 12; i++) {
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

    // Migration 11: water_logs and water_settings tables
    expect(txCalls.some(s => s.includes('CREATE TABLE IF NOT EXISTS water_logs'))).toBe(true);
    expect(txCalls.some(s => s.includes('CREATE TABLE IF NOT EXISTS water_settings'))).toBe(true);
    expect(txCalls.some(s => s.includes('amount_oz'))).toBe(true);
    expect(txCalls.some(s => s.includes('goal_oz'))).toBe(true);

    // Migration 12: foods and meal_foods tables, USDA bulk seed
    expect(txCalls.some(s => s.includes('CREATE TABLE IF NOT EXISTS foods'))).toBe(true);
    expect(txCalls.some(s => s.includes('CREATE TABLE IF NOT EXISTS meal_foods'))).toBe(true);
    expect(txCalls.some(s => s.includes('idx_foods_search_text'))).toBe(true);
    expect(txCalls.some(s => s.includes('idx_meal_foods_meal_id'))).toBe(true);
    expect(txCalls.some(s => s.includes('INSERT OR IGNORE INTO foods'))).toBe(true);
  });
});
