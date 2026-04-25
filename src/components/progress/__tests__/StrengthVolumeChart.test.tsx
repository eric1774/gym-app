import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { StrengthVolumeChart } from '../StrengthVolumeChart';
import { ChartPoint } from '../../../types';

const points: ChartPoint[] = [
  { sessionId: 1, date: '2026-01-15T00:00:00Z', bestWeightLb: 175, volumeLb: 1640, isPR: true },
  { sessionId: 2, date: '2026-02-01T00:00:00Z', bestWeightLb: 180, volumeLb: 1720, isPR: true },
  { sessionId: 3, date: '2026-02-20T00:00:00Z', bestWeightLb: 195, volumeLb: 2025, isPR: true },
];

describe('StrengthVolumeChart', () => {
  it('renders empty state when fewer than 2 points', () => {
    const { getByText } = render(
      <StrengthVolumeChart points={[points[0]]} onPointTap={() => {}} />,
    );
    expect(getByText(/Log 2\+ sessions/)).toBeTruthy();
  });

  it('renders bars and line when 2+ points', () => {
    const { getAllByTestId } = render(
      <StrengthVolumeChart points={points} onPointTap={() => {}} />,
    );
    expect(getAllByTestId(/^chart-bar-/)).toHaveLength(3);
    expect(getAllByTestId(/^chart-point-/)).toHaveLength(3);
  });

  it('calls onPointTap with full ChartPoint on tap', () => {
    const onPointTap = jest.fn();
    const { getByTestId } = render(
      <StrengthVolumeChart points={points} onPointTap={onPointTap} />,
    );
    fireEvent.press(getByTestId('chart-point-1'));
    expect(onPointTap).toHaveBeenCalledWith(points[1]);
  });

  it('renders y-axis tick labels in mint (left) and slate (right)', () => {
    const { getAllByTestId } = render(
      <StrengthVolumeChart points={points} onPointTap={() => {}} />,
    );
    const mintTicks = getAllByTestId(/^y-tick-mint-/);
    const slateTicks = getAllByTestId(/^y-tick-slate-/);
    expect(mintTicks.length).toBeGreaterThan(0);
    expect(slateTicks.length).toBeGreaterThan(0);
  });
});
