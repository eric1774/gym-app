import type { LevelState, LevelTitle } from '../types';
import { LEVEL_TITLE_RANGES } from '../types';

const WEIGHTS = {
  consistency: 0.4,
  volume: 0.3,
  nutrition: 0.2,
  variety: 0.1,
};

/**
 * Get the title for a given level number.
 */
export function getLevelTitle(level: number): LevelTitle {
  for (const range of LEVEL_TITLE_RANGES) {
    if (level >= range.min && level <= range.max) {
      return range.title;
    }
  }
  return 'Beginner';
}

/**
 * Calculate a single subscale score (0-100) from raw metrics.
 * This is a placeholder that will be refined as we wire up real data.
 * Each subscale queries the DB for its own metrics.
 */
export function calculateSubscale(rawValue: number, maxExpected: number): number {
  return Math.min(100, Math.max(0, Math.round((rawValue / maxExpected) * 100)));
}

/**
 * Calculate composite level from 4 subscale scores (each 0-100).
 * Returns level (1-100), title, and progress to next level.
 */
export function calculateCompositeLevel(
  consistencyScore: number,
  fitnessScore: number,
  nutritionScore: number,
  varietyScore: number,
): LevelState {
  const weightedScore =
    consistencyScore * WEIGHTS.consistency +
    fitnessScore * WEIGHTS.volume +
    nutritionScore * WEIGHTS.nutrition +
    varietyScore * WEIGHTS.variety;

  const level = Math.max(1, Math.min(100, Math.round(weightedScore)));
  const title = getLevelTitle(level);
  const progressToNext = weightedScore - Math.floor(weightedScore);

  return {
    level,
    title,
    consistencyScore,
    fitnessScore,
    nutritionScore,
    varietyScore,
    progressToNext: Math.max(0, Math.min(1, progressToNext)),
  };
}
