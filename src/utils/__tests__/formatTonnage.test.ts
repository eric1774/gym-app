import { formatTonnage } from '../formatTonnage';

describe('formatTonnage', () => {
  it('formats <1000 as raw lb', () => {
    expect(formatTonnage(0)).toBe('0 lb');
    expect(formatTonnage(845)).toBe('845 lb');
    expect(formatTonnage(999)).toBe('999 lb');
  });
  it('formats 1000–99,999 with one decimal and K suffix', () => {
    expect(formatTonnage(1000)).toBe('1.0K lb');
    expect(formatTonnage(4200)).toBe('4.2K lb');
    expect(formatTonnage(24500)).toBe('24.5K lb');
    expect(formatTonnage(99499)).toBe('99.5K lb');
  });
  it('formats ≥100,000 with no decimal and K suffix', () => {
    expect(formatTonnage(100000)).toBe('100K lb');
    expect(formatTonnage(125000)).toBe('125K lb');
  });
  it('rounds correctly at decimal boundaries', () => {
    expect(formatTonnage(4249)).toBe('4.2K lb');
    expect(formatTonnage(4250)).toBe('4.3K lb');
  });
});
