import React, { useCallback, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { getSessionSetDetail, getSessionComparison, SessionSetDetail } from '../db/progress';
import { SessionComparison } from '../types';
import { DashboardStackParamList } from '../navigation/TabNavigator';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { fontSize, weightBold, weightSemiBold, weightMedium } from '../theme/typography';

type RouteParams = RouteProp<DashboardStackParamList, 'SessionBreakdown'>;

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${months[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
}

function formatRest(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m > 0 ? `${m}:${String(s).padStart(2, '0')} rest` : `${s}s rest`;
}

function formatDelta(current: number, previous: number, unit: string): { text: string; color: string } {
  const diff = current - previous;
  if (diff === 0) return { text: `same ${unit}`, color: colors.secondary };
  const sign = diff > 0 ? '+' : '\u2212';
  const abs = Math.abs(diff);
  const formatted = unit === 'lbs'
    ? `${sign}${abs % 1 === 0 ? abs : abs.toFixed(1)} ${unit}`
    : `${sign}${abs} ${unit}`;
  return { text: formatted, color: diff > 0 ? colors.accent : colors.secondary };
}

export function SessionBreakdownScreen() {
  const navigation = useNavigation();
  const route = useRoute<RouteParams>();
  const { sessionId, exerciseId, exerciseName, sessionDate } = route.params;

  const [sets, setSets] = useState<SessionSetDetail[]>([]);
  const [comparison, setComparison] = useState<SessionComparison | null>(null);

  useFocusEffect(useCallback(() => {
    let cancelled = false;
    (async () => {
      try {
        const [detail, comp] = await Promise.all([
          getSessionSetDetail(sessionId, exerciseId),
          getSessionComparison(sessionId, exerciseId, 'previous'),
        ]);
        if (!cancelled) {
          setSets(detail);
          setComparison(comp);
        }
      } catch {
        // ignore
      }
    })();
    return () => { cancelled = true; };
  }, [sessionId, exerciseId]));

  const workingSets = sets.filter(s => !s.isWarmup);
  const totalVolume = workingSets.reduce((sum, s) => sum + s.weightLbs * s.reps, 0);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Text style={styles.backArrow}>{'←'}</Text>
        </TouchableOpacity>
        <View style={styles.headerText}>
          <Text style={styles.headerTitle} numberOfLines={1}>{exerciseName}</Text>
          <Text style={styles.headerSubtitle}>{formatDate(sessionDate)}</Text>
        </View>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Volume Summary */}
        <View style={styles.volumeCard}>
          <Text style={styles.volumeLabel}>Session Volume</Text>
          <Text style={styles.volumeValue}>{totalVolume.toLocaleString()}</Text>
          <Text style={styles.volumeUnit}>lbs</Text>
        </View>

        {/* Sets Section */}
        {sets.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Sets</Text>
            {sets.map((set) => (
              <View key={set.setNumber} style={styles.setCard}>
                <View style={styles.setHeader}>
                  <Text style={styles.setNumber}>Set {set.setNumber}</Text>
                  {set.isWarmup && (
                    <View style={styles.warmupBadge}>
                      <Text style={styles.warmupBadgeText}>Warmup</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.setDetails}>
                  {set.weightLbs % 1 === 0 ? set.weightLbs : set.weightLbs.toFixed(1)} lbs
                  {' \u00B7 '}
                  {set.reps} reps
                  {set.restSeconds != null ? ` \u00B7 ${formatRest(set.restSeconds)}` : ''}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* Comparison Panel */}
        {comparison != null && comparison.comparisonSets.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{comparison.comparisonLabel}</Text>
            <Text style={styles.comparisonDate}>{formatDate(comparison.comparisonDate)}</Text>

            <View style={styles.comparisonTable}>
              {/* Column headers */}
              <View style={styles.comparisonHeaderRow}>
                <Text style={[styles.comparisonColHeader, styles.colSet]}>Set</Text>
                <Text style={[styles.comparisonColHeader, styles.colCurrent]}>Current</Text>
                <Text style={[styles.comparisonColHeader, styles.colPrevious]}>Previous</Text>
                <Text style={[styles.comparisonColHeader, styles.colDelta]}>Change</Text>
              </View>

              {comparison.currentSets.map((currentSet, idx) => {
                const prevSet = comparison.comparisonSets[idx];
                if (!prevSet) return null;

                const weightDelta = formatDelta(currentSet.weightLbs, prevSet.weightLbs, 'lbs');
                const repsDelta = formatDelta(currentSet.reps, prevSet.reps, 'reps');

                return (
                  <View key={currentSet.setNumber} style={styles.comparisonRow}>
                    <Text style={[styles.comparisonCell, styles.colSet, styles.comparisonSetLabel]}>
                      {currentSet.setNumber}
                    </Text>
                    <Text style={[styles.comparisonCell, styles.colCurrent]}>
                      {currentSet.weightLbs % 1 === 0 ? currentSet.weightLbs : currentSet.weightLbs.toFixed(1)}
                      {'\u00D7'}{currentSet.reps}
                    </Text>
                    <Text style={[styles.comparisonCell, styles.colPrevious]}>
                      {prevSet.weightLbs % 1 === 0 ? prevSet.weightLbs : prevSet.weightLbs.toFixed(1)}
                      {'\u00D7'}{prevSet.reps}
                    </Text>
                    <View style={[styles.colDelta]}>
                      <Text style={[styles.comparisonDelta, { color: weightDelta.color }]}>
                        {weightDelta.text}
                      </Text>
                      <Text style={[styles.comparisonDelta, { color: repsDelta.color }]}>
                        {repsDelta.text}
                      </Text>
                    </View>
                  </View>
                );
              })}
            </View>
          </View>
        )}
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
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    marginRight: spacing.sm,
    paddingVertical: spacing.xs,
  },
  backArrow: {
    fontSize: fontSize.lg,
    color: colors.primary,
  },
  headerText: {
    flex: 1,
  },
  headerTitle: {
    fontSize: fontSize.md,
    fontWeight: weightBold,
    color: colors.primary,
  },
  headerSubtitle: {
    fontSize: fontSize.sm,
    fontWeight: weightMedium,
    color: colors.secondary,
    marginTop: 2,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.base,
    paddingBottom: spacing.xxxl,
  },
  volumeCard: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: spacing.base,
    marginBottom: spacing.base,
    alignItems: 'center',
  },
  volumeLabel: {
    fontSize: fontSize.sm,
    fontWeight: weightMedium,
    color: colors.secondary,
    marginBottom: spacing.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  volumeValue: {
    fontSize: fontSize.xxl,
    fontWeight: weightBold,
    color: colors.primary,
  },
  volumeUnit: {
    fontSize: fontSize.sm,
    fontWeight: weightMedium,
    color: colors.secondary,
    marginTop: 2,
  },
  section: {
    marginBottom: spacing.base,
  },
  sectionTitle: {
    fontSize: fontSize.sm,
    fontWeight: weightSemiBold,
    color: colors.secondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.sm,
  },
  setCard: {
    backgroundColor: colors.surface,
    borderRadius: 10,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  setHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  setNumber: {
    fontSize: fontSize.base,
    fontWeight: weightSemiBold,
    color: colors.primary,
  },
  warmupBadge: {
    marginLeft: spacing.sm,
    backgroundColor: colors.accentDim,
    borderRadius: 4,
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
  },
  warmupBadgeText: {
    fontSize: fontSize.xs,
    fontWeight: weightSemiBold,
    color: colors.accent,
  },
  setDetails: {
    fontSize: fontSize.sm,
    fontWeight: weightMedium,
    color: colors.secondary,
  },
  comparisonDate: {
    fontSize: fontSize.sm,
    fontWeight: weightMedium,
    color: colors.secondary,
    marginBottom: spacing.sm,
  },
  comparisonTable: {
    backgroundColor: colors.surface,
    borderRadius: 10,
    overflow: 'hidden',
  },
  comparisonHeaderRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  comparisonColHeader: {
    fontSize: fontSize.xs,
    fontWeight: weightSemiBold,
    color: colors.secondary,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  comparisonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  comparisonCell: {
    fontSize: fontSize.sm,
    fontWeight: weightMedium,
    color: colors.primary,
  },
  comparisonSetLabel: {
    color: colors.secondary,
  },
  comparisonDelta: {
    fontSize: fontSize.xs,
    fontWeight: weightSemiBold,
  },
  colSet: {
    width: 32,
  },
  colCurrent: {
    flex: 1,
  },
  colPrevious: {
    flex: 1,
  },
  colDelta: {
    flex: 1,
    alignItems: 'flex-end',
  },
});
