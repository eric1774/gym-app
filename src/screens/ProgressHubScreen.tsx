import React, { useState, useCallback } from 'react';
import { ScrollView, View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  getAllExercisesWithProgress,
  getTopMovers,
  getProgramDayWeeklyTonnage,
  getPRWatch,
  getStaleExercise,
} from '../db/progress';
import { getProgramsWithSessionData } from '../db/programs';
import {
  ExerciseListItem,
  ProgramDayWeeklyTonnage,
  PRWatchCandidate,
  StaleExerciseCandidate,
  ProgramSelectorItem,
} from '../types';
import { DashboardStackParamList } from '../navigation/TabNavigator';
import { InsightStrip } from '../components/progress/InsightStrip';
import {
  ProgressSegmentedControl,
  ProgressTab,
} from '../components/progress/ProgressSegmentedControl';
import { CategoryChipRow, ChipFilter } from '../components/progress/CategoryChipRow';
import { ExerciseListRow } from '../components/progress/ExerciseListRow';
import { ProgramDayCard } from '../components/progress/ProgramDayCard';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { fontSize, weightBold } from '../theme/typography';

type Nav = NativeStackNavigationProp<DashboardStackParamList, 'ProgressHub'>;

export function ProgressHubScreen() {
  const navigation = useNavigation<Nav>();
  const [activeTab, setActiveTab] = useState<ProgressTab>('exercises');
  const [chipFilter, setChipFilter] = useState<ChipFilter>('all');
  const [search, setSearch] = useState('');

  const [exercises, setExercises] = useState<ExerciseListItem[]>([]);
  const [topMovers, setTopMovers] = useState<ExerciseListItem[]>([]);
  const [days, setDays] = useState<ProgramDayWeeklyTonnage[]>([]);
  const [programs, setPrograms] = useState<ProgramSelectorItem[]>([]);
  const [selectedProgramId, setSelectedProgramId] = useState<number | null>(null);
  const [prCandidate, setPRCandidate] = useState<PRWatchCandidate | null>(null);
  const [staleCandidate, setStaleCandidate] = useState<StaleExerciseCandidate | null>(null);

  // Insight strip — runs once on mount
  useFocusEffect(useCallback(() => {
    let cancelled = false;
    (async () => {
      try {
        const [pr, stale, progs] = await Promise.all([
          getPRWatch(),
          getStaleExercise(),
          getProgramsWithSessionData(),
        ]);
        if (cancelled) { return; }
        setPRCandidate(pr);
        setStaleCandidate(stale);
        setPrograms(progs);
        if (progs.length > 0 && selectedProgramId === null) {
          setSelectedProgramId(progs[0].id);
        }
      } catch (err) { console.warn('ProgressHub insight fetch failed:', err); }
    })();
    return () => { cancelled = true; };
  }, []));

  // Exercises feed — refetches when filter / search changes
  useFocusEffect(useCallback(() => {
    if (activeTab !== 'exercises') { return; }
    let cancelled = false;
    (async () => {
      try {
        const filter = chipFilter === 'all' ? 'all' : chipFilter;
        const [list, movers] = await Promise.all([
          getAllExercisesWithProgress(filter, search, 'recent'),
          search === '' ? getTopMovers() : Promise.resolve([]),
        ]);
        if (cancelled) { return; }
        setExercises(list);
        setTopMovers(movers);
      } catch (err) { console.warn('ProgressHub exercises fetch failed:', err); }
    })();
    return () => { cancelled = true; };
  }, [activeTab, chipFilter, search]));

  // Program days feed
  useFocusEffect(useCallback(() => {
    if (activeTab !== 'programDays' || selectedProgramId === null) { return; }
    let cancelled = false;
    (async () => {
      try {
        const data = await getProgramDayWeeklyTonnage(selectedProgramId);
        if (!cancelled) { setDays(data); }
      } catch (err) { console.warn('ProgressHub days fetch failed:', err); }
    })();
    return () => { cancelled = true; };
  }, [activeTab, selectedProgramId]));

  const goToExercise = (exerciseId: number) => {
    const ex = exercises.find(e => e.exerciseId === exerciseId)
      ?? topMovers.find(e => e.exerciseId === exerciseId)
      ?? null;
    if (ex) {
      navigation.navigate('ExerciseDetail', {
        exerciseId: ex.exerciseId,
        exerciseName: ex.exerciseName,
        measurementType: ex.measurementType,
        category: ex.category,
      });
    } else {
      // fallback for tile-driven nav (PR Watch / Stale) — minimal params
      navigation.navigate('ExerciseDetail', { exerciseId, exerciseName: '' });
    }
  };

  const goToProgramDay = (programDayId: number) => {
    const day = days.find(d => d.programDayId === programDayId);
    if (day) {
      navigation.navigate('SessionDayProgress', { programDayId, dayName: day.dayName });
    }
  };

  const isSearch = search.length > 0;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()} activeOpacity={0.7}>
          <Text style={styles.backArrow}>{'←'}</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Progress</Text>
        <Text style={styles.headerMeta}>
          {activeTab === 'exercises' ? `${exercises.length} lifts` : `${days.length} days`}
        </Text>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        <InsightStrip
          prCandidate={prCandidate}
          staleCandidate={staleCandidate}
          onTilePress={goToExercise}
        />

        <ProgressSegmentedControl active={activeTab} onChange={setActiveTab} />

        {activeTab === 'exercises' ? (
          <>
            <TextInput
              style={styles.search}
              placeholder="Search exercises…"
              placeholderTextColor={colors.secondary}
              value={search}
              onChangeText={setSearch}
            />
            <CategoryChipRow active={chipFilter} onChange={setChipFilter} />

            {!isSearch && topMovers.length > 0 && (
              <>
                <Text style={styles.sectionH}>Top Movers · 14d</Text>
                {topMovers.map(item => (
                  <ExerciseListRow key={`mv-${item.exerciseId}`} item={item} onPress={goToExercise} />
                ))}
              </>
            )}

            <Text style={styles.sectionH}>{isSearch ? 'Results' : 'All Exercises'}</Text>
            {exercises.length === 0 ? (
              <Text style={styles.empty}>
                {isSearch ? `No exercises match '${search}'.`
                  : chipFilter === 'all' ? 'Log your first workout to see exercises here.'
                  : `No ${chipFilter} exercises tracked yet.`}
              </Text>
            ) : (
              exercises.map(item => (
                <ExerciseListRow key={item.exerciseId} item={item} onPress={goToExercise} />
              ))
            )}
          </>
        ) : (
          <>
            {programs.length === 0 ? (
              <Text style={styles.empty}>Create a program to track day trends.</Text>
            ) : (
              <>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.progChipRow}>
                  {programs.map(p => (
                    <TouchableOpacity
                      key={p.id}
                      testID={`prog-chip-${p.id}`}
                      style={[styles.progChip, selectedProgramId === p.id && styles.progChipActive]}
                      activeOpacity={0.7}
                      onPress={() => setSelectedProgramId(p.id)}>
                      <Text style={[styles.progChipText, selectedProgramId === p.id && styles.progChipTextActive]}>
                        {p.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
                <Text style={styles.sectionH}>Last 4 weeks · weekly tonnage</Text>
                {days.length === 0 ? (
                  <Text style={styles.empty}>Complete a program workout to see day trends.</Text>
                ) : (
                  days.map(d => <ProgramDayCard key={d.programDayId} day={d} onPress={goToProgramDay} />)
                )}
              </>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: spacing.base, paddingTop: spacing.lg, paddingBottom: spacing.md,
  },
  backButton: { marginRight: spacing.md, padding: spacing.xs, minWidth: 44, minHeight: 44, justifyContent: 'center' },
  backArrow: { color: colors.primary, fontSize: fontSize.xl },
  headerTitle: { color: colors.primary, fontSize: fontSize.lg, fontWeight: weightBold, flex: 1 },
  headerMeta: { color: colors.secondary, fontSize: fontSize.xs },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: spacing.base, paddingBottom: spacing.xxxl },
  search: {
    backgroundColor: colors.surface,
    borderColor: colors.border, borderWidth: 1, borderRadius: 10,
    paddingHorizontal: 11, paddingVertical: 8,
    color: colors.primary, fontSize: fontSize.sm,
    marginBottom: 8,
  },
  sectionH: {
    color: colors.secondary, fontSize: 9, fontWeight: weightBold,
    letterSpacing: 1.2, textTransform: 'uppercase',
    marginTop: 10, marginBottom: 6,
  },
  empty: { color: colors.secondary, fontSize: fontSize.sm, textAlign: 'center', paddingVertical: spacing.xl },
  progChipRow: { gap: 5, marginBottom: 8 },
  progChip: {
    backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1,
    borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4,
  },
  progChipActive: { backgroundColor: colors.accent, borderWidth: 0 },
  progChipText: { color: colors.secondary, fontSize: fontSize.xs },
  progChipTextActive: { color: colors.onAccent, fontWeight: weightBold },
});
