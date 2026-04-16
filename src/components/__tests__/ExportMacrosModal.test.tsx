// Forward-compat mocks: wired up in B5 (DateTimePicker) and B7 (FileSaver + getMacrosExportData)
jest.mock('../../db', () => ({
  macrosDb: {
    getMacrosExportData: jest.fn(),
  },
}));
jest.mock('../../native/FileSaver', () => ({
  saveFileToDevice: jest.fn().mockResolvedValue(true),
}));
jest.mock('@react-native-community/datetimepicker', () => 'DateTimePicker');

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { ExportMacrosModal } from '../ExportMacrosModal';

describe('ExportMacrosModal', () => {
  afterEach(() => {
    jest.useRealTimers();
  });

  it('renders title and action buttons when visible', () => {
    const { getByText } = render(
      <ExportMacrosModal visible={true} onClose={jest.fn()} />,
    );

    expect(getByText('Export Macros')).toBeTruthy();
    expect(getByText('Cancel')).toBeTruthy();
    expect(getByText('Export JSON')).toBeTruthy();
  });

  it('returns null content when not visible', () => {
    const { queryByText } = render(
      <ExportMacrosModal visible={false} onClose={jest.fn()} />,
    );

    expect(queryByText('Export Macros')).toBeNull();
  });

  it('renders From and To date fields with defaults (today and today − 30 days)', () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-04-16T10:00:00Z'));

    const { getByText } = render(
      <ExportMacrosModal visible={true} onClose={jest.fn()} />,
    );

    expect(getByText('From')).toBeTruthy();
    expect(getByText('To')).toBeTruthy();
    expect(getByText('Mar 17, 2026')).toBeTruthy();
    expect(getByText('Apr 16, 2026')).toBeTruthy();
  });

  it('shows inline error and disables Export when From > To', () => {
    const { getByText } = render(
      <ExportMacrosModal
        visible={true}
        onClose={jest.fn()}
        initialFrom={new Date('2026-04-16T00:00:00Z')}
        initialTo={new Date('2026-04-15T00:00:00Z')}
      />,
    );

    expect(getByText('End date must be on or after start date.')).toBeTruthy();

    const exportBtn = getByText('Export JSON');
    // The Text node is wrapped in a host View by RNTL; accessibilityState lives on the grandparent.
    expect(exportBtn.parent?.parent?.props.accessibilityState?.disabled).toBe(true);
  });

  it('calls getMacrosExportData and saveFileToDevice with correct args on Export press', async () => {
    const { macrosDb } = require('../../db');
    const { saveFileToDevice } = require('../../native/FileSaver');
    (macrosDb.getMacrosExportData as jest.Mock).mockResolvedValue({
      exportedAt: '2026-04-16T10:24:00.000Z',
      appVersion: '0.0.1',
      range: { start: '2026-04-10', end: '2026-04-15' },
      goals: null,
      days: [],
    });
    (saveFileToDevice as jest.Mock).mockResolvedValue(true);

    const onClose = jest.fn();
    const { getByText } = render(
      <ExportMacrosModal
        visible={true}
        onClose={onClose}
        initialFrom={new Date('2026-04-10T00:00:00')}
        initialTo={new Date('2026-04-15T00:00:00')}
      />,
    );

    fireEvent.press(getByText('Export JSON'));

    await waitFor(() =>
      expect(macrosDb.getMacrosExportData).toHaveBeenCalledWith('2026-04-10', '2026-04-15'),
    );
    await waitFor(() =>
      expect(saveFileToDevice).toHaveBeenCalledWith(
        expect.stringContaining('"exportedAt"'),
        'gymtrack-macros-2026-04-10-to-2026-04-15.json',
      ),
    );
    await waitFor(() => expect(onClose).toHaveBeenCalled());
  });

  it('keeps the modal open when saveFileToDevice resolves to false (user cancelled)', async () => {
    const { macrosDb } = require('../../db');
    const { saveFileToDevice } = require('../../native/FileSaver');
    (macrosDb.getMacrosExportData as jest.Mock).mockResolvedValue({
      exportedAt: '', appVersion: '', range: { start: '', end: '' }, goals: null, days: [],
    });
    (saveFileToDevice as jest.Mock).mockResolvedValue(false);

    const onClose = jest.fn();
    const { getByText } = render(
      <ExportMacrosModal
        visible={true}
        onClose={onClose}
        initialFrom={new Date('2026-04-10T00:00:00')}
        initialTo={new Date('2026-04-15T00:00:00')}
      />,
    );

    fireEvent.press(getByText('Export JSON'));

    await waitFor(() => expect(saveFileToDevice).toHaveBeenCalled());
    expect(onClose).not.toHaveBeenCalled();
  });

  it('alerts and stays open when getMacrosExportData throws', async () => {
    const { macrosDb } = require('../../db');
    (macrosDb.getMacrosExportData as jest.Mock).mockRejectedValue(new Error('db boom'));

    const alertSpy = jest.spyOn(require('react-native').Alert, 'alert').mockImplementation(() => {});
    const onClose = jest.fn();

    const { getByText } = render(
      <ExportMacrosModal
        visible={true}
        onClose={onClose}
        initialFrom={new Date('2026-04-10T00:00:00')}
        initialTo={new Date('2026-04-15T00:00:00')}
      />,
    );

    fireEvent.press(getByText('Export JSON'));

    await waitFor(() => expect(alertSpy).toHaveBeenCalled());
    expect(onClose).not.toHaveBeenCalled();
    alertSpy.mockRestore();
  });
});
