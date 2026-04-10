import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated,
  LayoutChangeEvent,
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
import { getCategorySummaries, getCategoryVolumeSummaries, getNextWorkoutDay } from '../db/dashboard';
import { getProgramDayExercises } from '../db/programs';
import { getExercises } from '../db/exercises';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { fontSize, weightBold, weightMedium, weightSemiBold } from '../theme/typography';
import { DashboardStackParamList, TabParamList } from '../navigation/TabNavigator';
import { CategorySummary, NextWorkoutInfo, Exercise } from '../types';
import { useSession } from '../context/SessionContext';
import { formatRelativeTime } from '../utils/formatRelativeTime';
import { CategorySummaryCard } from '../components/CategorySummaryCard';

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
  const [categories, setCategories] = useState<CategorySummary[]>([]);
  const [nextWorkout, setNextWorkout] = useState<NextWorkoutInfo | null>(null);
  const [activeElapsed, setActiveElapsed] = useState(0);
  const [viewMode, setViewMode] = useState<'strength' | 'volume'>('strength');
  const slideAnim = useRef(new Animated.Value(0)).current;
  const cardOpacity = useRef(new Animated.Value(1)).current;
  const [toggleWidth, setToggleWidth] = useState(0);

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
      // Fade out current cards before fetching new data
      Animated.timing(cardOpacity, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }).start(() => {
        (async () => {
          try {
            const [result, nextDay] = await Promise.all([
              viewMode === 'volume' ? getCategoryVolumeSummaries() : getCategorySummaries(),
              getNextWorkoutDay(),
            ]);
            if (!cancelled) {
              setCategories(result);
              setNextWorkout(nextDay);
              // Fade in new cards
              Animated.timing(cardOpacity, {
                toValue: 1,
                duration: 200,
                useNativeDriver: true,
              }).start();
            }
          } catch (err) {
            console.warn('Dashboard data fetch failed:', err);
            if (!cancelled) {
              cardOpacity.setValue(1);
            }
          }
        })();
      });
      return () => { cancelled = true; };
    }, [viewMode]),
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

      {/* Strength / Volume toggle */}
      <View style={styles.toggleRowOuter}>
        <View
          style={styles.togglePill}
          onLayout={(e: LayoutChangeEvent) => setToggleWidth(e.nativeEvent.layout.width)}
        >
          {toggleWidth > 0 && (
            <Animated.View
              style={[
                styles.toggleIndicator,
                {
                  width: (toggleWidth - 6) / 2,
                  transform: [{ translateX: slideAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, (toggleWidth - 6) / 2],
                  }) }],
                },
              ]}
            />
          )}
          {(['strength', 'volume'] as const).map(mode => (
            <TouchableOpacity
              key={mode}
              style={styles.toggleButton}
              activeOpacity={0.7}
              onPress={() => {
                if (mode === viewMode) return;
                Animated.spring(slideAnim, {
                  toValue: mode === 'volume' ? 1 : 0,
                  tension: 300,
                  friction: 20,
                  useNativeDriver: true,
                }).start();
                setViewMode(mode);
              }}>
              <Text style={[styles.toggleText, viewMode === mode && styles.toggleTextActive]}>
                {mode === 'strength' ? 'Strength' : 'Volume'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

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

      <Animated.View style={{ flex: 1, opacity: cardOpacity }}>
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
                    viewMode={viewMode}
                    onPress={() => navigation.navigate('CategoryProgress', { category: summary.category, viewMode })}
                  />
                </View>
              );
            })}
          </ScrollView>
        )}
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
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

  /* ── Strength / Volume Toggle ───────────────────────────────────── */
  toggleRowOuter: {
    paddingHorizontal: spacing.base,
    marginBottom: spacing.md,
  },
  togglePill: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: 10,
    padding: 3,
    position: 'relative',
  },
  toggleIndicator: {
    position: 'absolute',
    top: 3,
    left: 3,
    bottom: 3,
    backgroundColor: colors.accent,
    borderRadius: 8,
  },
  toggleButton: {
    flex: 1,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  toggleText: {
    color: colors.secondary,
    fontSize: fontSize.sm,
    fontWeight: weightMedium,
  },
  toggleTextActive: {
    color: colors.background,
    fontWeight: weightSemiBold,
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
