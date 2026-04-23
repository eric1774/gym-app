import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { DashboardWeightCard } from '../DashboardWeightCard';

describe('DashboardWeightCard', () => {
  it('renders the not-logged state with prominent + Log button', () => {
    const { getByText, getByTestId } = render(
      <DashboardWeightCard
        todayWeight={null}
        yesterdayWeight={176.8}
        onPressLog={jest.fn()}
        onPressCard={jest.fn()}
        onPressEdit={jest.fn()}
      />,
    );
    expect(getByText('Not logged')).toBeTruthy();
    expect(getByText('Yesterday: 176.8 lb')).toBeTruthy();
    expect(getByTestId('weight-card-log-btn')).toBeTruthy();
  });

  it('renders the logged state with today weight and delta', () => {
    const { getByText, queryByTestId } = render(
      <DashboardWeightCard
        todayWeight={177.4}
        yesterdayWeight={178.0}
        onPressLog={jest.fn()}
        onPressCard={jest.fn()}
        onPressEdit={jest.fn()}
      />,
    );
    expect(getByText('177.4')).toBeTruthy();
    expect(getByText('↓ 0.6 vs yesterday')).toBeTruthy();
    expect(queryByTestId('weight-card-log-btn')).toBeNull();
    expect(queryByTestId('weight-card-edit-btn')).toBeTruthy();
  });

  it('shows neutral delta when no yesterday weight', () => {
    const { getByText } = render(
      <DashboardWeightCard
        todayWeight={177.4}
        yesterdayWeight={null}
        onPressLog={jest.fn()}
        onPressCard={jest.fn()}
        onPressEdit={jest.fn()}
      />,
    );
    expect(getByText('first reading')).toBeTruthy();
  });

  it('invokes onPressLog when + Log button is pressed (not-logged)', () => {
    const onPressLog = jest.fn();
    const { getByTestId } = render(
      <DashboardWeightCard
        todayWeight={null}
        yesterdayWeight={null}
        onPressLog={onPressLog}
        onPressCard={jest.fn()}
        onPressEdit={jest.fn()}
      />,
    );
    fireEvent.press(getByTestId('weight-card-log-btn'));
    expect(onPressLog).toHaveBeenCalledTimes(1);
  });

  it('invokes onPressEdit when edit icon is pressed (logged)', () => {
    const onPressEdit = jest.fn();
    const { getByTestId } = render(
      <DashboardWeightCard
        todayWeight={177.4}
        yesterdayWeight={178.0}
        onPressLog={jest.fn()}
        onPressCard={jest.fn()}
        onPressEdit={onPressEdit}
      />,
    );
    fireEvent.press(getByTestId('weight-card-edit-btn'));
    expect(onPressEdit).toHaveBeenCalledTimes(1);
  });

  it('invokes onPressCard when the card body is pressed', () => {
    const onPressCard = jest.fn();
    const { getByTestId } = render(
      <DashboardWeightCard
        todayWeight={177.4}
        yesterdayWeight={178.0}
        onPressLog={jest.fn()}
        onPressCard={onPressCard}
        onPressEdit={jest.fn()}
      />,
    );
    fireEvent.press(getByTestId('weight-card-body'));
    expect(onPressCard).toHaveBeenCalledTimes(1);
  });
});
