jest.mock('../../db/progress', () => ({
  getSessionSetDetail: jest.fn().mockResolvedValue([]),
  getSessionComparison: jest.fn().mockResolvedValue(null),
}));

import React from 'react';
import { act, waitFor } from '@testing-library/react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SessionBreakdownScreen } from '../SessionBreakdownScreen';
import { getSessionSetDetail, getSessionComparison } from '../../db/progress';

const Stack = createNativeStackNavigator();

const DEFAULT_PARAMS = {
  sessionId: 10,
  exerciseId: 1,
  exerciseName: 'Bench Press',
  sessionDate: '2026-04-08T10:00:00Z',
};

function renderWithParams(params: typeof DEFAULT_PARAMS) {
  return require('@testing-library/react-native').render(
    <NavigationContainer>
      <Stack.Navigator>
        <Stack.Screen
          name="SessionBreakdown"
          component={SessionBreakdownScreen}
          initialParams={params}
        />
      </Stack.Navigator>
    </NavigationContainer>,
  );
}

async function flushAsync() {
  await act(async () => {
    await new Promise(r => setTimeout(r, 0));
  });
}

describe('SessionBreakdownScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (getSessionSetDetail as jest.Mock).mockResolvedValue([]);
    (getSessionComparison as jest.Mock).mockResolvedValue(null);
  });

  it('renders exercise name and date in header', async () => {
    const { getByText } = renderWithParams(DEFAULT_PARAMS);
    await waitFor(() => getByText('Bench Press'));
    expect(getByText('Bench Press')).toBeTruthy();
    // formatDate('2026-04-08T10:00:00Z') → "Apr 8, 2026"
    expect(getByText(/Apr 8/)).toBeTruthy();
  });

  it('renders set detail rows with weight, reps, and rest time', async () => {
    (getSessionSetDetail as jest.Mock).mockResolvedValue([
      { setNumber: 1, weightLbs: 155, reps: 10, isWarmup: false, restSeconds: 120 },
    ]);
    const { getByText } = renderWithParams(DEFAULT_PARAMS);
    await flushAsync();
    // Should show "155 lbs · 10 reps · 2:00 rest"
    expect(getByText(/155 lbs/)).toBeTruthy();
    expect(getByText(/10 reps/)).toBeTruthy();
    expect(getByText(/2:00 rest/)).toBeTruthy();
  });

  it('shows Warmup badge for warmup sets', async () => {
    (getSessionSetDetail as jest.Mock).mockResolvedValue([
      { setNumber: 1, weightLbs: 95, reps: 10, isWarmup: true, restSeconds: null },
    ]);
    const { getByText } = renderWithParams(DEFAULT_PARAMS);
    await flushAsync();
    expect(getByText('Warmup')).toBeTruthy();
  });

  it('renders comparison panel with delta text', async () => {
    (getSessionSetDetail as jest.Mock).mockResolvedValue([
      { setNumber: 1, weightLbs: 155, reps: 10, isWarmup: false, restSeconds: null },
    ]);
    (getSessionComparison as jest.Mock).mockResolvedValue({
      currentSets: [{ setNumber: 1, weightLbs: 155, reps: 10, isWarmup: false }],
      comparisonSets: [{ setNumber: 1, weightLbs: 145, reps: 10, isWarmup: false }],
      comparisonDate: '2026-03-25T10:00:00Z',
      comparisonLabel: 'vs Previous Session',
    });
    const { getByText } = renderWithParams(DEFAULT_PARAMS);
    await flushAsync();
    expect(getByText('vs Previous Session')).toBeTruthy();
    // +10 lbs delta
    expect(getByText('+10 lbs')).toBeTruthy();
  });

  it('renders session volume total for working sets only', async () => {
    // 155*10 + 155*8 = 1550 + 1240 = 2790
    (getSessionSetDetail as jest.Mock).mockResolvedValue([
      { setNumber: 1, weightLbs: 95, reps: 5, isWarmup: true, restSeconds: null },
      { setNumber: 2, weightLbs: 155, reps: 10, isWarmup: false, restSeconds: null },
      { setNumber: 3, weightLbs: 155, reps: 8, isWarmup: false, restSeconds: 120 },
    ]);
    const { getByText } = renderWithParams(DEFAULT_PARAMS);
    await flushAsync();
    expect(getByText('2,790')).toBeTruthy();
  });
});
