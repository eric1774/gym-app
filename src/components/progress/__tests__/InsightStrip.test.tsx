import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { InsightStrip } from '../InsightStrip';
import { PRWatchCandidate, StaleExerciseCandidate } from '../../../types';

const pr: PRWatchCandidate = {
  exerciseId: 1, exerciseName: 'Bench', currentBestLb: 195, targetLb: 200, distanceLb: 5,
};
const stale: StaleExerciseCandidate = {
  exerciseId: 5, exerciseName: 'Deadlift', daysSinceLastTrained: 14, category: 'legs',
};

describe('InsightStrip', () => {
  it('renders both tiles when both candidates provided', () => {
    const { getByTestId } = render(
      <InsightStrip prCandidate={pr} staleCandidate={stale} onTilePress={() => {}} />,
    );
    expect(getByTestId('pr-watch-tile')).toBeTruthy();
    expect(getByTestId('stale-tile')).toBeTruthy();
  });

  it('hides entire strip when both null', () => {
    const { queryByTestId } = render(
      <InsightStrip prCandidate={null} staleCandidate={null} onTilePress={() => {}} />,
    );
    expect(queryByTestId('insight-strip')).toBeNull();
  });

  it('renders only PR tile when stale is null', () => {
    const { getByTestId, queryByTestId } = render(
      <InsightStrip prCandidate={pr} staleCandidate={null} onTilePress={() => {}} />,
    );
    expect(getByTestId('pr-watch-tile')).toBeTruthy();
    expect(queryByTestId('stale-tile')).toBeNull();
  });

  it('forwards tile press with exerciseId', () => {
    const onTilePress = jest.fn();
    const { getByTestId } = render(
      <InsightStrip prCandidate={pr} staleCandidate={stale} onTilePress={onTilePress} />,
    );
    fireEvent.press(getByTestId('pr-watch-tile'));
    expect(onTilePress).toHaveBeenCalledWith(1);
  });
});
