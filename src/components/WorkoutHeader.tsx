import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Easing,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { colors } from '../theme/colors';
import { HrPill, HrZone } from './HrPill';
import { Trophy } from './icons';

interface WorkoutHeaderProps {
  title: string;                 // e.g. 'PUSH DAY'
  elapsed: number;               // seconds
  volume: number;                // lb
  setCount: number;
  prCount: number;
  hr: { bpm: number | null; zone: HrZone | null };
  onFinish: () => void;
}

/** Format elapsed seconds as MM:SS (or H:MM:SS for >= 1 hour). */
function formatElapsed(seconds: number): string {
  if (seconds >= 3600) {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export function WorkoutHeader({
  title,
  elapsed,
  volume,
  setCount,
  prCount,
  hr,
  onFinish,
}: WorkoutHeaderProps) {
  const pulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 0.4, duration: 700, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: 700, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  return (
    <View style={styles.container}>
      <View style={styles.topRow}>
        <View style={styles.leftColumn}>
          <View style={styles.eyebrowRow}>
            <Animated.View style={[styles.liveDot, { opacity: pulse }]} />
            <Text style={styles.eyebrowText}>LIVE · {title.toUpperCase()}</Text>
          </View>
          <Text style={styles.elapsedText}>{formatElapsed(elapsed)}</Text>
        </View>
        <View style={styles.rightColumn}>
          <HrPill bpm={hr.bpm} zone={hr.zone} />
          <TouchableOpacity
            onPress={onFinish}
            style={styles.finishButton}
            activeOpacity={0.7}>
            <Text style={styles.finishText}>FINISH</Text>
          </TouchableOpacity>
        </View>
      </View>
      <View style={styles.statsRow}>
        <View style={styles.stat}>
          <Text style={styles.statLabel}>VOLUME</Text>
          <Text style={styles.statValue}>
            {volume.toLocaleString()} <Text style={styles.statUnit}>lb</Text>
          </Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.stat}>
          <Text style={styles.statLabel}>SETS</Text>
          <Text style={styles.statValue}>{setCount}</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.stat}>
          <View style={styles.prLabelRow}>
            <Trophy size={10} color={colors.prGold} />
            <Text style={styles.statLabel}>PRS</Text>
          </View>
          <Text style={[styles.statValue, prCount > 0 && { color: colors.prGold }]}>
            {prCount}
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 12,
    backgroundColor: colors.background,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: 8,
  },
  leftColumn: {
    flex: 1,
  },
  rightColumn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  eyebrowRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.accent,
  },
  eyebrowText: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.accent,
    letterSpacing: 2,
  },
  elapsedText: {
    fontSize: 32,
    fontWeight: '800',
    color: colors.primary,
    letterSpacing: -1,
    lineHeight: 32,
    marginTop: 4,
    fontVariant: ['tabular-nums'],
  },
  finishButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: 'rgba(217,83,79,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(217,83,79,0.25)',
  },
  finishText: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.danger,
    letterSpacing: 0.4,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 12,
    alignItems: 'center',
  },
  stat: {
    flexShrink: 0,
  },
  statDivider: {
    width: 1,
    alignSelf: 'stretch',
    backgroundColor: colors.border,
  },
  statLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.secondary,
    letterSpacing: 1.4,
  },
  statValue: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.primary,
    fontVariant: ['tabular-nums'],
    marginTop: 2,
  },
  statUnit: {
    fontSize: 11,
    fontWeight: '500',
    color: colors.secondary,
  },
  prLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
});
