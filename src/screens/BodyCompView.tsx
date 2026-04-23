import React, { useCallback, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { fontSize, weightBold, weightSemiBold } from '../theme/typography';
import { Scale } from '../components/icons/Scale';
import { BodyCompScopeBar } from '../components/BodyCompScopeBar';
import { BodyCompDateNav } from '../components/BodyCompDateNav';
import { LogBodyMetricModal, LogBodyMetricPayload } from '../components/LogBodyMetricModal';
import { BodyCompMonthView } from '../components/BodyCompMonthView';
import {
  getBodyMetricsInRange,
  getDailyCalorieTotals,
  getProgramsInRange,
  upsertBodyMetric,
  type DailyCalorieTotal,
  type ProgramBound,
} from '../db/bodyMetrics';
import { getMacroGoals } from '../db/macros';
import { computeCalories } from '../utils/macros';
import type { BodyCompScope, BodyMetric } from '../types';

function isoToday(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function toISO(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function startOfWeekMonday(d: Date): Date {
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  const out = new Date(d);
  out.setDate(d.getDate() + diff);
  return out;
}

function subtractDays(isoDate: string, n: number): string {
  const d = new Date(isoDate + 'T00:00:00');
  d.setDate(d.getDate() - n);
  return toISO(d);
}

export function BodyCompView() {
  const today = useMemo(isoToday, []);
  const [scope, setScope] = useState<BodyCompScope>('month');
  const [date, setDate] = useState(today);
  const [hasAny, setHasAny] = useState<boolean | null>(null);
  const [logVisible, setLogVisible] = useState(false);

  // Data for the current scope
  const [weightsForChart, setWeightsForChart] = useState<BodyMetric[]>([]);
  const [weightsInRange, setWeightsInRange] = useState<BodyMetric[]>([]);
  const [bodyFat, setBodyFat] = useState<BodyMetric[]>([]);
  const [calories, setCalories] = useState<DailyCalorieTotal[]>([]);
  const [programs, setPrograms] = useState<ProgramBound[]>([]);
  const [calorieGoal, setCalorieGoal] = useState<number>(2200);

  // Compute the scope's [startDate, endDate] window from the current selected date.
  const { startDate, endDate } = useMemo(() => {
    const d = new Date(date + 'T00:00:00');
    if (scope === 'month') {
      const start = new Date(d.getFullYear(), d.getMonth(), 1);
      const end = new Date(d.getFullYear(), d.getMonth() + 1, 0);
      return { startDate: toISO(start), endDate: toISO(end) };
    }
    if (scope === 'week') {
      const start = startOfWeekMonday(d);
      const end = new Date(start);
      end.setDate(start.getDate() + 6);
      return { startDate: toISO(start), endDate: toISO(end) };
    }
    return { startDate: date, endDate: date };
  }, [scope, date]);

  const refresh = useCallback(async () => {
    // Widen the weight fetch by 7 days for the MA line's left-edge context.
    const chartStart = subtractDays(startDate, 7);

    const [allWeights, bf, cal, progs, macroGoals, anyWeights] = await Promise.all([
      getBodyMetricsInRange('weight', chartStart, endDate),
      getBodyMetricsInRange('body_fat', startDate, endDate),
      getDailyCalorieTotals(startDate, endDate),
      getProgramsInRange(startDate, endDate),
      getMacroGoals().catch(() => null),
      getBodyMetricsInRange('weight', '0000-01-01', '9999-12-31'),
    ]);

    setWeightsForChart(allWeights);
    setWeightsInRange(allWeights.filter(w => w.recordedDate >= startDate));
    setBodyFat(bf);
    setCalories(cal);
    setPrograms(progs);
    setCalorieGoal(
      macroGoals &&
      macroGoals.proteinGoal != null &&
      macroGoals.carbGoal != null &&
      macroGoals.fatGoal != null
        ? computeCalories(macroGoals.proteinGoal, macroGoals.carbGoal, macroGoals.fatGoal)
        : 2200,
    );
    setHasAny(anyWeights.length > 0);
  }, [startDate, endDate]);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh]),
  );

  const handleSave = async (payload: LogBodyMetricPayload) => {
    await upsertBodyMetric({
      metricType: payload.metricType,
      value: payload.value,
      unit: payload.unit,
      recordedDate: payload.recordedDate,
      note: payload.note,
    });
    await refresh();
  };

  // Empty state — no weights logged anywhere in history
  if (hasAny === false) {
    return (
      <View style={styles.emptyContainer}>
        <Scale size={72} color={colors.accent} />
        <Text style={styles.emptyTitle}>Log your first weight</Text>
        <Text style={styles.emptySubtitle}>
          Track daily weigh-ins and see how your calorie intake moves the needle.
        </Text>
        <Pressable onPress={() => setLogVisible(true)} style={styles.emptyBtn}>
          <Text style={styles.emptyBtnText}>+ Log today's weight</Text>
        </Pressable>
        <LogBodyMetricModal
          visible={logVisible}
          mode="weight"
          initialDate={today}
          onClose={() => setLogVisible(false)}
          onSave={handleSave}
        />
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <BodyCompScopeBar scope={scope} onChange={setScope} />
      <BodyCompDateNav scope={scope} date={date} today={today} onChange={setDate} />
      <ScrollView contentContainerStyle={{ paddingBottom: spacing.xxxl }}>
        {scope === 'month' ? (
          <BodyCompMonthView
            startDate={startDate}
            endDate={endDate}
            weightsForChart={weightsForChart}
            weightsInRange={weightsInRange}
            bodyFat={bodyFat}
            calories={calories}
            programs={programs}
            calorieGoal={calorieGoal}
          />
        ) : scope === 'week' ? (
          <Text style={{ color: colors.secondary, padding: spacing.lg }}>Week view — Task 20</Text>
        ) : (
          <Text style={{ color: colors.secondary, padding: spacing.lg }}>Day view — Task 21</Text>
        )}
      </ScrollView>
      <LogBodyMetricModal
        visible={logVisible}
        mode="weight"
        initialDate={today}
        onClose={() => setLogVisible(false)}
        onSave={handleSave}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
  emptyTitle: { color: colors.primary, fontSize: fontSize.lg, fontWeight: weightBold, marginTop: spacing.base },
  emptySubtitle: { color: colors.secondary, fontSize: fontSize.sm, textAlign: 'center', marginTop: spacing.sm, maxWidth: 280 },
  emptyBtn: { backgroundColor: colors.accent, paddingHorizontal: spacing.xl, paddingVertical: spacing.md, borderRadius: 10, marginTop: spacing.xl },
  emptyBtnText: { color: colors.background, fontSize: fontSize.base, fontWeight: weightBold },
});
