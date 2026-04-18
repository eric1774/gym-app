import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { colors } from '../theme/colors';
import { Timer } from './icons';

interface Props {
  remainingSeconds: number;
  totalSeconds: number;
  onStop: () => void;
  onAdd: () => void;
}

function formatCountdown(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export function RestTimerBanner({ remainingSeconds, totalSeconds, onStop, onAdd }: Props) {
  const progress = totalSeconds > 0 ? remainingSeconds / totalSeconds : 0;
  return (
    <View style={styles.wrapper}>
      <View style={styles.row}>
        <View style={styles.iconCircle}>
          <Timer size={16} color={colors.timerActive} />
        </View>
        <View style={styles.textColumn}>
          <Text style={styles.label}>REST</Text>
          <Text style={styles.countdown}>{formatCountdown(remainingSeconds)}</Text>
        </View>
        <TouchableOpacity onPress={onAdd} style={styles.addPill} activeOpacity={0.7}>
          <Text style={styles.addPillText}>+15s</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={onStop} style={styles.skipPill} activeOpacity={0.7}>
          <Text style={styles.skipPillText}>SKIP</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    // Approximation of `linear-gradient(180deg, rgba(250,204,21,0.14), rgba(250,204,21,0.06))`
    // using a single solid tint; visually close and avoids adding a gradient dep.
    backgroundColor: 'rgba(250,204,21,0.10)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(250,204,21,0.25)',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  iconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(250,204,21,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  textColumn: {
    flex: 1,
  },
  label: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.timerActive,
    letterSpacing: 1.5,
  },
  countdown: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.primary,
    fontVariant: ['tabular-nums'],
    lineHeight: 22,
  },
  addPill: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: colors.border,
  },
  addPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
  },
  skipPill: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: colors.timerActive,
  },
  skipPillText: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.onAccent,
    letterSpacing: 0.3,
  },
  progressTrack: {
    height: 3,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 2,
    marginTop: 8,
    overflow: 'hidden',
  },
  progressFill: {
    height: 3,
    backgroundColor: colors.timerActive,
    borderRadius: 2,
  },
});
