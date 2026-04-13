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

function pct(current: number, goal: number | null): number {
  if (!goal || goal <= 0) return 0;
  return Math.min(100, Math.round((current / goal) * 100));
}

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

  const proteinGoal = goals?.proteinGoal ?? null;
  const carbGoal = goals?.carbGoal ?? null;
  const fatGoal = goals?.fatGoal ?? null;

  const navigateToHealth = useCallback((tab: 'macros' | 'hydration') => {
    const parent = navigation.getParent<NavigationProp<TabParamList>>();
    if (parent) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (parent as any).navigate('ProteinTab', {
        screen: 'ProteinHome',
        params: { initialTab: tab === 'macros' ? 0 : 1 },
      });
    }
  }, [navigation]);

  const rings = [
    {
      key: 'protein',
      label: 'Protein',
      color: RING_COLORS.protein,
      current: totals.protein,
      goal: proteinGoal,
      unit: 'g',
      tab: 'macros' as const,
      delay: 0,
    },
    {
      key: 'carbs',
      label: 'Carbs',
      color: RING_COLORS.carbs,
      current: totals.carbs,
      goal: carbGoal,
      unit: 'g',
      tab: 'macros' as const,
      delay: 50,
    },
    {
      key: 'fat',
      label: 'Fat',
      color: RING_COLORS.fat,
      current: totals.fat,
      goal: fatGoal,
      unit: 'g',
      tab: 'macros' as const,
      delay: 100,
    },
    {
      key: 'water',
      label: 'Water',
      color: RING_COLORS.water,
      current: waterOz,
      goal: waterGoalOz,
      unit: 'oz',
      tab: 'hydration' as const,
      delay: 150,
    },
  ];

  return (
    <View style={styles.card}>
      <Text style={styles.header}>TODAY&apos;S NUTRITION</Text>
      <View style={styles.row}>
        {rings.map((ring) => {
          const percentage = pct(ring.current, ring.goal);
          const hasGoal = ring.goal !== null && ring.goal > 0;
          const subLabel = hasGoal
            ? `${Math.round(ring.current)}/${Math.round(ring.goal!)}${ring.unit}`
            : undefined;

          return (
            <TouchableOpacity
              key={ring.key}
              style={styles.ringColumn}
              activeOpacity={0.7}
              onPress={() => navigateToHealth(ring.tab)}
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
              {hasGoal ? (
                <Text style={styles.subLabel}>{subLabel}</Text>
              ) : (
                <Text style={styles.setGoal}>Set goal</Text>
              )}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

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
  header: {
    color: colors.secondary,
    fontSize: fontSize.sm,
    fontWeight: weightBold,
    letterSpacing: 1.2,
    marginBottom: spacing.md,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'flex-start',
  },
  ringColumn: {
    alignItems: 'center',
    minWidth: 62,
  },
  pctText: {
    position: 'absolute',
    top: 21,
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
  setGoal: {
    color: colors.accent,
    fontSize: 10,
    marginTop: 2,
  },
});
