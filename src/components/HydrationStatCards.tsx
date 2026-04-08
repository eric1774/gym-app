import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { fontSize, weightBold, weightRegular } from '../theme/typography';

interface HydrationStatCardsProps {
  streakDays: number;
  weeklyAvgOz: number | null;
  goalOz: number; // guaranteed non-null when rendered
}

export const HydrationStatCards = React.memo(function HydrationStatCards({
  streakDays,
  weeklyAvgOz,
  goalOz,
}: HydrationStatCardsProps) {
  const weeklyAvgPct =
    weeklyAvgOz !== null ? Math.round((weeklyAvgOz / goalOz) * 100) : null;

  return (
    <View style={styles.row}>
      {/* Left card — Streak */}
      <View
        style={styles.card}
        accessibilityLabel={`Streak: ${streakDays} days`}
      >
        <Text style={styles.cardEmoji}>{'\uD83D\uDD25'}</Text>
        <Text style={styles.cardValue}>{String(streakDays)}</Text>
        <Text style={styles.cardLabel}>day streak</Text>
      </View>

      {/* Right card — Weekly Average */}
      <View
        style={styles.card}
        accessibilityLabel={
          weeklyAvgPct !== null
            ? `Weekly average: ${weeklyAvgPct}%`
            : 'Weekly average: no data'
        }
      >
        <Text style={styles.cardEmoji}>{'\uD83D\uDCA7'}</Text>
        <Text style={styles.cardValue}>
          {weeklyAvgPct !== null ? `${weeklyAvgPct}%` : '\u2014'}
        </Text>
        <Text style={styles.cardLabel}>7-day avg</Text>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingHorizontal: spacing.base,
    marginTop: spacing.md,
  },
  card: {
    flex: 1,
    backgroundColor: colors.surfaceElevated,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    minHeight: 80,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
  },
  cardEmoji: {
    fontSize: fontSize.base,
  },
  cardValue: {
    fontSize: fontSize.xl,
    fontWeight: weightBold,
    color: colors.primary,
  },
  cardLabel: {
    fontSize: fontSize.xs,
    fontWeight: weightRegular,
    color: colors.secondary,
  },
});
