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
  weightKg: number;
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
