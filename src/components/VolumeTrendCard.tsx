import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Rect, Line, Circle, Defs, LinearGradient, Stop } from 'react-native-svg';
import { colors } from '../theme/colors';
import { weightBold } from '../theme/typography';
import { GradientBackdrop } from './GradientBackdrop';

export interface VolumeTrendCardProps {
  deltaPercent: number | null;
  weeklyBars: { weekStart: string; tonnageLb: number }[];
  onPress: () => void;
}

export function VolumeTrendCard({ deltaPercent, weeklyBars, onPress }: VolumeTrendCardProps) {
  const signed = deltaPercent === null
    ? '—'
    : `${deltaPercent >= 0 ? '+' : ''}${Math.round(deltaPercent)}`;

  return (
    <Pressable testID="volume-trend-card" onPress={onPress} style={styles.card}>
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
          <Text style={styles.label}>VOLUME · 4 WK</Text>
          <Text style={styles.chev}>›</Text>
        </View>
        <View style={styles.numRow}>
          <Text style={styles.num}>{signed}</Text>
          {deltaPercent !== null && <Text style={styles.unit}>%</Text>}
        </View>
        <Text testID="volume-trend-context" style={styles.context}>vs prior 4 wk</Text>
        <BarSparkline bars={weeklyBars} />
      </View>
    </Pressable>
  );
}

function BarSparkline({ bars }: { bars: { tonnageLb: number }[] }) {
  if (bars.length === 0) { return null; }
  const W = 120, H = 32;
  const headroom = 4;
  const availH = H - headroom;
  const max = Math.max(...bars.map((b) => b.tonnageLb), 1);
  const barW = 22, gap = 6;
  const totalBarsW = bars.length * barW + (bars.length - 1) * gap;
  const offsetX = (W - totalBarsW) / 2;
  const tops = bars.map((b, i) => {
    const h = (b.tonnageLb / max) * availH;
    return { x: offsetX + i * (barW + gap), y: H - h, h };
  });
  return (
    <Svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none">
      <Defs>
        <LinearGradient id="vFill" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0%" stopColor={colors.accent} stopOpacity={0.25} />
          <Stop offset="100%" stopColor={colors.accent} stopOpacity={0} />
        </LinearGradient>
      </Defs>
      {tops.map((t, i) => (
        <Rect key={i} x={t.x} y={t.y} width={barW} height={t.h} fill="url(#vFill)" />
      ))}
      {tops.slice(0, -1).map((t, i) => (
        <Line
          key={`l${i}`}
          x1={t.x + barW / 2} y1={t.y}
          x2={tops[i + 1].x + barW / 2} y2={tops[i + 1].y}
          stroke={colors.accent} strokeWidth={1.4}
        />
      ))}
      {tops.map((t, i) => (
        <Circle key={`c${i}`} cx={t.x + barW / 2} cy={t.y} r={i === tops.length - 1 ? 2.5 : 2} fill={colors.accent} />
      ))}
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
  context: { fontSize: 10, fontWeight: '600', color: colors.textSoft, marginTop: 2 },
});
