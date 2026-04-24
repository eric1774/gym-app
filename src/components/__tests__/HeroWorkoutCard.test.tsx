import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { HeroWorkoutCard } from '../HeroWorkoutCard';

describe('HeroWorkoutCard', () => {
  const baseProps = {
    dayName: 'Push Day',
    exerciseCount: 6,
    estimatedMinutes: 52,
    programLabel: 'Hypertrophy 5×5',
    weekNumber: 3,
    dayNumber: 4,
    exerciseChips: ['Bench', 'OHP', 'Dips', 'Cable Fly', 'Triceps', 'Lateral'],
    context: { exerciseName: 'Bench', weightLb: 185, reps: 5, addedSinceLastLb: 10 },
    activeElapsedSeconds: null as number | null,
    onPress: jest.fn(),
  };

  it('renders idle state with eyebrow, title, meta, last-session, chips, START', () => {
    const { getByText, getByTestId } = render(<HeroWorkoutCard {...baseProps} />);
    expect(getByText('UP NEXT · WEEK 3 · DAY 4')).toBeTruthy();
    expect(getByText('Push Day')).toBeTruthy();
    expect(getByText('6 exercises · est. 52 min · Hypertrophy 5×5')).toBeTruthy();
    expect(getByText(/Bench 185×5/)).toBeTruthy();
    expect(getByText(/you added 10 lb/)).toBeTruthy();
    expect(getByText('Bench')).toBeTruthy();
    expect(getByText('OHP')).toBeTruthy();
    expect(getByText(/\+3 more/)).toBeTruthy();
    expect(getByTestId('hero-start-button')).toBeTruthy();
  });

  it('renders active state with elapsed timer and CONTINUE button', () => {
    const { getByText } = render(
      <HeroWorkoutCard {...baseProps} activeElapsedSeconds={187} />,
    );
    expect(getByText(/ACTIVE/)).toBeTruthy();
    expect(getByText(/03:07/)).toBeTruthy();
    expect(getByText(/CONTINUE/)).toBeTruthy();
  });

  it('omits last-session line when context is null', () => {
    const { queryByText } = render(<HeroWorkoutCard {...baseProps} context={null} />);
    expect(queryByText(/Last time/)).toBeNull();
  });

  it('omits "you added" suffix when addedSinceLastLb is null', () => {
    const ctx = { exerciseName: 'Bench', weightLb: 185, reps: 5, addedSinceLastLb: null };
    const { getByText, queryByText } = render(<HeroWorkoutCard {...baseProps} context={ctx} />);
    expect(getByText(/Bench 185×5/)).toBeTruthy();
    expect(queryByText(/you added/)).toBeNull();
  });

  it('fires onPress when START button pressed', () => {
    const onPress = jest.fn();
    const { getByTestId } = render(<HeroWorkoutCard {...baseProps} onPress={onPress} />);
    fireEvent.press(getByTestId('hero-start-button'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });
});
