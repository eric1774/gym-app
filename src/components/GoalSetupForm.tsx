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

interface GoalSetupFormProps {
  onGoalSet: (goalGrams: number) => void;
}

export function GoalSetupForm({ onGoalSet }: GoalSetupFormProps) {
  const [value, setValue] = useState('');
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
      await setProteinGoal(parsed);
      onGoalSet(parsed);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to set goal. Please try again.',
      );
      setIsSubmitting(false);
    }
  };

  const isDisabled = value.trim() === '' || isSubmitting;

  return (
    <View style={styles.card}>
      <Text style={styles.title}>Set your daily goal</Text>
      <Text style={styles.subtitle}>
        How many grams of protein do you want to hit each day?
      </Text>

      <TextInput
        style={styles.input}
        placeholder="200"
        placeholderTextColor={colors.secondary}
        keyboardType="number-pad"
        value={value}
        onChangeText={setValue}
        autoFocus
        returnKeyType="done"
        onSubmitEditing={handleSubmit}
        maxLength={5}
      />

      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      <TouchableOpacity
        style={[styles.submitButton, isDisabled && styles.submitButtonDisabled]}
        onPress={handleSubmit}
        disabled={isDisabled}>
        <Text style={styles.submitButtonText}>Set Goal</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: spacing.xl,
    marginHorizontal: spacing.base,
    marginTop: spacing.xxxl,
    alignItems: 'center',
  },
  title: {
    fontSize: fontSize.lg,
    fontWeight: weightBold,
    color: colors.primary,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: fontSize.sm,
    color: colors.secondary,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  input: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: 8,
    padding: spacing.md,
    fontSize: fontSize.base,
    color: colors.primary,
    width: '100%',
    textAlign: 'center',
  },
  errorText: {
    fontSize: fontSize.sm,
    color: colors.danger,
    marginTop: spacing.xs,
  },
  submitButton: {
    backgroundColor: colors.accent,
    borderRadius: 12,
    paddingVertical: spacing.base,
    alignItems: 'center',
    marginTop: spacing.lg,
    width: '100%',
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  submitButtonText: {
    color: colors.background,
    fontSize: fontSize.base,
    fontWeight: weightSemiBold,
  },
});
