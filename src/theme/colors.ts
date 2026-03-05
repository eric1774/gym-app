export const colors = {
  background: '#0F0F0F',
  surface: '#1A1A1A',
  surfaceElevated: '#242424',
  border: '#2E2E2E',
  primary: '#FFFFFF',
  secondary: '#9A9A9A',
  accent: '#4ADE80',
  accentDim: '#1A3326',
  danger: '#EF4444',
  timerActive: '#FACC15',
  tabBar: '#141414',
  tabIconActive: '#FFFFFF',
  tabIconInactive: '#555555',
} as const;

export type ColorKey = keyof typeof colors;
