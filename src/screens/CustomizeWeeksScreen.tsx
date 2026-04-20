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
} from '../db/programs';
import type { Program, ProgramDay } from '../types';
import { colors } from '../theme/colors';
import type { ProgramsStackParamList } from '../navigation/TabNavigator';

type Route = RouteProp<ProgramsStackParamList, 'CustomizeWeeks'>;
type Nav = NativeStackNavigationProp<ProgramsStackParamList, 'CustomizeWeeks'>;

export function CustomizeWeeksScreen() {
  const nav = useNavigation<Nav>();
  const route = useRoute<Route>();
  const { programId } = route.params;

  const [program, setProgram] = useState<Program | null>(null);
  const [days, setDays] = useState<ProgramDay[]>([]);
  const [counts, setCounts] = useState<Record<number, number>>({});
  const [weekNames, setWeekNames] = useState<Record<number, string | null>>({});

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
          return [wk, w?.name ?? null] as const;
        }),
      );
      setWeekNames(Object.fromEntries(entries));
    }
  }, [programId]);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh]),
  );

  if (!program) {
    return <SafeAreaView style={styles.root} />;
  }

  return (
    <SafeAreaView style={styles.root}>
      <ScrollView>
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
        {Array.from({ length: program.weeks }, (_, i) => i + 1).map(wk => (
          <View key={`wk-${wk}`}>
            <Text style={styles.weekHeader}>
              W{wk} {weekNames[wk] ?? ''} {wk === program.currentWeek ? '★' : ''}
              {'  '}
              <Text style={styles.weekSub}>
                {counts[wk] ? `${counts[wk]} overrides` : 'inherits base'}
              </Text>
            </Text>
            {days.map(d => (
              <TouchableOpacity
                key={`wk-${wk}-${d.id}`}
                style={styles.row}
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
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  sectionLabel: {
    fontSize: 11,
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginTop: 16,
    marginBottom: 6,
    paddingHorizontal: 16,
    color: colors.secondary,
  },
  weekHeader: {
    fontWeight: '600',
    marginTop: 14,
    marginBottom: 4,
    paddingHorizontal: 16,
    color: colors.primary,
  },
  weekSub: { fontWeight: '400', fontSize: 12, color: colors.secondary },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginHorizontal: 12,
    marginVertical: 4,
    borderRadius: 10,
    backgroundColor: colors.surfaceElevated,
  },
  rowTitle: { fontSize: 14, flex: 1, color: colors.primary },
  rowChev: { fontSize: 18, color: colors.secondary },
});
