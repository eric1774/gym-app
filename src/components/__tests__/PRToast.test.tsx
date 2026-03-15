import React, { createRef } from 'react';
import { render, act } from '@testing-library/react-native';
import { PRToast, PRToastHandle } from '../PRToast';

describe('PRToast', () => {
  it('renders nothing when no PR shown', () => {
    const ref = createRef<PRToastHandle>();
    const { toJSON } = render(<PRToast ref={ref} />);
    expect(toJSON()).toBeNull();
  });

  it('shows exercise name and PR detail after showPR', () => {
    const ref = createRef<PRToastHandle>();
    const { getByText } = render(<PRToast ref={ref} />);

    act(() => {
      ref.current!.showPR('Bench Press', 5, 225);
    });

    expect(getByText('Bench Press')).toBeTruthy();
    expect(getByText(/New 5-rep PR! 225 lbs/)).toBeTruthy();
  });

  it('exposes showPR via ref', () => {
    const ref = createRef<PRToastHandle>();
    render(<PRToast ref={ref} />);

    expect(ref.current).not.toBeNull();
    expect(typeof ref.current!.showPR).toBe('function');
  });
});
