import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors } from '../theme/colors';
import { fontSize, weightBold, weightMedium, weightSemiBold } from '../theme/typography';
import { spacing } from '../theme/spacing';
import { getDaySessionDetails } from '../db/calendar';
import { CalendarSessionDetail } from '../types';
import { CalendarStackParamList } from '../navigation/TabNavigator';

type Nav = NativeStackNavigationProp<CalendarStackParamList, 'CalendarDayDetail'>;
type Route = RouteProp<CalendarStackParamList, 'CalendarDayDetail'>;

// ---------- Formatting helpers ----------

function formatDate(dateStr: string): string {
  // Use T12:00:00 to avoid timezone shifting the date
  return new Date(dateStr + 'T12:00:00').toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function formatTime(isoStr: string): string {
  return new Date(isoStr).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  });
}

function formatDuration(seconds: number): string {
  if (seconds >= 3600) {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function formatVolume(volume: number): string {
  return volume.toLocaleString('en-US') + ' lbs';
}

// ---------- Sub-components ----------

interface StatItemProps {
  label: string;
  value: string;
  valueColor?: string;
}

function StatItem({ label, value, valueColor }: StatItemProps) {
  return (
    <View style={styles.statItem}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={[styles.statValue, valueColor ? { color: valueColor } : null]}>
        {value}
      </Text>
    </View>
  );
}

interface SessionCardProps {
  session: CalendarSessionDetail;
  index: number;
}

function SessionCard({ session, index }: SessionCardProps) {
  const cardTitle = session.programDayName ?? 'Workout';
  const startTime = formatTime(session.startedAt);

  return (
    <View style={[styles.card, index > 0 && styles.cardSpacing]}>
      {/* Card header */}
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle}>{cardTitle}</Text>
        <Text style={styles.cardSubtitle}>{startTime}</Text>
      </View>

      {/* Stats row */}
      <View style={styles.statsRow}>
        <StatItem label="Duration" value={formatDuration(session.durationSeconds)} />
        <StatItem label="Sets" value={String(session.totalSets)} />
        <StatItem label="Volume" value={formatVolume(session.totalVolume)} />
        <StatItem label="Exercises" value={String(session.exerciseCount)} />
        {session.prCount > 0 && (
          <StatItem
            label="PRs"
            value={String(session.prCount)}
            valueColor={colors.prGold}
          />
        )}
      </View>

      {/* Exercise breakdown */}
      {session.exercises.map((exercise, exIdx) => (
        <View key={exercise.exerciseId}>
          {exIdx > 0 && <View style={styles.divider} />}
          <Text style={styles.exerciseName}>{exercise.exerciseName}</Text>
          {exercise.sets.map(set => {
            const warmupSuffix = set.isWarmup ? ' (warm-up)' : '';
            const label = `Set ${set.setNumber}: ${set.weightKg} x ${set.reps}${warmupSuffix}`;
            return (
              <Text
                key={set.setNumber}
                style={[styles.setRow, set.isPR ? styles.setRowPR : styles.setRowDefault]}
              >
                {label}
              </Text>
            );
          })}
        </View>
      ))}
    </View>
  );
}

// ---------- Main screen ----------

export function CalendarDayDetailScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const { date } = route.params;

  const [sessions, setSessions] = useState<CalendarSessionDetail[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    getDaySessionDetails(date)
      .then(data => {
        if (!cancelled) {
          setSessions(data);
          setLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) { setLoading(false); }
      });
    return () => { cancelled = true; };
  }, [date]);

  const formattedDate = formatDate(date);

  return (
    <SafeAreaView style={styles.container}>
      {/* Screen header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
        >
          <Text style={styles.backArrow}>{'<'}</Text>
        </TouchableOpacity>
        <Text style={styles.headerDate} numberOfLines={1} adjustsFontSizeToFit>
          {formattedDate}
        </Text>
        {/* Spacer to center the date */}
        <View style={styles.backButton} />
      </View>

      {/* Content */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator color={colors.accent} />
        </View>
      ) : sessions.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No workout data found</Text>
        </View>
      ) : (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {sessions.map((session, idx) => (
            <SessionCard key={session.sessionId} session={session} index={idx} />
          ))}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

// ---------- Styles ----------

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
  },
  backButton: {
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backArrow: {
    fontSize: fontSize.lg,
    color: colors.primary,
    fontWeight: weightBold,
  },
  headerDate: {
    flex: 1,
    fontSize: fontSize.base,
    fontWeight: weightBold,
    color: colors.primary,
    textAlign: 'center',
  },

  // Loading / empty
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: spacing.xxxl,
  },
  emptyText: {
    color: colors.secondary,
    fontSize: fontSize.base,
  },

  // Scroll area
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.md,
    paddingBottom: spacing.xxl,
  },

  // Session card
  card: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.base,
  },
  cardSpacing: {
    marginTop: spacing.md,
  },
  cardHeader: {
    marginBottom: spacing.md,
  },
  cardTitle: {
    fontSize: fontSize.md,
    fontWeight: weightBold,
    color: colors.primary,
  },
  cardSubtitle: {
    fontSize: fontSize.sm,
    color: colors.secondary,
    marginTop: 2,
  },

  // Stats row
  statsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    marginBottom: spacing.base,
    paddingBottom: spacing.base,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  statItem: {
    minWidth: 60,
  },
  statLabel: {
    fontSize: fontSize.xs,
    color: colors.secondary,
    fontWeight: weightSemiBold,
    marginBottom: 2,
  },
  statValue: {
    fontSize: fontSize.sm,
    color: colors.primary,
    fontWeight: weightSemiBold,
  },

  // Exercise breakdown
  exerciseName: {
    fontSize: fontSize.base,
    fontWeight: weightMedium,
    color: colors.primary,
    marginTop: spacing.md,
    marginBottom: spacing.xs,
  },
  setRow: {
    fontSize: fontSize.sm,
    marginBottom: 2,
  },
  setRowDefault: {
    color: colors.secondary,
  },
  setRowPR: {
    color: colors.prGold,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginTop: spacing.md,
  },
});
