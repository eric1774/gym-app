import React, { useState, useCallback } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { getMuscleGroupProgress } from '../db/progress';
import { MuscleGroupProgress } from '../types';
import { DashboardStackParamList } from '../navigation/TabNavigator';
import { colors, getCategoryColor } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { fontSize, weightBold, weightSemiBold } from '../theme/typography';
import { formatRelativeTime } from '../utils/formatRelativeTime';

type Nav = NativeStackNavigationProp<DashboardStackParamList, 'ProgressHub'>;

const CATEGORY_EMOJI: Record<string, string> = {
  chest: '\uD83E\uDEC1',     // 🫁
  back: '\uD83E\uDDBB',      // 🦻 (closest to back/spine)
  legs: '\uD83E\uDDB5',      // 🦵
  shoulders: '\uD83C\uDFCB\uFE0F', // 🏋️
  arms: '\uD83D\uDCAA',      // 💪
  core: '\uD83E\uDEBB',      // 🪻 (abs)
  conditioning: '\u2764\uFE0F', // ❤️
};

function formatVolumeChange(
  volumeChangePercent: number | null,
): { text: string; color: string } {
  if (volumeChangePercent === null) {
    return { text: '\u2014', color: colors.secondary };
  }
  const rounded = Math.round(volumeChangePercent);
  if (rounded >= 0) {
    return { text: `+${rounded}%`, color: colors.accent };
  }
  return { text: `\u2212${Math.abs(rounded)}%`, color: colors.secondary };
}

interface MuscleCardProps {
  group: MuscleGroupProgress;
  onPress: () => void;
}

function MuscleCard({ group, onPress }: MuscleCardProps) {
  const accentColor = getCategoryColor(group.category);
  const title =
    group.category.charAt(0).toUpperCase() + group.category.slice(1);
  const emoji = CATEGORY_EMOJI[group.category] ?? '\uD83D\uDCAA';
  const volumeChange = formatVolumeChange(group.volumeChangePercent);
  const lastTrained = group.lastTrainedAt
    ? formatRelativeTime(group.lastTrainedAt)
    : '\u2014';

  return (
    <TouchableOpacity
      testID={`muscle-group-${group.category}`}
      style={[styles.card, { borderColor: accentColor + '30' }]}
      activeOpacity={0.7}
      onPress={onPress}>
      <Text style={styles.cardEmoji}>{emoji}</Text>
      <Text style={[styles.cardCategory, { color: accentColor }]}>
        {title}
      </Text>
      {group.hasPR ? (
        <Text style={styles.prFlag}>PR!</Text>
      ) : (
        <Text style={[styles.volumeChange, { color: volumeChange.color }]}>
          {volumeChange.text}
        </Text>
      )}
      <Text style={styles.lastTrained}>{lastTrained}</Text>
    </TouchableOpacity>
  );
}

export function ProgressHubScreen() {
  const navigation = useNavigation<Nav>();
  const [groups, setGroups] = useState<MuscleGroupProgress[]>([]);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      (async () => {
        try {
          const data = await getMuscleGroupProgress();
          if (!cancelled) setGroups(data);
        } catch { /* ignore */ }
      })();
      return () => { cancelled = true; };
    }, []),
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
        <Text style={styles.headerTitle}>Progress</Text>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}>
        {groups.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>
              Start training to see your progress here.
            </Text>
          </View>
        ) : (
          <View style={styles.grid}>
            {groups.map(group => (
              <MuscleCard
                key={group.category}
                group={group}
                onPress={() =>
                  navigation.navigate('CategoryProgress', {
                    category: group.category,
                  })
                }
              />
            ))}
          </View>
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: spacing.xxxl,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    paddingHorizontal: spacing.base,
  },
  card: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: 14,
    borderWidth: 1,
    width: '48%',
    alignItems: 'center',
    padding: spacing.base,
  },
  cardEmoji: {
    fontSize: fontSize.xxl,
    marginBottom: spacing.xs,
  },
  cardCategory: {
    fontSize: fontSize.base,
    fontWeight: weightSemiBold,
    marginBottom: spacing.xs,
  },
  prFlag: {
    color: colors.prGold,
    fontSize: fontSize.sm,
    fontWeight: weightBold,
    marginBottom: spacing.xs,
  },
  volumeChange: {
    fontSize: fontSize.sm,
    fontWeight: weightSemiBold,
    marginBottom: spacing.xs,
  },
  lastTrained: {
    color: colors.secondary,
    fontSize: fontSize.xs,
  },
  emptyContainer: {
    paddingVertical: spacing.xxxl,
    paddingHorizontal: spacing.base,
    alignItems: 'center',
  },
  emptyText: {
    color: colors.secondary,
    fontSize: fontSize.base,
    textAlign: 'center',
  },
});
