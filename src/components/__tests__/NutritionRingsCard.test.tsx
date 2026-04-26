import React from 'react';
import { render } from '@testing-library/react-native';
import { NutritionRingsView } from '../NutritionRingsCard';

describe('NutritionRingsView', () => {
  const base = {
    protein: { current: 124, goal: 180 },
    carbs:   { current: 108, goal: 250 },
    fat:     { current: 54,  goal: 75  },
    water:   { current: 32,  goal: 80  },
    onRingPress: jest.fn(),
  };

  it('shows "Xg left" when under goal for macros', () => {
    const { getByText } = render(<NutritionRingsView {...base} />);
    expect(getByText('56g left')).toBeTruthy();    // 180 − 124
    expect(getByText('142g left')).toBeTruthy();   // 250 − 108
    expect(getByText('21g left')).toBeTruthy();    // 75 − 54
  });

  it('shows "Xoz left" for water', () => {
    const { getByText } = render(<NutritionRingsView {...base} />);
    expect(getByText('48oz left')).toBeTruthy();
  });

  it('shows "Goal hit ✓" when current exactly equals goal', () => {
    const { getByText } = render(
      <NutritionRingsView {...base} protein={{ current: 180, goal: 180 }} />,
    );
    expect(getByText('Goal hit ✓')).toBeTruthy();
  });

  it('shows "Xg over" when current exceeds goal', () => {
    const { getByText } = render(
      <NutritionRingsView {...base} protein={{ current: 200, goal: 180 }} />,
    );
    expect(getByText('20g over')).toBeTruthy();
  });

  it('renders total kcal in the header', () => {
    // 124 protein × 4 + 108 carbs × 4 + 54 fat × 9 = 496 + 432 + 486 = 1414
    // goal = 180×4 + 250×4 + 75×9 = 720 + 1000 + 675 = 2395
    const { getByText } = render(<NutritionRingsView {...base} />);
    expect(getByText(/1,414/)).toBeTruthy();
    expect(getByText(/2,395/)).toBeTruthy();
    expect(getByText(/kcal/)).toBeTruthy();
  });

  it('shows "Set goal" link when goal is null', () => {
    const { getByText } = render(
      <NutritionRingsView {...base} protein={{ current: 0, goal: null }} />,
    );
    expect(getByText('Set goal')).toBeTruthy();
  });
});
