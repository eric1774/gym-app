import React from 'react';
import { waitFor } from '@testing-library/react-native';
import { renderWithProviders } from '../../test-utils';
import { CalendarScreen } from '../CalendarScreen';
import { getWorkoutDaysForMonth } from '../../db/calendar';

jest.mock('../../db/calendar', () => ({
  getWorkoutDaysForMonth: jest.fn().mockResolvedValue([]),
  getFirstSessionDate: jest.fn().mockResolvedValue(null),
}));

const mockGetWorkoutDaysForMonth = getWorkoutDaysForMonth as jest.Mock;

describe('CalendarScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetWorkoutDaysForMonth.mockResolvedValue([]);
  });

  it('renders month and year in header', async () => {
    const { getByText, getAllByText } = renderWithProviders(<CalendarScreen />, {
      withSession: false,
      withTimer: false,
    });

    const expected = new Date().toLocaleString('default', { month: 'long' });
    const year = new Date().getFullYear().toString();

    // Month label appears in the header
    expect(getByText(new RegExp(expected))).toBeTruthy();
    expect(getAllByText(new RegExp(year)).length).toBeGreaterThanOrEqual(1);
  });

  it('renders weekday labels S M T W T F S', async () => {
    const { getAllByText, getByText } = renderWithProviders(<CalendarScreen />, {
      withSession: false,
      withTimer: false,
    });

    // S appears twice (Sunday + Saturday)
    const allS = getAllByText('S');
    expect(allS.length).toBeGreaterThanOrEqual(2);
    expect(getByText('M')).toBeTruthy();
    expect(getByText('W')).toBeTruthy();
    expect(getByText('F')).toBeTruthy();
  });

  it('shows Loading text initially', () => {
    // Return a promise that never resolves so loading state stays visible
    mockGetWorkoutDaysForMonth.mockReturnValue(new Promise(() => {}));

    const { getByText } = renderWithProviders(<CalendarScreen />, {
      withSession: false,
      withTimer: false,
    });

    expect(getByText('Loading...')).toBeTruthy();
  });

  it('renders day numbers after loading', async () => {
    mockGetWorkoutDaysForMonth.mockResolvedValue([]);

    const { getByText, queryByText } = renderWithProviders(<CalendarScreen />, {
      withSession: false,
      withTimer: false,
    });

    await waitFor(() => expect(queryByText('Loading...')).toBeNull());

    expect(getByText('1')).toBeTruthy();
    expect(getByText('15')).toBeTruthy();
  });
});
