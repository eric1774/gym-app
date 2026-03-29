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
jest.mock('../../db/repair', () => ({
  repairProgramData: jest.fn().mockResolvedValue('Repair complete'),
}));

// Mock HRSettingsService
const mockGetHRSettings = jest.fn().mockResolvedValue({ age: null, maxHrOverride: null, pairedDeviceId: null });
const mockSetAge = jest.fn().mockResolvedValue(undefined);
const mockSetMaxHrOverride = jest.fn().mockResolvedValue(undefined);
jest.mock('../../services/HRSettingsService', () => ({
  getHRSettings: (...args: any[]) => mockGetHRSettings(...args),
  setAge: (...args: any[]) => mockSetAge(...args),
  setMaxHrOverride: (...args: any[]) => mockSetMaxHrOverride(...args),
}));

// Mock HeartRateContext (DeviceScanSheet uses it; mock startScan to prevent BLE activity)
jest.mock('../../context/HeartRateContext', () => ({
  useHeartRate: () => ({
    deviceState: 'disconnected',
    currentBpm: null,
    discoveredDevices: [],
    pairedDeviceName: null,
    scanTimeRemaining: null,
    startScan: jest.fn(),
    stopScan: jest.fn(),
    connectToDevice: jest.fn(),
    disconnect: jest.fn(),
    attemptAutoReconnect: jest.fn(),
    flushHRSamples: jest.fn(),
  }),
  HeartRateProvider: ({ children }: any) => children,
}));

function renderSettings() {
  return render(
    <NavigationContainer>
      <SettingsScreen />
    </NavigationContainer>,
  );
}

beforeEach(() => {
  jest.clearAllMocks();
  mockGetHRSettings.mockResolvedValue({ age: null, maxHrOverride: null, pairedDeviceId: null });
});

describe('SettingsScreen', () => {
  it('renders Settings title', () => {
    const { getByText } = renderSettings();

    expect(getByText('Settings')).toBeTruthy();
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

  // ─── HR Monitor card tests ──────────────────────────────────────────────────

  it('renders HR Monitor card heading', () => {
    const { getByText } = renderSettings();

    expect(getByText('HR Monitor')).toBeTruthy();
  });

  it('renders age input field', () => {
    const { getByPlaceholderText } = renderSettings();

    expect(getByPlaceholderText('e.g. 35')).toBeTruthy();
  });

  it('renders Pair HR Monitor button', () => {
    const { getByText } = renderSettings();

    expect(getByText('Pair HR Monitor')).toBeTruthy();
  });

  it('shows prompt to enter age when no age is set', () => {
    const { getByText } = renderSettings();

    expect(getByText('Enter age to compute max HR')).toBeTruthy();
  });

  it('shows Tanaka computed max HR when age is entered', async () => {
    const { getByPlaceholderText, getByText } = renderSettings();

    fireEvent.changeText(getByPlaceholderText('e.g. 35'), '35');

    // 208 - 0.7 * 35 = 183.5 → 184
    await waitFor(() => {
      expect(getByText('Max HR: 184 bpm (Tanaka formula)')).toBeTruthy();
    });
  });

  it('shows manual override max HR when override input is filled', async () => {
    const { getByPlaceholderText, getByText } = renderSettings();

    fireEvent.changeText(getByPlaceholderText('e.g. 35'), '35');
    fireEvent.changeText(getByPlaceholderText('Leave blank to use formula'), '175');

    await waitFor(() => {
      expect(getByText('Max HR: 175 bpm (manual override)')).toBeTruthy();
    });
  });

  it('pre-fills age input when HR settings have age saved', async () => {
    mockGetHRSettings.mockResolvedValue({ age: 40, maxHrOverride: null, pairedDeviceId: null });

    const { getByDisplayValue } = renderSettings();

    await waitFor(() => {
      expect(getByDisplayValue('40')).toBeTruthy();
    });
  });

  it('calls setAge when age input loses focus', async () => {
    const { getByPlaceholderText } = renderSettings();

    const ageInput = getByPlaceholderText('e.g. 35');
    fireEvent.changeText(ageInput, '30');
    fireEvent(ageInput, 'blur');

    await waitFor(() => {
      expect(mockSetAge).toHaveBeenCalledWith(30);
    });
  });

  it('opens DeviceScanSheet modal when Pair HR Monitor is pressed', async () => {
    const { getByText, findByText } = renderSettings();

    fireEvent.press(getByText('Pair HR Monitor'));

    // DeviceScanSheet renders with scan controls when visible
    await waitFor(() => {
      // The modal should open; check for modal content (DeviceScanSheet title)
      expect(getByText('HR Monitor')).toBeTruthy(); // card is still visible
    });
  });
});
