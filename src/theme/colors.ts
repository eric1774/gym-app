export const colors = {
  background: '#151718',          // Deep charcoal — NEVER pure black
  surface: '#1E2024',             // Container/section backgrounds
  surfaceElevated: '#24272C',     // Card backgrounds (nested inside surfaces)
  border: 'rgba(255,255,255,0.05)', // Subtle 1px edge definition
  borderStrong: 'rgba(255,255,255,0.14)', // Stronger 1.5px edges (check circles)
  primary: '#FFFFFF',             // Primary text, titles
  secondary: '#8E9298',           // Subtitles, timestamps, section headers
  secondaryDim: '#6A6E74',        // Dimmer meta text
  accent: '#8DC28A',              // Mint green — CTAs, active states, progress fills
  accentDim: '#1A3326',           // Very faint mint for subtle backgrounds
  accentGlow: 'rgba(141,194,138,0.15)', // Mint highlight fill
  onAccent: '#1A1A1A',            // Dark text on accent-colored backgrounds
  danger: '#D9534F',              // Muted red/coral for destructive actions
  timerActive: '#FACC15',         // Timer accent (keep existing)
  tabBar: '#151718',              // Match app background
  tabIconActive: '#8DC28A',       // Mint green for active tab
  tabIconInactive: '#555555',     // Medium grey for inactive tabs
  prGold: '#FFB800',              // Warm amber-gold for PR toasts and highlights
  prGoldDim: '#3D2E00',           // Subtle background behind PR toast text
  water: '#4A8DB7',               // Ocean blue for hydration cup fill
  waterDark: '#1A2F3D',           // Dark blue tint for empty cup background
  warmupAmber: '#F0B830',         // Warm-up pending eyebrow + border
  supersetPurple: '#B57AE0',      // Superset chrome + A1/A2 badges + glow
  hrZone1: '#5B9BF0',             // HR zone 1 (recovery) — blue
  hrZone2: '#8DC28A',             // HR zone 2 (aerobic) — mint
  hrZone3: '#FACC15',             // HR zone 3 (tempo) — yellow
  hrZone4: '#E8845C',             // HR zone 4 (threshold) — orange
  hrZone5: '#E0697E',             // HR zone 5 (anaerobic) — red
} as const;

export type ColorKey = keyof typeof colors;

/** Per-category accent colors for visual differentiation */
export const categoryColors: Record<string, string> = {
  chest: '#E8845C',
  back: '#5B9BF0',
  legs: '#B57AE0',
  shoulders: '#4ECDC4',
  arms: '#8DC28A',
  core: '#F0B830',
  conditioning: '#E0697E',
  stretching: '#9B8EC4',
};

export function getCategoryColor(category: string): string {
  return categoryColors[category] ?? colors.accent;
}

/** Map HR zone (1..5) to color. Returns disconnected-grey when null. */
export function getHrZoneColor(zone: 1 | 2 | 3 | 4 | 5 | null): string {
  if (zone === null) { return colors.secondaryDim; }
  const map = [colors.hrZone1, colors.hrZone2, colors.hrZone3, colors.hrZone4, colors.hrZone5];
  return map[zone - 1];
}
