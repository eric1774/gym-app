import { getLocalDateString, getLocalDateTimeString } from '../../utils/dates';

describe('getLocalDateString', () => {
  it('returns zero-padded YYYY-MM-DD for single-digit month and day', () => {
    const date = new Date(2026, 0, 5); // January 5, 2026
    expect(getLocalDateString(date)).toBe('2026-01-05');
  });

  it('returns correct date for December boundary', () => {
    const date = new Date(2026, 11, 31); // December 31, 2026
    expect(getLocalDateString(date)).toBe('2026-12-31');
  });

  it('returns correct date for New Year January 1st', () => {
    const date = new Date(2026, 0, 1); // January 1, 2026
    expect(getLocalDateString(date)).toBe('2026-01-01');
  });

  it('returns local date for late night time (does not shift to next day)', () => {
    const date = new Date(2025, 11, 31, 23, 59, 59); // December 31, 2025 23:59:59 local
    expect(getLocalDateString(date)).toBe('2025-12-31');
  });

  it('zero-pads single-digit month (March = month index 2) and single-digit day', () => {
    const date = new Date(2026, 2, 7); // March 7, 2026
    expect(getLocalDateString(date)).toBe('2026-03-07');
  });

  it('result matches YYYY-MM-DD format regex', () => {
    const date = new Date(2026, 5, 15); // June 15, 2026
    expect(getLocalDateString(date)).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

describe('getLocalDateTimeString', () => {
  it('zero-pads single-digit hours, minutes, and seconds', () => {
    const date = new Date(2026, 2, 15, 9, 5, 3); // March 15, 2026 09:05:03
    expect(getLocalDateTimeString(date)).toBe('2026-03-15T09:05:03');
  });

  it('returns correct datetime for midnight', () => {
    const date = new Date(2026, 0, 1, 0, 0, 0); // January 1, 2026 00:00:00
    expect(getLocalDateTimeString(date)).toBe('2026-01-01T00:00:00');
  });

  it('returns correct datetime for end of day', () => {
    const date = new Date(2026, 11, 31, 23, 59, 59); // December 31, 2026 23:59:59
    expect(getLocalDateTimeString(date)).toBe('2026-12-31T23:59:59');
  });

  it('result does NOT end with Z (no UTC suffix)', () => {
    const date = new Date(2026, 2, 15, 9, 5, 3);
    expect(getLocalDateTimeString(date)).not.toMatch(/Z$/);
  });

  it('result matches YYYY-MM-DDTHH:MM:SS format regex', () => {
    const date = new Date(2026, 5, 15, 14, 30, 45); // June 15, 2026 14:30:45
    expect(getLocalDateTimeString(date)).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/);
  });
});
