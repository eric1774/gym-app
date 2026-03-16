import React from 'react';
import { Alert } from 'react-native';
import { render, fireEvent } from '@testing-library/react-native';
import { ExerciseListItem } from '../ExerciseListItem';
import { Exercise } from '../../types';

const mockExercise: Exercise = {
  id: 1,
  name: 'Bench Press',
  category: 'chest',
  measurementType: 'reps',
  defaultRestSeconds: 90,
};

const timedExercise: Exercise = {
  id: 2,
  name: 'Plank',
  category: 'core',
  measurementType: 'timed',
  defaultRestSeconds: 30,
};

describe('ExerciseListItem', () => {
  it('renders exercise name', () => {
    const { getByText } = render(
      <ExerciseListItem exercise={mockExercise} />,
    );
    expect(getByText('Bench Press')).toBeTruthy();
  });

  it('renders Timed badge for timed exercises', () => {
    const { getByText } = render(
      <ExerciseListItem exercise={timedExercise} />,
    );
    expect(getByText('Plank')).toBeTruthy();
    expect(getByText('Timed')).toBeTruthy();
  });

  it('does not render Timed badge for reps exercises', () => {
    const { queryByText } = render(
      <ExerciseListItem exercise={mockExercise} />,
    );
    expect(queryByText('Timed')).toBeNull();
  });

  it('calls onSelect when tapped (non-swipeable)', () => {
    const onSelect = jest.fn();
    const { getByText } = render(
      <ExerciseListItem exercise={mockExercise} onSelect={onSelect} />,
    );
    fireEvent.press(getByText('Bench Press'));
    expect(onSelect).toHaveBeenCalledTimes(1);
  });

  it('renders without crashing when no callbacks provided', () => {
    const { getByText } = render(
      <ExerciseListItem exercise={mockExercise} />,
    );
    expect(getByText('Bench Press')).toBeTruthy();
  });

  it('shows Delete button when onDelete is provided (swipeable mode)', () => {
    const onDelete = jest.fn();
    const { getByText } = render(
      <ExerciseListItem exercise={mockExercise} onDelete={onDelete} />,
    );
    expect(getByText('Delete')).toBeTruthy();
  });

  it('shows Alert when Delete button is pressed', () => {
    const alertSpy = jest.spyOn(Alert, 'alert');
    const onDelete = jest.fn();
    const { getByText } = render(
      <ExerciseListItem exercise={mockExercise} onDelete={onDelete} />,
    );

    fireEvent.press(getByText('Delete'));

    expect(alertSpy).toHaveBeenCalledWith(
      'Delete Exercise',
      expect.stringContaining('Bench Press'),
      expect.arrayContaining([
        expect.objectContaining({ text: 'Cancel' }),
        expect.objectContaining({ text: 'Delete' }),
      ]),
    );
    alertSpy.mockRestore();
  });

  it('calls onDelete when Delete alert is confirmed', () => {
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(
      (_title, _msg, buttons) => {
        const deleteButton = buttons?.find((b: any) => b.text === 'Delete');
        deleteButton?.onPress?.();
      },
    );
    const onDelete = jest.fn();
    const { getByText } = render(
      <ExerciseListItem exercise={mockExercise} onDelete={onDelete} />,
    );

    fireEvent.press(getByText('Delete'));

    expect(onDelete).toHaveBeenCalledTimes(1);
    alertSpy.mockRestore();
  });

  it('does not call onDelete when Cancel is pressed', () => {
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(
      (_title, _msg, buttons) => {
        const cancelButton = buttons?.find((b: any) => b.text === 'Cancel');
        cancelButton?.onPress?.();
      },
    );
    const onDelete = jest.fn();
    const { getByText } = render(
      <ExerciseListItem exercise={mockExercise} onDelete={onDelete} />,
    );

    fireEvent.press(getByText('Delete'));

    expect(onDelete).not.toHaveBeenCalled();
    alertSpy.mockRestore();
  });

  it('calls onLongPress when long pressed', () => {
    const onLongPress = jest.fn();
    const { getByText } = render(
      <ExerciseListItem exercise={mockExercise} onLongPress={onLongPress} />,
    );
    fireEvent(getByText('Bench Press'), 'longPress');
    expect(onLongPress).toHaveBeenCalledTimes(1);
  });

  it('renders without Delete button when no onDelete prop', () => {
    const { queryByText } = render(
      <ExerciseListItem exercise={mockExercise} onSelect={jest.fn()} />,
    );
    expect(queryByText('Delete')).toBeNull();
  });
});
