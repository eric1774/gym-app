import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { SessionHistoryRow } from '../SessionHistoryRow';
import { ExerciseHistorySession } from '../../../types';

const session: ExerciseHistorySession = {
  sessionId: 100,
  date: '2026-04-22T00:00:00Z',
  sets: [
    { setNumber: 1, weightLbs: 175, reps: 5, isWarmup: false },
    { setNumber: 2, weightLbs: 175, reps: 5, isWarmup: false },
    { setNumber: 3, weightLbs: 195, reps: 3, isWarmup: false },
  ],
};

describe('SessionHistoryRow', () => {
  it('renders top set + total volume in collapsed state', () => {
    const { getByText } = render(
      <SessionHistoryRow session={session} isPR={true} onLongPress={() => {}} />,
    );
    // Top set: 195 × 3
    expect(getByText(/195 × 3/)).toBeTruthy();
    // Volume: 175*5 + 175*5 + 195*3 = 875 + 875 + 585 = 2335
    expect(getByText(/2,335/)).toBeTruthy();
  });

  it('does not render set list initially (collapsed)', () => {
    const { queryByTestId } = render(
      <SessionHistoryRow session={session} isPR={false} onLongPress={() => {}} />,
    );
    expect(queryByTestId('expanded-set-1')).toBeNull();
  });

  it('renders all sets after tap (expanded)', () => {
    const { getByTestId, queryByTestId } = render(
      <SessionHistoryRow session={session} isPR={false} onLongPress={() => {}} />,
    );
    fireEvent.press(getByTestId('history-row-100'));
    expect(queryByTestId('expanded-set-1')).toBeTruthy();
    expect(queryByTestId('expanded-set-2')).toBeTruthy();
    expect(queryByTestId('expanded-set-3')).toBeTruthy();
  });

  it('collapses when tapped again', () => {
    const { getByTestId, queryByTestId } = render(
      <SessionHistoryRow session={session} isPR={false} onLongPress={() => {}} />,
    );
    fireEvent.press(getByTestId('history-row-100'));
    fireEvent.press(getByTestId('history-row-100'));
    expect(queryByTestId('expanded-set-1')).toBeNull();
  });

  it('renders PR badge when isPR=true', () => {
    const { getByText } = render(
      <SessionHistoryRow session={session} isPR={true} onLongPress={() => {}} />,
    );
    expect(getByText('PR')).toBeTruthy();
  });

  it('calls onLongPress with sessionId on long press', () => {
    const onLongPress = jest.fn();
    const { getByTestId } = render(
      <SessionHistoryRow session={session} isPR={false} onLongPress={onLongPress} />,
    );
    fireEvent(getByTestId('history-row-100'), 'longPress');
    expect(onLongPress).toHaveBeenCalledWith(100);
  });
});
