import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { ExerciseCategoryTabs } from '../components/ExerciseCategoryTabs';
import { addExercise } from '../db/exercises';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { fontSize, weightBold, weightSemiBold } from '../theme/typography';
import { Exercise, ExerciseCategory } from '../types';

interface AddExerciseModalProps {
  visible: boolean;
  onClose: () => void;
  onAdded: (exercise: Exercise) => void;
}

export function AddExerciseModal({ visible, onClose, onAdded }: AddExerciseModalProps) {
  const [name, setName] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<ExerciseCategory>('chest');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isDisabled = name.trim() === '' || isSubmitting;

  const handleClose = () => {
    setName('');
    setSelectedCategory('chest');
    setError(null);
    setIsSubmitting(false);
    onClose();
  };

  const handleSubmit = async () => {
    if (isDisabled) {
      return;
    }
    setIsSubmitting(true);
    setError(null);
    try {
      const exercise = await addExercise(name.trim(), selectedCategory, 90);
      onAdded(exercise);
      handleClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add exercise. Please try again.');
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={handleClose}>
      <Pressable style={styles.overlay} onPress={handleClose} />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoid}>
        <View style={styles.sheet}>
          <Text style={styles.title}>Add Exercise</Text>

          <Text style={styles.label}>Exercise Name</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. Bulgarian Split Squat"
            placeholderTextColor={colors.secondary}
            value={name}
            onChangeText={setName}
            autoFocus
            returnKeyType="done"
            onSubmitEditing={handleSubmit}
            maxLength={50}
          />
          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          <Text style={[styles.label, styles.categoryLabel]}>Category</Text>
          <ExerciseCategoryTabs selected={selectedCategory} onSelect={setSelectedCategory} />

          <TouchableOpacity
            style={[styles.submitButton, isDisabled && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={isDisabled}>
            <Text style={styles.submitButtonText}>Add Exercise</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.cancelButton} onPress={handleClose}>
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
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
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xxxl,
    paddingHorizontal: spacing.base,
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
  categoryLabel: {
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
    marginTop: spacing.xs,
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
