import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { AddExerciseModal } from '../AddExerciseModal';
import { addExercise } from '../../db/exercises';

jest.mock('../../db/exercises', () => ({
  addExercise: jest.fn().mockResolvedValue({
    id: 1,
    name: 'Test Exercise',
    category: 'chest',
    defaultRestSeconds: 90,
    isCustom: true,
    measurementType: 'reps',
    createdAt: '',
  }),
  updateExercise: jest.fn().mockResolvedValue({
    id: 1,
    name: 'Updated',
    category: 'back',
    defaultRestSeconds: 90,
    isCustom: true,
    measurementType: 'reps',
    createdAt: '',
  }),
}));

const mockAddExercise = addExercise as jest.Mock;

describe('AddExerciseModal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAddExercise.mockResolvedValue({
      id: 1,
      name: 'Test Exercise',
      category: 'chest',
      defaultRestSeconds: 90,
      isCustom: true,
      measurementType: 'reps',
      createdAt: '',
    });
  });

  it('renders Add Exercise title when visible', () => {
    const { getAllByText } = render(
      <AddExerciseModal visible={true} onClose={jest.fn()} onAdded={jest.fn()} />,
    );

    // Title and button both say 'Add Exercise'
    const elements = getAllByText('Add Exercise');
    expect(elements.length).toBeGreaterThanOrEqual(1);
  });

  it('submit is disabled when name is empty', () => {
    const onAdded = jest.fn();

    const { getAllByText } = render(
      <AddExerciseModal visible={true} onClose={jest.fn()} onAdded={onAdded} />,
    );

    // Press submit without filling in name
    const buttons = getAllByText('Add Exercise');
    fireEvent.press(buttons[buttons.length - 1]);

    expect(mockAddExercise).not.toHaveBeenCalled();
    expect(onAdded).not.toHaveBeenCalled();
  });

  it('submit is disabled when category not selected', () => {
    const onAdded = jest.fn();

    const { getByPlaceholderText, getAllByText } = render(
      <AddExerciseModal visible={true} onClose={jest.fn()} onAdded={onAdded} />,
    );

    // Fill name but don't select category
    fireEvent.changeText(getByPlaceholderText('e.g. Bulgarian Split Squat'), 'Squat');

    const buttons = getAllByText('Add Exercise');
    fireEvent.press(buttons[buttons.length - 1]);

    expect(mockAddExercise).not.toHaveBeenCalled();
  });

  it('calls addExercise and onAdded with valid form', async () => {
    const onAdded = jest.fn();

    const { getByPlaceholderText, getByText, getAllByText } = render(
      <AddExerciseModal visible={true} onClose={jest.fn()} onAdded={onAdded} />,
    );

    // Fill name
    fireEvent.changeText(getByPlaceholderText('e.g. Bulgarian Split Squat'), 'Hip Thrust');
    // Select category
    fireEvent.press(getByText('Legs'));
    // Select measurement type
    fireEvent.press(getByText('Reps'));
    // Submit
    const buttons = getAllByText('Add Exercise');
    fireEvent.press(buttons[buttons.length - 1]);

    await waitFor(() => {
      expect(mockAddExercise).toHaveBeenCalledWith('Hip Thrust', 'legs', 90, 'reps');
    });

    expect(onAdded).toHaveBeenCalled();
  });
});
