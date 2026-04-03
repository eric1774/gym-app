import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { AddLibraryMealModal } from '../AddLibraryMealModal';

const mockAddLibraryMeal = jest.fn().mockResolvedValue(undefined);

jest.mock('../../db', () => ({
  macrosDb: {
    addLibraryMeal: (...args: unknown[]) => mockAddLibraryMeal(...args),
  },
}));

jest.mock('../../utils/macros', () => ({
  computeCalories: jest.fn().mockReturnValue(0),
}));

describe('AddLibraryMealModal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAddLibraryMeal.mockResolvedValue(undefined);
  });

  it('renders Add to Library title when visible', () => {
    const { getByText } = render(
      <AddLibraryMealModal visible={true} onClose={jest.fn()} onSaved={jest.fn()} />,
    );

    expect(getByText('Add to Library')).toBeTruthy();
  });

  it('submit is disabled when fields are empty', () => {
    const onSaved = jest.fn();

    const { getByText } = render(
      <AddLibraryMealModal visible={true} onClose={jest.fn()} onSaved={onSaved} />,
    );

    fireEvent.press(getByText('Save to Library'));

    expect(mockAddLibraryMeal).not.toHaveBeenCalled();
    expect(onSaved).not.toHaveBeenCalled();
  });

  it('submit is disabled when meal type not selected', () => {
    const onSaved = jest.fn();

    const { getAllByPlaceholderText, getByPlaceholderText, getByText } = render(
      <AddLibraryMealModal visible={true} onClose={jest.fn()} onSaved={onSaved} />,
    );

    // Fill protein (first '0' placeholder) and name but leave meal type unselected
    const zeroInputs = getAllByPlaceholderText('0');
    fireEvent.changeText(zeroInputs[0], '25');
    fireEvent.changeText(getByPlaceholderText('e.g. Chicken breast'), 'Chicken');

    fireEvent.press(getByText('Save to Library'));

    expect(mockAddLibraryMeal).not.toHaveBeenCalled();
  });

  it('calls macrosDb.addLibraryMeal and onSaved when form is valid', async () => {
    const onSaved = jest.fn();

    const { getByText, getAllByPlaceholderText, getByPlaceholderText } = render(
      <AddLibraryMealModal visible={true} onClose={jest.fn()} onSaved={onSaved} />,
    );

    // Select meal type
    fireEvent.press(getByText('Lunch'));
    // Fill protein (first '0' input)
    const zeroInputs = getAllByPlaceholderText('0');
    fireEvent.changeText(zeroInputs[0], '25');
    // Fill name
    fireEvent.changeText(getByPlaceholderText('e.g. Chicken breast'), 'Chicken');
    // Submit
    fireEvent.press(getByText('Save to Library'));

    await waitFor(() => {
      expect(mockAddLibraryMeal).toHaveBeenCalledWith(
        'Chicken',
        'lunch',
        { protein: 25, carbs: 0, fat: 0 },
      );
    });

    expect(onSaved).toHaveBeenCalled();
  });
});
