import React from 'react';
import {
  View, Text, Modal, TouchableOpacity, ScrollView, StyleSheet,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { BadgeIcon } from './BadgeIcon';
import { TIER_COLORS, TIER_NAMES } from '../types';
import type { BadgeDefinition, BadgeTier } from '../types';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';

interface HighlightReelModalProps {
  badges: Array<{ badge: BadgeDefinition; tier: BadgeTier }>;
  onDismiss: () => void;
}

export function HighlightReelModal({ badges, onDismiss }: HighlightReelModalProps) {
  const navigation = useNavigation<any>();

  if (badges.length === 0) return null;

  const sorted = [...badges].sort((a, b) => b.tier - a.tier);
  const top5 = sorted.slice(0, 5);
  const remaining = badges.length - top5.length;

  return (
    <Modal transparent animationType="fade" visible>
      <View style={styles.overlay}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <Text style={styles.header}>Welcome to Achievements!</Text>

          {/* Subtitle */}
          <Text style={styles.subtitle}>
            Based on your training history, you've already earned:
          </Text>

          {/* Total count pill */}
          <View style={styles.countPill}>
            <Text style={styles.countPillText}>
              {badges.length} badge{badges.length !== 1 ? 's' : ''} earned
            </Text>
          </View>

          {/* Top 5 showcase */}
          <View style={styles.showcaseContainer}>
            {top5.map((item, index) => (
              <View key={item.badge.id}>
                <View style={styles.showcaseRow}>
                  <BadgeIcon
                    iconName={item.badge.iconName}
                    tier={item.tier}
                    size={56}
                    showTierPip
                  />
                  <View style={styles.showcaseInfo}>
                    <Text style={styles.badgeName}>{item.badge.name}</Text>
                    <Text style={[styles.tierLabel, { color: TIER_COLORS[item.tier] }]}>
                      {TIER_NAMES[item.tier]}
                    </Text>
                    <Text style={styles.badgeDescription}>{item.badge.description}</Text>
                  </View>
                </View>
                {index < top5.length - 1 && <View style={styles.divider} />}
              </View>
            ))}
          </View>

          {/* "And X more" text */}
          {remaining > 0 && (
            <Text style={styles.moreText}>
              ...and {remaining} more badge{remaining !== 1 ? 's' : ''}
            </Text>
          )}

          {/* View All button */}
          <TouchableOpacity
            style={styles.viewAllButton}
            activeOpacity={0.7}
            onPress={() => {
              navigation.navigate('Achievements');
              onDismiss();
            }}
          >
            <Text style={styles.viewAllText}>View All</Text>
          </TouchableOpacity>

          {/* Dismiss button */}
          <TouchableOpacity
            style={styles.dismissButton}
            activeOpacity={0.7}
            onPress={onDismiss}
          >
            <Text style={styles.dismissText}>Dismiss</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    flexGrow: 1,
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xxxl,
    paddingBottom: spacing.xxl,
  },
  header: {
    color: colors.primary,
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  subtitle: {
    color: colors.secondary,
    fontSize: 13,
    textAlign: 'center',
    marginBottom: spacing.lg,
    lineHeight: 18,
  },
  countPill: {
    backgroundColor: colors.accent,
    borderRadius: 20,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.xs + 2,
    marginBottom: spacing.xl,
  },
  countPillText: {
    color: colors.onAccent,
    fontSize: 13,
    fontWeight: '700',
  },
  showcaseContainer: {
    width: '100%',
    marginBottom: spacing.base,
  },
  showcaseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  showcaseInfo: {
    flex: 1,
    marginLeft: spacing.md,
  },
  badgeName: {
    color: colors.primary,
    fontSize: 15,
    fontWeight: '700',
  },
  tierLabel: {
    fontSize: 12,
    marginTop: 2,
  },
  badgeDescription: {
    color: colors.secondary,
    fontSize: 12,
    marginTop: 2,
    lineHeight: 16,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  moreText: {
    color: colors.secondary,
    fontSize: 13,
    textAlign: 'center',
    marginBottom: spacing.lg,
    textDecorationLine: 'underline',
  },
  viewAllButton: {
    backgroundColor: colors.accent,
    borderRadius: 12,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xxl,
    marginBottom: spacing.md,
    width: '100%',
    alignItems: 'center',
  },
  viewAllText: {
    color: colors.onAccent,
    fontSize: 14,
    fontWeight: '600',
  },
  dismissButton: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xxl,
    width: '100%',
    alignItems: 'center',
  },
  dismissText: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: '600',
  },
});
