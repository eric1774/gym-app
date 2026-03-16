import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { AddMealModal } from '../AddMealModal';
import { addMeal } from '../../db';

jest.mock('../../db', () => ({
  addMeal: jest.fn().mockResolvedValue(undefined),
  updateMeal: jest.fn().mockResolvedValue(undefined),
}));

const mockAddMeal = addMeal as jest.Mock;

describe('AddMealModal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAddMeal.mockResolvedValue(undefined);
  });

  it('renders Add Meal title when visible', () => {
    const { getAllByText } = render(
      <AddMealModal visible={true} onClose={jest.fn()} onSaved={jest.fn()} />,
    );

    // Title and button both say 'Add Meal'
    const elements = getAllByText('Add Meal');
    expect(elements.length).toBeGreaterThanOrEqual(1);
  });

  it('submit button is disabled when protein is empty and meal type not selected', () => {
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

    const { getByPlaceholderText, getAllByText } = render(
      <AddMealModal visible={true} onClose={jest.fn()} onSaved={onSaved} />,
    );

    // Fill protein but leave meal type unselected
    fireEvent.changeText(getByPlaceholderText('0'), '30');

    const buttons = getAllByText('Add Meal');
    fireEvent.press(buttons[buttons.length - 1]);

    expect(mockAddMeal).not.toHaveBeenCalled();
  });

  it('calls addMeal and onSaved when form is valid', async () => {
    const onSaved = jest.fn();

    const { getByText, getByPlaceholderText, getAllByText } = render(
      <AddMealModal visible={true} onClose={jest.fn()} onSaved={onSaved} />,
    );

    // Select meal type
    fireEvent.press(getByText('Lunch'));
    // Fill protein grams
    fireEvent.changeText(getByPlaceholderText('0'), '30');
    // Press submit button (last occurrence)
    const buttons = getAllByText('Add Meal');
    fireEvent.press(buttons[buttons.length - 1]);

    await waitFor(() => {
      expect(mockAddMeal).toHaveBeenCalledWith(30, '', 'lunch', expect.any(Date));
    });

    expect(onSaved).toHaveBeenCalled();
  });
});
