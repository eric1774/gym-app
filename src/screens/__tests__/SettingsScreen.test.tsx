import React from 'react';
import { render } from '@testing-library/react-native';
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
});
