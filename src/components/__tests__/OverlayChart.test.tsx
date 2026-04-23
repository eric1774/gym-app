import React from 'react';
import { render } from '@testing-library/react-native';
import { OverlayChart } from '../OverlayChart';

describe('OverlayChart', () => {
  it('renders without crashing with empty data', () => {
    const { toJSON } = render(
      <OverlayChart
        scope="month"
        startDate="2026-04-01"
        endDate="2026-04-30"
        weights={[]}
        calories={[]}
        bodyFat={[]}
        programs={[]}
        calorieGoal={2200}
      />,
    );
    expect(toJSON()).not.toBeNull();
  });

  it('renders with a single weight reading', () => {
    const { toJSON } = render(
      <OverlayChart
        scope="month"
        startDate="2026-04-01"
        endDate="2026-04-30"
        weights={[{ recordedDate: '2026-04-17', value: 177.4 }]}
        calories={[]}
        bodyFat={[]}
        programs={[]}
        calorieGoal={2200}
      />,
    );
    expect(toJSON()).not.toBeNull();
  });

  it('renders a month of data without crashing', () => {
    const weights = Array.from({ length: 30 }, (_, i) => ({
      recordedDate: `2026-04-${String(i + 1).padStart(2, '0')}`,
      value: 180 - i * 0.15,
    }));
    const calories = Array.from({ length: 30 }, (_, i) => ({
      recordedDate: `2026-04-${String(i + 1).padStart(2, '0')}`,
      total: 2000 + (i % 7) * 50,
    }));
    const { toJSON } = render(
      <OverlayChart
        scope="month"
        startDate="2026-04-01"
        endDate="2026-04-30"
        weights={weights}
        calories={calories}
        bodyFat={[]}
        programs={[]}
        calorieGoal={2200}
      />,
    );
    expect(toJSON()).not.toBeNull();
  });
});
