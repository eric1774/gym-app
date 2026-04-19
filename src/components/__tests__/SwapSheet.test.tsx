import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { SwapSheet } from '../SwapSheet';
import { Exercise } from '../../types';

const mockExercise: Exercise = {
  id: 1,
  name: 'Bench Press',
  category: 'chest',
  defaultRestSeconds: 90,
  isCustom: false,
  measurementType: 'reps',
  createdAt: '2026-01-01',
};

const mockAlternatives = [
  { exercise: { ...mockExercise, id: 2, name: 'Incline Bench' }, matchCount: 3 },
  { exercise: { ...mockExercise, id: 3, name: 'Cable Fly' }, matchCount: 1 },
];

const mockMuscleGroups = [
  { muscleGroupId: 1, name: 'Chest', parentCategory: 'chest' as const, isPrimary: true },
  { muscleGroupId: 5, name: 'Triceps', parentCategory: 'arms' as const, isPrimary: false },
  { muscleGroupId: 6, name: 'Front Delts', parentCategory: 'shoulders' as const, isPrimary: false },
];

jest.mock('../../db/muscleGroups', () => ({
  getExerciseMuscleGroups: jest.fn(),
  getExercisesByMuscleGroups: jest.fn(),
}));

import { getExerciseMuscleGroups, getExercisesByMuscleGroups } from '../../db/muscleGroups';

describe('SwapSheet', () => {
  const onSelect = jest.fn();
  const onClose = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (getExerciseMuscleGroups as jest.Mock).mockResolvedValue(mockMuscleGroups);
    (getExercisesByMuscleGroups as jest.Mock).mockResolvedValue(mockAlternatives);
  });

  it('renders the exercise name in the header', async () => {
    const { getByText } = render(
      <SwapSheet
        visible
        exercise={mockExercise}
        excludeExerciseIds={[1]}
        onSelect={onSelect}
        onClose={onClose}
      />,
    );
    await waitFor(() => expect(getByText('Swap Bench Press')).toBeTruthy());
  });

  it('shows exact and partial match sections', async () => {
    const { getByText } = render(
      <SwapSheet
        visible
        exercise={mockExercise}
        excludeExerciseIds={[1]}
        onSelect={onSelect}
        onClose={onClose}
      />,
    );
    await waitFor(() => expect(getByText('Incline Bench')).toBeTruthy());
    expect(getByText('Cable Fly')).toBeTruthy();
  });

  it('calls onSelect when an alternative is tapped', async () => {
    const { getByText } = render(
      <SwapSheet
        visible
        exercise={mockExercise}
        excludeExerciseIds={[1]}
        onSelect={onSelect}
        onClose={onClose}
      />,
    );
    await waitFor(() => expect(getByText('Incline Bench')).toBeTruthy());
    fireEvent.press(getByText('Incline Bench'));
    expect(onSelect).toHaveBeenCalledWith(expect.objectContaining({ id: 2, name: 'Incline Bench' }));
  });
});
