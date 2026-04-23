import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { OverlayChart } from './OverlayChart';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { fontSize, weightBold, weightSemiBold } from '../theme/typography';
import type { BodyMetric } from '../types';
import type { DailyCalorieTotal, ProgramBound } from '../db/bodyMetrics';

export interface BodyCompMonthViewProps {
  startDate: string;
  endDate: string;
  weightsForChart: BodyMetric[];    // may span startDate - 7 days for MA context
  weightsInRange: BodyMetric[];     // strictly in [startDate, endDate] for KPIs
  bodyFat: BodyMetric[];
  calories: DailyCalorieTotal[];
  programs: ProgramBound[];
  calorieGoal: number;
  onBodyFatDotPress?: (date: string) => void;
}

function avg(xs: number[]): number | null {
  if (xs.length === 0) { return null; }
  return xs.reduce((a, b) => a + b, 0) / xs.length;
}

function Kpi({ label, value, delta, deltaColor }: { label: string; value: string; delta?: string; deltaColor?: string }) {
  return (
    <View style={styles.kpi}>
      <Text style={styles.kpiLabel}>{label}</Text>
      <Text style={styles.kpiValue}>{value}</Text>
      {delta ? <Text style={[styles.kpiDelta, { color: deltaColor ?? colors.secondary }]}>{delta}</Text> : null}
    </View>
  );
}

function SummaryRow({ label, value, valueColor }: { label: string; value: string; valueColor?: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={[styles.rowValue, valueColor ? { color: valueColor } : undefined]}>{value}</Text>
    </View>
  );
}

export function BodyCompMonthView({
  startDate,
  endDate,
  weightsForChart,
  weightsInRange,
  bodyFat,
  calories,
  programs,
  calorieGoal,
  onBodyFatDotPress,
}: BodyCompMonthViewProps) {
  const avgWeight = avg(weightsInRange.map(w => w.value));
  const avgCals = avg(calories.map(c => c.total));
  const latestBf = bodyFat.length > 0 ? bodyFat[bodyFat.length - 1].value : null;

  const monthDelta = weightsInRange.length >= 2
    ? weightsInRange[weightsInRange.length - 1].value - weightsInRange[0].value
    : null;

  const daysLogged = weightsInRange.length;
  const daysOverGoal = calories.filter(c => c.total > calorieGoal).length;
  const weeks = Math.max(1, (new Date(endDate).getTime() - new Date(startDate).getTime()) / (86400000 * 7));
  const ratePerWeek = monthDelta != null ? monthDelta / weeks : null;

  return (
    <View>
      <View style={styles.kpiRow}>
        <Kpi
          label="AVG WEIGHT"
          value={avgWeight != null ? `${avgWeight.toFixed(1)} lb` : '—'}
        />
        <Kpi
          label="AVG CALS"
          value={avgCals != null ? `${Math.round(avgCals).toLocaleString()}` : '—'}
          delta={`goal ${calorieGoal}`}
        />
        <Kpi
          label="BODY FAT"
          value={latestBf != null ? `${latestBf.toFixed(1)}%` : '—'}
          delta={latestBf == null ? 'not logged' : ''}
        />
      </View>

      <View style={styles.chartCard}>
        <OverlayChart
          scope="month"
          startDate={startDate}
          endDate={endDate}
          weights={weightsForChart.map(w => ({ recordedDate: w.recordedDate, value: w.value }))}
          calories={calories}
          bodyFat={bodyFat.map(b => ({ recordedDate: b.recordedDate, value: b.value }))}
          programs={programs}
          calorieGoal={calorieGoal}
          onBodyFatDotPress={onBodyFatDotPress}
        />
      </View>

      <Text style={styles.sectionLabel}>MONTH SUMMARY</Text>
      <View style={styles.list}>
        <SummaryRow
          label="Monthly weight change"
          value={monthDelta != null ? `${monthDelta > 0 ? '↑' : '↓'} ${Math.abs(monthDelta).toFixed(1)} lb` : '—'}
          valueColor={
            monthDelta != null && monthDelta < 0 ? colors.accent
            : monthDelta != null && monthDelta > 0 ? colors.danger
            : undefined
          }
        />
        <SummaryRow label="Weigh-ins" value={`${daysLogged}`} />
        <SummaryRow label="Days over calorie goal" value={`${daysOverGoal}`} />
        <SummaryRow
          label="Rate"
          value={ratePerWeek != null ? `${ratePerWeek > 0 ? '↑' : '↓'} ${Math.abs(ratePerWeek).toFixed(1)} lb/wk` : '—'}
          valueColor={ratePerWeek != null && ratePerWeek < 0 ? colors.accent : undefined}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  kpiRow: { flexDirection: 'row', gap: spacing.sm, paddingHorizontal: spacing.base, paddingTop: spacing.sm },
  kpi: { flex: 1, backgroundColor: colors.surface, borderRadius: 12, padding: spacing.md },
  kpiLabel: { color: colors.secondary, fontSize: fontSize.xs, fontWeight: weightBold, letterSpacing: 0.6 },
  kpiValue: { color: colors.primary, fontSize: fontSize.md, fontWeight: weightBold, marginTop: 2 },
  kpiDelta: { fontSize: fontSize.xs, marginTop: 2, fontWeight: weightSemiBold },
  chartCard: { backgroundColor: colors.surface, borderRadius: 12, margin: spacing.base, padding: spacing.md },
  sectionLabel: { color: colors.secondary, fontSize: fontSize.xs, fontWeight: weightBold, letterSpacing: 0.8, paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.xs },
  list: { backgroundColor: colors.surface, borderRadius: 12, marginHorizontal: spacing.base },
  row: { flexDirection: 'row', justifyContent: 'space-between', padding: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.surfaceElevated },
  rowLabel: { color: colors.primary, fontSize: fontSize.sm },
  rowValue: { color: colors.primary, fontSize: fontSize.sm, fontWeight: weightSemiBold },
});
