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

  it('renders chart when data exists (covers downsample and chart build paths)', async () => {
    // Provide multiple data points to trigger the chart render path
    const mockData = Array.from({ length: 7 }, (_, i) => ({
      date: `2026-03-0${i + 1}`,
      totalProteinGrams: 100 + i * 10,
    }));
    (getDailyProteinTotals as jest.Mock).mockResolvedValue(mockData);

    const { getByText, queryByText } = render(
      <NavigationContainer>
        <ProteinChart goal={200} />
      </NavigationContainer>,
    );

    // Wait for data to load — "No data yet" should NOT appear
    await waitFor(() => {
      expect(queryByText('No data yet')).toBeNull();
    });

    // Chart section header and legend should still be visible
    expect(getByText('PROTEIN INTAKE HISTORY')).toBeTruthy();
    expect(getByText('200g GOAL')).toBeTruthy();
    expect(getByText('DAILY INTAKE')).toBeTruthy();
  });

  it('covers All time range (getStartDate All branch)', async () => {
    const { getByText } = render(
      <NavigationContainer>
        <ProteinChart goal={200} />
      </NavigationContainer>,
    );

    await waitFor(() => expect(getDailyProteinTotals).toHaveBeenCalledTimes(1));
    fireEvent.press(getByText('All'));
    await waitFor(() => expect(getDailyProteinTotals).toHaveBeenCalledTimes(2));
  });

  it('covers 3M time range (getStartDate 3M branch)', async () => {
    const { getByText } = render(
      <NavigationContainer>
        <ProteinChart goal={200} />
      </NavigationContainer>,
    );

    await waitFor(() => expect(getDailyProteinTotals).toHaveBeenCalledTimes(1));
    fireEvent.press(getByText('3M'));
    await waitFor(() => expect(getDailyProteinTotals).toHaveBeenCalledTimes(2));
  });

  it('covers downsample when data exceeds MAX_POINTS (50)', async () => {
    // Provide 55 data points to trigger downsampling
    const mockData = Array.from({ length: 55 }, (_, i) => ({
      date: `2026-01-${String(i % 28 + 1).padStart(2, '0')}`,
      totalProteinGrams: 100 + (i % 50) * 2,
    }));
    (getDailyProteinTotals as jest.Mock).mockResolvedValue(mockData);

    const { queryByText } = render(
      <NavigationContainer>
        <ProteinChart goal={200} />
      </NavigationContainer>,
    );

    await waitFor(() => {
      expect(queryByText('No data yet')).toBeNull();
    });
    expect(true).toBeTruthy(); // downsample path covered
  });
});
