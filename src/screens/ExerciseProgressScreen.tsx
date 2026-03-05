import React, { useCallback, useMemo, useState } from 'react';
import {
  Dimensions,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useFocusEffect, useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { LineChart } from 'react-native-chart-kit';
import { getExerciseProgressData, getExerciseHistory } from '../db/dashboard';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { fontSize, weightBold, weightSemiBold, weightMedium } from '../theme/typography';
import { ExerciseProgressPoint, ExerciseHistorySession } from '../types';
import { DashboardStackParamList } from '../navigation/TabNavigator';

type RouteParams = RouteProp<DashboardStackParamList, 'ExerciseProgress'>;

const TIME_RANGES = ['1M', '3M', '6M', 'All'] as const;
type TimeRange = (typeof TIME_RANGES)[number];

const CHART_WIDTH = Dimensions.get('window').width - spacing.base * 2;

function getDateThreshold(range: TimeRange): Date | null {
  if (range === 'All') { return null; }
  const now = new Date();
  const months = range === '1M' ? 1 : range === '3M' ? 3 : 6;
  now.setMonth(now.getMonth() - months);
  return now;
}

function formatDateShort(dateStr: string): string {
  const d = new Date(dateStr);
  return (d.getMonth() + 1) + '/' + d.getDate();
}

function formatDateReadable(dateStr: string): string {
  const d = new Date(dateStr);
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const months = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
  ];
  return days[d.getDay()] + ', ' + months[d.getMonth()] + ' ' + d.getDate() + ', ' + d.getFullYear();
}

export function ExerciseProgressScreen() {
  const navigation = useNavigation();
  const route = useRoute<RouteParams>();
  const { exerciseId, exerciseName } = route.params;

  const [progressData, setProgressData] = useState<ExerciseProgressPoint[]>([]);
  const [historyData, setHistoryData] = useState<ExerciseHistorySession[]>([]);
  const [timeRange, setTimeRange] = useState<TimeRange>('All');

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      (async () => {
        try {
          const [progress, history] = await Promise.all([
            getExerciseProgressData(exerciseId),
            getExerciseHistory(exerciseId),
          ]);
          if (!cancelled) {
            setProgressData(progress);
            setHistoryData(history);
          }
        } catch {
          // ignore
        }
      })();
      return () => { cancelled = true; };
    }, [exerciseId]),
  );

  const filteredProgress = useMemo(() => {
    const threshold = getDateThreshold(timeRange);
    if (!threshold) { return progressData; }
    return progressData.filter(p => new Date(p.date) >= threshold);
  }, [progressData, timeRange]);

  const chartData = useMemo(() => {
    if (filteredProgress.length === 0) { return null; }

    const maxLabels = 6;
    const step = Math.max(1, Math.floor(filteredProgress.length / maxLabels));
    const labels = filteredProgress.map((p, i) =>
      i % step === 0 || i === filteredProgress.length - 1
        ? formatDateShort(p.date)
        : '',
    );

    return {
      labels,
      datasets: [
        {
          data: filteredProgress.map(p => p.bestWeightKg),
          color: () => colors.accent,
          strokeWidth: 2,
        },
      ],
    };
  }, [filteredProgress]);

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}>
          <Text style={styles.backArrow}>{'\u2190'}</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {exerciseName}
        </Text>
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Time range filter */}
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

        {/* Chart section */}
        {chartData === null ? (
          <View style={styles.noDataContainer}>
            <Text style={styles.noDataText}>No data yet</Text>
          </View>
        ) : (
          <View style={styles.chartContainer}>
            <LineChart
              data={chartData}
              width={CHART_WIDTH}
              height={220}
              yAxisSuffix={' kg'}
              withDots={filteredProgress.length <= 10}
              withInnerLines={false}
              withOuterLines={false}
              chartConfig={{
                backgroundColor: colors.surface,
                backgroundGradientFrom: colors.surface,
                backgroundGradientTo: colors.surface,
                decimalPlaces: 1,
                color: () => colors.accent,
                labelColor: () => colors.secondary,
                propsForDots: {
                  r: '4',
                  strokeWidth: '0',
                  fill: colors.accent,
                },
              }}
              bezier
              style={styles.chart}
            />
          </View>
        )}

        {/* History section */}
        <Text style={styles.sectionTitle}>History</Text>

        {historyData.length === 0 ? (
          <Text style={styles.noDataText}>No sessions recorded yet.</Text>
        ) : (
          historyData.map(session => (
            <View key={session.sessionId} style={styles.historyCard}>
              <Text style={styles.historyDate}>
                {formatDateReadable(session.date)}
              </Text>
              {session.sets.map(set => (
                <Text
                  key={set.setNumber}
                  style={[
                    styles.setText,
                    set.isWarmup && styles.setTextWarmup,
                  ]}>
                  {'Set ' + set.setNumber + ': ' + set.weightKg + 'kg x ' + set.reps + ' reps' + (set.isWarmup ? ' (warmup)' : '')}
                </Text>
              ))}
            </View>
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
  chartContainer: {
    marginBottom: spacing.lg,
    borderRadius: 10,
    overflow: 'hidden',
  },
  chart: {
    borderRadius: 10,
  },
  noDataContainer: {
    height: 220,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 10,
    marginBottom: spacing.lg,
  },
  noDataText: {
    color: colors.secondary,
    fontSize: fontSize.base,
    textAlign: 'center',
  },
  sectionTitle: {
    color: colors.primary,
    fontSize: fontSize.md,
    fontWeight: weightBold,
    marginBottom: spacing.md,
  },
  historyCard: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 10,
    padding: spacing.base,
    marginBottom: spacing.sm,
  },
  historyDate: {
    color: colors.primary,
    fontSize: fontSize.base,
    fontWeight: weightSemiBold,
    marginBottom: spacing.sm,
  },
  setText: {
    color: colors.primary,
    fontSize: fontSize.sm,
    lineHeight: 22,
  },
  setTextWarmup: {
    color: colors.secondary,
  },
});
