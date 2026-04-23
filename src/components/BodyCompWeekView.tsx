import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { OverlayChart } from './OverlayChart';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { fontSize, weightBold, weightSemiBold } from '../theme/typography';
import type { BodyMetric } from '../types';
import type { DailyCalorieTotal, ProgramBound } from '../db/bodyMetrics';

export interface BodyCompWeekViewProps {
  startDate: string;
  endDate: string;
  weightsForChart: BodyMetric[];  // spans startDate - 7 days for MA context
  weightsInRange: BodyMetric[];   // strictly in [startDate, endDate] for KPIs + daily breakdown
  bodyFat: BodyMetric[];
  calories: DailyCalorieTotal[];
  programs: ProgramBound[];
  calorieGoal: number;
  onJumpToDay: (date: string) => void;
  onLongPressDay?: (date: string) => void;
}

function formatDayRow(iso: string): string {
  const d = new Date(iso + 'T00:00:00');
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${dayNames[d.getDay()]} ${monthNames[d.getMonth()]} ${d.getDate()}`;
}

export function BodyCompWeekView({
  startDate,
  endDate,
  weightsForChart,
  weightsInRange,
  bodyFat,
  calories,
  programs,
  calorieGoal,
  onJumpToDay,
  onLongPressDay,
}: BodyCompWeekViewProps) {
  // Build the 7-day grid
  const start = new Date(startDate + 'T00:00:00');
  const days: string[] = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  });

  const weightByDate = new Map(weightsInRange.map(w => [w.recordedDate, w.value]));
  const calorieByDate = new Map(calories.map(c => [c.recordedDate, c.total]));

  const avgWeight = weightsInRange.length > 0
    ? weightsInRange.reduce((a, w) => a + w.value, 0) / weightsInRange.length
    : null;
  const avgCals = calories.length > 0
    ? calories.reduce((a, c) => a + c.total, 0) / calories.length
    : null;

  return (
    <View>
      <View style={styles.kpiRow}>
        <View style={styles.kpi}>
          <Text style={styles.kpiLabel}>WEEK AVG</Text>
          <Text style={styles.kpiValue}>{avgWeight != null ? `${avgWeight.toFixed(1)} lb` : '—'}</Text>
        </View>
        <View style={styles.kpi}>
          <Text style={styles.kpiLabel}>AVG CALS</Text>
          <Text style={styles.kpiValue}>{avgCals != null ? `${Math.round(avgCals).toLocaleString()}` : '—'}</Text>
          <Text style={styles.kpiDelta}>goal {calorieGoal}</Text>
        </View>
      </View>

      <View style={styles.chartCard}>
        <OverlayChart
          scope="week"
          startDate={startDate}
          endDate={endDate}
          weights={weightsForChart.map(w => ({ recordedDate: w.recordedDate, value: w.value }))}
          calories={calories}
          bodyFat={bodyFat.map(b => ({ recordedDate: b.recordedDate, value: b.value }))}
          programs={programs}
          calorieGoal={calorieGoal}
        />
      </View>

      <Text style={styles.sectionLabel}>DAILY BREAKDOWN · Tap a day</Text>
      <View style={styles.list}>
        {days.map((date) => {
          const w = weightByDate.get(date);
          const c = calorieByDate.get(date);
          const isOver = c != null && c > calorieGoal;
          return (
            <Pressable
              key={date}
              testID={`week-row-${date}`}
              onPress={() => onJumpToDay(date)}
              onLongPress={() => onLongPressDay?.(date)}
              style={styles.row}
            >
              <Text style={styles.rowLabel}>{formatDayRow(date)}</Text>
              <Text style={[styles.rowValue, isOver ? { color: '#F4A76B' } : undefined]}>
                {w != null ? `${w.toFixed(1)}` : '—'} · {c != null ? `${c.toLocaleString()} kcal` : '—'}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  kpiRow: { flexDirection: 'row', gap: spacing.sm, paddingHorizontal: spacing.base, paddingTop: spacing.sm },
  kpi: { flex: 1, backgroundColor: colors.surface, borderRadius: 12, padding: spacing.md },
  kpiLabel: { color: colors.secondary, fontSize: fontSize.xs, fontWeight: weightBold, letterSpacing: 0.6 },
  kpiValue: { color: colors.primary, fontSize: fontSize.md, fontWeight: weightBold, marginTop: 2 },
  kpiDelta: { fontSize: fontSize.xs, marginTop: 2, color: colors.secondary },
  chartCard: { backgroundColor: colors.surface, borderRadius: 12, margin: spacing.base, padding: spacing.md },
  sectionLabel: { color: colors.secondary, fontSize: fontSize.xs, fontWeight: weightBold, letterSpacing: 0.8, paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.xs },
  list: { backgroundColor: colors.surface, borderRadius: 12, marginHorizontal: spacing.base },
  row: { flexDirection: 'row', justifyContent: 'space-between', padding: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.surfaceElevated },
  rowLabel: { color: colors.primary, fontSize: fontSize.sm },
  rowValue: { color: colors.primary, fontSize: fontSize.sm, fontWeight: weightSemiBold },
});
