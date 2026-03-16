import React from 'react';
import { Alert } from 'react-native';
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

  it('logs a meal when tapped', async () => {
    const { addMeal } = require('../../db');
    mockGetLibraryMealsByType.mockResolvedValue({
      breakfast: [{ id: 1, name: 'Eggs', proteinGrams: 18, mealType: 'breakfast', createdAt: '' }],
      lunch: [],
      dinner: [],
      snack: [],
    });

    const { getByText } = renderWithProviders(<MealLibraryScreen />, {
      withSession: false,
      withTimer: false,
    });

    await waitFor(() => getByText('Eggs'));
    fireEvent.press(getByText('Eggs'));

    await waitFor(() => expect(addMeal).toHaveBeenCalledWith(18, 'Eggs', 'breakfast'));
  });

  it('shows delete confirmation when Delete is pressed', async () => {
    const alertSpy = jest.spyOn(Alert, 'alert');
    mockGetLibraryMealsByType.mockResolvedValue({
      breakfast: [{ id: 1, name: 'Eggs', proteinGrams: 18, mealType: 'breakfast', createdAt: '' }],
      lunch: [],
      dinner: [],
      snack: [],
    });

    const { getByText } = renderWithProviders(<MealLibraryScreen />, {
      withSession: false,
      withTimer: false,
    });

    await waitFor(() => getByText('Eggs'));
    fireEvent.press(getByText('Delete'));

    expect(alertSpy).toHaveBeenCalledWith(
      'Delete Library Meal',
      expect.stringContaining('Eggs'),
      expect.any(Array),
    );
    alertSpy.mockRestore();
  });

  it('deletes a meal when Delete confirmed in alert', async () => {
    const { deleteLibraryMeal } = require('../../db');
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(
      (_title, _msg, buttons) => {
        const deleteBtn = (buttons as any[])?.find(b => b.text === 'Delete');
        deleteBtn?.onPress?.();
      },
    );
    mockGetLibraryMealsByType.mockResolvedValue({
      breakfast: [{ id: 1, name: 'Eggs', proteinGrams: 18, mealType: 'breakfast', createdAt: '' }],
      lunch: [],
      dinner: [],
      snack: [],
    });

    const { getByText } = renderWithProviders(<MealLibraryScreen />, {
      withSession: false,
      withTimer: false,
    });

    await waitFor(() => getByText('Eggs'));
    fireEvent.press(getByText('Delete'));

    await waitFor(() => expect(deleteLibraryMeal).toHaveBeenCalledWith(1));
    alertSpy.mockRestore();
  });

  it('shows toast message after logging a meal', async () => {
    mockGetLibraryMealsByType.mockResolvedValue({
      lunch: [{ id: 2, name: 'Chicken', proteinGrams: 35, mealType: 'lunch', createdAt: '' }],
      breakfast: [],
      dinner: [],
      snack: [],
    });

    const { getByText } = renderWithProviders(<MealLibraryScreen />, {
      withSession: false,
      withTimer: false,
    });

    await waitFor(() => getByText('Chicken'));
    fireEvent.press(getByText('Chicken'));

    await waitFor(() => expect(getByText('Chicken 35g logged')).toBeTruthy());
  });
});
