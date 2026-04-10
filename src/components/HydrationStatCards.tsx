import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { fontSize, weightBold, weightMedium } from '../theme/typography';

interface HydrationStatCardsProps {
  streakDays: number;
}

export const HydrationStatCards = React.memo(function HydrationStatCards({
  streakDays,
}: HydrationStatCardsProps) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionHeader}>TODAY&apos;S STATS</Text>
      <View style={styles.container}>
        {/* Streak card */}
        <View style={styles.card}>
          <View style={styles.iconCircle}>
            <Text style={styles.iconText}>{'\u26A1'}</Text>
          </View>
          <View style={styles.cardContent}>
            <Text style={styles.cardLabel}>Current Streak</Text>
            <Text style={styles.cardValue}>
              {streakDays} {streakDays === 1 ? 'Day' : 'Days'}
            </Text>
          </View>
          <Text style={styles.chevron}>{'\u203A'}</Text>
        </View>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  section: {
    paddingHorizontal: spacing.base,
    marginTop: spacing.xl,
  },
  sectionHeader: {
    fontSize: fontSize.sm,
    fontWeight: weightBold,
    color: colors.secondary,
    letterSpacing: 1.2,
    marginBottom: spacing.sm,
  },
  container: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.base,
    paddingHorizontal: spacing.base,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.accentDim,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  iconText: {
    fontSize: fontSize.base,
    color: colors.accent,
  },
  cardContent: {
    flex: 1,
  },
  cardLabel: {
    fontSize: fontSize.sm,
    fontWeight: weightMedium,
    color: colors.secondary,
  },
  cardValue: {
    fontSize: fontSize.md,
    fontWeight: weightBold,
    color: colors.primary,
    marginTop: 2,
  },
  chevron: {
    fontSize: fontSize.xl,
    color: colors.secondary,
    marginLeft: spacing.sm,
  },
});
