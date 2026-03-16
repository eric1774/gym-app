jest.mock('../../db/programs', () => ({
  getPrograms: jest.fn().mockResolvedValue([]),
  getProgramDays: jest.fn().mockResolvedValue([]),
  deleteProgram: jest.fn().mockResolvedValue(undefined),
  createProgram: jest.fn(),
}));
jest.mock('../../db/dashboard', () => ({
  getProgramTotalCompleted: jest.fn().mockResolvedValue(0),
}));

import React from 'react';
import { waitFor, fireEvent } from '@testing-library/react-native';
import { renderWithProviders } from '../../test-utils';
import { ProgramsScreen } from '../ProgramsScreen';
import { getPrograms, getProgramDays } from '../../db/programs';
import { getProgramTotalCompleted } from '../../db/dashboard';

describe('ProgramsScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (getPrograms as jest.Mock).mockResolvedValue([]);
    (getProgramDays as jest.Mock).mockResolvedValue([]);
    (getProgramTotalCompleted as jest.Mock).mockResolvedValue(0);
  });

  it('renders Programs title', async () => {
    const { getByText } = renderWithProviders(<ProgramsScreen />);
    await waitFor(() => getByText('Programs'));
    expect(getByText('Programs')).toBeTruthy();
  });

  it('shows empty state when no programs', async () => {
    (getPrograms as jest.Mock).mockResolvedValue([]);
    const { getByText } = renderWithProviders(<ProgramsScreen />);
    await waitFor(() => getByText('No programs yet'));
    expect(getByText('Tap + to create one')).toBeTruthy();
  });

  it('renders program card with name', async () => {
    (getPrograms as jest.Mock).mockResolvedValue([
      { id: 1, name: 'PPL', weeks: 4, currentWeek: 1, startDate: null, createdAt: '', isActive: true },
    ]);
    (getProgramDays as jest.Mock).mockImplementation((programId: number) => {
      if (programId === 1) return Promise.resolve([{ id: 1 }]);
      return Promise.resolve([]);
    });
    const { getByText } = renderWithProviders(<ProgramsScreen />);
    await waitFor(() => getByText('PPL'));
    expect(getByText('PPL')).toBeTruthy();
    expect(getByText('4 weeks · Not started')).toBeTruthy();
  });

  it('renders active program with progress', async () => {
    (getPrograms as jest.Mock).mockResolvedValue([
      { id: 1, name: 'PPL', weeks: 4, currentWeek: 2, startDate: '2025-01-01', createdAt: '', isActive: true },
    ]);
    (getProgramDays as jest.Mock).mockImplementation((programId: number) => {
      if (programId === 1) return Promise.resolve([{ id: 1 }, { id: 2 }, { id: 3 }]);
      return Promise.resolve([]);
    });
    (getProgramTotalCompleted as jest.Mock).mockResolvedValue(6);
    const { getByText } = renderWithProviders(<ProgramsScreen />);
    await waitFor(() => getByText('PPL'));
    expect(getByText('Progress')).toBeTruthy();
    expect(getByText('6 of 12 workouts')).toBeTruthy();
  });

  it('opens create modal when + pressed', async () => {
    const { getByText, getAllByText } = renderWithProviders(<ProgramsScreen />);
    await waitFor(() => getByText('Programs'));
    fireEvent.press(getByText('+'));
    await waitFor(() => getAllByText('Create Program'));
    expect(getAllByText('Create Program').length).toBeGreaterThan(0);
  });
});
