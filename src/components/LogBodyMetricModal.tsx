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

const RANGES: Record<BodyMetricType, { min: number; max: number; unit: BodyMetricUnit; label: string; title: string }> = {
  weight:    { min: 50, max: 500, unit: 'lb',      label: 'Weight (lb)',      title: 'Log Weight' },
  body_fat:  { min: 3,  max: 60,  unit: 'percent', label: 'Body Fat (%)',     title: 'Log Body Fat %' },
};

export function LogBodyMetricModal({
  visible,
  mode: initialMode,
  initialDate,
  initialValue,
  initialNote,
  onClose,
  onSave,
}: LogBodyMetricModalProps) {
  const [mode, setMode] = useState<BodyMetricType>(initialMode);
  const [value, setValue] = useState('');
  const [note, setNote] = useState('');

  useEffect(() => {
    if (visible) {
      setMode(initialMode);
      setValue(initialValue != null ? String(initialValue) : '');
      setNote(initialNote ?? '');
    }
  }, [visible, initialMode, initialValue, initialNote]);

  const range = RANGES[mode];
  const parsed = parseFloat(value);
  const inRange =
    !Number.isNaN(parsed) &&
    parsed >= range.min &&
    parsed <= range.max;

  const handleSave = () => {
    if (!inRange) return;
    onSave({
      metricType: mode,
      value: parsed,
      unit: range.unit,
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
          <Text style={styles.title}>{range.title}</Text>

          <View style={styles.modeRow}>
            <Pressable
              testID="log-body-metric-mode-weight"
              onPress={() => setMode('weight')}
              style={[styles.modeBtn, mode === 'weight' && styles.modeBtnActive]}
            >
              <Text style={[styles.modeText, mode === 'weight' && styles.modeTextActive]}>Weight</Text>
            </Pressable>
            <Pressable
              testID="log-body-metric-mode-body_fat"
              onPress={() => setMode('body_fat')}
              style={[styles.modeBtn, mode === 'body_fat' && styles.modeBtnActive]}
            >
              <Text style={[styles.modeText, mode === 'body_fat' && styles.modeTextActive]}>Body Fat %</Text>
            </Pressable>
          </View>

          <Text style={styles.label}>{range.label}</Text>
          <TextInput
            testID="log-body-metric-value"
            style={styles.input}
            placeholder={mode === 'weight' ? 'e.g. 177.4' : 'e.g. 18.0'}
            placeholderTextColor={colors.secondary}
            keyboardType="decimal-pad"
            value={value}
            onChangeText={setValue}
          />
          {!inRange && value.length > 0 && (
            <Text style={styles.hint}>
              {mode === 'weight'
                ? 'Weight must be between 50 and 500 lb.'
                : 'Body fat must be between 3 and 60%.'}
            </Text>
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
  modeRow: { flexDirection: 'row', backgroundColor: colors.surfaceElevated, borderRadius: 10, padding: 3, marginBottom: spacing.sm },
  modeBtn: { flex: 1, paddingVertical: spacing.sm, borderRadius: 8, alignItems: 'center' },
  modeBtnActive: { backgroundColor: colors.surface },
  modeText: { color: colors.secondary, fontSize: fontSize.sm, fontWeight: weightSemiBold },
  modeTextActive: { color: colors.primary },
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
