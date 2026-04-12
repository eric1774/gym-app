import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { MuscleGroupPicker } from '../MuscleGroupPicker';
import { MuscleGroup, ExerciseCategory } from '../../types';

const mockGroups: MuscleGroup[] = [
  { id: 1, name: 'Upper Chest', parentCategory: 'chest', sortOrder: 1 },
  { id: 2, name: 'Lower Chest', parentCategory: 'chest', sortOrder: 2 },
  { id: 3, name: 'Biceps', parentCategory: 'arms', sortOrder: 1 },
  { id: 4, name: 'Triceps', parentCategory: 'arms', sortOrder: 2 },
];

jest.mock('../../db/muscleGroups', () => ({
  getAllMuscleGroups: jest.fn(),
}));

import { getAllMuscleGroups } from '../../db/muscleGroups';

describe('MuscleGroupPicker', () => {
  const onChangeMock = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (getAllMuscleGroups as jest.Mock).mockResolvedValue(mockGroups);
  });

  it('renders parent category chips', async () => {
    const { getByText } = render(
      <MuscleGroupPicker selected={[]} onChange={onChangeMock} />,
    );
    await waitFor(() => expect(getByText('Chest')).toBeTruthy());
    expect(getByText('Arms')).toBeTruthy();
  });

  it('shows muscle groups when a parent category is tapped', async () => {
    const { getByText } = render(
      <MuscleGroupPicker selected={[]} onChange={onChangeMock} />,
    );
    await waitFor(() => expect(getByText('Chest')).toBeTruthy());
    fireEvent.press(getByText('Chest'));
    await waitFor(() => expect(getByText('Upper Chest')).toBeTruthy());
    expect(getByText('Lower Chest')).toBeTruthy();
  });

  it('calls onChange when a muscle group is selected', async () => {
    const { getByText } = render(
      <MuscleGroupPicker selected={[]} onChange={onChangeMock} />,
    );
    await waitFor(() => expect(getByText('Chest')).toBeTruthy());
    fireEvent.press(getByText('Chest'));
    await waitFor(() => expect(getByText('Upper Chest')).toBeTruthy());
    fireEvent.press(getByText('Upper Chest'));
    expect(onChangeMock).toHaveBeenCalledWith([{ muscleGroupId: 1, isPrimary: true }]);
  });
});
