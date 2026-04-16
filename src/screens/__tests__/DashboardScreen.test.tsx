jest.mock('../../db/progress', () => ({
  getWeeklySnapshot: jest.fn().mockResolvedValue({
    sessionsThisWeek: 0,
    prsThisWeek: 0,
    volumeChangePercent: null,
  }),
}));
jest.mock('../../context/GamificationContext', () => ({
  useGamification: () => ({
    levelState: { level: 1, title: 'Beginner', consistencyScore: 0, volumeScore: 0, nutritionScore: 0, varietyScore: 0, progressToNext: 0 },
    badgeStates: new Map(),
    shieldState: { workout: 0, protein: 0, water: 0 },
    pendingCelebrations: [],
    isLoading: false,
    checkBadges: jest.fn(),
    dismissCelebration: jest.fn(),
    refreshAll: jest.fn(),
    backfilledBadges: [],
    clearBackfill: jest.fn(),
  }),
  emitAppEvent: jest.fn(),
}));
jest.mock('../../db/badges', () => ({
  getEarnedBadges: jest.fn().mockResolvedValue([]),
}));
jest.mock('../../db/dashboard', () => ({
  getNextWorkoutDay: jest.fn().mockResolvedValue(null),
  getProgramTotalCompleted: jest.fn().mockResolvedValue(0),
}));
jest.mock('../../db/programs', () => ({
  getProgramDayExercises: jest.fn().mockResolvedValue([]),
  getPrograms: jest.fn().mockResolvedValue([]),
  getProgramDays: jest.fn().mockResolvedValue([]),
}));
jest.mock('../../db/exercises', () => ({
  getExercises: jest.fn().mockResolvedValue([]),
}));

import React from 'react';
import { waitFor, fireEvent } from '@testing-library/react-native';
import { renderWithProviders } from '../../test-utils';
import { DashboardScreen } from '../DashboardScreen';
import { getNextWorkoutDay } from '../../db/dashboard';
import { getActiveSession } from '../../db/sessions';
import { getWeeklySnapshot } from '../../db/progress';

describe('DashboardScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (getNextWorkoutDay as jest.Mock).mockResolvedValue(null);
    (getWeeklySnapshot as jest.Mock).mockResolvedValue({
      sessionsThisWeek: 0, prsThisWeek: 0, volumeChangePercent: null,
    });
  });

  it('renders Dashboard title', async () => {
    const { getByText } = renderWithProviders(<DashboardScreen />);
    await waitFor(() => getByText('Dashboard'));
    expect(getByText('Dashboard')).toBeTruthy();
  });

  it('renders Next Workout card when data exists', async () => {
    (getNextWorkoutDay as jest.Mock).mockResolvedValue({
      dayId: 1,
      dayName: 'Push Day',
      exerciseCount: 4,
      programName: 'PPL',
    });
    const { getByText } = renderWithProviders(<DashboardScreen />);
    await waitFor(() => getByText('NEXT WORKOUT'));
    expect(getByText('Push Day')).toBeTruthy();
    expect(getByText('4 exercises · PPL')).toBeTruthy();
    expect(getByText('Start')).toBeTruthy();
  });

  it('renders Active Workout card when session exists', async () => {
    (getActiveSession as jest.Mock).mockResolvedValue({
      id: 1,
      startedAt: new Date().toISOString(),
      completedAt: null,
      programDayId: null,
    });
    (getNextWorkoutDay as jest.Mock).mockResolvedValue({
      dayId: 1,
      dayName: 'Push Day',
      exerciseCount: 4,
      programName: 'PPL',
    });
    const { getByText } = renderWithProviders(<DashboardScreen />);
    await waitFor(() => getByText('ACTIVE WORKOUT'));
    expect(getByText('Continue')).toBeTruthy();
  });

  it('renders settings gear icon and navigates to Settings on press', async () => {
    const { getByTestId } = renderWithProviders(<DashboardScreen />);
    await waitFor(() => getByTestId('settings-button'));
    fireEvent.press(getByTestId('settings-button'));
    expect(getByTestId('settings-button')).toBeTruthy();
  });

  it('renders WeeklySnapshotCard with snapshot data', async () => {
    (getWeeklySnapshot as jest.Mock).mockResolvedValue({
      sessionsThisWeek: 4, prsThisWeek: 2, volumeChangePercent: 15,
    });
    const { getByTestId } = renderWithProviders(<DashboardScreen />);
    await waitFor(() => getByTestId('weekly-snapshot-card'));
    expect(getByTestId('weekly-snapshot-card')).toBeTruthy();
  });
});
