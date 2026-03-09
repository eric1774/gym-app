import React, { useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { fontSize, weightBold, weightSemiBold } from '../theme/typography';
import { ProgramDayExercise } from '../types';

interface EditTargetsModalProps {
  visible: boolean;
  onClose: () => void;
  dayExercise: ProgramDayExercise | null;
  exerciseName: string;
  onSave: (id: number, sets: number, reps: number, weight: number) => void;
}

export function EditTargetsModal({
  visible,
  onClose,
  dayExercise,
  exerciseName,
  onSave,
}: EditTargetsModalProps) {
  const [sets, setSets] = useState('');
  const [reps, setReps] = useState('');
  const [weight, setWeight] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (dayExercise && visible) {
      setSets(String(dayExercise.targetSets));
      setReps(String(dayExercise.targetReps));
      setWeight(String(dayExercise.targetWeightKg));
      setError(null);
    }
  }, [dayExercise, visible]);

  const handleSave = () => {
    if (!dayExercise) { return; }

    const setsNum = parseInt(sets, 10);
    const repsNum = parseInt(reps, 10);
    const weightNum = parseFloat(weight);

    if (isNaN(setsNum) || setsNum < 1) {
      setError('Sets must be a positive number');
      return;
    }
    if (isNaN(repsNum) || repsNum < 1) {
      setError('Reps must be a positive number');
      return;
    }
    if (isNaN(weightNum) || weightNum < 0) {
      setError('Weight must be zero or more');
      return;
    }

    setError(null);
    onSave(dayExercise.id, setsNum, repsNum, weightNum);
  };

  const handleClose = () => {
    setError(null);
    onClose();
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
          <Text style={styles.title}>{exerciseName}</Text>

          <Text style={styles.label}>Target Sets</Text>
          <TextInput
            style={styles.input}
            value={sets}
            onChangeText={setSets}
            keyboardType="numeric"
            placeholder="3"
            placeholderTextColor={colors.secondary}
            returnKeyType="next"
            maxLength={3}
          />

          <Text style={[styles.label, styles.fieldGap]}>Target Reps</Text>
          <TextInput
            style={styles.input}
            value={reps}
            onChangeText={setReps}
            keyboardType="numeric"
            placeholder="10"
            placeholderTextColor={colors.secondary}
            returnKeyType="next"
            maxLength={3}
          />

          <Text style={[styles.label, styles.fieldGap]}>Target Weight (lb)</Text>
          <TextInput
            style={styles.input}
            value={weight}
            onChangeText={setWeight}
            keyboardType="decimal-pad"
            placeholder="0"
            placeholderTextColor={colors.secondary}
            returnKeyType="done"
            onSubmitEditing={handleSave}
            maxLength={6}
          />

          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
            <Text style={styles.saveButtonText}>Save</Text>
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
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.surfaceElevated,
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
  fieldGap: {
    marginTop: spacing.md,
  },
  input: {
    backgroundColor: colors.surface,
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
  saveButton: {
    backgroundColor: colors.accent,
    borderRadius: 12,
    paddingVertical: spacing.base,
    alignItems: 'center',
    marginTop: spacing.lg,
  },
  saveButtonText: {
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
