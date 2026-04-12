import React from 'react';
import { View, Text, Modal, TouchableOpacity, StyleSheet } from 'react-native';
import { BadgeIcon } from './BadgeIcon';
import { TIER_NAMES, TIER_COLORS } from '../types';
import type { BadgeDefinition, BadgeState, BadgeTier } from '../types';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';

interface BadgeDetailModalProps {
  badge: BadgeDefinition | null;
  state: BadgeState | null;
  visible: boolean;
  onClose: () => void;
}

export function BadgeDetailModal({ badge, state, visible, onClose }: BadgeDetailModalProps) {
  if (!badge || !state) return null;

  const isLocked = state.currentTier === null;

  return (
    <Modal transparent animationType="fade" visible={visible}>
      <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={onClose}>
        <View style={styles.card}>
          <BadgeIcon iconName={badge.iconName} tier={state.currentTier} size={64} locked={isLocked} />
          <Text style={styles.name}>{badge.name}</Text>
          <Text style={styles.description}>{badge.description}</Text>
          <Text style={styles.category}>{badge.category.toUpperCase()}</Text>

          {!isLocked && state.currentTier !== null && (
            <Text style={[styles.tier, { color: TIER_COLORS[state.currentTier] }]}>
              {TIER_NAMES[state.currentTier]}
            </Text>
          )}

          {badge.tierThresholds && (
            <View style={styles.thresholds}>
              {badge.tierThresholds.map((t, i) => {
                const tier = (i + 1) as BadgeTier;
                const reached = state.currentTier !== null && state.currentTier >= tier;
                return (
                  <View key={i} style={styles.thresholdRow}>
                    <Text style={[styles.thresholdTier, { color: reached ? TIER_COLORS[tier] : '#555' }]}>
                      {TIER_NAMES[tier]}
                    </Text>
                    <Text style={[styles.thresholdValue, { color: reached ? '#fff' : '#555' }]}>
                      {t.toLocaleString()}
                    </Text>
                  </View>
                );
              })}
            </View>
          )}

          {state.nextThreshold !== null && (
            <View style={styles.progressSection}>
              <Text style={styles.progressLabel}>
                {Math.round(state.currentValue).toLocaleString()} / {state.nextThreshold.toLocaleString()}
              </Text>
              <View style={styles.progressTrack}>
                <View
                  style={[
                    styles.progressFill,
                    { width: `${Math.min(100, (state.currentValue / state.nextThreshold) * 100)}%` },
                  ]}
                />
              </View>
            </View>
          )}
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    width: '100%',
    maxWidth: 320,
  },
  name: { color: colors.primary, fontSize: 18, fontWeight: '700', marginTop: 12 },
  description: { color: colors.secondary, fontSize: 13, textAlign: 'center', marginTop: 6, lineHeight: 18 },
  category: { color: colors.secondary, fontSize: 10, fontWeight: '700', letterSpacing: 1, marginTop: 8 },
  tier: { fontSize: 12, fontWeight: '700', marginTop: 4 },
  thresholds: { marginTop: 16, width: '100%' },
  thresholdRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  thresholdTier: { fontSize: 12, fontWeight: '600' },
  thresholdValue: { fontSize: 12 },
  progressSection: { marginTop: 16, width: '100%' },
  progressLabel: { color: colors.secondary, fontSize: 11, textAlign: 'center', marginBottom: 6 },
  progressTrack: { backgroundColor: '#2a2d31', borderRadius: 4, height: 6, overflow: 'hidden' },
  progressFill: { backgroundColor: colors.accent, height: '100%', borderRadius: 4 },
});
