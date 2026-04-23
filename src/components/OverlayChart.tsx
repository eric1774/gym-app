import React from 'react';
import { Dimensions, View } from 'react-native';
import Svg, { Circle, Line, Path, Text as SvgText } from 'react-native-svg';
import { colors } from '../theme/colors';
import type { BodyCompScope } from '../types';

// ── Public data interfaces (stable API for Tasks 16-18 to consume) ──
export interface WeightPoint { recordedDate: string; value: number }
export interface CaloriePoint { recordedDate: string; total: number }
export interface BodyFatPoint { recordedDate: string; value: number }
export interface ProgramBound { id: number; name: string; startDate: string; weeks: number }

export interface OverlayChartProps {
  scope: BodyCompScope;
  startDate: string;
  endDate: string;
  weights: WeightPoint[];
  calories: CaloriePoint[];
  bodyFat: BodyFatPoint[];
  programs: ProgramBound[];
  calorieGoal: number;
}

// Padding inside the SVG to leave room for axis labels.
const PADDING = { top: 12, bottom: 26, left: 36, right: 36 };

// Parse a YYYY-MM-DD date to a noon-UTC timestamp — stable across DST.
function toTime(date: string): number {
  return new Date(date + 'T12:00:00Z').getTime();
}

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function formatTimeTick(t: number, scope: BodyCompScope): string {
  const d = new Date(t);
  if (scope === 'month') { return String(d.getUTCDate()); }
  if (scope === 'week')  { return DAY_LABELS[d.getUTCDay()]; }
  return '';
}

export function OverlayChart({
  scope,
  startDate,
  endDate,
  weights,
}: OverlayChartProps) {
  const W = Dimensions.get('window').width - 2 * 16; // account for outer screen padding
  const H = scope === 'week' ? 200 : 170;
  const innerW = W - PADDING.left - PADDING.right;
  const innerH = H - PADDING.top - PADDING.bottom;

  const tMin = toTime(startDate);
  const tMax = toTime(endDate);
  const tSpan = Math.max(1, tMax - tMin);

  // Weight Y-domain — snap to data with 1-lb padding, fall back to a pleasant default.
  const ws = weights.map(w => w.value);
  const minWeight = ws.length > 0 ? Math.min(...ws) - 1 : 175;
  const maxWeight = ws.length > 0 ? Math.max(...ws) + 1 : 180;
  const wSpan = Math.max(0.1, maxWeight - minWeight);

  const timeToX = (t: number) =>
    PADDING.left + ((t - tMin) / tSpan) * innerW;
  const weightToY = (v: number) =>
    PADDING.top + innerH - ((v - minWeight) / wSpan) * innerH;

  // Build weight polyline: M x1,y1 L x2,y2 L ... (straight segments).
  // Single-point data renders nothing in the path; we draw a dot below so it's still visible.
  const weightPath = weights
    .map((w, i) => {
      const x = timeToX(toTime(w.recordedDate));
      const y = weightToY(w.value);
      return `${i === 0 ? 'M' : 'L'}${x.toFixed(2)},${y.toFixed(2)}`;
    })
    .join(' ');

  // Y-axis ticks: 4 evenly spaced values across weight domain.
  const weightTicks = [0, 1, 2, 3].map(i => {
    const v = minWeight + (i / 3) * wSpan;
    return { v, y: weightToY(v) };
  });

  // X-axis ticks: 7 for week (one per day), 4 for month (week markers), 0 for day.
  const tickCount = scope === 'week' ? 7 : scope === 'month' ? 4 : 0;
  const timeTicks = tickCount > 0
    ? Array.from({ length: tickCount }, (_, i) => {
        const t = tMin + (i / Math.max(1, tickCount - 1)) * tSpan;
        return { t, x: timeToX(t), label: formatTimeTick(t, scope) };
      })
    : [];

  const axisY = PADDING.top + innerH; // baseline of the chart

  return (
    <View testID="overlay-chart">
      <Svg width={W} height={H}>
        {/* Horizontal grid lines at each weight tick */}
        {weightTicks.map((tick, i) => (
          <Line
            key={`wg-${i}`}
            x1={PADDING.left}
            x2={W - PADDING.right}
            y1={tick.y}
            y2={tick.y}
            stroke={colors.surfaceElevated}
            strokeDasharray="2,3"
            strokeWidth={1}
          />
        ))}

        {/* Left Y-axis labels (weight, lb) */}
        {weightTicks.map((tick, i) => (
          <SvgText
            key={`wl-${i}`}
            x={PADDING.left - 6}
            y={tick.y + 3}
            fill={colors.secondary}
            fontSize={9}
            textAnchor="end"
          >
            {tick.v.toFixed(0)}
          </SvgText>
        ))}

        {/* Bottom X-axis baseline */}
        <Line
          x1={PADDING.left}
          x2={W - PADDING.right}
          y1={axisY}
          y2={axisY}
          stroke={colors.surfaceElevated}
          strokeWidth={1}
        />

        {/* X-axis tick labels */}
        {timeTicks.map((tick, i) => (
          <SvgText
            key={`xl-${i}`}
            x={tick.x}
            y={axisY + 14}
            fill={colors.secondary}
            fontSize={9}
            textAnchor="middle"
          >
            {tick.label}
          </SvgText>
        ))}

        {/* Weight line */}
        {weights.length >= 2 && (
          <Path
            d={weightPath}
            stroke={colors.accent}
            strokeWidth={2.5}
            fill="none"
          />
        )}

        {/* Weight dots — always render so single-point data is still visible */}
        {weights.map((w, i) => (
          <Circle
            key={`wd-${i}`}
            cx={timeToX(toTime(w.recordedDate))}
            cy={weightToY(w.value)}
            r={2.5}
            fill={colors.accent}
          />
        ))}
      </Svg>
    </View>
  );
}
