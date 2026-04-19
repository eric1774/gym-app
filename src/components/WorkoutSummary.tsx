import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { fontSize, weightBold, weightSemiBold } from '../theme/typography';

/** Format elapsed seconds as MM:SS (or H:MM:SS for sessions >= 1 hour) */
function formatElapsed(seconds: number): string {
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

export interface WorkoutSummaryProps {
  duration: number;
  totalSets: number;
  totalVolume: number;
  exercisesCompleted: number;
  exercisesTotal: number;
  prCount: number;
  avgHr?: number | null;
  peakHr?: number | null;
  onDismiss: () => void;
}

export function WorkoutSummary({
  duration,
  totalSets,
  totalVolume,
  exercisesCompleted,
  exercisesTotal,
  prCount,
  avgHr,
  peakHr,
  onDismiss,
}: WorkoutSummaryProps) {
  return (
    <SafeAreaView style={summaryStyles.container} edges={['top', 'bottom']}>
      <View style={summaryStyles.card}>
        {/* Heading */}
        <Text style={summaryStyles.heading}>Workout Complete</Text>

        {/* Stats table */}
        <View style={summaryStyles.statsContainer}>
          <View style={summaryStyles.statRow}>
            <Text style={summaryStyles.statLabel}>Duration</Text>
            <Text style={summaryStyles.statValue}>{formatElapsed(duration)}</Text>
          </View>

          <View style={summaryStyles.statRow}>
            <Text style={summaryStyles.statLabel}>Total Sets</Text>
            <Text style={summaryStyles.statValue}>{totalSets}</Text>
          </View>

          <View style={summaryStyles.statRow}>
            <Text style={summaryStyles.statLabel}>Volume</Text>
            <Text style={summaryStyles.statValue}>
              {totalVolume > 0 ? `${totalVolume.toLocaleString()} lbs` : '0 lbs'}
            </Text>
          </View>

          <View style={summaryStyles.statRow}>
            <Text style={summaryStyles.statLabel}>Exercises</Text>
            <Text style={summaryStyles.statValue}>{exercisesCompleted}/{exercisesTotal}</Text>
          </View>

          {prCount > 0 && (
            <View style={summaryStyles.statRow}>
              <Text style={summaryStyles.prLabel}>{'\uD83C\uDFC6'} PRs</Text>
              <Text style={summaryStyles.prValue}>{prCount}</Text>
            </View>
          )}

          {avgHr != null && (
            <View style={summaryStyles.statRow}>
              <Text style={summaryStyles.statLabel}>Avg HR</Text>
              <Text style={summaryStyles.statValue}>{avgHr} bpm</Text>
            </View>
          )}

          {peakHr != null && (
            <View style={summaryStyles.statRow}>
              <Text style={summaryStyles.statLabel}>Peak HR</Text>
              <Text style={summaryStyles.statValue}>{peakHr} bpm</Text>
            </View>
          )}
        </View>

        {/* Done button */}
        <TouchableOpacity
          style={summaryStyles.doneButton}
          onPress={onDismiss}
          activeOpacity={0.85}>
          <Text style={summaryStyles.doneButtonText}>Done</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const summaryStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: spacing.xxl,
    paddingHorizontal: spacing.xl,
    width: '100%',
    maxWidth: 360,
  },
  heading: {
    fontSize: fontSize.xl,
    fontWeight: weightBold,
    color: colors.primary,
    textAlign: 'center',
    marginBottom: spacing.xl,
  },
  statsContainer: {
    marginBottom: spacing.xl,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  statLabel: {
    fontSize: fontSize.base,
    fontWeight: weightSemiBold,
    color: colors.secondary,
  },
  statValue: {
    fontSize: fontSize.base,
    fontWeight: weightBold,
    color: colors.primary,
  },
  prLabel: {
    fontSize: fontSize.base,
    fontWeight: weightSemiBold,
    color: colors.prGold,
  },
  prValue: {
    fontSize: fontSize.base,
    fontWeight: weightBold,
    color: colors.prGold,
  },
  doneButton: {
    backgroundColor: colors.accent,
    borderRadius: 12,
    paddingVertical: spacing.base,
    alignItems: 'center',
    minHeight: 52,
    justifyContent: 'center',
  },
  doneButtonText: {
    fontSize: fontSize.lg,
    fontWeight: weightBold,
    color: colors.onAccent,
  },
});
