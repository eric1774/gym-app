jest.mock('../database');

import { db, executeSql } from '../database';
import { mockResultSet } from '@test-utils';
import { scanDatabase, fixDatabaseIssues, type DiagnosticResult } from '../repair';

const mockExecuteSql = executeSql as jest.MockedFunction<typeof executeSql>;

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

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Return a clean scan result with all categories at zero-issues. */
function makeCleanResult(): DiagnosticResult {
  return {
    categories: {
      orphanedRecords: { label: 'Orphaned Records', issueCount: 0, details: [] },
      emptyData: { label: 'Abandoned Data', issueCount: 0, details: [] },
      dataConsistency: { label: 'Data Consistency', issueCount: 0, details: [] },
      duplicateSessions: { label: 'Duplicate Sessions', issueCount: 0, details: [] },
    },
    totalIssues: 0,
  };
}

/**
 * Mock all scan queries up to (but not including) the duplicate-sessions
 * group query, returning zero counts for everything.
 *
 * Scan query order:
 *   [0-4] 5 orphan COUNT checks
 *   [5]   1 abandoned sessions COUNT check
 *   [6]   macro mismatches COUNT
 *   [7]   HR mismatches COUNT
 *   [8]   program week overflow COUNT
 *   — duplicate-sessions queries start here —
 *   [9]   GROUP BY completed_at (HAVING cnt > 1)
 *   [10]  (conditional) COUNT of affected workout_sets
 */
function mockPrefixQueries() {
  // 5 orphan checks
  for (let i = 0; i < 5; i++) {
    mockExecuteSql.mockResolvedValueOnce(mockResultSet([{ cnt: 0 }]));
  }
  // abandoned sessions
  mockExecuteSql.mockResolvedValueOnce(mockResultSet([{ cnt: 0 }]));
  // macro mismatches
  mockExecuteSql.mockResolvedValueOnce(mockResultSet([{ cnt: 0 }]));
  // HR mismatches
  mockExecuteSql.mockResolvedValueOnce(mockResultSet([{ cnt: 0 }]));
  // program week overflow
  mockExecuteSql.mockResolvedValueOnce(mockResultSet([{ cnt: 0 }]));
}

// ── scanDatabase — duplicateSessions ─────────────────────────────────────────

describe('scanDatabase — duplicateSessions', () => {
  it('reports issueCount 0 when no duplicate completed_at values exist', async () => {
    mockPrefixQueries();
    // Duplicate-groups query: no rows returned → no duplicates
    mockExecuteSql.mockResolvedValueOnce(mockResultSet([]));

    const result = await scanDatabase();

    expect(result.categories.duplicateSessions.issueCount).toBe(0);
    expect(result.categories.duplicateSessions.details).toHaveLength(0);
    expect(result.totalIssues).toBe(0);
  });

  it('reports correct issueCount and detail string for multiple duplicate groups', async () => {
    mockPrefixQueries();
    // Duplicate-groups query: 3 groups — counts 2, 6, 3 → extra = 1+5+2 = 8 extra sessions
    mockExecuteSql.mockResolvedValueOnce(
      mockResultSet([
        { completed_at: '2024-01-10T10:00:00.000Z', cnt: 2 },
        { completed_at: '2024-01-12T09:00:00.000Z', cnt: 6 },
        { completed_at: '2024-01-15T08:00:00.000Z', cnt: 3 },
      ]),
    );
    // workout_sets count for the affected sessions
    mockExecuteSql.mockResolvedValueOnce(mockResultSet([{ cnt: 24 }]));

    const result = await scanDatabase();

    expect(result.categories.duplicateSessions.issueCount).toBe(8);
    expect(result.categories.duplicateSessions.details[0]).toMatch(
      /8 duplicate sessions across 3 groups \(24 workout_set rows will be removed\)/,
    );
    expect(result.totalIssues).toBe(8);
  });

  it('uses singular "session" and "group" when exactly 1 extra in 1 group', async () => {
    mockPrefixQueries();
    mockExecuteSql.mockResolvedValueOnce(
      mockResultSet([{ completed_at: '2024-01-10T10:00:00.000Z', cnt: 2 }]),
    );
    mockExecuteSql.mockResolvedValueOnce(mockResultSet([{ cnt: 0 }]));

    const result = await scanDatabase();

    expect(result.categories.duplicateSessions.issueCount).toBe(1);
    expect(result.categories.duplicateSessions.details[0]).toMatch(
      /1 duplicate session across 1 group \(0 workout_set rows will be removed\)/,
    );
  });

  it('does NOT fire the workout_sets COUNT query when no duplicate groups exist', async () => {
    mockPrefixQueries();
    mockExecuteSql.mockResolvedValueOnce(mockResultSet([]));

    await scanDatabase();

    // Query [9] is the groups query (returns empty), query [10] should NOT be called
    // Total calls: 9 prefix + 1 group query = 10
    expect(mockExecuteSql).toHaveBeenCalledTimes(10);
  });
});

