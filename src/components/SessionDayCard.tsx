import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SessionDayProgress } from '../types';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { fontSize, weightBold, weightSemiBold } from '../theme/typography';
import { formatRelativeTime } from '../utils/formatRelativeTime';

function formatDelta(
  value: number | null,
  label: string,
): { text: string; color: string } {
  if (value === null) {
    return { text: '\u2014', color: colors.secondary };
  }
  const rounded = Math.round(value);
  if (rounded >= 0) {
    return { text: `+${rounded}%`, color: colors.accent };
  }
  return { text: `\u2212${Math.abs(rounded)}%`, color: colors.danger };
}

interface Props {
  day: SessionDayProgress;
  onPress: () => void;
}

export function SessionDayCard({ day, onPress }: Props) {
  const vol = formatDelta(day.volumeChangePercent, 'vol');
  const str = formatDelta(day.strengthChangePercent, 'str');

  let lastTrainedText: string;
  if (day.sessionCount === 0) {
    lastTrainedText = 'Not started';
  } else if (day.sessionCount === 1) {
    lastTrainedText = '1 session only';
  } else {
    lastTrainedText = day.lastTrainedAt
      ? formatRelativeTime(day.lastTrainedAt)
      : '\u2014';
  }

  return (
    <TouchableOpacity
      style={styles.card}
      activeOpacity={0.7}
      onPress={onPress}>
      <Text style={styles.dayName} numberOfLines={2}>{day.dayName}</Text>

      {day.hasPR && (
        <Text style={styles.prFlag}>PR!</Text>
      )}

      <View style={styles.metrics}>
        <View style={styles.metricRow}>
          <Text style={styles.metricLabel}>Vol</Text>
          <Text style={[styles.metricValue, { color: vol.color }]}>{vol.text}</Text>
        </View>
        <View style={styles.metricRow}>
          <Text style={styles.metricLabel}>Str</Text>
          <Text style={[styles.metricValue, { color: str.color }]}>{str.text}</Text>
        </View>
      </View>

      <Text style={styles.lastTrained}>{lastTrainedText}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    width: '48%',
    alignItems: 'center',
    padding: spacing.base,
  },
  dayName: {
    color: colors.primary,
    fontSize: fontSize.sm,
    fontWeight: weightSemiBold,
    textAlign: 'center',
    marginBottom: spacing.sm,
    minHeight: 34,
    lineHeight: 17,
  },
  prFlag: {
    color: colors.prGold,
    fontSize: fontSize.sm,
    fontWeight: weightBold,
    marginBottom: 2,
  },
  metrics: {
    width: '100%',
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  metricRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  metricLabel: {
    color: colors.secondary,
    fontSize: fontSize.xs,
  },
  metricValue: {
    fontSize: fontSize.sm,
    fontWeight: weightSemiBold,
  },
  lastTrained: {
    color: colors.secondary,
    fontSize: fontSize.xs,
  },
});
