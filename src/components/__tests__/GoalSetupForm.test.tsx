jest.mock('../../db', () => ({
  setProteinGoal: jest.fn().mockResolvedValue({ id: 1, dailyGoalGrams: 200, createdAt: '', updatedAt: '' }),
}));

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { GoalSetupForm } from '../GoalSetupForm';
import { setProteinGoal } from '../../db';

describe('GoalSetupForm', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders title and input', () => {
    const { getByText, getByPlaceholderText } = render(
      <GoalSetupForm onGoalSet={jest.fn()} />,
    );

    expect(getByText('Set your daily goal')).toBeTruthy();
    expect(getByPlaceholderText('200')).toBeTruthy();
  });

  it('shows error for invalid input (0)', () => {
    const { getByText, getByPlaceholderText } = render(
      <GoalSetupForm onGoalSet={jest.fn()} />,
    );

    fireEvent.changeText(getByPlaceholderText('200'), '0');
    fireEvent.press(getByText('Set Goal'));
    expect(getByText('Please enter a number greater than 0')).toBeTruthy();
  });

  it('shows error for non-numeric input', () => {
    const { getByText, getByPlaceholderText } = render(
      <GoalSetupForm onGoalSet={jest.fn()} />,
    );

    fireEvent.changeText(getByPlaceholderText('200'), 'abc');
    fireEvent.press(getByText('Set Goal'));
    expect(getByText('Please enter a number greater than 0')).toBeTruthy();
  });

  it('calls setProteinGoal and onGoalSet on valid submit', async () => {
    const onGoalSet = jest.fn();
    const { getByText, getByPlaceholderText } = render(
      <GoalSetupForm onGoalSet={onGoalSet} />,
    );

    fireEvent.changeText(getByPlaceholderText('200'), '150');
    fireEvent.press(getByText('Set Goal'));

    await waitFor(() => expect(setProteinGoal).toHaveBeenCalledWith(150));
    expect(onGoalSet).toHaveBeenCalledWith(150);
  });
});
