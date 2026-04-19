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
import { createWarmupExercise } from '../db/warmups';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { fontSize, weightBold, weightSemiBold } from '../theme/typography';
import { WarmupExercise, WarmupTrackingType } from '../types';

interface CreateWarmupExerciseModalProps {
  visible: boolean;
  onClose: () => void;
  onCreated: (exercise: WarmupExercise) => void;
}

const TRACKING_TYPES: { key: WarmupTrackingType; label: string }[] = [
  { key: 'checkbox', label: 'Checkbox' },
  { key: 'reps', label: 'Reps' },
  { key: 'duration', label: 'Duration' },
];

export function CreateWarmupExerciseModal({
  visible,
  onClose,
  onCreated,
}: CreateWarmupExerciseModalProps) {
  const [name, setName] = useState('');
  const [trackingType, setTrackingType] = useState<WarmupTrackingType>('checkbox');
  const [defaultValue, setDefaultValue] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const showValueInput = trackingType === 'reps' || trackingType === 'duration';
  const isDisabled = name.trim() === '' || isSubmitting;

  const handleClose = () => {
    setName('');
    setTrackingType('checkbox');
    setDefaultValue('');
    setIsSubmitting(false);
    onClose();
  };

  const handleSubmit = async () => {
    if (isDisabled) { return; }
    setIsSubmitting(true);
    try {
      const parsedDefault = showValueInput && defaultValue.trim() !== ''
        ? parseFloat(defaultValue.trim())
        : null;
      const exercise = await createWarmupExercise(
        name.trim(),
        trackingType,
        parsedDefault,
      );
      onCreated(exercise);
      handleClose();
    } catch {
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
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboardAvoid}>
        <Pressable style={styles.overlay} onPress={handleClose} />
        <View style={styles.sheet}>
          <ScrollView
            bounces={false}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}>
            <Text style={styles.title}>New Warmup Exercise</Text>

            <Text style={styles.label}>Name</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Hip Circles"
              placeholderTextColor={colors.secondary}
              value={name}
              onChangeText={setName}
              autoFocus
              returnKeyType="done"
              maxLength={60}
            />

            <Text style={[styles.label, styles.labelSpaced]}>Tracking Type</Text>
            <View style={styles.pillRow}>
              {TRACKING_TYPES.map(({ key, label }) => (
                <TouchableOpacity
                  key={key}
                  style={[
                    styles.pill,
                    trackingType === key ? styles.pillActive : styles.pillInactive,
                  ]}
                  onPress={() => setTrackingType(key)}>
                  <Text
                    style={[
                      styles.pillText,
                      trackingType === key ? styles.pillTextActive : styles.pillTextInactive,
                    ]}>
                    {label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {showValueInput && (
              <>
                <Text style={[styles.label, styles.labelSpaced]}>
                  {trackingType === 'reps' ? 'Default Reps' : 'Default Duration (sec)'}
                </Text>
                <TextInput
                  style={styles.input}
                  placeholder={trackingType === 'reps' ? 'e.g. 10' : 'e.g. 30'}
                  placeholderTextColor={colors.secondary}
                  value={defaultValue}
                  onChangeText={setDefaultValue}
                  keyboardType="numeric"
                  returnKeyType="done"
                />
              </>
            )}

            <TouchableOpacity
              style={[styles.submitButton, isDisabled && styles.submitButtonDisabled]}
              onPress={handleSubmit}
              disabled={isDisabled}>
              <Text style={styles.submitButtonText}>Create Exercise</Text>
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
  labelSpaced: {
    marginTop: spacing.md,
  },
  input: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: 8,
    padding: spacing.md,
    fontSize: fontSize.base,
    color: colors.primary,
  },
  pillRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  pill: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: 20,
    alignItems: 'center',
  },
  pillActive: {
    backgroundColor: colors.accent,
  },
  pillInactive: {
    backgroundColor: colors.surfaceElevated,
  },
  pillText: {
    fontSize: fontSize.sm,
    fontWeight: weightSemiBold,
  },
  pillTextActive: {
    color: colors.background,
  },
  pillTextInactive: {
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
