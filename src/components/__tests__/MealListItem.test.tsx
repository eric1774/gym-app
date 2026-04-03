import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { MealListItem } from '../MealListItem';
import { MacroMeal } from '../../types';

const sampleMeal: MacroMeal = {
  id: 1,
  protein: 40,
  carbs: 0,
  fat: 0,
  calories: 160,
  description: 'Chicken',
  mealType: 'lunch',
  loggedAt: '',
  localDate: '',
  createdAt: '',
};

describe('MealListItem', () => {
  it('renders meal type and description', () => {
    const { getByText } = render(
      <MealListItem meal={sampleMeal} onEdit={jest.fn()} onDelete={jest.fn()} />,
    );
    expect(getByText('Lunch:')).toBeTruthy();
    expect(getByText('Chicken')).toBeTruthy();
  });

  it('renders protein macro pill when protein > 0', () => {
    const { getByText } = render(
      <MealListItem meal={sampleMeal} onEdit={jest.fn()} onDelete={jest.fn()} />,
    );
    expect(getByText('40g P')).toBeTruthy();
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
    const noDescMeal: MacroMeal = { ...sampleMeal, description: '' };
    const { getByText, queryByText } = render(
      <MealListItem meal={noDescMeal} onEdit={jest.fn()} onDelete={jest.fn()} />,
    );
    expect(getByText('Lunch:')).toBeTruthy();
    expect(queryByText('Chicken')).toBeNull();
  });

  it('renders with isLast=true (no border)', () => {
    const { getByText } = render(
      <MealListItem meal={sampleMeal} onEdit={jest.fn()} onDelete={jest.fn()} isLast={true} />,
    );
    expect(getByText('Chicken')).toBeTruthy();
  });

  it('shows multiple macro pills for multi-macro meal', () => {
    const multiMacroMeal: MacroMeal = {
      ...sampleMeal,
      protein: 30,
      carbs: 45,
      fat: 12,
      calories: 588,
    };
    const { getByText } = render(
      <MealListItem meal={multiMacroMeal} onEdit={jest.fn()} onDelete={jest.fn()} />,
    );
    expect(getByText('30g P')).toBeTruthy();
    expect(getByText('45g C')).toBeTruthy();
    expect(getByText('12g F')).toBeTruthy();
  });
});
