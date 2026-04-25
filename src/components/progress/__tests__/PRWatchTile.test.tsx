import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { PRWatchTile } from '../PRWatchTile';
import { PRWatchCandidate } from '../../../types';

const candidate: PRWatchCandidate = {
  exerciseId: 1,
  exerciseName: 'Bench Press',
  currentBestLb: 195,
  targetLb: 200,
  distanceLb: 5,
};

describe('PRWatchTile', () => {
  it('renders exercise name and distance text', () => {
    const { getByText } = render(
      <PRWatchTile candidate={candidate} onPress={() => {}} />,
    );
    expect(getByText('Bench Press')).toBeTruthy();
    expect(getByText('−5 lb away')).toBeTruthy();
  });

  it('renders the PR Watch label in gold', () => {
    const { getByTestId } = render(
      <PRWatchTile candidate={candidate} onPress={() => {}} />,
    );
    const label = getByTestId('pr-watch-label');
    const flatStyle = Array.isArray(label.props.style)
      ? Object.assign({}, ...label.props.style)
      : label.props.style;
    expect(flatStyle.color).toBe('#FFB800'); // colors.prGold
  });

  it('calls onPress with exerciseId when tapped', () => {
    const onPress = jest.fn();
    const { getByTestId } = render(
      <PRWatchTile candidate={candidate} onPress={onPress} />,
    );
    fireEvent.press(getByTestId('pr-watch-tile'));
    expect(onPress).toHaveBeenCalledWith(1);
  });
});
