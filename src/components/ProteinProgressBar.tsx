import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { setProteinGoal } from '../db';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { fontSize, weightBold, weightSemiBold } from '../theme/typography';

interface ProteinProgressBarProps {
  goal: number;
  current: number;
  onGoalChanged: (newGoal: number) => void;
}

export function ProteinProgressBar({ goal, current, onGoalChanged }: ProteinProgressBarProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState('');
  const [error, setError] = useState<string | null>(null);

  const progress = goal > 0 ? Math.min(current / goal, 1) : 0;
  const percentage = Math.round(progress * 100);

  const handleStartEdit = () => {
    setEditValue(String(goal));
    setError(null);
    setIsEditing(true);
  };

  const handleSave = async () => {
    const parsed = parseInt(editValue, 10);
    if (isNaN(parsed) || parsed <= 0) {
      setError('Please enter a number greater than 0');
      return;
    }

    setError(null);
    try {
      await setProteinGoal(parsed);
      onGoalChanged(parsed);
      setIsEditing(false);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to update goal. Please try again.',
      );
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    setError(null);
  };

  if (isEditing) {
    return (
      <View style={styles.container}>
        <Text style={styles.editLabel}>Daily protein goal (grams)</Text>
        <TextInput
          style={styles.input}
          value={editValue}
          onChangeText={setEditValue}
          keyboardType="number-pad"
          autoFocus
          returnKeyType="done"
          onSubmitEditing={handleSave}
          maxLength={5}
        />
        {error ? <Text style={styles.errorText}>{error}</Text> : null}
        <View style={styles.buttonRow}>
          <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
            <Text style={styles.saveButtonText}>Save</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.cancelButton} onPress={handleCancel}>
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={handleStartEdit}
      activeOpacity={0.7}>
      <Text style={styles.progressText}>
        {percentage}% {'\u2014'} {current}g / {goal}g
      </Text>
      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${percentage}%` }]} />
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: spacing.base,
    marginTop: spacing.base,
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: spacing.base,
  },
  progressText: {
    fontSize: fontSize.base,
    fontWeight: weightBold,
    color: colors.primary,
    marginBottom: spacing.sm,
  },
  progressTrack: {
    height: 8,
    backgroundColor: colors.surfaceElevated,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: 8,
    backgroundColor: colors.accent,
    borderRadius: 4,
  },
  editLabel: {
    fontSize: fontSize.sm,
    color: colors.secondary,
    fontWeight: weightSemiBold,
    marginBottom: spacing.xs,
  },
  input: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: 8,
    padding: spacing.md,
    fontSize: fontSize.base,
    color: colors.primary,
  },
  errorText: {
    fontSize: fontSize.sm,
    color: colors.danger,
    marginTop: spacing.xs,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  saveButton: {
    flex: 1,
    backgroundColor: colors.accent,
    borderRadius: 8,
    paddingVertical: spacing.sm,
    alignItems: 'center',
  },
  saveButtonText: {
    color: colors.background,
    fontSize: fontSize.sm,
    fontWeight: weightSemiBold,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: colors.surfaceElevated,
    borderRadius: 8,
    paddingVertical: spacing.sm,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: colors.secondary,
    fontSize: fontSize.sm,
    fontWeight: weightSemiBold,
  },
});
