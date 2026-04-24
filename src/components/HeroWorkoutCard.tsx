import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme/colors';
import { weightBold } from '../theme/typography';
import { GradientBackdrop } from './GradientBackdrop';

export interface HeroWorkoutCardProps {
  dayName: string;
  exerciseCount: number;
  estimatedMinutes: number | null;
  programLabel: string;
  weekNumber: number | null;
  dayNumber: number | null;
  exerciseChips: string[];
  context: {
    exerciseName: string;
    weightLb: number;
    reps: number;
    addedSinceLastLb: number | null;
  } | null;
  activeElapsedSeconds: number | null;
  onPress: () => void;
}

function fmtElapsed(s: number): string {
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}

export function HeroWorkoutCard(p: HeroWorkoutCardProps) {
  const isActive = p.activeElapsedSeconds !== null;
  const eyebrow = isActive
    ? `ACTIVE WORKOUT · ${fmtElapsed(p.activeElapsedSeconds!)}`
    : `UP NEXT${p.weekNumber !== null ? ` · WEEK ${p.weekNumber}` : ''}${p.dayNumber !== null ? ` · DAY ${p.dayNumber}` : ''}`;

  const metaParts: string[] = [`${p.exerciseCount} exercises`];
  if (p.estimatedMinutes !== null) { metaParts.push(`est. ${p.estimatedMinutes} min`); }
  metaParts.push(p.programLabel);

  const chipsVisible = p.exerciseChips.slice(0, 3);
  const moreCount = p.exerciseChips.length - chipsVisible.length;

  return (
    <View style={styles.card}>
      <GradientBackdrop
        borderRadius={18}
        base={{ from: '#1E2024', to: '#1A3326', angleDeg: 135 }}
        overlays={[
          {
            type: 'radial',
            cx: '0%', cy: '0%', rx: '115%', ry: '115%',
            stops: [
              { offset: 0,    color: '#8DC28A', opacity: 0.32 },
              { offset: 0.2,  color: '#8DC28A', opacity: 0.20 },
              { offset: 0.4,  color: '#8DC28A', opacity: 0.11 },
              { offset: 0.6,  color: '#8DC28A', opacity: 0.05 },
              { offset: 0.8,  color: '#8DC28A', opacity: 0.015 },
              { offset: 1,    color: '#8DC28A', opacity: 0 },
            ],
          },
        ]}
      />
      <View style={styles.inner}>
        <Text style={styles.eyebrow}>{eyebrow}</Text>
        <Text style={styles.title}>{p.dayName}</Text>
        <Text style={styles.meta}>{metaParts.join(' · ')}</Text>
        {p.context && (
          <View style={styles.lastLineRow}>
            <Text style={styles.lastLineLabel}>{'Last time: '}</Text>
            <Text style={styles.lastLineBright}>
              {`${p.context.exerciseName} ${p.context.weightLb}×${p.context.reps}`}
            </Text>
            {p.context.addedSinceLastLb !== null && (
              <Text style={styles.lastLineLabel}>
                {` · you added ${Math.round(p.context.addedSinceLastLb)} lb`}
              </Text>
            )}
          </View>
        )}
        <View style={styles.row}>
          <View style={styles.chips}>
            {chipsVisible.map((name) => (
              <View key={name} style={styles.chip}>
                <Text style={styles.chipText}>{name}</Text>
              </View>
            ))}
            {moreCount > 0 && (
              <View style={[styles.chip, styles.chipMore]}>
                <Text style={[styles.chipText, styles.chipMoreText]}>{`+${moreCount} more`}</Text>
              </View>
            )}
          </View>
          <Pressable testID="hero-start-button" onPress={p.onPress} style={styles.startBtn}>
            <Text style={styles.startText}>{isActive ? 'CONTINUE ▶' : 'START ▶'}</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderColor: 'rgba(141,194,138,0.3)', borderWidth: 1, borderRadius: 18,
    marginHorizontal: 16, marginBottom: 10, overflow: 'hidden',
  },
  inner: { padding: 16 },
  eyebrow: { fontSize: 9, color: colors.accent, letterSpacing: 1.5, fontWeight: weightBold },
  title: { fontSize: 22, fontWeight: weightBold, color: colors.primary, letterSpacing: -0.4, marginTop: 6 },
  meta: { fontSize: 11, color: colors.secondary, marginTop: 2 },
  lastLineRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', marginTop: 8 },
  lastLineLabel: { fontSize: 10, color: 'rgba(141,194,138,0.85)', fontWeight: '500' },
  lastLineBright: { fontSize: 10, color: colors.accent, fontWeight: weightBold },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 14, gap: 10 },
  chips: { flexDirection: 'row', gap: 5, flexWrap: 'wrap', flex: 1, minWidth: 0 },
  chip: { backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 7, paddingHorizontal: 9, paddingVertical: 4 },
  chipText: { fontSize: 10, fontWeight: '600', color: colors.primary },
  chipMore: { backgroundColor: 'transparent' },
  chipMoreText: { color: colors.secondary },
  startBtn: {
    backgroundColor: colors.accent, paddingVertical: 10, paddingHorizontal: 18,
    borderRadius: 999, minHeight: 44, justifyContent: 'center',
    shadowColor: colors.accent, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35, shadowRadius: 16, elevation: 4,
  },
  startText: { fontSize: 12, fontWeight: weightBold, color: colors.onAccent, letterSpacing: 0.3 },
});
