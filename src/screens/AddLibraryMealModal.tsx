import React, { useState, useRef } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { MealTypePills } from '../components/MealTypePills';
import { macrosDb } from '../db';
import { MealType, MACRO_COLORS } from '../types';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { fontSize, weightBold, weightSemiBold } from '../theme/typography';
import { computeCalories } from '../utils/macros';

interface AddLibraryMealModalProps {
  visible: boolean;
  onClose: () => void;
  onSaved: () => void;
}

export function AddLibraryMealModal({ visible, onClose, onSaved }: AddLibraryMealModalProps) {
  const [name, setName] = useState('');
  const [proteinGrams, setProteinGrams] = useState('');
  const [carbsGrams, setCarbsGrams] = useState('');
  const [fatGrams, setFatGrams] = useState('');
  const [mealType, setMealType] = useState<MealType | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const carbsRef = useRef<TextInput>(null);
  const fatRef = useRef<TextInput>(null);

  const handleClose = () => {
    setName('');
    setProteinGrams('');
    setCarbsGrams('');
    setFatGrams('');
    setMealType(null);
    setIsSubmitting(false);
    setError(null);
    onClose();
  };

  const parsedProtein = parseFloat(proteinGrams) || 0;
  const parsedCarbs = parseFloat(carbsGrams) || 0;
  const parsedFat = parseFloat(fatGrams) || 0;

  const isDisabled =
    name.trim() === '' ||
    (parsedProtein <= 0 && parsedCarbs <= 0 && parsedFat <= 0) ||
    mealType === null ||
    isSubmitting;

  const caloriePreview = Math.round(computeCalories(parsedProtein, parsedCarbs, parsedFat));

  const handleSubmit = async () => {
    if (isDisabled) { return; }

    setIsSubmitting(true);
    setError(null);

    try {
      await macrosDb.addLibraryMeal(
        name.trim(),
        mealType!,
        { protein: parsedProtein, carbs: parsedCarbs, fat: parsedFat },
      );
      onSaved();
      handleClose();
    } catch (_err) {
      setError('Failed to save meal. Please try again.');
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={handleClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoid}>
        <Pressable style={styles.overlay} onPress={handleClose} />
        <View style={styles.sheet}>
          <ScrollView
            bounces={false}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}>
            <Text style={styles.title}>Add to Library</Text>

            <Text style={styles.label}>Meal Type</Text>
            <MealTypePills selected={mealType} onSelect={setMealType} />

            <View style={[styles.inputRow, { borderLeftColor: MACRO_COLORS.protein }]}>
              <Text style={styles.label}>Protein (grams)</Text>
              <TextInput
                style={styles.input}
                placeholder="0"
                placeholderTextColor={colors.secondary}
                value={proteinGrams}
                onChangeText={setProteinGrams}
                keyboardType="decimal-pad"
                returnKeyType="next"
                onSubmitEditing={() => carbsRef.current?.focus()}
              />
            </View>
            <View style={[styles.inputRow, { borderLeftColor: MACRO_COLORS.carbs }]}>
              <Text style={styles.label}>Carbs (grams)</Text>
              <TextInput
                ref={carbsRef}
                style={styles.input}
                placeholder="0"
                placeholderTextColor={colors.secondary}
                value={carbsGrams}
                onChangeText={setCarbsGrams}
                keyboardType="decimal-pad"
                returnKeyType="next"
                onSubmitEditing={() => fatRef.current?.focus()}
              />
            </View>
            <View style={[styles.inputRow, { borderLeftColor: MACRO_COLORS.fat }]}>
              <Text style={styles.label}>Fat (grams)</Text>
              <TextInput
                ref={fatRef}
                style={styles.input}
                placeholder="0"
                placeholderTextColor={colors.secondary}
                value={fatGrams}
                onChangeText={setFatGrams}
                keyboardType="decimal-pad"
                returnKeyType="done"
              />
            </View>

            <Text style={styles.caloriePreview}>~ {caloriePreview} calories</Text>

            <Text style={[styles.label, styles.fieldSpacing]}>Name</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Chicken breast"
              placeholderTextColor={colors.secondary}
              value={name}
              onChangeText={setName}
              returnKeyType="done"
            />

            {error ? <Text style={styles.errorText}>{error}</Text> : null}

            <TouchableOpacity
              style={[styles.submitButton, isDisabled && styles.submitButtonDisabled]}
              onPress={handleSubmit}
              disabled={isDisabled}>
              <Text style={styles.submitButtonText}>Save to Library</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.cancelButton} onPress={handleClose}>
              <Text style={styles.cancelText}>Discard</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  keyboardAvoid: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xxxl,
    paddingHorizontal: spacing.base,
    maxHeight: '80%',
  },
  title: {
    fontSize: fontSize.lg,
    fontWeight: weightBold,
    color: colors.primary,
    marginBottom: spacing.lg,
    textAlign: 'center',
  },
  label: {
    fontSize: fontSize.sm,
    color: colors.secondary,
    marginBottom: spacing.xs,
    fontWeight: weightSemiBold,
  },
  fieldSpacing: {
    marginTop: spacing.md,
  },
  inputRow: {
    borderLeftWidth: 3,
    paddingLeft: spacing.md,
    marginBottom: spacing.sm,
    marginTop: spacing.md,
  },
  input: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: 8,
    padding: spacing.md,
    fontSize: fontSize.base,
    color: colors.primary,
  },
  caloriePreview: {
    fontSize: fontSize.lg,
    fontWeight: weightBold,
    color: colors.primary,
    textAlign: 'center',
    marginTop: spacing.md,
  },
  errorText: {
    fontSize: fontSize.sm,
    color: colors.danger,
    marginTop: spacing.sm,
  },
  submitButton: {
    backgroundColor: colors.accent,
    borderRadius: 12,
    paddingVertical: spacing.base,
    alignItems: 'center',
    marginTop: spacing.lg,
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  submitButtonText: {
    color: colors.background,
    fontSize: fontSize.base,
    fontWeight: weightSemiBold,
  },
  cancelButton: {
    alignItems: 'center',
    paddingVertical: spacing.md,
    marginTop: spacing.sm,
  },
  cancelText: {
    color: colors.secondary,
    fontSize: fontSize.sm,
  },
});
