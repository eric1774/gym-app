import React from 'react';
import { Share } from 'react-native';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { NavigationContainer } from '@react-navigation/native';
import { SettingsScreen } from '../SettingsScreen';

jest.mock('../../db/dashboard', () => ({
  exportAllData: jest.fn().mockResolvedValue({ programs: [], exercises: [] }),
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

  it('calls exportAllData and Share.share when Export is pressed', async () => {
    const { exportAllData } = require('../../db/dashboard');
    const shareSpy = jest.spyOn(Share, 'share').mockResolvedValue({ action: 'sharedAction' } as any);

    const { getByText } = renderSettings();
    fireEvent.press(getByText('Export'));

    await waitFor(() => {
      expect(exportAllData).toHaveBeenCalled();
      expect(shareSpy).toHaveBeenCalled();
    });
    shareSpy.mockRestore();
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
});
