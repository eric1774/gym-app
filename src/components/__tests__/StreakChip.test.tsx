import React from 'react';
import { render } from '@testing-library/react-native';
import { StreakChip } from '../StreakChip';

describe('StreakChip', () => {
  const sevenDays = [
    { date: '2026-04-17', status: 'workout' as const },
    { date: '2026-04-18', status: 'rest' as const },
    { date: '2026-04-19', status: 'workout' as const },
    { date: '2026-04-20', status: 'workout' as const },
    { date: '2026-04-21', status: 'rest' as const },
    { date: '2026-04-22', status: 'workout' as const },
    { date: '2026-04-23', status: 'workout' as const },
  ];

  it('renders "N-day streak" and rest-days-included subtitle', () => {
    const { getByText } = render(<StreakChip currentStreak={7} recentDays={sevenDays} />);
    expect(getByText(/7/)).toBeTruthy();
    expect(getByText(/day streak/)).toBeTruthy();
    expect(getByText('Rest days included')).toBeTruthy();
  });

  it('renders one bar per recentDay entry', () => {
    const { getAllByTestId } = render(<StreakChip currentStreak={7} recentDays={sevenDays} />);
    const workoutBars = getAllByTestId('streak-bar-workout');
    const restBars = getAllByTestId('streak-bar-rest');
    expect(workoutBars.length + restBars.length).toBe(7);
  });

  it('uses distinct testIDs for workout vs rest days', () => {
    const { getAllByTestId } = render(<StreakChip currentStreak={7} recentDays={sevenDays} />);
    expect(getAllByTestId('streak-bar-workout').length).toBe(5);
    expect(getAllByTestId('streak-bar-rest').length).toBe(2);
  });

  it('renders nothing when currentStreak is 0', () => {
    const { toJSON } = render(<StreakChip currentStreak={0} recentDays={[]} />);
    expect(toJSON()).toBeNull();
  });
});
