import React from 'react';
import { Dimensions, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Line, Path, Rect, Text as SvgText } from 'react-native-svg';
import { computeMovingAverage } from '../db/bodyMetrics';
import { colors } from '../theme/colors';
import { fontSize, weightSemiBold } from '../theme/typography';
import type { BodyCompScope } from '../types';

// ── Public data interfaces (stable API for Tasks 17-18 to consume) ──
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

const PADDING = { top: 12, bottom: 26, left: 36, right: 42 };

const BAR_OVER_GOAL = 'rgba(244,167,107,0.7)';   // warm orange — cal > goal
const BAR_UNDER_GOAL = 'rgba(141,194,138,0.6)';  // mint at 60% — cal <= goal
const GOAL_LINE = 'rgba(244,167,107,0.35)';      // faint orange for goal reference

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

function formatCalTick(v: number): string {
  if (v >= 1000) { return `${(v / 1000).toFixed(v >= 10000 ? 0 : 1)}k`; }
  return String(Math.round(v));
}

export function OverlayChart({
  scope,
  startDate,
  endDate,
  weights,
  calories,
  bodyFat,
  programs,
  calorieGoal,
}: OverlayChartProps) {
  const W = Dimensions.get('window').width - 2 * 16;
  const H = scope === 'week' ? 200 : 170;
  const innerW = W - PADDING.left - PADDING.right;
  const innerH = H - PADDING.top - PADDING.bottom;

  const tMin = toTime(startDate);
  const tMax = toTime(endDate);
  const tSpan = Math.max(1, tMax - tMin);

  // Weight Y-domain
  const ws = weights.map(w => w.value);
  const minWeight = ws.length > 0 ? Math.min(...ws) - 1 : 175;
  const maxWeight = ws.length > 0 ? Math.max(...ws) + 1 : 180;
  const wSpan = Math.max(0.1, maxWeight - minWeight);

  // Calorie Y-domain — goes through 0 so bars grow from the baseline.
  const calTotals = calories.map(c => c.total);
  const maxCal = calTotals.length > 0
    ? Math.max(...calTotals, calorieGoal) * 1.1
    : calorieGoal * 1.2;
  const calSpan = Math.max(1, maxCal);

  const timeToX = (t: number) =>
    PADDING.left + ((t - tMin) / tSpan) * innerW;
  const weightToY = (v: number) =>
    PADDING.top + innerH - ((v - minWeight) / wSpan) * innerH;
  const caloriesToY = (v: number) =>
    PADDING.top + innerH - (v / calSpan) * innerH;

  // Weight line path
  const weightPath = weights
    .map((w, i) => {
      const x = timeToX(toTime(w.recordedDate));
      const y = weightToY(w.value);
      return `${i === 0 ? 'M' : 'L'}${x.toFixed(2)},${y.toFixed(2)}`;
    })
    .join(' ');

  // 7-day moving average — compute MA ending at each weight-reading date.
  // Skip null entries (fewer than 3 samples in the window).
  const maPoints = weights
    .map(w => {
      const ma = computeMovingAverage(
        weights.map(p => ({ recordedDate: p.recordedDate, value: p.value })),
        w.recordedDate,
        7,
      );
      return ma != null
        ? { t: toTime(w.recordedDate), y: weightToY(ma) }
        : null;
    })
    .filter((p): p is { t: number; y: number } => p !== null);

  const maPath = maPoints
    .map((p, i) => `${i === 0 ? 'M' : 'L'}${timeToX(p.t).toFixed(2)},${p.y.toFixed(2)}`)
    .join(' ');

  // BF% dots — positioned on the weight line's Y on each BF% reading's date.
  // If there's no weight on that date, fall back to the midpoint of the weight scale.
  const bfDots = bodyFat
    .filter(b => {
      const t = toTime(b.recordedDate);
      return t >= tMin && t <= tMax;
    })
    .map(b => {
      const wOnDate = weights.find(w => w.recordedDate === b.recordedDate);
      const yValue = wOnDate ? wOnDate.value : (minWeight + maxWeight) / 2;
      return {
        x: timeToX(toTime(b.recordedDate)),
        y: weightToY(yValue),
      };
    });

  // Program boundary overlays — MONTH scope only.
  // For each program, a start line and an end line, each shown only if it falls in view.
  const programLines = scope === 'month'
    ? programs.flatMap((p, i) => {
        const startMs = toTime(p.startDate);
        const endMs = toTime(p.startDate) + p.weeks * 7 * 86400000;
        const inView = (ms: number) => ms >= tMin && ms <= tMax;
        const out: { x: number; label: string }[] = [];
        if (inView(startMs)) { out.push({ x: timeToX(startMs), label: `P${i + 1} start` }); }
        if (inView(endMs))   { out.push({ x: timeToX(endMs),   label: `P${i + 1} end`   }); }
        return out;
      })
    : [];

  // Y-axis ticks (left — weight)
  const weightTicks = [0, 1, 2, 3].map(i => {
    const v = minWeight + (i / 3) * wSpan;
    return { v, y: weightToY(v) };
  });

  // Y-axis ticks (right — calories: 0, goal, max)
  const calTickValues = [0, calorieGoal, maxCal];
  const calTicks = calTickValues.map(v => ({ v, y: caloriesToY(v) }));

  // X-axis ticks
  const tickCount = scope === 'week' ? 7 : scope === 'month' ? 4 : 0;
  const timeTicks = tickCount > 0
    ? Array.from({ length: tickCount }, (_, i) => {
        const t = tMin + (i / Math.max(1, tickCount - 1)) * tSpan;
        return { t, x: timeToX(t), label: formatTimeTick(t, scope) };
      })
    : [];

  const axisY = PADDING.top + innerH;
  const barWidth = scope === 'week' ? 22 : 6;
  const goalLineY = caloriesToY(calorieGoal);

  return (
    <View testID="overlay-chart">
      {/* Legend — identifies the 3 data series so color reuse (mint = weight line + under-goal bars) isn't ambiguous. */}
      <View style={legendStyles.row}>
        <View style={legendStyles.item}>
          <View style={legendStyles.weightLine} />
          <Text style={legendStyles.label}>Weight (lb)</Text>
        </View>
        <View style={legendStyles.item}>
          <View style={legendStyles.calSwatchRow}>
            <View style={[legendStyles.calSwatch, { backgroundColor: BAR_UNDER_GOAL }]} />
            <View style={[legendStyles.calSwatch, { backgroundColor: BAR_OVER_GOAL }]} />
          </View>
          <Text style={legendStyles.label}>Calories (kcal)</Text>
        </View>
        <View style={legendStyles.item}>
          <View style={legendStyles.bfDot} />
          <Text style={legendStyles.label}>Body Fat %</Text>
        </View>
      </View>
      <Svg width={W} height={H}>
        {/* 0. Axis unit hints — tiny labels at the top of each Y-axis region */}
        <SvgText
          x={PADDING.left - 6}
          y={PADDING.top - 2}
          fill={colors.secondary}
          fontSize={8}
          textAnchor="end"
          opacity={0.7}
        >
          lb
        </SvgText>
        <SvgText
          x={W - PADDING.right + 4}
          y={PADDING.top - 2}
          fill={colors.secondary}
          fontSize={8}
          textAnchor="start"
          opacity={0.7}
        >
          kcal
        </SvgText>

        {/* 1. Weight horizontal grid lines */}
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

        {/* 2. Calorie goal reference line (dashed, faint orange) */}
        <Line
          x1={PADDING.left}
          x2={W - PADDING.right}
          y1={goalLineY}
          y2={goalLineY}
          stroke={GOAL_LINE}
          strokeDasharray="3,3"
          strokeWidth={1}
        />

        {/* 3. Calorie bars (behind weight line) */}
        {calories.map((c, i) => {
          const x = timeToX(toTime(c.recordedDate));
          const y = caloriesToY(c.total);
          const h = axisY - y;
          if (h <= 0) { return null; }
          return (
            <Rect
              key={`cb-${i}`}
              x={x - barWidth / 2}
              y={y}
              width={barWidth}
              height={h}
              fill={c.total > calorieGoal ? BAR_OVER_GOAL : BAR_UNDER_GOAL}
            />
          );
        })}

        {/* 4. Bottom X-axis baseline */}
        <Line
          x1={PADDING.left}
          x2={W - PADDING.right}
          y1={axisY}
          y2={axisY}
          stroke={colors.surfaceElevated}
          strokeWidth={1}
        />

        {/* 5. Left Y-axis labels (weight in lb) */}
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

        {/* 6. Right Y-axis labels (calories) */}
        {calTicks.map((tick, i) => (
          <SvgText
            key={`cl-${i}`}
            x={W - PADDING.right + 4}
            y={tick.y + 3}
            fill={colors.secondary}
            fontSize={9}
            textAnchor="start"
          >
            {formatCalTick(tick.v)}
          </SvgText>
        ))}

        {/* 7. X-axis tick labels */}
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

        {/* 8. Raw weight line — faint (texture) */}
        {weights.length >= 2 && (
          <Path
            d={weightPath}
            stroke="rgba(141,194,138,0.35)"
            strokeWidth={1.2}
            fill="none"
          />
        )}

        {/* 9. 7-day MA line — bold (main signal) */}
        {maPoints.length >= 2 && (
          <Path
            d={maPath}
            stroke={colors.accent}
            strokeWidth={2.5}
            fill="none"
          />
        )}

        {/* 10. BF% gold dots — positioned on the weight line */}
        {bfDots.map((dot, i) => (
          <Circle
            key={`bf-${i}`}
            cx={dot.x}
            cy={dot.y}
            r={5}
            fill="#F4C77B"
            stroke={colors.background}
            strokeWidth={1.5}
          />
        ))}

        {/* 11. Program boundary lines + labels (MONTH scope only) */}
        {programLines.map((line, i) => (
          <React.Fragment key={`pb-${i}`}>
            <Line
              x1={line.x}
              x2={line.x}
              y1={PADDING.top}
              y2={axisY}
              stroke={colors.secondary}
              strokeDasharray="3,3"
              strokeWidth={1}
              opacity={0.6}
            />
            <SvgText
              x={line.x}
              y={PADDING.top - 2}
              fill={colors.secondary}
              fontSize={8}
              textAnchor="middle"
            >
              {line.label}
            </SvgText>
          </React.Fragment>
        ))}
      </Svg>
    </View>
  );
}

const legendStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 14,
    paddingBottom: 8,
    paddingLeft: 4,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  label: {
    color: colors.secondary,
    fontSize: fontSize.xs,
    fontWeight: weightSemiBold,
  },
  weightLine: {
    width: 14,
    height: 2,
    backgroundColor: colors.accent,
    borderRadius: 1,
  },
  calSwatchRow: {
    flexDirection: 'row',
    gap: 1,
  },
  calSwatch: {
    width: 6,
    height: 10,
    borderRadius: 1,
  },
  bfDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#F4C77B',
    borderColor: colors.background,
    borderWidth: 1,
  },
});
