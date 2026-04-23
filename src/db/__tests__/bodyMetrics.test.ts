jest.mock('../database');

import { db, executeSql } from '../database';
import { mockResultSet } from '../../test-utils/dbMock';
import {
  insertBodyMetric,
  getBodyMetricByDate,
  rowToBodyMetric,
} from '../bodyMetrics';

const mockExecuteSql = executeSql as jest.MockedFunction<typeof executeSql>;

const mockDb = {};
const dbModule = require('../database');
Object.defineProperty(dbModule, 'db', {
  value: Promise.resolve(mockDb),
  writable: true,
});

beforeEach(() => {
  jest.clearAllMocks();
});

// ── Shared row fixtures ──────────────────────────────────────────────

const weightRow = {
  id: 1,
  metric_type: 'weight',
  value: 177.4,
  unit: 'lb',
  recorded_date: '2026-04-17',
  program_id: null,
  note: null,
  created_at: '2026-04-17T08:00:00.000Z',
  updated_at: '2026-04-17T08:00:00.000Z',
};

describe('bodyMetrics CRUD', () => {
  it('inserts a weight reading and reads it back', async () => {
    // insertBodyMetric: returns insertId
    mockExecuteSql.mockResolvedValueOnce(mockResultSet([], 42));

    const id = await insertBodyMetric({
      metricType: 'weight',
      value: 177.4,
      unit: 'lb',
      recordedDate: '2026-04-17',
      programId: null,
      note: null,
    });
    expect(id).toBe(42);
    expect(mockExecuteSql).toHaveBeenCalledWith(
      mockDb,
      expect.stringContaining('INSERT INTO body_metrics'),
      expect.arrayContaining(['weight', 177.4, 'lb', '2026-04-17', null, null]),
    );

    // getBodyMetricByDate: returns the row
    mockExecuteSql.mockResolvedValueOnce(mockResultSet([weightRow]));

    const row = await getBodyMetricByDate('weight', '2026-04-17');
    expect(row).not.toBeNull();
    expect(row!.value).toBe(177.4);
    expect(row!.unit).toBe('lb');
    expect(row!.programId).toBeNull();
    expect(row!.recordedDate).toBe('2026-04-17');
  });

  it('returns null when no reading exists for a date', async () => {
    mockExecuteSql.mockResolvedValueOnce(mockResultSet([]));

    const row = await getBodyMetricByDate('weight', '2026-04-17');
    expect(row).toBeNull();
  });

  it('rowToBodyMetric maps snake_case columns to camelCase', () => {
    const dbRow = {
      id: 7,
      metric_type: 'body_fat',
      value: 18.2,
      unit: 'percent',
      recorded_date: '2026-04-25',
      program_id: 3,
      note: 'post-program',
      created_at: '2026-04-25T09:00:00.000Z',
      updated_at: '2026-04-25T09:00:00.000Z',
    };
    const mapped = rowToBodyMetric(dbRow);
    expect(mapped).toEqual({
      id: 7,
      metricType: 'body_fat',
      value: 18.2,
      unit: 'percent',
      recordedDate: '2026-04-25',
      programId: 3,
      note: 'post-program',
      createdAt: '2026-04-25T09:00:00.000Z',
      updatedAt: '2026-04-25T09:00:00.000Z',
    });
  });
});
