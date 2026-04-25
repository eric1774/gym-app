import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { NavigationContainer } from '@react-navigation/native';
import { SessionDayProgressScreen } from '../SessionDayProgressScreen';
import { colors } from '../../theme/colors';

jest.mock('../../db/progress', () => ({
  getSessionDayExerciseProgress: jest.fn(async () => [
    { exerciseId: 1, exerciseName: 'Bench Press', volumeChangePercent: 4, strengthChangePercent: 5,
      measurementType: 'reps', category: 'chest' },
    { exerciseId: 2, exerciseName: 'OHP', volumeChangePercent: -5, strengthChangePercent: 0,
      measurementType: 'reps', category: 'shoulders' },
  ]),
}));

const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => {
  const actual = jest.requireActual('@react-navigation/native');
  return {
    ...actual,
    useNavigation: () => ({ navigate: mockNavigate, goBack: jest.fn() }),
    useRoute: () => ({ params: { programDayId: 10, dayName: 'Push Day' } }),
    useFocusEffect: (cb: () => void | (() => void)) => { cb(); },
  };
});

beforeEach(() => mockNavigate.mockClear());

const renderScreen = () => render(
  <NavigationContainer><SessionDayProgressScreen /></NavigationContainer>,
);

describe('SessionDayProgressScreen', () => {
  it('renders all exercises with vol and str deltas', async () => {
    const { findByText, getByText } = renderScreen();
    expect(await findByText('Bench Press')).toBeTruthy();
    expect(getByText('OHP')).toBeTruthy();
  });

  it('negative deltas use textSoft slate, NEVER danger red', async () => {
    const { findAllByTestId } = renderScreen();
    const negativeBadges = await findAllByTestId('delta-negative');
    negativeBadges.forEach(badge => {
      const flat = Array.isArray(badge.props.style)
        ? Object.assign({}, ...badge.props.style)
        : badge.props.style;
      expect(flat.color).toBe(colors.textSoft);
      expect(flat.color).not.toBe(colors.danger);
    });
  });

  it('navigates to ExerciseDetail on row tap', async () => {
    const { findAllByTestId } = renderScreen();
    const rows = await findAllByTestId('sd-exercise-row');
    fireEvent.press(rows[0]);
    expect(mockNavigate).toHaveBeenCalledWith('ExerciseDetail', expect.objectContaining({ exerciseId: 1 }));
  });
});
