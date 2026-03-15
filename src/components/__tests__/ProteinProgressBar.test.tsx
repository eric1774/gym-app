jest.mock('../../db', () => ({
  setProteinGoal: jest.fn().mockResolvedValue({ id: 1, dailyGoalGrams: 200, createdAt: '', updatedAt: '' }),
}));

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { ProteinProgressBar } from '../ProteinProgressBar';
import { setProteinGoal } from '../../db';

describe('ProteinProgressBar', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('displays percentage and goal text', () => {
    const { getByText } = render(
      <ProteinProgressBar
        goal={200}
        current={100}
        average={null}
        onGoalChanged={jest.fn()}
      />,
    );

    expect(getByText('50%')).toBeTruthy();
    expect(getByText(/100g consumed \/ 200g goal/)).toBeTruthy();
  });

  it('displays 7-day average when provided', () => {
    const { getByText } = render(
      <ProteinProgressBar
        goal={200}
        current={100}
        average={175}
        onGoalChanged={jest.fn()}
      />,
    );

    expect(getByText(/7-day avg: 175g/)).toBeTruthy();
  });

  it('caps percentage at 100%', () => {
    const { getByText } = render(
      <ProteinProgressBar
        goal={100}
        current={150}
        average={null}
        onGoalChanged={jest.fn()}
      />,
    );

    expect(getByText('100%')).toBeTruthy();
  });

  it('enters edit mode on press', () => {
    const { getByText, getByDisplayValue } = render(
      <ProteinProgressBar
        goal={200}
        current={100}
        average={null}
        onGoalChanged={jest.fn()}
      />,
    );

    fireEvent.press(getByText(/consumed/));
    expect(getByText('Daily protein goal (grams)')).toBeTruthy();
    expect(getByDisplayValue('200')).toBeTruthy();
  });

  it('saves new goal in edit mode', async () => {
    const onGoalChanged = jest.fn();
    const { getByText, getByDisplayValue } = render(
      <ProteinProgressBar
        goal={200}
        current={100}
        average={null}
        onGoalChanged={onGoalChanged}
      />,
    );

    fireEvent.press(getByText(/consumed/));
    fireEvent.changeText(getByDisplayValue('200'), '250');
    fireEvent.press(getByText('Save'));

    await waitFor(() => expect(setProteinGoal).toHaveBeenCalledWith(250));
    expect(onGoalChanged).toHaveBeenCalledWith(250);
  });
});
