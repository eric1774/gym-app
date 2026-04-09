export type ExerciseCategory =
  | 'chest'
  | 'back'
  | 'legs'
  | 'shoulders'
  | 'arms'
  | 'core'
  | 'conditioning';

export const EXERCISE_CATEGORIES: ExerciseCategory[] = [
  'chest',
  'back',
  'legs',
  'shoulders',
  'arms',
  'core',
  'conditioning',
];

export type ExerciseMeasurementType = 'reps' | 'timed';

export interface Exercise {
  id: number;
  name: string;
  category: ExerciseCategory;
  defaultRestSeconds: number;
  isCustom: boolean;
  measurementType: ExerciseMeasurementType;
  createdAt: string;
}

export interface WorkoutSession {
  id: number;
  startedAt: string;
  completedAt: string | null;
  /** null in Phase 1; Phase 2 will populate this when attaching sessions to program days */
  programDayId: number | null;
  /** Average heart rate (BPM) for the session — null when no HR monitor was used (Phase 26) */
  avgHr: number | null;
  /** Peak heart rate (BPM) for the session — null when no HR monitor was used (Phase 26) */
  peakHr: number | null;
}

export interface WorkoutSet {
  id: number;
  sessionId: number;
  exerciseId: number;
  setNumber: number;
  weightKg: number;
  reps: number;
  loggedAt: string;
  isWarmup: boolean;
}

export interface ExerciseSession {
  exerciseId: number;
  sessionId: number;
  isComplete: boolean;
  restSeconds: number;
}

// ── Program domain types (Phase 2) ──────────────────────────────────

export interface Program {
  id: number;
  name: string;
  weeks: number;
  startDate: string | null;
  currentWeek: number;
  createdAt: string;
}

export interface ProgramDay {
  id: number;
  programId: number;
  name: string;
  sortOrder: number;
  createdAt: string;
}

export interface ProgramDayExercise {
  id: number;
  programDayId: number;
  exerciseId: number;
  targetSets: number;
  targetReps: number;
  targetWeightKg: number;
  sortOrder: number;
  supersetGroupId: number | null;
}

// ── Dashboard domain types (Phase 3) ──────────────────────────────

export interface ExerciseProgressPoint {
  sessionId: number;
  date: string;
  bestWeightKg: number;
  bestReps: number;
}

export interface CategorySummary {
  category: ExerciseCategory;
  exerciseCount: number;
  sparklinePoints: number[];
  lastTrainedAt: string;
  measurementType: 'reps' | 'timed';
}

export interface CategoryExerciseProgress {
  exerciseId: number;
  exerciseName: string;
  measurementType: 'reps' | 'timed';
  sparklinePoints: number[];
  currentBest: number;
  previousBest: number | null;
  lastTrainedAt: string;
}

export interface ExerciseHistorySession {
  sessionId: number;
  date: string;
  sets: ExerciseHistorySet[];
}

export interface ExerciseHistorySet {
  setNumber: number;
  weightKg: number;
  reps: number;
  isWarmup: boolean;
}

export interface ProgramDayCompletionStatus {
  dayId: number;
  dayName: string;
  isCompletedThisWeek: boolean;
  sessionId: number | null;
}

export interface NextWorkoutInfo {
  programId: number;
  programName: string;
  dayId: number;
  dayName: string;
  exerciseCount: number;
}

export interface SessionTimeSummary {
  totalSeconds: number;
  activeSeconds: number;
  restSeconds: number;
}

export interface FullDataExport {
  exportedAt: string;
  exercises: Exercise[];
  sessions: (WorkoutSession & { sets: WorkoutSet[] })[];
  programs: (Program & { days: (ProgramDay & { exercises: ProgramDayExercise[] })[] })[];
}

// ── Protein domain types (Phase 4) ──────────────────────────────────

export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';

export const MEAL_TYPES: MealType[] = [
  'breakfast',
  'lunch',
  'dinner',
  'snack',
];

