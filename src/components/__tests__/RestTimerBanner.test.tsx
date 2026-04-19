import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { RestTimerBanner } from '../RestTimerBanner';

describe('RestTimerBanner', () => {
  it('displays formatted countdown', () => {
    const { getByText } = render(
      <RestTimerBanner remainingSeconds={75} totalSeconds={90} onStop={jest.fn()} onAdd={jest.fn()} />,
    );
    expect(getByText('01:15')).toBeTruthy();
  });

  it('displays REST label', () => {
    const { getByText } = render(
      <RestTimerBanner remainingSeconds={75} totalSeconds={90} onStop={jest.fn()} onAdd={jest.fn()} />,
    );
    expect(getByText('REST')).toBeTruthy();
  });

  it('calls onStop when SKIP pressed', () => {
    const mockFn = jest.fn();
    const { getByText } = render(
      <RestTimerBanner remainingSeconds={75} totalSeconds={90} onStop={mockFn} onAdd={jest.fn()} />,
    );
    fireEvent.press(getByText('SKIP'));
    expect(mockFn).toHaveBeenCalledTimes(1);
  });

  it('calls onAdd when +15s pressed', () => {
    const mockFn = jest.fn();
    const { getByText } = render(
      <RestTimerBanner remainingSeconds={75} totalSeconds={90} onStop={jest.fn()} onAdd={mockFn} />,
    );
    fireEvent.press(getByText('+15s'));
    expect(mockFn).toHaveBeenCalledTimes(1);
  });

  it('handles totalSeconds of 0 without crashing', () => {
    const { getByText } = render(
      <RestTimerBanner remainingSeconds={0} totalSeconds={0} onStop={jest.fn()} onAdd={jest.fn()} />,
    );
    expect(getByText('00:00')).toBeTruthy();
  });
});
