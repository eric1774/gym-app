import React, { useCallback, useState } from 'react';
import {
  FlatList,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useFocusEffect } from '@react-navigation/native';
import { getRecentlyTrainedExercises } from '../db/dashboard';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { fontSize, weightBold, weightSemiBold } from '../theme/typography';

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
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 60) return diffMins + 'm ago';
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return diffHours + 'h ago';
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return diffDays + 'd ago';
  const diffWeeks = Math.floor(diffDays / 7);
  return diffWeeks + 'w ago';
}

export function DashboardScreen() {
  const navigation = useNavigation();
  const [exercises, setExercises] = useState<RecentExercise[]>([]);

  useFocusEffect(
    useCallback(() => {
      getRecentlyTrainedExercises().then(setExercises).catch(() => {});
    }, []),
  );

  const handlePress = useCallback(
    (item: RecentExercise) => {
      (navigation as any).navigate('ExerciseProgress', {
        exerciseId: item.exerciseId,
        exerciseName: item.exerciseName,
      });
    },
    [navigation],
  );

  const handleSettingsPress = useCallback(() => {
    (navigation as any).navigate('Settings');
  }, [navigation]);

  const renderItem = useCallback(
    ({ item }: { item: RecentExercise }) => (
      <TouchableOpacity
        style={styles.card}
        onPress={() => handlePress(item)}
        activeOpacity={0.7}>
        <View style={styles.cardContent}>
          <Text style={styles.exerciseName}>{item.exerciseName}</Text>
          <Text style={styles.category}>{item.category}</Text>
        </View>
        <Text style={styles.lastTrained}>{formatRelativeTime(item.lastTrainedAt)}</Text>
      </TouchableOpacity>
    ),
    [handlePress],
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Dashboard</Text>
        <TouchableOpacity
          onPress={handleSettingsPress}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Text style={styles.settingsIcon}>{String.fromCodePoint(0x2699)}</Text>
        </TouchableOpacity>
      </View>
      {exercises.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>
            No exercises trained yet. Start a workout to see your progress here.
          </Text>
        </View>
      ) : (
        <FlatList
          data={exercises}
          renderItem={renderItem}
          keyExtractor={(item) => String(item.exerciseId)}
          contentContainerStyle={styles.list}
        />
      )}
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
    justifyContent: 'space-between',
    paddingHorizontal: spacing.base,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
  },
  headerTitle: {
    fontSize: fontSize.xl,
    fontWeight: weightBold,
    color: colors.primary,
  },
  settingsIcon: {
    fontSize: fontSize.xl,
    color: colors.secondary,
  },
  list: {
    paddingHorizontal: spacing.base,
    paddingBottom: spacing.xl,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: spacing.base,
    marginBottom: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardContent: {
    flex: 1,
  },
  exerciseName: {
    fontSize: fontSize.md,
    fontWeight: weightSemiBold,
    color: colors.primary,
  },
  category: {
    fontSize: fontSize.sm,
    color: colors.secondary,
    marginTop: 2,
  },
  lastTrained: {
    fontSize: fontSize.sm,
    color: colors.secondary,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  emptyText: {
    fontSize: fontSize.base,
    color: colors.secondary,
    textAlign: 'center',
  },
});
