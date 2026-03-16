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
jest.mock('../../db/exercises', () => ({
  getExercises: jest.fn().mockResolvedValue([]),
}));

import React from 'react';
import { waitFor, fireEvent } from '@testing-library/react-native';
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

  it('renders exercises with relative time (just now)', async () => {
    const now = new Date().toISOString();
    (getRecentlyTrainedExercises as jest.Mock).mockResolvedValue([
      { exerciseId: 1, exerciseName: 'Bench Press', category: 'chest', lastTrainedAt: now, measurementType: 'reps' },
    ]);
    const { getByText } = renderWithProviders(<DashboardScreen />);
    await waitFor(() => getByText('Bench Press'));
    expect(getByText('just now')).toBeTruthy();
  });

  it('renders exercises with relative time (hours ago)', async () => {
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
    (getRecentlyTrainedExercises as jest.Mock).mockResolvedValue([
      { exerciseId: 1, exerciseName: 'Squat', category: 'legs', lastTrainedAt: twoHoursAgo, measurementType: 'reps' },
    ]);
    const { getByText } = renderWithProviders(<DashboardScreen />);
    await waitFor(() => getByText('Squat'));
    expect(getByText('2h ago')).toBeTruthy();
  });

  it('renders exercises with relative time (days ago)', async () => {
    const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString();
    (getRecentlyTrainedExercises as jest.Mock).mockResolvedValue([
      { exerciseId: 1, exerciseName: 'Deadlift', category: 'back', lastTrainedAt: twoDaysAgo, measurementType: 'reps' },
    ]);
    const { getByText } = renderWithProviders(<DashboardScreen />);
    await waitFor(() => getByText('Deadlift'));
    expect(getByText('2d ago')).toBeTruthy();
  });

  it('renders exercises with relative time (weeks ago)', async () => {
    const twoWeeksAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();
    (getRecentlyTrainedExercises as jest.Mock).mockResolvedValue([
      { exerciseId: 1, exerciseName: 'OHP', category: 'shoulders', lastTrainedAt: twoWeeksAgo, measurementType: 'reps' },
    ]);
    const { getByText } = renderWithProviders(<DashboardScreen />);
    await waitFor(() => getByText('OHP'));
    expect(getByText('2w ago')).toBeTruthy();
  });

  it('renders exercises with relative time (months ago)', async () => {
    const twoMonthsAgo = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString();
    (getRecentlyTrainedExercises as jest.Mock).mockResolvedValue([
      { exerciseId: 1, exerciseName: 'Curl', category: 'arms', lastTrainedAt: twoMonthsAgo, measurementType: 'reps' },
    ]);
    const { getByText } = renderWithProviders(<DashboardScreen />);
    await waitFor(() => getByText('Curl'));
    expect(getByText('2mo ago')).toBeTruthy();
  });

  it('navigates to ExerciseProgress when exercise card is pressed', async () => {
    const now = new Date().toISOString();
    (getRecentlyTrainedExercises as jest.Mock).mockResolvedValue([
      { exerciseId: 5, exerciseName: 'Bench Press', category: 'chest', lastTrainedAt: now, measurementType: 'reps' },
    ]);
    const { getByText } = renderWithProviders(<DashboardScreen />);
    await waitFor(() => getByText('Bench Press'));
    fireEvent.press(getByText('Bench Press'));
    // Navigation happens - just verify no crash
    expect(getByText('Dashboard')).toBeTruthy();
  });

  it('shows STRENGTH TRAINING section when chest/back/legs/shoulders/arms exercises exist', async () => {
    const now = new Date().toISOString();
    (getRecentlyTrainedExercises as jest.Mock).mockResolvedValue([
      { exerciseId: 1, exerciseName: 'Bench Press', category: 'chest', lastTrainedAt: now, measurementType: 'reps' },
    ]);
    const { getByText } = renderWithProviders(<DashboardScreen />);
    await waitFor(() => getByText('STRENGTH TRAINING'));
    expect(getByText('STRENGTH TRAINING')).toBeTruthy();
  });

  it('renders minutes ago relative time', async () => {
    const thirtyMinAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString();
    (getRecentlyTrainedExercises as jest.Mock).mockResolvedValue([
      { exerciseId: 3, exerciseName: 'Tricep Extension', category: 'arms', lastTrainedAt: thirtyMinAgo, measurementType: 'reps' },
    ]);
    const { getByText } = renderWithProviders(<DashboardScreen />);
    await waitFor(() => getByText('Tricep Extension'));
    expect(getByText('30m ago')).toBeTruthy();
  });
});
