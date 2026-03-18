import React, { useState, useCallback } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { getCategoryExerciseProgress } from '../db/dashboard';
import { CategoryExerciseProgress } from '../types';
import { DashboardStackParamList } from '../navigation/TabNavigator';
import { MiniSparkline } from '../components/MiniSparkline';
import { formatRelativeTime } from '../utils/formatRelativeTime';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { fontSize, weightBold, weightSemiBold, weightMedium } from '../theme/typography';

type ScreenRouteProp = RouteProp<DashboardStackParamList, 'CategoryProgress'>;
type ScreenNavProp = NativeStackNavigationProp<DashboardStackParamList, 'CategoryProgress'>;

const TIME_RANGES = ['1M', '3M', '6M', 'All'] as const;
type TimeRange = (typeof TIME_RANGES)[number];

function formatDelta(exercise: CategoryExerciseProgress): string | null {
  if (exercise.previousBest === null || exercise.sparklinePoints.length < 2) {
    return null;
  }
  const delta = exercise.currentBest - exercise.previousBest;
  if (delta <= 0) {
    return '\u2013'; // en-dash
  }
  if (exercise.measurementType === 'timed') {
    return `+${Math.round(delta)}s`;
  }
  return `+${delta.toFixed(1)} kg`;
}

export function CategoryProgressScreen() {
  const navigation = useNavigation<ScreenNavProp>();
  const route = useRoute<ScreenRouteProp>();
  const { category } = route.params;

  const [exercises, setExercises] = useState<CategoryExerciseProgress[]>([]);
  const [timeRange, setTimeRange] = useState<TimeRange>('All');

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      (async () => {
        try {
          const data = await getCategoryExerciseProgress(category as any, timeRange);
          if (!cancelled) {
            setExercises(data);
          }
        } catch {
          // silently handle fetch errors
        }
      })();
      return () => { cancelled = true; };
    }, [category, timeRange]),
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
        <Text style={styles.headerTitle} numberOfLines={1}>
          {title}
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
                timeRange === range && styles.filterButtonActive,
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
        </View>

        {/* Exercise list or empty state */}
        {exercises.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No exercises found</Text>
          </View>
        ) : (
          exercises.map(exercise => {
            const delta = formatDelta(exercise);
            const isPositiveDelta = delta !== null && delta !== '\u2013';
            return (
              <TouchableOpacity
                key={exercise.exerciseId}
                testID="exercise-row"
                style={styles.exerciseRow}
                activeOpacity={0.7}
                onPress={() =>
                  navigation.navigate('ExerciseProgress', {
                    exerciseId: exercise.exerciseId,
                    exerciseName: exercise.exerciseName,
                    measurementType: exercise.measurementType,
                  })
                }>
                <View style={styles.exerciseInfo}>
                  <Text style={styles.exerciseName}>{exercise.exerciseName}</Text>
                  <View style={styles.exerciseMeta}>
                    {delta !== null && (
                      <Text
                        testID="delta-text"
                        style={[
                          styles.deltaText,
                          isPositiveDelta ? styles.deltaPositive : styles.deltaNeutral,
                        ]}>
                        {delta}
                      </Text>
                    )}
                    <Text style={styles.timeAgo}>
                      {formatRelativeTime(exercise.lastTrainedAt)}
                    </Text>
                  </View>
                </View>
                <View style={styles.sparklineContainer}>
                  <MiniSparkline data={exercise.sparklinePoints} />
                </View>
              </TouchableOpacity>
            );
          })
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
  },
  backArrow: {
    color: colors.primary,
    fontSize: fontSize.xl,
  },
  headerTitle: {
    color: colors.primary,
    fontSize: fontSize.lg,
    fontWeight: weightBold,
    flex: 1,
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
  emptyContainer: {
    paddingVertical: spacing.xxxl,
    alignItems: 'center',
  },
  emptyText: {
    color: colors.secondary,
    fontSize: fontSize.base,
  },
  exerciseRow: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.base,
    marginBottom: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
  },
  exerciseInfo: {
    flex: 1,
    marginRight: spacing.md,
  },
  exerciseName: {
    color: colors.primary,
    fontSize: fontSize.base,
    fontWeight: weightSemiBold,
    marginBottom: spacing.xs,
  },
  exerciseMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  deltaText: {
    fontSize: fontSize.sm,
    fontWeight: weightMedium,
  },
  deltaPositive: {
    color: colors.accent,
  },
  deltaNeutral: {
    color: colors.secondary,
  },
  timeAgo: {
    color: colors.secondary,
    fontSize: fontSize.sm,
  },
  sparklineContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
