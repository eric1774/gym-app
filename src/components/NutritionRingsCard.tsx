// src/components/NutritionRingsCard.tsx
import React, { useCallback, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useFocusEffect, useNavigation, NavigationProp } from '@react-navigation/native';
import { ProgressRing } from './ProgressRing';
import { getMacroGoals, getTodayMacroTotals } from '../db/macros';
import { getWaterGoal, getTodayWaterTotal } from '../db/hydration';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { fontSize, weightBold, weightSemiBold } from '../theme/typography';
import type { MacroSettings, MacroValues } from '../types';
import type { TabParamList } from '../navigation/TabNavigator';

/** Per-ring color mapping matching the design spec. */
const RING_COLORS = {
  protein: colors.accent,     // #8DC28A mint
  carbs: '#F0B830',           // gold
  fat: '#E8845C',             // coral
  water: colors.water,        // #4A8DB7 ocean blue
} as const;

/** Per-macro tinted seat backgrounds. */
const SEAT_TINTS = {
  protein: 'rgba(141,194,138,0.06)',  // mint
  carbs:   'rgba(255,184,0,0.06)',    // gold
  fat:     'rgba(232,132,92,0.06)',   // coral
  water:   'rgba(74,141,183,0.06)',   // water blue
} as const;

function pct(current: number, goal: number | null): number {
  if (!goal || goal <= 0) return 0;
  return Math.min(100, Math.round((current / goal) * 100));
}

/** Compute the "Xg left" / "Xg over" / "Goal hit ✓" / "Set goal" sublabel. */
function sublabel(
  current: number,
  goal: number | null,
  unit: 'g' | 'oz',
): { text: string; style: 'accent' | 'secondary' | 'setGoal' } {
  if (goal === null) {
    return { text: 'Set goal', style: 'setGoal' };
  }
  const roundedCurrent = Math.round(current);
  const roundedGoal = Math.round(goal);
  if (roundedCurrent === roundedGoal) {
    return { text: 'Goal hit ✓', style: 'accent' };
  }
  if (roundedCurrent > roundedGoal) {
    return { text: `${roundedCurrent - roundedGoal}${unit} over`, style: 'secondary' };
  }
  return { text: `${roundedGoal - roundedCurrent}${unit} left`, style: 'secondary' };
}

// ─── Props ────────────────────────────────────────────────────────────────────

export interface MacroStat {
  current: number;
  goal: number | null;
}

export interface NutritionRingsViewProps {
  protein: MacroStat;
  carbs: MacroStat;
  fat: MacroStat;
  /** Water values in oz. */
  water: MacroStat;
  onRingPress?: (kind: 'protein' | 'carbs' | 'fat' | 'water') => void;
}

// ─── Pure presentation component ─────────────────────────────────────────────

