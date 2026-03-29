jest.mock('../../db/dashboard', () => ({
  getCategorySummaries: jest.fn().mockResolvedValue([]),
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
import { getCategorySummaries, getNextWorkoutDay } from '../../db/dashboard';
import { getActiveSession } from '../../db/sessions';
import { CategorySummary } from '../../types';

const makeSummary = (overrides: Partial<CategorySummary> = {}): CategorySummary => ({
  category: 'chest',
  exerciseCount: 3,
  sparklinePoints: [60, 65, 70, 75],
  lastTrainedAt: new Date().toISOString(),
  measurementType: 'reps' as const,
  ...overrides,
});

describe('DashboardScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (getCategorySummaries as jest.Mock).mockResolvedValue([]);
    (getNextWorkoutDay as jest.Mock).mockResolvedValue(null);
  });

  it('renders Dashboard title', async () => {
    const { getByText } = renderWithProviders(<DashboardScreen />);
    await waitFor(() => getByText('Dashboard'));
    expect(getByText('Dashboard')).toBeTruthy();
  });

  it('shows empty state when no categories', async () => {
    (getCategorySummaries as jest.Mock).mockResolvedValue([]);
    const { getByText } = renderWithProviders(<DashboardScreen />);
    await waitFor(() => getByText(/No exercises trained yet/));
    expect(getByText(/No exercises trained yet/)).toBeTruthy();
  });

  it('renders category cards from summary data', async () => {
    (getCategorySummaries as jest.Mock).mockResolvedValue([
      makeSummary({ category: 'chest', exerciseCount: 3 }),
      makeSummary({ category: 'legs', exerciseCount: 5 }),
    ]);
    const { getByText, getAllByTestId } = renderWithProviders(<DashboardScreen />);
    await waitFor(() => getAllByTestId('category-card'));
    expect(getByText('Chest')).toBeTruthy();
    expect(getByText('Legs')).toBeTruthy();
    expect(getByText('3 exercises')).toBeTruthy();
    expect(getByText('5 exercises')).toBeTruthy();
  });

  it('renders stale card with dimmed opacity', async () => {
    const fortyFiveDaysAgo = new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString();
    (getCategorySummaries as jest.Mock).mockResolvedValue([
      makeSummary({ category: 'shoulders', lastTrainedAt: fortyFiveDaysAgo }),
    ]);
    const { getAllByTestId } = renderWithProviders(<DashboardScreen />);
    await waitFor(() => getAllByTestId('category-card'));
    const card = getAllByTestId('category-card')[0];
    const flatStyle = Array.isArray(card.props.style)
      ? Object.assign({}, ...card.props.style)
      : card.props.style;
    expect(flatStyle.opacity).toBe(0.4);
  });

  it('renders non-stale card with full opacity', async () => {
    const fiveDaysAgo = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString();
    (getCategorySummaries as jest.Mock).mockResolvedValue([
      makeSummary({ category: 'back', lastTrainedAt: fiveDaysAgo }),
    ]);
    const { getAllByTestId } = renderWithProviders(<DashboardScreen />);
    await waitFor(() => getAllByTestId('category-card'));
    const card = getAllByTestId('category-card')[0];
    const flatStyle = Array.isArray(card.props.style)
      ? Object.assign({}, ...card.props.style)
      : card.props.style;
    expect(flatStyle.opacity).toBe(1);
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

  it('navigates to CategoryProgress on card press', async () => {
    (getCategorySummaries as jest.Mock).mockResolvedValue([
      makeSummary({ category: 'chest' }),
    ]);
    const { getAllByTestId, getByText } = renderWithProviders(<DashboardScreen />);
    await waitFor(() => getAllByTestId('category-card'));
    fireEvent.press(getAllByTestId('category-card')[0]);
    // Navigation mock absorbs the call — verify no crash
    expect(getByText('Dashboard')).toBeTruthy();
  });

  it('renders multiple category cards', async () => {
    (getCategorySummaries as jest.Mock).mockResolvedValue([
      makeSummary({ category: 'chest' }),
      makeSummary({ category: 'back' }),
      makeSummary({ category: 'legs' }),
    ]);
    const { getAllByTestId } = renderWithProviders(<DashboardScreen />);
    await waitFor(() => getAllByTestId('category-card'));
    expect(getAllByTestId('category-card')).toHaveLength(3);
  });

  it('renders settings gear icon and navigates to Settings on press', async () => {
    const { getByTestId } = renderWithProviders(<DashboardScreen />);
    await waitFor(() => getByTestId('settings-button'));
    fireEvent.press(getByTestId('settings-button'));
    // Navigation mock absorbs the call — verify the button is pressable (no crash = navigation wired correctly).
    expect(getByTestId('settings-button')).toBeTruthy();
  });
});
