export type ExerciseCategory =
  | 'chest'
  | 'back'
  | 'legs'
  | 'shoulders'
  | 'arms'
  | 'core'
  | 'conditioning'
  | 'stretching';

export const EXERCISE_CATEGORIES: ExerciseCategory[] = [
  'chest',
  'back',
  'legs',
  'shoulders',
  'arms',
  'core',
  'conditioning',
  'stretching',
];

export type ExerciseMeasurementType = 'reps' | 'timed' | 'height_reps';

export interface Exercise {
  id: number;
  name: string;
  category: ExerciseCategory;
  defaultRestSeconds: number;
  isCustom: boolean;
  measurementType: ExerciseMeasurementType;
  createdAt: string;
}

export interface MuscleGroup {
  id: number;
  name: string;
  parentCategory: ExerciseCategory;
  sortOrder: number;
}

export interface ExerciseMuscleGroup {
  exerciseId: number;
  muscleGroupId: number;
  isPrimary: boolean;
}

export interface WorkoutSession {
  id: number;
  startedAt: string;
  completedAt: string | null;
  /** null in Phase 1; Phase 2 will populate this when attaching sessions to program days */
  programDayId: number | null;
  /** Program week captured at session creation (programs.current_week); null for ad-hoc sessions */
  programWeek: number | null;
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
  weightLbs: number;
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
  archivedAt: string | null;
}

export interface ProgramWeek {
  id: number;
  programId: number;
  weekNumber: number;
  name: string | null;
  details: string | null;
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
  targetWeightLbs: number;
  sortOrder: number;
  supersetGroupId: number | null;
  notes: string | null;
}

// ── Dashboard domain types (Phase 3) ──────────────────────────────

export interface ExerciseProgressPoint {
  sessionId: number;
  date: string;
  bestWeightLbs: number;
  bestReps: number;
}

export interface CategorySummary {
  category: ExerciseCategory;
  exerciseCount: number;
  sparklinePoints: number[];
  lastTrainedAt: string;
  measurementType: ExerciseMeasurementType;
}

