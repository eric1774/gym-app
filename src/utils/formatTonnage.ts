/**
 * Format a weight total (in lb) for dashboard display.
 *
 * <1000 lb       → "845 lb"   (raw, no suffix)
 * 1000–99,999    → "24.5K lb" (one decimal, K suffix)
 * ≥100,000       → "125K lb"  (no decimal, K suffix)
 */
export function formatTonnage(lb: number): string {
  if (lb < 1000) {
    return `${Math.round(lb)} lb`;
  }
  if (lb < 100000) {
    return `${(lb / 1000).toFixed(1)}K lb`;
  }
  return `${Math.round(lb / 1000)}K lb`;
}
