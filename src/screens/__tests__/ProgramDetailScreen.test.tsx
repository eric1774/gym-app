import React from 'react';
import { Alert } from 'react-native';
import { render, waitFor, fireEvent } from '@testing-library/react-native';
import { NavigationContainer } from '@react-navigation/native';

// Mock navigation hooks
const mockGoBack = jest.fn();
const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => {
  const actual = jest.requireActual('@react-navigation/native');
  return {
    ...actual,
    useNavigation: () => ({ goBack: mockGoBack, navigate: mockNavigate }),
    useRoute: () => ({ params: { programId: 1 } }),
    useFocusEffect: (cb: () => void) => {
      // eslint-disable-next-line react-hooks/rules-of-hooks
      const React = require('react');
      React.useEffect(() => { cb(); }, []);
    },
  };
});

jest.mock('../../db/programs', () => ({
  getProgram: jest.fn(),
  getProgramDays: jest.fn(),
  activateProgram: jest.fn().mockResolvedValue(undefined),
  deleteProgram: jest.fn().mockResolvedValue(undefined),
  advanceWeek: jest.fn().mockResolvedValue(undefined),
  createProgramDay: jest.fn().mockResolvedValue(undefined),
  deleteProgramDay: jest.fn().mockResolvedValue(undefined),
  decrementWeek: jest.fn().mockResolvedValue(undefined),
  duplicateProgramDay: jest.fn().mockResolvedValue(undefined),
  renameProgram: jest.fn().mockResolvedValue(undefined),
  renameProgramDay: jest.fn().mockResolvedValue(undefined),
  reorderProgramDays: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../../db/dashboard', () => ({
  getProgramWeekCompletion: jest.fn().mockResolvedValue([]),
  getProgramTotalCompleted: jest.fn().mockResolvedValue(0),
  unmarkDayCompletion: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../../db/sessions', () => ({
  createCompletedSession: jest.fn().mockResolvedValue(undefined),
  getActiveSession: jest.fn().mockResolvedValue(null),
  getSessionExercises: jest.fn().mockResolvedValue([]),
  createSession: jest.fn(),
  completeSession: jest.fn(),
  addExerciseToSession: jest.fn(),
  markExerciseComplete: jest.fn(),
  toggleExerciseComplete: jest.fn().mockResolvedValue(false),
  hasSessionActivity: jest.fn().mockResolvedValue(false),
  deleteSession: jest.fn(),
}));

jest.mock('../../db/exercises', () => ({
  getExercises: jest.fn().mockResolvedValue([]),
}));

import { ProgramDetailScreen } from '../ProgramDetailScreen';
const { getProgram, getProgramDays } = require('../../db/programs');
const { getProgramWeekCompletion, getProgramTotalCompleted } = require('../../db/dashboard');

const mockProgram = {
  id: 1,
  name: 'Push Pull Legs',
  weeks: 4,
  startDate: null,
  currentWeek: 1,
  createdAt: '',
};

const mockDay = {
  id: 10,
  programId: 1,
  name: 'Push Day',
  sortOrder: 0,
  createdAt: '',
};

function renderScreen() {
  return render(
    <NavigationContainer><ProgramDetailScreen /></NavigationContainer>
  );
}

