import React, { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { colors } from '../theme/colors';
import { fontSize, weightBold, weightSemiBold } from '../theme/typography';

export interface NameSetupModalProps {
  visible: boolean;
  onSave: (firstName: string) => void;
  onSkip: () => void;
}

export function NameSetupModal({ visible, onSave, onSkip }: NameSetupModalProps) {
  const [name, setName] = useState('');

  const handleSave = () => {
    const trimmed = name.trim();
    if (trimmed.length === 0) { return; }
    onSave(trimmed);
  };

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <Text style={styles.title}>Welcome</Text>
          <Text style={styles.body}>
            What should we call you? This is only used to personalize your dashboard greeting.
          </Text>
          <TextInput
            testID="name-setup-input"
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="First name"
            placeholderTextColor={colors.secondary}
            autoFocus
            autoCapitalize="words"
            returnKeyType="done"
            onSubmitEditing={handleSave}
          />
          <View style={styles.row}>
            <Pressable onPress={onSkip} style={styles.skipBtn}>
              <Text style={styles.skipText}>Skip</Text>
            </Pressable>
            <Pressable onPress={handleSave} style={styles.saveBtn}>
              <Text style={styles.saveText}>Save</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  card: {
    width: '100%',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 18,
    padding: 20,
  },
  title: { fontSize: fontSize.xl, fontWeight: weightBold, color: colors.primary, marginBottom: 8 },
  body: { fontSize: fontSize.sm, color: colors.secondary, marginBottom: 16, lineHeight: 20 },
  input: {
    backgroundColor: colors.surfaceElevated,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: fontSize.base,
    color: colors.primary,
    marginBottom: 16,
  },
  row: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8 },
  skipBtn: { paddingHorizontal: 16, paddingVertical: 10 },
  skipText: { fontSize: fontSize.base, color: colors.secondary, fontWeight: weightSemiBold },
  saveBtn: {
    backgroundColor: colors.accent,
    paddingHorizontal: 20, paddingVertical: 10,
    borderRadius: 10, minWidth: 72, alignItems: 'center',
  },
  saveText: { fontSize: fontSize.base, color: colors.onAccent, fontWeight: weightBold },
});
