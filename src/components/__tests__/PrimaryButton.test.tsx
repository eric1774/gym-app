import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { PrimaryButton } from '../PrimaryButton';

describe('PrimaryButton', () => {
  it('renders title text', () => {
    const { getByText } = render(<PrimaryButton title="Log Set" onPress={jest.fn()} />);
    expect(getByText('Log Set')).toBeTruthy();
  });

  it('calls onPress when pressed', () => {
    const mockFn = jest.fn();
    const { getByText } = render(<PrimaryButton title="Log Set" onPress={mockFn} />);
    fireEvent.press(getByText('Log Set'));
    expect(mockFn).toHaveBeenCalledTimes(1);
  });

  it('does not call onPress when disabled', () => {
    const mockFn = jest.fn();
    const { getByText } = render(<PrimaryButton title="Log Set" onPress={mockFn} disabled={true} />);
    fireEvent.press(getByText('Log Set'));
    expect(mockFn).not.toHaveBeenCalled();
  });

  it('shows ActivityIndicator when loading', () => {
    const { queryByText } = render(<PrimaryButton title="Log Set" onPress={jest.fn()} loading={true} />);
    expect(queryByText('Log Set')).toBeNull();
  });
});
