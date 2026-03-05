import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme/colors';
import { fontSize, weightMedium } from '../theme/typography';
import { spacing } from '../theme/spacing';

interface Props {
  targetSets: number;
  targetReps: number;
  targetWeightKg: number;
}

export function ProgramTargetReference({ targetSets, targetReps, targetWeightKg }: Props) {
  const weightPart = targetWeightKg > 0 ? ` @ ${targetWeightKg}kg` : '';

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Target:</Text>
      <Text style={styles.targetText}>
        {targetSets}x{targetReps}{weightPart}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.base,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  label: {
    fontSize: fontSize.sm,
    color: colors.accent,
    fontWeight: weightMedium,
  },
  targetText: {
    fontSize: fontSize.sm,
    color: colors.accent,
  },
});
