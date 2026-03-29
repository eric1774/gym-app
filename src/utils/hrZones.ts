import { HR_ZONES, HRZoneInfo } from '../types';

/**
 * Compute effective max heart rate.
 *
 * Uses manual override when provided; otherwise applies the Tanaka formula
 * (208 − 0.7 × age), which is more accurate than 220-age for adults over 40.
 * Result is rounded to the nearest whole BPM.
 *
 * @param age - User's age in years
 * @param override - User-provided max HR override (bpm), or null to use formula
 * @returns Effective max HR in BPM (rounded integer)
 */
export function computeMaxHR(age: number, override: number | null): number {
  if (override !== null) {
    return override;
  }
  return Math.round(208 - 0.7 * age);
}

/**
 * Determine which HR training zone a BPM reading falls into.
 *
 * Uses the standard 5-zone model with zone boundaries at 50/60/70/80/90%
 * of max HR:
 *   Zone 1 — Recovery:  < 60%
 *   Zone 2 — Easy:     60%–70%
 *   Zone 3 — Aerobic:  70%–80%
 *   Zone 4 — Threshold:80%–90%
 *   Zone 5 — Max:      ≥ 90%
 *
 * Values below 50% of max HR are clamped to Zone 1.
 *
 * @param bpm - Current heart rate reading in BPM
 * @param maxHr - Effective max HR (use computeMaxHR to derive)
 * @returns HRZoneInfo for the matching zone
 */
export function getHRZone(bpm: number, maxHr: number): HRZoneInfo {
  // Compute percentage of max HR
  const pct = (bpm / maxHr) * 100;

  // Walk zones from highest to lowest — return first zone whose minPercent bpm meets
  for (let i = HR_ZONES.length - 1; i >= 0; i--) {
    if (pct >= HR_ZONES[i].minPercent) {
      return HR_ZONES[i];
    }
  }

  // Below Zone 1 minimum (< 50%) — clamp to Zone 1
  return HR_ZONES[0];
}
