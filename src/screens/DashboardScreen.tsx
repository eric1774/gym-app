import React, { useCallback, useState } from 'react';
import {
  FlatList,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { getRecentlyTrainedExercises } from '../db/dashboard';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { fontSize, weightBold, weightSemiBold } from '../theme/typography';
import { DashboardStackParamList } from '../navigation/TabNavigator';

type Nav = NativeStackNavigationProp<DashboardStackParamList, 'DashboardHome'>;

interface RecentExercise {
  exerciseId: number;
  exerciseName: string;
  category: string;
  lastTrainedAt: string;
}

function formatRelativeTime(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) { return 'just now'; }
  if (diffMin < 60) { return diffMin + 'm ago'; }
  const diffHrs = Math.floor(diffMin / 60);
  if (diffHrs < 24) { return diffHrs + 'h ago'; }
  const diffDays = Math.floor(diffHrs / 24);
  if (diffDays < 7) { return diffDays + 'd ago'; }
  const diffWeeks = Math.floor(diffDays / 7);
  if (diffWeeks < 5) { return diffWeeks + 'w ago'; }
  const diffMonths = Math.floor(diffDays / 30);
  return diffMonths + 'mo ago';
}

export function DashboardScreen() {
  const navigation = useNavigation<Nav>();
  const [exercises, setExercises] = useState<RecentExercise[]>([]);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      (async () => {
        try {
          const result = await getRecentlyTrainedExercises();
          if (!cancelled) { setExercises(result); }
        } catch {
          // ignore
        }
      })();
      return () => { cancelled = true; };
    }, []),
  );

  const handlePress = useCallback(
    (item: RecentExercise) => {
      navigation.navigate('ExerciseProgress', {
        exerciseId: item.exerciseId,
        exerciseName: item.exerciseName,
      });
    },
    [navigation],
  );

  const renderItem = useCallback(
    ({ item }: { item: RecentExercise }) => (
      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.7}
        onPress={() => handlePress(item)}>
        <View style={styles.cardRow}>
          <Text style={styles.exerciseName}>{item.exerciseName}</Text>
          <Text style={styles.timeAgo}>{formatRelativeTime(item.lastTrainedAt)}</Text>
        </View>
        <Text style={styles.category}>{item.category}</Text>
      </TouchableOpacity>
    ),
    [handlePress],
  );

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Dashboard</Text>

      {exercises.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>
            No exercises trained yet. Start a workout to see your progress here.
          </Text>
        </View>
      ) : (
        <FlatList
          data={exercises}
          keyExtractor={item => String(item.exerciseId)}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  title: {
    color: colors.primary,
    fontSize: fontSize.xl,
    fontWeight: weightBold,
    paddingHorizontal: spacing.base,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
  },
  list: {
    paddingHorizontal: spacing.base,
    paddingBottom: spacing.xxl,
  },
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 10,
    padding: spacing.base,
    marginBottom: spacing.sm,
  },
  cardRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  exerciseName: {
    color: colors.primary,
    fontSize: fontSize.base,
    fontWeight: weightSemiBold,
    flex: 1,
  },
  timeAgo: {
    color: colors.secondary,
    fontSize: fontSize.sm,
    marginLeft: spacing.sm,
  },
  category: {
    color: colors.secondary,
    fontSize: fontSize.sm,
    textTransform: 'capitalize',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xxl,
  },
  emptyText: {
    color: colors.secondary,
    fontSize: fontSize.base,
    textAlign: 'center',
    lineHeight: 22,
  },
});
