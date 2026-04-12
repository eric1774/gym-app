import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  createSession,
  getActiveSession,
  completeSession,
  getSessionExercises,
  addExerciseToSession,
  markExerciseComplete as dbMarkExerciseComplete,
  toggleExerciseComplete as dbToggleExerciseComplete,
  hasSessionActivity,
  deleteSession,
} from '../db/sessions';
import { getExercises } from '../db/exercises';
import { db as dbPromise, executeSql } from '../db/database';
import { Exercise, ExerciseSession, WorkoutSession } from '../types';
import { emitAppEvent } from './GamificationContext';

interface SessionContextValue {
  session: WorkoutSession | null;
  sessionExercises: ExerciseSession[];
  /** Full Exercise objects keyed by exerciseId for each entry in sessionExercises */
  exercises: Exercise[];
  isLoading: boolean;
  /** The program day id if this is a program workout, null otherwise */
  programDayId: number | null;
  startSession: () => Promise<void>;
  startSessionFromProgramDay: (programDayId: number, exercises: Exercise[]) => Promise<void>;
  /** End the session. Returns true if completed (had activity), false if discarded. */
  endSession: () => Promise<boolean>;
  addExercise: (exercise: Exercise) => Promise<void>;
  markExerciseComplete: (exerciseId: number) => Promise<void>;
  toggleExerciseComplete: (exerciseId: number) => Promise<void>;
  refreshSession: () => Promise<void>;
  swapExercise: (oldExerciseId: number, newExercise: Exercise, keepSets: boolean) => Promise<void>;
  removeExerciseFromSession: (exerciseId: number) => Promise<void>;
}

const SessionContext = createContext<SessionContextValue | undefined>(undefined);

export function useSession(): SessionContextValue {
  const ctx = useContext(SessionContext);
  if (!ctx) {
    throw new Error('useSession must be used inside <SessionProvider>');
  }
  return ctx;
}

interface Props {
  children: React.ReactNode;
}

