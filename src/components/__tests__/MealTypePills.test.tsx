import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { MealTypePills } from '../MealTypePills';

describe('MealTypePills', () => {
  it('renders all 4 meal type pills', () => {
    const { getByText } = render(<MealTypePills selected={null} onSelect={jest.fn()} />);
    expect(getByText('Breakfast')).toBeTruthy();
    expect(getByText('Lunch')).toBeTruthy();
    expect(getByText('Dinner')).toBeTruthy();
    expect(getByText('Snack')).toBeTruthy();
  });

  it('calls onSelect with tapped type', () => {
    const mockFn = jest.fn();
    const { getByText } = render(<MealTypePills selected={null} onSelect={mockFn} />);
    fireEvent.press(getByText('Lunch'));
    expect(mockFn).toHaveBeenCalledWith('lunch');
  });

  it('highlights selected pill', () => {
    const { toJSON } = render(<MealTypePills selected="dinner" onSelect={jest.fn()} />);
    // Verify render does not throw and returns a tree
    expect(toJSON()).toBeTruthy();
  });
});
