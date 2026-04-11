import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { BadgeIcon } from './BadgeIcon';
import { getBadgeDefinition } from '../data/badgeDefinitions';
import { colors } from '../theme/colors';
import { fontSize, weightSemiBold, weightMedium } from '../theme/typography';
import { spacing } from '../theme/spacing';
import type { UserBadgeRow, BadgeTier } from '../types';

interface RecentBadgesProps {
  badges: UserBadgeRow[];
}

export function RecentBadges({ badges }: RecentBadgesProps) {
  const navigation = useNavigation<any>();

  if (badges.length === 0) return null;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Recent Badges</Text>
        <TouchableOpacity onPress={() => navigation.navigate('Achievements')}>
          <Text style={styles.viewAll}>View All ›</Text>
        </TouchableOpacity>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.scroll}>
        {badges.slice(0, 10).map((badge) => {
          const def = getBadgeDefinition(badge.badge_id);
          if (!def) return null;
          return (
            <View key={badge.id} style={styles.badgeItem}>
              <BadgeIcon
                iconName={def.iconName}
                tier={badge.tier as BadgeTier}
                size={52}
                showTierPip
              />
              <Text style={styles.badgeName} numberOfLines={1}>
                {def.name}
              </Text>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: spacing.base,
    marginBottom: spacing.md,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  headerTitle: {
    color: colors.primary,
    fontSize: fontSize.sm + 1,
    fontWeight: weightSemiBold,
  },
  viewAll: {
    color: colors.accent,
    fontSize: fontSize.xs + 1,
    fontWeight: weightMedium,
  },
  scroll: {
    flexDirection: 'row',
  },
  badgeItem: {
    alignItems: 'center',
    marginRight: 10,
    width: 68,
  },
  badgeName: {
    color: colors.secondary,
    fontSize: 10,
    marginTop: 5,
    textAlign: 'center',
    lineHeight: 12,
  },
});
