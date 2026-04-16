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

interface WeekEditModalProps {
  visible: boolean;
  weekNumber: number;
  totalWeeks: number;
  currentName: string;
  currentDetails: string;
  onClose: () => void;
  onSave: (name: string | null, details: string | null) => void;
}

export function WeekEditModal({
  visible,
  weekNumber,
  totalWeeks,
  currentName,
  currentDetails,
  onClose,
  onSave,
}: WeekEditModalProps) {
  const [name, setName] = useState(currentName);
  const [details, setDetails] = useState(currentDetails);

  useEffect(() => {
    if (visible) {
      setName(currentName);
      setDetails(currentDetails);
    }
  }, [visible, currentName, currentDetails]);

  const hasChanges =
    name.trim() !== currentName.trim() || details.trim() !== currentDetails.trim();

  const handleSubmit = () => {
    if (!hasChanges) return;
    onSave(name.trim() || null, details.trim() || null);
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView behavior="padding" style={styles.keyboardAvoid}>
        <Pressable style={styles.overlay} onPress={onClose} />
        <View style={styles.sheet}>
          <Text style={styles.title}>
            Week {weekNumber} of {totalWeeks}
          </Text>

          <Text style={styles.label}>Week Name</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g., Ramp Phase"
            placeholderTextColor={colors.secondary}
            value={name}
            onChangeText={setName}
            autoFocus
            returnKeyType="next"
            maxLength={40}
          />

          <Text style={[styles.label, { marginTop: spacing.md }]}>Week Details</Text>
          <TextInput
            style={[styles.input, styles.multilineInput]}
            placeholder="e.g., Focus on technique this week..."
            placeholderTextColor={colors.secondary}
            value={details}
            onChangeText={setDetails}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
            maxLength={200}
          />

          <TouchableOpacity
            style={[styles.submitButton, !hasChanges && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={!hasChanges}>
            <Text style={styles.submitButtonText}>Save</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
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
  input: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: 8,
    padding: spacing.md,
    fontSize: fontSize.base,
    color: colors.primary,
  },
  multilineInput: {
    minHeight: 100,
    paddingTop: spacing.md,
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