export interface Meal {
  id: number;
  proteinGrams: number;
  description: string;
  mealType: MealType;
  /** Local datetime string in YYYY-MM-DDTHH:MM:SS format (no Z suffix) */
  loggedAt: string;
  /** Local date string in YYYY-MM-DD format for day-boundary queries */
  localDate: string;
  createdAt: string;
}

export interface ProteinSettings {
  id: number;
  dailyGoalGrams: number;
  createdAt: string;
  updatedAt: string;
}

export interface ProteinChartPoint {
  /** YYYY-MM-DD */
  date: string;
  totalProteinGrams: number;
  goalGrams: number | null;
}

// -- Meal Library domain types (Phase 8) --
export interface LibraryMeal {
  id: number;
  name: string;
  proteinGrams: number;
  mealType: MealType;
  createdAt: string;
}

// -- Macro domain types (Phase 30) --

export type MacroType = 'protein' | 'carbs' | 'fat';

export const MACRO_COLORS: Record<MacroType, string> = {
  protein: '#8DC28A',
  carbs: '#5B9BF0',
  fat: '#E8845C',
};

export const CALORIES_PER_GRAM: Record<MacroType, number> = {
  protein: 4,
  carbs: 4,
  fat: 9,
};

/** Object shape used by macros.ts for multi-macro values. */
export interface MacroValues {
  protein: number;
  carbs: number;
  fat: number;
}

/** A meal with full macro data. Separate from frozen Meal type (per D-06). */
export interface MacroMeal {
  id: number;
  description: string;
  mealType: MealType;
  protein: number;
  carbs: number;
  fat: number;
  calories: number;
  loggedAt: string;
  localDate: string;
  createdAt: string;
}

/** Macro goal settings — NULL columns mean "not set yet" (per D-02). */
export interface MacroSettings {
  id: number;
  proteinGoal: number | null;
  carbGoal: number | null;
  fatGoal: number | null;
  createdAt: string;
  updatedAt: string;
}

/** Chart data point for a single macro over time. */
export interface MacroChartPoint {
  date: string;
  protein: number;
  carbs: number;
  fat: number;
  calories: number;
}

/** A reusable macro-aware meal template in the library. */
export interface MacroLibraryMeal {
  id: number;
  name: string;
  protein: number;
  carbs: number;
  fat: number;
  calories: number;
  mealType: MealType;
  createdAt: string;
}

// -- Calendar domain types (Phase 13) --

/** A day in a month that had at least one completed workout. */
export interface CalendarDaySession {
  /** YYYY-MM-DD local date string */
  date: string;
  /** Number of completed sessions on this date */
  sessionCount: number;
}

/** Detailed session info for the day detail screen. */
export interface CalendarSessionDetail {
  sessionId: number;
  startedAt: string;
  completedAt: string;
  programDayName: string | null;
  durationSeconds: number;
  totalSets: number;
  totalVolume: number;
  exerciseCount: number;
  prCount: number;
  exercises: CalendarExerciseDetail[];
  /** Average heart rate (BPM) — null when no HR monitor was used (Phase 26) */
  avgHr: number | null;
  /** Peak heart rate (BPM) — null when no HR monitor was used (Phase 26) */
  peakHr: number | null;
}

/** Per-exercise breakdown within a session. */
export interface CalendarExerciseDetail {
  exerciseId: number;
  exerciseName: string;
  sets: CalendarSetDetail[];
}

/** Individual set within an exercise. */
export interface CalendarSetDetail {
  setNumber: number;
  weightKg: number;
  reps: number;
  isWarmup: boolean;
  isPR: boolean;
}

// -- Program Export types (Phase 22) --

export interface ProgramExportSet {
  setNumber: number;
  weightLbs: number;
  reps: number;
  isWarmup: boolean;
}

export interface ProgramExportExercise {
  exerciseName: string;
  sets: ProgramExportSet[];
}

export interface ProgramExportDay {
  dayName: string;
  completedAt: string;
  exercises: ProgramExportExercise[];
}

