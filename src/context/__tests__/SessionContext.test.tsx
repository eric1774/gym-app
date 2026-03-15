import React from 'react';
import { Text, View } from 'react-native';
import { render, act, waitFor } from '@testing-library/react-native';
import { SessionProvider, useSession } from '../SessionContext';
import {
  createSession,
  getActiveSession,
  completeSession,
  getSessionExercises,
  addExerciseToSession,
  hasSessionActivity,
  deleteSession,
  toggleExerciseComplete as dbToggleExerciseComplete,
} from '../../db/sessions';
import { getExercises } from '../../db/exercises';

jest.mock('../../db/sessions', () => ({
  createSession: jest.fn(),
  getActiveSession: jest.fn(),
  completeSession: jest.fn(),
  getSessionExercises: jest.fn(),
  addExerciseToSession: jest.fn(),
  markExerciseComplete: jest.fn(),
  toggleExerciseComplete: jest.fn(),
  hasSessionActivity: jest.fn(),
  deleteSession: jest.fn(),
}));

jest.mock('../../db/exercises', () => ({
  getExercises: jest.fn(),
}));

function TestConsumer({ onCtx }: { onCtx?: (ctx: any) => void }) {
  const ctx = useSession();
  React.useEffect(() => {
    onCtx?.(ctx);
  });
  return (
    <View>
      <Text testID="loading">{String(ctx.isLoading)}</Text>
      <Text testID="session">{ctx.session ? String(ctx.session.id) : 'null'}</Text>
      <Text testID="exerciseCount">{String(ctx.sessionExercises.length)}</Text>
    </View>
  );
}

const mockSession = {
  id: 1,
  startedAt: '2025-01-01T00:00:00',
  completedAt: null,
  programDayId: null,
};

