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
import { getSessionDayExerciseProgress } from '../db/progress';
import { SessionDayExerciseProgress } from '../types';
import { DashboardStackParamList } from '../navigation/TabNavigator';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { fontSize, weightBold, weightSemiBold, weightMedium } from '../theme/typography';

type ScreenRouteProp = RouteProp<DashboardStackParamList, 'SessionDayProgress'>;
type ScreenNavProp = NativeStackNavigationProp<DashboardStackParamList, 'SessionDayProgress'>;

function formatDelta(value: number | null): { text: string; color: string } {
  if (value === null) {
    return { text: '\u2014', color: colors.secondary };
  }
  const rounded = Math.round(value);
  if (rounded >= 0) {
    return { text: `+${rounded}%`, color: colors.accent };
  }
  return { text: `\u2212${Math.abs(rounded)}%`, color: colors.danger };
}

interface ExerciseRowProps {
  exercise: SessionDayExerciseProgress;
}

function ExerciseRow({ exercise }: ExerciseRowProps) {
  const vol = formatDelta(exercise.volumeChangePercent);
  const str = formatDelta(exercise.strengthChangePercent);

  return (
    <View style={styles.exerciseRow}>
      <Text style={styles.exerciseName} numberOfLines={1}>
        {exercise.exerciseName}
      </Text>
      <View style={styles.deltaRow}>
        <View style={styles.deltaItem}>
          <Text style={styles.deltaLabel}>Vol</Text>
          <View style={[styles.deltaBadge, { backgroundColor: vol.color + '1A' }]}>
            <Text style={[styles.deltaValue, { color: vol.color }]}>{vol.text}</Text>
          </View>
        </View>
        <View style={styles.deltaItem}>
          <Text style={styles.deltaLabel}>Str</Text>
          <View style={[styles.deltaBadge, { backgroundColor: str.color + '1A' }]}>
            <Text style={[styles.deltaValue, { color: str.color }]}>{str.text}</Text>
          </View>
        </View>
      </View>
    </View>
  );
}

export function SessionDayProgressScreen() {
  const navigation = useNavigation<ScreenNavProp>();
  const route = useRoute<ScreenRouteProp>();
  const { programDayId, dayName } = route.params;
  const [exercises, setExercises] = useState<SessionDayExerciseProgress[]>([]);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      (async () => {
        try {
          const data = await getSessionDayExerciseProgress(programDayId);
          if (!cancelled) setExercises(data);
        } catch (err) {
          console.warn('SessionDayProgress data fetch failed:', err);
        }
      })();
      return () => { cancelled = true; };
    }, [programDayId]),
  );

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
        <Text style={styles.headerTitle} numberOfLines={1}>{dayName}</Text>
        <Text style={styles.exerciseCount}>
          {exercises.length} {exercises.length === 1 ? 'exercise' : 'exercises'}
        </Text>
      </View>

      <Text style={styles.subtitle}>vs previous session</Text>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {exercises.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No exercise data yet.</Text>
          </View>
        ) : (
          exercises.map(exercise => (
            <ExerciseRow key={exercise.exerciseId} exercise={exercise} />
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
    paddingBottom: spacing.sm,
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
    flex: 1,
  },
  exerciseCount: {
    color: colors.secondary,
    fontSize: fontSize.sm,
    fontWeight: weightMedium,
  },
  subtitle: {
    color: colors.secondary,
    fontSize: fontSize.xs,
    paddingHorizontal: spacing.base,
    marginBottom: spacing.base,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.base,
    paddingBottom: spacing.xxxl,
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
  },
  exerciseName: {
    color: colors.primary,
    fontSize: fontSize.base,
    fontWeight: weightSemiBold,
    marginBottom: spacing.sm,
  },
  deltaRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  deltaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  deltaLabel: {
    color: colors.secondary,
    fontSize: fontSize.xs,
  },
  deltaBadge: {
    borderRadius: 8,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  deltaValue: {
    fontSize: fontSize.sm,
    fontWeight: weightSemiBold,
  },
});
