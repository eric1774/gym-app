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

const niceMin = (v: number) => v * 0.95;
const niceMax = (v: number) => v * 1.05;

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
  const yWeight = (w: number) => {
    const usable = VIEW_H - PAD_TOP - PAD_BOTTOM;
    return PAD_TOP + (1 - (w - wMin) / (wMax - wMin)) * usable;
  };
  const yVolume = (v: number) => {
    const usable = VIEW_H - PAD_TOP - PAD_BOTTOM;
    return PAD_TOP + (1 - (v - vMin) / (vMax - vMin)) * usable;
  };

  const linePath = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${xFor(i)} ${yWeight(p.bestWeightLb)}`)
    .join(' ');

  const barWidth = (VIEW_W / points.length) * 0.6;

  const wTicks = [wMax, wMax - (wMax - wMin) * 0.33, wMax - (wMax - wMin) * 0.66, wMin];
  const vTicks = [vMax, vMax - (vMax - vMin) * 0.33, vMax - (vMax - vMin) * 0.66, vMin];

  return (
    <View style={styles.container}>
      <View style={styles.dualAxis}>
        <View style={styles.yAxis}>
          <Text style={[styles.axisHeader, { color: colors.accent }]}>━ lb</Text>
          {wTicks.map((t, i) => (
            <Text key={i} testID={`y-tick-mint-${i}`} style={styles.tickMint}>{Math.round(t)}</Text>
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
          <Text style={[styles.axisHeader, { color: colors.slate }]}>▮ k lb</Text>
          {vTicks.map((t, i) => (
            <Text key={i} testID={`y-tick-slate-${i}`} style={styles.tickSlate}>
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
  dualAxis: { flexDirection: 'row', gap: 5 },
  yAxis: { width: 30, justifyContent: 'space-between', paddingVertical: 6 },
  axisHeader: { fontSize: 8, fontWeight: weightBold, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 5 },
  tickMint: { color: colors.accent, fontSize: 9, fontWeight: weightSemiBold, textAlign: 'right' },
  tickSlate: { color: colors.slate, fontSize: 9, fontWeight: weightSemiBold, textAlign: 'left' },
  empty: {
    height: 130,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 14,
  },
  emptyText: { color: colors.secondary, fontSize: fontSize.sm },
});
