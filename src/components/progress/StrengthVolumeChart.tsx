import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Svg, { Path, Rect, Circle, Line } from 'react-native-svg';
import { ChartPoint } from '../../types';
import { colors } from '../../theme/colors';
import { fontSize, weightBold, weightSemiBold } from '../../theme/typography';

interface Props {
  points: ChartPoint[];
  onPointTap: (p: ChartPoint) => void;
}

const VIEW_W = 220;
const VIEW_H = 130;
const PAD_TOP = 8;
const PAD_BOTTOM = 14;
const TICK_LH = 11; // tick label line-height — used to vertically center each label on its SVG y-coord

const niceMin = (v: number) => v * 0.95;
const niceMax = (v: number) => v * 1.05;

// SVG y-coord for tick i (0 = top = max value, 3 = bottom = min value).
// Mirrors the formula used by yWeight()/yVolume() so the label sits at the
// exact same vertical position that the SVG plots that value.
const tickSvgY = (i: number) => PAD_TOP + (i / 3) * (VIEW_H - PAD_TOP - PAD_BOTTOM);
const tickTop = (i: number) => tickSvgY(i) - TICK_LH / 2;

export const StrengthVolumeChart: React.FC<Props> = ({ points, onPointTap }) => {
  if (points.length < 2) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyText}>Log 2+ sessions to see your trend</Text>
      </View>
    );
  }

  const weights = points.map(p => p.bestWeightLb);
  const volumes = points.map(p => p.volumeLb);
  const wMin = niceMin(Math.min(...weights));
  const wMax = niceMax(Math.max(...weights));
  const vMin = niceMin(Math.min(...volumes));
  const vMax = niceMax(Math.max(...volumes));

  const xFor = (i: number) => (i / (points.length - 1)) * VIEW_W;
  const usableH = VIEW_H - PAD_TOP - PAD_BOTTOM;
  // Center the series vertically when the data is flat (e.g. bodyweight exercises
  // where every bestWeightLb is 0, or someone who always lifts the same weight).
  // Without these guards, (w - wMin) / 0 → NaN → the SVG path parser throws and
  // crashes the app at the native layer.
  const yWeight = (w: number) => {
    const range = wMax - wMin;
    if (range <= 0) { return PAD_TOP + usableH / 2; }
    return PAD_TOP + (1 - (w - wMin) / range) * usableH;
  };
  const yVolume = (v: number) => {
    const range = vMax - vMin;
    if (range <= 0) { return PAD_TOP + usableH / 2; }
    return PAD_TOP + (1 - (v - vMin) / range) * usableH;
  };

  const linePath = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${xFor(i)} ${yWeight(p.bestWeightLb)}`)
    .join(' ');

  const barWidth = (VIEW_W / points.length) * 0.6;

  const wTicks = [wMax, wMax - (wMax - wMin) * 0.33, wMax - (wMax - wMin) * 0.66, wMin];
  const vTicks = [vMax, vMax - (vMax - vMin) * 0.33, vMax - (vMax - vMin) * 0.66, vMin];

  return (
    <View style={styles.container}>
      <View style={styles.legendRow}>
        <Text style={[styles.axisHeader, { color: colors.accent }]}>━ lb</Text>
        <Text style={[styles.axisHeader, { color: colors.slate }]}>▮ k lb</Text>
      </View>
      <View style={styles.dualAxis}>
        <View style={styles.yAxis}>
          {wTicks.map((t, i) => (
            <Text
              key={i}
              testID={`y-tick-mint-${i}`}
              style={[styles.tickMint, { position: 'absolute', top: tickTop(i), right: 0, left: 0 }]}>
              {Math.round(t)}
            </Text>
          ))}
        </View>
        <View style={{ flex: 1 }}>
          <Svg viewBox={`0 0 ${VIEW_W} ${VIEW_H}`} style={{ width: '100%', height: VIEW_H }}>
            {/* Dashed grid lines */}
            <Line x1={0} y1={VIEW_H * 0.25} x2={VIEW_W} y2={VIEW_H * 0.25}
                  stroke="rgba(255,255,255,0.04)" strokeDasharray="2,3" />
            <Line x1={0} y1={VIEW_H * 0.5} x2={VIEW_W} y2={VIEW_H * 0.5}
                  stroke="rgba(255,255,255,0.04)" strokeDasharray="2,3" />
            <Line x1={0} y1={VIEW_H * 0.75} x2={VIEW_W} y2={VIEW_H * 0.75}
                  stroke="rgba(255,255,255,0.04)" strokeDasharray="2,3" />
            {/* Bars */}
            {points.map((p, i) => {
              const x = xFor(i) - barWidth / 2;
              const y = yVolume(p.volumeLb);
              const h = (VIEW_H - PAD_BOTTOM) - y;
              return (
                <Rect key={i} testID={`chart-bar-${i}`}
                      x={x} y={y} width={barWidth} height={h}
                      fill={colors.slate} fillOpacity={0.45} rx={1.5} />
              );
            })}
            {/* Line */}
            <Path d={linePath} stroke={colors.accent} strokeWidth={2.5} fill="none" />
            {/* Points */}
            {points.map((p, i) => (
              <Circle key={i} cx={xFor(i)} cy={yWeight(p.bestWeightLb)} r={3}
                      fill={p.isPR && i === points.length - 1 ? colors.prGold : colors.accent}
                      stroke={p.isPR && i === points.length - 1 ? colors.surfaceElevated : 'none'}
                      strokeWidth={p.isPR && i === points.length - 1 ? 1.5 : 0} />
            ))}
          </Svg>
          {/* Tap targets overlaid (since SVG taps inside react-native-svg are flaky) */}
          <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
            {points.map((p, i) => {
              const cx = (xFor(i) / VIEW_W) * 100;
              return (
                <TouchableOpacity
                  key={i}
                  testID={`chart-point-${i}`}
                  hitSlop={{ top: 12, bottom: 12, left: 8, right: 8 }}
                  style={{ position: 'absolute', left: `${cx}%`, top: '0%', width: 18, height: VIEW_H, marginLeft: -9 }}
                  onPress={() => onPointTap(p)}
                />
              );
            })}
          </View>
        </View>
        <View style={styles.yAxis}>
          {vTicks.map((t, i) => (
            <Text
              key={i}
              testID={`y-tick-slate-${i}`}
              style={[styles.tickSlate, { position: 'absolute', top: tickTop(i), right: 0, left: 0 }]}>
              {Math.round(t / 1000)}
            </Text>
          ))}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surfaceElevated,
    borderColor: colors.slateBorder,
    borderWidth: 1,
    borderRadius: 14,
    padding: 11,
  },
  legendRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  dualAxis: { flexDirection: 'row', gap: 5 },
  // Fixed height matches the SVG so absolute-positioned ticks share its coord system.
  yAxis: { width: 30, height: VIEW_H, position: 'relative' },
  axisHeader: { fontSize: 8, fontWeight: weightBold, letterSpacing: 1, textTransform: 'uppercase' },
  tickMint: { color: colors.accent, fontSize: 9, lineHeight: TICK_LH, fontWeight: weightSemiBold, textAlign: 'right' },
  tickSlate: { color: colors.slate, fontSize: 9, lineHeight: TICK_LH, fontWeight: weightSemiBold, textAlign: 'left' },
  empty: {
    height: 130,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 14,
  },
  emptyText: { color: colors.secondary, fontSize: fontSize.sm },
});
