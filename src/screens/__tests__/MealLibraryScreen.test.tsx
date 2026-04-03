import React from 'react';
import { Alert } from 'react-native';
import { waitFor, fireEvent } from '@testing-library/react-native';
import { renderWithProviders } from '../../test-utils';
import { MealLibraryScreen } from '../MealLibraryScreen';

const mockGetLibraryMealsByType = jest.fn().mockResolvedValue({
  breakfast: [],
  lunch: [],
  dinner: [],
  snack: [],
});
const mockDeleteLibraryMeal = jest.fn().mockResolvedValue(undefined);
const mockAddMeal = jest.fn().mockResolvedValue(undefined);
const mockAddLibraryMeal = jest.fn().mockResolvedValue(undefined);

jest.mock('../../db', () => ({
  macrosDb: {
    getLibraryMealsByType: (...args: unknown[]) => mockGetLibraryMealsByType(...args),
    deleteLibraryMeal: (...args: unknown[]) => mockDeleteLibraryMeal(...args),
    addMeal: (...args: unknown[]) => mockAddMeal(...args),
    addLibraryMeal: (...args: unknown[]) => mockAddLibraryMeal(...args),
  },
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

jest.mock('../../utils/macros', () => ({
  computeCalories: jest.fn().mockReturnValue(0),
}));

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
          protein: 18,
          carbs: 0,
          fat: 12,
          calories: 180,
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
    // Macro pills show instead of single protein number
    expect(getByText('18g P')).toBeTruthy();
    expect(getByText('12g F')).toBeTruthy();
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
    mockGetLibraryMealsByType.mockResolvedValue({
      breakfast: [{ id: 1, name: 'Eggs', protein: 18, carbs: 0, fat: 12, calories: 180, mealType: 'breakfast', createdAt: '' }],
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

    await waitFor(() => expect(mockAddMeal).toHaveBeenCalledWith(
      'Eggs',
      'breakfast',
      { protein: 18, carbs: 0, fat: 12 },
    ));
  });

  it('shows delete confirmation when Delete is pressed', async () => {
    const alertSpy = jest.spyOn(Alert, 'alert');
    mockGetLibraryMealsByType.mockResolvedValue({
      breakfast: [{ id: 1, name: 'Eggs', protein: 18, carbs: 0, fat: 12, calories: 180, mealType: 'breakfast', createdAt: '' }],
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
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(
      (_title, _msg, buttons) => {
        const deleteBtn = (buttons as any[])?.find(b => b.text === 'Delete');
        deleteBtn?.onPress?.();
      },
    );
    mockGetLibraryMealsByType.mockResolvedValue({
      breakfast: [{ id: 1, name: 'Eggs', protein: 18, carbs: 0, fat: 12, calories: 180, mealType: 'breakfast', createdAt: '' }],
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

    await waitFor(() => expect(mockDeleteLibraryMeal).toHaveBeenCalledWith(1));
    alertSpy.mockRestore();
  });

  it('shows toast message after logging a meal', async () => {
    mockGetLibraryMealsByType.mockResolvedValue({
      lunch: [{ id: 2, name: 'Chicken', protein: 35, carbs: 0, fat: 0, calories: 140, mealType: 'lunch', createdAt: '' }],
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

    await waitFor(() => expect(getByText('Logged: Chicken')).toBeTruthy());
  });
});
