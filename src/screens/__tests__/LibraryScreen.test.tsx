import React from 'react';
import { render, waitFor } from '@testing-library/react-native';
import { NavigationContainer } from '@react-navigation/native';
import { LibraryScreen } from '../LibraryScreen';

jest.mock('../../db/exercises', () => ({
  getExercisesByCategory: jest.fn().mockResolvedValue([]),
  searchExercises: jest.fn().mockResolvedValue([]),
  deleteExercise: jest.fn().mockResolvedValue(undefined),
  addExercise: jest.fn(),
  updateExercise: jest.fn(),
  getExercises: jest.fn().mockResolvedValue([]),
  getExerciseById: jest.fn().mockResolvedValue(null),
}));

// Also mock db/sessions so that any transitive imports don't fail
jest.mock('../../db/sessions', () => ({
  createSession: jest.fn(),
  getActiveSession: jest.fn().mockResolvedValue(null),
  completeSession: jest.fn(),
  getSessionExercises: jest.fn().mockResolvedValue([]),
  addExerciseToSession: jest.fn(),
  markExerciseComplete: jest.fn(),
  toggleExerciseComplete: jest.fn(),
  hasSessionActivity: jest.fn(),
  deleteSession: jest.fn(),
}));

// eslint-disable-next-line @typescript-eslint/no-var-requires
const exercisesModule = require('../../db/exercises');

function renderLibrary() {
  return render(
    <NavigationContainer>
      <LibraryScreen />
    </NavigationContainer>,
  );
}

describe('LibraryScreen', () => {
  beforeEach(() => {
    exercisesModule.getExercisesByCategory.mockResolvedValue([]);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders Exercise Library title', async () => {
    const { getByText } = renderLibrary();

    expect(getByText('Exercise Library')).toBeTruthy();
  });

  it('renders category tabs', async () => {
    const { getByText } = renderLibrary();

    expect(getByText('Chest')).toBeTruthy();
    expect(getByText('Back')).toBeTruthy();
    expect(getByText('Legs')).toBeTruthy();
  });

  it('shows empty state when no exercises in category', async () => {
    exercisesModule.getExercisesByCategory.mockResolvedValue([]);

    const { getByText } = renderLibrary();

    await waitFor(() => {
      expect(getByText('No exercises in this category')).toBeTruthy();
    });

    expect(getByText('Tap + to add a custom exercise')).toBeTruthy();
  });

  it('renders exercise list when data loaded', async () => {
    exercisesModule.getExercisesByCategory.mockResolvedValue([
      {
        id: 1,
        name: 'Bench Press',
        category: 'chest',
        defaultRestSeconds: 90,
        isCustom: false,
        measurementType: 'reps',
        createdAt: '',
      },
    ]);

    const { getByText } = renderLibrary();

    await waitFor(() => {
      expect(getByText('Bench Press')).toBeTruthy();
    });
  });
});
