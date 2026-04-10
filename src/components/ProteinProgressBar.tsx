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
  average: number | null;
  onGoalChanged: (newGoal: number) => void;
}

export function ProteinProgressBar({ goal, current, average, onGoalChanged }: ProteinProgressBarProps) {
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
      <View style={styles.wrapper}>
        <Text style={styles.sectionHeader}>PROTEIN DAILY GOAL</Text>
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
      </View>
    );
  }

  return (
    <View style={styles.wrapper}>
      <Text style={styles.sectionHeader}>PROTEIN DAILY GOAL</Text>
      <TouchableOpacity
        style={styles.container}
        onPress={handleStartEdit}
        activeOpacity={0.7}>
        <View style={styles.barRow}>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${Math.max(percentage, 12)}%` }]}>
              <Text style={styles.percentText}>{percentage}%</Text>
            </View>
          </View>
        </View>

        <View style={styles.divider} />
        <View style={styles.infoRow}>
          <Text style={styles.infoText}>
            {parseFloat(current.toFixed(2))}g consumed / {goal}g goal
          </Text>
        </View>

        {average !== null && (
          <>
            <View style={styles.divider} />
            <View style={styles.infoRow}>
              <Text style={styles.infoText}>
                7-day avg: {parseFloat(average.toFixed(2))}g
              </Text>
            </View>
          </>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    paddingHorizontal: spacing.base,
    marginTop: spacing.base,
  },
  sectionHeader: {
    fontSize: fontSize.sm,
    fontWeight: weightBold,
    color: colors.secondary,
    letterSpacing: 1.2,
    marginBottom: spacing.sm,
  },
  container: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  barRow: {
    padding: spacing.base,
  },
  progressTrack: {
    height: 28,
    backgroundColor: '#33373D',
    borderRadius: 14,
    overflow: 'hidden',
  },
  progressFill: {
    height: 28,
    backgroundColor: colors.accent,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 50,
  },
  percentText: {
    fontSize: fontSize.sm,
    fontWeight: weightBold,
    color: colors.onAccent,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
  },
  infoRow: {
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
  },
  infoText: {
    fontSize: fontSize.base,
    color: colors.secondary,
  },
  editLabel: {
    fontSize: fontSize.sm,
    color: colors.secondary,
    fontWeight: weightSemiBold,
    paddingHorizontal: spacing.base,
    paddingTop: spacing.base,
  },
  input: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: 10,
    padding: spacing.md,
    fontSize: fontSize.base,
    color: colors.primary,
    marginHorizontal: spacing.base,
    marginTop: spacing.sm,
  },
  errorText: {
    fontSize: fontSize.sm,
    color: colors.danger,
    marginTop: spacing.xs,
    paddingHorizontal: spacing.base,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    padding: spacing.base,
  },
  saveButton: {
    flex: 1,
    backgroundColor: colors.accent,
    borderRadius: 12,
    paddingVertical: spacing.sm,
    alignItems: 'center',
  },
  saveButtonText: {
    color: colors.onAccent,
    fontSize: fontSize.sm,
    fontWeight: weightSemiBold,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: colors.surfaceElevated,
    borderRadius: 12,
    paddingVertical: spacing.sm,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: colors.secondary,
    fontSize: fontSize.sm,
    fontWeight: weightSemiBold,
  },
});
