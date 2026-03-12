import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation, NavigationProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { getRecentlyTrainedExercises, getNextWorkoutDay } from '../db/dashboard';
import { getProgramDayExercises } from '../db/programs';
import { getExercises } from '../db/exercises';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { fontSize, weightBold, weightSemiBold, weightMedium } from '../theme/typography';
import { DashboardStackParamList, TabParamList } from '../navigation/TabNavigator';
import { ExerciseCategory, NextWorkoutInfo, Exercise } from '../types';
import { useSession } from '../context/SessionContext';

type Nav = NativeStackNavigationProp<DashboardStackParamList, 'DashboardHome'>;

interface RecentExercise {
  exerciseId: number;
  exerciseName: string;
  category: string;
  lastTrainedAt: string;
  measurementType: string;
}

interface SubCategory {
  name: string;
  exercises: RecentExercise[];
}

interface GroupData {
  title: string;
  subCategories: SubCategory[];
}

const CATEGORY_GROUP_ORDER: { title: string; categories: ExerciseCategory[] }[] = [
  { title: 'STRENGTH TRAINING', categories: ['chest', 'back', 'legs', 'shoulders', 'arms'] },
  { title: 'CORE & STABILITY', categories: ['core'] },
  { title: 'CARDIO & CONDITIONING', categories: ['conditioning'] },
];

function groupByCategory(exercises: RecentExercise[]): GroupData[] {
  const groups: GroupData[] = [];
  for (const group of CATEGORY_GROUP_ORDER) {
    const subCategories: SubCategory[] = [];
    for (const cat of group.categories) {
      const data = exercises.filter(ex => ex.category === cat);
      if (data.length > 0) {
        subCategories.push({
          name: cat.charAt(0).toUpperCase() + cat.slice(1),
          exercises: data,
        });
      }
    }
    if (subCategories.length > 0) {
      groups.push({ title: group.title, subCategories });
    }
  }
  return groups;
}

function formatRelativeTime(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) { return 'just now'; }
  if (diffMin < 60) { return diffMin + 'm ago'; }
  const diffHrs = Math.floor(diffMin / 60);
  if (diffHrs < 24) { return diffHrs + 'h ago'; }
  const diffDays = Math.floor(diffHrs / 24);
  if (diffDays < 7) { return diffDays + 'd ago'; }
  const diffWeeks = Math.floor(diffDays / 7);
  if (diffWeeks < 5) { return diffWeeks + 'w ago'; }
  const diffMonths = Math.floor(diffDays / 30);
  return diffMonths + 'mo ago';
}

function formatElapsed(s: number): string {
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}

