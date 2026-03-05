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
import { createProgram } from '../db/programs';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { fontSize, weightBold, weightSemiBold } from '../theme/typography';
import { Program } from '../types';

interface CreateProgramModalProps {
  visible: boolean;
  onClose: () => void;
  onCreated: (program: Program) => void;
}

export function CreateProgramModal({ visible, onClose, onCreated }: CreateProgramModalProps) {
  const [name, setName] = useState('');
  const [weeks, setWeeks] = useState('4');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const weeksNum = parseInt(weeks, 10);
  const isValid = name.trim() !== '' && !isNaN(weeksNum) && weeksNum >= 1 && weeksNum <= 52;
  const isDisabled = !isValid || isSubmitting;

  const handleClose = () => {
    setName('');
    setWeeks('4');
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
      const program = await createProgram(name.trim(), weeksNum);
      onCreated(program);
      handleClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create program.');
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
          <Text style={styles.title}>Create Program</Text>

          <Text style={styles.label}>Program Name</Text>
          <TextInput
            style={styles.input}
            placeholder="Program name"
            placeholderTextColor={colors.secondary}
            value={name}
            onChangeText={setName}
            autoFocus
            returnKeyType="next"
            maxLength={50}
          />

          <Text style={[styles.label, styles.weeksLabel]}>Weeks</Text>
          <TextInput
            style={styles.input}
            placeholder="Weeks"
            placeholderTextColor={colors.secondary}
            value={weeks}
            onChangeText={setWeeks}
            keyboardType="numeric"
            returnKeyType="done"
            onSubmitEditing={handleSubmit}
            maxLength={2}
          />

          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          <TouchableOpacity
            style={[styles.submitButton, isDisabled && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={isDisabled}>
            <Text style={styles.submitButtonText}>Create Program</Text>
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
  weeksLabel: {
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
