import React, {
  useRef,
  useState,
  useEffect,
  useImperativeHandle,
  forwardRef,
  useCallback,
} from 'react';
import {
  Animated,
  Easing,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { fontSize, weightSemiBold } from '../theme/typography';

// ── Types ────────────────────────────────────────────────────────────────────

interface ExportItem {
  message: string;
  type: 'success' | 'error';
}

export interface ExportToastHandle {
  show: (message: string, type: 'success' | 'error') => void;
}

// ── Component ─────────────────────────────────────────────────────────────────

const SLIDE_IN_DURATION = 300;
const SLIDE_OUT_DURATION = 250;
const DISPLAY_DURATION_MS = 3000;
const TOAST_TRANSLATE_Y_HIDDEN = -120;

export const ExportToast = forwardRef<ExportToastHandle>((_, ref) => {
  const insets = useSafeAreaInsets();

  // Queue stored in ref — avoids re-renders on enqueue
  const queueRef = useRef<ExportItem[]>([]);

  // Currently displayed toast
  const [currentItem, setCurrentItem] = useState<ExportItem | null>(null);

  // Animated value for translateY — useRef avoids re-renders
  const translateY = useRef(new Animated.Value(TOAST_TRANSLATE_Y_HIDDEN)).current;

  // Ref to track the active dismiss timer so we can clear it on unmount
  const dismissTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Whether we are currently showing or animating a toast
  const isActiveRef = useRef(false);

  const dequeueAndShow = useCallback(() => {
    if (queueRef.current.length === 0) {
      isActiveRef.current = false;
      return;
    }

    const next = queueRef.current.shift()!;
    isActiveRef.current = true;

    // Reset position before showing — animation starts in useEffect after mount
    translateY.setValue(TOAST_TRANSLATE_Y_HIDDEN);
    setCurrentItem(next);
  }, [translateY]);

  const slideOut = useCallback(() => {
    Animated.timing(translateY, {
      toValue: TOAST_TRANSLATE_Y_HIDDEN,
      duration: SLIDE_OUT_DURATION,
      easing: Easing.in(Easing.cubic),
      useNativeDriver: true,
    }).start(() => {
      setCurrentItem(null);
      dequeueAndShow();
    });
  }, [translateY, dequeueAndShow]);

  // Start slide-in animation AFTER the Animated.View has mounted.
  // This fixes a race condition where useNativeDriver animation starts
  // before the native view exists, causing the toast to stay off-screen.
  useEffect(() => {
    if (!currentItem) { return; }

    Animated.timing(translateY, {
      toValue: 0,
      duration: SLIDE_IN_DURATION,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start(() => {
      dismissTimerRef.current = setTimeout(slideOut, DISPLAY_DURATION_MS);
    });

    return () => {
      translateY.stopAnimation();
      if (dismissTimerRef.current !== null) {
        clearTimeout(dismissTimerRef.current);
        dismissTimerRef.current = null;
      }
    };
  }, [currentItem, translateY, slideOut]);

  useImperativeHandle(ref, () => ({
    show(message: string, type: 'success' | 'error') {
      queueRef.current.push({ message, type });

      if (!isActiveRef.current) {
        dequeueAndShow();
      }
    },
  }), [dequeueAndShow]);

  if (!currentItem) {
    return null;
  }

  const isSuccess = currentItem.type === 'success';

  return (
    <View
      style={StyleSheet.absoluteFillObject}
      pointerEvents="box-none"
    >
      <Animated.View
        pointerEvents="auto"
        style={[
          styles.toast,
          isSuccess ? styles.toastSuccess : styles.toastError,
          {
            marginTop: insets.top + spacing.sm,
            transform: [{ translateY }],
          },
        ]}
      >
        <Text style={styles.message} numberOfLines={2}>
          {currentItem.message}
        </Text>
      </Animated.View>
    </View>
  );
});

ExportToast.displayName = 'ExportToast';

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  toast: {
    position: 'absolute',
    top: 0,
    left: spacing.base,
    right: spacing.base,
    zIndex: 1000,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
  },
  toastSuccess: {
    backgroundColor: colors.accentDim,
    borderColor: 'rgba(141, 194, 138, 0.3)',
  },
  toastError: {
    backgroundColor: '#3D1A1A',
    borderColor: 'rgba(217, 83, 79, 0.3)',
  },
  message: {
    color: colors.primary,
    fontSize: fontSize.base,
    fontWeight: weightSemiBold,
  },
});
