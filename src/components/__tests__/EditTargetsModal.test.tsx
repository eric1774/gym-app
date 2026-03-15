import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { EditTargetsModal } from '../EditTargetsModal';
import { ProgramDayExercise } from '../../types';

const dayExercise: ProgramDayExercise = {
  id: 1,
  programDayId: 1,
  exerciseId: 1,
  targetSets: 3,
  targetReps: 10,
  targetWeightKg: 135,
  sortOrder: 0,
  supersetGroupId: null,
};

describe('EditTargetsModal', () => {
  it('renders exercise name and pre-fills targets', () => {
    const { getByText, getByDisplayValue } = render(
      <EditTargetsModal
        visible={true}
        onClose={jest.fn()}
        dayExercise={dayExercise}
        exerciseName="Bench Press"
        onSave={jest.fn()}
      />,
    );

    expect(getByText('Bench Press')).toBeTruthy();
    expect(getByDisplayValue('3')).toBeTruthy();
    expect(getByDisplayValue('10')).toBeTruthy();
    expect(getByDisplayValue('135')).toBeTruthy();
  });

  it('shows error for invalid sets', () => {
    const { getByText, getByDisplayValue } = render(
      <EditTargetsModal
        visible={true}
        onClose={jest.fn()}
        dayExercise={dayExercise}
        exerciseName="Bench Press"
        onSave={jest.fn()}
      />,
    );

    fireEvent.changeText(getByDisplayValue('3'), '0');
    fireEvent.press(getByText('Save'));
    expect(getByText('Sets must be a positive number')).toBeTruthy();
  });

  it('shows error for invalid reps', () => {
    const { getByText, getByDisplayValue } = render(
      <EditTargetsModal
        visible={true}
        onClose={jest.fn()}
        dayExercise={dayExercise}
        exerciseName="Bench Press"
        onSave={jest.fn()}
      />,
    );

    fireEvent.changeText(getByDisplayValue('10'), 'abc');
    fireEvent.press(getByText('Save'));
    expect(getByText('Reps must be a positive number')).toBeTruthy();
  });

  it('shows error for negative weight', () => {
    const { getByText, getByDisplayValue } = render(
      <EditTargetsModal
        visible={true}
        onClose={jest.fn()}
        dayExercise={dayExercise}
        exerciseName="Bench Press"
        onSave={jest.fn()}
      />,
    );

    fireEvent.changeText(getByDisplayValue('135'), '-5');
    fireEvent.press(getByText('Save'));
    expect(getByText('Weight must be zero or more')).toBeTruthy();
  });

  it('calls onSave with parsed values', () => {
    const onSave = jest.fn();
    const { getByText, getByDisplayValue } = render(
      <EditTargetsModal
        visible={true}
        onClose={jest.fn()}
        dayExercise={dayExercise}
        exerciseName="Bench Press"
        onSave={onSave}
      />,
    );

    fireEvent.changeText(getByDisplayValue('3'), '4');
    fireEvent.changeText(getByDisplayValue('10'), '8');
    fireEvent.changeText(getByDisplayValue('135'), '185');
    fireEvent.press(getByText('Save'));
    expect(onSave).toHaveBeenCalledWith(1, 4, 8, 185);
  });
});
