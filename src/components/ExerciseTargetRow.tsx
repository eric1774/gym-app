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
  /** If non-null, shows a lightning bolt badge that triggers onUngroup when tapped */
  supersetGroupId?: number | null;
  /** When true, shows a checkbox for selection instead of reorder buttons */
  selectionMode?: boolean;
  /** Checkbox checked state (used when selectionMode is true) */
  isSelected?: boolean;
  /** Called when the checkbox is tapped */
  onSelect?: () => void;
  /** Called when the lightning bolt badge is tapped */
  onUngroup?: () => void;
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
  supersetGroupId,
  selectionMode,
  isSelected,
  onSelect,
  onUngroup,
}: ExerciseTargetRowProps) {
  const [showActions, setShowActions] = useState(false);

  const isTimed = exercise.measurementType === 'timed';
  const targetsText = isTimed
    ? 'Timed'
    : dayExercise.targetWeightKg > 0
      ? `${dayExercise.targetSets}x${dayExercise.targetReps} @ ${dayExercise.targetWeightKg}lb`
      : `${dayExercise.targetSets}x${dayExercise.targetReps}`;

  const isInSuperset = supersetGroupId != null;

  return (
    <TouchableOpacity
      style={[styles.container, showActions && styles.containerActive]}
      onPress={selectionMode ? onSelect : onEdit}
      onLongPress={selectionMode ? undefined : () => setShowActions(prev => !prev)}
      activeOpacity={0.7}>

      {/* Left column: checkbox in selection mode, reorder buttons otherwise */}
      {selectionMode ? (
        <TouchableOpacity
          style={styles.checkboxColumn}
          onPress={onSelect}
          hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}>
          <View style={[styles.checkbox, isSelected && styles.checkboxSelected]}>
            {isSelected && <Text style={styles.checkboxMark}>{'\u2713'}</Text>}
          </View>
        </TouchableOpacity>
      ) : (
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
      )}

      {/* Exercise info */}
      <View style={styles.info}>
        <View style={styles.nameRow}>
          {isInSuperset && !selectionMode && (
            <TouchableOpacity
              onPress={onUngroup}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              style={styles.lightningButton}>
              <Text style={styles.lightningIcon}>{'\u26A1'}</Text>
            </TouchableOpacity>
          )}
          <Text style={styles.name} numberOfLines={1}>
            {exercise.name}
          </Text>
        </View>
        <Text style={styles.targets}>{targetsText}</Text>
      </View>

      {/* Long-press reveals remove button (only outside selection mode) */}
      {!selectionMode && showActions ? (
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
  checkboxColumn: {
    width: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  checkbox: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: colors.secondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxSelected: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  checkboxMark: {
    fontSize: fontSize.sm,
    color: colors.background,
    fontWeight: weightBold,
  },
  info: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  lightningButton: {
    marginRight: 4,
  },
  lightningIcon: {
    fontSize: fontSize.md,
    color: colors.accent,
  },
  name: {
    fontSize: fontSize.md,
    fontWeight: weightBold,
    color: colors.primary,
    flex: 1,
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
