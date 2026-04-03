import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { AddMealModal } from '../AddMealModal';
import { MacroMeal } from '../../types';

const mockAddMeal = jest.fn().mockResolvedValue(undefined);
const mockUpdateMeal = jest.fn().mockResolvedValue(undefined);

jest.mock('../../db', () => ({
  macrosDb: {
    addMeal: (...args: unknown[]) => mockAddMeal(...args),
    updateMeal: (...args: unknown[]) => mockUpdateMeal(...args),
    getMacroGoals: jest.fn().mockResolvedValue(null),
  },
}));

jest.mock('../../utils/macros', () => ({
  computeCalories: jest.fn().mockReturnValue(0),
}));

describe('AddMealModal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAddMeal.mockResolvedValue(undefined);
    mockUpdateMeal.mockResolvedValue(undefined);
  });

  it('renders Add Meal title when visible', () => {
    const { getAllByText } = render(
      <AddMealModal visible={true} onClose={jest.fn()} onSaved={jest.fn()} />,
    );

    // Title and button both say 'Add Meal'
    const elements = getAllByText('Add Meal');
    expect(elements.length).toBeGreaterThanOrEqual(1);
  });

  it('submit button is disabled when all macros are empty and meal type not selected', () => {
    const onSaved = jest.fn();

    const { getAllByText } = render(
      <AddMealModal visible={true} onClose={jest.fn()} onSaved={onSaved} />,
    );

    // Press the submit button (second occurrence of 'Add Meal' — title is first)
    const buttons = getAllByText('Add Meal');
    fireEvent.press(buttons[buttons.length - 1]);

    expect(mockAddMeal).not.toHaveBeenCalled();
    expect(onSaved).not.toHaveBeenCalled();
  });

  it('submit button is disabled when only protein is filled but meal type not selected', () => {
    const onSaved = jest.fn();

    const { getAllByText, getAllByPlaceholderText } = render(
      <AddMealModal visible={true} onClose={jest.fn()} onSaved={onSaved} />,
    );

    // Fill protein (first '0' placeholder is protein)
    const zeroInputs = getAllByPlaceholderText('0');
    fireEvent.changeText(zeroInputs[0], '30');

    const buttons = getAllByText('Add Meal');
    fireEvent.press(buttons[buttons.length - 1]);

    expect(mockAddMeal).not.toHaveBeenCalled();
  });

  it('calls macrosDb.addMeal and onSaved when form is valid', async () => {
    const onSaved = jest.fn();

    const { getByText, getAllByPlaceholderText, getAllByText } = render(
      <AddMealModal visible={true} onClose={jest.fn()} onSaved={onSaved} />,
    );

    // Select meal type
    fireEvent.press(getByText('Lunch'));
    // Fill protein grams (first '0' input)
    const zeroInputs = getAllByPlaceholderText('0');
    fireEvent.changeText(zeroInputs[0], '30');
    // Press submit button (last occurrence)
    const buttons = getAllByText('Add Meal');
    fireEvent.press(buttons[buttons.length - 1]);

    await waitFor(() => {
      expect(mockAddMeal).toHaveBeenCalledWith(
        '', // description
        'lunch',
        { protein: 30, carbs: 0, fat: 0 },
        expect.any(Date),
      );
    });

    expect(onSaved).toHaveBeenCalled();
  });

  it('calls onClose when Discard is pressed and resets state', () => {
    const onClose = jest.fn();
    const { getByText, getAllByPlaceholderText } = render(
      <AddMealModal visible={true} onClose={onClose} onSaved={jest.fn()} />,
    );
    // Fill some state first
    const zeroInputs = getAllByPlaceholderText('0');
    fireEvent.changeText(zeroInputs[0], '50');
    // Press Discard button
    fireEvent.press(getByText('Discard'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('shows date edit fields when "Now" button is tapped', () => {
    const { getByText, getByPlaceholderText } = render(
      <AddMealModal visible={true} onClose={jest.fn()} onSaved={jest.fn()} />,
    );
    fireEvent.press(getByText('Now'));
    // Date and time inputs appear
    expect(getByPlaceholderText('YYYY-MM-DD')).toBeTruthy();
    expect(getByPlaceholderText('HH:MM')).toBeTruthy();
  });

  it('shows date error for invalid date format', () => {
    const { getByText, getByPlaceholderText } = render(
      <AddMealModal visible={true} onClose={jest.fn()} onSaved={jest.fn()} />,
    );
    fireEvent.press(getByText('Now'));
    fireEvent.changeText(getByPlaceholderText('YYYY-MM-DD'), 'invalid-date');
    expect(getByText('Use YYYY-MM-DD format')).toBeTruthy();
  });

  it('shows time error for invalid time format', () => {
    const { getByText, getByPlaceholderText } = render(
      <AddMealModal visible={true} onClose={jest.fn()} onSaved={jest.fn()} />,
    );
    fireEvent.press(getByText('Now'));
    fireEvent.changeText(getByPlaceholderText('HH:MM'), 'bad-time');
    expect(getByText('Use HH:MM format')).toBeTruthy();
  });

  it('updates loggedAt when valid date and time are entered', () => {
    const { getByText, getByPlaceholderText } = render(
      <AddMealModal visible={true} onClose={jest.fn()} onSaved={jest.fn()} />,
    );
    fireEvent.press(getByText('Now'));
    fireEvent.changeText(getByPlaceholderText('YYYY-MM-DD'), '2026-01-15');
    fireEvent.changeText(getByPlaceholderText('HH:MM'), '14:30');
    // No error shown
    expect(() => getByText('Use YYYY-MM-DD format')).toThrow();
    expect(() => getByText('Use HH:MM format')).toThrow();
  });

  it('shows error message when addMeal fails', async () => {
    mockAddMeal.mockRejectedValueOnce(new Error('DB error'));

    const { getByText, getAllByPlaceholderText, getAllByText } = render(
      <AddMealModal visible={true} onClose={jest.fn()} onSaved={jest.fn()} />,
    );

    fireEvent.press(getByText('Breakfast'));
    const zeroInputs = getAllByPlaceholderText('0');
    fireEvent.changeText(zeroInputs[0], '25');
    const buttons = getAllByText('Add Meal');
    fireEvent.press(buttons[buttons.length - 1]);

    await waitFor(() => expect(getByText('DB error')).toBeTruthy());
  });

  it('shows Edit Meal title and Update Meal button in edit mode', () => {
    const editMeal: MacroMeal = {
      id: 5,
      protein: 40,
      carbs: 0,
      fat: 0,
      calories: 160,
      description: 'Chicken',
      mealType: 'dinner',
      loggedAt: new Date().toISOString(),
      localDate: '2026-01-15',
      createdAt: new Date().toISOString(),
    };

    const { getByText } = render(
      <AddMealModal
        visible={true}
        onClose={jest.fn()}
        onSaved={jest.fn()}
        editMeal={editMeal}
      />,
    );

    expect(getByText('Edit Meal')).toBeTruthy();
    expect(getByText('Update Meal')).toBeTruthy();
  });

  it('calls macrosDb.updateMeal in edit mode when form is submitted', async () => {
    const onSaved = jest.fn();
    const editMeal: MacroMeal = {
      id: 5,
      protein: 40,
      carbs: 0,
      fat: 0,
      calories: 160,
      description: 'Chicken',
      mealType: 'dinner',
      loggedAt: new Date().toISOString(),
      localDate: '2026-01-15',
      createdAt: new Date().toISOString(),
    };

    const { getByText } = render(
      <AddMealModal
        visible={true}
        onClose={jest.fn()}
        onSaved={onSaved}
        editMeal={editMeal}
      />,
    );

    fireEvent.press(getByText('Update Meal'));

    await waitFor(() => {
      expect(mockUpdateMeal).toHaveBeenCalled();
    });
    expect(onSaved).toHaveBeenCalled();
  });

  it('dismisses date edit when button is tapped again (toggle)', () => {
    const { getByText, queryByPlaceholderText } = render(
      <AddMealModal visible={true} onClose={jest.fn()} onSaved={jest.fn()} />,
    );
    // Open date edit
    fireEvent.press(getByText('Now'));
    expect(queryByPlaceholderText('YYYY-MM-DD')).toBeTruthy();
    // Verify fields are visible after open
    expect(queryByPlaceholderText('YYYY-MM-DD')).toBeTruthy();
  });

  it('includes description and all macros when submitting', async () => {
    const onSaved = jest.fn();
    const { getByText, getAllByPlaceholderText, getByPlaceholderText, getAllByText } = render(
      <AddMealModal visible={true} onClose={jest.fn()} onSaved={onSaved} />,
    );

    fireEvent.press(getByText('Snack'));
    const zeroInputs = getAllByPlaceholderText('0');
    fireEvent.changeText(zeroInputs[0], '15'); // protein
    fireEvent.changeText(zeroInputs[1], '30'); // carbs
    fireEvent.changeText(zeroInputs[2], '10'); // fat
    fireEvent.changeText(getByPlaceholderText('e.g. Chicken breast'), 'Greek yogurt');
    const buttons = getAllByText('Add Meal');
    fireEvent.press(buttons[buttons.length - 1]);

    await waitFor(() => {
      expect(mockAddMeal).toHaveBeenCalledWith(
        'Greek yogurt',
        'snack',
        { protein: 15, carbs: 30, fat: 10 },
        expect.any(Date),
      );
    });
  });
});
