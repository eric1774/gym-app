import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { fontSize, weightBold, weightSemiBold } from '../theme/typography';
import type { DayDetail } from '../db/bodyMetrics';

export interface BodyCompDayViewProps {
  date: string;
  detail: DayDetail;
  yesterdayWeight: number | null;
  firstWeightOfMonth: number | null;
  calorieGoal: number;
  macroGoals: { protein: number; carbs: number; fat: number };
  sevenDayMa: number | null;
}

function MacroCard({ label, color, grams, goal }: { label: string; color: string; grams: number; goal: number }) {
  return (
    <View style={styles.macroCard}>
      <View style={[styles.ring, { borderColor: color, borderRightColor: color + '33' }]}>
        <Text style={styles.ringVal}>{Math.round(grams)}</Text>
        <Text style={styles.ringGoal}>/{goal}g</Text>
      </View>
      <Text style={[styles.macroLabel, { color }]}>{label}</Text>
    </View>
  );
}

function formatTime(isoTs: string): string {
  const d = new Date(isoTs);
  let h = d.getHours();
  const m = String(d.getMinutes()).padStart(2, '0');
  const am = h < 12 ? 'AM' : 'PM';
  h = h % 12 || 12;
  return `${h}:${m} ${am}`;
}

export function BodyCompDayView({
  detail,
  yesterdayWeight,
  firstWeightOfMonth,
  calorieGoal,
  macroGoals,
  sevenDayMa,
}: BodyCompDayViewProps) {
  const deltaDay = detail.weight != null && yesterdayWeight != null ? detail.weight - yesterdayWeight : null;
  const deltaMonth = detail.weight != null && firstWeightOfMonth != null ? detail.weight - firstWeightOfMonth : null;
  const calDelta = detail.calories - calorieGoal;

  return (
    <View>
      <View style={styles.hero}>
        <Text style={styles.kpiLabel}>WEIGHT</Text>
        {detail.weight != null ? (
          <>
            <Text style={styles.heroVal}>{detail.weight.toFixed(1)}<Text style={styles.heroUnit}> lb</Text></Text>
            <Text style={styles.heroDelta}>
              {deltaDay != null ? `${deltaDay < 0 ? '↓' : '↑'} ${Math.abs(deltaDay).toFixed(1)} vs yesterday` : '—'}
              {deltaMonth != null ? ` · ${deltaMonth < 0 ? '↓' : '↑'} ${Math.abs(deltaMonth).toFixed(1)} this month` : ''}
            </Text>
          </>
        ) : (
          <Text style={styles.heroNo}>Not logged</Text>
        )}
      </View>

      <View style={styles.kpiRow}>
        <View style={styles.kpi}>
          <Text style={styles.kpiLabel}>CALORIES</Text>
          <Text style={styles.kpiValue}>{Math.round(detail.calories).toLocaleString()} <Text style={styles.kpiUnit}>/ {calorieGoal.toLocaleString()}</Text></Text>
          <Text style={[styles.kpiDelta, calDelta > 0 ? { color: colors.accent } : { color: '#F0B830' }]}>
            {Math.round(Math.abs(calDelta)).toLocaleString()} {calDelta >= 0 ? 'over' : 'under'} goal
          </Text>
        </View>
        <View style={styles.kpi}>
          <Text style={styles.kpiLabel}>7-DAY AVG</Text>
          <Text style={styles.kpiValue}>{sevenDayMa != null ? `${sevenDayMa.toFixed(1)} lb` : '—'}</Text>
          <Text style={styles.kpiDelta}>smoothed trend</Text>
        </View>
      </View>

      <View style={styles.macros}>
        <MacroCard label="PROTEIN" color="#8DC28A" grams={detail.protein} goal={macroGoals.protein} />
        <MacroCard label="CARBS"   color="#7EB2D9" grams={detail.carbs}   goal={macroGoals.carbs} />
        <MacroCard label="FAT"     color="#F4C77B" grams={detail.fat}     goal={macroGoals.fat} />
      </View>

      <Text style={styles.sectionLabel}>MEALS LOGGED</Text>
      <View style={styles.list}>
        {detail.meals.length === 0 ? (
          <View style={styles.row}>
            <Text style={styles.rowLabel}>No meals logged on this day</Text>
          </View>
        ) : (
          detail.meals.map((m, i) => (
            <View key={`${m.consumedAt}-${i}`} style={styles.meal}>
              <View style={styles.mealHead}>
                <Text style={styles.mealName}>{m.name} · {formatTime(m.consumedAt)}</Text>
                <Text style={styles.mealCal}>{Math.round(m.calories)} kcal</Text>
              </View>
              {m.items ? <Text style={styles.mealItems}>{m.items}</Text> : null}
            </View>
          ))
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: { alignItems: 'center', padding: spacing.lg },
  kpiLabel: { color: colors.secondary, fontSize: fontSize.xs, fontWeight: weightBold, letterSpacing: 0.6 },
  heroVal: { color: colors.primary, fontSize: 48, fontWeight: weightBold, marginTop: 4 },
  heroUnit: { color: colors.secondary, fontSize: fontSize.md, fontWeight: '400' },
  heroDelta: { color: colors.accent, fontSize: fontSize.sm, fontWeight: weightSemiBold, marginTop: 4, textAlign: 'center' },
  heroNo: { color: colors.secondary, fontSize: fontSize.lg, marginTop: 4 },
  kpiRow: { flexDirection: 'row', gap: spacing.sm, paddingHorizontal: spacing.base },
  kpi: { flex: 1, backgroundColor: colors.surface, borderRadius: 12, padding: spacing.md },
  kpiValue: { color: colors.primary, fontSize: fontSize.md, fontWeight: weightBold, marginTop: 2 },
  kpiUnit: { color: colors.secondary, fontSize: fontSize.xs, fontWeight: '400' },
  kpiDelta: { fontSize: fontSize.xs, marginTop: 2, color: colors.secondary, fontWeight: weightSemiBold },
  macros: { flexDirection: 'row', gap: spacing.sm, padding: spacing.base },
  macroCard: { flex: 1, backgroundColor: colors.surface, borderRadius: 12, padding: spacing.md, alignItems: 'center' },
  ring: { width: 54, height: 54, borderRadius: 27, borderWidth: 5, alignItems: 'center', justifyContent: 'center' },
  ringVal: { color: colors.primary, fontSize: fontSize.sm, fontWeight: weightBold },
  ringGoal: { color: colors.secondary, fontSize: 9 },
  macroLabel: { fontSize: fontSize.xs, fontWeight: weightBold, marginTop: 6, letterSpacing: 0.6 },
  sectionLabel: { color: colors.secondary, fontSize: fontSize.xs, fontWeight: weightBold, letterSpacing: 0.8, paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.xs },
  list: { backgroundColor: colors.surface, borderRadius: 12, marginHorizontal: spacing.base },
  row: { padding: spacing.md },
  rowLabel: { color: colors.secondary, fontSize: fontSize.sm, textAlign: 'center' },
  meal: { padding: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.surfaceElevated },
  mealHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  mealName: { color: colors.primary, fontSize: fontSize.sm, fontWeight: weightSemiBold },
  mealCal: { color: colors.secondary, fontSize: fontSize.xs },
  mealItems: { color: colors.secondary, fontSize: fontSize.xs, marginTop: 2 },
});
