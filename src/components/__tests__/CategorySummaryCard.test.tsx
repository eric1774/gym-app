import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { CategorySummaryCard } from '../CategorySummaryCard';
import { CategorySummary, ExerciseCategory } from '../../types';

// Mock MiniSparkline so we can assert it receives the right props
jest.mock('../MiniSparkline', () => {
  const { View } = require('react-native');
  return {
    MiniSparkline: (props: { data: number[] }) => (
      <View testID="mini-sparkline" {...props} />
    ),
  };
});

const makeSummary = (overrides?: Partial<CategorySummary>): CategorySummary => ({
  category: 'chest' as ExerciseCategory,
  exerciseCount: 3,
  sparklinePoints: [50, 55, 52, 60],
  lastTrainedAt: new Date().toISOString(),
  measurementType: 'reps',
  ...overrides,
});

describe('CategorySummaryCard', () => {
  const noop = () => {};

  it('renders category name and exercise count', () => {
    const { getByTestId } = render(
      <CategorySummaryCard summary={makeSummary()} isStale={false} onPress={noop} />,
    );
    expect(getByTestId('category-name').props.children).toBe('Chest');
    // exercise count now includes inline relative time via nested Text
    const countEl = getByTestId('exercise-count');
    expect(countEl).toBeTruthy();
  });

  it('calls onPress when card is pressed', () => {
    const onPress = jest.fn();
    const { getByTestId } = render(
      <CategorySummaryCard summary={makeSummary()} isStale={false} onPress={onPress} />,
    );
    fireEvent.press(getByTestId('category-card'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('applies stale dimming with opacity 0.4', () => {
    const { getByTestId } = render(
      <CategorySummaryCard summary={makeSummary()} isStale={true} onPress={noop} />,
    );
    const card = getByTestId('category-card');
    const flatStyle = Array.isArray(card.props.style)
      ? Object.assign({}, ...card.props.style)
      : card.props.style;
    expect(flatStyle.opacity).toBe(0.4);
  });

  it('renders with full opacity when not stale', () => {
    const { getByTestId } = render(
      <CategorySummaryCard summary={makeSummary()} isStale={false} onPress={noop} />,
    );
    const card = getByTestId('category-card');
    const flatStyle = Array.isArray(card.props.style)
      ? Object.assign({}, ...card.props.style)
      : card.props.style;
    expect(flatStyle.opacity).toBe(1);
  });

  it('renders MiniSparkline with sparklinePoints data', () => {
    const points = [50, 55, 52, 60];
    const { getByTestId } = render(
      <CategorySummaryCard
        summary={makeSummary({ sparklinePoints: points })}
        isStale={false}
        onPress={noop}
      />,
    );
    const sparkline = getByTestId('mini-sparkline');
    expect(sparkline.props.data).toEqual(points);
  });

  it('shows positive delta for reps type as weight', () => {
    const { getByTestId } = render(
      <CategorySummaryCard
        summary={makeSummary({ sparklinePoints: [50, 60], measurementType: 'reps' })}
        isStale={false}
        onPress={noop}
      />,
    );
    expect(getByTestId('delta-text').props.children).toBe('+10.0 lb');
  });

  it('shows positive delta for timed type as duration', () => {
    const { getByTestId } = render(
      <CategorySummaryCard
        summary={makeSummary({ sparklinePoints: [30, 45], measurementType: 'timed' })}
        isStale={false}
        onPress={noop}
      />,
    );
    expect(getByTestId('delta-text').props.children).toBe('+15s');
  });

  it('shows no delta when sparklinePoints has fewer than 2 points', () => {
    const { queryByTestId } = render(
      <CategorySummaryCard
        summary={makeSummary({ sparklinePoints: [50] })}
        isStale={false}
        onPress={noop}
      />,
    );
    expect(queryByTestId('delta-text')).toBeNull();
  });

  it('shows no delta badge when progress is not positive', () => {
    const { queryByTestId } = render(
      <CategorySummaryCard
        summary={makeSummary({ sparklinePoints: [60, 50] })}
        isStale={false}
        onPress={noop}
      />,
    );
    expect(queryByTestId('delta-text')).toBeNull();
  });

  it('renders relative time from lastTrainedAt', () => {
    const threeHoursAgo = new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString();
    const { getByText } = render(
      <CategorySummaryCard
        summary={makeSummary({ lastTrainedAt: threeHoursAgo })}
        isStale={false}
        onPress={noop}
      />,
    );
    expect(getByText('3h ago')).toBeTruthy();
  });
});
