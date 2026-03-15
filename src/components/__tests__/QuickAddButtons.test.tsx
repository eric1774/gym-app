import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { QuickAddButtons } from '../QuickAddButtons';

const sampleMeals = [
  { description: 'Chicken', proteinGrams: 30, mealType: 'lunch' as const },
  { description: 'Shake', proteinGrams: 50, mealType: 'snack' as const },
];

describe('QuickAddButtons', () => {
  it('returns null when meals is empty', () => {
    const { queryByText } = render(
      <QuickAddButtons meals={[]} onQuickAdd={jest.fn()} />,
    );
    expect(queryByText('RECENT TEMPLATES')).toBeNull();
  });

  it('renders meal pills', () => {
    const { getByText } = render(
      <QuickAddButtons meals={sampleMeals} onQuickAdd={jest.fn()} />,
    );
    expect(getByText('Chicken 30g')).toBeTruthy();
    expect(getByText('Shake 50g')).toBeTruthy();
  });

  it('calls onQuickAdd with tapped meal', () => {
    const mockFn = jest.fn();
    const { getByText } = render(
      <QuickAddButtons meals={sampleMeals} onQuickAdd={mockFn} />,
    );
    fireEvent.press(getByText('Chicken 30g'));
    expect(mockFn).toHaveBeenCalledWith({
      description: 'Chicken',
      proteinGrams: 30,
      mealType: 'lunch',
    });
  });
});
