import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { fontSize, weightMedium } from '../theme/typography';
import { Exercise } from '../types';

interface ExerciseListItemProps {
  exercise: Exercise;
  onDelete?: () => void;
  onSelect?: () => void;
  onLongPress?: () => void;
}

export function ExerciseListItem({ exercise, onDelete, onSelect, onLongPress }: ExerciseListItemProps) {
  const rowContent = (
    <View style={styles.row}>
      <View style={styles.nameContainer}>
        <Text style={styles.name}>{exercise.name}</Text>
        {exercise.measurementType === 'timed' && (
          <View style={styles.timedBadge}>
            <Text style={styles.timedBadgeText}>Timed</Text>
          </View>
        )}
      </View>
      {exercise.isCustom && onDelete ? (
        <TouchableOpacity
          onPress={onDelete}
          style={styles.deleteButton}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Text style={styles.deleteIcon}>✕</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );

  if (onSelect || onLongPress) {
    return (
      <TouchableOpacity
        onPress={onSelect}
        onLongPress={onLongPress}
        delayLongPress={1000}
        style={styles.container}>
        {rowContent}
      </TouchableOpacity>
    );
  }

  return <View style={styles.container}>{rowContent}</View>;
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
    paddingHorizontal: spacing.base,
    paddingVertical: 14,
    minHeight: 48,
    justifyContent: 'center' as const,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  nameContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  name: {
    fontSize: fontSize.base,
    fontWeight: weightMedium,
    color: colors.primary,
    flexShrink: 1,
  },
  timedBadge: {
    backgroundColor: colors.timerActive,
    borderRadius: 10,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  timedBadgeText: {
    fontSize: fontSize.xs,
    fontWeight: weightMedium,
    color: colors.background,
  },
  deleteButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  deleteIcon: {
    fontSize: fontSize.base,
    color: colors.danger,
    fontWeight: weightMedium,
  },
});
