import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { NavigationContainer } from '@react-navigation/native';
import { ProgressHubScreen } from '../ProgressHubScreen';

jest.mock('../../db/progress', () => ({
  getAllExercisesWithProgress: jest.fn(async () => [
    { exerciseId: 1, exerciseName: 'Bench Press', category: 'chest', measurementType: 'reps',
      lastTrainedAt: new Date().toISOString(), sessionCount: 12, sparklinePoints: [180,185,195], deltaPercent14d: 7 },
    { exerciseId: 2, exerciseName: 'Squat', category: 'legs', measurementType: 'reps',
      lastTrainedAt: new Date().toISOString(), sessionCount: 8, sparklinePoints: [240,250,275], deltaPercent14d: 4 },
  ]),
  getTopMovers: jest.fn(async () => []),
  getProgramDayWeeklyTonnage: jest.fn(async () => []),
  getPRWatch: jest.fn(async () => null),
  getStaleExercise: jest.fn(async () => null),
}));
jest.mock('../../db/programs', () => ({
  getProgramsWithSessionData: jest.fn(async () => []),
}));

const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => {
  const actual = jest.requireActual('@react-navigation/native');
  return {
    ...actual,
    useNavigation: () => ({ navigate: mockNavigate, goBack: jest.fn() }),
    useFocusEffect: (cb: () => void | (() => void)) => { cb(); },
  };
});

beforeEach(() => { mockNavigate.mockClear(); });

const renderScreen = () => render(
  <NavigationContainer>
    <ProgressHubScreen />
  </NavigationContainer>,
);

describe('ProgressHubScreen', () => {
  it('renders Exercises tab as initial state', async () => {
    const { findByTestId } = renderScreen();
    expect(await findByTestId('seg-tab-exercises')).toBeTruthy();
  });

  it('switches to Program Days tab', async () => {
    const { findByTestId } = renderScreen();
    fireEvent.press(await findByTestId('seg-tab-programDays'));
    expect(await findByTestId('seg-tab-programDays')).toBeTruthy();
  });

  it('navigates to ExerciseDetail on row tap', async () => {
    const { findAllByTestId } = renderScreen();
    const rows = await findAllByTestId('exercise-row');
    fireEvent.press(rows[0]);
    expect(mockNavigate).toHaveBeenCalledWith('ExerciseDetail', expect.objectContaining({ exerciseId: 1 }));
  });

  it('hides insight strip when both PR Watch and Stale return null', async () => {
    const { queryByTestId, findByTestId } = renderScreen();
    await findByTestId('seg-tab-exercises'); // wait for mount
    await waitFor(() => {
      expect(queryByTestId('insight-strip')).toBeNull();
    });
  });

  it('filters list by category chip', async () => {
    const { getAllExercisesWithProgress } = require('../../db/progress');
    const { findByTestId } = renderScreen();
    fireEvent.press(await findByTestId('chip-chest'));
    await waitFor(() => {
      expect(getAllExercisesWithProgress).toHaveBeenCalledWith('chest', '', 'recent');
    });
  });
});
