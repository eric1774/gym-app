import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, fontSize, spacing, weightSemiBold } from '../theme';

interface StreakAverageRowProps {
  streak: number;
  average: number | null;
}

export const StreakAverageRow = React.memo(function StreakAverageRow({
  streak,
  average,
}: StreakAverageRowProps) {
  if (streak === 0 && average === null) {
    return null;
  }

  return (
    <View style={styles.container}>
      {streak > 0 && (
        <Text style={styles.streakText}>
          {'\uD83D\uDD25'} {streak} day streak
        </Text>
      )}
      {streak > 0 && average !== null && (
        <Text style={styles.separator}> {'\u2022'} </Text>
      )}
      {average !== null && (
        <Text style={styles.averageText}>7-day avg: {average}g</Text>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: spacing.base,
    marginTop: spacing.sm,
  },
  streakText: {
    color: colors.accent,
    fontSize: fontSize.sm,
    fontWeight: weightSemiBold,
  },
  separator: {
    color: colors.secondary,
    fontSize: fontSize.sm,
  },
  averageText: {
    color: colors.secondary,
    fontSize: fontSize.sm,
  },
});
