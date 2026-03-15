import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { MealListItem } from '../MealListItem';
import { Meal } from '../../types';

const sampleMeal: Meal = {
  id: 1,
  proteinGrams: 40,
  description: 'Chicken',
  mealType: 'lunch',
  loggedAt: '',
  localDate: '',
  createdAt: '',
};

describe('MealListItem', () => {
  it('renders meal type, description, and protein grams', () => {
    const { getByText } = render(
      <MealListItem meal={sampleMeal} onEdit={jest.fn()} onDelete={jest.fn()} />,
    );
    expect(getByText('Lunch:')).toBeTruthy();
    expect(getByText('Chicken')).toBeTruthy();
    expect(getByText('40g')).toBeTruthy();
  });

  it('calls onEdit when row tapped', () => {
    const mockEdit = jest.fn();
    const { getByText } = render(
      <MealListItem meal={sampleMeal} onEdit={mockEdit} onDelete={jest.fn()} />,
    );
    fireEvent.press(getByText('Chicken'));
    expect(mockEdit).toHaveBeenCalledWith(sampleMeal);
  });

  it('calls onDelete when delete area tapped', () => {
    const mockDelete = jest.fn();
    const { getByText } = render(
      <MealListItem meal={sampleMeal} onEdit={jest.fn()} onDelete={mockDelete} />,
    );
    fireEvent.press(getByText('Delete'));
    expect(mockDelete).toHaveBeenCalledWith(sampleMeal);
  });
});
