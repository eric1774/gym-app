jest.mock('../../db/dashboard', () => ({
  getRecentlyTrainedExercises: jest.fn().mockResolvedValue([]),
  getNextWorkoutDay: jest.fn().mockResolvedValue(null),
  getProgramTotalCompleted: jest.fn().mockResolvedValue(0),
}));
jest.mock('../../db/programs', () => ({
  getProgramDayExercises: jest.fn().mockResolvedValue([]),
  getPrograms: jest.fn().mockResolvedValue([]),
  getProgramDays: jest.fn().mockResolvedValue([]),
}));

import React from 'react';
import { waitFor } from '@testing-library/react-native';
import { renderWithProviders } from '../../test-utils';
import { DashboardScreen } from '../DashboardScreen';
import { getRecentlyTrainedExercises, getNextWorkoutDay } from '../../db/dashboard';
import { getActiveSession } from '../../db/sessions';

describe('DashboardScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (getRecentlyTrainedExercises as jest.Mock).mockResolvedValue([]);
    (getNextWorkoutDay as jest.Mock).mockResolvedValue(null);
  });

  it('renders Dashboard title', async () => {
    const { getByText } = renderWithProviders(<DashboardScreen />);
    await waitFor(() => getByText('Dashboard'));
    expect(getByText('Dashboard')).toBeTruthy();
  });

  it('shows empty state when no exercises', async () => {
    (getRecentlyTrainedExercises as jest.Mock).mockResolvedValue([]);
    const { getByText } = renderWithProviders(<DashboardScreen />);
    await waitFor(() => getByText(/No exercises trained yet/));
    expect(getByText(/No exercises trained yet/)).toBeTruthy();
  });

  it('renders exercise cards when data loaded', async () => {
    (getRecentlyTrainedExercises as jest.Mock).mockResolvedValue([
      {
        exerciseId: 1,
        exerciseName: 'Bench Press',
        category: 'chest',
        lastTrainedAt: new Date().toISOString(),
        measurementType: 'reps',
      },
    ]);
    const { getByText } = renderWithProviders(<DashboardScreen />);
    await waitFor(() => getByText('Bench Press'));
    expect(getByText('Bench Press')).toBeTruthy();
    expect(getByText('STRENGTH TRAINING')).toBeTruthy();
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
});
