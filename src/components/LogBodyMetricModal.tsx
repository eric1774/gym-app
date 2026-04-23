import React, { useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { fontSize, weightBold, weightSemiBold } from '../theme/typography';
import type { BodyMetricType, BodyMetricUnit } from '../types';

export interface LogBodyMetricPayload {
  metricType: BodyMetricType;
  value: number;
  unit: BodyMetricUnit;
  recordedDate: string;
  note: string | null;
}

export interface LogBodyMetricModalProps {
  visible: boolean;
  mode: BodyMetricType;
  initialDate: string;
  initialValue?: number | null;
  initialNote?: string | null;
  onClose: () => void;
  onSave: (payload: LogBodyMetricPayload) => void;
}

const WEIGHT_RANGE = { min: 50, max: 500 };

export function LogBodyMetricModal({
  visible,
  mode,
  initialDate,
  initialValue,
  initialNote,
  onClose,
  onSave,
}: LogBodyMetricModalProps) {
  const [value, setValue] = useState('');
  const [note, setNote] = useState('');

  useEffect(() => {
    if (visible) {
      setValue(initialValue != null ? String(initialValue) : '');
      setNote(initialNote ?? '');
    }
  }, [visible, initialValue, initialNote]);

  const parsed = parseFloat(value);
  const inRange =
    !Number.isNaN(parsed) &&
    parsed >= WEIGHT_RANGE.min &&
    parsed <= WEIGHT_RANGE.max;

  const handleSave = () => {
    if (!inRange) return;
    onSave({
      metricType: 'weight',
      value: parsed,
      unit: 'lb',
      recordedDate: initialDate,
      note: note.trim() === '' ? null : note.trim(),
    });
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboardAvoid}
      >
        <Pressable style={styles.overlay} onPress={onClose} />
        <View style={styles.sheet}>
          <Text style={styles.title}>Log Weight</Text>

          <Text style={styles.label}>Weight (lb)</Text>
          <TextInput
            testID="log-body-metric-value"
            style={styles.input}
            placeholder="e.g. 177.4"
            placeholderTextColor={colors.secondary}
            keyboardType="decimal-pad"
            value={value}
            onChangeText={setValue}
          />
          {!inRange && value.length > 0 && (
            <Text style={styles.hint}>Weight must be between 50 and 500 lb.</Text>
          )}

          <Text style={styles.label}>Note (optional)</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. post-race, traveling"
            placeholderTextColor={colors.secondary}
            maxLength={140}
            value={note}
            onChangeText={setNote}
          />

          <View style={styles.actions}>
            <Pressable onPress={onClose} style={styles.cancelBtn}>
              <Text style={styles.cancelText}>Cancel</Text>
            </Pressable>
            <Pressable
              testID="log-body-metric-save"
              accessibilityState={{ disabled: !inRange }}
              onPress={handleSave}
              style={[styles.saveBtn, !inRange && styles.saveBtnDisabled]}
            >
              <Text style={styles.saveText}>Save</Text>
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  keyboardAvoid: { flex: 1, justifyContent: 'flex-end' },
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.5)' },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  title: { color: colors.primary, fontSize: fontSize.lg, fontWeight: weightBold, marginBottom: spacing.base },
  label: { color: colors.secondary, fontSize: fontSize.xs, marginTop: spacing.base, marginBottom: spacing.xs, fontWeight: weightSemiBold, letterSpacing: 0.5 },
  input: {
    backgroundColor: colors.surfaceElevated,
    color: colors.primary,
    borderRadius: 10,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
    fontSize: fontSize.base,
  },
  hint: { color: colors.danger, fontSize: fontSize.xs, marginTop: spacing.xs },
  actions: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.lg },
  cancelBtn: { flex: 1, paddingVertical: spacing.md, alignItems: 'center', borderRadius: 10, backgroundColor: colors.surfaceElevated },
  cancelText: { color: colors.secondary, fontSize: fontSize.base, fontWeight: weightSemiBold },
  saveBtn: { flex: 1, paddingVertical: spacing.md, alignItems: 'center', borderRadius: 10, backgroundColor: colors.accent },
  saveBtnDisabled: { opacity: 0.4 },
  saveText: { color: colors.background, fontSize: fontSize.base, fontWeight: weightBold },
});
