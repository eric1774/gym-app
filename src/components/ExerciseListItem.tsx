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
}

export function ExerciseListItem({ exercise, onDelete, onSelect }: ExerciseListItemProps) {
  const rowContent = (
    <View style={styles.row}>
      <Text style={styles.name}>{exercise.name}</Text>
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

  if (onSelect) {
    return (
      <TouchableOpacity onPress={onSelect} style={styles.container}>
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
    paddingVertical: spacing.md,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  name: {
    flex: 1,
    fontSize: fontSize.base,
    fontWeight: weightMedium,
    color: colors.primary,
  },
  deleteButton: {
    padding: spacing.xs,
  },
  deleteIcon: {
    fontSize: fontSize.sm,
    color: colors.danger,
    fontWeight: weightMedium,
  },
});
