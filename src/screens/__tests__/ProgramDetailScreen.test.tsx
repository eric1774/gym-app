import React from 'react';
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
});
