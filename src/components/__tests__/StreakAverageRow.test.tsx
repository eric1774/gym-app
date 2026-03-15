import React from 'react';
import { render } from '@testing-library/react-native';
import { StreakAverageRow } from '../StreakAverageRow';

describe('StreakAverageRow', () => {
  it('returns null when streak=0 and average=null', () => {
    const { toJSON } = render(<StreakAverageRow streak={0} average={null} />);
    expect(toJSON()).toBeNull();
  });

  it('shows streak when streak > 0', () => {
    const { getByText } = render(<StreakAverageRow streak={5} average={null} />);
    expect(getByText(/5 day streak/)).toBeTruthy();
  });

  it('shows average when average is not null', () => {
    const { getByText } = render(<StreakAverageRow streak={0} average={150} />);
    expect(getByText(/7-day avg: 150g/)).toBeTruthy();
  });

  it('shows both streak and average with separator', () => {
    const { getByText } = render(<StreakAverageRow streak={3} average={180} />);
    expect(getByText(/3 day streak/)).toBeTruthy();
    expect(getByText(/7-day avg: 180g/)).toBeTruthy();
  });
});
