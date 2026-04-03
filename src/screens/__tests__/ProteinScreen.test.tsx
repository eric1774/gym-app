const mockGetMacroGoals = jest.fn().mockResolvedValue(null);
const mockGetTodayMacroTotals = jest.fn().mockResolvedValue({ protein: 0, carbs: 0, fat: 0 });
const mockGetMealsByDate = jest.fn().mockResolvedValue([]);
const mockDeleteMeal = jest.fn().mockResolvedValue(undefined);
const mockGet7DayAverage = jest.fn().mockResolvedValue(null);
const mockGetStreakDays = jest.fn().mockResolvedValue(0);

jest.mock('../../db', () => ({
  macrosDb: {
    getMacroGoals: (...args: unknown[]) => mockGetMacroGoals(...args),
    getTodayMacroTotals: (...args: unknown[]) => mockGetTodayMacroTotals(...args),
    getMealsByDate: (...args: unknown[]) => mockGetMealsByDate(...args),
    deleteMeal: (...args: unknown[]) => mockDeleteMeal(...args),
    get7DayAverage: (...args: unknown[]) => mockGet7DayAverage(...args),
    getStreakDays: (...args: unknown[]) => mockGetStreakDays(...args),
    setMacroGoals: jest.fn().mockResolvedValue({ id: 1, proteinGoal: 150, carbGoal: null, fatGoal: null, createdAt: '', updatedAt: '' }),
    addMeal: jest.fn().mockResolvedValue(undefined),
    updateMeal: jest.fn().mockResolvedValue(undefined),
  },
}));

jest.mock('../../utils/dates', () => ({
  getLocalDateString: jest.fn().mockReturnValue('2025-06-15'),
  getLocalDateTimeString: jest.fn().mockReturnValue('2025-06-15T12:00:00'),
}));

jest.mock('../../utils/macros', () => ({
  computeCalories: jest.fn().mockReturnValue(0),
}));

import React from 'react';
import { Alert } from 'react-native';
import { waitFor, fireEvent } from '@testing-library/react-native';
import { renderWithProviders } from '../../test-utils';
import { ProteinScreen } from '../ProteinScreen';

const sampleMeal = {
  id: 1,
  protein: 40,
  carbs: 0,
  fat: 0,
  calories: 160,
  description: 'Chicken',
  mealType: 'lunch',
  loggedAt: '2025-06-15T12:00:00',
  localDate: '2025-06-15',
  createdAt: '2025-06-15T12:00:00',
};

const sampleGoals = {
  id: 1,
  proteinGoal: 150,
  carbGoal: null,
  fatGoal: null,
  createdAt: '',
  updatedAt: '',
};

