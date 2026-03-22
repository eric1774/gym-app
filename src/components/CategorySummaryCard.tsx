import React, { useCallback, useState } from 'react';
import { LayoutChangeEvent, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { CategorySummary, ExerciseCategory } from '../types';
import { MiniSparkline } from './MiniSparkline';
import { formatRelativeTime } from '../utils/formatRelativeTime';
import { colors, getCategoryColor } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { fontSize, weightSemiBold, weightBold } from '../theme/typography';

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
    return null;
  }
  if (measurementType === 'reps') {
    return `+${delta.toFixed(1)} lb`;
  }
  return `+${Math.round(delta)}s`;
}

export const CategorySummaryCard: React.FC<CategorySummaryCardProps> = ({
  summary,
  isStale,
  onPress,
}) => {
  const delta = formatDelta(summary);
  const accentColor = getCategoryColor(summary.category);
  const categoryLabel = summary.category.charAt(0).toUpperCase() + summary.category.slice(1);
  const [sparkWidth, setSparkWidth] = useState(0);

  const onSparklineLayout = useCallback((e: LayoutChangeEvent) => {
    setSparkWidth(e.nativeEvent.layout.width);
  }, []);

  return (
    <TouchableOpacity
      testID="category-card"
      style={[styles.card, { opacity: isStale ? 0.4 : 1 }]}
      activeOpacity={0.7}
      onPress={onPress}>
      {/* Left accent bar */}
      <View style={[styles.accentBar, { backgroundColor: accentColor }]} />

      <View style={styles.content}>
        {/* Header row: name + delta badge */}
        <View style={styles.headerRow}>
          <Text testID="category-name" style={styles.categoryName}>
            {categoryLabel}
          </Text>
          {delta !== null && (
            <View style={[styles.deltaBadge, { backgroundColor: accentColor + '1A' }]}>
              <Text
                testID="delta-text"
                style={[styles.deltaText, { color: accentColor }]}>
                {delta}
              </Text>
            </View>
          )}
        </View>

        {/* Subtitle row: exercise count + time */}
        <Text testID="exercise-count" style={styles.subtitle}>
          {summary.exerciseCount} {summary.exerciseCount === 1 ? 'exercise' : 'exercises'}
          <Text style={styles.subtitleDot}> · </Text>
          <Text style={styles.relativeTime}>{formatRelativeTime(summary.lastTrainedAt)}</Text>
        </Text>

        {/* Sparkline with gradient fill — stretches to full card width */}
        <View style={styles.sparklineContainer} onLayout={onSparklineLayout}>
          <MiniSparkline
            data={summary.sparklinePoints}
            width={sparkWidth || 280}
            height={40}
            color={accentColor}
            strokeWidth={2}
            showGradientFill
          />
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
    flexDirection: 'row',
    overflow: 'hidden',
  },
  accentBar: {
    width: 3,
    borderTopLeftRadius: 14,
    borderBottomLeftRadius: 14,
  },
  content: {
    flex: 1,
    padding: spacing.base,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  categoryName: {
    color: colors.primary,
    fontSize: fontSize.md,
    fontWeight: weightBold,
  },
  deltaBadge: {
    borderRadius: 8,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  deltaText: {
    fontSize: fontSize.xs,
    fontWeight: weightSemiBold,
  },
  subtitle: {
    color: colors.secondary,
    fontSize: fontSize.sm,
    marginTop: spacing.xs,
  },
  subtitleDot: {
    color: colors.secondary,
  },
  relativeTime: {
    color: colors.secondary,
  },
  sparklineContainer: {
    marginTop: spacing.md,
  },
});
