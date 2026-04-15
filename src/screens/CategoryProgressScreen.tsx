import React, { useState, useCallback } from 'react';
import {
  LayoutChangeEvent,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { getCategoryExerciseProgress, getCategoryExerciseVolumeProgress } from '../db/dashboard';
import { CategoryExerciseProgress, ExerciseCategory } from '../types';
import { DashboardStackParamList } from '../navigation/TabNavigator';
import { MiniSparkline } from '../components/MiniSparkline';
import { formatRelativeTime } from '../utils/formatRelativeTime';
import { colors, getCategoryColor } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { fontSize, weightBold, weightSemiBold, weightMedium } from '../theme/typography';

type ScreenRouteProp = RouteProp<DashboardStackParamList, 'CategoryProgress'>;
type ScreenNavProp = NativeStackNavigationProp<DashboardStackParamList, 'CategoryProgress'>;

const TIME_RANGES = ['1M', '3M', '6M', 'All'] as const;
type TimeRange = (typeof TIME_RANGES)[number];

function formatBestValue(exercise: CategoryExerciseProgress, isVolume: boolean): string {
  if (exercise.measurementType === 'timed') {
    return `${Math.round(exercise.currentBest)}s`;
  }
  if (exercise.measurementType === 'height_reps') {
    if (isVolume) { return '—'; }
    return `${exercise.currentBest % 1 === 0 ? exercise.currentBest : exercise.currentBest.toFixed(1)} in`;
  }
  if (isVolume) {
    return `${Math.round(exercise.currentBest).toLocaleString()} lb`;
  }
  return `${exercise.currentBest % 1 === 0 ? exercise.currentBest : exercise.currentBest.toFixed(1)} lb`;
}

function formatDelta(exercise: CategoryExerciseProgress, isVolume: boolean): { text: string; isPositive: boolean } | null {
  if (exercise.previousBest === null || exercise.sparklinePoints.length < 2) {
    return null;
  }
  const delta = exercise.currentBest - exercise.previousBest;
  const sign = delta >= 0 ? '+' : '\u2212';
  const abs = Math.abs(delta);
  let text: string;
  if (exercise.measurementType === 'timed') {
    text = `${sign}${Math.round(abs)}s`;
  } else if (exercise.measurementType === 'height_reps') {
    if (isVolume) { return null; }
    text = `${sign}${abs % 1 === 0 ? abs : abs.toFixed(1)} in`;
  } else if (isVolume) {
    text = `${sign}${Math.round(abs).toLocaleString()} lb`;
  } else {
    text = `${sign}${abs % 1 === 0 ? abs : abs.toFixed(1)} lb`;
  }
  return { text, isPositive: delta >= 0 };
}

interface ExerciseRowProps {
  exercise: CategoryExerciseProgress;
  accentColor: string;
  isVolume: boolean;
  onPress: () => void;
}

const ExerciseRow: React.FC<ExerciseRowProps> = ({ exercise, accentColor, isVolume, onPress }) => {
  const delta = formatDelta(exercise, isVolume);
  const bestValue = formatBestValue(exercise, isVolume);
  const sessionCount = exercise.sparklinePoints.length;
  const [sparkWidth, setSparkWidth] = useState(0);

  const onSparklineLayout = useCallback((e: LayoutChangeEvent) => {
    setSparkWidth(e.nativeEvent.layout.width);
  }, []);

  return (
    <TouchableOpacity
      testID="exercise-row"
      style={styles.exerciseRow}
      activeOpacity={0.7}
      onPress={onPress}>
      {/* Header: name + delta badge */}
      <View style={styles.exerciseHeader}>
        <Text style={styles.exerciseName} numberOfLines={1}>
          {exercise.exerciseName}
        </Text>
        {delta !== null && (
          <View
            style={[
              styles.deltaBadge,
              {
                backgroundColor: delta.isPositive
                  ? accentColor + '1A'
                  : colors.danger + '1A',
              },
            ]}>
            <Text
              testID="delta-text"
              style={[
                styles.deltaText,
                { color: delta.isPositive ? accentColor : colors.danger },
              ]}>
              {delta.text}
            </Text>
          </View>
        )}
      </View>

      {/* Stats row: best value, sessions, last trained */}
      <View style={styles.statsRow}>
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: accentColor }]}>{bestValue}</Text>
          <Text style={styles.statLabel}>{isVolume ? 'volume' : 'best'}</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{sessionCount}</Text>
          <Text style={styles.statLabel}>{sessionCount === 1 ? 'session' : 'sessions'}</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{formatRelativeTime(exercise.lastTrainedAt)}</Text>
          <Text style={styles.statLabel}>last</Text>
        </View>
      </View>

      {/* Sparkline with gradient fill */}
      <View style={styles.sparklineContainer} onLayout={onSparklineLayout}>
        <MiniSparkline
          data={exercise.sparklinePoints}
          width={sparkWidth || 280}
          height={36}
          color={accentColor}
          strokeWidth={1.5}
          showGradientFill
        />
      </View>
    </TouchableOpacity>
  );
};

