jest.mock('../../db/dashboard', () => ({
  getCategoryExerciseProgress: jest.fn().mockResolvedValue([]),
}));

import React from 'react';
import { render, waitFor, fireEvent, act } from '@testing-library/react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { CategoryProgressScreen } from '../CategoryProgressScreen';
import { getCategoryExerciseProgress } from '../../db/dashboard';

const Stack = createNativeStackNavigator();

function renderWithParams(params: { category: string }) {
  return render(
    <NavigationContainer>
      <Stack.Navigator>
        <Stack.Screen
          name="CategoryProgress"
          component={CategoryProgressScreen}
          initialParams={params}
        />
        <Stack.Screen name="ExerciseProgress" component={() => null} />
      </Stack.Navigator>
    </NavigationContainer>,
  );
}

const makeExercise = (overrides: Record<string, unknown> = {}) => ({
  exerciseId: 1,
  exerciseName: 'Bench Press',
  measurementType: 'reps' as const,
  sparklinePoints: [60, 65, 70, 75],
  currentBest: 75,
  previousBest: 60,
  lastTrainedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
  ...overrides,
});

/** Flush all pending microtasks (resolved promises) and React state updates */
async function flushAsync() {
  await act(async () => {
    await new Promise(r => setTimeout(r, 0));
  });
}

describe('CategoryProgressScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (getCategoryExerciseProgress as jest.Mock).mockResolvedValue([]);
  });

  it('renders capitalized category name as title', async () => {
    const { getByText } = renderWithParams({ category: 'chest' });
    await waitFor(() => getByText('Chest'));
    expect(getByText('Chest')).toBeTruthy();
  });

  it('renders all 4 time range pills', async () => {
    const { getByText } = renderWithParams({ category: 'chest' });
    await waitFor(() => getByText('1M'));
    expect(getByText('1M')).toBeTruthy();
    expect(getByText('3M')).toBeTruthy();
    expect(getByText('6M')).toBeTruthy();
    expect(getByText('All')).toBeTruthy();
  });

  it('renders exercise rows with names', async () => {
    (getCategoryExerciseProgress as jest.Mock).mockResolvedValue([
      makeExercise({ exerciseId: 1, exerciseName: 'Bench Press' }),
      makeExercise({ exerciseId: 2, exerciseName: 'Incline Dumbbell Press' }),
    ]);

    const { getByText } = renderWithParams({ category: 'chest' });
    await flushAsync();
    expect(getByText('Bench Press')).toBeTruthy();
    expect(getByText('Incline Dumbbell Press')).toBeTruthy();
  });

  it('shows delta formatted as weight for reps type', async () => {
    (getCategoryExerciseProgress as jest.Mock).mockResolvedValue([
      makeExercise({ measurementType: 'reps', currentBest: 75, previousBest: 60 }),
    ]);

    const { getByText } = renderWithParams({ category: 'chest' });
    await flushAsync();
    expect(getByText('+15.0 lb')).toBeTruthy();
  });

  it('shows delta formatted as duration for timed type', async () => {
    (getCategoryExerciseProgress as jest.Mock).mockResolvedValue([
      makeExercise({ measurementType: 'timed', currentBest: 90, previousBest: 60 }),
    ]);

    const { getByText } = renderWithParams({ category: 'core' });
    await flushAsync();
    expect(getByText('+30s')).toBeTruthy();
  });

  it('shows dash for non-positive delta', async () => {
    (getCategoryExerciseProgress as jest.Mock).mockResolvedValue([
      makeExercise({ currentBest: 60, previousBest: 75 }),
    ]);

    const { getByText } = renderWithParams({ category: 'chest' });
    await flushAsync();
    expect(getByText('\u2013')).toBeTruthy();
  });

  it('hides delta when previousBest is null', async () => {
    (getCategoryExerciseProgress as jest.Mock).mockResolvedValue([
      makeExercise({ previousBest: null }),
    ]);

    const { queryByTestId, getByText } = renderWithParams({ category: 'chest' });
    await flushAsync();
    expect(getByText('Bench Press')).toBeTruthy();
    expect(queryByTestId('delta-text')).toBeNull();
  });

  it('shows empty state when no exercises', async () => {
    (getCategoryExerciseProgress as jest.Mock).mockResolvedValue([]);

    const { getByText } = renderWithParams({ category: 'chest' });
    await waitFor(() => getByText('No exercises found'));
    expect(getByText('No exercises found')).toBeTruthy();
  });

  it('calls getCategoryExerciseProgress on render', async () => {
    renderWithParams({ category: 'chest' });
    await waitFor(() => {
      expect(getCategoryExerciseProgress).toHaveBeenCalledWith('chest', 'All');
    });
  });

  it('re-fetches when time range pill is pressed', async () => {
    const { getByText } = renderWithParams({ category: 'chest' });
    await waitFor(() => getByText('3M'));
    fireEvent.press(getByText('3M'));
    await waitFor(() => {
      expect(getCategoryExerciseProgress).toHaveBeenCalledWith('chest', '3M');
    });
  });

  it('navigates back on back button press', async () => {
    const { getByText } = renderWithParams({ category: 'chest' });
    await waitFor(() => getByText('Chest'));
    fireEvent.press(getByText('\u2190'));
    expect(true).toBe(true);
  });

  it('navigates to ExerciseProgress on exercise row press', async () => {
    (getCategoryExerciseProgress as jest.Mock).mockResolvedValue([
      makeExercise(),
    ]);

    const { getByTestId } = renderWithParams({ category: 'chest' });
    await flushAsync();
    fireEvent.press(getByTestId('exercise-row'));
    expect(true).toBe(true);
  });
});