export function NutritionRingsView({
  protein,
  carbs,
  fat,
  water,
  onRingPress,
}: NutritionRingsViewProps) {
  // Kcal calculations
  const currentKcal = Math.round(
    protein.current * 4 + carbs.current * 4 + fat.current * 9,
  );
  const allGoalsSet =
    protein.goal !== null && carbs.goal !== null && fat.goal !== null;
  const goalKcal = allGoalsSet
    ? Math.round(
        (protein.goal as number) * 4 +
          (carbs.goal as number) * 4 +
          (fat.goal as number) * 9,
      )
    : null;

  const rings = [
    {
      key: 'protein' as const,
      label: 'Protein',
      color: RING_COLORS.protein,
      seatTint: SEAT_TINTS.protein,
      current: protein.current,
      goal: protein.goal,
      unit: 'g' as const,
      delay: 0,
    },
    {
      key: 'carbs' as const,
      label: 'Carbs',
      color: RING_COLORS.carbs,
      seatTint: SEAT_TINTS.carbs,
      current: carbs.current,
      goal: carbs.goal,
      unit: 'g' as const,
      delay: 50,
    },
    {
      key: 'fat' as const,
      label: 'Fat',
      color: RING_COLORS.fat,
      seatTint: SEAT_TINTS.fat,
      current: fat.current,
      goal: fat.goal,
      unit: 'g' as const,
      delay: 100,
    },
    {
      key: 'water' as const,
      label: 'Water',
      color: RING_COLORS.water,
      seatTint: SEAT_TINTS.water,
      current: water.current,
      goal: water.goal,
      unit: 'oz' as const,
      delay: 150,
    },
  ];

  const kcalText =
    goalKcal !== null
      ? `${currentKcal.toLocaleString()} / ${goalKcal.toLocaleString()} kcal`
      : `${currentKcal.toLocaleString()} kcal`;

  return (
    <View style={styles.card}>
      {/* Header row: label left, kcal total right */}
      <View style={styles.headerRow}>
        <Text style={styles.headerLabel}>TODAY&apos;S NUTRITION</Text>
        <Text style={styles.kcalText}>{kcalText}</Text>
      </View>

      <View style={styles.row}>
        {rings.map((ring) => {
          const percentage = pct(ring.current, ring.goal);
          const sub = sublabel(ring.current, ring.goal, ring.unit);

          return (
            <TouchableOpacity
              key={ring.key}
              style={[styles.ringColumn, { backgroundColor: ring.seatTint }]}
              activeOpacity={0.7}
              onPress={() => onRingPress?.(ring.key)}
            >
              <ProgressRing
                percentage={percentage}
                color={ring.color}
                delay={ring.delay}
              />
              <Text style={styles.pctText}>
                {percentage}%
              </Text>
              <Text style={styles.label}>{ring.label}</Text>
              {sub.style === 'setGoal' ? (
                <Text style={styles.setGoal}>{sub.text}</Text>
              ) : sub.style === 'accent' ? (
                <Text style={styles.goalHit}>{sub.text}</Text>
              ) : (
                <Text style={styles.subLabel}>{sub.text}</Text>
              )}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

// ─── Data-fetching wrapper ────────────────────────────────────────────────────

export function NutritionRingsCard() {
  const navigation = useNavigation<NavigationProp<any>>();
  const [totals, setTotals] = useState<MacroValues>({ protein: 0, carbs: 0, fat: 0 });
  const [goals, setGoals] = useState<MacroSettings | null>(null);
  const [waterOz, setWaterOz] = useState(0);
  const [waterGoalOz, setWaterGoalOz] = useState<number | null>(null);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      (async () => {
        try {
          const [macroTotals, macroGoals, todayWater, waterSettings] = await Promise.all([
            getTodayMacroTotals(),
            getMacroGoals(),
            getTodayWaterTotal(),
            getWaterGoal(),
          ]);
          if (!cancelled) {
            setTotals(macroTotals);
            setGoals(macroGoals);
            setWaterOz(todayWater);
            setWaterGoalOz(waterSettings?.goalOz ?? null);
          }
        } catch (err) {
          console.warn('NutritionRingsCard fetch failed:', err);
        }
      })();
      return () => { cancelled = true; };
    }, []),
  );

  const navigateToHealth = useCallback((kind: 'protein' | 'carbs' | 'fat' | 'water') => {
    const tab = kind === 'water' ? 'hydration' : 'macros';
    const parent = navigation.getParent<NavigationProp<TabParamList>>();
    if (parent) {
      parent.navigate('ProteinTab', {
        screen: 'ProteinHome',
        params: { initialTab: tab === 'macros' ? 0 : 1 },
      });
    }
  }, [navigation]);

  return (
    <NutritionRingsView
      protein={{ current: totals.protein, goal: goals?.proteinGoal ?? null }}
      carbs={{ current: totals.carbs, goal: goals?.carbGoal ?? null }}
      fat={{ current: totals.fat, goal: goals?.fatGoal ?? null }}
      water={{ current: waterOz, goal: waterGoalOz }}
      onRingPress={navigateToHealth}
    />
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.base,
    marginHorizontal: spacing.base,
    marginBottom: spacing.md,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  headerLabel: {
    color: colors.secondary,
    fontSize: fontSize.sm,
    fontWeight: weightBold,
    letterSpacing: 1.2,
  },
  kcalText: {
    color: colors.secondary,
    fontSize: 9,
    fontWeight: '600',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'flex-start',
  },
  ringColumn: {
    alignItems: 'center',
    minWidth: 62,
    borderRadius: 10,
    paddingVertical: 6,
    paddingHorizontal: 4,
  },
  pctText: {
    position: 'absolute',
    top: 27,
    alignSelf: 'center',
    color: colors.primary,
    fontSize: 14,
    fontWeight: weightBold,
  },
  label: {
    color: colors.primary,
    fontSize: 11,
    fontWeight: weightSemiBold,
    marginTop: 6,
  },
  subLabel: {
    color: colors.secondary,
    fontSize: 10,
    marginTop: 2,
  },
  goalHit: {
    color: colors.accent,
    fontSize: 10,
    marginTop: 2,
  },
  setGoal: {
    color: colors.accent,
    fontSize: 10,
    marginTop: 2,
  },
});