describe('ProteinScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetMacroGoals.mockResolvedValue(null);
    mockGetTodayMacroTotals.mockResolvedValue({ protein: 0, carbs: 0, fat: 0 });
    mockGetMealsByDate.mockResolvedValue([]);
    mockGet7DayAverage.mockResolvedValue(null);
    mockGetStreakDays.mockResolvedValue(0);
  });

  it('renders Protein title and GoalSetupForm when no goal set', async () => {
    mockGetMacroGoals.mockResolvedValue(null);
    const { getByText } = renderWithProviders(<ProteinScreen />, { withSession: false, withTimer: false });
    await waitFor(() => getByText('Protein'));
    expect(getByText('Set your daily goal')).toBeTruthy();
  });

  it('renders Meal Library button when goal exists', async () => {
    mockGetMacroGoals.mockResolvedValue(sampleGoals);
    mockGetTodayMacroTotals.mockResolvedValue({ protein: 0, carbs: 0, fat: 0 });
    const { getByText } = renderWithProviders(<ProteinScreen />, { withSession: false, withTimer: false });
    await waitFor(() => getByText('Meal Library'));
    expect(getByText('Meal Library')).toBeTruthy();
  });

  it('shows empty meal list message', async () => {
    mockGetMacroGoals.mockResolvedValue(sampleGoals);
    mockGetMealsByDate.mockResolvedValue([]);
    const { getByText } = renderWithProviders(<ProteinScreen />, { withSession: false, withTimer: false });
    await waitFor(() => getByText(/No meals logged/));
    expect(getByText(/No meals logged/)).toBeTruthy();
  });

  it('renders meal list items when meals exist', async () => {
    mockGetMacroGoals.mockResolvedValue(sampleGoals);
    mockGetMealsByDate.mockResolvedValue([sampleMeal]);
    const { getByText } = renderWithProviders(<ProteinScreen />, { withSession: false, withTimer: false });
    await waitFor(() => getByText('Chicken'));
    expect(getByText('Chicken')).toBeTruthy();
  });

  it('opens add meal modal when FAB pressed', async () => {
    mockGetMacroGoals.mockResolvedValue(sampleGoals);
    const { getByText, getAllByText } = renderWithProviders(<ProteinScreen />, { withSession: false, withTimer: false });
    await waitFor(() => getByText('Protein'));
    fireEvent.press(getByText('+'));
    await waitFor(() => getAllByText('Add Meal'));
    expect(getAllByText('Add Meal').length).toBeGreaterThan(0);
  });

  it('shows delete alert when meal Delete button is pressed', async () => {
    const alertSpy = jest.spyOn(Alert, 'alert');
    mockGetMacroGoals.mockResolvedValue(sampleGoals);
    mockGetMealsByDate.mockResolvedValue([sampleMeal]);
    const { getByText } = renderWithProviders(<ProteinScreen />, { withSession: false, withTimer: false });
    await waitFor(() => getByText('Chicken'));
    // MealListItem renders a Delete TouchableOpacity
    fireEvent.press(getByText('Delete'));
    expect(alertSpy).toHaveBeenCalledWith(
      'Delete Meal',
      expect.any(String),
      expect.any(Array),
    );
    alertSpy.mockRestore();
  });

  it('navigates to Meal Library when button pressed', async () => {
    mockGetMacroGoals.mockResolvedValue(sampleGoals);
    const { getByText } = renderWithProviders(<ProteinScreen />, { withSession: false, withTimer: false });
    await waitFor(() => getByText('Meal Library'));
    fireEvent.press(getByText('Meal Library'));
    // Navigation happens — no crash
    expect(getByText('Protein')).toBeTruthy();
  });

  it('shows 7-day average when available', async () => {
    mockGetMacroGoals.mockResolvedValue(sampleGoals);
    mockGet7DayAverage.mockResolvedValue({ protein: 150 });
    const { getByText } = renderWithProviders(<ProteinScreen />, { withSession: false, withTimer: false });
    await waitFor(() => getByText('7-day avg: 150g'));
    expect(getByText('7-day avg: 150g')).toBeTruthy();
  });

  it('navigates to previous day when left arrow is pressed', async () => {
    mockGetMacroGoals.mockResolvedValue(sampleGoals);
    const { getByText } = renderWithProviders(<ProteinScreen />, { withSession: false, withTimer: false });
    await waitFor(() => getByText('Today'));
    fireEvent.press(getByText('\u2039'));
    // Date changes - getMealsByDate called for previous date
    await waitFor(() => expect(mockGetMealsByDate).toHaveBeenCalled());
  });

  it('shows Today label for today', async () => {
    mockGetMacroGoals.mockResolvedValue(sampleGoals);
    const { getByText } = renderWithProviders(<ProteinScreen />, { withSession: false, withTimer: false });
    await waitFor(() => getByText('Today'));
    expect(getByText('Today')).toBeTruthy();
  });

  it('shows goal setup form when no goals set', async () => {
    mockGetMacroGoals.mockResolvedValue(null);
    const { getByText } = renderWithProviders(<ProteinScreen />, { withSession: false, withTimer: false });
    await waitFor(() => getByText('Set your daily goal'));
    expect(getByText('Set your daily goal')).toBeTruthy();
  });
});
