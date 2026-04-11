import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { colors } from '../theme/colors';
import { fontSize, weightMedium } from '../theme/typography';
import { spacing } from '../theme/spacing';

interface Props {
  targetSets: number;
  targetReps: number;
  targetWeightLbs: number;
  onEdit?: () => void;
}

export function ProgramTargetReference({ targetSets, targetReps, targetWeightLbs, onEdit }: Props) {
  const weightPart = targetWeightLbs > 0 ? ` @ ${targetWeightLbs}lb` : '';

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={onEdit}
      disabled={!onEdit}
      activeOpacity={0.7}>
      <Text style={styles.label}>Target:</Text>
      <Text style={styles.targetText}>
        {targetSets}x{targetReps}{weightPart}
      </Text>
      {onEdit && <Text style={styles.editIcon}>{'\u270E'}</Text>}
    </TouchableOpacity>
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
    flex: 1,
  },
  editIcon: {
    fontSize: fontSize.sm,
    color: colors.secondary,
    marginLeft: spacing.xs,
  },
});
