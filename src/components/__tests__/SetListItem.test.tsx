import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { SetListItem } from '../SetListItem';
import { WorkoutSet } from '../../types';

const makeSet = (overrides: Partial<WorkoutSet> = {}): WorkoutSet => ({
  id: 1,
  sessionId: 1,
  exerciseId: 1,
  setNumber: 1,
  weightLbs: 135,
  reps: 10,
  loggedAt: '',
  isWarmup: false,
  ...overrides,
});

describe('SetListItem', () => {
  it('renders reps format', () => {
    const set = makeSet({ setNumber: 2, weightLbs: 135, reps: 10 });
    const { getByText } = render(<SetListItem set={set} onDelete={jest.fn()} />);
    expect(getByText(/Set 2: 135lb/)).toBeTruthy();
    expect(getByText(/10 reps/)).toBeTruthy();
  });

  it('renders timed format', () => {
    const set = makeSet({ setNumber: 1, reps: 90 });
    const { getByText } = render(<SetListItem set={set} onDelete={jest.fn()} isTimed={true} />);
    expect(getByText(/Set 1: 01:30/)).toBeTruthy();
  });

  it('renders warmup label', () => {
    const set = makeSet({ isWarmup: true });
    const { getByText } = render(<SetListItem set={set} onDelete={jest.fn()} />);
    expect(getByText(/\(warmup\)/)).toBeTruthy();
  });

  it('toggles delete button on long press', () => {
    const set = makeSet();
    const { getByText } = render(<SetListItem set={set} onDelete={jest.fn()} />);
    fireEvent(getByText(/Set 1/), 'longPress');
    expect(getByText('Delete')).toBeTruthy();
  });

  it('calls onDelete when delete button pressed', () => {
    const onDelete = jest.fn();
    const set = makeSet({ id: 42 });
    const { getByText } = render(<SetListItem set={set} onDelete={onDelete} />);
    fireEvent(getByText(/Set 1/), 'longPress');
    fireEvent.press(getByText('Delete'));
    expect(onDelete).toHaveBeenCalledWith(42);
  });
});
