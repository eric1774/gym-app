import React, { useRef } from 'react';
import {
  Animated,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { colors } from '../theme/colors';
import { fontSize, weightMedium, weightBold } from '../theme/typography';
import { spacing } from '../theme/spacing';
import { WorkoutSet } from '../types';

interface Props {
  set: WorkoutSet;
  onDelete: (id: number) => void;
  isTimed?: boolean;
}

function formatDuration(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export const SetListItem = React.memo(function SetListItem({ set, onDelete, isTimed = false }: Props) {
  const deleteVisible = useRef(false);
  const animatedOpacity = useRef(new Animated.Value(0)).current;

  const handleLongPress = () => {
    deleteVisible.current = !deleteVisible.current;
    Animated.timing(animatedOpacity, {
      toValue: deleteVisible.current ? 1 : 0,
      duration: 150,
      useNativeDriver: true,
    }).start();
  };

  return (
    <TouchableOpacity
      style={styles.row}
      onLongPress={handleLongPress}
      activeOpacity={0.7}
      delayLongPress={400}>
      <Text style={styles.setText}>
        {isTimed
          ? `Set ${set.setNumber}: ${formatDuration(set.reps)}`
          : `Set ${set.setNumber}: ${set.weightKg}lb × ${set.reps} reps${set.isWarmup ? ' (warmup)' : ''}`}
      </Text>
      <Animated.View style={[styles.deleteWrapper, { opacity: animatedOpacity }]}>
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={() => {
            deleteVisible.current = false;
            animatedOpacity.setValue(0);
            onDelete(set.id);
          }}>
          <Text style={styles.deleteText}>Delete</Text>
        </TouchableOpacity>
      </Animated.View>
    </TouchableOpacity>
  );
});

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.base,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    minHeight: 48,
  },
  setText: {
    flex: 1,
    fontSize: fontSize.base,
    fontWeight: weightMedium,
    color: colors.primary,
  },
  deleteWrapper: {
    marginLeft: spacing.sm,
  },
  deleteButton: {
    backgroundColor: colors.danger,
    borderRadius: 8,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm,
    minHeight: 36,
    justifyContent: 'center' as const,
  },
  deleteText: {
    fontSize: fontSize.sm,
    fontWeight: weightBold,
    color: colors.primary,
  },
});
