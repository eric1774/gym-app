import React, { useCallback, useMemo, useState } from 'react';
import {
  Dimensions,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { LineChart } from 'react-native-chart-kit';
import { getExerciseProgressData, getExerciseVolumeData, getExerciseHistory } from '../db/dashboard';
import { getExerciseInsights } from '../db/progress';
import { colors, getCategoryColor } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { fontSize, weightBold, weightSemiBold, weightMedium } from '../theme/typography';
import { ExerciseProgressPoint, ExerciseHistorySession, ExerciseInsights } from '../types';
import { SessionTimelineRow } from '../components/SessionTimelineRow';
type ExerciseDetailParams = {
  exerciseId: number;
  exerciseName: string;
  measurementType?: 'reps' | 'timed' | 'height_reps';
  category?: string;
};
type RouteParams = RouteProp<{ ExerciseDetail: ExerciseDetailParams }, 'ExerciseDetail'>;

type OnwardNavParamList = {
  SessionBreakdown: { sessionId: number; exerciseId: number; exerciseName: string; sessionDate: string };
};
type NavProp = NativeStackNavigationProp<OnwardNavParamList>;

const TIME_RANGES = ['1M', '3M', '6M', '1Y'] as const;
type TimeRange = (typeof TIME_RANGES)[number];

const CHART_WIDTH = Dimensions.get('window').width - spacing.base * 2;

function getDateThreshold(range: TimeRange): Date {
  const now = new Date();
  const months = range === '1M' ? 1 : range === '3M' ? 3 : range === '6M' ? 6 : 12;
  now.setMonth(now.getMonth() - months);
  return now;
}

function formatDateShort(dateStr: string): string {
  const d = new Date(dateStr);
  return (d.getMonth() + 1) + '/' + d.getDate();
}

export function ExerciseDetailScreen() {
  const navigation = useNavigation<NavProp>();
  const route = useRoute<RouteParams>();
  const { exerciseId, exerciseName, measurementType, category } = route.params;
  const isHeightReps = measurementType === 'height_reps';

  const accentColor = category ? getCategoryColor(category) : colors.accent;

  const [viewMode, setViewMode] = useState<'strength' | 'volume'>('strength');
  const isVolume = viewMode === 'volume';

  const [progressData, setProgressData] = useState<ExerciseProgressPoint[]>([]);
  const [historyData, setHistoryData] = useState<ExerciseHistorySession[]>([]);
  const [insights, setInsights] = useState<ExerciseInsights>({
    weightChangePercent: null,
    volumeChangePercent: null,
    periodLabel: '3 months',
  });
  const [timeRange, setTimeRange] = useState<TimeRange>('3M');

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      (async () => {
        try {
          const [progress, history, insightsData] = await Promise.all([
            isVolume ? getExerciseVolumeData(exerciseId) : getExerciseProgressData(exerciseId),
            getExerciseHistory(exerciseId),
            getExerciseInsights(exerciseId, timeRange),
          ]);
          if (!cancelled) {
            setProgressData(progress);
            setHistoryData(history);
            setInsights(insightsData);
          }
        } catch {
          // ignore
        }
      })();
      return () => { cancelled = true; };
    }, [exerciseId, isVolume, timeRange]),
  );

  const filteredProgress = useMemo(() => {
    const threshold = getDateThreshold(timeRange);
    return progressData.filter(p => new Date(p.date) >= threshold);
  }, [progressData, timeRange]);

  const filteredHistory = useMemo(() => {
    const threshold = getDateThreshold(timeRange);
    return historyData.filter(s => new Date(s.date) >= threshold);
  }, [historyData, timeRange]);

  // Hero stats
  const bestWeight = progressData.length > 0
    ? Math.round(Math.max(...progressData.map(p => p.bestWeightLbs)))
    : 0;

  const totalVolume = filteredHistory.reduce((sum, s) =>
    sum + s.sets
      .filter(set => !set.isWarmup)
      .reduce((ss, set) => ss + set.weightLbs * set.reps, 0),
    0,
  );

  const sessionCount = filteredHistory.length;

  // Insight text
  const insightText = useMemo(() => {
    const { weightChangePercent, volumeChangePercent, periodLabel } = insights;
    if (weightChangePercent !== null) {
      const direction = weightChangePercent >= 0 ? 'up' : 'down';
      const label = isHeightReps ? 'Height' : 'Weight';
      return `${label} ${direction} ${Math.round(Math.abs(weightChangePercent))}% in ${periodLabel}`;
    }
    if (volumeChangePercent !== null) {
      const direction = volumeChangePercent >= 0 ? 'up' : 'down';
      return `Volume ${direction} ${Math.round(Math.abs(volumeChangePercent))}% in ${periodLabel}`;
    }
    return 'Holding steady';
  }, [insights, isHeightReps]);

  const insightPositive =
    (insights.weightChangePercent !== null && insights.weightChangePercent > 0) ||
    (insights.weightChangePercent === null && insights.volumeChangePercent !== null && insights.volumeChangePercent > 0);

  // Chart data
  const chartData = useMemo(() => {
    if (filteredProgress.length < 2) { return null; }
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
          data: filteredProgress.map(p => p.bestWeightLbs),
          color: () => accentColor,
          strokeWidth: 2,
        },
      ],
    };
  }, [filteredProgress, isVolume, accentColor]);

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
          {exerciseName}
        </Text>
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>

        {/* Hero Stats */}
        <View style={styles.heroRow}>
          <View style={styles.heroStat}>
            <Text style={[styles.heroValue, { color: accentColor }]}>
              {bestWeight > 0 ? bestWeight : '—'}
            </Text>
            <Text style={styles.heroLabel}>{isHeightReps ? 'Best (in)' : 'Best (lbs)'}</Text>
          </View>
          {!isHeightReps && (
            <View style={styles.heroStat}>
              <Text style={[styles.heroValue, { color: '#818CF8' }]}>
                {totalVolume > 0 ? totalVolume.toLocaleString() : '—'}
              </Text>
              <Text style={styles.heroLabel}>Volume (lbs)</Text>
            </View>
          )}
          <View style={styles.heroStat}>
            <Text style={[styles.heroValue, { color: colors.prGold }]}>
              {sessionCount}
            </Text>
            <Text style={styles.heroLabel}>Sessions</Text>
          </View>
        </View>

        {/* Insight Row */}
        <Text style={[styles.insightText, { color: insightPositive ? accentColor : colors.secondary }]}>
          {insightText}
        </Text>

        {/* Controls Row: time range pills + strength/volume toggle */}
        <View style={styles.controlsRow}>
          <View style={styles.filterPills}>
            {TIME_RANGES.map(range => (
              <TouchableOpacity
                key={range}
                style={[
                  styles.filterButton,
                  timeRange === range && [styles.filterButtonActive, { backgroundColor: accentColor }],
                ]}
                activeOpacity={0.7}
                onPress={() => setTimeRange(range)}>
                <Text style={[styles.filterText, timeRange === range && styles.filterTextActive]}>
                  {range}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          {!isHeightReps && (
            <View style={styles.modePill}>
              <TouchableOpacity
                style={[styles.modePillButton, !isVolume && styles.modePillButtonActive]}
                activeOpacity={0.7}
                onPress={() => setViewMode('strength')}>
                <Text style={[styles.modePillText, !isVolume && styles.modePillTextActive]}>
                  Strength
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modePillButton, isVolume && styles.modePillButtonActive]}
                activeOpacity={0.7}
                onPress={() => setViewMode('volume')}>
                <Text style={[styles.modePillText, isVolume && styles.modePillTextActive]}>
                  Volume
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Chart */}
        {chartData === null ? (
          <View style={styles.emptyChartContainer}>
            <Text style={styles.emptyChartText}>Log 2+ sessions to see your trend</Text>
          </View>
        ) : (
          <View style={styles.chartContainer}>
            <LineChart
              data={chartData}
              width={CHART_WIDTH}
              height={220}
              yAxisSuffix={isVolume ? '' : (isHeightReps ? ' in' : ' lb')}
              withDots={filteredProgress.length <= 10}
              withInnerLines={false}
              withOuterLines={false}
              chartConfig={{
                backgroundColor: colors.surface,
                backgroundGradientFrom: colors.surface,
                backgroundGradientTo: colors.surface,
                decimalPlaces: isVolume ? 0 : 1,
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

        {/* Session Timeline */}
        <Text style={styles.sectionTitle}>Session History</Text>

        {filteredHistory.length === 0 ? (
          <Text style={styles.emptyText}>No sessions in this period.</Text>
        ) : (
          filteredHistory.map((session, index) => {
            // PR detection: check if this session's best weight exceeds all prior sessions
            const sessionBest = session.sets
              .filter(s => !s.isWarmup)
              .reduce((max, s) => Math.max(max, s.weightLbs), 0);
            const isPR = index < filteredHistory.length - 1 && filteredHistory
              .slice(index + 1)
              .every(prev => {
                const prevBest = prev.sets
                  .filter(s => !s.isWarmup)
                  .reduce((max, s) => Math.max(max, s.weightLbs), 0);
                return sessionBest > prevBest;
              });

            return (
              <SessionTimelineRow
                key={session.sessionId}
                session={session}
                index={index}
                totalSessions={filteredHistory.length}
                isPR={isPR}
                isHeightReps={isHeightReps}
                onPress={() =>
                  navigation.navigate('SessionBreakdown', {
                    sessionId: session.sessionId,
                    exerciseId,
                    exerciseName,
                    sessionDate: session.date,
                  })
                }
              />
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
  // Hero stats
  heroRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: colors.surface,
    borderRadius: 12,
    paddingVertical: spacing.lg,
    marginBottom: spacing.md,
  },
  heroStat: {
    alignItems: 'center',
    flex: 1,
  },
  heroValue: {
    fontSize: fontSize.xl,
    fontWeight: weightBold,
  },
  heroLabel: {
    color: colors.secondary,
    fontSize: fontSize.xs,
    marginTop: spacing.xs,
  },
  // Insight
  insightText: {
    fontSize: fontSize.sm,
    fontWeight: weightMedium,
    textAlign: 'center',
    marginBottom: spacing.base,
  },
  // Controls
  controlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.base,
    gap: spacing.sm,
  },
  filterPills: {
    flexDirection: 'row',
    gap: spacing.xs,
    flex: 1,
  },
  filterButton: {
    backgroundColor: colors.surface,
    borderRadius: 8,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
  },
  filterButtonActive: {
    backgroundColor: colors.accent,
  },
  filterText: {
    color: colors.secondary,
    fontSize: fontSize.xs,
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
  // Chart
  chartContainer: {
    marginBottom: spacing.lg,
    borderRadius: 10,
    overflow: 'hidden',
  },
  chart: {
    borderRadius: 10,
  },
  emptyChartContainer: {
    height: 220,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 10,
    marginBottom: spacing.lg,
  },
  emptyChartText: {
    color: colors.secondary,
    fontSize: fontSize.base,
    textAlign: 'center',
  },
  // Session timeline
  sectionTitle: {
    color: colors.primary,
    fontSize: fontSize.md,
    fontWeight: weightBold,
    marginBottom: spacing.md,
  },
  emptyText: {
    color: colors.secondary,
    fontSize: fontSize.base,
    textAlign: 'center',
  },
});
