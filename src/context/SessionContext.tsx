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
} from '../db/sessions';
import { getExercises } from '../db/exercises';
import { Exercise, ExerciseSession, WorkoutSession } from '../types';

interface SessionContextValue {
  session: WorkoutSession | null;
  sessionExercises: ExerciseSession[];
  /** Full Exercise objects keyed by exerciseId for each entry in sessionExercises */
  exercises: Exercise[];
  isLoading: boolean;
  startSession: () => Promise<void>;
  endSession: () => Promise<void>;
  addExercise: (exercise: Exercise) => Promise<void>;
  markExerciseComplete: (exerciseId: number) => Promise<void>;
  toggleExerciseComplete: (exerciseId: number) => Promise<void>;
  refreshSession: () => Promise<void>;
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

  const endSession = useCallback(async () => {
    if (!session) {
      return;
    }
    await completeSession(session.id);
    setSession(null);
    setSessionExercises([]);
    setExercises([]);
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

  const value = useMemo<SessionContextValue>(
    () => ({
      session,
      sessionExercises,
      exercises,
      isLoading,
      startSession,
      endSession,
      addExercise,
      markExerciseComplete,
      toggleExerciseComplete,
      refreshSession,
    }),
    [
      session,
      sessionExercises,
      exercises,
      isLoading,
      startSession,
      endSession,
      addExercise,
      markExerciseComplete,
      toggleExerciseComplete,
      refreshSession,
    ],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}
