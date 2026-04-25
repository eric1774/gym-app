import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Defs, LinearGradient, Path, Stop, Circle } from 'react-native-svg';
import { colors } from '../theme/colors';
import { weightBold } from '../theme/typography';
import { GradientBackdrop } from './GradientBackdrop';

export interface WeightTrendCardProps {
  today: number | null;
  currentSevenDayMA: number | null;
  previousSevenDayMA: number | null;
  dailySeries: { date: string; weight: number }[];
  onPress: () => void;
}

export function WeightTrendCard({
  today, currentSevenDayMA, previousSevenDayMA, dailySeries, onPress,
}: WeightTrendCardProps) {
  const delta = (currentSevenDayMA !== null && previousSevenDayMA !== null)
    ? currentSevenDayMA - previousSevenDayMA
    : null;

  return (
    <Pressable testID="weight-trend-card" onPress={onPress} style={styles.card}>
      <GradientBackdrop
        borderRadius={14}
        base={{ from: '#1E2327', to: '#1E2327', angleDeg: 0 }}
        overlays={[{
          type: 'linear',
          angleDeg: 135,
          stops: [
            { offset: 0.00, color: '#5B7A95', opacity: 0.42 },
            { offset: 0.15, color: '#5B7A95', opacity: 0.36 },
            { offset: 0.30, color: '#5B7A95', opacity: 0.30 },
            { offset: 0.45, color: '#5B7A95', opacity: 0.25 },
            { offset: 0.60, color: '#5B7A95', opacity: 0.20 },
            { offset: 0.75, color: '#5B7A95', opacity: 0.16 },
            { offset: 0.90, color: '#5B7A95', opacity: 0.13 },
            { offset: 1.00, color: '#5B7A95', opacity: 0.11 },
          ],
        }]}
      />
      <View style={styles.inner}>
        <View style={styles.topRow}>
          <Text style={styles.label}>WEIGHT</Text>
          <Text style={styles.chev}>›</Text>
        </View>
        <View style={styles.numRow}>
          <Text style={styles.num}>{today !== null ? today.toFixed(1) : '—'}</Text>
          {today !== null && <Text style={styles.unit}> lb</Text>}
        </View>
        <Text testID="weight-trend-delta" style={styles.delta}>
          {today !== null && delta === null
            ? '—'
            : today !== null && delta !== null
              ? `${delta < 0 ? '↓' : delta > 0 ? '↑' : '•'} ${Math.abs(delta).toFixed(1)} lb · 7d avg`
              : ''}
        </Text>
        <Sparkline series={dailySeries} />
      </View>
    </Pressable>
  );
}

function Sparkline({ series }: { series: { date: string; weight: number }[] }) {
  if (series.length < 2) { return null; }
  const ys = series.map((d) => d.weight);
  const minY = Math.min(...ys), maxY = Math.max(...ys);
  const range = maxY - minY || 1;
  const W = 120, H = 32;
  const pts = series.map((d, i) => ({
    x: (i / (series.length - 1)) * W,
    y: H - ((d.weight - minY) / range) * H,
  }));
  const rawPath = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
  const maPts = pts.map((_, i) => {
    const w = pts.slice(Math.max(0, i - 6), i + 1);
    return { x: pts[i].x, y: w.reduce((s, p) => s + p.y, 0) / w.length };
  });
  const maPath = maPts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
  return (
    <Svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none">
      <Defs>
        <LinearGradient id="wFill" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0%" stopColor={colors.accent} stopOpacity={0.25} />
          <Stop offset="100%" stopColor={colors.accent} stopOpacity={0} />
        </LinearGradient>
      </Defs>
      <Path d={rawPath} stroke={`${colors.accent}73`} strokeWidth={1} fill="none" strokeLinecap="round" />
      <Path d={maPath} stroke={colors.accent} strokeWidth={1.7} fill="none" strokeLinecap="round" />
      <Circle cx={maPts[maPts.length - 1].x} cy={maPts[maPts.length - 1].y} r={2.5} fill={colors.accent} />
    </Svg>
  );
}

const styles = StyleSheet.create({
  card: {
    borderColor: colors.slateBorder, borderWidth: 1, borderRadius: 14,
    flex: 1, overflow: 'hidden',
  },
  inner: { padding: 12 },
  topRow: { flexDirection: 'row', justifyContent: 'space-between' },
  label: { fontSize: 9, color: colors.secondary, letterSpacing: 1.2, fontWeight: weightBold },
  chev: { fontSize: 14, color: colors.secondary, opacity: 0.6 },
  numRow: { flexDirection: 'row', alignItems: 'baseline', marginTop: 6 },
  num: { fontSize: 26, fontWeight: weightBold, color: colors.primary, letterSpacing: -0.5 },
  unit: { fontSize: 10, color: colors.secondary },
  delta: { fontSize: 10, fontWeight: '600', color: colors.textSoft, marginTop: 2 },
});
