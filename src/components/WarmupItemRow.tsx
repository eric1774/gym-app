import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { fontSize } from '../theme/typography';
import { WarmupSessionItem } from '../types';

interface WarmupItemRowProps {
  item: WarmupSessionItem;
  onToggle: (itemId: number) => void;
}

function formatTarget(item: WarmupSessionItem): string {
  if (item.trackingType === 'checkbox' || item.targetValue == null) {
    return '✓';
  }
  if (item.trackingType === 'duration') {
    const mins = Math.floor(item.targetValue / 60);
    const secs = item.targetValue % 60;
    if (mins > 0 && secs > 0) return `${mins}m ${secs}s`;
    if (mins > 0) return `${mins} min`;
    return `${secs}s`;
  }
  return `${item.targetValue} reps`;
}

export function WarmupItemRow({ item, onToggle }: WarmupItemRowProps) {
  return (
    <TouchableOpacity
      style={styles.row}
      onPress={() => onToggle(item.id)}
      activeOpacity={0.6}
    >
      <View
        style={[
          styles.checkbox,
          item.isComplete ? styles.checkboxDone : styles.checkboxPending,
        ]}
      >
        {item.isComplete && <Text style={styles.checkmark}>✓</Text>}
      </View>
      <Text
        style={[styles.name, item.isComplete && styles.nameDone]}
        numberOfLines={1}
      >
        {item.displayName}
      </Text>
      <Text style={[styles.target, item.isComplete && styles.targetDone]}>
        {formatTarget(item)}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm + 2,
    paddingVertical: spacing.sm + 2,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255,255,255,0.03)',
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxPending: {
    borderWidth: 2,
    borderColor: 'rgba(141,194,138,0.27)',
    backgroundColor: 'transparent',
  },
  checkboxDone: {
    backgroundColor: colors.accent,
  },
  checkmark: {
    color: colors.background,
    fontSize: 12,
    fontWeight: '700',
  },
  name: {
    flex: 1,
    color: colors.primary,
    fontSize: fontSize.sm,
  },
  nameDone: {
    color: colors.secondary,
    textDecorationLine: 'line-through',
  },
  target: {
    color: colors.accent,
    fontSize: fontSize.xs,
  },
  targetDone: {
    color: colors.secondary,
  },
});
