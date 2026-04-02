import { computeCalories } from '../macros';

describe('computeCalories', () => {
  it('computes calories from all three macros', () => {
    expect(computeCalories(30, 50, 20)).toBe(500);
  });

  it('returns 0 when all macros are 0', () => {
    expect(computeCalories(0, 0, 0)).toBe(0);
  });

  it('computes protein-only calories (4 cal/g)', () => {
    expect(computeCalories(100, 0, 0)).toBe(400);
  });

  it('computes carbs-only calories (4 cal/g)', () => {
    expect(computeCalories(0, 100, 0)).toBe(400);
  });

  it('computes fat-only calories (9 cal/g)', () => {
    expect(computeCalories(0, 0, 100)).toBe(900);
  });

  it('handles decimal gram values without rounding', () => {
    // 25.5*4 + 30.2*4 + 10.8*9 = 102 + 120.8 + 97.2 = 320
    expect(computeCalories(25.5, 30.2, 10.8)).toBeCloseTo(320, 5);
  });
});
