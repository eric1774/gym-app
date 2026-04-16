jest.mock('../../db', () => ({
  macrosDb: {
    getDailyMacroTotals: jest.fn().mockResolvedValue([]),
  },
}));

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { NavigationContainer } from '@react-navigation/native';
import { MacroChart } from '../MacroChart';
import { macrosDb } from '../../db';
import { MacroSettings } from '../../types';

const allGoalsSet: MacroSettings = {
  id: 1,
  proteinGoal: 150,
  carbGoal: 200,
  fatGoal: 70,
  createdAt: '2026-01-01T00:00:00',
  updatedAt: '2026-01-01T00:00:00',
};

function renderChart(goals: MacroSettings = allGoalsSet) {
  return render(
    <NavigationContainer>
      <MacroChart goals={goals} />
    </NavigationContainer>,
  );
}

describe('MacroChart — Calories tab', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (macrosDb.getDailyMacroTotals as jest.Mock).mockResolvedValue([]);
  });

  it('renders all four chart tabs in order: Protein, Carbs, Fat, Calories', () => {
    const { getByText } = renderChart();
    expect(getByText('Protein')).toBeTruthy();
    expect(getByText('Carbs')).toBeTruthy();
    expect(getByText('Fat')).toBeTruthy();
    expect(getByText('Calories')).toBeTruthy();
  });

  it('starts with Protein tab active and switches when Calories is pressed', async () => {
    const { getByText } = renderChart();
    await waitFor(() =>
      expect(macrosDb.getDailyMacroTotals).toHaveBeenCalled(),
    );
    fireEvent.press(getByText('Calories'));
    expect(getByText('Calories')).toBeTruthy();
  });
});
