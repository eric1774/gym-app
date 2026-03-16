jest.mock('../../db/dashboard', () => ({
  getExerciseProgressData: jest.fn().mockResolvedValue([]),
  getTimedExerciseProgressData: jest.fn().mockResolvedValue([]),
  getExerciseHistory: jest.fn().mockResolvedValue([]),
  deleteExerciseHistorySession: jest.fn().mockResolvedValue(undefined),
}));

import React from 'react';
import { render, waitFor } from '@testing-library/react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ExerciseProgressScreen } from '../ExerciseProgressScreen';
import { getExerciseProgressData, getExerciseHistory } from '../../db/dashboard';

const Stack = createNativeStackNavigator();

function renderWithParams(params: { exerciseId: number; exerciseName: string; measurementType?: string }) {
  return render(
    <NavigationContainer>
      <Stack.Navigator>
        <Stack.Screen
          name="ExerciseProgress"
          component={ExerciseProgressScreen}
          initialParams={params}
        />
      </Stack.Navigator>
    </NavigationContainer>,
  );
}

describe('ExerciseProgressScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (getExerciseProgressData as jest.Mock).mockResolvedValue([]);
    (getExerciseHistory as jest.Mock).mockResolvedValue([]);
  });

  it('renders exercise name from route params', async () => {
    const { getByText } = renderWithParams({ exerciseId: 1, exerciseName: 'Bench Press' });
    await waitFor(() => getByText('Bench Press'));
    expect(getByText('Bench Press')).toBeTruthy();
  });

  it('renders all 4 time range filter pills', async () => {
    const { getByText } = renderWithParams({ exerciseId: 1, exerciseName: 'Bench Press' });
    await waitFor(() => getByText('1M'));
    expect(getByText('1M')).toBeTruthy();
    expect(getByText('3M')).toBeTruthy();
    expect(getByText('6M')).toBeTruthy();
    expect(getByText('All')).toBeTruthy();
  });

  it('shows No data yet when progress is empty', async () => {
    (getExerciseProgressData as jest.Mock).mockResolvedValue([]);
    const { getByText } = renderWithParams({ exerciseId: 1, exerciseName: 'Bench Press' });
    await waitFor(() => getByText('No data yet'));
    expect(getByText('No data yet')).toBeTruthy();
  });

  it('renders history cards when data exists', async () => {
    (getExerciseHistory as jest.Mock).mockResolvedValue([
      {
        sessionId: 1,
        date: '2025-06-10',
        sets: [{ setNumber: 1, weightKg: 135, reps: 10, isWarmup: false }],
      },
    ]);
    const { getByText } = renderWithParams({ exerciseId: 1, exerciseName: 'Bench Press' });
    await waitFor(() => getByText('History'));
    expect(getByText('History')).toBeTruthy();
    expect(getByText('Set 1: 135lb x 10 reps')).toBeTruthy();
  });

  it('renders timed format when measurementType is timed', async () => {
    (getExerciseHistory as jest.Mock).mockResolvedValue([
      {
        sessionId: 1,
        date: '2025-06-10',
        sets: [{ setNumber: 1, weightKg: 0, reps: 90, isWarmup: false }],
      },
    ]);
    const { getByText } = renderWithParams({ exerciseId: 2, exerciseName: 'Plank', measurementType: 'timed' });
    await waitFor(() => getByText('Plank'));
    expect(getByText('Set 1: 01:30')).toBeTruthy();
  });
});
