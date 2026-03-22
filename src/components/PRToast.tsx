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
import { fontSize, weightBold, weightSemiBold } from '../theme/typography';

// ── Types ────────────────────────────────────────────────────────────────────

interface PRItem {
  exerciseName: string;
  reps: number;
  weightKg: number;
}

export interface PRToastHandle {
  showPR: (exerciseName: string, reps: number, weightKg: number) => void;
}

// ── Component ─────────────────────────────────────────────────────────────────

const SLIDE_IN_DURATION = 300;
const SLIDE_OUT_DURATION = 250;
const DISPLAY_DURATION_MS = 3000;
const TOAST_TRANSLATE_Y_HIDDEN = -120;

export const PRToast = forwardRef<PRToastHandle>((_, ref) => {
  const insets = useSafeAreaInsets();

  // Queue stored in ref — avoids re-renders on enqueue
  const queueRef = useRef<PRItem[]>([]);

  // Currently displayed toast
  const [currentToast, setCurrentToast] = useState<PRItem | null>(null);

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
    setCurrentToast(next);
  }, [translateY]);

  const slideOut = useCallback(() => {
    Animated.timing(translateY, {
      toValue: TOAST_TRANSLATE_Y_HIDDEN,
      duration: SLIDE_OUT_DURATION,
      easing: Easing.in(Easing.cubic),
      useNativeDriver: true,
    }).start(() => {
      setCurrentToast(null);
      dequeueAndShow();
    });
  }, [translateY, dequeueAndShow]);

  // Start slide-in animation AFTER the Animated.View has mounted.
  // This fixes a race condition where useNativeDriver animation starts
  // before the native view exists, causing the toast to stay off-screen.
  useEffect(() => {
    if (!currentToast) { return; }

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
  }, [currentToast, translateY, slideOut]);

  useImperativeHandle(ref, () => ({
    showPR(exerciseName: string, reps: number, weightKg: number) {
      queueRef.current.push({ exerciseName, reps, weightKg });

      if (!isActiveRef.current) {
        dequeueAndShow();
      }
    },
  }), [dequeueAndShow]);

  if (!currentToast) {
    return null;
  }

  return (
    <View
      style={StyleSheet.absoluteFillObject}
      pointerEvents="box-none"
    >
      <Animated.View
        pointerEvents="auto"
        style={[
          styles.toast,
          {
            marginTop: insets.top + spacing.sm,
            transform: [{ translateY }],
          },
        ]}
      >
        <Text style={styles.exerciseName} numberOfLines={1}>
          {currentToast.exerciseName}
        </Text>
        <Text style={styles.prDetail}>
          {'New ' + currentToast.reps + '-rep PR! ' + currentToast.weightKg + ' lbs'}
        </Text>
      </Animated.View>
    </View>
  );
});

PRToast.displayName = 'PRToast';

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  toast: {
    position: 'absolute',
    top: 0,
    left: spacing.base,
    right: spacing.base,
    zIndex: 1000,
    backgroundColor: colors.prGoldDim,
    borderWidth: 1,
    borderColor: 'rgba(255, 184, 0, 0.3)',
    borderRadius: 12,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
  },
  exerciseName: {
    color: colors.prGold,
    fontSize: fontSize.base,
    fontWeight: weightBold,
    marginBottom: 2,
  },
  prDetail: {
    color: colors.primary,
    fontSize: fontSize.sm,
    fontWeight: weightSemiBold,
  },
});
