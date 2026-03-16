import React from 'react';
import { waitFor, fireEvent } from '@testing-library/react-native';
import { renderWithProviders } from '../../test-utils';
import { MealLibraryScreen } from '../MealLibraryScreen';
import { getLibraryMealsByType } from '../../db';

jest.mock('../../db', () => ({
  getLibraryMealsByType: jest.fn().mockResolvedValue({
    breakfast: [],
    lunch: [],
    dinner: [],
    snack: [],
  }),
  deleteLibraryMeal: jest.fn().mockResolvedValue(undefined),
  addMeal: jest.fn().mockResolvedValue(undefined),
  addLibraryMeal: jest.fn().mockResolvedValue(undefined),
  setProteinGoal: jest.fn(),
  getProteinGoal: jest.fn(),
  getTodayProteinTotal: jest.fn(),
  getMealsByDate: jest.fn(),
  get7DayAverage: jest.fn(),
  getRecentDistinctMeals: jest.fn(),
  getDailyProteinTotals: jest.fn(),
  updateMeal: jest.fn(),
  deleteMeal: jest.fn(),
}));

const mockGetLibraryMealsByType = getLibraryMealsByType as jest.Mock;

describe('MealLibraryScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetLibraryMealsByType.mockResolvedValue({
      breakfast: [],
      lunch: [],
      dinner: [],
      snack: [],
    });
  });

  it('renders Meal Library title', async () => {
    const { getByText } = renderWithProviders(<MealLibraryScreen />, {
      withSession: false,
      withTimer: false,
    });

    expect(getByText('Meal Library')).toBeTruthy();
  });

  it('shows empty state when no saved meals', async () => {
    mockGetLibraryMealsByType.mockResolvedValue({
      breakfast: [],
      lunch: [],
      dinner: [],
      snack: [],
    });

    const { getByText } = renderWithProviders(<MealLibraryScreen />, {
      withSession: false,
      withTimer: false,
    });

    await waitFor(() => {
      expect(getByText('No saved meals yet')).toBeTruthy();
    });

    expect(getByText('Add Meal')).toBeTruthy();
  });

  it('renders meal sections when data exists', async () => {
    mockGetLibraryMealsByType.mockResolvedValue({
      breakfast: [
        {
          id: 1,
          name: 'Eggs',
          proteinGrams: 18,
          mealType: 'breakfast',
          createdAt: '',
        },
      ],
      lunch: [],
      dinner: [],
      snack: [],
    });

    const { getByText } = renderWithProviders(<MealLibraryScreen />, {
      withSession: false,
      withTimer: false,
    });

    await waitFor(() => {
      expect(getByText('Eggs')).toBeTruthy();
    });

    expect(getByText('Breakfast')).toBeTruthy();
    expect(getByText('18g')).toBeTruthy();
  });

  it('opens add library meal modal when + pressed', async () => {
    const { getByText } = renderWithProviders(<MealLibraryScreen />, {
      withSession: false,
      withTimer: false,
    });

    await waitFor(() => {
      expect(getByText('No saved meals yet')).toBeTruthy();
    });

    fireEvent.press(getByText('+'));

    await waitFor(() => {
      expect(getByText('Add to Library')).toBeTruthy();
    });
  });
});
