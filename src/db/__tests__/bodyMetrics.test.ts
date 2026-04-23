jest.mock('../database');

import { db, executeSql } from '../database';
import { mockResultSet } from '@test-utils';
import {
  insertBodyMetric,
  getBodyMetricByDate,
  rowToBodyMetric,
  upsertBodyMetric,
  findProgramIdAtDate,
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

// ── upsertBodyMetric ─────────────────────────────────────────────────

describe('upsertBodyMetric', () => {
  it('inserts when no row exists and returns { id, wasUpdated: false }', async () => {
    // Call order: 1) program-lookup SELECT, 2) SELECT-existing, 3) INSERT
    mockExecuteSql.mockResolvedValueOnce(mockResultSet([]));       // program lookup → no program
    mockExecuteSql.mockResolvedValueOnce(mockResultSet([]));       // existing check → no row
    mockExecuteSql.mockResolvedValueOnce(mockResultSet([], 42));   // INSERT → insertId 42

    const result = await upsertBodyMetric({
      metricType: 'weight',
      value: 177.4,
      unit: 'lb',
      recordedDate: '2026-04-17',
      note: null,
    });

    expect(result).toEqual({ id: 42, wasUpdated: false });

    // Third call (index 2) is the INSERT
    const insertCall = mockExecuteSql.mock.calls[2];
    expect(insertCall[1]).toContain('INSERT INTO body_metrics');
    expect(insertCall[2]).toEqual(
      expect.arrayContaining(['weight', 177.4, 'lb', '2026-04-17', null, null]),
    );
    // program_id should be null (5th positional param)
    expect(insertCall[2][4]).toBeNull();
  });

  it('updates when row exists and returns { id, wasUpdated: true }', async () => {
    // Call order: 1) program-lookup SELECT, 2) SELECT-existing → row found, 3) UPDATE
    mockExecuteSql.mockResolvedValueOnce(mockResultSet([]));              // program lookup → no program
    mockExecuteSql.mockResolvedValueOnce(mockResultSet([{ id: 7 }]));    // existing check → found
    mockExecuteSql.mockResolvedValueOnce(mockResultSet([]));              // UPDATE

    const result = await upsertBodyMetric({
      metricType: 'weight',
      value: 176.9,
      unit: 'lb',
      recordedDate: '2026-04-17',
      note: 'corrected',
    });

    expect(result).toEqual({ id: 7, wasUpdated: true });

    // Third call (index 2) is the UPDATE
    const updateCall = mockExecuteSql.mock.calls[2];
    expect(updateCall[1]).toContain('UPDATE body_metrics');
    expect(updateCall[1]).toContain('SET value = ?, unit = ?, program_id = ?, note = ?, updated_at = ?');
    expect(updateCall[1]).toContain('WHERE id = ?');
    // params: [value, unit, program_id, note, updated_at, id]
    expect(updateCall[2][0]).toBe(176.9);
    expect(updateCall[2][1]).toBe('lb');
    expect(updateCall[2][2]).toBeNull();   // program_id null
    expect(updateCall[2][3]).toBe('corrected');
    // updateCall[2][4] is the timestamp — any string is fine
    expect(typeof updateCall[2][4]).toBe('string');
    expect(updateCall[2][5]).toBe(7);
  });

  it('auto-links program_id when recorded_date falls in a program window', async () => {
    // Call order: 1) program-lookup SELECT → returns program id 3, 2) SELECT-existing, 3) INSERT
    mockExecuteSql.mockResolvedValueOnce(mockResultSet([{ id: 3 }]));  // program lookup
    mockExecuteSql.mockResolvedValueOnce(mockResultSet([]));            // existing check → no row
    mockExecuteSql.mockResolvedValueOnce(mockResultSet([], 99));        // INSERT → insertId 99

    const result = await upsertBodyMetric({
      metricType: 'weight',
      value: 180.0,
      unit: 'lb',
      recordedDate: '2026-04-17',
      note: null,
    });

    expect(result).toEqual({ id: 99, wasUpdated: false });

    // INSERT params (index 2): program_id is the 5th element (index 4)
    const insertCall = mockExecuteSql.mock.calls[2];
    expect(insertCall[2][4]).toBe(3);
  });

  it('leaves program_id NULL when no program covers the date', async () => {
    // Call order: 1) program-lookup SELECT → empty, 2) SELECT-existing, 3) INSERT
    mockExecuteSql.mockResolvedValueOnce(mockResultSet([]));   // program lookup → none
    mockExecuteSql.mockResolvedValueOnce(mockResultSet([]));   // existing check → no row
    mockExecuteSql.mockResolvedValueOnce(mockResultSet([], 55)); // INSERT → insertId 55

    await upsertBodyMetric({
      metricType: 'weight',
      value: 175.0,
      unit: 'lb',
      recordedDate: '2026-04-20',
      note: null,
    });

    const insertCall = mockExecuteSql.mock.calls[2];
    expect(insertCall[2][4]).toBeNull();
  });
});

// ── findProgramIdAtDate ──────────────────────────────────────────────

describe('findProgramIdAtDate', () => {
  it('returns the id of the most recent program covering the date', async () => {
    mockExecuteSql.mockResolvedValueOnce(mockResultSet([{ id: 5 }]));

    const result = await findProgramIdAtDate('2026-04-17');

    expect(result).toBe(5);

    const [, sql, params] = mockExecuteSql.mock.calls[0];
    expect(sql).toContain('ORDER BY DATE(start_date) DESC');
    expect(sql).toContain('start_date IS NOT NULL');
    expect(sql).toContain('DATE(start_date) <= DATE(?)');
    expect(sql).toContain("DATE(start_date, '+' || (weeks * 7) || ' days') > DATE(?)");
    expect(params).toEqual(['2026-04-17', '2026-04-17']);
  });

  it('returns null when no program covers the date', async () => {
    mockExecuteSql.mockResolvedValueOnce(mockResultSet([]));

    const result = await findProgramIdAtDate('2026-04-17');

    expect(result).toBeNull();
  });
});
