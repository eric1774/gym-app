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

interface SwapConflictSheetProps {
  visible: boolean;
  exerciseName: string;
  setsCount: number;
  onKeep: () => void;
  onDiscard: () => void;
  onClose: () => void;
}

const SHEET_TRAVEL = 420;

export function SwapConflictSheet({
  visible,
  exerciseName,
  setsCount,
  onKeep,
  onDiscard,
  onClose,
}: SwapConflictSheetProps) {
  const insets = useSafeAreaInsets();
  const backdrop = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(SHEET_TRAVEL)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(backdrop, { toValue: 1, duration: 180, useNativeDriver: true, easing: Easing.out(Easing.quad) }),
        Animated.timing(translateY, { toValue: 0, duration: 220, useNativeDriver: true, easing: Easing.out(Easing.quad) }),
      ]).start();
    } else {
      backdrop.setValue(0);
      translateY.setValue(SHEET_TRAVEL);
    }
  }, [visible, backdrop, translateY]);

  function dismiss(after?: () => void) {
    Animated.parallel([
      Animated.timing(backdrop, { toValue: 0, duration: 160, useNativeDriver: true, easing: Easing.in(Easing.quad) }),
      Animated.timing(translateY, { toValue: SHEET_TRAVEL, duration: 200, useNativeDriver: true, easing: Easing.in(Easing.quad) }),
    ]).start(() => {
      onClose();
      if (after) { after(); }
    });
  }

  const title = `You've logged ${setsCount} set${setsCount !== 1 ? 's' : ''} on ${exerciseName}`;

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
            accessibilityLabel="Dismiss swap dialog"
            accessibilityRole="button"
          />
        </Animated.View>
        <Animated.View
          style={[
            styles.sheet,
            { paddingBottom: insets.bottom + 16, transform: [{ translateY }] },
          ]}>
          <View style={styles.handle} />
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.message}>What would you like to do?</Text>

          <Pressable
            style={({ pressed }) => [
              styles.button,
              styles.keepButton,
              pressed && styles.buttonPressed,
            ]}
            onPress={() => dismiss(onKeep)}
            accessibilityRole="button"
            accessibilityLabel="Keep sets and add new exercise">
            <Text style={styles.keepText}>Keep sets & add new</Text>
          </Pressable>

          <Pressable
            style={({ pressed }) => [
              styles.button,
              styles.discardButton,
              pressed && styles.buttonPressed,
            ]}
            onPress={() => dismiss(onDiscard)}
            accessibilityRole="button"
            accessibilityLabel="Discard sets and replace exercise">
            <Text style={styles.discardText}>Discard & replace</Text>
          </Pressable>

          <Pressable
            style={({ pressed }) => [styles.cancelButton, pressed && styles.buttonPressed]}
            onPress={() => dismiss()}
            accessibilityRole="button"
            accessibilityLabel="Cancel">
            <Text style={styles.cancelText}>Cancel</Text>
          </Pressable>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.55)' },
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
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.primary,
    marginBottom: 6,
    paddingHorizontal: 4,
  },
  message: {
    fontSize: 14,
    fontWeight: '400',
    color: colors.secondary,
    lineHeight: 20,
    marginBottom: 20,
    paddingHorizontal: 4,
  },
  button: {
    minHeight: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    marginBottom: 10,
  },
  keepButton: {
    backgroundColor: colors.accent,
  },
  keepText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.onAccent,
  },
  discardButton: {
    backgroundColor: colors.danger,
  },
  discardText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  cancelButton: {
    minHeight: 48,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    backgroundColor: 'transparent',
  },
  cancelText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.secondary,
  },
  buttonPressed: { opacity: 0.75 },
});
