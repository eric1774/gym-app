import React, { useCallback, useState } from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { getExerciseChartData } from '../db/progress';
import { getExerciseHistory, deleteExerciseHistorySession } from '../db/dashboard';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { fontSize, weightBold, weightMedium, weightSemiBold } from '../theme/typography';
import { ChartPoint, ExerciseHistorySession } from '../types';
import { StrengthVolumeChart } from '../components/progress/StrengthVolumeChart';
import { ChartInspectCallout } from '../components/progress/ChartInspectCallout';
import { SessionHistoryRow } from '../components/progress/SessionHistoryRow';

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

const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const formatDateReadable = (iso: string): string => {
  const d = new Date(iso);
  return `${months[d.getUTCMonth()]} ${d.getUTCDate()}`;
};

const DAYS_30_MS = 30 * 24 * 60 * 60 * 1000;
const DAYS_90_MS = 90 * 24 * 60 * 60 * 1000;

export function ExerciseDetailScreen() {
  const navigation = useNavigation<NavProp>();
  const route = useRoute<RouteParams>();
  const { exerciseId, exerciseName } = route.params;

  const [timeRange, setTimeRange] = useState<TimeRange>('3M');
  const [chartPoints, setChartPoints] = useState<ChartPoint[]>([]);
  const [historyData, setHistoryData] = useState<ExerciseHistorySession[]>([]);
  const [inspectedPoint, setInspectedPoint] = useState<ChartPoint | null>(null);

  useFocusEffect(useCallback(() => {
    let cancelled = false;
    (async () => {
      try {
        const [chart, history] = await Promise.all([
          getExerciseChartData(exerciseId, timeRange),
          getExerciseHistory(exerciseId),
        ]);
        if (!cancelled) {
          setChartPoints(chart);
          setHistoryData(history);
          setInspectedPoint(chart[chart.length - 1] ?? null);
        }
      } catch (err) { console.warn('ExerciseDetail fetch failed:', err); }
    })();
    return () => { cancelled = true; };
  }, [exerciseId, timeRange]));

  // Hero stats — fixed windows independent of time-range pill
  const now = Date.now();

  const bestWeightLb = historyData.reduce((max, s) => {
    const top = s.sets.filter(set => !set.isWarmup).reduce((m, set) => Math.max(m, set.weightLbs), 0);
    return Math.max(max, top);
  }, 0);

  const vol30d = historyData
    .filter(s => now - new Date(s.date).getTime() <= DAYS_30_MS)
    .reduce((sum, s) => sum + s.sets.filter(set => !set.isWarmup).reduce((vs, set) => vs + set.weightLbs * set.reps, 0), 0);

  // Compute PRs in last 90 days from historyData using running max in chronological order
  const sortedHistory = [...historyData].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  let runningMax = 0;
  let prs90d = 0;
  for (const s of sortedHistory) {
    const sessionBest = s.sets.filter(set => !set.isWarmup).reduce((m, set) => Math.max(m, set.weightLbs), 0);
    if (sessionBest > runningMax) {
      runningMax = sessionBest;
      if (now - new Date(s.date).getTime() <= DAYS_90_MS) { prs90d++; }
    }
  }

  const confirmDeleteHistory = useCallback((sessionId: number) => {
    Alert.alert('Delete session?', 'This will remove all sets for this session.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        try { await deleteExerciseHistorySession(sessionId); } catch (err) { console.warn('Delete failed:', err); }
        setHistoryData(prev => prev.filter(s => s.sessionId !== sessionId));
      }},
    ]);
  }, []);

  const handleLongPress = useCallback((sessionId: number) => {
    const session = historyData.find(s => s.sessionId === sessionId);
    if (!session) { return; }
    Alert.alert(
      formatDateReadable(session.date),
      undefined,
      [
        { text: 'View Full Workout', onPress: () => navigation.navigate('SessionBreakdown', {
          sessionId, exerciseId, exerciseName, sessionDate: session.date,
        })},
        { text: 'Delete', style: 'destructive', onPress: () => confirmDeleteHistory(sessionId) },
        { text: 'Cancel', style: 'cancel' },
      ],
    );
  }, [historyData, exerciseId, exerciseName, navigation, confirmDeleteHistory]);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()} activeOpacity={0.7}>
          <Text style={styles.backArrow}>{'←'}</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>{exerciseName}</Text>
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>

        {/* Hero stats */}
        <View style={styles.heroRow}>
          <View style={styles.heroStat}>
            <Text style={styles.heroValue}>{bestWeightLb > 0 ? bestWeightLb : '—'}</Text>
            <Text style={styles.heroLabel}>Best · lb</Text>
          </View>
          <View style={styles.heroStat}>
            <Text style={styles.heroValue}>{vol30d > 0 ? vol30d.toLocaleString() : '—'}</Text>
            <Text style={styles.heroLabel}>Vol · 30d</Text>
          </View>
          <View style={styles.heroStat}>
            <Text style={[styles.heroValue, { color: prs90d > 0 ? colors.prGold : colors.textSoft }]}>
              {prs90d}
            </Text>
            <Text style={styles.heroLabel}>PRs · 90d</Text>
          </View>
        </View>

        {/* Time range pills */}
        <View style={styles.filterPills}>
          {TIME_RANGES.map(range => (
            <TouchableOpacity
              key={range}
              testID={`range-pill-${range}`}
              style={[styles.filterButton, timeRange === range && styles.filterButtonActive]}
              activeOpacity={0.7}
              onPress={() => setTimeRange(range)}>
              <Text style={[styles.filterText, timeRange === range && styles.filterTextActive]}>
                {range}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Chart + inspect callout */}
        <View style={{ marginBottom: spacing.md }}>
          <StrengthVolumeChart points={chartPoints} onPointTap={setInspectedPoint} />
        </View>
        <ChartInspectCallout point={inspectedPoint} />

        {/* Session history */}
        <Text style={styles.sectionTitle}>Session History</Text>
        {historyData.length === 0 ? (
          <Text style={styles.emptyText}>No sessions in this period.</Text>
        ) : (
          historyData.map(session => {
            const isPR = chartPoints.find(p => p.sessionId === session.sessionId)?.isPR ?? false;
            return (
              <SessionHistoryRow
                key={session.sessionId}
                session={session}
                isPR={isPR}
                onLongPress={handleLongPress}
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
    color: colors.primary,
  },
  heroLabel: {
    color: colors.secondary,
    fontSize: fontSize.xs,
    marginTop: spacing.xs,
  },
  // Filter pills (standalone row, no flex: 1 partner)
  filterPills: {
    flexDirection: 'row',
    gap: spacing.xs,
    marginBottom: spacing.base,
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
  // Session history
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
