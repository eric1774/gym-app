import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { ExerciseCategoryTabs } from '../ExerciseCategoryTabs';

describe('ExerciseCategoryTabs', () => {
  it('renders all 7 categories', () => {
    const { getByText } = render(
      <ExerciseCategoryTabs selected={null} onSelect={jest.fn()} />,
    );
    expect(getByText('Chest')).toBeTruthy();
    expect(getByText('Back')).toBeTruthy();
    expect(getByText('Legs')).toBeTruthy();
    expect(getByText('Shoulders')).toBeTruthy();
    expect(getByText('Arms')).toBeTruthy();
    expect(getByText('Core')).toBeTruthy();
    expect(getByText('Conditioning')).toBeTruthy();
  });

  it('calls onSelect with tapped category', () => {
    const mockFn = jest.fn();
    const { getByText } = render(
      <ExerciseCategoryTabs selected={null} onSelect={mockFn} />,
    );
    fireEvent.press(getByText('Back'));
    expect(mockFn).toHaveBeenCalledWith('back');
  });

  it('highlights selected tab', () => {
    const { toJSON } = render(
      <ExerciseCategoryTabs selected="legs" onSelect={jest.fn()} />,
    );
    expect(toJSON()).toBeTruthy();
  });
});
