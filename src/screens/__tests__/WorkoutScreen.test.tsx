import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { NavigationContainer } from '@react-navigation/native';

// Mock all DB modules WorkoutScreen imports at module level
jest.mock('../../db/programs', () => ({
  getProgramDayExercises: jest.fn().mockResolvedValue([]),
}));
jest.mock('../../db/dashboard', () => ({
  getExerciseHistory: jest.fn().mockResolvedValue([]),
}));
jest.mock('../../db/sessions', () => ({
  hasSessionActivity: jest.fn().mockResolvedValue(false),
  updateSessionRestSeconds: jest.fn().mockResolvedValue(undefined),
  createSession: jest.fn(),
  getActiveSession: jest.fn().mockResolvedValue(null),
  completeSession: jest.fn(),
  getSessionExercises: jest.fn().mockResolvedValue([]),
  addExerciseToSession: jest.fn(),
  markExerciseComplete: jest.fn(),
  toggleExerciseComplete: jest.fn().mockResolvedValue(false),
  deleteSession: jest.fn(),
}));
jest.mock('../../db/exercises', () => ({
  getExercises: jest.fn().mockResolvedValue([]),
  updateDefaultRestSeconds: jest.fn().mockResolvedValue(undefined),
}));
jest.mock('../../db/sets', () => ({
  checkForPR: jest.fn().mockResolvedValue(false),
  logSet: jest.fn(),
  getSetsForExerciseInSession: jest.fn().mockResolvedValue([]),
  getLastSessionSets: jest.fn().mockResolvedValue([]),
  deleteSet: jest.fn(),
}));

// Mock context hooks to control render state directly per test
const mockStartSession = jest.fn();
const mockEndSession = jest.fn().mockResolvedValue(true);
const mockAddExercise = jest.fn();
const mockToggleExerciseComplete = jest.fn();
const mockStartTimer = jest.fn();
const mockStopTimer = jest.fn();

// Default idle state — overridden per test
let mockSessionValue: any = {
  session: null,
  sessionExercises: [],
  exercises: [],
  isLoading: false,
  programDayId: null,
  startSession: mockStartSession,
  startSessionFromProgramDay: jest.fn(),
  endSession: mockEndSession,
  addExercise: mockAddExercise,
  markExerciseComplete: jest.fn(),
  toggleExerciseComplete: mockToggleExerciseComplete,
  refreshSession: jest.fn(),
};

let mockTimerValue: any = {
  remainingSeconds: null,
  totalSeconds: null,
  isRunning: false,
  startTimer: mockStartTimer,
  stopTimer: mockStopTimer,
};

jest.mock('../../context/SessionContext', () => ({
  useSession: () => mockSessionValue,
  SessionProvider: ({ children }: any) => children,
}));

jest.mock('../../context/TimerContext', () => ({
  useTimer: () => mockTimerValue,
  TimerProvider: ({ children }: any) => children,
}));

// Import WorkoutScreen AFTER mocks
import { WorkoutScreen } from '../WorkoutScreen';
import { getProgramDayExercises } from '../../db/programs';

function renderScreen() {
  return render(
    <NavigationContainer>
      <WorkoutScreen />
    </NavigationContainer>,
  );
}

beforeEach(() => {
  jest.clearAllMocks();
  // Reset to idle/no-session defaults
  mockSessionValue = {
    session: null,
    sessionExercises: [],
    exercises: [],
    isLoading: false,
    programDayId: null,
    startSession: mockStartSession,
    startSessionFromProgramDay: jest.fn(),
    endSession: mockEndSession,
    addExercise: mockAddExercise,
    markExerciseComplete: jest.fn(),
    toggleExerciseComplete: mockToggleExerciseComplete,
    refreshSession: jest.fn(),
  };
  mockTimerValue = {
    remainingSeconds: null,
    totalSeconds: null,
    isRunning: false,
    startTimer: mockStartTimer,
    stopTimer: mockStopTimer,
  };
});

