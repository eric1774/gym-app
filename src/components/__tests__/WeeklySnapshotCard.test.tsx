import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { WeeklySnapshotCard } from '../WeeklySnapshotCard';
import { WeeklySnapshot } from '../../types';

const baseSnapshot: WeeklySnapshot = {
  sessionsThisWeek: 3,
  prsThisWeek: 2,
  volumeChangePercent: 12.7,
};

describe('WeeklySnapshotCard', () => {
  it('renders session count number and "Sessions" label', () => {
    const { getByText } = render(
      <WeeklySnapshotCard snapshot={baseSnapshot} onPress={jest.fn()} />,
    );
    expect(getByText('3')).toBeTruthy();
    expect(getByText('Sessions')).toBeTruthy();
  });

  it('renders PR count number and "PRs" label', () => {
    const { getByText } = render(
      <WeeklySnapshotCard snapshot={baseSnapshot} onPress={jest.fn()} />,
    );
    expect(getByText('2')).toBeTruthy();
    expect(getByText('PRs')).toBeTruthy();
  });

  it('renders positive volume change with "+" prefix (rounded to integer)', () => {
    const { getByText } = render(
      <WeeklySnapshotCard snapshot={baseSnapshot} onPress={jest.fn()} />,
    );
    expect(getByText('+13%')).toBeTruthy();
  });

  it('renders negative volume change with unicode minus prefix', () => {
    const snapshot: WeeklySnapshot = { ...baseSnapshot, volumeChangePercent: -8.4 };
    const { getByText } = render(
      <WeeklySnapshotCard snapshot={snapshot} onPress={jest.fn()} />,
    );
    expect(getByText('\u22128%')).toBeTruthy();
  });

  it('renders em dash when volumeChangePercent is null', () => {
    const snapshot: WeeklySnapshot = { ...baseSnapshot, volumeChangePercent: null };
    const { getByText } = render(
      <WeeklySnapshotCard snapshot={snapshot} onPress={jest.fn()} />,
    );
    expect(getByText('\u2014')).toBeTruthy();
  });

  it('calls onPress when card is pressed', () => {
    const onPress = jest.fn();
    const { getByTestId } = render(
      <WeeklySnapshotCard snapshot={baseSnapshot} onPress={onPress} />,
    );
    fireEvent.press(getByTestId('weekly-snapshot-card'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('renders "View Progress" CTA text', () => {
    const { getByText } = render(
      <WeeklySnapshotCard snapshot={baseSnapshot} onPress={jest.fn()} />,
    );
    expect(getByText(/View Progress/)).toBeTruthy();
  });
});
