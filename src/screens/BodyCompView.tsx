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
import { BodyCompWeekView } from '../components/BodyCompWeekView';
import { BodyCompDayView } from '../components/BodyCompDayView';
import {
  getBodyMetricByDate,
  getBodyMetricsInRange,
  getDailyCalorieTotals,
  getDayDetail,
  getProgramsInRange,
  upsertBodyMetric,
  computeMovingAverage,
  type DailyCalorieTotal,
  type DayDetail,
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
  const [dayDetail, setDayDetail] = useState<DayDetail | null>(null);
  const [yesterdayWeightInDay, setYesterdayWeightInDay] = useState<number | null>(null);
  const [firstOfMonthWeight, setFirstOfMonthWeight] = useState<number | null>(null);
  const [sevenDayMaVal, setSevenDayMaVal] = useState<number | null>(null);
  const [macroGoalsState, setMacroGoalsState] = useState<{ protein: number; carbs: number; fat: number }>({ protein: 180, carbs: 220, fat: 73 });

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

    if (scope === 'day') {
      setDayDetail(null);
      const detail = await getDayDetail(date);
      setDayDetail(detail);

      // Yesterday's weight (for vs-yesterday delta)
      const yIso = subtractDays(date, 1);
      const yRow = await getBodyMetricByDate('weight', yIso);
      setYesterdayWeightInDay(yRow?.value ?? null);

      // First weight logged in the current month (for monthly delta)
      const firstIso = date.slice(0, 8) + '01';
      const fomList = await getBodyMetricsInRange('weight', firstIso, date);
      setFirstOfMonthWeight(fomList[0]?.value ?? null);

      // 7-day MA ending at this date — use subtractDays for TZ-safe math
      const maStart = subtractDays(date, 6);
      const maPoints = await getBodyMetricsInRange('weight', maStart, date);
      setSevenDayMaVal(
        computeMovingAverage(
          maPoints.map(p => ({ recordedDate: p.recordedDate, value: p.value })),
          date,
          7,
        ),
      );

      // Macro goals for the rings. Reuse the already-fetched macroGoals
      // (same null-guard pattern as calorieGoal above — fields can be null).
      setMacroGoalsState(
        macroGoals &&
        macroGoals.proteinGoal != null &&
        macroGoals.carbGoal != null &&
        macroGoals.fatGoal != null
          ? { protein: macroGoals.proteinGoal, carbs: macroGoals.carbGoal, fat: macroGoals.fatGoal }
          : { protein: 180, carbs: 220, fat: 73 },
      );
    }
  }, [startDate, endDate, scope, date]);

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
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Body Composition</Text>
        <Pressable testID="body-comp-log-btn" onPress={() => setLogVisible(true)} style={styles.logBtn} hitSlop={8}>
          <Text style={styles.logBtnText}>+</Text>
        </Pressable>
      </View>
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
          <BodyCompWeekView
            startDate={startDate}
            endDate={endDate}
            weightsForChart={weightsForChart}
            weightsInRange={weightsInRange}
            bodyFat={bodyFat}
            calories={calories}
            programs={programs}
            calorieGoal={calorieGoal}
            onJumpToDay={(d) => { setScope('day'); setDate(d); }}
          />
        ) : dayDetail ? (
          <BodyCompDayView
            date={date}
            detail={dayDetail}
            yesterdayWeight={yesterdayWeightInDay}
            firstWeightOfMonth={firstOfMonthWeight}
            calorieGoal={calorieGoal}
            macroGoals={macroGoalsState}
            sevenDayMa={sevenDayMaVal}
          />
        ) : (
          <Text style={{ color: colors.secondary, padding: spacing.lg }}>Loading…</Text>
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
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.base, paddingTop: spacing.base },
  headerTitle: { color: colors.primary, fontSize: fontSize.base, fontWeight: weightSemiBold },
  logBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(141,194,138,0.15)', alignItems: 'center', justifyContent: 'center' },
  logBtnText: { color: colors.accent, fontSize: 22, fontWeight: '300' },
});
