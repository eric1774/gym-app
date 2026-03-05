import React, { useCallback, useEffect, useState } from 'react';
import {
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { getExerciseProgressData, getExerciseHistory } from '../db/dashboard';
import { ExerciseProgressPoint, ExerciseHistorySession } from '../types';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { fontSize, weightBold, weightSemiBold } from '../theme/typography';
import { DashboardStackParamList } from '../navigation/TabNavigator';

type ProgressRoute = RouteProp<DashboardStackParamList, 'ExerciseProgress'>;

type TimeRange = '1M' | '3M' | '6M' | 'All';

function filterByRange(data: ExerciseProgressPoint[], range: TimeRange): ExerciseProgressPoint[] {
  if (range === 'All') return data;
  const now = Date.now();
  const months = range === '1M' ? 1 : range === '3M' ? 3 : 6;
  const cutoff = new Date(now);
  cutoff.setMonth(cutoff.getMonth() - months);
  return data.filter((p) => new Date(p.date).getTime() >= cutoff.getTime());
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
}

export function ExerciseProgressScreen() {
  const navigation = useNavigation();
  const route = useRoute<ProgressRoute>();
  const { exerciseId, exerciseName } = route.params;
  const [progressData, setProgressData] = useState<ExerciseProgressPoint[]>([]);
  const [history, setHistory] = useState<ExerciseHistorySession[]>([]);
  const [timeRange, setTimeRange] = useState<TimeRange>('All');

  useEffect(() => {
    getExerciseProgressData(exerciseId).then(setProgressData).catch(() => {});
    getExerciseHistory(exerciseId).then(setHistory).catch(() => {});
  }, [exerciseId]);

  const filteredData = filterByRange(progressData, timeRange);
  const ranges: TimeRange[] = ['1M', '3M', '6M', 'All'];

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Text style={styles.backText}>{'<'}</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>{exerciseName}</Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        {/* Chart placeholder - will use chart-kit when data exists */}
        <View style={styles.chartContainer}>
          {filteredData.length === 0 ? (
            <Text style={styles.noData}>No data yet</Text>
          ) : (
            <View>
              <Text style={styles.chartLabel}>Best Weight (kg) over time</Text>
              {filteredData.map((point, i) => (
                <View key={point.sessionId} style={styles.dataRow}>
                  <Text style={styles.dataDate}>{new Date(point.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</Text>
                  <Text style={styles.dataValue}>{point.bestWeightKg}kg x {point.bestReps}</Text>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Time range filter */}
        <View style={styles.rangeRow}>
          {ranges.map((r) => (
            <TouchableOpacity
              key={r}
              style={[styles.rangeButton, timeRange === r && styles.rangeButtonActive]}
              onPress={() => setTimeRange(r)}>
              <Text style={[styles.rangeText, timeRange === r && styles.rangeTextActive]}>{r}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* History */}
        <Text style={styles.sectionTitle}>History</Text>
        {history.map((session) => (
          <View key={session.sessionId} style={styles.historyCard}>
            <Text style={styles.historyDate}>{formatDate(session.date)}</Text>
            {session.sets.map((set) => (
              <Text
                key={set.setNumber}
                style={[styles.historySet, set.isWarmup && styles.historyWarmup]}>
                Set {set.setNumber}: {set.weightKg}kg x {set.reps}{set.isWarmup ? ' (warmup)' : ''}
              </Text>
            ))}
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
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
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backText: {
    fontSize: fontSize.xl,
    color: colors.accent,
    fontWeight: weightBold,
  },
  headerTitle: {
    flex: 1,
    fontSize: fontSize.lg,
    fontWeight: weightBold,
    color: colors.primary,
    textAlign: 'center',
  },
  headerRight: {
    width: 44,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.base,
    paddingBottom: spacing.xxxl,
  },
  chartContainer: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: spacing.base,
    minHeight: 120,
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  chartLabel: {
    fontSize: fontSize.sm,
    color: colors.secondary,
    marginBottom: spacing.sm,
  },
  noData: {
    fontSize: fontSize.base,
    color: colors.secondary,
    textAlign: 'center',
  },
  dataRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.xs,
  },
  dataDate: {
    fontSize: fontSize.sm,
    color: colors.secondary,
  },
  dataValue: {
    fontSize: fontSize.sm,
    color: colors.primary,
    fontWeight: weightSemiBold,
  },
  rangeRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  rangeButton: {
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm,
    borderRadius: 8,
    backgroundColor: colors.surface,
  },
  rangeButtonActive: {
    backgroundColor: colors.accent,
  },
  rangeText: {
    fontSize: fontSize.sm,
    color: colors.secondary,
    fontWeight: weightSemiBold,
  },
  rangeTextActive: {
    color: colors.background,
  },
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: weightBold,
    color: colors.primary,
    marginBottom: spacing.md,
  },
  historyCard: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: spacing.base,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  historyDate: {
    fontSize: fontSize.sm,
    fontWeight: weightSemiBold,
    color: colors.primary,
    marginBottom: spacing.xs,
  },
  historySet: {
    fontSize: fontSize.sm,
    color: colors.primary,
    paddingVertical: 2,
  },
  historyWarmup: {
    color: colors.secondary,
  },
});
