jest.mock('../../db', () => ({
  getProteinGoal: jest.fn().mockResolvedValue(null),
  getTodayProteinTotal: jest.fn().mockResolvedValue(0),
  getMealsByDate: jest.fn().mockResolvedValue([]),
  deleteMeal: jest.fn().mockResolvedValue(undefined),
  addMeal: jest.fn().mockResolvedValue(undefined),
  updateMeal: jest.fn().mockResolvedValue(undefined),
  get7DayAverage: jest.fn().mockResolvedValue(null),
  getRecentDistinctMeals: jest.fn().mockResolvedValue([]),
  getDailyProteinTotals: jest.fn().mockResolvedValue([]),
  setProteinGoal: jest.fn().mockResolvedValue({ id: 1, dailyGoalGrams: 200, createdAt: '', updatedAt: '' }),
  getLibraryMealsByType: jest.fn().mockResolvedValue({ breakfast: [], lunch: [], dinner: [], snack: [] }),
  addLibraryMeal: jest.fn().mockResolvedValue(undefined),
  deleteLibraryMeal: jest.fn().mockResolvedValue(undefined),
}));
jest.mock('../../utils/dates', () => ({
  getLocalDateString: jest.fn().mockReturnValue('2025-06-15'),
  getLocalDateTimeString: jest.fn().mockReturnValue('2025-06-15T12:00:00'),
}));

import React from 'react';
import { waitFor, fireEvent } from '@testing-library/react-native';
import { renderWithProviders } from '../../test-utils';
import { ProteinScreen } from '../ProteinScreen';
import { getProteinGoal, getTodayProteinTotal, getMealsByDate } from '../../db';

describe('ProteinScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (getProteinGoal as jest.Mock).mockResolvedValue(null);
    (getTodayProteinTotal as jest.Mock).mockResolvedValue(0);
    (getMealsByDate as jest.Mock).mockResolvedValue([]);
  });

  it('renders Protein title and GoalSetupForm when no goal set', async () => {
    (getProteinGoal as jest.Mock).mockResolvedValue(null);
    const { getByText } = renderWithProviders(<ProteinScreen />, { withSession: false, withTimer: false });
    await waitFor(() => getByText('Protein'));
    expect(getByText('Set your daily goal')).toBeTruthy();
  });

  it('renders progress bar when goal exists', async () => {
    (getProteinGoal as jest.Mock).mockResolvedValue(200);
    (getTodayProteinTotal as jest.Mock).mockResolvedValue(100);
    const { getByText } = renderWithProviders(<ProteinScreen />, { withSession: false, withTimer: false });
    await waitFor(() => getByText('50%'));
    expect(getByText('50%')).toBeTruthy();
    expect(getByText('Meal Library')).toBeTruthy();
  });

  it('shows empty meal list message', async () => {
    (getProteinGoal as jest.Mock).mockResolvedValue(200);
    (getMealsByDate as jest.Mock).mockResolvedValue([]);
    const { getByText } = renderWithProviders(<ProteinScreen />, { withSession: false, withTimer: false });
    await waitFor(() => getByText(/No meals logged/));
    expect(getByText(/No meals logged/)).toBeTruthy();
  });

  it('renders meal list items when meals exist', async () => {
    (getProteinGoal as jest.Mock).mockResolvedValue(200);
    (getMealsByDate as jest.Mock).mockResolvedValue([
      {
        id: 1,
        proteinGrams: 40,
        description: 'Chicken',
        mealType: 'lunch',
        loggedAt: '2025-06-15T12:00:00',
        localDate: '2025-06-15',
        createdAt: '2025-06-15T12:00:00',
      },
    ]);
    const { getByText } = renderWithProviders(<ProteinScreen />, { withSession: false, withTimer: false });
    await waitFor(() => getByText('Chicken'));
    expect(getByText('Chicken')).toBeTruthy();
  });

  it('opens add meal modal when FAB pressed', async () => {
    (getProteinGoal as jest.Mock).mockResolvedValue(200);
    const { getByText, getAllByText } = renderWithProviders(<ProteinScreen />, { withSession: false, withTimer: false });
    await waitFor(() => getByText('Protein'));
    fireEvent.press(getByText('+'));
    await waitFor(() => getAllByText('Add Meal'));
    expect(getAllByText('Add Meal').length).toBeGreaterThan(0);
  });
});
