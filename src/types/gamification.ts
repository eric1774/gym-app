// ── Tier System ──

export type BadgeTier = 1 | 2 | 3 | 4 | 5;

export const TIER_NAMES: Record<BadgeTier, string> = {
  1: 'Bronze',
  2: 'Silver',
  3: 'Gold',
  4: 'Platinum',
  5: 'Diamond',
};

export const TIER_COLORS: Record<BadgeTier, string> = {
  1: '#CD7F32',
  2: '#C0C0C0',
  3: '#FFB800',
  4: '#B4DCFF',
  5: '#FFFFFF',
};

// ── Badge Categories ──

export type BadgeCategory = 'fitness' | 'nutrition' | 'consistency' | 'recovery' | 'milestone';

export const BADGE_CATEGORIES: BadgeCategory[] = [
  'fitness', 'nutrition', 'consistency', 'recovery', 'milestone',
];

// ── Evaluation Types ──

export type EvaluationType = 'streak' | 'cumulative' | 'single_session' | 'composite' | 'one_time';

// ── App Events ──

export type AppEventType =
  | 'SET_LOGGED'
  | 'SESSION_COMPLETED'
  | 'MEAL_LOGGED'
  | 'WATER_LOGGED'
  | 'PR_ACHIEVED'
  | 'APP_OPENED'
  | 'DAY_BOUNDARY';

export interface AppEvent {
  type: AppEventType;
  timestamp: string;
  payload?: Record<string, unknown>;
}

// ── Badge Definition (data-driven registry) ──

export interface BadgeDefinition {
  id: string;
  name: string;
  description: string;
  category: BadgeCategory;
  iconName: string;
  tierThresholds: number[] | null;
  evaluationType: EvaluationType;
  relevantEvents: AppEventType[];
  evaluate: (db: unknown) => Promise<number>;
}

// ── DB Row Types ──

export interface BadgeRow {
  id: string;
  name: string;
  description: string;
  category: BadgeCategory;
  icon_name: string;
  tier_thresholds: string;
  evaluation_type: EvaluationType;
  sort_order: number;
}

export interface UserBadgeRow {
  id: number;
  badge_id: string;
  tier: BadgeTier;
  current_value: number;
  earned_at: string;
  notified: number;
}

export interface StreakShieldRow {
  id: number;
  shield_type: string;
  earned_at: string;
  used_at: string | null;
  used_for_date: string | null;
}

export interface UserLevelRow {
  id: number;
  current_level: number;
  title: string;
  consistency_score: number;
  fitness_score: number;
  nutrition_score: number;
  variety_score: number;
  last_calculated: string;
}

// ── UI State Types ──

export interface BadgeState {
  badgeId: string;
  currentTier: BadgeTier | null;
  currentValue: number;
  nextThreshold: number | null;
}

export interface LevelState {
  level: number;
  title: string;
  consistencyScore: number;
  fitnessScore: number;
  nutritionScore: number;
  varietyScore: number;
  progressToNext: number;
}

export interface ShieldState {
  workout: number;
  protein: number;
  water: number;
}

export interface CelebrationItem {
  badge: BadgeDefinition;
  newTier: BadgeTier;
  earnedAt: string;
}

export interface GamificationContextValue {
  badgeStates: Map<string, BadgeState>;
  levelState: LevelState;
  shieldState: ShieldState;
  pendingCelebrations: CelebrationItem[];
  isLoading: boolean;
  checkBadges: (event: AppEvent) => Promise<void>;
  dismissCelebration: () => void;
  refreshAll: () => Promise<void>;
  backfilledBadges: Array<{badge: BadgeDefinition; tier: BadgeTier}>;
  clearBackfill: () => void;
}

// ── Level Titles ──

export type LevelTitle = 'Beginner' | 'Novice' | 'Intermediate' | 'Advanced' | 'Elite' | 'Master' | 'Legend';

export const LEVEL_TITLE_RANGES: { min: number; max: number; title: LevelTitle }[] = [
  { min: 1, max: 10, title: 'Beginner' },
  { min: 11, max: 25, title: 'Novice' },
  { min: 26, max: 40, title: 'Intermediate' },
  { min: 41, max: 60, title: 'Advanced' },
  { min: 61, max: 80, title: 'Elite' },
  { min: 81, max: 95, title: 'Master' },
  { min: 96, max: 100, title: 'Legend' },
];
