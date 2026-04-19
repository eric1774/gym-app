/** In-memory per-set state used by the V1 workout screen.
 *  isPR is ephemeral (not persisted) — it is set at log-time by
 *  checkForPR and lost if the session is rehydrated mid-run.
 */
export interface SetState {
  id: number;              // matches DB WorkoutSet.id after logSet returns
  setNumber: number;       // 1-based
  w: number;               // weight lb (0 for timed)
  r: number;               // reps OR duration seconds for timed
  isPR?: boolean;          // session-scoped only
  isWarmup: boolean;       // reflects the DB column
}

export interface NextSet {
  w: number;
  r: number;
}

export interface PadTarget {
  exerciseId: number;
  field: 'w' | 'r';
  initialValue: number;
  label: string;           // exercise name for eyebrow
}

/** Program-day target for an exercise. Sourced from DB via getProgramDayExercises;
 *  consumed by the WorkoutScreen's programTargetsMap and by ProgramTargetReference.
 */
export interface ProgramTarget {
  pdeId: number;
  targetSets: number;
  targetReps: number;
  targetWeightLbs: number;
}
