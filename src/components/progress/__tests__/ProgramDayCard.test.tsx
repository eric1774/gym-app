import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { ProgramDayCard } from '../ProgramDayCard';
import { ProgramDayWeeklyTonnage } from '../../../types';

jest.mock('../WeeklyTonnageBars', () => {
  const { View } = require('react-native');
  return { WeeklyTonnageBars: () => <View testID="weekly-bars" /> };
});

const day: ProgramDayWeeklyTonnage = {
  programDayId: 10,
  dayName: 'Push Day',
  exerciseCount: 6,
  lastPerformedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
  weeklyTonnageLb: [9500, 13200, 17400, 18450],
  currentWeekTonnageLb: 18450,
  deltaPercent2wk: 6,
};

describe('ProgramDayCard', () => {
  it('renders day name + tonnage value', () => {
    const { getByText } = render(<ProgramDayCard day={day} onPress={() => {}} />);
    expect(getByText('Push Day')).toBeTruthy();
    expect(getByText(/18,450/)).toBeTruthy();
  });

  it('renders delta text "vs prior 2wk"', () => {
    const { getByText } = render(<ProgramDayCard day={day} onPress={() => {}} />);
    expect(getByText(/▲ 6% vs prior 2wk/)).toBeTruthy();
  });

  it('renders em-dash when delta is null', () => {
    const { getByText } = render(
      <ProgramDayCard day={{ ...day, deltaPercent2wk: null }} onPress={() => {}} />,
    );
    expect(getByText(/—/)).toBeTruthy();
  });

  it('delta uses textSoft slate, never danger red', () => {
    const { getByTestId } = render(
      <ProgramDayCard day={{ ...day, deltaPercent2wk: -4 }} onPress={() => {}} />,
    );
    const delta = getByTestId('day-delta');
    const flat = Array.isArray(delta.props.style)
      ? Object.assign({}, ...delta.props.style)
      : delta.props.style;
    expect(flat.color).toBe('#BDC3CB');
  });

  it('calls onPress with programDayId', () => {
    const onPress = jest.fn();
    const { getByTestId } = render(<ProgramDayCard day={day} onPress={onPress} />);
    fireEvent.press(getByTestId('day-card'));
    expect(onPress).toHaveBeenCalledWith(10);
  });
});
