import React, { useCallback, useMemo, useState } from 'react';
import {
  Platform,
  SectionList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { getRecentlyTrainedExercises } from '../db/dashboard';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { fontSize, weightBold, weightSemiBold, weightMedium } from '../theme/typography';
import { DashboardStackParamList } from '../navigation/TabNavigator';
import { ExerciseCategory } from '../types';

type Nav = NativeStackNavigationProp<DashboardStackParamList, 'DashboardHome'>;

interface RecentExercise {
  exerciseId: number;
  exerciseName: string;
  category: string;
  lastTrainedAt: string;
  measurementType: string;
}

interface SubCategorySection {
  groupTitle: string;
  subCategory: string;
  isFirstInGroup: boolean;
  data: RecentExercise[];
}

const CATEGORY_GROUP_ORDER: { title: string; categories: ExerciseCategory[] }[] = [
  { title: 'STRENGTH TRAINING', categories: ['chest', 'back', 'legs', 'shoulders', 'arms'] },
  { title: 'CORE & STABILITY', categories: ['core'] },
  { title: 'CARDIO & CONDITIONING', categories: ['conditioning'] },
];

function groupBySubCategory(exercises: RecentExercise[]): SubCategorySection[] {
  const sections: SubCategorySection[] = [];
  for (const group of CATEGORY_GROUP_ORDER) {
    let isFirst = true;
    for (const cat of group.categories) {
      const data = exercises.filter(ex => ex.category === cat);
      if (data.length > 0) {
        sections.push({
          groupTitle: group.title,
          subCategory: cat.charAt(0).toUpperCase() + cat.slice(1),
          isFirstInGroup: isFirst,
          data,
        });
        isFirst = false;
      }
    }
  }
  return sections;
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

  const sections = useMemo(() => groupBySubCategory(exercises), [exercises]);

  const handlePress = useCallback(
    (item: RecentExercise) => {
      navigation.navigate('ExerciseProgress', {
        exerciseId: item.exerciseId,
        exerciseName: item.exerciseName,
        measurementType: item.measurementType as 'reps' | 'timed',
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

  const renderSectionHeader = useCallback(
    ({ section }: { section: SubCategorySection }) => (
      <View>
        {section.isFirstInGroup && (
          <Text style={styles.groupHeader}>{section.groupTitle}</Text>
        )}
        <Text style={styles.subCategoryHeader}>{section.subCategory}</Text>
      </View>
    ),
    [],
  );

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <Text style={styles.title}>Dashboard</Text>

      {exercises.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>
            No exercises trained yet. Start a workout to see your progress here.
          </Text>
        </View>
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={item => String(item.exerciseId)}
          renderItem={renderItem}
          renderSectionHeader={renderSectionHeader}
          contentContainerStyle={styles.list}
          stickySectionHeadersEnabled={false}
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
  groupHeader: {
    color: colors.secondary,
    fontSize: fontSize.sm,
    fontWeight: weightBold,
    letterSpacing: 1.2,
    marginTop: spacing.xl,
    marginBottom: spacing.xs,
  },
  subCategoryHeader: {
    color: colors.accent,
    fontSize: fontSize.sm,
    fontWeight: weightMedium,
    marginTop: spacing.sm,
    marginBottom: spacing.sm,
    marginLeft: spacing.xs,
  },
  card: {
    backgroundColor: colors.surfaceElevated,
    borderColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderRadius: 14,
    padding: spacing.base,
    marginBottom: spacing.sm,
    minHeight: 48,
    ...Platform.select({
      android: {
        elevation: 8,
      },
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 6,
      },
    }),
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
