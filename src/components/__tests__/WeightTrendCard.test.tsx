import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { WeightTrendCard } from '../WeightTrendCard';

describe('WeightTrendCard', () => {
  const sampleSeries = Array.from({ length: 14 }, (_, i) => ({
    date: `2026-04-${String(10 + i).padStart(2, '0')}`,
    weight: 184.2 - i * 0.1,
  }));

  it('renders today weight + signed delta with window descriptor', () => {
    const { getByText, getByTestId } = render(
      <WeightTrendCard
        today={184.2}
        currentSevenDayMA={184.4}
        previousSevenDayMA={184.8}
        dailySeries={sampleSeries}
        onPress={jest.fn()}
      />,
    );
    expect(getByText('184.2')).toBeTruthy();
    expect(getByText(/^\s*lb$/)).toBeTruthy(); // the unit suffix next to the big number
    expect(getByTestId('weight-trend-delta').props.children).toMatch(/7d avg/);
  });

  it('shows em-dash delta when MAs are null', () => {
    const { getByText } = render(
      <WeightTrendCard
        today={184.2}
        currentSevenDayMA={null}
        previousSevenDayMA={null}
        dailySeries={sampleSeries}
        onPress={jest.fn()}
      />,
    );
    expect(getByText('—')).toBeTruthy();
  });

  it('renders em-dash big number when today is null', () => {
    const { getByText } = render(
      <WeightTrendCard
        today={null}
        currentSevenDayMA={null}
        previousSevenDayMA={null}
        dailySeries={[]}
        onPress={jest.fn()}
      />,
    );
    expect(getByText('—')).toBeTruthy();
  });

  it('fires onPress when tapped', () => {
    const onPress = jest.fn();
    const { getByTestId } = render(
      <WeightTrendCard
        today={184.2}
        currentSevenDayMA={184.4}
        previousSevenDayMA={184.8}
        dailySeries={sampleSeries}
        onPress={onPress}
      />,
    );
    fireEvent.press(getByTestId('weight-trend-card'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('uses neutral-slate delta color (no mint, no danger)', () => {
    const { getByTestId } = render(
      <WeightTrendCard
        today={184.2}
        currentSevenDayMA={184.4}
        previousSevenDayMA={184.8}
        dailySeries={sampleSeries}
        onPress={jest.fn()}
      />,
    );
    const delta = getByTestId('weight-trend-delta');
    const styles = Array.isArray(delta.props.style) ? delta.props.style.flat() : [delta.props.style];
    const colorValues = styles.filter(Boolean).map((s: any) => s && s.color).filter(Boolean);
    expect(colorValues).toContain('#BDC3CB');  // colors.textSoft
    expect(colorValues).not.toContain('#8DC28A'); // mint
    expect(colorValues).not.toContain('#D9534F'); // danger
  });
});
