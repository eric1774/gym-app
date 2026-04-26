import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme/colors';
import { weightBold } from '../theme/typography';
import { formatTonnage } from '../utils/formatTonnage';
import { GradientBackdrop } from './GradientBackdrop';
import type { StatsStripData } from '../db/progress';

export interface StatsStripProps {
  data: StatsStripData;
  onPress: () => void;
}

export function StatsStrip({ data, onPress }: StatsStripProps) {
  const sDelta = data.sessions.current - data.sessions.lastWeek;
  const pDelta = data.prs.current - data.prs.lastWeek;
  const tDelta = data.tonnage.currentLb - data.tonnage.lastWeekLb;
  const arrow = (n: number) => (n > 0 ? '↑' : n < 0 ? '↓' : '•');

  return (
    <Pressable testID="stats-strip" onPress={onPress} style={styles.strip}>
      <GradientBackdrop
        borderRadius={16}
        base={{ from: colors.surface, to: colors.surface, angleDeg: 0 }}
        overlays={[{
          type: 'radial',
          cx: '50%', cy: '50%', rx: '160%', ry: '160%',
          stops: [
            { offset: 0.00, color: '#FFB800', opacity: 0.10 },
            { offset: 0.10, color: '#FFB800', opacity: 0.085 },
            { offset: 0.20, color: '#FFB800', opacity: 0.070 },
            { offset: 0.30, color: '#FFB800', opacity: 0.055 },
            { offset: 0.40, color: '#FFB800', opacity: 0.040 },
            { offset: 0.50, color: '#FFB800', opacity: 0.030 },
            { offset: 0.60, color: '#FFB800', opacity: 0.020 },
            { offset: 0.70, color: '#FFB800', opacity: 0.012 },
            { offset: 0.80, color: '#FFB800', opacity: 0.006 },
            { offset: 0.90, color: '#FFB800', opacity: 0.002 },
            { offset: 1.00, color: '#FFB800', opacity: 0     },
          ],
        }]}
      />
      <View style={styles.inner}>
        <Stat testID="stats-strip-sessions"
          value={String(data.sessions.current)} valueColor={colors.textSoft}
          delta={`${arrow(sDelta)} ${Math.abs(sDelta)} vs last wk`} label="SESSIONS" />
        <Divider />
        <Stat testID="stats-strip-prs"
          value={String(data.prs.current)} valueColor={colors.prGold} valueShadow
          delta={`${arrow(pDelta)} ${Math.abs(pDelta)} vs last wk`} label="PRs" />
        <Divider />
        <Stat testID="stats-strip-tonnage"
          value={formatTonnage(data.tonnage.currentLb)} valueColor={colors.textSoft}
          delta={`${arrow(tDelta)} ${formatTonnage(Math.abs(tDelta)).replace(' lb', '')} vs last wk`}
          label="TONNAGE" />
      </View>
    </Pressable>
  );
}

function Stat({ testID, value, valueColor, valueShadow, delta, label }: {
  testID: string; value: string; valueColor: string; valueShadow?: boolean; delta: string; label: string;
}) {
  return (
    <View style={styles.stat}>
      <Text testID={`${testID}-value`} style={[styles.value, { color: valueColor }, valueShadow && styles.valueShadow]}>{value}</Text>
      <Text testID={`${testID}-delta`} style={styles.delta}>{delta}</Text>
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

function Divider() { return <View style={styles.divider} />; }

const styles = StyleSheet.create({
  strip: {
    borderColor: colors.goldBorder, borderWidth: 1, borderRadius: 16,
    marginHorizontal: 16, marginBottom: 12, overflow: 'hidden',
  },
  inner: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 6 },
  stat: { flex: 1, alignItems: 'center', paddingHorizontal: 4 },
  value: { fontSize: 18, fontWeight: weightBold, letterSpacing: -0.3 },
  valueShadow: { textShadowColor: 'rgba(255,184,0,0.3)', textShadowRadius: 12 },
  delta: { fontSize: 9, fontWeight: '600', color: colors.textSoft, marginTop: 3 },
  label: { fontSize: 9, color: colors.secondary, letterSpacing: 1, fontWeight: '600', marginTop: 4, textTransform: 'uppercase' },
  divider: { width: 1, height: 36, backgroundColor: colors.border },
});
