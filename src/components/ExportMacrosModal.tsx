import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { fontSize, weightBold, weightSemiBold, weightRegular } from '../theme/typography';

interface ExportMacrosModalProps {
  visible: boolean;
  onClose: () => void;
}

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function formatDateLong(d: Date): string {
  return `${MONTHS[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
}

function startOfDay(d: Date): Date {
  const out = new Date(d);
  out.setHours(0, 0, 0, 0);
  return out;
}

function defaultFrom(): Date {
  const now = startOfDay(new Date());
  now.setDate(now.getDate() - 30);
  return now;
}

export function ExportMacrosModal({ visible, onClose }: ExportMacrosModalProps) {
  const [fromDate, setFromDate] = useState<Date>(() => defaultFrom());
  const [toDate, setToDate] = useState<Date>(() => startOfDay(new Date()));
  const [showFromPicker, setShowFromPicker] = useState(false);
  const [showToPicker, setShowToPicker] = useState(false);

  const onChangeFrom = (event: DateTimePickerEvent, picked?: Date) => {
    if (Platform.OS === 'android') {
      setShowFromPicker(false);
    }
    if (event.type === 'set' && picked) {
      setFromDate(startOfDay(picked));
    }
  };

  const onChangeTo = (event: DateTimePickerEvent, picked?: Date) => {
    if (Platform.OS === 'android') {
      setShowToPicker(false);
    }
    if (event.type === 'set' && picked) {
      setToDate(startOfDay(picked));
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboardAvoid}>
        <Pressable style={styles.overlay} onPress={onClose} />
        <View style={styles.sheet}>
          <Text style={styles.title}>Export Macros</Text>
          <Text style={styles.subtitle}>Choose a date range</Text>

          <View style={styles.dateRow}>
            <TouchableOpacity
              style={styles.dateField}
              onPress={() => setShowFromPicker(true)}
              activeOpacity={0.7}>
              <Text style={styles.dateLabel}>From</Text>
              <Text style={styles.dateValue}>{formatDateLong(fromDate)}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.dateField}
              onPress={() => setShowToPicker(true)}
              activeOpacity={0.7}>
              <Text style={styles.dateLabel}>To</Text>
              <Text style={styles.dateValue}>{formatDateLong(toDate)}</Text>
            </TouchableOpacity>
          </View>

          {showFromPicker && (
            <DateTimePicker
              value={fromDate}
              mode="date"
              onChange={onChangeFrom}
            />
          )}
          {showToPicker && (
            <DateTimePicker
              value={toDate}
              mode="date"
              onChange={onChangeTo}
            />
          )}

          <View style={styles.actions}>
            <TouchableOpacity style={[styles.btn, styles.btnCancel]} onPress={onClose}>
              <Text style={styles.btnCancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.btn, styles.btnPrimary]}>
              <Text style={styles.btnPrimaryText}>Export JSON</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  keyboardAvoid: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: spacing.base,
    paddingBottom: spacing.xl,
  },
  title: {
    color: colors.primary,
    fontSize: fontSize.lg,
    fontWeight: weightBold,
    marginBottom: spacing.xs,
  },
  subtitle: {
    color: colors.secondary,
    fontSize: fontSize.sm,
    fontWeight: weightSemiBold,
    marginBottom: spacing.base,
  },
  dateRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.base,
  },
  dateField: {
    flex: 1,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    padding: spacing.sm,
  },
  dateLabel: {
    fontSize: fontSize.xs,
    color: colors.secondary,
    fontWeight: weightRegular,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  dateValue: {
    fontSize: fontSize.base,
    color: colors.primary,
    fontWeight: weightSemiBold,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.base,
  },
  btn: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: 10,
    alignItems: 'center',
    minHeight: 44,
    justifyContent: 'center',
  },
  btnCancel: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: colors.border,
  },
  btnPrimary: {
    backgroundColor: colors.accent,
  },
  btnCancelText: {
    color: colors.secondary,
    fontSize: fontSize.base,
    fontWeight: weightBold,
  },
  btnPrimaryText: {
    color: colors.onAccent,
    fontSize: fontSize.base,
    fontWeight: weightBold,
  },
});
