jest.mock('../../db/programs', () => ({
  getPrograms: jest.fn().mockResolvedValue([]),
  getProgramDays: jest.fn().mockResolvedValue([]),
  deleteProgram: jest.fn().mockResolvedValue(undefined),
  createProgram: jest.fn(),
}));
jest.mock('../../db/dashboard', () => ({
  getProgramTotalCompleted: jest.fn().mockResolvedValue(0),
}));
jest.mock('../../db/export', () => ({
  exportProgramData: jest.fn().mockResolvedValue(null),
}));
jest.mock('../../native/FileSaver', () => ({
  saveFileToDevice: jest.fn().mockResolvedValue(true),
}));

import React from 'react';
import { Alert } from 'react-native';
import { waitFor, fireEvent } from '@testing-library/react-native';
import { renderWithProviders } from '../../test-utils';
import { ProgramsScreen } from '../ProgramsScreen';
import { getPrograms, getProgramDays } from '../../db/programs';
import { getProgramTotalCompleted } from '../../db/dashboard';
import { exportProgramData } from '../../db/export';
import { saveFileToDevice } from '../../native/FileSaver';

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

  it('renders stat pills with counts', async () => {
    (getPrograms as jest.Mock).mockResolvedValue([
      { id: 1, name: 'PPL', weeks: 4, currentWeek: 1, startDate: null, createdAt: '' },
      { id: 2, name: 'Active One', weeks: 4, currentWeek: 2, startDate: '2025-01-01', createdAt: '' },
      { id: 3, name: 'Done One', weeks: 2, currentWeek: 2, startDate: '2025-01-01', createdAt: '' },
    ]);
    (getProgramDays as jest.Mock).mockImplementation(() => Promise.resolve([{ id: 1 }]));
    (getProgramTotalCompleted as jest.Mock).mockImplementation((programId: number) => {
      if (programId === 3) return Promise.resolve(2); // 1 day * 2 weeks = done
      return Promise.resolve(0);
    });

    const { getByText } = renderWithProviders(<ProgramsScreen />);
    await waitFor(() => getByText('ACTIVE'));
    expect(getByText('ACTIVE')).toBeTruthy();
    expect(getByText('COMPLETED')).toBeTruthy();
    expect(getByText('IN PROGRESS')).toBeTruthy();
  });

  it('shows empty state when no programs', async () => {
    (getPrograms as jest.Mock).mockResolvedValue([]);
    const { getByText } = renderWithProviders(<ProgramsScreen />);
    await waitFor(() => getByText('No programs yet'));
    expect(getByText('Tap + to create one')).toBeTruthy();
  });

  it('renders not-started program card with Ready to start panel', async () => {
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
    expect(getByText('Ready to start')).toBeTruthy();
    expect(getByText('1 days/week · 4 weeks')).toBeTruthy();
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
    expect(getByText('WEEK')).toBeTruthy();
    expect(getByText('SESSIONS')).toBeTruthy();
    // Current week (2) + total (4) render in one Text node as "2/4";
    // completed (6) + total (12) render in one Text node as "6/12".
    // (Inner <Text> just styles the "/N" segment dimmer.)
    expect(getByText('2/4')).toBeTruthy();
    expect(getByText('6/12')).toBeTruthy();
  });

  it('opens create modal when add button pressed', async () => {
    const { getByText, getByTestId, getAllByText } = renderWithProviders(<ProgramsScreen />);
    await waitFor(() => getByText('Programs'));
    fireEvent.press(getByTestId('add-program-button'));
    await waitFor(() => getAllByText('Create Program'));
    expect(getAllByText('Create Program').length).toBeGreaterThan(0);
  });

  it('shows active tab label with count when programs exist', async () => {
    (getPrograms as jest.Mock).mockResolvedValue([
      { id: 1, name: 'PPL', weeks: 4, currentWeek: 1, startDate: null, createdAt: '' },
    ]);
    (getProgramDays as jest.Mock).mockResolvedValue([]);
    const { getByText } = renderWithProviders(<ProgramsScreen />);
    await waitFor(() => getByText('Active (1)'));
    expect(getByText('Active (1)')).toBeTruthy();
  });

  it('shows completed tab label with count when past programs exist', async () => {
    (getPrograms as jest.Mock).mockResolvedValue([
      { id: 1, name: 'Old Program', weeks: 2, currentWeek: 2, startDate: '2025-01-01', createdAt: '' },
    ]);
    (getProgramDays as jest.Mock).mockImplementation(() => Promise.resolve([{ id: 1 }]));
    (getProgramTotalCompleted as jest.Mock).mockResolvedValue(2);
    const { getByText } = renderWithProviders(<ProgramsScreen />);
    await waitFor(() => getByText('Completed (1)'));
    expect(getByText('Completed (1)')).toBeTruthy();
  });

  it('renders three-dot menu button on program card', async () => {
    (getPrograms as jest.Mock).mockResolvedValue([
      { id: 1, name: 'PPL', weeks: 4, currentWeek: 1, startDate: null, createdAt: '' },
    ]);
    (getProgramDays as jest.Mock).mockResolvedValue([]);
    const { getAllByTestId } = renderWithProviders(<ProgramsScreen />);
    await waitFor(() => getAllByTestId('menu-button'));
    expect(getAllByTestId('menu-button').length).toBeGreaterThan(0);
  });

  it('shows delete confirmation alert via menu Delete option', async () => {
    const alertSpy = jest.spyOn(Alert, 'alert');
    (getPrograms as jest.Mock).mockResolvedValue([
      { id: 1, name: 'PPL', weeks: 4, currentWeek: 1, startDate: null, createdAt: '' },
    ]);
    (getProgramDays as jest.Mock).mockResolvedValue([]);
    const { getAllByTestId, getByText } = renderWithProviders(<ProgramsScreen />);
    await waitFor(() => getAllByTestId('menu-button'));
    fireEvent.press(getAllByTestId('menu-button')[0]);
    await waitFor(() => getByText('Delete'));
    fireEvent.press(getByText('Delete'));
    expect(alertSpy).toHaveBeenCalledWith(
      'Delete Program',
      expect.stringContaining('PPL'),
      expect.any(Array),
    );
    alertSpy.mockRestore();
  });

  it('deletes program when Delete is confirmed in alert', async () => {
    const { deleteProgram } = require('../../db/programs');
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(
      (_title, _msg, buttons) => {
        const deleteBtn = (buttons as any[])?.find(b => b.text === 'Delete');
        deleteBtn?.onPress?.();
      },
    );
    (getPrograms as jest.Mock).mockResolvedValue([
      { id: 1, name: 'PPL', weeks: 4, currentWeek: 1, startDate: null, createdAt: '' },
    ]);
    (getProgramDays as jest.Mock).mockResolvedValue([]);
    const { getAllByTestId, getByText } = renderWithProviders(<ProgramsScreen />);
    await waitFor(() => getAllByTestId('menu-button'));
    fireEvent.press(getAllByTestId('menu-button')[0]);
    await waitFor(() => getByText('Delete'));
    fireEvent.press(getByText('Delete'));
    await waitFor(() => expect(deleteProgram).toHaveBeenCalledWith(1));
    alertSpy.mockRestore();
  });

  it('shows Export option in menu when three-dot pressed', async () => {
    (getPrograms as jest.Mock).mockResolvedValue([
      { id: 1, name: 'PPL', weeks: 4, currentWeek: 1, startDate: null, createdAt: '' },
    ]);
    (getProgramDays as jest.Mock).mockImplementation(() => Promise.resolve([{ id: 1 }, { id: 2 }]));
    (getProgramTotalCompleted as jest.Mock).mockResolvedValue(3);
    const { getAllByTestId, getByText } = renderWithProviders(<ProgramsScreen />);
    await waitFor(() => getAllByTestId('menu-button'));
    fireEvent.press(getAllByTestId('menu-button')[0]);
    await waitFor(() => getByText('Export'));
    expect(getByText('Export')).toBeTruthy();
  });

  it('shows disabled Export with No workout data when no completed workouts', async () => {
    (getPrograms as jest.Mock).mockResolvedValue([
      { id: 1, name: 'PPL', weeks: 4, currentWeek: 1, startDate: null, createdAt: '' },
    ]);
    (getProgramDays as jest.Mock).mockResolvedValue([]);
    (getProgramTotalCompleted as jest.Mock).mockResolvedValue(0);
    const { getAllByTestId, getByText } = renderWithProviders(<ProgramsScreen />);
    await waitFor(() => getAllByTestId('menu-button'));
    fireEvent.press(getAllByTestId('menu-button')[0]);
    await waitFor(() => getByText('No workout data'));
    expect(getByText('No workout data')).toBeTruthy();
  });

  it('calls exportProgramData and saveFileToDevice on Export tap', async () => {
    (saveFileToDevice as jest.Mock).mockResolvedValue(true);
    (exportProgramData as jest.Mock).mockResolvedValue({
      programName: 'PPL',
      totalWeeks: 4,
      completionPercent: 50,
      exportedAt: '2026-03-22T00:00:00.000Z',
      weeks: [],
    });
    (getPrograms as jest.Mock).mockResolvedValue([
      { id: 1, name: 'PPL', weeks: 4, currentWeek: 1, startDate: null, createdAt: '' },
    ]);
    (getProgramDays as jest.Mock).mockImplementation(() => Promise.resolve([{ id: 1 }]));
    (getProgramTotalCompleted as jest.Mock).mockResolvedValue(3);

    const { getAllByTestId, getByText } = renderWithProviders(<ProgramsScreen />);
    await waitFor(() => getAllByTestId('menu-button'));
    fireEvent.press(getAllByTestId('menu-button')[0]);
    await waitFor(() => getByText('Export'));
    fireEvent.press(getByText('Export'));

    await waitFor(() => expect(exportProgramData).toHaveBeenCalledWith(1));
    await waitFor(() => expect(saveFileToDevice).toHaveBeenCalledWith(
      expect.any(String),
      expect.stringMatching(/^PPL_.*\.json$/),
    ));
  });
});
