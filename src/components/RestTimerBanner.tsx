import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { colors } from '../theme/colors';
import { fontSize, weightBold, weightSemiBold } from '../theme/typography';
import { spacing } from '../theme/spacing';

interface Props {
  remainingSeconds: number;
  totalSeconds: number;
  onStop: () => void;
}

function formatCountdown(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export function RestTimerBanner({ remainingSeconds, totalSeconds, onStop }: Props) {
  const progress = totalSeconds > 0 ? remainingSeconds / totalSeconds : 0;

  return (
    <View style={styles.wrapper}>
      <View style={styles.row}>
        <Text style={styles.label}>Rest</Text>
        <Text style={styles.countdown}>{formatCountdown(remainingSeconds)}</Text>
        <TouchableOpacity onPress={onStop} style={styles.skipButton} activeOpacity={0.7}>
          <Text style={styles.skipText}>Skip</Text>
        </TouchableOpacity>
      </View>
      {/* Progress bar: full width = total duration, shrinks as time passes */}
      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    backgroundColor: colors.timerActive,
    paddingTop: spacing.sm,
    paddingHorizontal: spacing.base,
    paddingBottom: 0,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: spacing.sm,
  },
  label: {
    fontSize: fontSize.sm,
    fontWeight: weightSemiBold,
    color: colors.background,
    width: 40,
  },
  countdown: {
    fontSize: fontSize.xl,
    fontWeight: weightBold,
    color: colors.background,
    letterSpacing: 1,
  },
  skipButton: {
    minWidth: 48,
    minHeight: 48,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  skipText: {
    fontSize: fontSize.base,
    fontWeight: weightSemiBold,
    color: colors.background,
  },
  progressTrack: {
    height: 3,
    backgroundColor: 'rgba(15,15,15,0.3)',
    borderRadius: 2,
  },
  progressFill: {
    height: 3,
    backgroundColor: colors.background,
    borderRadius: 2,
    opacity: 0.6,
  },
});
