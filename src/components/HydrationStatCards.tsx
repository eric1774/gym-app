import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Path, Rect, Line } from 'react-native-svg';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { fontSize, weightBold, weightMedium, weightRegular } from '../theme/typography';

interface HydrationStatCardsProps {
  streakDays: number;
  weeklyAvgOz: number | null;
  goalOz: number;
}

function BoltIcon({ color, size = 18 }: { color: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" fill={color} />
    </Svg>
  );
}

function CalendarSmallIcon({ color, size = 18 }: { color: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect x={3} y={4} width={18} height={17} rx={2} stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      <Line x1={8} y1={2} x2={8} y2={6} stroke={color} strokeWidth={2} strokeLinecap="round" />
      <Line x1={16} y1={2} x2={16} y2={6} stroke={color} strokeWidth={2} strokeLinecap="round" />
      <Line x1={3} y1={9} x2={21} y2={9} stroke={color} strokeWidth={2} strokeLinecap="round" />
    </Svg>
  );
}

function ChevronRightIcon({ size = 16 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M9 18l6-6-6-6"
        stroke={colors.secondary}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export const HydrationStatCards = React.memo(function HydrationStatCards({
  streakDays,
  weeklyAvgOz,
  goalOz,
}: HydrationStatCardsProps) {
  const weeklyAvgPct =
    weeklyAvgOz !== null ? Math.round((weeklyAvgOz / goalOz) * 100) : null;

  return (
    <View style={styles.outerContainer}>
      {/* Streak row */}
      <View
        style={styles.row}
        accessibilityLabel={`Streak: ${streakDays} days`}
      >
        <View style={styles.iconCircle} testID="streak-icon-container">
          <BoltIcon color={colors.accent} size={18} />
        </View>
        <View style={styles.textGroup}>
          <Text style={styles.rowLabel}>Current Streak</Text>
          <Text style={styles.rowValue}>{String(streakDays)}</Text>
          <Text style={styles.rowSubLabel}>day streak</Text>
        </View>
        <ChevronRightIcon size={16} />
      </View>

      <View style={styles.rowDivider} />

      {/* Weekly average row */}
      <View
        style={styles.row}
        accessibilityLabel={
          weeklyAvgPct !== null
            ? `Weekly average: ${weeklyAvgPct}%`
            : 'Weekly average: no data'
        }
      >
        <View style={styles.iconCircle} testID="weeklyavg-icon-container">
          <CalendarSmallIcon color={colors.accent} size={18} />
        </View>
        <View style={styles.textGroup}>
          <Text style={styles.rowLabel}>Weekly Avg</Text>
          <Text style={styles.rowValue}>
            {weeklyAvgPct !== null ? `${weeklyAvgPct}%` : '\u2014'}
          </Text>
          <Text style={styles.rowSubLabel}>7-day avg</Text>
        </View>
        <ChevronRightIcon size={16} />
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  outerContainer: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceElevated,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.base,
    gap: spacing.md,
  },
  rowDivider: {
    height: 1,
    backgroundColor: colors.background,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(141, 194, 138, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  textGroup: {
    flex: 1,
    gap: 1,
  },
  rowLabel: {
    fontSize: fontSize.xs,
    fontWeight: weightMedium,
    color: colors.secondary,
  },
  rowValue: {
    fontSize: fontSize.lg,
    fontWeight: weightBold,
    color: colors.primary,
    lineHeight: fontSize.lg * 1.2,
  },
  rowSubLabel: {
    fontSize: fontSize.xs,
    fontWeight: weightRegular,
    color: colors.secondary,
  },
});
