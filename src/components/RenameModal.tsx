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

interface RenameModalProps {
  visible: boolean;
  title: string;
  currentName: string;
  onClose: () => void;
  onSave: (name: string) => void;
}

export function RenameModal({ visible, title, currentName, onClose, onSave }: RenameModalProps) {
  const [name, setName] = useState(currentName);

  useEffect(() => {
    if (visible) {
      setName(currentName);
    }
  }, [visible, currentName]);

  const isDisabled = name.trim() === '' || name.trim() === currentName;

  const handleSubmit = () => {
    if (name.trim() === '' || name.trim() === currentName) {
      return;
    }
    onSave(name.trim());
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior="padding"
        style={styles.keyboardAvoid}>
        <Pressable style={styles.overlay} onPress={onClose} />
        <View style={styles.sheet}>
          <Text style={styles.title}>{title}</Text>

          <Text style={styles.label}>Name</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter name"
            placeholderTextColor={colors.secondary}
            value={name}
            onChangeText={setName}
            autoFocus
            returnKeyType="done"
            onSubmitEditing={handleSubmit}
            maxLength={50}
          />

          <TouchableOpacity
            style={[styles.submitButton, isDisabled && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={isDisabled}>
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
