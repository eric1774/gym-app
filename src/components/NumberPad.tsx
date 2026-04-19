import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../theme/colors';
import { Backspace } from './icons';

interface NumberPadProps {
  visible: boolean;
  field: 'weight' | 'reps';
  initialValue: number;
  label?: string;          // e.g. "BENCH PRESS"
  onCommit: (value: number) => void;
  onCancel: () => void;
}

const KEYS = ['7', '8', '9', '4', '5', '6', '1', '2', '3', '.', '0', '⌫'] as const;

export function NumberPad({ visible, field, initialValue, label, onCommit, onCancel }: NumberPadProps) {
  const insets = useSafeAreaInsets();
  const [buf, setBuf] = useState<string>(String(initialValue ?? ''));
  const slideY = useRef(new Animated.Value(400)).current;
  const caretOpacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (visible) {
      setBuf(String(initialValue ?? ''));
      Animated.timing(slideY, {
        toValue: 0,
        duration: 220,
        easing: Easing.out(Easing.back(1.1)),
        useNativeDriver: true,
      }).start();
    } else {
      slideY.setValue(400);
    }
  }, [visible, initialValue, slideY]);

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(caretOpacity, { toValue: 0, duration: 500, useNativeDriver: true }),
        Animated.timing(caretOpacity, { toValue: 1, duration: 500, useNativeDriver: true }),
      ]),
    );
    if (visible) { loop.start(); }
    return () => loop.stop();
  }, [visible, caretOpacity]);

  const push = (k: string) => {
    setBuf(prev => {
      if (k === '.' && prev.includes('.')) { return prev; }
      if (prev === '0' && k !== '.') { return k; }
      if (prev.length >= 5) { return prev; }
      return prev + k;
    });
  };

  const back = () => setBuf(prev => prev.slice(0, -1));
  const clear = () => setBuf('');

  const handleKey = (k: string) => {
    if (k === '⌫') { back(); } else { push(k); }
  };

  const handleConfirm = () => {
    const v = parseFloat(buf || '0') || 0;
    onCommit(v);
  };

  const unitLabel = field === 'weight' ? 'pounds' : 'reps';
  const displayValue = buf || '0';

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <Pressable onPress={onCancel} style={styles.backdrop} />
      <Animated.View style={[styles.sheet, { transform: [{ translateY: slideY }], paddingBottom: Math.max(insets.bottom, 16) + 8 }]}>
        <View style={styles.handle} />
        <View style={styles.topRow}>
          <View style={styles.titleColumn}>
            {label ? <Text style={styles.labelEyebrow}>{label.toUpperCase()}</Text> : null}
            <Text style={styles.title}>Enter {field}</Text>
          </View>
          <TouchableOpacity onPress={clear} style={styles.clearButton} activeOpacity={0.7}>
            <Text style={styles.clearText}>CLEAR</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.displayBox}>
          <View style={styles.displayRow}>
            <Text style={styles.displayValue}>{displayValue}</Text>
            <Animated.View style={[styles.caret, { opacity: caretOpacity }]} />
          </View>
          <Text style={styles.unitLabel}>{unitLabel}</Text>
        </View>
        <View style={styles.grid}>
          {KEYS.map(k => (
            <TouchableOpacity
              key={k}
              onPress={() => handleKey(k)}
              style={[styles.key, k === '⌫' ? styles.backspaceKey : null]}
              activeOpacity={0.7}>
              {k === '⌫' ? (
                <Backspace size={22} color={colors.primary} />
              ) : (
                <Text style={styles.keyText}>{k}</Text>
              )}
            </TouchableOpacity>
          ))}
        </View>
        <View style={styles.actions}>
          <TouchableOpacity onPress={onCancel} style={styles.cancelButton} activeOpacity={0.7}>
            <Text style={styles.cancelText}>CANCEL</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={handleConfirm} style={styles.confirmButton} activeOpacity={0.85}>
            <Text style={styles.confirmText}>CONFIRM</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.surface,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    paddingHorizontal: 16,
    paddingTop: 10,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.borderStrong,
    alignSelf: 'center',
    marginBottom: 12,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  titleColumn: {},
  labelEyebrow: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.6,
    color: colors.secondary,
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.primary,
    marginTop: 2,
  },
  clearButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  clearText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.secondary,
  },
  displayBox: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 16,
    alignItems: 'center',
    marginBottom: 12,
  },
  displayRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  displayValue: {
    fontSize: 48,
    fontWeight: '800',
    color: colors.primary,
    letterSpacing: -1,
    lineHeight: 48,
    fontVariant: ['tabular-nums'],
  },
  caret: {
    width: 2,
    height: 38,
    backgroundColor: colors.accent,
    marginLeft: 4,
  },
  unitLabel: {
    fontSize: 12,
    color: colors.secondary,
    marginTop: 4,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  key: {
    width: '32%',
    height: 56,
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backspaceKey: {
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  keyText: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.primary,
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  cancelButton: {
    flex: 1,
    height: 50,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.secondary,
  },
  confirmButton: {
    flex: 2,
    height: 50,
    borderRadius: 14,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmText: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.onAccent,
    letterSpacing: 0.3,
  },
});
