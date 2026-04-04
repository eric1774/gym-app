jest.mock('react-native-sqlite-storage');
jest.mock('../database');
import { rowToWaterLog, rowToWaterSettings } from '../hydration';

describe('rowToWaterLog', () => {
  it('maps water log row to WaterLog with camelCase fields', () => {
    const row = {
      id: 1,
      amount_oz: 16,
      logged_at: '2026-04-04T08:00:00',
      local_date: '2026-04-04',
      created_at: '2026-04-04T08:00:00',
    };
    expect(rowToWaterLog(row)).toEqual({
      id: 1,
      amountOz: 16,
      loggedAt: '2026-04-04T08:00:00',
      localDate: '2026-04-04',
      createdAt: '2026-04-04T08:00:00',
    });
  });

  it('maps zero amount_oz correctly', () => {
    const row = {
      id: 2,
      amount_oz: 0,
      logged_at: '2026-04-04T09:00:00',
      local_date: '2026-04-04',
      created_at: '2026-04-04T09:00:00',
    };
    const result = rowToWaterLog(row);
    expect(result.amountOz).toBe(0);
    expect(result.id).toBe(2);
  });

  it('maps large amount_oz correctly', () => {
    const row = {
      id: 3,
      amount_oz: 128,
      logged_at: '2026-04-04T10:00:00',
      local_date: '2026-04-04',
      created_at: '2026-04-04T10:00:00',
    };
    const result = rowToWaterLog(row);
    expect(result.amountOz).toBe(128);
  });
});

describe('rowToWaterSettings', () => {
  it('maps water settings row to WaterSettings with camelCase fields', () => {
    const row = {
      id: 1,
      goal_oz: 64,
      created_at: '2026-01-01T00:00:00',
      updated_at: '2026-04-04T08:00:00',
    };
    expect(rowToWaterSettings(row)).toEqual({
      id: 1,
      goalOz: 64,
      createdAt: '2026-01-01T00:00:00',
      updatedAt: '2026-04-04T08:00:00',
    });
  });

  it('preserves null goalOz when goal_oz is null', () => {
    const row = {
      id: 1,
      goal_oz: null,
      created_at: '2026-01-01T00:00:00',
      updated_at: '2026-04-04T08:00:00',
    };
    const result = rowToWaterSettings(row);
    expect(result.goalOz).toBeNull();
  });

  it('maps goalOz of zero correctly', () => {
    const row = {
      id: 1,
      goal_oz: 0,
      created_at: '2026-01-01T00:00:00',
      updated_at: '2026-04-04T08:00:00',
    };
    const result = rowToWaterSettings(row);
    expect(result.goalOz).toBe(0);
  });
});
