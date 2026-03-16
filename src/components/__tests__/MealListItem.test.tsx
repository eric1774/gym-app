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

  it('renders without description when description is empty', () => {
    const noDescMeal = { ...sampleMeal, description: '' };
    const { getByText, queryByText } = render(
      <MealListItem meal={noDescMeal} onEdit={jest.fn()} onDelete={jest.fn()} />,
    );
    expect(getByText('Lunch:')).toBeTruthy();
    expect(getByText('40g')).toBeTruthy();
  });

  it('renders with isLast=true (no border)', () => {
    const { getByText } = render(
      <MealListItem meal={sampleMeal} onEdit={jest.fn()} onDelete={jest.fn()} isLast={true} />,
    );
    expect(getByText('Chicken')).toBeTruthy();
  });

  it('calls onEdit when row is tapped', () => {
    const mockEdit = jest.fn();
    const { getByText } = render(
      <MealListItem meal={sampleMeal} onEdit={mockEdit} onDelete={jest.fn()} />,
    );
    // Press the protein grams text to trigger onEdit
    fireEvent.press(getByText('40g'));
    expect(mockEdit).toHaveBeenCalledWith(sampleMeal);
  });
});
