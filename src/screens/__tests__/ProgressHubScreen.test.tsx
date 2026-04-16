jest.mock('../../db/progress', () => ({
  getMuscleGroupProgress: jest.fn().mockResolvedValue([]),
}));

import React from 'react';
import { act, waitFor } from '@testing-library/react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ProgressHubScreen } from '../ProgressHubScreen';
import { getMuscleGroupProgress } from '../../db/progress';
import { MuscleGroupProgress } from '../../types';

const Stack = createNativeStackNavigator();

function renderScreen() {
  return require('@testing-library/react-native').render(
    <NavigationContainer>
      <Stack.Navigator>
        <Stack.Screen name="ProgressHub" component={ProgressHubScreen} />
        <Stack.Screen name="CategoryProgress" component={() => null} />
      </Stack.Navigator>
    </NavigationContainer>,
  );
}

const makeGroup = (overrides: Partial<MuscleGroupProgress> = {}): MuscleGroupProgress => ({
  category: 'chest',
  volumeChangePercent: null,
  hasPR: false,
  lastTrainedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
  ...overrides,
});

async function flushAsync() {
  await act(async () => {
    await new Promise(r => setTimeout(r, 0));
  });
}

describe('ProgressHubScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (getMuscleGroupProgress as jest.Mock).mockResolvedValue([]);
  });

  it('renders "Progress" header', async () => {
    const { getByText } = renderScreen();
    await waitFor(() => getByText('Progress'));
    expect(getByText('Progress')).toBeTruthy();
  });

  it('renders muscle group cards when data loaded', async () => {
    (getMuscleGroupProgress as jest.Mock).mockResolvedValue([
      makeGroup({ category: 'chest' }),
      makeGroup({ category: 'back' }),
    ]);

    const { getByText } = renderScreen();
    await flushAsync();
    expect(getByText('Chest')).toBeTruthy();
    expect(getByText('Back')).toBeTruthy();
  });

  it('shows "PR!" flag on card with hasPR: true', async () => {
    (getMuscleGroupProgress as jest.Mock).mockResolvedValue([
      makeGroup({ category: 'chest', hasPR: true }),
    ]);

    const { getByText } = renderScreen();
    await flushAsync();
    expect(getByText('PR!')).toBeTruthy();
  });

  it('shows volume change percentage rounded to integer', async () => {
    (getMuscleGroupProgress as jest.Mock).mockResolvedValue([
      makeGroup({ category: 'chest', volumeChangePercent: 8.7 }),
    ]);

    const { getByText } = renderScreen();
    await flushAsync();
    expect(getByText('+9%')).toBeTruthy();
  });

  it('renders empty state text when no data', async () => {
    (getMuscleGroupProgress as jest.Mock).mockResolvedValue([]);

    const { getByText } = renderScreen();
    await waitFor(() =>
      getByText('Start training to see your progress here.'),
    );
    expect(getByText('Start training to see your progress here.')).toBeTruthy();
  });
});
