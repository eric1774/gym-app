import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { fontSize, weightBold, weightRegular } from '../theme/typography';

interface WaterCupProps {
  currentOz: number;  // Today's total water intake
  goalOz: number;     // Daily goal (will be 64 as default from parent, never 0)
}

const CUP_WIDTH = 120;
const CUP_HEIGHT = 200;

export const WaterCup = React.memo(function WaterCup({ currentOz, goalOz }: WaterCupProps) {
  const percentage = Math.min(Math.round((currentOz / goalOz) * 100), 100);
  const fillFraction = Math.min(currentOz / goalOz, 1); // 0 to 1, capped at 1
  const isGoalMet = currentOz >= goalOz;
  const fillHeight = fillFraction * CUP_HEIGHT;

  return (
    <View style={styles.container}>
      {/* Cup */}
      <View
        style={styles.cup}
        accessibilityLabel={`Water intake: ${currentOz} of ${goalOz} fl oz (${percentage}%)`}
        accessibilityRole="progressbar"
      >
        {/* Fill (water) — rises from the bottom */}
        {fillHeight > 0 && (
          <View style={[styles.fill, { height: fillHeight }]}>
            {/* Soft water-surface gradient at top edge of fill */}
            <View style={styles.fillSurface} />
          </View>
        )}

        {/* Goal met checkmark overlay */}
        {isGoalMet && (
          <View style={styles.goalMetOverlay} pointerEvents="none">
            <Text style={styles.checkmark}>{'\u2713'}</Text>
          </View>
        )}
      </View>

      {/* Labels to the right of the cup */}
      <View style={styles.labels}>
        <Text style={styles.primaryLabel}>
          {currentOz} / {goalOz} oz
        </Text>
        <Text style={styles.percentageLabel}>{percentage}%</Text>
        {isGoalMet && (
          <Text style={styles.goalMetLabel}>Goal met!</Text>
        )}
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xl,
  },
  cup: {
    width: CUP_WIDTH,
    height: CUP_HEIGHT,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    backgroundColor: colors.accentDim,
  },
  fill: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.accent,
  },
  fillSurface: {
    height: 8,
    backgroundColor: colors.accent,
    opacity: 0.6,
  },
  goalMetOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkmark: {
    fontSize: 32,
    fontWeight: weightBold,
    color: colors.onAccent,
  },
  labels: {
    justifyContent: 'center',
  },
  primaryLabel: {
    fontSize: fontSize.lg,
    fontWeight: weightBold,
    color: colors.primary,
  },
  percentageLabel: {
    fontSize: fontSize.sm,
    fontWeight: weightRegular,
    color: colors.secondary,
    marginTop: spacing.xs,
  },
  goalMetLabel: {
    fontSize: fontSize.sm,
    fontWeight: weightBold,
    color: colors.accent,
    marginTop: spacing.sm,
  },
});
