import React from 'react';
import { render, waitFor } from '@testing-library/react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { CalendarDayDetailScreen } from '../CalendarDayDetailScreen';
import { getDaySessionDetails } from '../../db/calendar';

jest.mock('../../db/calendar', () => ({
  getDaySessionDetails: jest.fn().mockResolvedValue([]),
}));

jest.mock('../../db/sessions', () => ({
  deleteSession: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('react-native-haptic-feedback', () => ({
  trigger: jest.fn(),
}));

const mockGetDaySessionDetails = getDaySessionDetails as jest.Mock;

const Stack = createNativeStackNavigator();

function renderWithDate(date: string) {
  return render(
    <NavigationContainer>
      <Stack.Navigator>
        <Stack.Screen
          name="CalendarDayDetail"
          component={CalendarDayDetailScreen}
          initialParams={{ date }}
        />
      </Stack.Navigator>
    </NavigationContainer>,
  );
}

describe('CalendarDayDetailScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetDaySessionDetails.mockResolvedValue([]);
  });

  it('renders formatted date in header', async () => {
    const { getByText } = renderWithDate('2025-06-15');

    await waitFor(() => {
      expect(getByText(/June 15, 2025/)).toBeTruthy();
    });
  });

  it('shows empty state when no sessions', async () => {
    mockGetDaySessionDetails.mockResolvedValue([]);

    const { getByText } = renderWithDate('2025-06-15');

    await waitFor(() => {
      expect(getByText('No workout data found')).toBeTruthy();
    });
  });

  it('renders session card with stats', async () => {
    mockGetDaySessionDetails.mockResolvedValue([
      {
        sessionId: 1,
        startedAt: '2025-06-15T10:00:00Z',
        completedAt: '2025-06-15T11:00:00Z',
        programDayName: 'Push Day',
        durationSeconds: 3600,
        totalSets: 12,
        totalVolume: 15000,
        exerciseCount: 4,
        prCount: 0,
        exercises: [
          {
            exerciseId: 1,
            exerciseName: 'Bench Press',
            sets: [
              {
                setNumber: 1,
                weightLbs: 135,
                reps: 10,
                isWarmup: false,
                isPR: false,
              },
            ],
          },
        ],
      },
    ]);

    const { getByText } = renderWithDate('2025-06-15');

    await waitFor(() => {
      expect(getByText('Push Day')).toBeTruthy();
    });

    expect(getByText('DURATION')).toBeTruthy();
    expect(getByText('SETS')).toBeTruthy();
    expect(getByText('LBS')).toBeTruthy();
    expect(getByText('Bench Press')).toBeTruthy();
  });

  it('shows PR highlights when prCount > 0', async () => {
    mockGetDaySessionDetails.mockResolvedValue([
      {
        sessionId: 2,
        startedAt: '2025-06-15T10:00:00Z',
        completedAt: '2025-06-15T11:00:00Z',
        programDayName: 'Pull Day',
        durationSeconds: 1800,
        totalSets: 8,
        totalVolume: 8000,
        exerciseCount: 3,
        prCount: 1,
        exercises: [
          {
            exerciseId: 2,
            exerciseName: 'Deadlift',
            sets: [
              {
                setNumber: 1,
                weightLbs: 200,
                reps: 5,
                isWarmup: false,
                isPR: true,
              },
            ],
          },
        ],
      },
    ]);

    const { getByText } = renderWithDate('2025-06-15');

    await waitFor(() => {
      expect(getByText(/PERSONAL RECORD/)).toBeTruthy();
    });
  });
});
