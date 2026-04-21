import React from 'react';
import { render, waitFor, fireEvent, act } from '@testing-library/react-native';

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
  getWeekOverrideCounts: jest.fn(),
  getWeekData: jest.fn(),
  upsertWeekData: jest.fn().mockResolvedValue(undefined),
}));

import { CustomizeWeeksScreen } from '../CustomizeWeeksScreen';
const {
  getProgram,
  getProgramDays,
  getWeekOverrideCounts,
  getWeekData,
  upsertWeekData,
} = require('../../db/programs');

const mockProgram = {
  id: 1,
  name: 'Test Program',
  weeks: 3,
  startDate: null,
  currentWeek: 1,
  createdAt: '',
  archivedAt: null,
};

const mockDay = {
  id: 10,
  programId: 1,
  name: 'Day 1',
  sortOrder: 0,
  createdAt: '',
};

beforeEach(() => {
  jest.clearAllMocks();
  getProgram.mockResolvedValue(mockProgram);
  getProgramDays.mockResolvedValue([mockDay]);
  getWeekOverrideCounts.mockResolvedValue({});
  getWeekData.mockImplementation(async (_pid: number, wk: number) => {
    if (wk === 2) {
      return {
        id: 99,
        programId: 1,
        weekNumber: 2,
        name: 'Volume Block',
        details: 'Push intensity',
      };
    }
    return null;
  });
});

describe('CustomizeWeeksScreen — week header tap opens editor', () => {
  it('opens WeekEditModal seeded with week 2 data when W2 header is tapped', async () => {
    const { getByText, queryByDisplayValue } = render(<CustomizeWeeksScreen />);

    // Wait for week 2 row to render with its name
    await waitFor(() => {
      expect(getByText('Volume Block')).toBeTruthy();
    });

    // Modal not visible yet — its inputs should not be in the tree
    expect(queryByDisplayValue('Volume Block')).toBeNull();

    // Tap W2 header
    fireEvent.press(getByText('W2'));

    // Modal opens, fields seeded from week 2's data
    await waitFor(() => {
      expect(queryByDisplayValue('Volume Block')).toBeTruthy();
      expect(queryByDisplayValue('Push intensity')).toBeTruthy();
    });
  });

  it('saves edits via upsertWeekData and refreshes', async () => {
    const { getByText, getByDisplayValue } = render(<CustomizeWeeksScreen />);

    await waitFor(() => expect(getByText('Volume Block')).toBeTruthy());

    fireEvent.press(getByText('W2'));

    await waitFor(() => expect(getByDisplayValue('Volume Block')).toBeTruthy());

    // Edit the name
    fireEvent.changeText(getByDisplayValue('Volume Block'), 'Deload');

    // Tap Save
    await act(async () => {
      fireEvent.press(getByText('Save'));
    });

    expect(upsertWeekData).toHaveBeenCalledWith(1, 2, 'Deload', 'Push intensity');
    // refresh() re-runs the loaders; getProgram is called twice (initial + after save)
    expect(getProgram).toHaveBeenCalledTimes(2);
  });

  it('opens an empty editor for a week with no saved data', async () => {
    const { getByText, queryByDisplayValue } = render(<CustomizeWeeksScreen />);

    // Wait for the screen to finish loading (W3 header becomes visible)
    await waitFor(() => expect(getByText('W3')).toBeTruthy());

    // Tap W3 (no saved data per mock)
    fireEvent.press(getByText('W3'));

    await waitFor(() => {
      // Modal title is rendered, indicating the editor opened
      expect(getByText('Week 3 of 3')).toBeTruthy();
    });

    // Inputs are empty — neither field has a pre-filled value
    expect(queryByDisplayValue('Volume Block')).toBeNull();
  });
});
