import React, { useCallback, useEffect, useState } from 'react';
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
import { getWeightTrend, WeightTrendResult } from '../db/weightTrend';
import { getVolumeTrend, VolumeTrendResult } from '../db/volumeTrend';
import { getStatsStripData, StatsStripData } from '../db/progress';
import { getHeroWorkoutContext, HeroWorkoutContext } from '../db/heroWorkoutContext';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { fontSize, weightBold } from '../theme/typography';
import { DashboardStackParamList, TabParamList } from '../navigation/TabNavigator';
import { NextWorkoutInfo, Exercise } from '../types';
import { useSession } from '../context/SessionContext';
import { useGamification } from '../context/GamificationContext';
import { greeting } from '../utils/greeting';
import { getUserFirstName, setUserFirstName } from '../services/UserProfileService';
import { NameSetupModal } from '../components/NameSetupModal';
import { StreakChip } from '../components/StreakChip';
import { HeroWorkoutCard } from '../components/HeroWorkoutCard';
import { WeightTrendCard } from '../components/WeightTrendCard';
import { VolumeTrendCard } from '../components/VolumeTrendCard';
import { NutritionRingsCard } from '../components/NutritionRingsCard';
import { StatsStrip } from '../components/StatsStrip';
import { LogBodyMetricModal } from '../components/LogBodyMetricModal';
import { getBodyMetricByDate, upsertBodyMetric } from '../db/bodyMetrics';
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

