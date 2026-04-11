import { evaluateBadge, determineTier, getRelevantBadges } from '../badgeEngine';
import type { BadgeDefinition, BadgeTier } from '../../types';

describe('badgeEngine', () => {
  describe('determineTier', () => {
    it('returns null when value is below Bronze threshold', () => {
      expect(determineTier(5, [10, 20, 30, 60, 100])).toBeNull();
    });

    it('returns Bronze (1) when value meets first threshold', () => {
      expect(determineTier(10, [10, 20, 30, 60, 100])).toBe(1);
    });

    it('returns Silver (2) when value meets second threshold', () => {
      expect(determineTier(25, [10, 20, 30, 60, 100])).toBe(2);
    });

    it('returns Gold (3) when value meets third threshold', () => {
      expect(determineTier(30, [10, 20, 30, 60, 100])).toBe(3);
    });

    it('returns Platinum (4) when value meets fourth threshold', () => {
      expect(determineTier(60, [10, 20, 30, 60, 100])).toBe(4);
    });

    it('returns Diamond (5) when value meets fifth threshold', () => {
      expect(determineTier(150, [10, 20, 30, 60, 100])).toBe(5);
    });

    it('returns 1 for one-time badges when value >= 1', () => {
      expect(determineTier(1, null)).toBe(1);
    });

    it('returns null for one-time badges when value is 0', () => {
      expect(determineTier(0, null)).toBeNull();
    });
  });

  describe('getRelevantBadges', () => {
    it('filters badges by event type', () => {
      const result = getRelevantBadges('SET_LOGGED');
      expect(result.length).toBeGreaterThan(0);
      result.forEach(b => {
        expect(b.relevantEvents).toContain('SET_LOGGED');
      });
    });

    it('returns different badges for different events', () => {
      const setBadges = getRelevantBadges('SET_LOGGED');
      const waterBadges = getRelevantBadges('WATER_LOGGED');
      expect(setBadges).not.toEqual(waterBadges);
    });
  });

  describe('evaluateBadge', () => {
    it('returns current value from evaluate function', async () => {
      const mockBadge: BadgeDefinition = {
        id: 'test_badge',
        name: 'Test',
        description: 'Test badge',
        category: 'fitness',
        iconName: 'star',
        tierThresholds: [10, 20, 30, 60, 100],
        evaluationType: 'cumulative',
        relevantEvents: ['SET_LOGGED'],
        evaluate: async () => 25,
      };

      const result = await evaluateBadge(mockBadge, {} as unknown);
      expect(result.currentValue).toBe(25);
      expect(result.tier).toBe(2); // Silver
      expect(result.nextThreshold).toBe(30); // Gold threshold
    });

    it('returns nextThreshold as null when Diamond is reached', async () => {
      const mockBadge: BadgeDefinition = {
        id: 'test_badge',
        name: 'Test',
        description: 'Test badge',
        category: 'fitness',
        iconName: 'star',
        tierThresholds: [10, 20, 30, 60, 100],
        evaluationType: 'cumulative',
        relevantEvents: ['SET_LOGGED'],
        evaluate: async () => 150,
      };

      const result = await evaluateBadge(mockBadge, {} as unknown);
      expect(result.tier).toBe(5); // Diamond
      expect(result.nextThreshold).toBeNull();
    });
  });
});
