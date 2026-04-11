import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { TIER_COLORS, TIER_NAMES } from '../types';
import type { BadgeTier } from '../types';
import { colors } from '../theme/colors';

interface BadgeIconProps {
  iconName: string;
  tier: BadgeTier | null;
  size: number;
  locked?: boolean;
  showTierPip?: boolean;
  testID?: string;
}

// Map icon names to emoji (will be replaced with SVG icons in polish pass)
const ICON_MAP: Record<string, string> = {
  flame: '🔥', dumbbell: '🏋️', layers: '🔄', repeat: '🔁', weight: '⚖️',
  trophy: '🏆', 'calendar-check': '📅', clock: '⏱️', 'trending-up': '📈',
  'git-merge': '🔀', sun: '☀️', chest: '💪', back: '🔙', leg: '🦵',
  shoulder: '🤷', arm: '💪', core: '🎯', conditioning: '🏃', zap: '⚡',
  crown: '👑', 'arrow-up': '⬆️', target: '🎯', bookmark: '🔖',
  heart: '❤️', activity: '📊', 'minus-circle': '⭕', 'chevrons-up': '⏫',
  beef: '🥩', 'check-circle': '✅', shield: '🛡️', 'pie-chart': '📊',
  droplet: '💧', calculator: '🔢', award: '🏅', 'trending-up2': '📈',
  sliders: '🎛️', king: '👑', utensils: '🍽️', calendar: '📅',
  edit: '✏️', coffee: '☕', copy: '📋', compass: '🧭', archive: '📦',
  waves: '🌊', 'plus-circle': '➕', 'cloud-rain': '🌧️', sunrise: '🌅',
  'bar-chart': '📊', 'chef-hat': '👨‍🍳', 'book-open': '📖', settings: '⚙️',
  cookie: '🍪', star: '⭐', shuffle: '🔀', globe: '🌍',
  'battery-charging': '🔋', 'check-square': '☑️', clipboard: '📋',
  moon: '🌙', grid: '📊', package: '📦', 'refresh-cw': '🔄',
  'corner-up-right': '↗️', 'life-buoy': '🛟', 'rotate-ccw': '🔄',
  wind: '💨', 'graduation-cap': '🎓', hash: '#️⃣', book: '📚',
  'edit-3': '✏️', search: '🔍',
  lock: '🔒',
};

function getIcon(name: string): string {
  return ICON_MAP[name] ?? '❓';
}

export function BadgeIcon({ iconName, tier, size, locked, showTierPip = true, testID }: BadgeIconProps) {
  const borderColor = locked || tier === null ? '#333' : TIER_COLORS[tier];
  const bgGradientStart = locked || tier === null ? colors.surface : getBgForTier(tier);
  const opacity = locked ? 0.4 : 1;

  return (
    <View
      testID={testID}
      style={[
        styles.container,
        {
          width: size,
          height: size,
          borderColor,
          backgroundColor: bgGradientStart,
          opacity,
        },
      ]}
    >
      <Text style={[styles.icon, { fontSize: size * 0.45 }]}>
        {locked ? getIcon('lock') : getIcon(iconName)}
      </Text>

      {showTierPip && tier !== null && !locked && (
        <View style={[styles.tierPip, { backgroundColor: borderColor }]}>
          <Text style={styles.tierPipText}>
            {TIER_NAMES[tier].charAt(0)}
          </Text>
        </View>
      )}
    </View>
  );
}

function getBgForTier(tier: BadgeTier | null): string {
  switch (tier) {
    case 1: return '#1d1510'; // Bronze
    case 2: return '#1a1d21'; // Silver
    case 3: return '#2a2200'; // Gold
    case 4: return '#1a2030'; // Platinum
    case 5: return '#1a1d25'; // Diamond
    default: return colors.surface;
  }
}

const styles = StyleSheet.create({
  container: {
    borderWidth: 2,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  icon: {
    textAlign: 'center',
  },
  tierPip: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 3,
  },
  tierPipText: {
    color: '#000',
    fontSize: 7,
    fontWeight: '800',
  },
});
