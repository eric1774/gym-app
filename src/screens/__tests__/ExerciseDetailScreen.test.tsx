jest.mock('../../db/dashboard', () => ({
  getExerciseProgressData: jest.fn().mockResolvedValue([]),
  getExerciseVolumeData: jest.fn().mockResolvedValue([]),
  getExerciseHistory: jest.fn().mockResolvedValue([]),
}));
jest.mock('../../db/progress', () => ({
  getExerciseInsights: jest.fn().mockResolvedValue({
    weightChangePercent: null,
    volumeChangePercent: null,
    periodLabel: '3 months',
  }),
}));

import React from 'react';
import { act, waitFor } from '@testing-library/react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ExerciseDetailScreen } from '../ExerciseDetailScreen';
import { getExerciseProgressData, getExerciseHistory } from '../../db/dashboard';
import { getExerciseInsights } from '../../db/progress';

const Stack = createNativeStackNavigator();

function renderWithParams(params: {
  exerciseId: number;
  exerciseName: string;
  measurementType?: 'reps' | 'timed';
  category?: string;
}) {
  return require('@testing-library/react-native').render(
    <NavigationContainer>
      <Stack.Navigator>
        <Stack.Screen
          name="ExerciseDetail"
          component={ExerciseDetailScreen}
          initialParams={params}
        />
        <Stack.Screen name="SessionBreakdown" component={() => null} />
      </Stack.Navigator>
    </NavigationContainer>,
  );
}

async function flushAsync() {
  await act(async () => {
    await new Promise(r => setTimeout(r, 0));
  });
}

describe('ExerciseDetailScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (getExerciseProgressData as jest.Mock).mockResolvedValue([]);
    (getExerciseHistory as jest.Mock).mockResolvedValue([]);
    (getExerciseInsights as jest.Mock).mockResolvedValue({
      weightChangePercent: null,
      volumeChangePercent: null,
      periodLabel: '3 months',
    });
  });

  it('renders exercise name in header', async () => {
    const { getByText } = renderWithParams({ exerciseId: 1, exerciseName: 'Bench Press' });
    await waitFor(() => getByText('Bench Press'));
    expect(getByText('Bench Press')).toBeTruthy();
  });

  it('renders hero stats when data available', async () => {
    (getExerciseProgressData as jest.Mock).mockResolvedValue([
      { sessionId: 1, date: '2026-02-15', bestWeightLbs: 155, bestReps: 10 },
      { sessionId: 2, date: '2026-03-15', bestWeightLbs: 165, bestReps: 8 },
    ]);
    (getExerciseHistory as jest.Mock).mockResolvedValue([
      {
        sessionId: 1,
        date: '2026-02-15',
        sets: [{ setNumber: 1, weightLbs: 155, reps: 10, isWarmup: false }],
      },
    ]);

    const { getByText } = renderWithParams({ exerciseId: 1, exerciseName: 'Bench Press' });
    await flushAsync();

    expect(getByText('165')).toBeTruthy();
    expect(getByText('Best (lbs)')).toBeTruthy();
    expect(getByText('Volume (lbs)')).toBeTruthy();
    expect(getByText('Session History')).toBeTruthy();
  });

  it('renders insight text when insights available', async () => {
    (getExerciseInsights as jest.Mock).mockResolvedValue({
      weightChangePercent: 15,
      volumeChangePercent: null,
      periodLabel: '3 months',
    });

    const { getByText } = renderWithParams({ exerciseId: 1, exerciseName: 'Bench Press' });
    await flushAsync();

    expect(getByText('Weight up 15% in 3 months')).toBeTruthy();
  });

  it('renders empty state when fewer than 2 data points', async () => {
    (getExerciseProgressData as jest.Mock).mockResolvedValue([]);

    const { getByText } = renderWithParams({ exerciseId: 1, exerciseName: 'Bench Press' });
    await flushAsync();

    expect(getByText('Log 2+ sessions to see your trend')).toBeTruthy();
  });

  it('renders SessionTimelineRow when history data available', async () => {
    (getExerciseHistory as jest.Mock).mockResolvedValue([
      {
        sessionId: 1,
        date: '2026-03-01',
        sets: [{ setNumber: 1, weightLbs: 135, reps: 10, isWarmup: false }],
      },
    ]);

    const { getByTestId } = renderWithParams({ exerciseId: 1, exerciseName: 'Bench Press' });
    await flushAsync();

    expect(getByTestId('session-row-1')).toBeTruthy();
  });

  it('renders "Holding steady" when no insight percentages', async () => {
    const { getByText } = renderWithParams({ exerciseId: 1, exerciseName: 'Bench Press' });
    await flushAsync();
    expect(getByText('Holding steady')).toBeTruthy();
  });

  it('renders all 4 time range pills', async () => {
    const { getByText } = renderWithParams({ exerciseId: 1, exerciseName: 'Bench Press' });
    await waitFor(() => getByText('1M'));
    expect(getByText('1M')).toBeTruthy();
    expect(getByText('3M')).toBeTruthy();
    expect(getByText('6M')).toBeTruthy();
    expect(getByText('1Y')).toBeTruthy();
  });

  it('renders Strength and Volume toggle buttons', async () => {
    const { getByText } = renderWithParams({ exerciseId: 1, exerciseName: 'Bench Press' });
    await waitFor(() => getByText('Strength'));
    expect(getByText('Strength')).toBeTruthy();
    expect(getByText('Volume')).toBeTruthy();
  });
});
