import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { CategorySummary } from '../types';
import { MiniSparkline } from './MiniSparkline';
import { formatRelativeTime } from '../utils/formatRelativeTime';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { fontSize, weightSemiBold } from '../theme/typography';

interface CategorySummaryCardProps {
  summary: CategorySummary;
  isStale: boolean;
  onPress: () => void;
}

function formatDelta(summary: CategorySummary): string | null {
  const { sparklinePoints, measurementType } = summary;
  if (sparklinePoints.length < 2) {
    return null;
  }
  const delta = sparklinePoints[sparklinePoints.length - 1] - sparklinePoints[0];
  if (delta <= 0) {
    return '–';
  }
  if (measurementType === 'reps') {
    return `+${delta.toFixed(1)} kg`;
  }
  // timed
  return `+${Math.round(delta)}s`;
}

export const CategorySummaryCard: React.FC<CategorySummaryCardProps> = ({
  summary,
  isStale,
  onPress,
}) => {
  const delta = formatDelta(summary);
  const isDeltaPositive =
    summary.sparklinePoints.length >= 2 &&
    summary.sparklinePoints[summary.sparklinePoints.length - 1] -
      summary.sparklinePoints[0] >
      0;

  return (
    <TouchableOpacity
      testID="category-card"
      style={[styles.card, { opacity: isStale ? 0.4 : 1 }]}
      activeOpacity={0.7}
      onPress={onPress}>
      <View style={styles.row}>
        <View style={styles.textContainer}>
          <Text testID="category-name" style={styles.categoryName}>
            {summary.category.charAt(0).toUpperCase() + summary.category.slice(1)}
          </Text>
          <Text testID="exercise-count" style={styles.exerciseCount}>
            {summary.exerciseCount} {summary.exerciseCount === 1 ? 'exercise' : 'exercises'}
          </Text>
          {delta !== null && (
            <Text
              testID="delta-text"
              style={[
                styles.deltaText,
                isDeltaPositive ? styles.deltaPositive : styles.deltaNeutral,
              ]}>
              {delta}
            </Text>
          )}
          <Text style={styles.relativeTime}>
            {formatRelativeTime(summary.lastTrainedAt)}
          </Text>
        </View>
        <View style={styles.sparklineContainer}>
          <MiniSparkline data={summary.sparklinePoints} />
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.base,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  textContainer: {
    flex: 1,
  },
  categoryName: {
    color: colors.primary,
    fontSize: fontSize.base,
    fontWeight: weightSemiBold,
  },
  exerciseCount: {
    color: colors.secondary,
    fontSize: fontSize.sm,
    marginTop: spacing.xs,
  },
  deltaText: {
    fontSize: fontSize.sm,
    marginTop: spacing.xs,
  },
  deltaPositive: {
    color: colors.accent,
  },
  deltaNeutral: {
    color: colors.secondary,
  },
  relativeTime: {
    color: colors.secondary,
    fontSize: fontSize.xs,
    marginTop: spacing.xs,
  },
  sparklineContainer: {
    marginLeft: spacing.sm,
  },
});
