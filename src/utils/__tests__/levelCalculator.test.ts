import { calculateCompositeLevel, getLevelTitle, calculateSubscale } from '../levelCalculator';

describe('levelCalculator', () => {
  describe('getLevelTitle', () => {
    it('returns Beginner for level 1', () => {
      expect(getLevelTitle(1)).toBe('Beginner');
    });

    it('returns Novice for level 15', () => {
      expect(getLevelTitle(15)).toBe('Novice');
    });

    it('returns Intermediate for level 30', () => {
      expect(getLevelTitle(30)).toBe('Intermediate');
    });

    it('returns Advanced for level 50', () => {
      expect(getLevelTitle(50)).toBe('Advanced');
    });

    it('returns Elite for level 70', () => {
      expect(getLevelTitle(70)).toBe('Elite');
    });

    it('returns Master for level 90', () => {
      expect(getLevelTitle(90)).toBe('Master');
    });

    it('returns Legend for level 100', () => {
      expect(getLevelTitle(100)).toBe('Legend');
    });
  });

  describe('calculateCompositeLevel', () => {
    it('returns level 1 for all zero scores', () => {
      const result = calculateCompositeLevel(0, 0, 0, 0);
      expect(result.level).toBe(1);
      expect(result.title).toBe('Beginner');
    });

    it('returns level 100 for all perfect scores', () => {
      const result = calculateCompositeLevel(100, 100, 100, 100);
      expect(result.level).toBe(100);
      expect(result.title).toBe('Legend');
    });

    it('weights consistency at 40%', () => {
      const highConsistency = calculateCompositeLevel(100, 0, 0, 0);
      const highVolume = calculateCompositeLevel(0, 100, 0, 0);
      expect(highConsistency.level).toBeGreaterThan(highVolume.level);
    });

    it('calculates progress to next level', () => {
      const result = calculateCompositeLevel(50, 50, 50, 50);
      expect(result.progressToNext).toBeGreaterThanOrEqual(0);
      expect(result.progressToNext).toBeLessThanOrEqual(1);
    });
  });
});
