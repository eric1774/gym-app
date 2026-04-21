import React, { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

import {
  getProgram,
  getProgramDays,
  getWeekOverrideCounts,
  getWeekData,
  upsertWeekData,
} from '../db/programs';
import type { Program, ProgramDay, ProgramWeek } from '../types';
import {
  colors,
  spacing,
  fontSize,
  weightRegular,
  weightSemiBold,
  weightBold,
} from '../theme';
import type { ProgramsStackParamList } from '../navigation/TabNavigator';
import { WeekEditModal } from '../components/WeekEditModal';

type Route = RouteProp<ProgramsStackParamList, 'CustomizeWeeks'>;
type Nav = NativeStackNavigationProp<ProgramsStackParamList, 'CustomizeWeeks'>;

export function CustomizeWeeksScreen() {
  const nav = useNavigation<Nav>();
  const route = useRoute<Route>();
  const { programId } = route.params;
  const handleBack = useCallback(() => {
    nav.goBack();
  }, [nav]);

  const [program, setProgram] = useState<Program | null>(null);
  const [days, setDays] = useState<ProgramDay[]>([]);
  const [counts, setCounts] = useState<Record<number, number>>({});
  const [weekData, setWeekData] = useState<Record<number, ProgramWeek | null>>({});
  const [editingWeek, setEditingWeek] = useState<number | null>(null);

  const refresh = useCallback(async () => {
    const [p, d, c] = await Promise.all([
      getProgram(programId),
      getProgramDays(programId),
      getWeekOverrideCounts(programId),
    ]);
    setProgram(p);
    setDays(d);
    setCounts(c);
    if (p) {
      const entries = await Promise.all(
        Array.from({ length: p.weeks }, (_, i) => i + 1).map(async wk => {
          const w = await getWeekData(programId, wk);
          return [wk, w] as const;
        }),
      );
      setWeekData(Object.fromEntries(entries));
    }
  }, [programId]);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh]),
  );

  const handleSaveWeek = useCallback(
    async (name: string | null, details: string | null) => {
      if (editingWeek === null) return;
      try {
        await upsertWeekData(programId, editingWeek, name, details);
        await refresh();
      } catch {
        // ignore
      }
    },
    [programId, editingWeek, refresh],
  );

  if (!program) {
    return <SafeAreaView style={styles.root} />;
  }

  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={handleBack}
          style={styles.backButton}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text style={styles.backText}>{'\u2039'}</Text>
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle} numberOfLines={1}>
            Customize Weeks
          </Text>
        </View>
        <View style={styles.headerRight} />
      </View>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.sectionLabel}>Base template</Text>
        {days.map(d => (
          <TouchableOpacity
            key={`base-${d.id}`}
            style={styles.row}
            onPress={() =>
              nav.navigate('WeekDayEditor', {
                programId,
                scope: 'base',
                dayId: d.id,
                dayName: d.name,
              })
            }
          >
            <Text style={styles.rowTitle}>Base · {d.name}</Text>
            <Text style={styles.rowChev}>›</Text>
          </TouchableOpacity>
        ))}

        <Text style={styles.sectionLabel}>Weeks</Text>
        {Array.from({ length: program.weeks }, (_, i) => i + 1).map(wk => {
          const isCurrent = wk === program.currentWeek;
          const overrideCount = counts[wk] ?? 0;
          const weekLabel = weekData[wk]?.name ?? null;
          return (
            <View key={`wk-${wk}`} style={styles.weekGroup}>
              <TouchableOpacity
                style={styles.weekHeaderRow}
                activeOpacity={0.7}
                onPress={() => setEditingWeek(wk)}>
                <Text style={styles.weekHeaderText}>
                  <Text style={styles.weekNumber}>W{wk}</Text>
                  {weekLabel ? <Text style={styles.weekName}>{'  '}{weekLabel}</Text> : null}
                  {isCurrent ? <Text style={styles.currentStar}>  ★</Text> : null}
                </Text>
                {overrideCount > 0 ? (
                  <View style={styles.overridePill}>
                    <Text style={styles.overridePillText}>{overrideCount} overrides</Text>
                  </View>
                ) : (
                  <Text style={styles.inheritsMeta}>inherits base</Text>
                )}
              </TouchableOpacity>
              {days.map(d => (
                <TouchableOpacity
                  key={`wk-${wk}-${d.id}`}
                  style={[styles.row, isCurrent && styles.rowCurrent]}
                  onPress={() =>
                    nav.navigate('WeekDayEditor', {
                      programId,
                      scope: { week: wk },
                      dayId: d.id,
                      dayName: d.name,
                    })
                  }
                >
                  <Text style={styles.rowTitle}>{d.name}</Text>
                  <Text style={styles.rowChev}>›</Text>
                </TouchableOpacity>
              ))}
            </View>
          );
        })}
      </ScrollView>
      <WeekEditModal
        visible={editingWeek !== null}
        weekNumber={editingWeek ?? 1}
        totalWeeks={program.weeks}
        currentName={editingWeek != null ? (weekData[editingWeek]?.name ?? '') : ''}
        currentDetails={editingWeek != null ? (weekData[editingWeek]?.details ?? '') : ''}
        onClose={() => setEditingWeek(null)}
        onSave={handleSaveWeek}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.base,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
  },
  backButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backText: {
    fontSize: 32,
    color: colors.accent,
    fontWeight: weightBold,
    lineHeight: 36,
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: fontSize.lg,
    fontWeight: weightBold,
    color: colors.primary,
  },
  headerRight: {
    width: 44,
  },
  scrollContent: {
    paddingBottom: spacing.xl,
  },
  sectionLabel: {
    fontSize: fontSize.sm,
    fontWeight: weightBold,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.base,
    color: colors.secondary,
  },
  weekGroup: {
    marginTop: spacing.md,
  },
  weekHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.base,
    marginBottom: spacing.xs,
  },
  weekHeaderText: {
    flex: 1,
    fontSize: fontSize.base,
    fontWeight: weightSemiBold,
    color: colors.primary,
  },
  weekNumber: {
    color: colors.primary,
    fontSize: fontSize.base,
    fontWeight: weightSemiBold,
  },
  weekName: {
    color: colors.primary,
    fontSize: fontSize.base,
    fontWeight: weightSemiBold,
  },
  currentStar: {
    color: colors.accent,
    fontSize: fontSize.base,
    fontWeight: weightSemiBold,
  },
  overridePill: {
    backgroundColor: colors.accentGlow,
    borderRadius: 20,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  overridePillText: {
    color: colors.accent,
    fontSize: fontSize.xs,
    fontWeight: weightSemiBold,
  },
  inheritsMeta: {
    color: colors.secondaryDim,
    fontSize: fontSize.sm,
    fontWeight: weightRegular,
    fontStyle: 'italic',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.base,
    marginHorizontal: spacing.base,
    marginVertical: spacing.xs + 2,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceElevated,
  },
  rowCurrent: {
    borderLeftWidth: 3,
    borderLeftColor: colors.accent,
  },
  rowTitle: {
    fontSize: fontSize.base,
    fontWeight: weightSemiBold,
    color: colors.primary,
    flex: 1,
  },
  rowChev: {
    fontSize: fontSize.md,
    color: colors.secondary,
  },
});
