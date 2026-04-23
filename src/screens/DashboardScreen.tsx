import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import { useFocusEffect, useNavigation, NavigationProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { getNextWorkoutDay } from '../db/dashboard';
import { getProgramDayExercises } from '../db/programs';
import { getExercises } from '../db/exercises';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { fontSize, weightBold } from '../theme/typography';
import { DashboardStackParamList, TabParamList } from '../navigation/TabNavigator';
import { NextWorkoutInfo, Exercise } from '../types';
import type { WeeklySnapshot } from '../types';
import { useSession } from '../context/SessionContext';
import { formatRelativeTime } from '../utils/formatRelativeTime';
import { WeeklySnapshotCard } from '../components/WeeklySnapshotCard';
import { NutritionRingsCard } from '../components/NutritionRingsCard';
import { getWeeklySnapshot } from '../db/progress';
import { DashboardWeightCard } from '../components/DashboardWeightCard';
import { LogBodyMetricModal } from '../components/LogBodyMetricModal';
import { getBodyMetricByDate, upsertBodyMetric } from '../db/bodyMetrics';
import { useGamification } from '../context/GamificationContext';
import { LevelBar } from '../components/LevelBar';
import { CelebrationModal } from '../components/CelebrationModal';
import { HighlightReelModal } from '../components/HighlightReelModal';

type Nav = NativeStackNavigationProp<DashboardStackParamList, 'DashboardHome'>;

const ICON_SIZE = 22;

function GearIcon({ color }: { color: string }) {
  return (
    <Svg width={ICON_SIZE} height={ICON_SIZE} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function formatElapsed(s: number): string {
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}

export function DashboardScreen() {
  const navigation = useNavigation<Nav>();
  const { session, startSessionFromProgramDay } = useSession();
  const [nextWorkout, setNextWorkout] = useState<NextWorkoutInfo | null>(null);
  const [activeElapsed, setActiveElapsed] = useState(0);
  const [snapshot, setSnapshot] = useState<WeeklySnapshot>({ sessionsThisWeek: 0, prsThisWeek: 0, volumeChangePercent: null });
  const { levelState, pendingCelebrations, dismissCelebration, backfilledBadges, clearBackfill } = useGamification();

  const [todayWeight, setTodayWeight] = useState<number | null>(null);
  const [yesterdayWeight, setYesterdayWeight] = useState<number | null>(null);
  const [logModalVisible, setLogModalVisible] = useState(false);
  const [logModalInitialValue, setLogModalInitialValue] = useState<number | null>(null);

  const today = useMemo(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }, []);

  const yesterday = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }, []);

  const refreshWeights = useCallback(async () => {
    const [t, y] = await Promise.all([
      getBodyMetricByDate('weight', today),
      getBodyMetricByDate('weight', yesterday),
    ]);
    setTodayWeight(t?.value ?? null);
    setYesterdayWeight(y?.value ?? null);
  }, [today, yesterday]);

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
          const [nextDay, snap] = await Promise.all([
            getNextWorkoutDay(),
            getWeeklySnapshot(),
          ]);
          if (!cancelled) {
            setNextWorkout(nextDay);
            setSnapshot(snap);
          }
          await refreshWeights();
        } catch (err) {
          console.warn('Dashboard data fetch failed:', err);
        }
      })();
      return () => { cancelled = true; };
    }, [refreshWeights]),
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
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.headerRow}>
          <Text style={styles.title}>Dashboard</Text>
          <TouchableOpacity
            onPress={() => navigation.navigate('Settings')}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            testID="settings-button"
            accessibilityLabel="Settings"
            accessibilityRole="button"
          >
            <GearIcon color={colors.secondary} />
          </TouchableOpacity>
        </View>

        <LevelBar
          level={levelState.level}
          title={levelState.title}
          progressToNext={levelState.progressToNext}
        />

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

        <DashboardWeightCard
          todayWeight={todayWeight}
          yesterdayWeight={yesterdayWeight}
          onPressLog={() => {
            setLogModalInitialValue(null);
            setLogModalVisible(true);
          }}
          onPressEdit={() => {
            setLogModalInitialValue(todayWeight);
            setLogModalVisible(true);
          }}
          onPressCard={() => {
            const parent = navigation.getParent<NavigationProp<TabParamList>>();
            if (parent) {
              (parent as any).navigate('ProteinTab', {
                screen: 'ProteinHome',
                params: { initialTab: 2 },
              });
            }
          }}
        />

        <WeeklySnapshotCard
          snapshot={snapshot}
          onPress={() => navigation.navigate('ProgressHub')}
        />
        <NutritionRingsCard />
      </ScrollView>

      <LogBodyMetricModal
        visible={logModalVisible}
        mode="weight"
        initialDate={today}
        initialValue={logModalInitialValue}
        onClose={() => setLogModalVisible(false)}
        onSave={async (payload) => {
          await upsertBodyMetric({
            metricType: payload.metricType,
            value: payload.value,
            unit: payload.unit,
            recordedDate: payload.recordedDate,
            note: payload.note,
          });
          await refreshWeights();
        }}
      />
      <HighlightReelModal
        badges={backfilledBadges}
        onDismiss={clearBackfill}
      />
      <CelebrationModal
        celebration={backfilledBadges.length === 0 && pendingCelebrations.length > 0 ? pendingCelebrations[0] : null}
        onDismiss={dismissCelebration}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    paddingBottom: spacing.xxxl,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.base,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
  },
  title: {
    color: colors.primary,
    fontSize: fontSize.xl,
    fontWeight: weightBold,
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
