export const colors = {
  background: '#151718',      // Deep charcoal — NEVER pure black
  surface: '#1E2024',         // Container/section backgrounds
  surfaceElevated: '#24272C', // Card backgrounds (nested inside surfaces)
  border: 'rgba(255,255,255,0.05)', // Subtle 1px edge definition
  primary: '#FFFFFF',         // Primary text, titles
  secondary: '#8E9298',       // Subtitles, timestamps, section headers
  accent: '#8DC28A',          // Mint green — CTAs, active states, progress fills
  accentDim: '#1A3326',       // Very faint mint for subtle backgrounds
  onAccent: '#1A1A1A',        // Dark text on accent-colored backgrounds
  danger: '#D9534F',          // Muted red/coral for destructive actions
  timerActive: '#FACC15',     // Timer accent (keep existing)
  tabBar: '#151718',          // Match app background
  tabIconActive: '#8DC28A',   // Mint green for active tab
  tabIconInactive: '#555555', // Medium grey for inactive tabs
  prGold: '#FFB800',          // Warm amber-gold for PR toasts and highlights
  prGoldDim: '#3D2E00',       // Subtle background behind PR toast text
  water: '#4A8DB7',           // Ocean blue for hydration cup fill
  waterDark: '#1A2F3D',       // Dark blue tint for empty cup background
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
};

export function getCategoryColor(category: string): string {
  return categoryColors[category] ?? colors.accent;
}
