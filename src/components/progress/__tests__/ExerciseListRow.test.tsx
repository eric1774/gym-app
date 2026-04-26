import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { ExerciseListRow } from '../ExerciseListRow';
import { ExerciseListItem } from '../../../types';

jest.mock('../../MiniSparkline', () => {
  const { View } = require('react-native');
  return { MiniSparkline: (props: { data: number[] }) => <View testID="mini-sparkline" {...props} /> };
});

const item: ExerciseListItem = {
  exerciseId: 1,
  exerciseName: 'Bench Press',
  category: 'chest',
  measurementType: 'reps',
  lastTrainedAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
  sessionCount: 12,
  sparklinePoints: [180, 185, 190, 195],
  deltaPercent14d: 7.4,
};

describe('ExerciseListRow', () => {
  it('renders name, category meta, sparkline, delta', () => {
    const { getByText, getByTestId } = render(
      <ExerciseListRow item={item} onPress={() => {}} />,
    );
    expect(getByText('Bench Press')).toBeTruthy();
    expect(getByTestId('mini-sparkline')).toBeTruthy();
    expect(getByText(/▲ 7%/)).toBeTruthy();
  });

  it('renders em-dash when delta is null', () => {
    const { getByText } = render(
      <ExerciseListRow item={{ ...item, deltaPercent14d: null }} onPress={() => {}} />,
    );
    expect(getByText('—')).toBeTruthy();
  });

  it('uses textSoft slate for negative delta, never danger red', () => {
    const { getByTestId } = render(
      <ExerciseListRow item={{ ...item, deltaPercent14d: -5 }} onPress={() => {}} />,
    );
    const delta = getByTestId('exercise-row-delta');
    const flat = Array.isArray(delta.props.style)
      ? Object.assign({}, ...delta.props.style)
      : delta.props.style;
    expect(flat.color).toBe('#BDC3CB'); // colors.textSoft
    expect(flat.color).not.toBe('#D9534F');
  });

  it('left accent stripe uses category color', () => {
    const { getByTestId } = render(
      <ExerciseListRow item={item} onPress={() => {}} />,
    );
    const accent = getByTestId('exercise-row-accent');
    const flat = Array.isArray(accent.props.style)
      ? Object.assign({}, ...accent.props.style)
      : accent.props.style;
    expect(flat.backgroundColor).toBe('#E8845C'); // chest color
  });

  it('calls onPress with exerciseId', () => {
    const onPress = jest.fn();
    const { getByTestId } = render(
      <ExerciseListRow item={item} onPress={onPress} />,
    );
    fireEvent.press(getByTestId('exercise-row'));
    expect(onPress).toHaveBeenCalledWith(1);
  });
});
