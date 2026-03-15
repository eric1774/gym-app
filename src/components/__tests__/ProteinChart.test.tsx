jest.mock('../../db', () => ({
  getDailyProteinTotals: jest.fn().mockResolvedValue([]),
}));

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { NavigationContainer } from '@react-navigation/native';
import { ProteinChart } from '../ProteinChart';
import { getDailyProteinTotals } from '../../db';

describe('ProteinChart', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (getDailyProteinTotals as jest.Mock).mockResolvedValue([]);
  });

  it('shows empty state when no data', async () => {
    const { getByText } = render(
      <NavigationContainer>
        <ProteinChart goal={200} />
      </NavigationContainer>,
    );

    await waitFor(() => expect(getByText('No data yet')).toBeTruthy());
  });

  it('renders section header', async () => {
    const { getByText } = render(
      <NavigationContainer>
        <ProteinChart goal={200} />
      </NavigationContainer>,
    );

    expect(getByText('PROTEIN INTAKE HISTORY')).toBeTruthy();
  });

  it('renders all 4 time range filter pills', async () => {
    const { getByText } = render(
      <NavigationContainer>
        <ProteinChart goal={200} />
      </NavigationContainer>,
    );

    expect(getByText('1W')).toBeTruthy();
    expect(getByText('1M')).toBeTruthy();
    expect(getByText('3M')).toBeTruthy();
    expect(getByText('All')).toBeTruthy();
  });

  it('changes selected range on pill press', async () => {
    const { getByText } = render(
      <NavigationContainer>
        <ProteinChart goal={200} />
      </NavigationContainer>,
    );

    // Wait for initial load
    await waitFor(() => expect(getDailyProteinTotals).toHaveBeenCalledTimes(1));

    fireEvent.press(getByText('1M'));

    await waitFor(() => expect(getDailyProteinTotals).toHaveBeenCalledTimes(2));
  });
});
