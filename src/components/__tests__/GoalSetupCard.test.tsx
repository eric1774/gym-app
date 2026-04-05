jest.mock('../../db', () => ({
  hydrationDb: {
    setWaterGoal: jest.fn().mockResolvedValue({ id: 1, goalOz: 64, createdAt: '', updatedAt: '' }),
  },
}));

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { GoalSetupCard } from '../GoalSetupCard';
import { hydrationDb } from '../../db';

describe('GoalSetupCard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders title "Set Your Daily Water Goal" and a TextInput with value "64"', () => {
    const { getByText, getByDisplayValue } = render(
      <GoalSetupCard onGoalSet={jest.fn()} />,
    );
    expect(getByText('Set Your Daily Water Goal')).toBeTruthy();
    expect(getByDisplayValue('64')).toBeTruthy();
  });

  it('renders "Set Goal" button', () => {
    const { getByText } = render(<GoalSetupCard onGoalSet={jest.fn()} />);
    expect(getByText('Set Goal')).toBeTruthy();
  });

  it('shows error "Please enter a number greater than 0" when input is "0" and Set Goal is pressed', () => {
    const { getByText, getByDisplayValue } = render(
      <GoalSetupCard onGoalSet={jest.fn()} />,
    );
    const input = getByDisplayValue('64');
    fireEvent.changeText(input, '0');
    fireEvent.press(getByText('Set Goal'));
    expect(getByText('Please enter a number greater than 0')).toBeTruthy();
  });

  it('shows error "Please enter a number greater than 0" when input is empty string and Set Goal is pressed', () => {
    const { getByText, getByDisplayValue } = render(
      <GoalSetupCard onGoalSet={jest.fn()} />,
    );
    const input = getByDisplayValue('64');
    fireEvent.changeText(input, '');
    fireEvent.press(getByText('Set Goal'));
    expect(getByText('Please enter a number greater than 0')).toBeTruthy();
  });

  it('shows error "Please enter a number greater than 0" when input is "abc" and Set Goal is pressed', () => {
    const { getByText, getByDisplayValue } = render(
      <GoalSetupCard onGoalSet={jest.fn()} />,
    );
    const input = getByDisplayValue('64');
    fireEvent.changeText(input, 'abc');
    fireEvent.press(getByText('Set Goal'));
    expect(getByText('Please enter a number greater than 0')).toBeTruthy();
  });

  it('calls hydrationDb.setWaterGoal(64) and onGoalSet callback when default value "64" is submitted', async () => {
    const onGoalSet = jest.fn().mockResolvedValue(undefined);
    const { getByText } = render(<GoalSetupCard onGoalSet={onGoalSet} />);
    fireEvent.press(getByText('Set Goal'));
    await waitFor(() => expect(hydrationDb.setWaterGoal).toHaveBeenCalledWith(64));
    expect(onGoalSet).toHaveBeenCalled();
  });

  it('calls hydrationDb.setWaterGoal(128) and onGoalSet callback when user types "128" and submits', async () => {
    const onGoalSet = jest.fn().mockResolvedValue(undefined);
    const { getByText, getByDisplayValue } = render(
      <GoalSetupCard onGoalSet={onGoalSet} />,
    );
    const input = getByDisplayValue('64');
    fireEvent.changeText(input, '128');
    fireEvent.press(getByText('Set Goal'));
    await waitFor(() => expect(hydrationDb.setWaterGoal).toHaveBeenCalledWith(128));
    expect(onGoalSet).toHaveBeenCalled();
  });
});
