import React from 'react';
import { render, waitFor, fireEvent } from '@testing-library/react-native';
import { NavigationContainer } from '@react-navigation/native';

const mockGoBack = jest.fn();
const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => {
  const actual = jest.requireActual('@react-navigation/native');
  return {
    ...actual,
    useNavigation: () => ({ goBack: mockGoBack, navigate: mockNavigate, getParent: () => ({ navigate: jest.fn() }) }),
    useRoute: () => ({ params: { dayId: 5, dayName: 'Leg Day' } }),
  };
});

jest.mock('../../db/programs', () => ({
  getProgramDayExercises: jest.fn(),
  addExerciseToProgramDay: jest.fn().mockResolvedValue(undefined),
  removeExerciseFromProgramDay: jest.fn().mockResolvedValue(undefined),
  createSupersetGroup: jest.fn().mockResolvedValue(undefined),
  removeSupersetGroup: jest.fn().mockResolvedValue(undefined),
  reorderProgramDayExercises: jest.fn().mockResolvedValue(undefined),
  updateExerciseTargets: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../../db/exercises', () => ({
  getExercises: jest.fn(),
  getExercisesByCategory: jest.fn().mockResolvedValue([]),
  searchExercises: jest.fn().mockResolvedValue([]),
}));

// Mock SessionContext useSession — include sessionExercises for ExercisePickerSheet
jest.mock('../../context/SessionContext', () => ({
  useSession: () => ({
    session: null,
    sessionExercises: [],
    startSessionFromProgramDay: jest.fn(),
  }),
}));

import { DayDetailScreen } from '../DayDetailScreen';
const { getProgramDayExercises } = require('../../db/programs');
const { getExercises } = require('../../db/exercises');

const mockExercises = [
  { id: 1, name: 'Squat', category: 'legs' as const, measurementType: 'reps' as const, defaultRestSeconds: 120 },
  { id: 2, name: 'Leg Press', category: 'legs' as const, measurementType: 'reps' as const, defaultRestSeconds: 90 },
  { id: 3, name: 'Calf Raise', category: 'legs' as const, measurementType: 'reps' as const, defaultRestSeconds: 60 },
];

const mockDayExercises = [
  { id: 100, programDayId: 5, exerciseId: 1, targetSets: 4, targetReps: 5, targetWeightKg: 225, sortOrder: 0, supersetGroupId: null },
  { id: 101, programDayId: 5, exerciseId: 2, targetSets: 3, targetReps: 12, targetWeightKg: 0, sortOrder: 1, supersetGroupId: null },
];

function renderScreen() {
  return render(
    <NavigationContainer><DayDetailScreen /></NavigationContainer>
  );
}

describe('DayDetailScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    getProgramDayExercises.mockResolvedValue([]);
    getExercises.mockResolvedValue([]);
  });

  it('renders day name in header', async () => {
    getProgramDayExercises.mockResolvedValue([]);
    getExercises.mockResolvedValue([]);

    const { getByText } = renderScreen();

    // Day name from route params should appear immediately
    expect(getByText('Leg Day')).toBeTruthy();
  });

  it('renders exercise list from DB data', async () => {
    getProgramDayExercises.mockResolvedValue(mockDayExercises);
    getExercises.mockResolvedValue(mockExercises);

    const { getByText } = renderScreen();

    await waitFor(() => getByText('Squat'));
    expect(getByText('Leg Press')).toBeTruthy();
  });

  it('shows empty state when no exercises exist', async () => {
    getProgramDayExercises.mockResolvedValue([]);
    getExercises.mockResolvedValue([]);

    const { getByText } = renderScreen();

    await waitFor(() => getByText('No exercises yet'));
    expect(getByText('Tap Add Exercise to build this day')).toBeTruthy();
  });

  it('shows Start Workout button when exercises exist', async () => {
    getProgramDayExercises.mockResolvedValue(mockDayExercises);
    getExercises.mockResolvedValue(mockExercises);

    const { getByText } = renderScreen();

    await waitFor(() => getByText('Start Workout'));
    expect(getByText('Start Workout')).toBeTruthy();
  });

  it('enters superset mode when SS button is pressed', async () => {
    getProgramDayExercises.mockResolvedValue(mockDayExercises);
    getExercises.mockResolvedValue(mockExercises);

    const { getByText } = renderScreen();

    await waitFor(() => getByText('SS'));
    fireEvent.press(getByText('SS'));

    expect(getByText('SELECT 2-3 EXERCISES')).toBeTruthy();
    expect(getByText('Cancel')).toBeTruthy();
    expect(getByText('Group as Superset')).toBeTruthy();
  });

  it('shows Add button in header', async () => {
    getProgramDayExercises.mockResolvedValue(mockDayExercises);
    getExercises.mockResolvedValue(mockExercises);

    const { getByText } = renderScreen();

    await waitFor(() => getByText('+ Add'));
    expect(getByText('+ Add')).toBeTruthy();
  });
});
