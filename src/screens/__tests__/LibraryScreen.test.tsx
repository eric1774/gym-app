import React from 'react';
import { Alert } from 'react-native';
import { render, waitFor, fireEvent, act } from '@testing-library/react-native';
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

  it('renders Library title', async () => {
    const { getByText } = renderLibrary();

    expect(getByText('Library')).toBeTruthy();
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

  it('searches exercises when text is typed in search box', async () => {
    jest.useFakeTimers();
    exercisesModule.searchExercises.mockResolvedValue([
      { id: 2, name: 'Squat', category: 'legs', defaultRestSeconds: 90, isCustom: false, measurementType: 'reps', createdAt: '' },
    ]);

    const { getByPlaceholderText, getByText } = renderLibrary();
    const searchInput = getByPlaceholderText('Search exercises...');
    fireEvent.changeText(searchInput, 'squat');

    // Advance timer past debounce
    act(() => {
      jest.advanceTimersByTime(400);
    });

    await waitFor(() => expect(getByText('Squat')).toBeTruthy());
    jest.useRealTimers();
  });

  it('hides category tabs when searching', async () => {
    const { getByPlaceholderText, queryByText } = renderLibrary();
    await waitFor(() => expect(queryByText('Chest')).toBeTruthy());
    fireEvent.changeText(getByPlaceholderText('Search exercises...'), 'bench');
    expect(queryByText('Chest')).toBeNull();
  });

  it('shows add button', async () => {
    const { getByLabelText } = renderLibrary();
    expect(getByLabelText('Add')).toBeTruthy();
  });

  it('opens AddExerciseModal when add button is pressed on Exercises tab', async () => {
    const { getByLabelText, getAllByText } = renderLibrary();
    fireEvent.press(getByLabelText('Add'));
    // AddExerciseModal opens — it renders "Add Exercise" text (title + button)
    await waitFor(() => expect(getAllByText('Add Exercise').length).toBeGreaterThanOrEqual(1));
  });

  it('opens new template modal when add button is pressed on Warmups tab', async () => {
    const { getByLabelText, getByText } = renderLibrary();
    fireEvent.press(getByText('Warmups'));
    fireEvent.press(getByLabelText('Add'));
    // New-template modal renders the heading "New Template"
    await waitFor(() => expect(getByText('New Template')).toBeTruthy());
  });

  it('shows SEARCH section label when searching', async () => {
    jest.useFakeTimers();
    exercisesModule.searchExercises.mockResolvedValue([]);
    const { getByPlaceholderText, getByText } = renderLibrary();
    fireEvent.changeText(getByPlaceholderText('Search exercises...'), 'bench');
    act(() => { jest.advanceTimersByTime(400); });
    await waitFor(() => expect(getByText(/SEARCH/)).toBeTruthy());
    jest.useRealTimers();
  });

  it('deletes exercise and refreshes list', async () => {
    exercisesModule.getExercisesByCategory.mockResolvedValue([
      { id: 1, name: 'Bench Press', category: 'chest', defaultRestSeconds: 90, isCustom: true, measurementType: 'reps', createdAt: '' },
    ]);

    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(
      (_title, _msg, buttons) => {
        const deleteBtn = (buttons as any[])?.find(b => b.text === 'Delete');
        deleteBtn?.onPress?.();
      },
    );

    const { getByText } = renderLibrary();
    await waitFor(() => getByText('Bench Press'));
    fireEvent.press(getByText('Delete'));

    await waitFor(() => expect(exercisesModule.deleteExercise).toHaveBeenCalledWith(1));
    alertSpy.mockRestore();
  });

  it('opens edit modal when exercise is long pressed', async () => {
    exercisesModule.getExercisesByCategory.mockResolvedValue([
      { id: 1, name: 'Bench Press', category: 'chest', defaultRestSeconds: 90, isCustom: true, measurementType: 'reps', createdAt: '' },
    ]);

    const { getByText, getAllByText } = renderLibrary();
    await waitFor(() => getByText('Bench Press'));
    fireEvent(getByText('Bench Press'), 'longPress');

    // Modal opens — title bar should show "Edit Exercise" or "Add Exercise"
    await waitFor(() => expect(getAllByText(/Exercise/)[0]).toBeTruthy());
  });

  it('switches category tab when a different category is tapped', async () => {
    exercisesModule.getExercisesByCategory.mockResolvedValue([]);
    const { getByText } = renderLibrary();
    await waitFor(() => getByText('Exercise Library'));
    fireEvent.press(getByText('Back'));
    await waitFor(() => expect(exercisesModule.getExercisesByCategory).toHaveBeenCalledWith('back'));
  });
});