describe('WorkoutScreen', () => {
  it('renders Start Workout button when no session is active', () => {
    mockSessionValue.session = null;
    const { getByText } = renderScreen();
    expect(getByText('Start Workout')).toBeTruthy();
    expect(getByText('Ready to train?')).toBeTruthy();
  });

  it('calls startSession when Start Workout is pressed', () => {
    mockSessionValue.session = null;
    const { getByText } = renderScreen();
    fireEvent.press(getByText('Start Workout'));
    expect(mockStartSession).toHaveBeenCalledTimes(1);
  });

  it('shows loading indicator when isLoading is true', () => {
    mockSessionValue.isLoading = true;
    const { queryByText } = renderScreen();
    // Loading state renders ActivityIndicator — no Start Workout button
    expect(queryByText('Start Workout')).toBeNull();
  });

  it('renders exercise names when session is active with exercises', () => {
    mockSessionValue.session = {
      id: 1,
      startedAt: '2026-01-01T10:00:00Z',
      completedAt: null,
      programDayId: null,
    };
    mockSessionValue.sessionExercises = [
      { exerciseId: 10, sessionId: 1, isComplete: false, restSeconds: 90 },
    ];
    mockSessionValue.exercises = [
      { id: 10, name: 'Bench Press', category: 'chest', measurementType: 'reps', defaultRestSeconds: 90 },
    ];
    const { getByText } = renderScreen();
    expect(getByText('Bench Press')).toBeTruthy();
  });

  it('shows empty state when session has no exercises', () => {
    mockSessionValue.session = {
      id: 1,
      startedAt: '2026-01-01T10:00:00Z',
      completedAt: null,
      programDayId: null,
    };
    mockSessionValue.sessionExercises = [];
    mockSessionValue.exercises = [];
    const { getByText } = renderScreen();
    expect(getByText('Tap + to add exercises')).toBeTruthy();
  });

  it('renders End Workout button during active session', () => {
    mockSessionValue.session = {
      id: 1,
      startedAt: '2026-01-01T10:00:00Z',
      completedAt: null,
      programDayId: null,
    };
    mockSessionValue.sessionExercises = [
      { exerciseId: 10, sessionId: 1, isComplete: false, restSeconds: 90 },
    ];
    mockSessionValue.exercises = [
      { id: 10, name: 'Bench Press', category: 'chest', measurementType: 'reps', defaultRestSeconds: 90 },
    ];
    const { getByText } = renderScreen();
    expect(getByText('End Workout')).toBeTruthy();
  });

  it('renders superset container with SUPERSET header when exercises have superset groups', async () => {
    mockSessionValue.session = {
      id: 1,
      startedAt: '2026-01-01T10:00:00Z',
      completedAt: null,
      programDayId: 5,
    };
    mockSessionValue.programDayId = 5;
    mockSessionValue.sessionExercises = [
      { exerciseId: 20, sessionId: 1, isComplete: false, restSeconds: 90 },
      { exerciseId: 21, sessionId: 1, isComplete: false, restSeconds: 90 },
    ];
    mockSessionValue.exercises = [
      { id: 20, name: 'Curl', category: 'arms', measurementType: 'reps', defaultRestSeconds: 90 },
      { id: 21, name: 'Tricep Ext', category: 'arms', measurementType: 'reps', defaultRestSeconds: 90 },
    ];

    (getProgramDayExercises as jest.Mock).mockResolvedValue([
      { id: 100, programDayId: 5, exerciseId: 20, targetSets: 3, targetReps: 10, targetWeightKg: 0, sortOrder: 0, supersetGroupId: 7 },
      { id: 101, programDayId: 5, exerciseId: 21, targetSets: 3, targetReps: 10, targetWeightKg: 0, sortOrder: 1, supersetGroupId: 7 },
    ]);

    const { getByText } = renderScreen();
    await waitFor(() => {
      expect(getByText(/SUPERSET/)).toBeTruthy();
    });
    expect(getByText('Curl')).toBeTruthy();
    expect(getByText('Tricep Ext')).toBeTruthy();
  });

  it('shows rest timer banner when isRunning is true', () => {
    mockSessionValue.session = {
      id: 1,
      startedAt: '2026-01-01T10:00:00Z',
      completedAt: null,
      programDayId: null,
    };
    mockSessionValue.sessionExercises = [
      { exerciseId: 10, sessionId: 1, isComplete: false, restSeconds: 90 },
    ];
    mockSessionValue.exercises = [
      { id: 10, name: 'Bench Press', category: 'chest', measurementType: 'reps', defaultRestSeconds: 90 },
    ];
    mockTimerValue = {
      remainingSeconds: 45,
      totalSeconds: 90,
      isRunning: true,
      startTimer: mockStartTimer,
      stopTimer: mockStopTimer,
    };
    const { getByText } = renderScreen();
    expect(getByText('Rest')).toBeTruthy();
    expect(getByText('Skip')).toBeTruthy();
  });
});