export function SessionProvider({ children }: Props) {
  const [session, setSession] = useState<WorkoutSession | null>(null);
  const [sessionExercises, setSessionExercises] = useState<ExerciseSession[]>([]);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  /** Cache of all exercises by id — populated once and reused */
  const allExercisesRef = useRef<Map<number, Exercise>>(new Map());

  /** Load all exercises from DB and populate the cache. */
  const loadAllExercises = useCallback(async () => {
    const all = await getExercises();
    const map = new Map<number, Exercise>();
    for (const ex of all) {
      map.set(ex.id, ex);
    }
    allExercisesRef.current = map;
  }, []);

  /** Given sessionExercises, resolve and return full Exercise objects in the same order. */
  const resolveExercises = useCallback((sExs: ExerciseSession[]): Exercise[] => {
    const resolved: Exercise[] = [];
    for (const se of sExs) {
      const ex = allExercisesRef.current.get(se.exerciseId);
      if (ex) {
        resolved.push(ex);
      }
    }
    return resolved;
  }, []);

  const refreshSession = useCallback(async () => {
    const active = await getActiveSession();
    setSession(active);
    if (active) {
      const sExs = await getSessionExercises(active.id);
      setSessionExercises(sExs);
      setExercises(resolveExercises(sExs));
    } else {
      setSessionExercises([]);
      setExercises([]);
    }
  }, [resolveExercises]);

  /** On mount: load exercise cache, then resume any in-progress session. */
  useEffect(() => {
    let cancelled = false;
    (async () => {
      await loadAllExercises();
      if (!cancelled) {
        await refreshSession();
        setIsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [loadAllExercises, refreshSession]);

  const startSession = useCallback(async () => {
    await createSession();
    await refreshSession();
  }, [refreshSession]);

  const startSessionFromProgramDay = useCallback(
    async (pdId: number, exs: Exercise[]) => {
      const newSession = await createSession(pdId);
      for (const ex of exs) {
        await addExerciseToSession(newSession.id, ex.id, ex.defaultRestSeconds);
        // Update cache in case this is a new custom exercise
        allExercisesRef.current.set(ex.id, ex);
      }
      await refreshSession();
    },
    [refreshSession],
  );

  const endSession = useCallback(async (): Promise<boolean> => {
    if (!session) {
      return false;
    }
    const hadActivity = await hasSessionActivity(session.id);
    if (hadActivity) {
      await completeSession(session.id);
      emitAppEvent({ type: 'SESSION_COMPLETED', timestamp: new Date().toISOString() });
    } else {
      await deleteSession(session.id);
    }
    setSession(null);
    setSessionExercises([]);
    setExercises([]);
    return hadActivity;
  }, [session]);

  const addExercise = useCallback(
    async (exercise: Exercise) => {
      if (!session) {
        return;
      }
      await addExerciseToSession(session.id, exercise.id, exercise.defaultRestSeconds);
      // Update cache in case this is a new custom exercise
      allExercisesRef.current.set(exercise.id, exercise);
      // Append to local state without a full DB refresh
      setSessionExercises(prev => {
        const next = [...prev, { exerciseId: exercise.id, sessionId: session.id, isComplete: false, restSeconds: exercise.defaultRestSeconds }];
        setExercises(resolveExercises(next));
        return next;
      });
    },
    [session, resolveExercises],
  );

  const markExerciseComplete = useCallback(
    async (exerciseId: number) => {
      if (!session) {
        return;
      }
      await dbMarkExerciseComplete(session.id, exerciseId);
      setSessionExercises(prev => {
        const next = prev.map(se =>
          se.exerciseId === exerciseId ? { ...se, isComplete: true } : se,
        );
        setExercises(resolveExercises(next));
        return next;
      });
    },
    [session, resolveExercises],
  );

  const toggleExerciseComplete = useCallback(
    async (exerciseId: number) => {
      if (!session) {
        return;
      }
      const newIsComplete = await dbToggleExerciseComplete(session.id, exerciseId);
      setSessionExercises(prev => {
        const next = prev.map(se =>
          se.exerciseId === exerciseId ? { ...se, isComplete: newIsComplete } : se,
        );
        setExercises(resolveExercises(next));
        return next;
      });
    },
    [session, resolveExercises],
  );

  const removeExerciseFromSession = async (exerciseId: number) => {
    if (!session) return;
    const database = await dbPromise;
    await executeSql(
      database,
      'DELETE FROM workout_sets WHERE session_id = ? AND exercise_id = ?',
      [session.id, exerciseId],
    );
    await executeSql(
      database,
      'DELETE FROM exercise_sessions WHERE session_id = ? AND exercise_id = ?',
      [session.id, exerciseId],
    );
    await refreshSession();
  };

  const swapExercise = async (oldExerciseId: number, newExercise: Exercise, keepSets: boolean) => {
    if (!session) return;
    if (!keepSets) {
      await removeExerciseFromSession(oldExerciseId);
    } else {
      const database = await dbPromise;
      await executeSql(
        database,
        'UPDATE exercise_sessions SET is_complete = 1 WHERE session_id = ? AND exercise_id = ?',
        [session.id, oldExerciseId],
      );
    }
    const database = await dbPromise;
    await executeSql(
      database,
      'INSERT OR IGNORE INTO exercise_sessions (exercise_id, session_id, is_complete, rest_seconds) VALUES (?, ?, 0, ?)',
      [newExercise.id, session.id, newExercise.defaultRestSeconds],
    );
    await loadAllExercises();
    await refreshSession();
  };

  const programDayId = session?.programDayId ?? null;

  const value = useMemo<SessionContextValue>(
    () => ({
      session,
      sessionExercises,
      exercises,
      isLoading,
      programDayId,
      startSession,
      startSessionFromProgramDay,
      endSession,
      addExercise,
      markExerciseComplete,
      toggleExerciseComplete,
      refreshSession,
      swapExercise,
      removeExerciseFromSession,
    }),
    [
      session,
      sessionExercises,
      exercises,
      isLoading,
      programDayId,
      startSession,
      startSessionFromProgramDay,
      endSession,
      addExercise,
      markExerciseComplete,
      toggleExerciseComplete,
      refreshSession,
      swapExercise,
      removeExerciseFromSession,
    ],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}
