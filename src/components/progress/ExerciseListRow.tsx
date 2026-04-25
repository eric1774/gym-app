import React from 'react';
import { TouchableOpacity, View, Text, StyleSheet } from 'react-native';
import { ExerciseListItem } from '../../types';
import { MiniSparkline } from '../MiniSparkline';
import { formatRelativeTime } from '../../utils/formatRelativeTime';
import { colors, getCategoryColor } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { fontSize, weightSemiBold } from '../../theme/typography';

interface Props {
  item: ExerciseListItem;
  onPress: (exerciseId: number) => void;
}

const formatDelta = (pct: number | null): string => {
  if (pct === null) { return '—'; }
  const rounded = Math.round(pct);
  if (rounded === 0) { return '— 0%'; }
  if (rounded > 0) { return `▲ ${rounded}%`; }
  return `▼ ${Math.abs(rounded)}%`;
};

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export const ExerciseListRow: React.FC<Props> = ({ item, onPress }) => {
  const accent = getCategoryColor(item.category);
  const lastTrainedText = item.lastTrainedAt ? formatRelativeTime(item.lastTrainedAt) : '—';
  return (
    <TouchableOpacity
      testID="exercise-row"
      style={styles.row}
      activeOpacity={0.7}
      onPress={() => onPress(item.exerciseId)}>
      <View testID="exercise-row-accent" style={[styles.accent, { backgroundColor: accent }]} />
      <View style={styles.left}>
        <Text style={styles.name} numberOfLines={1}>{item.exerciseName}</Text>
        <Text style={styles.meta}>
          {cap(item.category)} · {item.sessionCount} sessions · {lastTrainedText}
        </Text>
      </View>
      <View style={styles.sparkline}>
        <MiniSparkline
          data={item.sparklinePoints.length > 0 ? item.sparklinePoints : [0]}
          width={50}
          height={24}
          color={accent}
          strokeWidth={1.5}
        />
      </View>
      <Text testID="exercise-row-delta" style={styles.delta}>
        {formatDelta(item.deltaPercent14d)}
      </Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  row: {
    backgroundColor: colors.surfaceElevated,
    borderColor: colors.slateBorder,
    borderWidth: 1,
    borderRadius: 12,
    padding: 9,
    marginBottom: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    position: 'relative',
  },
  accent: {
    position: 'absolute',
    left: 0,
    top: 6,
    bottom: 6,
    width: 2.5,
    borderTopRightRadius: 2,
    borderBottomRightRadius: 2,
  },
  left: { flex: 1, minWidth: 0, paddingLeft: spacing.xs + 1 },
  name: {
    color: colors.primary,
    fontSize: fontSize.sm,
    fontWeight: weightSemiBold,
    marginBottom: 2,
  },
  meta: { color: colors.secondary, fontSize: fontSize.xs },
  sparkline: { width: 50, height: 24 },
  delta: {
    color: colors.textSoft,
    fontSize: fontSize.xs,
    fontWeight: weightSemiBold,
    minWidth: 48,
    textAlign: 'right',
  },
});
