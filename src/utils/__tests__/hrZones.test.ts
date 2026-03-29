import { computeMaxHR, getHRZone } from '../hrZones';

describe('computeMaxHR', () => {
  it('applies Tanaka formula when override is null', () => {
    // 208 - 0.7 * 35 = 208 - 24.5 = 183.5 → rounds to 184
    expect(computeMaxHR(35, null)).toBe(184);
  });

  it('applies Tanaka formula for age 40', () => {
    // 208 - 0.7 * 40 = 208 - 28 = 180
    expect(computeMaxHR(40, null)).toBe(180);
  });

  it('applies Tanaka formula for age 50', () => {
    // 208 - 0.7 * 50 = 208 - 35 = 173
    expect(computeMaxHR(50, null)).toBe(173);
  });

  it('returns override when override is provided', () => {
    expect(computeMaxHR(35, 175)).toBe(175);
  });

  it('returns override even when age would produce different result', () => {
    expect(computeMaxHR(40, 190)).toBe(190);
  });
});

describe('getHRZone', () => {
  const maxHr = 180;

  it('returns Zone 1 (Recovery) for bpm below 50% of maxHr', () => {
    const zone = getHRZone(80, maxHr); // 80/180 = 44.4% — below Zone 1 min
    expect(zone.zone).toBe(1);
    expect(zone.name).toBe('Recovery');
  });

  it('returns Zone 1 (Recovery) at exactly 50% of maxHr', () => {
    const zone = getHRZone(90, maxHr); // 90/180 = 50% — Zone 1 boundary
    expect(zone.zone).toBe(1);
    expect(zone.name).toBe('Recovery');
  });

  it('returns Zone 2 (Easy) at 60% of maxHr', () => {
    const zone = getHRZone(108, maxHr); // 108/180 = 60%
    expect(zone.zone).toBe(2);
    expect(zone.name).toBe('Easy');
  });

  it('returns Zone 3 (Aerobic) at 70% of maxHr', () => {
    const zone = getHRZone(126, maxHr); // 126/180 = 70%
    expect(zone.zone).toBe(3);
    expect(zone.name).toBe('Aerobic');
  });

  it('returns Zone 4 (Threshold) at 80% of maxHr', () => {
    const zone = getHRZone(144, maxHr); // 144/180 = 80%
    expect(zone.zone).toBe(4);
    expect(zone.name).toBe('Threshold');
  });

  it('returns Zone 5 (Max) at exactly 90% of maxHr', () => {
    const zone = getHRZone(162, maxHr); // 162/180 = 90%
    expect(zone.zone).toBe(5);
    expect(zone.name).toBe('Max');
  });

  it('returns Zone 5 (Max) for bpm well above 90% of maxHr', () => {
    const zone = getHRZone(175, maxHr); // 175/180 = 97%
    expect(zone.zone).toBe(5);
    expect(zone.name).toBe('Max');
  });

  it('returns zone with the correct color', () => {
    const zone3 = getHRZone(126, maxHr); // Zone 3 Aerobic
    expect(zone3.color).toBe('#FFD700');
  });

  it('returns zone with correct percentage range', () => {
    const zone2 = getHRZone(108, maxHr); // Zone 2 Easy
    expect(zone2.minPercent).toBe(60);
    expect(zone2.maxPercent).toBe(70);
  });
});
