import React, { useState, useCallback } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
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

const ICON_SIZE = 32;

/** Chest — front torso with pec outline */
function ChestIcon({ color }: { color: string }) {
  return (
    <Svg width={ICON_SIZE} height={ICON_SIZE} viewBox="0 0 24 24" fill="none">
      <Path d="M12 2C9 2 5 4 4 7c-1 3-.5 6 1 8l2 2.5V21h10v-3.5L19 15c1.5-2 2-5 1-8-1-3-5-5-8-5Z" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M8 8c1.5 1.5 2.5 3 4 3s2.5-1.5 4-3" stroke={color} strokeWidth={1.5} strokeLinecap="round" />
      <Path d="M12 11v4" stroke={color} strokeWidth={1.5} strokeLinecap="round" />
    </Svg>
  );
}

/** Back — rear torso with lat/spine outline */
function BackIcon({ color }: { color: string }) {
  return (
    <Svg width={ICON_SIZE} height={ICON_SIZE} viewBox="0 0 24 24" fill="none">
      <Path d="M12 2C9 2 5 4 4 7c-1 3-.5 6 1 8l2 2.5V21h10v-3.5L19 15c1.5-2 2-5 1-8-1-3-5-5-8-5Z" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M12 5v14" stroke={color} strokeWidth={1.5} strokeLinecap="round" />
      <Path d="M9 7l3 2 3-2" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M8 12l4 1.5 4-1.5" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

/** Core — abs grid */
function CoreIcon({ color }: { color: string }) {
  return (
    <Svg width={ICON_SIZE} height={ICON_SIZE} viewBox="0 0 24 24" fill="none">
      <Path d="M8 3h8c1.5 0 3 2 3 5v8c0 3-1.5 5-3 5H8c-1.5 0-3-2-3-5V8c0-3 1.5-5 3-5Z" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M12 5v14" stroke={color} strokeWidth={1.5} strokeLinecap="round" />
      <Path d="M7 8.5h10M7 12h10M7 15.5h10" stroke={color} strokeWidth={1.2} strokeLinecap="round" />
    </Svg>
  );
}

/** Legs — thigh and calf with knee bend */
function LegsIcon({ color }: { color: string }) {
  return (
    <Svg width={ICON_SIZE} height={ICON_SIZE} viewBox="0 0 24 24" fill="none">
      <Path d="M9 2c-.5 0-1.5.5-2 2L5.5 10c-.3 1 0 2 .5 2.5l1 1L6 18c-.3 1.2 0 2.5.8 3h2.4c.5 0 .8-.5.8-1v-2l1-4-1-3 1.5-5.5c.2-.8.3-1.5 0-2C11.2 2.5 10 2 9 2Z" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M15 2c.5 0 1.5.5 2 2l1.5 6c.3 1 0 2-.5 2.5l-1 1L18 18c.3 1.2 0 2.5-.8 3h-2.4c-.5 0-.8-.5-.8-1v-2l-1-4 1-3-1.5-5.5c-.2-.8-.3-1.5 0-2C12.8 2.5 14 2 15 2Z" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

/** Shoulders — deltoid cap outline */
function ShouldersIcon({ color }: { color: string }) {
  return (
    <Svg width={ICON_SIZE} height={ICON_SIZE} viewBox="0 0 24 24" fill="none">
      <Path d="M12 4a2 2 0 1 0 0 4 2 2 0 0 0 0-4Z" stroke={color} strokeWidth={1.5} />
      <Path d="M7 10c-2 .5-3.5 2-4 4s0 4 1 5h4v-5" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M17 10c2 .5 3.5 2 4 4s0 4-1 5h-4v-5" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M8 10h8" stroke={color} strokeWidth={1.5} strokeLinecap="round" />
      <Path d="M9 10v9h6v-9" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

/** Arms — flexed bicep */
function ArmsIcon({ color }: { color: string }) {
  return (
    <Svg width={ICON_SIZE} height={ICON_SIZE} viewBox="0 0 24 24" fill="none">
      <Path d="M6 18l1-5c.5-2 1.5-3 3-3h1l2-4c.5-1 1.5-2 3-2s2 .5 2 1.5c0 .5-.5 1.5-1 2.5L15 12" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M15 12c1 0 2 .5 2.5 1.5S18 16 17.5 17c-.5 1.5-2 2-3.5 2H9c-1.5 0-2.5-.5-3-1.5" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M13 7c1 .5 2 1.5 2 3" stroke={color} strokeWidth={1.5} strokeLinecap="round" />
    </Svg>
  );
}

/** Conditioning — heart with pulse line */
function ConditioningIcon({ color }: { color: string }) {
  return (
    <Svg width={ICON_SIZE} height={ICON_SIZE} viewBox="0 0 24 24" fill="none">
      <Path d="M12 21s-7-5-9-9c-1.5-3-.5-7 3-8 2-.5 4 .5 5 2h2c1-1.5 3-2.5 5-2 3.5 1 4.5 5 3 8-2 4-9 9-9 9Z" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M5 12h4l1.5-3 3 6 1.5-3H19" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

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

function CategoryIcon({ category, color }: { category: string; color: string }) {
  switch (category) {
    case 'chest': return <ChestIcon color={color} />;
    case 'back': return <BackIcon color={color} />;
    case 'core': return <CoreIcon color={color} />;
    case 'legs': return <LegsIcon color={color} />;
    case 'shoulders': return <ShouldersIcon color={color} />;
    case 'arms': return <ArmsIcon color={color} />;
    case 'conditioning': return <ConditioningIcon color={color} />;
    default: return <ArmsIcon color={color} />;
  }
}

function MuscleCard({ group, onPress }: MuscleCardProps) {
  const accentColor = getCategoryColor(group.category);
  const title =
    group.category.charAt(0).toUpperCase() + group.category.slice(1);
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
      <View style={styles.iconContainer}>
        <CategoryIcon category={group.category} color={accentColor} />
      </View>
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
  iconContainer: {
    marginBottom: spacing.xs,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardEmoji: {
    fontSize: fontSize.xxl,
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