describe('SessionContext', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (getActiveSession as jest.Mock).mockResolvedValue(null);
    (getExercises as jest.Mock).mockResolvedValue([]);
    (getSessionExercises as jest.Mock).mockResolvedValue([]);
    (createSession as jest.Mock).mockResolvedValue(mockSession);
    (hasSessionActivity as jest.Mock).mockResolvedValue(false);
    (deleteSession as jest.Mock).mockResolvedValue(undefined);
    (completeSession as jest.Mock).mockResolvedValue(undefined);
    (addExerciseToSession as jest.Mock).mockResolvedValue(undefined);
    (dbToggleExerciseComplete as jest.Mock).mockResolvedValue(true);
  });

  it('starts in loading state then transitions to idle', async () => {
    const { getByTestId } = render(
      <SessionProvider>
        <TestConsumer />
      </SessionProvider>,
    );

    // Initially isLoading should be true
    expect(getByTestId('loading').props.children).toBe('true');

    // After async init, loading transitions to false with no session
    await waitFor(() =>
      expect(getByTestId('loading').props.children).toBe('false'),
    );
    expect(getByTestId('session').props.children).toBe('null');
  });

  it('resumes active session on mount', async () => {
    const activeSession = { id: 42, startedAt: '2025-01-01T00:00:00', completedAt: null, programDayId: null };
    const exerciseInSession = { exerciseId: 1, sessionId: 42, isComplete: false, restSeconds: 60 };
    const exercise = { id: 1, name: 'Squat', category: 'legs' as const, defaultRestSeconds: 60, isCustom: false, measurementType: 'reps' as const, createdAt: '' };

    (getActiveSession as jest.Mock).mockResolvedValue(activeSession);
    (getSessionExercises as jest.Mock).mockResolvedValue([exerciseInSession]);
    (getExercises as jest.Mock).mockResolvedValue([exercise]);

    const { getByTestId } = render(
      <SessionProvider>
        <TestConsumer />
      </SessionProvider>,
    );

    await waitFor(() =>
      expect(getByTestId('loading').props.children).toBe('false'),
    );

    expect(getByTestId('session').props.children).toBe('42');
    expect(getByTestId('exerciseCount').props.children).toBe('1');
  });

  it('startSession creates session and refreshes state', async () => {
    let ctxRef: any;
    render(
      <SessionProvider>
        <TestConsumer onCtx={(c) => { ctxRef = c; }} />
      </SessionProvider>,
    );

    await waitFor(() => expect(ctxRef.isLoading).toBe(false));

    // Mock getActiveSession to return session for the refresh after startSession
    (getActiveSession as jest.Mock).mockResolvedValue(mockSession);
    (getSessionExercises as jest.Mock).mockResolvedValue([]);

    await act(async () => {
      await ctxRef.startSession();
    });

    expect(createSession).toHaveBeenCalled();
    expect(getActiveSession).toHaveBeenCalledTimes(2); // once on mount, once after startSession
  });

  it('addExercise appends to sessionExercises', async () => {
    const activeSession = { id: 1, startedAt: '2025-01-01T00:00:00', completedAt: null, programDayId: null };
    (getActiveSession as jest.Mock).mockResolvedValue(activeSession);

    const exercise = { id: 5, name: 'Deadlift', category: 'back' as const, defaultRestSeconds: 120, isCustom: false, measurementType: 'reps' as const, createdAt: '' };

    let ctxRef: any;
    const { getByTestId } = render(
      <SessionProvider>
        <TestConsumer onCtx={(c) => { ctxRef = c; }} />
      </SessionProvider>,
    );

    await waitFor(() => expect(ctxRef.isLoading).toBe(false));
    expect(getByTestId('exerciseCount').props.children).toBe('0');

    await act(async () => {
      await ctxRef.addExercise(exercise);
    });

    expect(addExerciseToSession).toHaveBeenCalledWith(1, 5, 120);
    expect(getByTestId('exerciseCount').props.children).toBe('1');
  });

  it('endSession with activity calls completeSession', async () => {
    const activeSession = { id: 1, startedAt: '2025-01-01T00:00:00', completedAt: null, programDayId: null };
    (getActiveSession as jest.Mock).mockResolvedValue(activeSession);
    (hasSessionActivity as jest.Mock).mockResolvedValue(true);

    let ctxRef: any;
    const { getByTestId } = render(
      <SessionProvider>
        <TestConsumer onCtx={(c) => { ctxRef = c; }} />
      </SessionProvider>,
    );

    await waitFor(() => expect(ctxRef.isLoading).toBe(false));
    expect(getByTestId('session').props.children).toBe('1');

    await act(async () => {
      await ctxRef.endSession();
    });

    expect(completeSession).toHaveBeenCalledWith(1);
    expect(deleteSession).not.toHaveBeenCalled();
    expect(getByTestId('session').props.children).toBe('null');
  });

  it('endSession without activity calls deleteSession', async () => {
    const activeSession = { id: 1, startedAt: '2025-01-01T00:00:00', completedAt: null, programDayId: null };
    (getActiveSession as jest.Mock).mockResolvedValue(activeSession);
    (hasSessionActivity as jest.Mock).mockResolvedValue(false);

    let ctxRef: any;
    const { getByTestId } = render(
      <SessionProvider>
        <TestConsumer onCtx={(c) => { ctxRef = c; }} />
      </SessionProvider>,
    );

    await waitFor(() => expect(ctxRef.isLoading).toBe(false));
    expect(getByTestId('session').props.children).toBe('1');

    await act(async () => {
      await ctxRef.endSession();
    });

    expect(deleteSession).toHaveBeenCalledWith(1);
    expect(completeSession).not.toHaveBeenCalled();
    expect(getByTestId('session').props.children).toBe('null');
  });

  it('toggleExerciseComplete flips isComplete', async () => {
    const activeSession = { id: 1, startedAt: '2025-01-01T00:00:00', completedAt: null, programDayId: null };
    const exerciseInSession = { exerciseId: 3, sessionId: 1, isComplete: false, restSeconds: 90 };
    const exercise = { id: 3, name: 'Bench Press', category: 'chest' as const, defaultRestSeconds: 90, isCustom: false, measurementType: 'reps' as const, createdAt: '' };

    (getActiveSession as jest.Mock).mockResolvedValue(activeSession);
    (getSessionExercises as jest.Mock).mockResolvedValue([exerciseInSession]);
    (getExercises as jest.Mock).mockResolvedValue([exercise]);
    (dbToggleExerciseComplete as jest.Mock).mockResolvedValue(true);

    let ctxRef: any;
    render(
      <SessionProvider>
        <TestConsumer onCtx={(c) => { ctxRef = c; }} />
      </SessionProvider>,
    );

    await waitFor(() => expect(ctxRef.isLoading).toBe(false));

    await act(async () => {
      await ctxRef.toggleExerciseComplete(3);
    });

    expect(dbToggleExerciseComplete).toHaveBeenCalledWith(1, 3);
  });
});
