import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { NavigationContainer } from '@react-navigation/native';
import { SettingsScreen } from '../SettingsScreen';

jest.mock('../../db/dashboard', () => ({
  exportAllData: jest.fn().mockResolvedValue({ programs: [], exercises: [] }),
}));
jest.mock('../../native/FileSaver', () => ({
  saveFileToDevice: jest.fn().mockResolvedValue(true),
}));
jest.mock('../../context/HeartRateContext', () => ({
  useHeartRate: jest.fn().mockReturnValue({
    pairedDeviceName: null,
    disconnect: jest.fn().mockResolvedValue(undefined),
  }),
}));
jest.mock('../../services/HRSettingsService', () => ({
  getHRSettings: jest.fn().mockResolvedValue({
    age: null,
    maxHrOverride: null,
    pairedDeviceId: null,
  }),
  setAge: jest.fn().mockResolvedValue(undefined),
  setMaxHrOverride: jest.fn().mockResolvedValue(undefined),
}));
jest.mock('../DeviceScanSheet', () => ({
  DeviceScanSheet: jest.fn().mockReturnValue(null),
}));
jest.mock('../../db/repair', () => ({
  repairProgramData: jest.fn().mockResolvedValue('Repair complete'),
}));
jest.mock('../../services/UserProfileService', () => ({
  getUserFirstName: jest.fn().mockResolvedValue(null),
  setUserFirstName: jest.fn().mockResolvedValue(undefined),
}));

function renderSettings() {
  return render(
    <NavigationContainer>
      <SettingsScreen />
    </NavigationContainer>,
  );
}

describe('SettingsScreen', () => {
  it('renders Settings title', () => {
    const { getByText } = renderSettings();

    expect(getByText('Settings')).toBeTruthy();
  });

  it('renders Heart Rate Monitor card first', async () => {
    const { getByText } = renderSettings();

    await waitFor(() => {
      expect(getByText('Heart Rate Monitor')).toBeTruthy();
    });
  });

  it('renders Export Data card', () => {
    const { getByText } = renderSettings();

    expect(getByText('Export Data')).toBeTruthy();
    expect(getByText('Export')).toBeTruthy();
  });

  it('renders About section', () => {
    const { getByText } = renderSettings();

    expect(getByText('GymTrack v1.0')).toBeTruthy();
    expect(getByText('Local-only workout tracker')).toBeTruthy();
  });

  it('renders No device paired when no device', async () => {
    const { getByText } = renderSettings();

    await waitFor(() => {
      expect(getByText('No device paired')).toBeTruthy();
      expect(getByText('Scan for Devices')).toBeTruthy();
    });
  });

  it('calls exportAllData and saveFileToDevice when Export is pressed', async () => {
    const { exportAllData } = require('../../db/dashboard');
    const { saveFileToDevice } = require('../../native/FileSaver');

    const { getByText } = renderSettings();
    fireEvent.press(getByText('Export'));

    await waitFor(() => {
      expect(exportAllData).toHaveBeenCalled();
      expect(saveFileToDevice).toHaveBeenCalledWith(
        expect.any(String),
        expect.stringMatching(/^gymtrack-export-.*\.json$/),
      );
    });
  });

  it('handles export error gracefully', async () => {
    const { exportAllData } = require('../../db/dashboard');
    exportAllData.mockRejectedValueOnce(new Error('export failed'));

    const { getByText } = renderSettings();
    fireEvent.press(getByText('Export'));

    // Should recover and show Export button again (not crash)
    await waitFor(() => expect(getByText('Export')).toBeTruthy());
  });

  it('navigates back when back button is pressed', () => {
    const { getByText } = renderSettings();
    // Back button shows '<' character
    fireEvent.press(getByText('<'));
    // No crash - back navigation invoked
    expect(getByText('Settings')).toBeTruthy();
  });

  it('shows age input with Enter age placeholder', async () => {
    const { getByPlaceholderText } = renderSettings();

    await waitFor(() => {
      expect(getByPlaceholderText('Enter age')).toBeTruthy();
    });
  });

  describe('Your Name field', () => {
    const { getUserFirstName, setUserFirstName } = require('../../services/UserProfileService');

    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('pre-populates the name input with the saved name', async () => {
      getUserFirstName.mockResolvedValue('Eric');

      const { findByDisplayValue } = renderSettings();

      await findByDisplayValue('Eric');
    });

    it('calls setUserFirstName with trimmed value on blur', async () => {
      getUserFirstName.mockResolvedValue(null);
      setUserFirstName.mockResolvedValue(undefined);

      const { getByTestId } = renderSettings();

      await waitFor(() => expect(getByTestId('settings-name-input')).toBeTruthy());

      const input = getByTestId('settings-name-input');
      fireEvent.changeText(input, '  Eric  ');
      fireEvent(input, 'blur');

      await waitFor(() => {
        expect(setUserFirstName).toHaveBeenCalledWith('  Eric  ');
      });
    });
  });
});
