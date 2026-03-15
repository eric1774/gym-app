import React from 'react';
import { SessionProvider } from '../context/SessionContext';
import { TimerProvider } from '../context/TimerContext';

/**
 * Mock session DB functions so SessionProvider's useEffect resolves
 * without attempting real database queries. Import this BEFORE rendering.
 *
 * The mocks ensure:
 * - getActiveSession returns null (no active session)
 * - getExercises returns [] (empty exercise list)
 * - No other DB side effects fire
 */

// We mock the session DB module so SessionProvider.useEffect completes cleanly
jest.mock('../db/sessions', () => ({
  createSession: jest.fn().mockResolvedValue({ id: 1, startedAt: new Date().toISOString(), completedAt: null, programDayId: null }),
  getActiveSession: jest.fn().mockResolvedValue(null),
  completeSession: jest.fn().mockResolvedValue(undefined),
  getSessionExercises: jest.fn().mockResolvedValue([]),
  addExerciseToSession: jest.fn().mockResolvedValue(undefined),
  markExerciseComplete: jest.fn().mockResolvedValue(undefined),
  toggleExerciseComplete: jest.fn().mockResolvedValue(false),
  hasSessionActivity: jest.fn().mockResolvedValue(false),
  deleteSession: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../db/exercises', () => ({
  getExercises: jest.fn().mockResolvedValue([]),
  getExerciseById: jest.fn().mockResolvedValue(null),
  addExercise: jest.fn().mockResolvedValue(1),
  updateExercise: jest.fn().mockResolvedValue(undefined),
  deleteExercise: jest.fn().mockResolvedValue(undefined),
}));

/**
 * Wraps children in the real SessionProvider with DB calls mocked to return
 * safe defaults (no active session, empty exercise list).
 *
 * The provider's useEffect will run, resolve immediately with the mocked data,
 * and set isLoading to false. useSession() will return the idle state.
 */
export function MockSessionProvider({ children }: { children: React.ReactNode }) {
  return <SessionProvider>{children}</SessionProvider>;
}

/**
 * Wraps children in the real TimerProvider. Since BackgroundTimer, Sound,
 * HapticFeedback, and notifee are all mocked via __mocks__/, the provider
 * mounts cleanly in idle state (no active timer).
 *
 * useTimer() will return { remainingSeconds: null, totalSeconds: null, isRunning: false, ... }.
 */
export function MockTimerProvider({ children }: { children: React.ReactNode }) {
  return <TimerProvider>{children}</TimerProvider>;
}
