import React, { useState, useRef, useEffect } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Vibration,
} from 'react-native';
import { foodsDb } from '../db';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { fontSize, weightSemiBold, weightRegular } from '../theme/typography';
import { Food } from '../types';
import { computeCalories } from '../utils/macros';

interface CustomFoodFormProps {
  initialName: string;
  onFoodCreated: (food: Food) => void;
  onBack: () => void;
}

interface FieldErrors {
  name: string | null;
  protein: string | null;
  carbs: string | null;
  fat: string | null;
}

export function CustomFoodForm({ initialName, onFoodCreated, onBack }: CustomFoodFormProps) {
  const [name, setName] = useState(initialName);
  const [proteinStr, setProteinStr] = useState('');
  const [carbsStr, setCarbsStr] = useState('');
  const [fatStr, setFatStr] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({ name: null, protein: null, carbs: null, fat: null });
  const nameInputRef = useRef<TextInput>(null);

  // Auto-focus name field on mount
  useEffect(() => {
    const timer = setTimeout(() => {
      nameInputRef.current?.focus();
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  const parsedProtein = parseFloat(proteinStr) || 0;
  const parsedCarbs = parseFloat(carbsStr) || 0;
  const parsedFat = parseFloat(fatStr) || 0;
  const caloriePreview = Math.round(computeCalories(parsedProtein, parsedCarbs, parsedFat));

  function validateMacroField(value: string): string | null {
    if (value.trim().length === 0) return 'Required';
    const parsed = parseFloat(value);
    if (isNaN(parsed) || parsed < 0) return 'Enter a number';
    return null;
  }

  function validateAll(): boolean {
    const nameError = name.trim().length === 0 ? 'Required' : null;
    const proteinError = validateMacroField(proteinStr);
    const carbsError = validateMacroField(carbsStr);
    const fatError = validateMacroField(fatStr);

    setErrors({ name: nameError, protein: proteinError, carbs: carbsError, fat: fatError });

    return nameError === null && proteinError === null && carbsError === null && fatError === null;
  }

  async function handleSave() {
    if (!validateAll()) return;
    setIsSaving(true);
    try {
      const createdFood = await foodsDb.createCustomFood(
        name.trim(),
        parsedProtein,
        parsedCarbs,
        parsedFat,
      );
      Vibration.vibrate(50);
      onFoodCreated(createdFood);
    } catch (_err) {
      setErrors(prev => ({ ...prev, name: 'Failed to save. Please try again.' }));
      setIsSaving(false);
    }
  }

  return (
    <View style={styles.root}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={onBack}
          accessibilityLabel="Go back"
          accessibilityRole="button">
          <Text style={styles.backButtonText}>{'<'}</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>New Custom Food</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>
        {/* Name field */}
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Name</Text>
          <TextInput
            ref={nameInputRef}
            style={styles.input}
            value={name}
            onChangeText={(text) => {
              setName(text);
              if (errors.name) setErrors(prev => ({ ...prev, name: null }));
            }}
            placeholder="Food name"
            placeholderTextColor={colors.secondary}
            autoCapitalize="words"
            autoCorrect={false}
            selectionColor={colors.accent}
            accessibilityLabel="Food name"
          />
          {errors.name && <Text style={styles.errorText}>{errors.name}</Text>}
        </View>

        {/* Protein per 100g */}
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Protein per 100g</Text>
          <TextInput
            style={styles.input}
            value={proteinStr}
            onChangeText={(text) => {
              setProteinStr(text);
              if (errors.protein) setErrors(prev => ({ ...prev, protein: null }));
            }}
            placeholder="0"
            placeholderTextColor={colors.secondary}
            keyboardType="decimal-pad"
            selectionColor={colors.accent}
            accessibilityLabel="Protein per 100g in grams"
          />
          {errors.protein && <Text style={styles.errorText}>{errors.protein}</Text>}
        </View>

        {/* Carbs per 100g */}
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Carbs per 100g</Text>
          <TextInput
            style={styles.input}
            value={carbsStr}
            onChangeText={(text) => {
              setCarbsStr(text);
              if (errors.carbs) setErrors(prev => ({ ...prev, carbs: null }));
            }}
            placeholder="0"
            placeholderTextColor={colors.secondary}
            keyboardType="decimal-pad"
            selectionColor={colors.accent}
            accessibilityLabel="Carbs per 100g in grams"
          />
          {errors.carbs && <Text style={styles.errorText}>{errors.carbs}</Text>}
        </View>

        {/* Fat per 100g */}
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Fat per 100g</Text>
          <TextInput
            style={styles.input}
            value={fatStr}
            onChangeText={(text) => {
              setFatStr(text);
              if (errors.fat) setErrors(prev => ({ ...prev, fat: null }));
            }}
            placeholder="0"
            placeholderTextColor={colors.secondary}
            keyboardType="decimal-pad"
            selectionColor={colors.accent}
            accessibilityLabel="Fat per 100g in grams"
          />
          {errors.fat && <Text style={styles.errorText}>{errors.fat}</Text>}
        </View>

        {/* Calories (auto-computed) */}
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Calories (auto-computed)</Text>
          <View style={styles.caloriesDisplay}>
            <Text
              style={styles.caloriesText}
              accessibilityLabel="Calories, auto-computed"
              accessibilityHint="Updates as you enter macros">
              {caloriePreview > 0 ? String(caloriePreview) : '—'}
            </Text>
          </View>
        </View>

        {/* Save CTA */}
        <TouchableOpacity
          style={[styles.saveButton, isSaving && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={isSaving}
          accessibilityLabel="Save Custom Food"
          accessibilityRole="button">
          <Text style={styles.saveButtonText}>Save Custom Food</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.base,
    paddingBottom: spacing.md,
  },
  backButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backButtonText: {
    fontSize: fontSize.lg,
    color: colors.primary,
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: fontSize.md,
    fontWeight: weightSemiBold,
    color: colors.primary,
  },
  headerSpacer: {
    width: 44,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.base,
    paddingBottom: spacing.xxxl,
  },
  fieldGroup: {
    marginBottom: spacing.base,
  },
  label: {
    fontSize: fontSize.sm,
    fontWeight: weightSemiBold,
    color: colors.secondary,
    marginBottom: spacing.xs,
  },
  input: {
    backgroundColor: colors.surface,
    borderRadius: 10,
    height: 48,
    paddingHorizontal: spacing.base,
    fontSize: fontSize.base,
    color: colors.primary,
  },
  errorText: {
    fontSize: fontSize.sm,
    color: colors.danger,
    marginTop: spacing.xs,
  },
  caloriesDisplay: {
    backgroundColor: colors.surface,
    borderRadius: 10,
    height: 48,
    paddingHorizontal: spacing.base,
    justifyContent: 'center',
  },
  caloriesText: {
    fontSize: fontSize.base,
    color: colors.secondary,
  },
  saveButton: {
    backgroundColor: colors.accent,
    height: 52,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: spacing.lg,
  },
  saveButtonDisabled: {
    opacity: 0.5,
  },
  saveButtonText: {
    fontSize: fontSize.base,
    fontWeight: weightSemiBold,
    color: colors.onAccent,
  },
});
