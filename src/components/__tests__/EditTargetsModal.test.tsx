import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { EditTargetsModal } from '../EditTargetsModal';

const baseProps = {
  visible: true,
  onClose: jest.fn(),
  exerciseName: 'Bench Press',
  programDayExerciseId: 1,
  scope: 'base' as const,
  baseSets: 3,
  baseReps: 10,
  baseWeightLbs: 135,
  baseNote: null,
  initialSets: 3,
  initialReps: 10,
  initialWeightLbs: 135,
  initialNote: null,
  setsOverridden: false,
  repsOverridden: false,
  weightOverridden: false,
  notesOverridden: false,
};

describe('EditTargetsModal', () => {
  it('renders exercise name and pre-fills targets', () => {
    const { getByText, getByDisplayValue } = render(
      <EditTargetsModal {...baseProps} onSave={jest.fn()} />,
    );

    expect(getByText('Bench Press')).toBeTruthy();
    expect(getByDisplayValue('3')).toBeTruthy();
    expect(getByDisplayValue('10')).toBeTruthy();
    expect(getByDisplayValue('135')).toBeTruthy();
  });

  it('shows error for invalid sets', () => {
    const { getByText, getByDisplayValue } = render(
      <EditTargetsModal {...baseProps} onSave={jest.fn()} />,
    );

    fireEvent.changeText(getByDisplayValue('3'), '0');
    fireEvent.press(getByText('Save'));
    expect(getByText('Sets must be a positive number')).toBeTruthy();
  });

  it('shows error for invalid reps', () => {
    const { getByText, getByDisplayValue } = render(
      <EditTargetsModal {...baseProps} onSave={jest.fn()} />,
    );

    fireEvent.changeText(getByDisplayValue('10'), 'abc');
    fireEvent.press(getByText('Save'));
    expect(getByText('Reps must be a positive number')).toBeTruthy();
  });

  it('shows error for negative weight', () => {
    const { getByText, getByDisplayValue } = render(
      <EditTargetsModal {...baseProps} onSave={jest.fn()} />,
    );

    fireEvent.changeText(getByDisplayValue('135'), '-5');
    fireEvent.press(getByText('Save'));
    expect(getByText('Weight must be zero or more')).toBeTruthy();
  });

  it('calls onSave with parsed values in base scope', async () => {
    const onSave = jest.fn();
    const { getByText, getByDisplayValue } = render(
      <EditTargetsModal {...baseProps} onSave={onSave} />,
    );

    fireEvent.changeText(getByDisplayValue('3'), '4');
    fireEvent.changeText(getByDisplayValue('10'), '8');
    fireEvent.changeText(getByDisplayValue('135'), '185');
    fireEvent.press(getByText('Save'));

    expect(onSave).toHaveBeenCalledWith({
      sets: { inherit: false, value: 4 },
      reps: { inherit: false, value: 8 },
      weight: { inherit: false, value: 185 },
      notes: { inherit: false, value: null },
    });
  });
});