export function CategoryProgressScreen() {
  const navigation = useNavigation<ScreenNavProp>();
  const route = useRoute<ScreenRouteProp>();
  const { category, viewMode: initialViewMode } = route.params;
  const [viewMode, setViewMode] = useState<'strength' | 'volume'>(initialViewMode ?? 'strength');
  const isVolume = viewMode === 'volume';

  const [exercises, setExercises] = useState<CategoryExerciseProgress[]>([]);
  const [timeRange, setTimeRange] = useState<TimeRange>('All');

  const accentColor = getCategoryColor(category);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      (async () => {
        try {
          const data = isVolume
            ? await getCategoryExerciseVolumeProgress(category as ExerciseCategory, timeRange)
            : await getCategoryExerciseProgress(category as ExerciseCategory, timeRange);
          if (!cancelled) {
            setExercises(data);
          }
        } catch (err) {
          console.warn('CategoryProgress data fetch failed:', err);
        }
      })();
      return () => { cancelled = true; };
    }, [category, timeRange, isVolume]),
  );

  const title = category.charAt(0).toUpperCase() + category.slice(1);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}>
          <Text style={styles.backArrow}>{'\u2190'}</Text>
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { flex: 1 }]} numberOfLines={1}>
          {title}
        </Text>
        <Text style={styles.exerciseCountBadge}>
          {exercises.length} {exercises.length === 1 ? 'exercise' : 'exercises'}
        </Text>
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Time range filter pills */}
        <View style={styles.filterRow}>
          {TIME_RANGES.map(range => (
            <TouchableOpacity
              key={range}
              style={[
                styles.filterButton,
                timeRange === range && [
                  styles.filterButtonActive,
                  { backgroundColor: accentColor },
                ],
              ]}
              activeOpacity={0.7}
              onPress={() => setTimeRange(range)}>
              <Text
                style={[
                  styles.filterText,
                  timeRange === range && styles.filterTextActive,
                ]}>
                {range}
              </Text>
            </TouchableOpacity>
          ))}
          <View style={{ flex: 1 }} />
          <View style={styles.modePill}>
            <TouchableOpacity
              style={[styles.modePillButton, !isVolume && styles.modePillButtonActive]}
              activeOpacity={0.7}
              onPress={() => setViewMode('strength')}>
              <Text style={[styles.modePillText, !isVolume && styles.modePillTextActive]}>S</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modePillButton, isVolume && styles.modePillButtonActive]}
              activeOpacity={0.7}
              onPress={() => setViewMode('volume')}>
              <Text style={[styles.modePillText, isVolume && styles.modePillTextActive]}>V</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Exercise list or empty state */}
        {exercises.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No exercises found</Text>
          </View>
        ) : (
          exercises.map(exercise => (
            <ExerciseRow
              key={exercise.exerciseId}
              exercise={exercise}
              accentColor={accentColor}
              isVolume={isVolume}
              onPress={() =>
                navigation.navigate('ExerciseDetail', {
                  exerciseId: exercise.exerciseId,
                  exerciseName: exercise.exerciseName,
                  measurementType: exercise.measurementType,
                  category,
                })
              }
            />
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.base,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
  },
  backButton: {
    marginRight: spacing.md,
    padding: spacing.xs,
    minWidth: 44,
    minHeight: 44,
    justifyContent: 'center',
  },
  backArrow: {
    color: colors.primary,
    fontSize: fontSize.xl,
  },
  headerTitle: {
    color: colors.primary,
    fontSize: fontSize.lg,
    fontWeight: weightBold,
  },
  exerciseCountBadge: {
    color: colors.secondary,
    fontSize: fontSize.sm,
    fontWeight: weightMedium,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.base,
    paddingBottom: spacing.xxxl,
  },
  filterRow: {
    flexDirection: 'row',
    marginBottom: spacing.base,
    gap: spacing.sm,
  },
  filterButton: {
    backgroundColor: colors.surface,
    borderRadius: 8,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.base,
  },
  filterButtonActive: {
    backgroundColor: colors.accent,
  },
  filterText: {
    color: colors.secondary,
    fontSize: fontSize.sm,
    fontWeight: weightMedium,
  },
  filterTextActive: {
    color: colors.background,
    fontWeight: weightSemiBold,
  },
  modePill: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: 8,
    padding: 2,
  },
  modePillButton: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    borderRadius: 6,
    minWidth: 28,
    alignItems: 'center',
  },
  modePillButtonActive: {
    backgroundColor: colors.accent,
  },
  modePillText: {
    color: colors.secondary,
    fontSize: fontSize.xs,
    fontWeight: weightSemiBold,
  },
  modePillTextActive: {
    color: colors.background,
  },
  emptyContainer: {
    paddingVertical: spacing.xxxl,
    alignItems: 'center',
  },
  emptyText: {
    color: colors.secondary,
    fontSize: fontSize.base,
  },

  /* ── Exercise Row ──────────────────────────────────────────────── */
  exerciseRow: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.base,
    marginBottom: spacing.sm,
  },
  exerciseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  exerciseName: {
    color: colors.primary,
    fontSize: fontSize.base,
    fontWeight: weightSemiBold,
    flex: 1,
    marginRight: spacing.sm,
  },
  deltaBadge: {
    borderRadius: 8,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  deltaText: {
    fontSize: fontSize.xs,
    fontWeight: weightSemiBold,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
  },
  statValue: {
    color: colors.primary,
    fontSize: fontSize.sm,
    fontWeight: weightSemiBold,
  },
  statLabel: {
    color: colors.secondary,
    fontSize: fontSize.xs,
  },
  statDivider: {
    width: 1,
    height: 12,
    backgroundColor: colors.border,
    marginHorizontal: spacing.sm,
  },
  sparklineContainer: {
    // sparkline fills full width
  },
});
