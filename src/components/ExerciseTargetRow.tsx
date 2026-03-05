import React, { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { fontSize, weightBold, weightSemiBold } from '../theme/typography';
import { Exercise, ProgramDayExercise } from '../types';

interface ExerciseTargetRowProps {
  exercise: Exercise;
  dayExercise: ProgramDayExercise;
  onEdit: () => void;
  onRemove: () => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  isFirst?: boolean;
  isLast?: boolean;
}

export function ExerciseTargetRow({
  exercise,
  dayExercise,
  onEdit,
  onRemove,
  onMoveUp,
  onMoveDown,
  isFirst,
  isLast,
}: ExerciseTargetRowProps) {
  const [showActions, setShowActions] = useState(false);

  const targetsText =
    dayExercise.targetWeightKg > 0
      ? `${dayExercise.targetSets}x${dayExercise.targetReps} @ ${dayExercise.targetWeightKg}lb`
      : `${dayExercise.targetSets}x${dayExercise.targetReps}`;

  return (
    <TouchableOpacity
      style={[styles.container, showActions && styles.containerActive]}
      onPress={onEdit}
      onLongPress={() => setShowActions(prev => !prev)}
      activeOpacity={0.7}>
      {/* Reorder buttons */}
      <View style={styles.reorderColumn}>
        {onMoveUp && !isFirst ? (
          <TouchableOpacity
            style={styles.reorderButton}
            onPress={onMoveUp}
            hitSlop={{ top: 4, bottom: 4, left: 8, right: 8 }}>
            <Text style={styles.reorderIcon}>{'\u25B2'}</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.reorderPlaceholder} />
        )}
        {onMoveDown && !isLast ? (
          <TouchableOpacity
            style={styles.reorderButton}
            onPress={onMoveDown}
            hitSlop={{ top: 4, bottom: 4, left: 8, right: 8 }}>
            <Text style={styles.reorderIcon}>{'\u25BC'}</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.reorderPlaceholder} />
        )}
      </View>

      {/* Exercise info */}
      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={1}>
          {exercise.name}
        </Text>
        <Text style={styles.targets}>{targetsText}</Text>
      </View>

      {/* Long-press reveals remove button */}
      {showActions ? (
        <TouchableOpacity
          style={styles.removeButton}
          onPress={onRemove}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Text style={styles.removeIcon}>{'\u2715'}</Text>
        </TouchableOpacity>
      ) : null}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  containerActive: {
    backgroundColor: colors.surfaceElevated,
  },
  reorderColumn: {
    width: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  reorderButton: {
    width: 28,
    height: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reorderPlaceholder: {
    width: 28,
    height: 22,
  },
  reorderIcon: {
    fontSize: fontSize.xs,
    color: colors.secondary,
  },
  info: {
    flex: 1,
  },
  name: {
    fontSize: fontSize.md,
    fontWeight: weightBold,
    color: colors.primary,
  },
  targets: {
    fontSize: fontSize.sm,
    color: colors.secondary,
    marginTop: 2,
  },
  removeButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeIcon: {
    fontSize: fontSize.base,
    color: colors.danger,
    fontWeight: weightSemiBold,
  },
});