export interface ProgramExportWeek {
  weekNumber: number;
  days: ProgramExportDay[];
}

export interface ProgramExport {
  programName: string;
  totalWeeks: number;
  completionPercent: number;
  exportedAt: string;
  weeks: ProgramExportWeek[];
}

// -- Heart Rate domain types (Phase 24) --

/** Possible states of the BLE device connection. */
export type DeviceConnectionState =
  | 'disconnected'
  | 'scanning'
  | 'connecting'
  | 'connected'
  | 'reconnecting';

/** User-configurable HR settings stored in AsyncStorage. */
export interface HRSettings {
  /** User's age in years — required before pairing (per D-06) */
  age: number | null;
  /** User-overridden max HR, or null to use Tanaka formula (per D-08) */
  maxHrOverride: number | null;
  /** BLE device ID of previously paired device, or null if never paired */
  pairedDeviceId: string | null;
}

/** Computed max HR (from age or override) and the 5-zone thresholds. */
export interface HRZoneThresholds {
  maxHr: number;
  /** Zone boundaries: [zone1Min, zone2Min, zone3Min, zone4Min, zone5Min] at 50/60/70/80/90% of maxHr */
  zones: [number, number, number, number, number];
}

/** The five HR training zones. */
export type HRZoneNumber = 1 | 2 | 3 | 4 | 5;

/** Zone metadata for display. */
export interface HRZoneInfo {
  zone: HRZoneNumber;
  name: string;
  minPercent: number;
  maxPercent: number;
  color: string;
}

/** HR zone constants — labels, colors, and percentage ranges for the 5-zone model. */
export const HR_ZONES: HRZoneInfo[] = [
  { zone: 1, name: 'Recovery',  minPercent: 50, maxPercent: 60, color: '#90EE90' },
  { zone: 2, name: 'Easy',      minPercent: 60, maxPercent: 70, color: '#00BFFF' },
  { zone: 3, name: 'Aerobic',   minPercent: 70, maxPercent: 80, color: '#FFD700' },
  { zone: 4, name: 'Threshold', minPercent: 80, maxPercent: 90, color: '#FF8C00' },
  { zone: 5, name: 'Max',       minPercent: 90, maxPercent: 100, color: '#FF4500' },
];

// -- Hydration domain types (Phase 34) --

/** A single water intake log entry. */
export interface WaterLog {
  id: number;
  /** Amount in fluid ounces (always whole number per D-05) */
  amountOz: number;
  /** Local datetime string in YYYY-MM-DDTHH:MM:SS format */
  loggedAt: string;
  /** Local date string in YYYY-MM-DD format for day-boundary queries */
  localDate: string;
  createdAt: string;
}

/** User's hydration goal settings. goal_oz is nullable — null means no goal set yet (per D-08). */
export interface WaterSettings {
  id: number;
  /** Daily water goal in fluid ounces, or null if not yet configured */
  goalOz: number | null;
  createdAt: string;
  updatedAt: string;
}

// -- Food domain types (Phase 38) --

/** A food item from the USDA database or user-created custom food. */
export interface Food {
  id: number;
  fdcId: number | null;
  name: string;
  category: string | null;
  proteinPer100g: number;
  carbsPer100g: number;
  fatPer100g: number;
  caloriesPer100g: number;
  searchText: string;
  isCustom: boolean;
}

/** A food search result — Food plus usage frequency count. */
export interface FoodSearchResult extends Food {
  usageCount: number;
}

// -- Meal Food domain types (Phase 39) --

/** A food entry within a logged meal — snapshot of macros at log time. */
export interface MealFood {
  id: number;
  mealId: number;
  foodId: number;
  foodName: string;
  grams: number;
  protein: number;
  carbs: number;
  fat: number;
  calories: number;
}

/** Input for adding a food to a meal — builder passes this to addMealWithFoods. */
export interface MealFoodInput {
  foodId: number;
  foodName: string;
  grams: number;
  proteinPer100g: number;
  carbsPer100g: number;
  fatPer100g: number;
}
