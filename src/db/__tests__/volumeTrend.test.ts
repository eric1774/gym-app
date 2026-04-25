jest.mock('../database');

import { db, executeSql } from '../database';
import { mockResultSet } from '@test-utils';
import { getVolumeTrend } from '../volumeTrend';

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

// ── Tests ─────────────────────────────────────────────────────────────

describe('getVolumeTrend', () => {
  it('returns null deltaPercent when fewer than 8 weeks of sessions exist (prior window is zero)', async () => {
    // Simulate: prior 4-week window = 0 kg, recent 4-week window = some volume
    // Call order: sumKg(recent), sumKg(prior), then 4 × sumKg(weekly bar)
    mockExecuteSql
      .mockResolvedValueOnce(mockResultSet([{ v: 275 }]))  // recent 4wk total
      .mockResolvedValueOnce(mockResultSet([{ v: 0 }]))    // prior 4wk total = 0 → null delta
      .mockResolvedValueOnce(mockResultSet([{ v: 275 }]))  // week 1 bar
      .mockResolvedValueOnce(mockResultSet([{ v: 275 }]))  // week 2 bar
      .mockResolvedValueOnce(mockResultSet([{ v: 275 }]))  // week 3 bar
      .mockResolvedValueOnce(mockResultSet([{ v: 275 }])); // week 4 bar

    const result = await getVolumeTrend();

    expect(result.deltaPercent).toBeNull();
    expect(result.weeklyBars).toHaveLength(4);
  });

  it('computes +10% delta: prior 4×250 kg = 1000 kg, recent 4×275 kg = 1100 kg', async () => {
    // 50kg × 5 reps = 250 per week × 4 = 1000 kg prior
    // 55kg × 5 reps = 275 per week × 4 = 1100 kg recent
    // delta = (1100 - 1000) / 1000 × 100 = 10%
    mockExecuteSql
      .mockResolvedValueOnce(mockResultSet([{ v: 1100 }]))  // recent 4wk sum
      .mockResolvedValueOnce(mockResultSet([{ v: 1000 }]))  // prior 4wk sum
      .mockResolvedValueOnce(mockResultSet([{ v: 275 }]))   // week 1 bar
      .mockResolvedValueOnce(mockResultSet([{ v: 275 }]))   // week 2 bar
      .mockResolvedValueOnce(mockResultSet([{ v: 275 }]))   // week 3 bar
      .mockResolvedValueOnce(mockResultSet([{ v: 275 }]));  // week 4 bar

    const result = await getVolumeTrend();

    expect(result.deltaPercent).toBeCloseTo(10, 5);
    expect(result.weeklyBars).toHaveLength(4);
    // weight_kg column actually stores lb; sum is already in lb
    result.weeklyBars.forEach(bar => {
      expect(bar.tonnageLb).toBe(275);
    });
  });

  it('excludes warmup sets — SQL contains is_warmup filter', async () => {
    // The SQL should include `(ws.is_warmup IS NULL OR ws.is_warmup = 0)`
    // We verify by inspecting the SQL string passed to executeSql
    mockExecuteSql
      .mockResolvedValueOnce(mockResultSet([{ v: 500 }]))
      .mockResolvedValueOnce(mockResultSet([{ v: 500 }]))
      .mockResolvedValueOnce(mockResultSet([{ v: 125 }]))
      .mockResolvedValueOnce(mockResultSet([{ v: 125 }]))
      .mockResolvedValueOnce(mockResultSet([{ v: 125 }]))
      .mockResolvedValueOnce(mockResultSet([{ v: 125 }]));

    await getVolumeTrend();

    // Every executeSql call should have a warmup-exclusion clause
    mockExecuteSql.mock.calls.forEach(([, sql]) => {
      expect(sql).toContain('is_warmup');
    });
  });

  it('returns null deltaPercent when prior 4-week volume is zero (null — no data)', async () => {
    // If SQL returns NULL (no rows), v comes back as null → treated as 0 → prior=0 → null delta
    mockExecuteSql
      .mockResolvedValueOnce(mockResultSet([{ v: null }]))  // recent: no data
      .mockResolvedValueOnce(mockResultSet([{ v: null }]))  // prior: no data
      .mockResolvedValueOnce(mockResultSet([{ v: null }]))  // weekly bars
      .mockResolvedValueOnce(mockResultSet([{ v: null }]))
      .mockResolvedValueOnce(mockResultSet([{ v: null }]))
      .mockResolvedValueOnce(mockResultSet([{ v: null }]));

    const result = await getVolumeTrend();

    expect(result.deltaPercent).toBeNull();
    expect(result.weeklyBars).toHaveLength(4);
    result.weeklyBars.forEach(bar => {
      expect(bar.tonnageLb).toBe(0);
    });
  });
});
