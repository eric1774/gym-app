import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { NavigationContainer } from '@react-navigation/native';
import { ExerciseDetailScreen } from '../ExerciseDetailScreen';

jest.mock('../../db/progress', () => ({
  getExerciseChartData: jest.fn(async () => [
    { sessionId: 1, date: '2026-04-19T00:00:00Z', bestWeightLb: 185, volumeLb: 1850, isPR: true },
    { sessionId: 2, date: '2026-04-22T00:00:00Z', bestWeightLb: 195, volumeLb: 2025, isPR: true },
  ]),
}));
jest.mock('../../db/dashboard', () => ({
  getExerciseHistory: jest.fn(async () => [
    { sessionId: 2, date: '2026-04-22T00:00:00Z', sets: [
      { setNumber: 1, weightLbs: 175, reps: 5, isWarmup: false },
      { setNumber: 2, weightLbs: 195, reps: 3, isWarmup: false },
    ]},
  ]),
  deleteExerciseHistorySession: jest.fn(),
}));

const mockNavigate = jest.fn();
const mockGoBack = jest.fn();

jest.mock('@react-navigation/native', () => {
  const actual = jest.requireActual('@react-navigation/native');
  return {
    ...actual,
    useNavigation: () => ({ navigate: mockNavigate, goBack: mockGoBack }),
    useRoute: () => ({ params: {
      exerciseId: 1, exerciseName: 'Bench Press', measurementType: 'reps', category: 'chest',
    }}),
    useFocusEffect: (cb: () => void | (() => void)) => { cb(); },
  };
});

const renderScreen = () => render(
  <NavigationContainer><ExerciseDetailScreen /></NavigationContainer>,
);

describe('ExerciseDetailScreen', () => {
  it('renders dual-axis chart', async () => {
    const { findAllByTestId } = renderScreen();
    expect((await findAllByTestId(/^chart-bar-/)).length).toBeGreaterThan(0);
  });

  it('renders hero stats Best / Vol 30d / PRs 90d', async () => {
    const { findByText } = renderScreen();
    expect(await findByText(/Best/i)).toBeTruthy();
    expect(await findByText(/PRs/i)).toBeTruthy();
  });

  it('refetches chart on time-range pill press', async () => {
    const { getExerciseChartData } = require('../../db/progress');
    const { findByTestId } = renderScreen();
    fireEvent.press(await findByTestId('range-pill-1M'));
    await waitFor(() => {
      expect(getExerciseChartData).toHaveBeenCalledWith(1, '1M');
    });
  });

  it('expands history row on press', async () => {
    const { findByTestId, queryByTestId } = renderScreen();
    fireEvent.press(await findByTestId('history-row-2'));
    expect(queryByTestId('expanded-set-1')).toBeTruthy();
  });
});
