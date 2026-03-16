import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { AddLibraryMealModal } from '../AddLibraryMealModal';
import { addLibraryMeal } from '../../db';

jest.mock('../../db', () => ({
  addLibraryMeal: jest.fn().mockResolvedValue(undefined),
}));

const mockAddLibraryMeal = addLibraryMeal as jest.Mock;

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

    const { getByPlaceholderText, getByText } = render(
      <AddLibraryMealModal visible={true} onClose={jest.fn()} onSaved={onSaved} />,
    );

    // Fill protein and name but leave meal type unselected
    fireEvent.changeText(getByPlaceholderText('0'), '25');
    fireEvent.changeText(getByPlaceholderText('e.g. Chicken breast'), 'Chicken');

    fireEvent.press(getByText('Save to Library'));

    expect(mockAddLibraryMeal).not.toHaveBeenCalled();
  });

  it('calls addLibraryMeal and onSaved when form is valid', async () => {
    const onSaved = jest.fn();

    const { getByText, getByPlaceholderText } = render(
      <AddLibraryMealModal visible={true} onClose={jest.fn()} onSaved={onSaved} />,
    );

    // Select meal type
    fireEvent.press(getByText('Lunch'));
    // Fill protein
    fireEvent.changeText(getByPlaceholderText('0'), '25');
    // Fill name
    fireEvent.changeText(getByPlaceholderText('e.g. Chicken breast'), 'Chicken');
    // Submit
    fireEvent.press(getByText('Save to Library'));

    await waitFor(() => {
      expect(mockAddLibraryMeal).toHaveBeenCalledWith('Chicken', 25, 'lunch');
    });

    expect(onSaved).toHaveBeenCalled();
  });
});
