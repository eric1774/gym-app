export const colors = {
  background: '#151718',      // Deep charcoal — NEVER pure black
  surface: '#1E2024',         // Container/section backgrounds
  surfaceElevated: '#24272C', // Card backgrounds (nested inside surfaces)
  border: 'rgba(255,255,255,0.05)', // Subtle 1px edge definition
  primary: '#FFFFFF',         // Primary text, titles
  secondary: '#8E9298',       // Subtitles, timestamps, section headers
  accent: '#8DC28A',          // Mint green — CTAs, active states, progress fills
  accentDim: '#1A3326',       // Very faint mint for subtle backgrounds
  danger: '#D9534F',          // Muted red/coral for destructive actions
  timerActive: '#FACC15',     // Timer accent (keep existing)
  tabBar: '#151718',          // Match app background
  tabIconActive: '#8DC28A',   // Mint green for active tab
  tabIconInactive: '#555555', // Medium grey for inactive tabs
} as const;

export type ColorKey = keyof typeof colors;
