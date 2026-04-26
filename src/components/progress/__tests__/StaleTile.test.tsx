import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { StaleTile } from '../StaleTile';
import { StaleExerciseCandidate } from '../../../types';

const candidate: StaleExerciseCandidate = {
  exerciseId: 5,
  exerciseName: 'Deadlift',
  daysSinceLastTrained: 14,
  category: 'legs',
};

describe('StaleTile', () => {
  it('renders exercise name and days-since text', () => {
    const { getByText } = render(<StaleTile candidate={candidate} onPress={() => {}} />);
    expect(getByText('Deadlift')).toBeTruthy();
    expect(getByText('14d ago')).toBeTruthy();
  });

  it('label uses secondary slate color, NOT danger red', () => {
    const { getByTestId } = render(<StaleTile candidate={candidate} onPress={() => {}} />);
    const label = getByTestId('stale-label');
    const flatStyle = Array.isArray(label.props.style)
      ? Object.assign({}, ...label.props.style)
      : label.props.style;
    expect(flatStyle.color).toBe('#8E9298'); // colors.secondary
    expect(flatStyle.color).not.toBe('#D9534F'); // colors.danger
  });

  it('calls onPress with exerciseId when tapped', () => {
    const onPress = jest.fn();
    const { getByTestId } = render(<StaleTile candidate={candidate} onPress={onPress} />);
    fireEvent.press(getByTestId('stale-tile'));
    expect(onPress).toHaveBeenCalledWith(5);
  });
});