export interface CategoryExerciseProgress {
  exerciseId: number;
  exerciseName: string;
  measurementType: ExerciseMeasurementType;
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
  weightLbs: number;
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

/** Tab identifier in the macro intake history chart. Wider than MacroType
 *  because calories is a derived series, not a stored macro. */
export type ChartTab = MacroType | 'calories';

/** Color used to render the Calories series and tab. Distinct from MACRO_COLORS. */
export const CALORIES_COLOR = '#F0C75B';

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

/** Snapshot of goals captured at export time. Mirrors MacroSettings'
 *  partially-set semantics: each macro field is null if its goal is unset.
 *  `calories` is null whenever any of protein/carbs/fat goal is null. */
export interface MacroGoalsSnapshot {
  protein: number | null;
  carbs: number | null;
  fat: number | null;
  calories: number | null;
}

/** Macros export envelope written to disk by ExportMacrosModal.
 *  `goals` is non-null whenever a macro_settings row exists (even if all its
 *  fields are null). It is null only when getMacroGoals() returned null
 *  (no row exists at all — first-time user who never opened goal setup). */
export interface MacrosExport {
  exportedAt: string;          // ISO 8601 UTC timestamp
  appVersion: string;          // from package.json
  range: { start: string; end: string };  // YYYY-MM-DD, inclusive
  goals: MacroGoalsSnapshot | null;
  days: MacroChartPoint[];     // already includes derived calories per row
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
  weightLbs: number;
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

/** A food search result — Food plus usage frequency count and optional last-used portion. */
export interface FoodSearchResult extends Food {
  usageCount: number;
  /** Last gram quantity used when logging this food — undefined for first-time foods (Phase 40 D-02). */
  lastUsedGrams?: number;
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

// -- Progress domain types (Phase X) --

export interface WeeklySnapshot {
  sessionsThisWeek: number;
  prsThisWeek: number;
  volumeChangePercent: number | null; // null if no previous week data
}

export interface MuscleGroupProgress {
  category: ExerciseCategory;
  volumeChangePercent: number | null;
  hasPR: boolean;
  lastTrainedAt: string | null;
}

export interface ExerciseInsights {
  weightChangePercent: number | null;
  volumeChangePercent: number | null;
  periodLabel: string; // e.g. "3 months"
}

export interface SessionComparison {
  currentSets: ExerciseHistorySet[];
  comparisonSets: ExerciseHistorySet[];
  comparisonDate: string;
  comparisonLabel: string; // "vs Previous Session" or "vs Last Month"
}

export interface SessionDayProgress {
  programDayId: number;
  dayName: string;
  volumeChangePercent: number | null;
  strengthChangePercent: number | null;
  hasPR: boolean;
  lastTrainedAt: string | null;
  sessionCount: number;
}

export interface SessionDayExerciseProgress {
  exerciseId: number;
  exerciseName: string;
  category: ExerciseCategory;
  measurementType: 'reps' | 'timed' | 'height_reps';
  volumeChangePercent: number | null;
  strengthChangePercent: number | null;
}

export interface ProgramSelectorItem {
  id: number;
  name: string;
  isArchived: boolean;
  archivedAt: string | null;
}

// -- Warmup domain types --

export type WarmupTrackingType = 'checkbox' | 'reps' | 'duration';

export interface WarmupExercise {
  id: number;
  name: string;
  trackingType: WarmupTrackingType;
  defaultValue: number | null;
  isCustom: boolean;
  createdAt: string;
}

export interface WarmupTemplate {
  id: number;
  name: string;
  createdAt: string;
}

export interface WarmupTemplateItem {
  id: number;
  templateId: number;
  exerciseId: number | null;
  warmupExerciseId: number | null;
  trackingType: WarmupTrackingType;
  targetValue: number | null;
  sortOrder: number;
}

/** Extended template item with resolved display name for UI rendering. */
export interface WarmupTemplateItemWithName extends WarmupTemplateItem {
  displayName: string;
  /** 'library' if exercise_id is set, 'warmup' if warmup_exercise_id is set */
  source: 'library' | 'warmup';
}

export interface WarmupSessionItem {
  id: number;
  sessionId: number;
  exerciseId: number | null;
  warmupExerciseId: number | null;
  displayName: string;
  trackingType: WarmupTrackingType;
  targetValue: number | null;
  isComplete: boolean;
  sortOrder: number;
}

export interface WeekOverride {
  id: number;
  programDayExerciseId: number;
  weekNumber: number;
  overrideSets: number | null;
  overrideReps: number | null;
  overrideWeightLbs: number | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface WeekExerciseResolved {
  programDayExerciseId: number;
  exerciseId: number;
  sortOrder: number;
  supersetGroupId: number | null;
  sets: number;
  reps: number;
  weightLbs: number;
  notes: string | null;
  overrideRowExists: boolean;
  setsOverridden: boolean;
  repsOverridden: boolean;
  weightOverridden: boolean;
  notesOverridden: boolean;
}

export interface SessionNote {
  sessionId: number;
  exerciseId: number;
  notes: string | null;
  updatedAt: string;
}

export * from './gamification';

// --- Body composition tracking ---
export type BodyMetricType = 'weight' | 'body_fat';
export type BodyMetricUnit = 'lb' | 'percent';

export interface BodyMetric {
  id: number;
  metricType: BodyMetricType;
  value: number;
  unit: BodyMetricUnit;
  recordedDate: string;        // ISO YYYY-MM-DD
  programId: number | null;
  note: string | null;
  createdAt: string;
  updatedAt: string;
}

export type BodyCompScope = 'month' | 'week' | 'day';

// ── Progress Hub redesign (2026-04-25) ────────────────────────────────

export interface ExerciseListItem {
  exerciseId: number;
  exerciseName: string;
  category: ExerciseCategory;
  measurementType: 'reps' | 'timed' | 'height_reps';
  lastTrainedAt: string | null;          // ISO; null if never trained
  sessionCount: number;
  sparklinePoints: number[];             // last up-to-8 best-weight values
  deltaPercent14d: number | null;        // null if <2 sessions in 14d window
}

export interface ProgramDayWeeklyTonnage {
  programDayId: number;
  dayName: string;
  exerciseCount: number;
  lastPerformedAt: string | null;
  weeklyTonnageLb: [number, number, number, number]; // [4wk, 3wk, 2wk, this wk]
  currentWeekTonnageLb: number;          // = weeklyTonnageLb[3]
  deltaPercent2wk: number | null;        // last 2wk vs prior 2wk; null if insufficient
}

export interface PRWatchCandidate {
  exerciseId: number;
  exerciseName: string;
  currentBestLb: number;
  targetLb: number;
  distanceLb: number;
}

export interface StaleExerciseCandidate {
  exerciseId: number;
  exerciseName: string;
  daysSinceLastTrained: number;
  category: ExerciseCategory;
}

export interface ChartPoint {
  sessionId: number;
  date: string;             // ISO
  bestWeightLb: number;     // top working set weight
  volumeLb: number;         // sum(weight × reps), working sets only (excludes warmups)
  isPR: boolean;
}
