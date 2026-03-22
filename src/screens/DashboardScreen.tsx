import React, { useCallback, useEffect, useState } from 'react';
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
import { getCategorySummaries, getNextWorkoutDay } from '../db/dashboard';
import { getProgramDayExercises } from '../db/programs';
import { getExercises } from '../db/exercises';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { fontSize, weightBold } from '../theme/typography';
import { DashboardStackParamList, TabParamList } from '../navigation/TabNavigator';
import { CategorySummary, NextWorkoutInfo, Exercise } from '../types';
import { useSession } from '../context/SessionContext';
import { formatRelativeTime } from '../utils/formatRelativeTime';
import { CategorySummaryCard } from '../components/CategorySummaryCard';

type Nav = NativeStackNavigationProp<DashboardStackParamList, 'DashboardHome'>;

function formatElapsed(s: number): string {
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}

export function DashboardScreen() {
  const navigation = useNavigation<Nav>();
  const { session, startSessionFromProgramDay } = useSession();
  const [categories, setCategories] = useState<CategorySummary[]>([]);
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
            getCategorySummaries(),
            getNextWorkoutDay(),
          ]);
          if (!cancelled) {
            setCategories(result);
            setNextWorkout(nextDay);
          }
        } catch (err) {
          console.warn('Dashboard data fetch failed:', err);
        }
      })();
      return () => { cancelled = true; };
    }, []),
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

      {categories.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>
            No exercises trained yet. Start a workout to see your progress here.
          </Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.list}>
          {categories.map(summary => {
            const isStale = Date.now() - new Date(summary.lastTrainedAt).getTime() > 30 * 24 * 60 * 60 * 1000;
            return (
              <View key={summary.category} style={{ marginBottom: spacing.sm }}>
                <CategorySummaryCard
                  summary={summary}
                  isStale={isStale}
                  onPress={() => navigation.navigate('CategoryProgress', { category: summary.category })}
                />
              </View>
            );
          })}
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
});
