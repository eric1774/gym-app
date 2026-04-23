import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { BodyCompScopeBar } from '../BodyCompScopeBar';

describe('BodyCompScopeBar', () => {
  it('renders all three segments', () => {
    const { getByText } = render(
      <BodyCompScopeBar scope="month" onChange={jest.fn()} />,
    );
    expect(getByText('MONTH')).toBeTruthy();
    expect(getByText('WEEK')).toBeTruthy();
    expect(getByText('DAY')).toBeTruthy();
  });

  it('fires onChange with the new scope on tap', () => {
    const onChange = jest.fn();
    const { getByTestId } = render(
      <BodyCompScopeBar scope="month" onChange={onChange} />,
    );
    fireEvent.press(getByTestId('scope-seg-week'));
    expect(onChange).toHaveBeenCalledWith('week');
  });

  it('applies active styling to the current scope segment', () => {
    const { getByTestId } = render(
      <BodyCompScopeBar scope="day" onChange={jest.fn()} />,
    );
    const daySeg = getByTestId('scope-seg-day');
    expect(daySeg.props.accessibilityState?.selected).toBe(true);
    const monthSeg = getByTestId('scope-seg-month');
    expect(monthSeg.props.accessibilityState?.selected).toBe(false);
  });
});
