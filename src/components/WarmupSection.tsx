import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { fontSize } from '../theme/typography';
import { WarmupSessionItem } from '../types';
import { WarmupItemRow } from './WarmupItemRow';
import { Flame, Check, Chevron } from './icons';

interface WarmupSectionProps {
  items: WarmupSessionItem[];
  state: 'expanded' | 'collapsed' | 'dismissed' | 'none';
  onToggleItem: (itemId: number) => void;
  onCollapse: () => void;
  onExpand: () => void;
  onDismiss: () => void;
  onSkipAll: () => void;
}

export function WarmupSection({
  items,
  state,
  onToggleItem,
  onCollapse,
  onExpand,
  onDismiss,
  onSkipAll,
}: WarmupSectionProps) {
  if (state === 'none' || state === 'dismissed' || items.length === 0) {
    return null;
  }

  const completedCount = items.filter(i => i.isComplete).length;
  const totalCount = items.length;
  const complete = completedCount === totalCount && totalCount > 0;
  const progressPercent = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

  const accentColor = complete ? colors.accent : colors.warmupAmber;
  const containerBg = complete
    ? 'rgba(141,194,138,0.04)'
    : 'rgba(240,184,48,0.06)';
  const containerBorder = complete
    ? 'rgba(141,194,138,0.25)'
    : 'rgba(240,184,48,0.25)';
  const iconBg = complete
    ? 'rgba(141,194,138,0.15)'
    : 'rgba(240,184,48,0.15)';

  const headerOnPress = state === 'expanded' ? onCollapse : onExpand;

  return (
    <View
      style={[styles.container, { backgroundColor: containerBg, borderColor: containerBorder }]}
    >
      <TouchableOpacity
        style={styles.header}
        onPress={headerOnPress}
        activeOpacity={0.7}>
        <View style={[styles.iconBox, { backgroundColor: iconBg }]}>
          {complete ? <Check size={18} color={colors.accent} /> : <Flame size={20} color={colors.warmupAmber} />}
        </View>
        <View style={styles.textColumn}>
          <Text style={[styles.eyebrow, { color: accentColor }]}>
            {complete ? 'WARM-UP COMPLETE' : 'WARM-UP'}
          </Text>
          <Text style={styles.title}>
            {complete ? 'Ready to lift' : 'Prime the body first'}
          </Text>
          <View style={styles.progressRow}>
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${progressPercent}%`, backgroundColor: accentColor }]} />
            </View>
            <Text style={styles.progressCounter}>{completedCount}/{totalCount}</Text>
          </View>
        </View>
        <Chevron size={18} color={colors.secondary} dir={state === 'expanded' ? 'up' : 'down'} />
        <TouchableOpacity
          onPress={onDismiss}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          style={styles.dismissHit}>
          <Text style={styles.dismissText}>✕</Text>
        </TouchableOpacity>
      </TouchableOpacity>

      {state === 'expanded' && (
        <View style={styles.expandedBody}>
          {items.map(item => (
            <WarmupItemRow key={item.id} item={item} onToggle={onToggleItem} />
          ))}
          {!complete && (
            <TouchableOpacity
              onPress={onSkipAll}
              style={styles.skipButton}
              activeOpacity={0.7}>
              <Text style={styles.skipText}>SKIP TO WORKOUT</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderWidth: 1,
    borderRadius: 18,
    marginHorizontal: spacing.base,
    marginBottom: spacing.sm,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  iconBox: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  textColumn: {
    flex: 1,
    minWidth: 0,
  },
  eyebrow: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.8,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.primary,
    letterSpacing: -0.2,
    marginTop: 1,
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 6,
  },
  progressTrack: {
    flex: 1,
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: 4,
    borderRadius: 2,
  },
  progressCounter: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.secondary,
    fontVariant: ['tabular-nums'],
  },
  dismissHit: {
    paddingHorizontal: 4,
  },
  dismissText: {
    fontSize: 14,
    color: colors.secondary,
  },
  expandedBody: {
    paddingHorizontal: 12,
    paddingBottom: 12,
    gap: 4,
  },
  skipButton: {
    marginTop: 6,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(240,184,48,0.4)',
    borderStyle: 'dashed',
    alignItems: 'center',
  },
  skipText: {
    fontSize: fontSize.xs + 1,
    fontWeight: '800',
    color: colors.warmupAmber,
    letterSpacing: 0.8,
  },
});
