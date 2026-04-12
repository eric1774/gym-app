import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { MuscleGroupPicker } from '../components/MuscleGroupPicker';
import { addExercise, updateExercise } from '../db/exercises';
import { getExerciseMuscleGroups } from '../db/muscleGroups';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { fontSize, weightBold, weightSemiBold } from '../theme/typography';
import { Exercise, ExerciseCategory, ExerciseMeasurementType } from '../types';

interface AddExerciseModalProps {
  visible: boolean;
  onClose: () => void;
  onAdded: (exercise: Exercise) => void;
  /** When set, the modal operates in edit mode. */
  editExercise?: Exercise | null;
}

export function AddExerciseModal({ visible, onClose, onAdded, editExercise }: AddExerciseModalProps) {
  const isEditMode = !!editExercise;
  const [name, setName] = useState('');
  const [muscleGroupMappings, setMuscleGroupMappings] = useState<Array<{ muscleGroupId: number; isPrimary: boolean }>>([]);
  const [measurementType, setMeasurementType] = useState<ExerciseMeasurementType | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Pre-fill fields when editing
  React.useEffect(() => {
    if (editExercise && visible) {
      setName(editExercise.name);
      setMeasurementType(editExercise.measurementType);
      // Load existing muscle groups for edit mode
      getExerciseMuscleGroups(editExercise.id).then(groups => {
        setMuscleGroupMappings(
          groups.map(g => ({ muscleGroupId: g.muscleGroupId, isPrimary: g.isPrimary })),
        );
      });
    }
  }, [editExercise, visible]);

  const isDisabled = name.trim() === '' || muscleGroupMappings.length === 0 || measurementType === null || isSubmitting;

  const handleClose = () => {
    setName('');
    setMuscleGroupMappings([]);
    setMeasurementType(null);
    setError(null);
    setIsSubmitting(false);
    onClose();
  };

  const handleSubmit = async () => {
    if (isDisabled || muscleGroupMappings.length === 0 || !measurementType) {
      return;
    }
    setIsSubmitting(true);
    setError(null);
    try {
      // Category will be synced by setExerciseMuscleGroups, but we need it for the initial insert.
      // Use 'chest' as placeholder — setExerciseMuscleGroups will overwrite it.
      const placeholderCategory = 'chest' as ExerciseCategory;
      if (isEditMode && editExercise) {
        const updated = await updateExercise(
          editExercise.id, name.trim(), placeholderCategory, measurementType, muscleGroupMappings,
        );
        onAdded(updated);
      } else {
        const exercise = await addExercise(
          name.trim(), placeholderCategory, 90, measurementType, muscleGroupMappings,
        );
        onAdded(exercise);
      }
      handleClose();
    } catch (err) {
      const action = isEditMode ? 'update' : 'add';
      setError(err instanceof Error ? err.message : `Failed to ${action} exercise. Please try again.`);
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
            <Text style={styles.title}>{isEditMode ? 'Edit Exercise' : 'Add Exercise'}</Text>

            <Text style={styles.label}>Exercise Name</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Bulgarian Split Squat"
              placeholderTextColor={colors.secondary}
              value={name}
              onChangeText={setName}
              autoFocus={!isEditMode}
              returnKeyType="done"
              onSubmitEditing={handleSubmit}
              maxLength={50}
            />
            {error ? <Text style={styles.errorText}>{error}</Text> : null}

            <Text style={[styles.label, styles.categoryLabel]}>Muscle Groups</Text>
            <MuscleGroupPicker
              selected={muscleGroupMappings}
              onChange={setMuscleGroupMappings}
            />

            <Text style={[styles.label, styles.categoryLabel]}>Measurement</Text>
            <View style={styles.toggleRow}>
              <TouchableOpacity
                style={[
                  styles.toggleButton,
                  measurementType === 'reps' ? styles.toggleActive : styles.toggleInactive,
                ]}
                onPress={() => setMeasurementType('reps')}>
                <Text
                  style={[
                    styles.toggleText,
                    measurementType === 'reps'
                      ? styles.toggleTextActive
                      : styles.toggleTextInactive,
                  ]}>
                  Reps
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.toggleButton,
                  measurementType === 'timed' ? styles.toggleActive : styles.toggleInactive,
                ]}
                onPress={() => setMeasurementType('timed')}>
                <Text
                  style={[
                    styles.toggleText,
                    measurementType === 'timed'
                      ? styles.toggleTextActive
                      : styles.toggleTextInactive,
                  ]}>
                  Timed
                </Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={[styles.submitButton, isDisabled && styles.submitButtonDisabled]}
              onPress={handleSubmit}
              disabled={isDisabled}>
              <Text style={styles.submitButtonText}>{isEditMode ? 'Update Exercise' : 'Add Exercise'}</Text>
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
  toggleRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  toggleButton: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: 20,
    alignItems: 'center',
  },
  toggleActive: {
    backgroundColor: colors.accent,
  },
  toggleInactive: {
    backgroundColor: colors.surfaceElevated,
  },
  toggleText: {
    fontSize: fontSize.sm,
    fontWeight: weightSemiBold,
  },
  toggleTextActive: {
    color: colors.background,
  },
  toggleTextInactive: {
    color: colors.secondary,
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
