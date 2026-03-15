import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { RestTimerBanner } from '../RestTimerBanner';

describe('RestTimerBanner', () => {
  it('displays formatted countdown', () => {
    const { getByText } = render(
      <RestTimerBanner remainingSeconds={75} totalSeconds={90} onStop={jest.fn()} />,
    );
    expect(getByText('1:15')).toBeTruthy();
  });

  it('displays Rest label', () => {
    const { getByText } = render(
      <RestTimerBanner remainingSeconds={75} totalSeconds={90} onStop={jest.fn()} />,
    );
    expect(getByText('Rest')).toBeTruthy();
  });

  it('calls onStop when Skip pressed', () => {
    const mockFn = jest.fn();
    const { getByText } = render(
      <RestTimerBanner remainingSeconds={75} totalSeconds={90} onStop={mockFn} />,
    );
    fireEvent.press(getByText('Skip'));
    expect(mockFn).toHaveBeenCalledTimes(1);
  });
});
