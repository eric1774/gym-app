import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import BackgroundTimer from 'react-native-background-timer';

// ─── Per-exercise stopwatch state ───────────────────────────────────────────

interface StopwatchEntry {
  seconds: number;
  running: boolean;
}

interface StopwatchContextValue {
  /** Get current stopwatch state for an exercise (defaults to 0 / stopped) */
  getStopwatch: (exerciseId: number) => StopwatchEntry;
  startStopwatch: (exerciseId: number) => void;
  stopStopwatch: (exerciseId: number) => void;
  resetStopwatch: (exerciseId: number) => void;
}

const StopwatchContext = createContext<StopwatchContextValue | null>(null);

// ─── Provider ───────────────────────────────────────────────────────────────

export function StopwatchProvider({ children }: { children: React.ReactNode }) {
  // Map of exerciseId → { seconds, running }
  const [stopwatches, setStopwatches] = useState<Record<number, StopwatchEntry>>({});

  // Refs for the BackgroundTimer interval ids, keyed by exerciseId
  const intervalsRef = useRef<Record<number, number>>({});

  const clearInterval = useCallback((exerciseId: number) => {
    const id = intervalsRef.current[exerciseId];
    if (id !== undefined) {
      BackgroundTimer.clearInterval(id);
      delete intervalsRef.current[exerciseId];
    }
  }, []);

  const getStopwatch = useCallback(
    (exerciseId: number): StopwatchEntry =>
      stopwatches[exerciseId] ?? { seconds: 0, running: false },
    [stopwatches],
  );

  const startStopwatch = useCallback((exerciseId: number) => {
    // Clear any existing interval for this exercise
    const existingId = intervalsRef.current[exerciseId];
    if (existingId !== undefined) {
      BackgroundTimer.clearInterval(existingId);
    }

    setStopwatches(prev => ({
      ...prev,
      [exerciseId]: { seconds: prev[exerciseId]?.seconds ?? 0, running: true },
    }));

    const intervalId = BackgroundTimer.setInterval(() => {
      setStopwatches(prev => {
        const entry = prev[exerciseId];
        if (!entry || !entry.running) { return prev; }
        return { ...prev, [exerciseId]: { ...entry, seconds: entry.seconds + 1 } };
      });
    }, 1000);

    intervalsRef.current[exerciseId] = intervalId;
  }, []);

  const stopStopwatch = useCallback((exerciseId: number) => {
    clearInterval(exerciseId);
    setStopwatches(prev => {
      const entry = prev[exerciseId];
      if (!entry) { return prev; }
      return { ...prev, [exerciseId]: { ...entry, running: false } };
    });
  }, [clearInterval]);

  const resetStopwatch = useCallback((exerciseId: number) => {
    clearInterval(exerciseId);
    setStopwatches(prev => {
      const { [exerciseId]: _, ...rest } = prev;
      return rest;
    });
  }, [clearInterval]);

  // Cleanup all intervals on unmount
  useEffect(() => {
    return () => {
      Object.keys(intervalsRef.current).forEach(key => {
        BackgroundTimer.clearInterval(intervalsRef.current[Number(key)]);
      });
      intervalsRef.current = {};
    };
  }, []);

  return (
    <StopwatchContext.Provider
      value={{ getStopwatch, startStopwatch, stopStopwatch, resetStopwatch }}>
      {children}
    </StopwatchContext.Provider>
  );
}

// ─── Hook ────────────────────────────────────────────────────────────────────

export function useStopwatch(): StopwatchContextValue {
  const ctx = useContext(StopwatchContext);
  if (!ctx) {
    throw new Error('useStopwatch must be used within a StopwatchProvider');
  }
  return ctx;
}
