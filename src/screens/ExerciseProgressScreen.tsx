import React, { useCallback, useMemo, useState } from 'react';
import {
  Alert,
  Dimensions,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { LineChart } from 'react-native-chart-kit';
import { getExerciseProgressData, getTimedExerciseProgressData, getExerciseHistory, deleteExerciseHistorySession } from '../db/dashboard';
import { colors, getCategoryColor } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { fontSize, weightBold, weightSemiBold, weightMedium } from '../theme/typography';
import { ExerciseProgressPoint, ExerciseHistorySession } from '../types';
type ExerciseProgressParams = { exerciseId: number; exerciseName: string; measurementType?: 'reps' | 'timed'; category?: string };
type RouteParams = RouteProp<{ ExerciseProgress: ExerciseProgressParams }, 'ExerciseProgress'>;

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

function formatDuration(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export function ExerciseProgressScreen() {
  const navigation = useNavigation();
  const route = useRoute<RouteParams>();
  const { exerciseId, exerciseName, measurementType, category } = route.params;
  const isTimed = measurementType === 'timed';
  const accentColor = category ? getCategoryColor(category) : colors.accent;

  const [progressData, setProgressData] = useState<ExerciseProgressPoint[]>([]);
  const [historyData, setHistoryData] = useState<ExerciseHistorySession[]>([]);
  const [timeRange, setTimeRange] = useState<TimeRange>('All');

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      (async () => {
        try {
          const progressFn = isTimed ? getTimedExerciseProgressData : getExerciseProgressData;
          const [progress, history] = await Promise.all([
            progressFn(exerciseId),
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

  const confirmDeleteHistory = useCallback(
    async (sessionId: number) => {
      try {
        await deleteExerciseHistorySession(sessionId, exerciseId);
        setHistoryData(prev => prev.filter(s => s.sessionId !== sessionId));
        setProgressData(prev => prev.filter(p => p.sessionId !== sessionId));
      } catch {
        // ignore
      }
    },
    [exerciseId],
  );

  const handleDeleteHistory = useCallback(
    (session: ExerciseHistorySession) => {
      Alert.alert(
        'Delete Entry',
        'Delete session from ' + formatDateReadable(session.date) + '?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: () => { confirmDeleteHistory(session.sessionId); },
          },
        ],
      );
    },
    [confirmDeleteHistory],
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
          data: isTimed
            ? filteredProgress.map(p => p.bestReps)
            : filteredProgress.map(p => p.bestWeightKg),
          color: () => accentColor,
          strokeWidth: 2,
        },
      ],
    };
  }, [filteredProgress, isTimed]);

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
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
                timeRange === range && [styles.filterButtonActive, { backgroundColor: accentColor }],
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
              yAxisSuffix={isTimed ? 's' : ' lb'}
              withDots={filteredProgress.length <= 10}
              withInnerLines={false}
              withOuterLines={false}
              chartConfig={{
                backgroundColor: colors.surface,
                backgroundGradientFrom: colors.surface,
                backgroundGradientTo: colors.surface,
                decimalPlaces: isTimed ? 0 : 1,
                color: () => accentColor,
                labelColor: () => colors.secondary,
                propsForDots: {
                  r: '4',
                  strokeWidth: '0',
                  fill: accentColor,
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
            <View key={session.sessionId} style={[styles.historyCard, { borderLeftColor: accentColor, borderLeftWidth: 3 }]}>
              <View style={styles.historyCardHeader}>
                <Text style={styles.historyDate}>
                  {formatDateReadable(session.date)}
                </Text>
                <TouchableOpacity
                  onPress={() => handleDeleteHistory(session)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  activeOpacity={0.7}>
                  <Text style={styles.deleteButton}>{'✕'}</Text>
                </TouchableOpacity>
              </View>
              {session.sets.map(set => (
                <Text
                  key={set.setNumber}
                  style={[
                    styles.setText,
                    set.isWarmup && styles.setTextWarmup,
                  ]}>
                  {isTimed
                    ? 'Set ' + set.setNumber + ': ' + formatDuration(set.reps)
                    : 'Set ' + set.setNumber + ': ' + set.weightKg + 'lb x ' + set.reps + ' reps' + (set.isWarmup ? ' (warmup)' : '')}
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
  historyCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  historyDate: {
    color: colors.primary,
    fontSize: fontSize.base,
    fontWeight: weightSemiBold,
  },
  deleteButton: {
    color: colors.secondary,
    fontSize: fontSize.base,
    padding: spacing.xs,
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
