import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { fontSize } from '../theme/typography';
import { WarmupSessionItem } from '../types';
import { WarmupItemRow } from './WarmupItemRow';

interface WarmupSectionProps {
  items: WarmupSessionItem[];
  state: 'expanded' | 'collapsed' | 'dismissed' | 'none';
  onToggleItem: (itemId: number) => void;
  onCollapse: () => void;
  onExpand: () => void;
  onDismiss: () => void;
}

export function WarmupSection({
  items,
  state,
  onToggleItem,
  onCollapse,
  onExpand,
  onDismiss,
}: WarmupSectionProps) {
  if (state === 'none' || state === 'dismissed' || items.length === 0) {
    return null;
  }

  const completedCount = items.filter(i => i.isComplete).length;
  const totalCount = items.length;
  const allDone = completedCount === totalCount;
  const progressPercent = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

  if (state === 'collapsed') {
    return (
      <>
        <TouchableOpacity
          style={styles.collapsedContainer}
          onPress={onExpand}
          activeOpacity={0.7}
        >
          <View style={styles.headerRow}>
            <View style={styles.headerLeft}>
              <Text style={styles.fireEmoji}>🔥</Text>
              <Text style={styles.headerLabel}>WARM UP</Text>
              <Text style={[styles.progressText, allDone && styles.progressDone]}>
                {completedCount}/{totalCount} {allDone ? '✓' : ''}
              </Text>
            </View>
            <View style={styles.headerActions}>
              <Text style={styles.actionIcon}>▼</Text>
              <TouchableOpacity onPress={onDismiss} hitSlop={{top:8,bottom:8,left:8,right:8}}>
                <Text style={styles.actionIcon}>✕</Text>
              </TouchableOpacity>
            </View>
          </View>
          <View style={styles.progressBarTrack}>
            <View style={[styles.progressBarFill, { width: `${progressPercent}%` }]} />
          </View>
        </TouchableOpacity>
        <View style={styles.divider}>
          <Text style={styles.dividerText}>── WORKING SETS ──</Text>
        </View>
      </>
    );
  }

  return (
    <>
      <View style={styles.expandedContainer}>
        <View style={styles.headerRow}>
          <View style={styles.headerLeft}>
            <Text style={styles.fireEmoji}>🔥</Text>
            <Text style={styles.headerLabel}>WARM UP</Text>
            <Text style={styles.progressText}>{completedCount}/{totalCount}</Text>
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity onPress={onCollapse} hitSlop={{top:8,bottom:8,left:8,right:8}}>
              <Text style={styles.actionIcon}>▲</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={onDismiss} hitSlop={{top:8,bottom:8,left:8,right:8}}>
              <Text style={styles.actionIcon}>✕</Text>
            </TouchableOpacity>
          </View>
        </View>
        <View style={styles.itemsList}>
          {items.map(item => (
            <WarmupItemRow key={item.id} item={item} onToggle={onToggleItem} />
          ))}
        </View>
      </View>
      <View style={styles.divider}>
        <Text style={styles.dividerText}>── WORKING SETS ──</Text>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  expandedContainer: {
    backgroundColor: 'rgba(141,194,138,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(141,194,138,0.2)',
    borderRadius: 12,
    marginHorizontal: spacing.base,
    marginBottom: spacing.sm,
    overflow: 'hidden',
  },
  collapsedContainer: {
    backgroundColor: 'rgba(141,194,138,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(141,194,138,0.2)',
    borderRadius: 12,
    marginHorizontal: spacing.base,
    marginBottom: spacing.sm,
    overflow: 'hidden',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(141,194,138,0.13)',
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  fireEmoji: { fontSize: 16 },
  headerLabel: { color: colors.accent, fontSize: fontSize.sm + 1, fontWeight: '700' },
  progressText: { color: colors.secondary, fontSize: fontSize.xs },
  progressDone: { color: colors.accent },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  actionIcon: { color: colors.secondary, fontSize: 14, paddingHorizontal: 4 },
  itemsList: { paddingHorizontal: spacing.md },
  progressBarTrack: {
    height: 3,
    backgroundColor: 'rgba(141,194,138,0.15)',
    marginHorizontal: spacing.base,
    marginBottom: spacing.md,
    borderRadius: 2,
  },
  progressBarFill: { height: 3, backgroundColor: colors.accent, borderRadius: 2 },
  divider: { alignItems: 'center', paddingVertical: spacing.md },
  dividerText: { color: 'rgba(255,255,255,0.2)', fontSize: fontSize.xs, letterSpacing: 2 },
});