export function DashboardScreen() {
  const navigation = useNavigation<Nav>();
  const { session, startSessionFromProgramDay } = useSession();
  const { pendingCelebrations, dismissCelebration, backfilledBadges, clearBackfill } = useGamification();

  // Name / modal
  const [firstName, setFirstName] = useState<string | null>(null);
  const [showNameModal, setShowNameModal] = useState(false);
  const [nameModalSkipped, setNameModalSkipped] = useState(false);

  // Workout
  const [nextWorkout, setNextWorkout] = useState<NextWorkoutInfo | null>(null);
  const [heroExercises, setHeroExercises] = useState<Exercise[]>([]);
  const [heroContext, setHeroContext] = useState<HeroWorkoutContext>({ headlineLift: null, addedSinceLast: null });

  // Active session timer
  const [activeElapsed, setActiveElapsed] = useState(0);

  // Trend data
  const [weightTrend, setWeightTrend] = useState<WeightTrendResult>({
    today: null,
    currentSevenDayMA: null,
    previousSevenDayMA: null,
    dailySeries: [],
  });
  const [volumeTrend, setVolumeTrend] = useState<VolumeTrendResult>({
    deltaPercent: null,
    weeklyBars: [],
  });
  const [statsStrip, setStatsStrip] = useState<StatsStripData>({
    sessions: { current: 0, lastWeek: 0 },
    prs: { current: 0, lastWeek: 0 },
    tonnage: { currentLb: 0, lastWeekLb: 0 },
  });

  // Weight log modal (kept for LogBodyMetricModal)
  const today = (() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  })();
  const [logModalVisible, setLogModalVisible] = useState(false);
  const [logModalInitialValue, setLogModalInitialValue] = useState<number | null>(null);

  // Elapsed timer for active session
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
          const [nextDay, wt, vt, ss, savedName] = await Promise.all([
            getNextWorkoutDay(),
            getWeightTrend(),
            getVolumeTrend(),
            getStatsStripData(),
            getUserFirstName(),
          ]);

          if (cancelled) { return; }

          setNextWorkout(nextDay);
          setWeightTrend(wt);
          setVolumeTrend(vt);
          setStatsStrip(ss);
          setFirstName(savedName);

          if (savedName === null && !nameModalSkipped) {
            setShowNameModal(true);
          }

          // Follow-up: hero workout context depends on nextDay
          if (nextDay !== null) {
            try {
              const [pdes, allExercises, ctx] = await Promise.all([
                getProgramDayExercises(nextDay.dayId),
                getExercises(),
                getHeroWorkoutContext(nextDay.dayId),
              ]);
              if (!cancelled) {
                const exerciseMap = new Map<number, Exercise>();
                for (const ex of allExercises) { exerciseMap.set(ex.id, ex); }
                const exerciseObjects = pdes
                  .map(pde => exerciseMap.get(pde.exerciseId))
                  .filter((ex): ex is Exercise => ex !== undefined);
                setHeroExercises(exerciseObjects);
                setHeroContext(ctx);
              }
            } catch {
              // ignore hero context errors
            }
          }
        } catch (err) {
          console.warn('Dashboard data fetch failed:', err);
        }
      })();
      return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [nameModalSkipped]),
  );

  const handleNameSave = useCallback(async (name: string) => {
    await setUserFirstName(name);
    setFirstName(name);
    setShowNameModal(false);
  }, []);

  const handleNameSkip = useCallback(() => {
    setNameModalSkipped(true);
    setShowNameModal(false);
  }, []);

  const handleQuickStart = useCallback(async () => {
    try {
      const parent = navigation.getParent<NavigationProp<TabParamList>>();
      if (session) {
        if (parent) { parent.navigate('WorkoutTab'); }
        return;
      }
      if (!nextWorkout) { return; }
      const [pdes, allExercises] = await Promise.all([
        getProgramDayExercises(nextWorkout.dayId),
        getExercises(),
      ]);
      const exerciseMap = new Map<number, Exercise>();
      for (const ex of allExercises) { exerciseMap.set(ex.id, ex); }
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

  const handleTrendPress = useCallback(() => {
    navigation.navigate('ProgressHub');
  }, [navigation]);

  const handleStatsPress = useCallback(() => {
    navigation.navigate('ProgressHub');
  }, [navigation]);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.headerRow}>
          <Text style={styles.greeting}>
            {greeting(new Date(), firstName ?? undefined)}
          </Text>
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

        <StreakChip currentStreak={0} recentDays={[]} />

        {nextWorkout !== null && (
          <HeroWorkoutCard
            dayName={nextWorkout.dayName}
            exerciseCount={nextWorkout.exerciseCount}
            estimatedMinutes={null}
            programLabel={nextWorkout.programName}
            weekNumber={null}
            dayNumber={null}
            exerciseChips={heroExercises.map(e => e.name)}
            context={heroContext.headlineLift ? {
              exerciseName: heroContext.headlineLift.exerciseName,
              weightLb: heroContext.headlineLift.weightLb,
              reps: heroContext.headlineLift.reps,
              addedSinceLastLb: heroContext.addedSinceLast,
            } : null}
            activeElapsedSeconds={session ? activeElapsed : null}
            onPress={handleQuickStart}
          />
        )}

        <View style={styles.trendRow}>
          <WeightTrendCard
            today={weightTrend.today}
            currentSevenDayMA={weightTrend.currentSevenDayMA}
            previousSevenDayMA={weightTrend.previousSevenDayMA}
            dailySeries={weightTrend.dailySeries}
            onPress={handleTrendPress}
          />
          <VolumeTrendCard
            deltaPercent={volumeTrend.deltaPercent}
            weeklyBars={volumeTrend.weeklyBars}
            onPress={handleTrendPress}
          />
        </View>

        <NutritionRingsCard />

        <StatsStrip data={statsStrip} onPress={handleStatsPress} />
      </ScrollView>

      <NameSetupModal
        visible={showNameModal}
        onSave={handleNameSave}
        onSkip={handleNameSkip}
      />

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
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 12,
  },
  greeting: {
    color: colors.secondary,
    fontSize: fontSize.base,
  },
  trendRow: {
    flexDirection: 'row',
    gap: 10,
    marginHorizontal: 16,
    marginBottom: 10,
  },
});