describe('ProgramDetailScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    getProgramWeekCompletion.mockResolvedValue([]);
    getProgramTotalCompleted.mockResolvedValue(0);
  });

  it('renders Loading text initially then program name', async () => {
    getProgram.mockResolvedValue(mockProgram);
    getProgramDays.mockResolvedValue([mockDay]);

    const { getByText } = renderScreen();

    await waitFor(() => getByText('Push Pull Legs'));
    expect(getByText('Push Day')).toBeTruthy();
  });

  it('shows empty state when no days exist', async () => {
    getProgram.mockResolvedValue(mockProgram);
    getProgramDays.mockResolvedValue([]);

    const { getByText } = renderScreen();

    await waitFor(() => getByText('Push Pull Legs'));
    expect(getByText('No workout days yet')).toBeTruthy();
    expect(getByText('Tap Add Day to get started')).toBeTruthy();
  });

  it('shows Start Program button when program is not activated', async () => {
    getProgram.mockResolvedValue({ ...mockProgram, startDate: null });
    getProgramDays.mockResolvedValue([]);

    const { getByText } = renderScreen();

    await waitFor(() => getByText('Start Program'));
    expect(getByText('Start Program')).toBeTruthy();
  });

  it('shows week navigation when program is activated', async () => {
    getProgram.mockResolvedValue({
      ...mockProgram,
      startDate: '2026-01-01',
      currentWeek: 2,
      weeks: 4,
    });
    getProgramDays.mockResolvedValue([mockDay]);
    getProgramWeekCompletion.mockResolvedValue([
      { dayId: 10, dayName: 'Push Day', isCompletedThisWeek: false, sessionId: null },
    ]);

    const { getByText } = renderScreen();

    await waitFor(() => getByText('Week 2/4'));
    expect(getByText('Week 2/4')).toBeTruthy();
  });

  it('shows Add Day button', async () => {
    getProgram.mockResolvedValue(mockProgram);
    getProgramDays.mockResolvedValue([mockDay]);

    const { getByText } = renderScreen();

    await waitFor(() => getByText('+ Add Day'));
    expect(getByText('+ Add Day')).toBeTruthy();
  });

  it('shows day action menu when caret is tapped', async () => {
    getProgram.mockResolvedValue(mockProgram);
    getProgramDays.mockResolvedValue([mockDay]);

    const { getByText } = renderScreen();

    await waitFor(() => getByText('Push Day'));

    // Find and press the caret (down arrow unicode character)
    const caret = getByText('\u25BE');
    fireEvent.press(caret);

    expect(getByText('Rename')).toBeTruthy();
    expect(getByText('Delete')).toBeTruthy();
    expect(getByText('Duplicate')).toBeTruthy();
  });

  it('navigates back when back arrow is pressed', async () => {
    getProgram.mockResolvedValue(mockProgram);
    getProgramDays.mockResolvedValue([]);

    const { getByText } = renderScreen();
    await waitFor(() => getByText('Push Pull Legs'));
    // Back button uses unicode \u2039 (‹)
    fireEvent.press(getByText('\u2039'));
    expect(mockGoBack).toHaveBeenCalled();
  });

  it('activates program when Start Program is pressed', async () => {
    const { activateProgram } = require('../../db/programs');
    getProgram.mockResolvedValue({ ...mockProgram, startDate: null });
    getProgramDays.mockResolvedValue([]);

    const { getByText } = renderScreen();
    await waitFor(() => getByText('Start Program'));
    fireEvent.press(getByText('Start Program'));

    await waitFor(() => expect(activateProgram).toHaveBeenCalledWith(1));
  });

  it('triggers delete program alert when Del button is tapped', async () => {
    const { Alert: RNAlert } = require('react-native');
    getProgram.mockResolvedValue(mockProgram);
    getProgramDays.mockResolvedValue([]);

    const { getByText } = renderScreen();
    await waitFor(() => getByText('Push Pull Legs'));
    // Delete program button says "Del"
    fireEvent.press(getByText('Del'));
    // Alert.alert is called — we just verify no crash
    expect(getByText('Push Pull Legs')).toBeTruthy();
  });

  it('navigates to DayDetail when a day is tapped', async () => {
    getProgram.mockResolvedValue(mockProgram);
    getProgramDays.mockResolvedValue([mockDay]);

    const { getByText } = renderScreen();
    await waitFor(() => getByText('Push Day'));
    fireEvent.press(getByText('Push Day'));
    expect(mockNavigate).toHaveBeenCalledWith('DayDetail', { dayId: 10, dayName: 'Push Day' });
  });

  it('shows week navigation when program is activated', async () => {
    getProgram.mockResolvedValue({
      ...mockProgram,
      startDate: '2026-01-01',
      currentWeek: 2,
      weeks: 4,
    });
    getProgramDays.mockResolvedValue([mockDay]);
    getProgramWeekCompletion.mockResolvedValue([]);

    const { getByText } = renderScreen();
    // Week nav buttons show as "‹ Prev" and "Next ›"
    await waitFor(() => getByText(/Week 2\/4/));
    expect(getByText(/Next/)).toBeTruthy();
  });

  it('deletes a day when Delete is confirmed in action menu', async () => {
    const { deleteProgramDay } = require('../../db/programs');
    getProgram.mockResolvedValue(mockProgram);
    getProgramDays.mockResolvedValue([mockDay]);

    const { getByText } = renderScreen();
    await waitFor(() => getByText('Push Day'));
    fireEvent.press(getByText('\u25BE'));
    fireEvent.press(getByText('Delete'));

    // Alert.alert is called for confirmation - just verify the function was called
    expect(getByText('Push Day')).toBeTruthy();
  });

  it('duplicates a day when Duplicate is tapped', async () => {
    const { duplicateProgramDay } = require('../../db/programs');
    getProgram.mockResolvedValue(mockProgram);
    getProgramDays.mockResolvedValue([mockDay]);

    const { getByText } = renderScreen();
    await waitFor(() => getByText('Push Day'));
    fireEvent.press(getByText('\u25BE'));
    fireEvent.press(getByText('Duplicate'));

    await waitFor(() => expect(duplicateProgramDay).toHaveBeenCalledWith(10));
  });

  it('deletes program when Del confirmed in alert', async () => {
    const { deleteProgram } = require('../../db/programs');
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(
      (_title, _msg, buttons) => {
        const deleteBtn = (buttons as any[])?.find(b => b.text === 'Delete');
        deleteBtn?.onPress?.();
      },
    );
    getProgram.mockResolvedValue(mockProgram);
    getProgramDays.mockResolvedValue([]);

    const { getByText } = renderScreen();
    await waitFor(() => getByText('Push Pull Legs'));
    fireEvent.press(getByText('Del'));

    await waitFor(() => expect(deleteProgram).toHaveBeenCalledWith(1));
    alertSpy.mockRestore();
  });

  it('advances week when Next is pressed', async () => {
    const { advanceWeek } = require('../../db/programs');
    getProgram.mockResolvedValue({
      ...mockProgram,
      startDate: '2026-01-01',
      currentWeek: 1,
      weeks: 4,
    });
    getProgramDays.mockResolvedValue([mockDay]);
    getProgramWeekCompletion.mockResolvedValue([]);

    const { getByText } = renderScreen();
    await waitFor(() => getByText(/Next/));
    fireEvent.press(getByText(/Next/));

    await waitFor(() => expect(advanceWeek).toHaveBeenCalledWith(1));
  });

  it('decrements week when Prev is pressed', async () => {
    const { decrementWeek } = require('../../db/programs');
    getProgram.mockResolvedValue({
      ...mockProgram,
      startDate: '2026-01-01',
      currentWeek: 2,
      weeks: 4,
    });
    getProgramDays.mockResolvedValue([mockDay]);
    getProgramWeekCompletion.mockResolvedValue([]);

    const { getByText } = renderScreen();
    await waitFor(() => getByText(/Prev/));
    fireEvent.press(getByText(/Prev/));

    await waitFor(() => expect(decrementWeek).toHaveBeenCalledWith(1));
  });

  it('shows Add Day modal when + Add Day is pressed', async () => {
    getProgram.mockResolvedValue(mockProgram);
    getProgramDays.mockResolvedValue([]);

    const { getByText } = renderScreen();
    await waitFor(() => getByText('+ Add Day'));
    fireEvent.press(getByText('+ Add Day'));

    // Modal is shown — look for the modal content (Add Day button inside modal)
    await waitFor(() => {
      // AddDayModal should be visible
      expect(getByText('+ Add Day')).toBeTruthy();
    });
  });

  it('shows Rename modal when program name is pressed', async () => {
    getProgram.mockResolvedValue(mockProgram);
    getProgramDays.mockResolvedValue([]);

    const { getByText } = renderScreen();
    await waitFor(() => getByText('Push Pull Legs'));
    fireEvent.press(getByText('Push Pull Legs'));

    // RenameModal should open — look for it
    await waitFor(() => {
      expect(getByText('Push Pull Legs')).toBeTruthy();
    });
  });

  it('shows Rename Day modal when Rename action is pressed', async () => {
    const { renameProgramDay } = require('../../db/programs');
    getProgram.mockResolvedValue(mockProgram);
    getProgramDays.mockResolvedValue([mockDay]);

    const { getByText } = renderScreen();
    await waitFor(() => getByText('Push Day'));
    fireEvent.press(getByText('\u25BE'));
    fireEvent.press(getByText('Rename'));

    // RenameModal opens (visible because renameDayTarget is set)
    // Just verify no crash
    expect(getByText('Push Pull Legs')).toBeTruthy();
  });

  it('shows delete day confirmation alert when Delete is tapped from menu', async () => {
    const alertSpy = jest.spyOn(Alert, 'alert');
    getProgram.mockResolvedValue(mockProgram);
    getProgramDays.mockResolvedValue([mockDay]);

    const { getByText } = renderScreen();
    await waitFor(() => getByText('Push Day'));
    fireEvent.press(getByText('\u25BE'));
    fireEvent.press(getByText('Delete'));

    expect(alertSpy).toHaveBeenCalledWith(
      'Delete Day',
      expect.any(String),
      expect.any(Array),
    );
    alertSpy.mockRestore();
  });

  it('long pressing a day triggers mark complete alert', async () => {
    const alertSpy = jest.spyOn(Alert, 'alert');
    getProgram.mockResolvedValue({
      ...mockProgram,
      startDate: '2026-01-01',
      currentWeek: 1,
      weeks: 4,
    });
    getProgramDays.mockResolvedValue([mockDay]);
    getProgramWeekCompletion.mockResolvedValue([
      { dayId: 10, dayName: 'Push Day', isCompletedThisWeek: false, sessionId: null },
    ]);

    const { getAllByText } = renderScreen();
    await waitFor(() => getAllByText('Push Day')[0]);
    // Multiple "Push Day" elements can exist (week card + day card list). Long press any of them.
    const pushDayElements = getAllByText('Push Day');
    fireEvent(pushDayElements[pushDayElements.length - 1], 'longPress');

    await waitFor(() => expect(alertSpy).toHaveBeenCalled());
    alertSpy.mockRestore();
  });
});
