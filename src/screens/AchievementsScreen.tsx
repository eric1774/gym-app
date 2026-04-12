import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, SafeAreaView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useGamification } from '../context/GamificationContext';
import { CompositeScoreCard } from '../components/CompositeScoreCard';
import { BadgeGrid } from '../components/BadgeGrid';
import { StreakShieldsCard } from '../components/StreakShieldsCard';
import { BADGE_DEFINITIONS } from '../data/badgeDefinitions';
import type { BadgeCategory } from '../types';
import { colors } from '../theme/colors';
import { fontSize, weightMedium } from '../theme/typography';
import { spacing } from '../theme/spacing';

const FILTERS: Array<{ key: BadgeCategory | 'all'; label: string; count: number }> = [
  { key: 'all', label: 'All', count: BADGE_DEFINITIONS.length },
  { key: 'fitness', label: 'Fitness', count: BADGE_DEFINITIONS.filter(b => b.category === 'fitness').length },
  { key: 'nutrition', label: 'Nutrition', count: BADGE_DEFINITIONS.filter(b => b.category === 'nutrition').length },
  { key: 'consistency', label: 'Consistency', count: BADGE_DEFINITIONS.filter(b => b.category === 'consistency').length },
  { key: 'recovery', label: 'Recovery', count: BADGE_DEFINITIONS.filter(b => b.category === 'recovery').length },
  { key: 'milestone', label: 'Milestone', count: BADGE_DEFINITIONS.filter(b => b.category === 'milestone').length },
];

export function AchievementsScreen() {
  const navigation = useNavigation();
  const { levelState, badgeStates, shieldState } = useGamification();
  const [activeFilter, setActiveFilter] = useState<BadgeCategory | 'all'>('all');

  const earnedCount = Array.from(badgeStates.values()).filter(s => s.currentTier !== null).length;
  const totalCount = BADGE_DEFINITIONS.length;

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        {/* Back button */}
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Text style={styles.backText}>{'\u2039'} Dashboard</Text>
        </TouchableOpacity>

        {/* Level Hero */}
        <View style={styles.hero}>
          <View style={styles.heroCircle}>
            <Text style={styles.heroLevel}>{levelState.level}</Text>
          </View>
          <Text style={styles.heroTitle}>{levelState.title}</Text>
          <Text style={styles.heroSubtitle}>{earnedCount} badges earned · {totalCount} total</Text>
        </View>

        {/* Composite Scores */}
        <CompositeScoreCard levelState={levelState} />

        {/* Filter Pills */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
          {FILTERS.map(f => (
            <TouchableOpacity
              key={f.key}
              style={[styles.pill, activeFilter === f.key && styles.pillActive]}
              onPress={() => setActiveFilter(f.key)}
            >
              <Text style={[styles.pillText, activeFilter === f.key && styles.pillTextActive]}>
                {f.label} ({f.count})
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Badge Grid */}
        <BadgeGrid badgeStates={badgeStates} filter={activeFilter} />

        {/* Streak Shields */}
        <StreakShieldsCard shieldState={shieldState} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: spacing.xxl },
  backButton: { padding: spacing.base },
  backText: { color: colors.accent, fontSize: fontSize.sm, fontWeight: weightMedium },
  hero: { alignItems: 'center', marginBottom: spacing.base },
  heroCircle: {
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: colors.accent,
    alignItems: 'center', justifyContent: 'center',
  },
  heroLevel: { color: colors.background, fontSize: 24, fontWeight: '800' },
  heroTitle: { color: colors.primary, fontSize: 18, fontWeight: '700', marginTop: spacing.sm },
  heroSubtitle: { color: colors.secondary, fontSize: 12, marginTop: 2 },
  filterScroll: { marginHorizontal: spacing.base, marginBottom: spacing.sm },
  pill: {
    backgroundColor: colors.surface, paddingVertical: 5, paddingHorizontal: 12,
    borderRadius: 20, marginRight: 6,
  },
  pillActive: { backgroundColor: colors.accent },
  pillText: { color: colors.secondary, fontSize: 11 },
  pillTextActive: { color: colors.background, fontWeight: '600' },
});
