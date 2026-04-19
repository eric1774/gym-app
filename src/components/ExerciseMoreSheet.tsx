import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Easing,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../theme/colors';
import { Swap, Chevron, History } from './icons';

interface ExerciseMoreSheetProps {
  visible: boolean;
  exerciseName: string;
  onSwap: () => void;
  onEditTarget: () => void;
  onViewHistory: () => void;
  onClose: () => void;
}

const SHEET_TRAVEL = 320;

export function ExerciseMoreSheet({
  visible,
  exerciseName,
  onSwap,
  onEditTarget,
  onViewHistory,
  onClose,
}: ExerciseMoreSheetProps) {
  const insets = useSafeAreaInsets();
  const backdrop = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(SHEET_TRAVEL)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(backdrop, {
          toValue: 1,
          duration: 180,
          useNativeDriver: true,
          easing: Easing.out(Easing.quad),
        }),
        Animated.timing(translateY, {
          toValue: 0,
          duration: 220,
          useNativeDriver: true,
          easing: Easing.out(Easing.quad),
        }),
      ]).start();
    } else {
      backdrop.setValue(0);
      translateY.setValue(SHEET_TRAVEL);
    }
  }, [visible, backdrop, translateY]);

  function dismiss(after?: () => void) {
    Animated.parallel([
      Animated.timing(backdrop, {
        toValue: 0,
        duration: 160,
        useNativeDriver: true,
        easing: Easing.in(Easing.quad),
      }),
      Animated.timing(translateY, {
        toValue: SHEET_TRAVEL,
        duration: 200,
        useNativeDriver: true,
        easing: Easing.in(Easing.quad),
      }),
    ]).start(() => {
      onClose();
      if (after) { after(); }
    });
  }

  return (
    <Modal
      visible={visible}
      transparent
      statusBarTranslucent
      animationType="none"
      onRequestClose={() => dismiss()}>
      <View style={styles.root}>
        <Animated.View style={[styles.backdrop, { opacity: backdrop }]}>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={() => dismiss()}
            accessibilityLabel="Dismiss menu"
            accessibilityRole="button"
          />
        </Animated.View>
        <Animated.View
          style={[
            styles.sheet,
            { paddingBottom: insets.bottom + 12, transform: [{ translateY }] },
          ]}>
          <View style={styles.handle} />
          <Text style={styles.eyebrow} numberOfLines={1}>
            {exerciseName.toUpperCase()}
          </Text>
          <View style={styles.dividerTop} />
          <Pressable
            style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
            onPress={() => dismiss(onSwap)}
            accessibilityRole="button"
            accessibilityLabel="Swap exercise">
            <Swap size={20} color={colors.accent} />
            <Text style={styles.rowLabel}>Swap exercise</Text>
            <Chevron size={16} color={colors.secondaryDim} dir="right" />
          </Pressable>
          <View style={styles.rowDivider} />
          <Pressable
            style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
            onPress={() => dismiss(onEditTarget)}
            accessibilityRole="button"
            accessibilityLabel="Edit target">
            <Text style={styles.editGlyph}>{'\u270E'}</Text>
            <Text style={styles.rowLabel}>Edit target</Text>
            <Chevron size={16} color={colors.secondaryDim} dir="right" />
          </Pressable>
          <View style={styles.rowDivider} />
          <Pressable
            style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
            onPress={() => dismiss(onViewHistory)}
            accessibilityRole="button"
            accessibilityLabel="View exercise history">
            <History size={20} color={colors.accent} />
            <Text style={styles.rowLabel}>History</Text>
            <Chevron size={16} color={colors.secondaryDim} dir="right" />
          </Pressable>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: 'flex-end' },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  sheet: {
    backgroundColor: colors.surfaceElevated,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 8,
    paddingHorizontal: 16,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.borderStrong,
    alignSelf: 'center',
    marginBottom: 16,
  },
  eyebrow: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.6,
    color: colors.secondary,
    paddingHorizontal: 4,
    marginBottom: 8,
  },
  dividerTop: { height: 1, backgroundColor: colors.border, marginBottom: 4 },
  row: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: 4,
    paddingVertical: 14,
  },
  rowPressed: { backgroundColor: 'rgba(255,255,255,0.04)' },
  rowDivider: { height: 1, backgroundColor: colors.border, marginHorizontal: 4 },
  rowLabel: { fontSize: 16, fontWeight: '600', color: colors.primary, flex: 1 },
  editGlyph: { fontSize: 18, color: colors.accent, width: 20, textAlign: 'center' },
});
