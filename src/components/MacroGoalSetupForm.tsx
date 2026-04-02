import React, { useState, useRef } from 'react';
import {
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { macrosDb } from '../db';
import { computeCalories } from '../utils/macros';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { fontSize, weightBold, weightRegular } from '../theme/typography';

interface MacroGoalSetupFormProps {
  onGoalSet: () => void;
}

export function MacroGoalSetupForm({ onGoalSet }: MacroGoalSetupFormProps) {
  const [proteinValue, setProteinValue] = useState('');
  const [carbsValue, setCarbsValue] = useState('');
  const [fatValue, setFatValue] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const carbsRef = useRef<TextInput>(null);
  const fatRef = useRef<TextInput>(null);

  const proteinNum = parseInt(proteinValue, 10);
  const carbsNum = parseInt(carbsValue, 10);
  const fatNum = parseInt(fatValue, 10);

  const proteinCalc = isNaN(proteinNum) ? 0 : proteinNum;
  const carbsCalc = isNaN(carbsNum) ? 0 : carbsNum;
  const fatCalc = isNaN(fatNum) ? 0 : fatNum;

  const estimatedCalories = computeCalories(proteinCalc, carbsCalc, fatCalc);

  const isDisabled =
    proteinValue.trim() === '' ||
    isNaN(proteinNum) ||
    proteinNum <= 0 ||
    isSubmitting;

  const handleSubmit = async () => {
    const parsedProtein = parseInt(proteinValue, 10);
    if (isNaN(parsedProtein) || parsedProtein <= 0) {
      setError('Please enter a protein goal greater than 0');
      return;
    }

    const parsedCarbs = parseInt(carbsValue, 10);
    const parsedFat = parseInt(fatValue, 10);

    setIsSubmitting(true);
    setError(null);

    try {
      const goals: { protein: number; carbs?: number; fat?: number } = {
        protein: parsedProtein,
      };
      if (!isNaN(parsedCarbs) && parsedCarbs > 0) {
        goals.carbs = parsedCarbs;
      }
      if (!isNaN(parsedFat) && parsedFat > 0) {
        goals.fat = parsedFat;
      }
      await macrosDb.setMacroGoals(goals);
      onGoalSet();
    } catch {
      setError('Failed to set goals. Please try again.');
      setIsSubmitting(false);
    }
  };

  return (
    <View style={styles.card}>
      <Text style={styles.title}>Set your daily goals</Text>
      <Text style={styles.subtitle}>Set daily targets for your macros</Text>

      {/* Protein input */}
      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Protein (g) *</Text>
        <TextInput
          style={styles.input}
          value={proteinValue}
          onChangeText={setProteinValue}
          keyboardType="number-pad"
          maxLength={5}
          returnKeyType="next"
          onSubmitEditing={() => carbsRef.current?.focus()}
          placeholderTextColor={colors.secondary}
          textAlign="center"
        />
      </View>

      {/* Carbs input */}
      <View style={[styles.inputGroup, styles.inputGroupGap]}>
        <Text style={styles.inputLabel}>Carbs (g)</Text>
        <TextInput
          ref={carbsRef}
          style={styles.input}
          value={carbsValue}
          onChangeText={setCarbsValue}
          keyboardType="number-pad"
          maxLength={5}
          returnKeyType="next"
          onSubmitEditing={() => fatRef.current?.focus()}
          placeholderTextColor={colors.secondary}
          textAlign="center"
        />
      </View>

      {/* Fat input */}
      <View style={[styles.inputGroup, styles.inputGroupGap]}>
        <Text style={styles.inputLabel}>Fat (g)</Text>
        <TextInput
          ref={fatRef}
          style={styles.input}
          value={fatValue}
          onChangeText={setFatValue}
          keyboardType="number-pad"
          maxLength={5}
          returnKeyType="done"
          onSubmitEditing={handleSubmit}
          placeholderTextColor={colors.secondary}
          textAlign="center"
        />
      </View>

      <Text style={styles.requiredNote}>* Required</Text>

      {/* Live calorie estimate */}
      <Text style={styles.calorieEstimate}>
        ~ {Math.round(estimatedCalories).toLocaleString()} calories/day
      </Text>

      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      <TouchableOpacity
        style={[styles.submitButton, isDisabled && styles.submitButtonDisabled]}
        onPress={handleSubmit}
        disabled={isDisabled}>
        <Text style={styles.submitButtonText}>Set Goals</Text>
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
    fontWeight: weightRegular,
    color: colors.secondary,
    textAlign: 'center',
    marginBottom: spacing.base,
  },
  inputGroup: {
    width: '100%',
  },
  inputGroupGap: {
    marginTop: spacing.sm,
  },
  inputLabel: {
    fontSize: fontSize.sm,
    fontWeight: weightBold,
    color: colors.secondary,
    marginBottom: spacing.xs,
  },
  input: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: 8,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.base,
    fontSize: fontSize.base,
    color: colors.primary,
    width: '100%',
    textAlign: 'center',
  },
  requiredNote: {
    fontSize: fontSize.sm,
    fontWeight: weightRegular,
    color: colors.secondary,
    marginTop: spacing.xs,
    textAlign: 'center',
    alignSelf: 'flex-start',
  },
  calorieEstimate: {
    fontSize: fontSize.md,
    fontWeight: weightBold,
    color: colors.primary,
    textAlign: 'center',
    marginTop: spacing.base,
  },
  errorText: {
    fontSize: fontSize.sm,
    color: colors.danger,
    marginTop: spacing.xs,
    textAlign: 'center',
  },
  submitButton: {
    backgroundColor: colors.accent,
    borderRadius: 12,
    paddingVertical: spacing.base,
    width: '100%',
    marginTop: spacing.base,
    alignItems: 'center',
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  submitButtonText: {
    color: colors.background,
    fontSize: fontSize.base,
    fontWeight: weightBold,
  },
});