// ── fixDatabaseIssues — duplicateSessions ────────────────────────────────────

describe('fixDatabaseIssues — duplicateSessions', () => {
  it('performs zero session-deletion SQL calls when issueCount is 0', async () => {
    const result = makeCleanResult(); // duplicateSessions.issueCount === 0

    await fixDatabaseIssues(result);

    // No executeSql calls at all (other fix blocks also short-circuit)
    expect(mockExecuteSql).not.toHaveBeenCalled();
  });

  it('issues DELETE calls in the correct order: workout_sets → exercise_sessions → heart_rate_samples → workout_sessions', async () => {
    const result = makeCleanResult();
    result.categories.duplicateSessions = {
      label: 'Duplicate Sessions',
      issueCount: 3,
      details: ['3 duplicate sessions across 2 groups (6 workout_set rows will be removed)'],
    };

    // [0] SELECT duplicate IDs query → returns 3 IDs to delete
    mockExecuteSql.mockResolvedValueOnce(
      mockResultSet([{ id: 2 }, { id: 3 }, { id: 7 }]),
    );
    // [1] DELETE FROM workout_sets
    mockExecuteSql.mockResolvedValueOnce({ ...mockResultSet([]), rowsAffected: 6 });
    // [2] DELETE FROM exercise_sessions (best-effort)
    mockExecuteSql.mockResolvedValueOnce({ ...mockResultSet([]), rowsAffected: 3 });
    // [3] DELETE FROM heart_rate_samples (best-effort)
    mockExecuteSql.mockResolvedValueOnce({ ...mockResultSet([]), rowsAffected: 0 });
    // [4] DELETE FROM workout_sessions
    mockExecuteSql.mockResolvedValueOnce({ ...mockResultSet([]), rowsAffected: 3 });

    const fixResult = await fixDatabaseIssues(result);

    const calls = mockExecuteSql.mock.calls;
    expect(calls).toHaveLength(5);

    // Verify SQL order by checking table names in the statements
    expect(calls[0][1]).toMatch(/SELECT s\.id.*FROM workout_sessions s/s);
    expect(calls[1][1]).toMatch(/DELETE FROM workout_sets/);
    expect(calls[2][1]).toMatch(/DELETE FROM exercise_sessions/);
    expect(calls[3][1]).toMatch(/DELETE FROM heart_rate_samples/);
    expect(calls[4][1]).toMatch(/DELETE FROM workout_sessions/);

    // Verify the correct IDs are passed as params for every DELETE
    expect(calls[1][2]).toEqual([2, 3, 7]);
    expect(calls[2][2]).toEqual([2, 3, 7]);
    expect(calls[3][2]).toEqual([2, 3, 7]);
    expect(calls[4][2]).toEqual([2, 3, 7]);

    // fixedCount reflects only the session deletes (rowsAffected on the session DELETE)
    expect(fixResult.fixedCount).toBe(3);
    expect(fixResult.details[0]).toMatch(/Deleted 3 duplicate sessions \(and their workout_set rows\)/);
  });

  it('still completes if exercise_sessions DELETE throws (table may not exist)', async () => {
    const result = makeCleanResult();
    result.categories.duplicateSessions = {
      label: 'Duplicate Sessions',
      issueCount: 1,
      details: ['1 duplicate session across 1 group (2 workout_set rows will be removed)'],
    };

    // [0] SELECT duplicate IDs
    mockExecuteSql.mockResolvedValueOnce(mockResultSet([{ id: 5 }]));
    // [1] DELETE FROM workout_sets — succeeds
    mockExecuteSql.mockResolvedValueOnce({ ...mockResultSet([]), rowsAffected: 2 });
    // [2] DELETE FROM exercise_sessions — throws (table missing)
    mockExecuteSql.mockRejectedValueOnce(new Error('no such table: exercise_sessions'));
    // [3] DELETE FROM heart_rate_samples — succeeds
    mockExecuteSql.mockResolvedValueOnce({ ...mockResultSet([]), rowsAffected: 0 });
    // [4] DELETE FROM workout_sessions — succeeds
    mockExecuteSql.mockResolvedValueOnce({ ...mockResultSet([]), rowsAffected: 1 });

    const fixResult = await fixDatabaseIssues(result);

    expect(fixResult.fixedCount).toBe(1);
    expect(fixResult.details[0]).toMatch(/Deleted 1 duplicate session/);
  });

  it('records error detail when the outer try/catch fires (SELECT IDs query throws)', async () => {
    const result = makeCleanResult();
    result.categories.duplicateSessions = {
      label: 'Duplicate Sessions',
      issueCount: 2,
      details: ['2 duplicate sessions across 1 group'],
    };

    // SELECT duplicate IDs query throws
    mockExecuteSql.mockRejectedValueOnce(new Error('disk I/O error'));

    const fixResult = await fixDatabaseIssues(result);

    expect(fixResult.fixedCount).toBe(0);
    expect(fixResult.details[0]).toMatch(/Duplicate session cleanup failed: disk I\/O error/);
  });
});
