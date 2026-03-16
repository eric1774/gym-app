import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';

jest.mock('../../db/sets', () => ({
  logSet: jest.fn(),
  getSetsForExerciseInSession: jest.fn().mockResolvedValue([]),
  getLastSessionSets: jest.fn().mockResolvedValue([]),
  deleteSet: jest.fn().mockResolvedValue(undefined),
}));

import { SetLoggingPanel } from '../SetLoggingPanel';
const { logSet, getSetsForExerciseInSession, getLastSessionSets } = require('../../db/sets');

const defaultProps = {
  sessionId: 1,
  exerciseId: 10,
  onSetLogged: jest.fn(),
};

describe('SetLoggingPanel', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (getSetsForExerciseInSession as jest.Mock).mockResolvedValue([]);
    (getLastSessionSets as jest.Mock).mockResolvedValue([]);
    (logSet as jest.Mock).mockResolvedValue({
      id: 1, sessionId: 1, exerciseId: 10, setNumber: 1,
      weightKg: 135, reps: 10, loggedAt: '2026-01-01T10:00:00Z', isWarmup: false,
    });
  });

  it('renders weight and reps inputs in reps mode (default)', async () => {
    const { getByPlaceholderText, getByText } = render(<SetLoggingPanel {...defaultProps} />);

    expect(getByPlaceholderText('lb')).toBeTruthy();
    expect(getByPlaceholderText('reps')).toBeTruthy();
    expect(getByText('Log Set')).toBeTruthy();
  });

  it('renders stopwatch UI in timed mode', async () => {
    const { getByText } = render(<SetLoggingPanel {...defaultProps} measurementType="timed" />);

    expect(getByText('00:00')).toBeTruthy();
    expect(getByText('Start')).toBeTruthy();
    expect(getByText('Log Time')).toBeTruthy();
  });

  it('increments weight by 5 when +5 stepper is pressed', async () => {
    const { getByPlaceholderText, getByText } = render(<SetLoggingPanel {...defaultProps} />);

    await waitFor(() => getByPlaceholderText('lb'));

    const weightInput = getByPlaceholderText('lb');
    fireEvent.changeText(weightInput, '100');
    fireEvent.press(getByText('+5'));

    expect(weightInput.props.value).toBe('105');
  });

  it('decrements weight by 5 when -5 stepper is pressed', async () => {
    const { getByPlaceholderText, getByText } = render(<SetLoggingPanel {...defaultProps} />);

    await waitFor(() => getByPlaceholderText('lb'));

    const weightInput = getByPlaceholderText('lb');
    fireEvent.changeText(weightInput, '100');
    fireEvent.press(getByText('-5'));

    expect(weightInput.props.value).toBe('95');
  });

  it('does not decrement weight below 0', async () => {
    const { getByPlaceholderText, getByText } = render(<SetLoggingPanel {...defaultProps} />);

    await waitFor(() => getByPlaceholderText('lb'));

    const weightInput = getByPlaceholderText('lb');
    fireEvent.changeText(weightInput, '0');

    // When weight is at 0, the -5 button is disabled — pressing it does not change the value
    fireEvent.press(getByText('-5'));
    expect(weightInput.props.value).toBe('0');
  });

  it('Log Set button calls logSet and onSetLogged on confirm (reps mode)', async () => {
    const onSetLogged = jest.fn();
    const { getByPlaceholderText, getByText } = render(
      <SetLoggingPanel {...defaultProps} onSetLogged={onSetLogged} />
    );

    await waitFor(() => getByPlaceholderText('lb'));

    fireEvent.changeText(getByPlaceholderText('lb'), '135');
    fireEvent.changeText(getByPlaceholderText('reps'), '10');
    fireEvent.press(getByText('Log Set'));

    await waitFor(() => expect(logSet).toHaveBeenCalledWith(1, 10, 135, 10));
    expect(onSetLogged).toHaveBeenCalled();
  });

  it('Log Set is disabled when weight or reps are empty', async () => {
    const onSetLogged = jest.fn();
    const { getByText } = render(<SetLoggingPanel {...defaultProps} onSetLogged={onSetLogged} />);

    await waitFor(() => getByText('Log Set'));

    // Both inputs empty — pressing Log Set should not call logSet or onSetLogged
    fireEvent.press(getByText('Log Set'));

    // logSet should NOT have been called since button is effectively disabled
    expect(logSet).not.toHaveBeenCalled();
    expect(onSetLogged).not.toHaveBeenCalled();
  });

  it('pre-fills weight and reps from last session sets', async () => {
    (getLastSessionSets as jest.Mock).mockResolvedValue([
      { id: 5, sessionId: 99, exerciseId: 10, setNumber: 1, weightKg: 185, reps: 8, loggedAt: '', isWarmup: false },
    ]);
    (getSetsForExerciseInSession as jest.Mock).mockResolvedValue([]);

    const { getByPlaceholderText } = render(<SetLoggingPanel {...defaultProps} />);

    await waitFor(() => {
      const weightInput = getByPlaceholderText('lb');
      expect(weightInput.props.value).toBe('185');
    });

    const repsInput = getByPlaceholderText('reps');
    expect(repsInput.props.value).toBe('8');
  });
});
