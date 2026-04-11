import type { BadgeDefinition, BadgeTier, BadgeState, AppEventType } from '../types';
import { getBadgesForEvent } from '../data/badgeDefinitions';

export interface BadgeEvalResult {
  currentValue: number;
  tier: BadgeTier | null;
  nextThreshold: number | null;
}

/**
 * Determine the tier for a given value against thresholds.
 * Returns null if below Bronze. Returns 1 for one-time badges (null thresholds) when value >= 1.
 */
export function determineTier(
  value: number,
  thresholds: number[] | null,
): BadgeTier | null {
  // One-time badges: earned if value >= 1
  if (thresholds === null) {
    return value >= 1 ? 1 : null;
  }

  let tier: BadgeTier | null = null;
  for (let i = 0; i < thresholds.length; i++) {
    if (value >= thresholds[i]) {
      tier = (i + 1) as BadgeTier;
    } else {
      break;
    }
  }
  return tier;
}

/**
 * Get the next threshold above the current tier, or null if maxed out.
 */
export function getNextThreshold(
  currentTier: BadgeTier | null,
  thresholds: number[] | null,
): number | null {
  if (thresholds === null) return null; // One-time badge
  if (currentTier === null) return thresholds[0]; // Not yet earned — Bronze threshold
  if (currentTier >= 5) return null; // Diamond — maxed out
  return thresholds[currentTier]; // Next tier threshold
}

/**
 * Get all badge definitions relevant to a given event type.
 */
export function getRelevantBadges(eventType: AppEventType): BadgeDefinition[] {
  return getBadgesForEvent(eventType);
}

/**
 * Evaluate a single badge against the database, returning current value, tier, and next threshold.
 */
export async function evaluateBadge(
  badge: BadgeDefinition,
  db: unknown,
): Promise<BadgeEvalResult> {
  const currentValue = await badge.evaluate(db);
  const tier = determineTier(currentValue, badge.tierThresholds);
  const nextThreshold = getNextThreshold(tier, badge.tierThresholds);

  return { currentValue, tier, nextThreshold };
}

/**
 * Evaluate all relevant badges for an event, returning updated states.
 * Only evaluates badges that match the event type (relevance filtering).
 */
export async function evaluateRelevantBadges(
  eventType: AppEventType,
  db: unknown,
  currentStates: Map<string, BadgeState>,
): Promise<{ updated: Map<string, BadgeState>; newTierUps: Array<{ badge: BadgeDefinition; newTier: BadgeTier }> }> {
  const relevantBadges = getRelevantBadges(eventType);
  const updated = new Map(currentStates);
  const newTierUps: Array<{ badge: BadgeDefinition; newTier: BadgeTier }> = [];

  for (const badge of relevantBadges) {
    const result = await evaluateBadge(badge, db);
    const previousState = currentStates.get(badge.id);
    const previousTier = previousState?.currentTier ?? null;

    updated.set(badge.id, {
      badgeId: badge.id,
      currentTier: result.tier,
      currentValue: result.currentValue,
      nextThreshold: result.nextThreshold,
    });

    // Detect tier-up
    if (result.tier !== null && (previousTier === null || result.tier > previousTier)) {
      newTierUps.push({ badge, newTier: result.tier });
    }
  }

  return { updated, newTierUps };
}
