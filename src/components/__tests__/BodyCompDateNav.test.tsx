import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { BodyCompDateNav, formatScopeLabel, stepScopeDate } from '../BodyCompDateNav';

describe('formatScopeLabel', () => {
  it('formats month scope as "April 2026"', () => {
    expect(formatScopeLabel('month', '2026-04-15')).toBe('April 2026');
  });
  it('formats week scope as "Apr 13 – 19, 2026"', () => {
    // 2026-04-15 is a Wednesday; week starts Monday 13th, ends Sunday 19th
    expect(formatScopeLabel('week', '2026-04-15')).toBe('Apr 13 – 19, 2026');
  });
  it('formats day scope as "Wed · Apr 15, 2026"', () => {
    expect(formatScopeLabel('day', '2026-04-15')).toBe('Wed · Apr 15, 2026');
  });
});

describe('stepScopeDate', () => {
  it('steps month +1', () => {
    expect(stepScopeDate('month', '2026-04-15', 1)).toBe('2026-05-15');
  });
  it('steps week +1 (7 days)', () => {
    expect(stepScopeDate('week', '2026-04-15', 1)).toBe('2026-04-22');
  });
  it('steps day +1', () => {
    expect(stepScopeDate('day', '2026-04-15', 1)).toBe('2026-04-16');
  });
  it('steps day -1 across a month boundary', () => {
    expect(stepScopeDate('day', '2026-04-01', -1)).toBe('2026-03-31');
  });
});

describe('BodyCompDateNav', () => {
  it('calls onChange with stepped date when arrow tapped', () => {
    const onChange = jest.fn();
    const { getByTestId } = render(
      <BodyCompDateNav
        scope="day"
        date="2026-04-15"
        today="2026-04-22"
        onChange={onChange}
      />,
    );
    fireEvent.press(getByTestId('date-nav-prev'));
    expect(onChange).toHaveBeenCalledWith('2026-04-14');
  });

  it('disables the next arrow when at today', () => {
    const { getByTestId } = render(
      <BodyCompDateNav
        scope="day"
        date="2026-04-22"
        today="2026-04-22"
        onChange={jest.fn()}
      />,
    );
    const nextBtn = getByTestId('date-nav-next');
    expect(nextBtn.props.accessibilityState?.disabled).toBe(true);
  });
});
