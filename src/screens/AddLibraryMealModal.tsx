import React, { useState } from 'react';
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
import { addLibraryMeal } from '../db';
import { MealType } from '../types';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { fontSize, weightBold, weightSemiBold } from '../theme/typography';

interface AddLibraryMealModalProps {
  visible: boolean;
  onClose: () => void;
  onSaved: () => void;
}

export function AddLibraryMealModal({ visible, onClose, onSaved }: AddLibraryMealModalProps) {
  const [name, setName] = useState('');
  const [proteinGrams, setProteinGrams] = useState('');
  const [mealType, setMealType] = useState<MealType | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleClose = () => {
    setName('');
    setProteinGrams('');
    setMealType(null);
    setIsSubmitting(false);
    setError(null);
    onClose();
  };

  const parsedGrams = parseFloat(proteinGrams);
  const isDisabled =
    name.trim() === '' ||
    proteinGrams.trim() === '' ||
    isNaN(parsedGrams) ||
    parsedGrams <= 0 ||
    mealType === null ||
    isSubmitting;

  const handleSubmit = async () => {
    if (isDisabled) return;

    setIsSubmitting(true);
    setError(null);

    try {
      await addLibraryMeal(name.trim(), parsedGrams, mealType!);
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
        behavior="padding"
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

            <Text style={[styles.label, styles.fieldSpacing]}>
              Protein (grams)
            </Text>
            <TextInput
              style={styles.input}
              placeholder="0"
              placeholderTextColor={colors.secondary}
              value={proteinGrams}
              onChangeText={setProteinGrams}
              keyboardType="decimal-pad"
              returnKeyType="done"
            />

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
              <Text style={styles.cancelText}>Cancel</Text>
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
