import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { BadgeIcon } from './BadgeIcon';
import { BadgeDetailModal } from './BadgeDetailModal';
import { BADGE_DEFINITIONS } from '../data/badgeDefinitions';
import type { BadgeDefinition, BadgeState, BadgeCategory } from '../types';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';

interface BadgeGridProps {
  badgeStates: Map<string, BadgeState>;
  filter: BadgeCategory | 'all';
}

export function BadgeGrid({ badgeStates, filter }: BadgeGridProps) {
  const [selectedBadge, setSelectedBadge] = useState<BadgeDefinition | null>(null);

  const filtered = filter === 'all'
    ? BADGE_DEFINITIONS
    : BADGE_DEFINITIONS.filter(b => b.category === filter);

  const selectedState = selectedBadge ? badgeStates.get(selectedBadge.id) ?? null : null;

  return (
    <View style={styles.container}>
      <View style={styles.grid}>
        {filtered.map(badge => {
          const state = badgeStates.get(badge.id);
          const isLocked = !state || state.currentTier === null;

          return (
            <TouchableOpacity
              key={badge.id}
              style={styles.cell}
              onPress={() => setSelectedBadge(badge)}
              activeOpacity={0.7}
            >
              <BadgeIcon
                iconName={badge.iconName}
                tier={state?.currentTier ?? null}
                size={48}
                locked={isLocked}
              />
              <Text style={[styles.name, isLocked && styles.nameLocked]} numberOfLines={1}>
                {isLocked ? '???' : badge.name}
              </Text>
              {!isLocked && state?.nextThreshold !== null && state?.nextThreshold !== undefined && (
                <View style={styles.miniProgress}>
                  <View
                    style={[
                      styles.miniProgressFill,
                      { width: `${Math.min(100, ((state?.currentValue ?? 0) / state.nextThreshold) * 100)}%` },
                    ]}
                  />
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      <BadgeDetailModal
        badge={selectedBadge}
        state={selectedState}
        visible={selectedBadge !== null}
        onClose={() => setSelectedBadge(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginHorizontal: spacing.base },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  cell: { width: '23%', alignItems: 'center', marginBottom: spacing.sm },
  name: { color: colors.secondary, fontSize: 9, marginTop: 4, textAlign: 'center' },
  nameLocked: { color: '#555' },
  miniProgress: { backgroundColor: '#2a2d31', borderRadius: 2, height: 3, marginTop: 2, width: 48, overflow: 'hidden' },
  miniProgressFill: { backgroundColor: colors.accent, height: '100%', borderRadius: 2 },
});
