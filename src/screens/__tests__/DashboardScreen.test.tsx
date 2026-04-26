jest.mock('../../db/progress', () => ({
  getWeeklySnapshot: jest.fn().mockResolvedValue({
    sessionsThisWeek: 0,
    prsThisWeek: 0,
    volumeChangePercent: null,
  }),
  getStatsStripData: jest.fn().mockResolvedValue({
    sessions: { current: 0, lastWeek: 0 },
    prs: { current: 0, lastWeek: 0 },
    tonnage: { currentLb: 0, lastWeekLb: 0 },
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
jest.mock('../../db/weightTrend', () => ({
  getWeightTrend: jest.fn().mockResolvedValue({
    today: null,
    currentSevenDayMA: null,
    previousSevenDayMA: null,
    dailySeries: [],
  }),
}));
jest.mock('../../db/volumeTrend', () => ({
  getVolumeTrend: jest.fn().mockResolvedValue({
    deltaPercent: null,
    weeklyBars: [],
  }),
}));
jest.mock('../../db/heroWorkoutContext', () => ({
  getHeroWorkoutContext: jest.fn().mockResolvedValue({
    headlineLift: null,
    addedSinceLast: null,
  }),
}));
jest.mock('../../services/UserProfileService', () => ({
  getUserFirstName: jest.fn().mockResolvedValue('Eric'),
  setUserFirstName: jest.fn().mockResolvedValue(undefined),
}));

import React from 'react';
import { waitFor, fireEvent } from '@testing-library/react-native';
import { renderWithProviders } from '../../test-utils';
import { DashboardScreen } from '../DashboardScreen';
import { getNextWorkoutDay } from '../../db/dashboard';
import { getActiveSession } from '../../db/sessions';
import { getUserFirstName } from '../../services/UserProfileService';

describe('DashboardScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (getNextWorkoutDay as jest.Mock).mockResolvedValue(null);
    (getUserFirstName as jest.Mock).mockResolvedValue('Eric');
  });

  it('renders greeting instead of Dashboard title', async () => {
    const { getByText, queryByText } = renderWithProviders(<DashboardScreen />);
    await waitFor(() => expect(getByText(/Good (morning|afternoon|evening)/)).toBeTruthy());
    // Old "Dashboard" title is gone
    expect(queryByText('Dashboard')).toBeNull();
  });

  it('LevelBar is removed', async () => {
    const { queryByTestId } = renderWithProviders(<DashboardScreen />);
    await waitFor(() => {});
    expect(queryByTestId('level-bar')).toBeNull();
  });

  it('StreakChip absent when streak=0 (scaffold renders null)', async () => {
    const { queryByTestId } = renderWithProviders(<DashboardScreen />);
    await waitFor(() => {});
    expect(queryByTestId('streak-chip')).toBeNull();
  });

  it('renders WeightTrendCard after async load', async () => {
    const { getByTestId } = renderWithProviders(<DashboardScreen />);
    await waitFor(() => expect(getByTestId('weight-trend-card')).toBeTruthy());
  });

  it('renders VolumeTrendCard after async load', async () => {
    const { getByTestId } = renderWithProviders(<DashboardScreen />);
    await waitFor(() => expect(getByTestId('volume-trend-card')).toBeTruthy());
  });

  it('renders StatsStrip after async load', async () => {
    const { getByTestId } = renderWithProviders(<DashboardScreen />);
    await waitFor(() => expect(getByTestId('stats-strip')).toBeTruthy());
  });

  it('renders HeroWorkoutCard when nextWorkout data exists', async () => {
    (getNextWorkoutDay as jest.Mock).mockResolvedValue({
      dayId: 1,
      dayName: 'Push Day',
      exerciseCount: 4,
      programName: 'PPL',
      programId: 1,
    });
    const { getByTestId } = renderWithProviders(<DashboardScreen />);
    await waitFor(() => expect(getByTestId('hero-start-button')).toBeTruthy());
  });

  it('does not render HeroWorkoutCard when nextWorkout is null', async () => {
    (getNextWorkoutDay as jest.Mock).mockResolvedValue(null);
    const { queryByTestId } = renderWithProviders(<DashboardScreen />);
    await waitFor(() => {});
    expect(queryByTestId('hero-start-button')).toBeNull();
  });

  it('renders settings gear icon and navigates to Settings on press', async () => {
    const { getByTestId } = renderWithProviders(<DashboardScreen />);
    await waitFor(() => getByTestId('settings-button'));
    fireEvent.press(getByTestId('settings-button'));
    expect(getByTestId('settings-button')).toBeTruthy();
  });

  it('shows NameSetupModal when firstName is null and not yet skipped', async () => {
    (getUserFirstName as jest.Mock).mockResolvedValue(null);
    const { getByTestId } = renderWithProviders(<DashboardScreen />);
    await waitFor(() => expect(getByTestId('name-setup-input')).toBeTruthy());
  });

  it('does not show NameSetupModal when firstName is already set', async () => {
    (getUserFirstName as jest.Mock).mockResolvedValue('Eric');
    const { queryByTestId } = renderWithProviders(<DashboardScreen />);
    await waitFor(() => {});
    expect(queryByTestId('name-setup-input')).toBeNull();
  });
});