export function DashboardScreen() {
  const navigation = useNavigation<Nav>();
  const { session, startSessionFromProgramDay } = useSession();
  const [exercises, setExercises] = useState<RecentExercise[]>([]);
  const [nextWorkout, setNextWorkout] = useState<NextWorkoutInfo | null>(null);
  const [activeElapsed, setActiveElapsed] = useState(0);

  // Elapsed timer for active session state
  useEffect(() => {
    if (!session) { setActiveElapsed(0); return; }
    const tick = () => {
      setActiveElapsed(Math.floor((Date.now() - new Date(session.startedAt).getTime()) / 1000));
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [session]);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      (async () => {
        try {
          const [result, nextDay] = await Promise.all([
            getRecentlyTrainedExercises(),
            getNextWorkoutDay(),
          ]);
          if (!cancelled) {
            setExercises(result);
            setNextWorkout(nextDay);
          }
        } catch {
          // ignore
        }
      })();
      return () => { cancelled = true; };
    }, []),
  );

  const groups = useMemo(() => groupByCategory(exercises), [exercises]);

  const handlePress = useCallback(
    (item: RecentExercise) => {
      navigation.navigate('ExerciseProgress', {
        exerciseId: item.exerciseId,
        exerciseName: item.exerciseName,
        measurementType: item.measurementType as 'reps' | 'timed',
      });
    },
    [navigation],
  );

  const handleQuickStart = useCallback(async () => {
    try {
      const parent = navigation.getParent<NavigationProp<TabParamList>>();
      if (session) {
        // Active session — navigate to WorkoutTab without creating a new session
        if (parent) { parent.navigate('WorkoutTab'); }
        return;
      }
      if (!nextWorkout) { return; }
      const [pdes, allExercises] = await Promise.all([
        getProgramDayExercises(nextWorkout.dayId),
        getExercises(),
      ]);
      const exerciseMap = new Map<number, Exercise>();
      for (const ex of allExercises) {
        exerciseMap.set(ex.id, ex);
      }
      const exerciseObjects = pdes
        .map(pde => exerciseMap.get(pde.exerciseId))
        .filter((ex): ex is Exercise => ex !== undefined);
      if (exerciseObjects.length === 0) { return; }
      await startSessionFromProgramDay(nextWorkout.dayId, exerciseObjects);
      if (parent) { parent.navigate('WorkoutTab'); }
    } catch {
      // ignore
    }
  }, [session, nextWorkout, startSessionFromProgramDay, navigation]);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Text style={styles.title}>Dashboard</Text>

      {/* Next Workout Card — only shown when an activated program exists */}
      {nextWorkout !== null && (
        <View style={styles.nextWorkoutCard}>
          {session ? (
            /* Active state */
            <>
              <View style={styles.nextWorkoutActiveHeader}>
                <Text style={styles.nextWorkoutActiveLabel}>ACTIVE WORKOUT</Text>
                <Text style={styles.nextWorkoutElapsed}>{formatElapsed(activeElapsed)}</Text>
              </View>
              <TouchableOpacity
                style={styles.nextWorkoutButton}
                activeOpacity={0.7}
                onPress={handleQuickStart}>
                <Text style={styles.nextWorkoutButtonText}>Continue</Text>
              </TouchableOpacity>
            </>
          ) : (
            /* Idle state */
            <>
              <Text style={styles.nextWorkoutLabel}>NEXT WORKOUT</Text>
              <Text style={styles.nextWorkoutDayName}>{nextWorkout.dayName}</Text>
              <Text style={styles.nextWorkoutMeta}>
                {nextWorkout.exerciseCount} {nextWorkout.exerciseCount === 1 ? 'exercise' : 'exercises'} · {nextWorkout.programName}
              </Text>
              <TouchableOpacity
                style={styles.nextWorkoutButton}
                activeOpacity={0.7}
                onPress={handleQuickStart}>
                <Text style={styles.nextWorkoutButtonText}>Start</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      )}

      {exercises.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>
            No exercises trained yet. Start a workout to see your progress here.
          </Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.list}>
          {groups.map(group => (
            <View key={group.title} style={styles.groupWrapper}>
              {/* Group header strip */}
              <View style={styles.groupHeaderStrip}>
                <Text style={styles.groupHeader}>{group.title}</Text>
              </View>

              {/* Surface container with all sub-categories */}
              <View style={styles.surfaceContainer}>
                {group.subCategories.map((sub, subIdx) => (
                  <View key={sub.name}>
                    {/* Sub-category label */}
                    <Text style={[
                      styles.subCategoryHeader,
                      subIdx > 0 && styles.subCategorySpacing,
                    ]}>
                      {sub.name}
                    </Text>

                    {/* Exercise cards */}
                    {sub.exercises.map(item => (
                      <TouchableOpacity
                        key={item.exerciseId}
                        style={styles.card}
                        activeOpacity={0.7}
                        onPress={() => handlePress(item)}>
                        <View style={styles.cardRow}>
                          <Text style={styles.exerciseName}>{item.exerciseName}</Text>
                          <Text style={styles.timeAgo}>
                            {formatRelativeTime(item.lastTrainedAt)}
                          </Text>
                        </View>
                        <Text style={styles.category}>{item.category}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                ))}
              </View>
            </View>
          ))}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  title: {
    color: colors.primary,
    fontSize: fontSize.xl,
    fontWeight: weightBold,
    paddingHorizontal: spacing.base,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
  },
  list: {
    paddingHorizontal: spacing.base,
    paddingBottom: spacing.xxl,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xxl,
  },
  emptyText: {
    color: colors.secondary,
    fontSize: fontSize.base,
    textAlign: 'center',
    lineHeight: 22,
  },

  /* ── Next Workout Card ───────────────────────────────────────────── */
  nextWorkoutCard: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.base,
    marginHorizontal: spacing.base,
    marginBottom: spacing.md,
  },
  nextWorkoutLabel: {
    color: colors.secondary,
    fontSize: fontSize.sm,
    fontWeight: weightBold,
    letterSpacing: 1.2,
    marginBottom: spacing.xs,
  },
  nextWorkoutActiveLabel: {
    color: colors.accent,
    fontSize: fontSize.sm,
    fontWeight: weightBold,
    letterSpacing: 1.2,
  },
  nextWorkoutActiveHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  nextWorkoutElapsed: {
    color: colors.primary,
    fontSize: fontSize.lg,
    fontWeight: weightBold,
    letterSpacing: 2,
  },
  nextWorkoutDayName: {
    color: colors.primary,
    fontSize: fontSize.lg,
    fontWeight: weightBold,
    marginBottom: spacing.xs,
  },
  nextWorkoutMeta: {
    color: colors.secondary,
    fontSize: fontSize.sm,
    marginBottom: spacing.md,
  },
  nextWorkoutButton: {
    backgroundColor: colors.accent,
    borderRadius: 12,
    paddingVertical: spacing.md,
    alignItems: 'center',
    minHeight: 44,
    justifyContent: 'center',
  },
  nextWorkoutButtonText: {
    color: colors.onAccent,
    fontSize: fontSize.base,
    fontWeight: weightBold,
  },

  /* ── Group ──────────────────────────────────────────────── */
  groupWrapper: {
    marginBottom: spacing.lg,
  },
  groupHeaderStrip: {
    backgroundColor: colors.surface,
    borderRadius: 10,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm,
    marginBottom: spacing.sm,
  },
  groupHeader: {
    color: colors.secondary,
    fontSize: fontSize.sm,
    fontWeight: weightBold,
    letterSpacing: 1.2,
  },

  /* ── Surface container ──────────────────────────────────── */
  surfaceContainer: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.base,
  },

  /* ── Sub-category ───────────────────────────────────────── */
  subCategoryHeader: {
    color: colors.secondary,
    fontSize: fontSize.sm,
    fontWeight: weightMedium,
    marginBottom: spacing.sm,
    marginLeft: spacing.xs,
  },
  subCategorySpacing: {
    marginTop: spacing.base,
  },

  /* ── Exercise card ──────────────────────────────────────── */
  card: {
    backgroundColor: colors.surfaceElevated,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 14,
    padding: spacing.base,
    marginBottom: spacing.sm,
  },
  cardRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  exerciseName: {
    color: colors.primary,
    fontSize: fontSize.base,
    fontWeight: weightSemiBold,
    flex: 1,
  },
  timeAgo: {
    color: colors.secondary,
    fontSize: fontSize.sm,
    marginLeft: spacing.sm,
  },
  category: {
    color: colors.secondary,
    fontSize: fontSize.sm,
    textTransform: 'capitalize',
  },
});
