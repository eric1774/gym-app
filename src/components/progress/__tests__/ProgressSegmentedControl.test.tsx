import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { ProgressSegmentedControl } from '../ProgressSegmentedControl';

describe('ProgressSegmentedControl', () => {
  it('renders both tab labels', () => {
    const { getByText } = render(
      <ProgressSegmentedControl active="exercises" onChange={() => {}} />,
    );
    expect(getByText('Exercises')).toBeTruthy();
    expect(getByText('Program Days')).toBeTruthy();
  });

  it('marks the active tab visually distinct', () => {
    const { getByTestId } = render(
      <ProgressSegmentedControl active="programDays" onChange={() => {}} />,
    );
    const active = getByTestId('seg-tab-programDays');
    const inactive = getByTestId('seg-tab-exercises');
    const flatActive = Array.isArray(active.props.style)
      ? Object.assign({}, ...active.props.style)
      : active.props.style;
    const flatInactive = Array.isArray(inactive.props.style)
      ? Object.assign({}, ...inactive.props.style)
      : inactive.props.style;
    expect(flatActive.backgroundColor).not.toBe(flatInactive.backgroundColor);
  });

  it('calls onChange when inactive tab tapped', () => {
    const onChange = jest.fn();
    const { getByTestId } = render(
      <ProgressSegmentedControl active="exercises" onChange={onChange} />,
    );
    fireEvent.press(getByTestId('seg-tab-programDays'));
    expect(onChange).toHaveBeenCalledWith('programDays');
  });
});
