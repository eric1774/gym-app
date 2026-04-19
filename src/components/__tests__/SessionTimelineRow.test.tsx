import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { SessionTimelineRow } from '../SessionTimelineRow';
import { ExerciseHistorySession } from '../../types';

const makeSession = (overrides?: Partial<ExerciseHistorySession>): ExerciseHistorySession => ({
  sessionId: 1,
  date: '2026-04-08T10:00:00Z',
  sets: [
    { setNumber: 1, weightLbs: 155, reps: 10, isWarmup: false },
    { setNumber: 2, weightLbs: 155, reps: 8, isWarmup: false },
    { setNumber: 3, weightLbs: 155, reps: 7, isWarmup: false },
  ],
  ...overrides,
});

describe('SessionTimelineRow', () => {
  const onPress = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders date as "Apr 8"', () => {
    const { getByText } = render(
      <SessionTimelineRow
        session={makeSession()}
        index={0}
        totalSessions={5}
        onPress={onPress}
      />,
    );
    expect(getByText('Apr 8')).toBeTruthy();
  });

  it('renders set pills with correct weight×reps', () => {
    const { getByText } = render(
      <SessionTimelineRow
        session={makeSession()}
        index={0}
        totalSessions={5}
        onPress={onPress}
      />,
    );
    expect(getByText('155\u00D710')).toBeTruthy();
    expect(getByText('155\u00D78')).toBeTruthy();
    expect(getByText('155\u00D77')).toBeTruthy();
  });

  it('renders session volume as "3,875"', () => {
    // 155*10 + 155*8 + 155*7 = 1550 + 1240 + 1085 = 3875
    const { getByText } = render(
      <SessionTimelineRow
        session={makeSession()}
        index={0}
        totalSessions={5}
        onPress={onPress}
      />,
    );
    expect(getByText('3,875')).toBeTruthy();
  });

  it('calls onPress when tapped', () => {
    const { getByTestId } = render(
      <SessionTimelineRow
        session={makeSession()}
        index={0}
        totalSessions={5}
        onPress={onPress}
      />,
    );
    fireEvent.press(getByTestId('session-row-1'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('shows "PR" text when isPR is true', () => {
    const { getByText } = render(
      <SessionTimelineRow
        session={makeSession()}
        index={0}
        totalSessions={5}
        isPR
        onPress={onPress}
      />,
    );
    expect(getByText('PR')).toBeTruthy();
  });

  it('does not show "PR" text when isPR is false', () => {
    const { queryByText } = render(
      <SessionTimelineRow
        session={makeSession()}
        index={0}
        totalSessions={5}
        isPR={false}
        onPress={onPress}
      />,
    );
    expect(queryByText('PR')).toBeNull();
  });

  it('excludes warmup sets from pills', () => {
    const session = makeSession({
      sets: [
        { setNumber: 1, weightLbs: 95, reps: 10, isWarmup: true },
        { setNumber: 2, weightLbs: 155, reps: 10, isWarmup: false },
        { setNumber: 3, weightLbs: 155, reps: 8, isWarmup: false },
      ],
    });
    const { queryByText, getByText } = render(
      <SessionTimelineRow
        session={session}
        index={0}
        totalSessions={5}
        onPress={onPress}
      />,
    );
    expect(queryByText('95\u00D710')).toBeNull();
    expect(getByText('155\u00D710')).toBeTruthy();
    expect(getByText('155\u00D78')).toBeTruthy();
  });
});
