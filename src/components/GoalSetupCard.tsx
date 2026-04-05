import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { hydrationDb } from '../db';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { fontSize, weightBold, weightSemiBold } from '../theme/typography';

interface GoalSetupCardProps {
  onGoalSet: () => Promise<void>;
}

export function GoalSetupCard({ onGoalSet }: GoalSetupCardProps) {
  const [value, setValue] = useState('64');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    const parsed = parseInt(value, 10);
    if (isNaN(parsed) || parsed <= 0) {
      setError('Please enter a number greater than 0');
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      await hydrationDb.setWaterGoal(parsed);
      await onGoalSet();
    } catch (_err) {
      setError('Failed to save goal. Please try again.');
      setIsSubmitting(false);
    }
  };

  return (
    <View style={styles.card}>
      <Text style={styles.title}>Set Your Daily Water Goal</Text>

      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          value={value}
          onChangeText={setValue}
          keyboardType="number-pad"
          maxLength={4}
          autoFocus
          returnKeyType="done"
          onSubmitEditing={handleSubmit}
          accessibilityLabel="Daily water goal input"
        />
        <Text style={styles.suffix}>fl oz</Text>
      </View>

      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      <TouchableOpacity
        style={[styles.setGoalButton, isSubmitting && styles.disabled]}
        onPress={handleSubmit}
        disabled={isSubmitting}
        accessibilityRole="button"
      >
        <Text style={styles.setGoalButtonText}>Set Goal</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.xl,
    marginHorizontal: spacing.base,
    alignItems: 'center',
  },
  title: {
    fontSize: fontSize.sm,
    fontWeight: weightBold,
    color: colors.secondary,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    textAlign: 'center',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.md,
  },
  input: {
    fontSize: fontSize.xl,
    fontWeight: weightBold,
    color: colors.primary,
    textAlign: 'center',
    backgroundColor: 'transparent',
    minWidth: 60,
  },
  suffix: {
    fontSize: fontSize.base,
    fontWeight: weightSemiBold,
    color: colors.secondary,
    marginLeft: spacing.sm,
  },
  errorText: {
    fontSize: fontSize.sm,
    color: colors.danger,
    marginTop: spacing.xs,
  },
  setGoalButton: {
    backgroundColor: colors.accent,
    borderRadius: 12,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.md,
    width: '100%',
  },
  disabled: {
    opacity: 0.5,
  },
  setGoalButtonText: {
    color: colors.onAccent,
    fontSize: fontSize.sm,
    fontWeight: weightBold,
  },
});
