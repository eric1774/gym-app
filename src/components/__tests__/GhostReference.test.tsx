import React from 'react';
import { render } from '@testing-library/react-native';
import { GhostReference } from '../GhostReference';
import { WorkoutSet } from '../../types';

const makeSet = (overrides: Partial<WorkoutSet> = {}): WorkoutSet => ({
  id: 1,
  sessionId: 1,
  exerciseId: 1,
  setNumber: 1,
  weightKg: 135,
  reps: 10,
  loggedAt: '',
  isWarmup: false,
  ...overrides,
});

describe('GhostReference', () => {
  it('returns null for empty sets', () => {
    const { toJSON } = render(<GhostReference sets={[]} />);
    expect(toJSON()).toBeNull();
  });

  it('returns null for undefined sets', () => {
    const { toJSON } = render(<GhostReference sets={undefined as any} />);
    expect(toJSON()).toBeNull();
  });

  it('renders horizontal layout for 1-3 sets', () => {
    const sets = [makeSet({ setNumber: 1 }), makeSet({ id: 2, setNumber: 2 })];
    const { getByText } = render(<GhostReference sets={sets} />);
    expect(getByText(/Set 1: 135lb/)).toBeTruthy();
  });

  it('renders timed format when isTimed=true', () => {
    const sets = [makeSet({ reps: 90 })];
    const { getByText } = render(<GhostReference sets={sets} isTimed={true} />);
    expect(getByText(/Set 1: 01:30/)).toBeTruthy();
  });
});
