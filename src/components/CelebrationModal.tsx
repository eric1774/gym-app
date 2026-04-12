import React, { useEffect, useRef } from 'react';
import {
  View, Text, Modal, TouchableOpacity, StyleSheet, Animated, Platform,
} from 'react-native';
import { BadgeIcon } from './BadgeIcon';
import { TIER_COLORS, TIER_NAMES } from '../types';
import type { CelebrationItem, BadgeTier } from '../types';
import { colors } from '../theme/colors';

interface CelebrationModalProps {
  celebration: CelebrationItem | null;
  onDismiss: () => void;
}

const GLOW_CONFIG: Record<BadgeTier, { color: string; opacity: number; rings: number }> = {
  1: { color: '205,127,50', opacity: 0.15, rings: 3 },
  2: { color: '192,192,192', opacity: 0.15, rings: 3 },
  3: { color: '255,184,0', opacity: 0.2, rings: 3 },
  4: { color: '180,220,255', opacity: 0.18, rings: 4 },
  5: { color: '255,255,255', opacity: 0.15, rings: 5 },
};

export function CelebrationModal({ celebration, onDismiss }: CelebrationModalProps) {
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (celebration) {
      // Reset animations
      scaleAnim.setValue(0);
      glowAnim.setValue(0);
      rotateAnim.setValue(0);

      // Badge scale in with spring
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 6,
        tension: 80,
        useNativeDriver: true,
      }).start();

      // Glow fade in
      Animated.timing(glowAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }).start();

      // Slow rotation loop for shimmer
      Animated.loop(
        Animated.timing(rotateAnim, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        }),
      ).start();

      // Haptic feedback
      try {
        const ReactNativeHapticFeedback = require('react-native-haptic-feedback');
        if (ReactNativeHapticFeedback?.trigger) {
          ReactNativeHapticFeedback.trigger('notificationSuccess');
        }
      } catch {
        // Haptics not available
      }
    }
  }, [celebration]);

  if (!celebration) return null;

  const { badge, newTier } = celebration;
  const glow = GLOW_CONFIG[newTier];
  const tierColor = TIER_COLORS[newTier];
  const tierName = TIER_NAMES[newTier];

  return (
    <Modal transparent animationType="fade" visible>
      <View style={styles.overlay}>
        {/* Radial glow background */}
        <Animated.View
          style={[
            styles.glowContainer,
            { opacity: glowAnim },
          ]}
        >
          {Array.from({ length: glow.rings }, (_, i) => (
            <View
              key={i}
              style={[
                styles.glowRing,
                {
                  width: 120 + (i * 40),
                  height: 120 + (i * 40),
                  borderColor: `rgba(${glow.color},${glow.opacity - i * 0.03})`,
                },
              ]}
            />
          ))}
        </Animated.View>

        {/* Content */}
        <Text style={styles.earnedLabel}>BADGE EARNED</Text>

        <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
          <View style={[styles.badgeContainer, { shadowColor: tierColor }]}>
            <BadgeIcon iconName={badge.iconName} tier={newTier} size={80} showTierPip={false} />
          </View>
        </Animated.View>

        <Text style={[styles.tierLabel, { color: tierColor }]}>{tierName.toUpperCase()}</Text>
        <Text style={styles.badgeName}>{badge.name}</Text>
        <Text style={styles.description}>{badge.description}</Text>

        <TouchableOpacity style={styles.dismissButton} onPress={onDismiss} activeOpacity={0.7}>
          <Text style={styles.dismissText}>Dismiss</Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  glowContainer: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  glowRing: {
    position: 'absolute',
    borderRadius: 999,
    borderWidth: 1,
  },
  earnedLabel: {
    color: colors.secondary,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.5,
    marginBottom: 16,
  },
  badgeContainer: {
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 30,
    elevation: 10,
  },
  tierLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
    marginTop: 16,
  },
  badgeName: {
    color: colors.primary,
    fontSize: 20,
    fontWeight: '700',
    marginTop: 4,
  },
  description: {
    color: colors.secondary,
    fontSize: 13,
    marginTop: 6,
    textAlign: 'center',
    lineHeight: 18,
  },
  dismissButton: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 40,
    marginTop: 24,
  },
  dismissText: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: '600',
  },
});
