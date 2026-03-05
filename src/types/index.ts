export type ExerciseCategory =
  | 'chest'
  | 'back'
  | 'legs'
  | 'shoulders'
  | 'arms'
  | 'core';

export const EXERCISE_CATEGORIES: ExerciseCategory[] = [
  'chest',
  'back',
  'legs',
  'shoulders',
  'arms',
  'core',
];

export interface Exercise {
  id: number;
  name: string;
  category: ExerciseCategory;
  defaultRestSeconds: number;
  isCustom: boolean;
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
}
