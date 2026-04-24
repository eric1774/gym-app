import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { VolumeTrendCard } from '../VolumeTrendCard';

describe('VolumeTrendCard', () => {
  const sampleBars = [
    { weekStart: '2026-04-02', tonnageLb: 20000 },
    { weekStart: '2026-04-09', tonnageLb: 22000 },
    { weekStart: '2026-04-16', tonnageLb: 24000 },
    { weekStart: '2026-04-23', tonnageLb: 24500 },
  ];

  it('renders signed percent + "vs prior 4 wk" context', () => {
    const { getByText } = render(
      <VolumeTrendCard deltaPercent={12} weeklyBars={sampleBars} onPress={jest.fn()} />,
    );
    expect(getByText('+12')).toBeTruthy();
    expect(getByText(/%/)).toBeTruthy();
    expect(getByText(/prior 4 wk/)).toBeTruthy();
  });

  it('shows em-dash when deltaPercent is null', () => {
    const { getByText } = render(
      <VolumeTrendCard deltaPercent={null} weeklyBars={[]} onPress={jest.fn()} />,
    );
    expect(getByText('—')).toBeTruthy();
  });

  it('renders signed negative percent', () => {
    const { getByText } = render(
      <VolumeTrendCard deltaPercent={-8} weeklyBars={sampleBars} onPress={jest.fn()} />,
    );
    expect(getByText('-8')).toBeTruthy();
  });

  it('fires onPress when tapped', () => {
    const onPress = jest.fn();
    const { getByTestId } = render(
      <VolumeTrendCard deltaPercent={12} weeklyBars={sampleBars} onPress={onPress} />,
    );
    fireEvent.press(getByTestId('volume-trend-card'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });
});
