import React, { useRef } from 'react';
import {
  Animated,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { colors } from '../theme/colors';
import { Check, Trophy } from './icons';

export type SetRowType = 'done' | 'pr' | 'active' | 'pending';

interface SetRowProps {
  setNumber: number;
  weightLbs: number;
  reps: number;
  type: SetRowType;
  isTimed?: boolean;
  isHeightReps?: boolean;
  onDelete?: () => void;
}

function formatDuration(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export const SetRow = React.memo(function SetRow({
  setNumber,
  weightLbs,
  reps,
  type,
  isTimed = false,
  isHeightReps = false,
  onDelete,
}: SetRowProps) {
  const deleteVisible = useRef(false);
  const animOpacity = useRef(new Animated.Value(0)).current;

  const handleLongPress = () => {
    deleteVisible.current = !deleteVisible.current;
    Animated.timing(animOpacity, {
      toValue: deleteVisible.current ? 1 : 0,
      duration: 150,
      useNativeDriver: true,
    }).start();
  };

  const backgroundColor =
    type === 'active' ? 'rgba(141,194,138,0.06)'
    : type === 'pr' ? 'rgba(255,184,0,0.06)'
    : 'transparent';

  const dotColor =
    type === 'pr' ? colors.prGold
    : type === 'done' ? colors.accent
    : type === 'active' ? colors.primary
    : 'transparent';

  const dotTextColor = type === 'pr' || type === 'done' ? colors.onAccent : colors.primary;
  const weightText = isTimed ? formatDuration(reps) : `${weightLbs} ${isHeightReps ? 'in' : 'lb'}`;
  const repsText = isTimed ? '' : `${reps} reps`;

  return (
    <TouchableOpacity
      onLongPress={handleLongPress}
      delayLongPress={400}
      activeOpacity={0.8}
      style={[styles.row, { backgroundColor }]}>
      <View style={styles.dotCell}>
        <View
          style={[
            styles.dot,
            {
              backgroundColor: dotColor,
              borderWidth: type === 'pending' ? 1.5 : 0,
              borderColor: type === 'pending' ? colors.borderStrong : 'transparent',
            },
          ]}>
          {(type === 'done' || type === 'pr') ? (
            <Check size={13} color={colors.onAccent} />
          ) : (
            <Text style={[styles.dotNumber, { color: dotTextColor }]}>{setNumber}</Text>
          )}
        </View>
      </View>
      <View style={styles.weightCell}>
        <Text style={styles.metricText}>{weightText}</Text>
      </View>
      <View style={styles.repsCell}>
        <Text style={styles.metricText}>{repsText}</Text>
      </View>
      <View style={styles.trophyCell}>
        {type === 'pr' ? <Trophy size={14} color={colors.prGold} /> : null}
      </View>
      {onDelete && (
        <Animated.View style={[styles.deleteWrapper, { opacity: animOpacity }]}>
          <TouchableOpacity
            style={styles.deleteButton}
            onPress={() => {
              deleteVisible.current = false;
              animOpacity.setValue(0);
              onDelete();
            }}>
            <Text style={styles.deleteText}>Delete</Text>
          </TouchableOpacity>
        </Animated.View>
      )}
    </TouchableOpacity>
  );
});

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    minHeight: 44,
  },
  dotCell: {
    width: 28,
    alignItems: 'center',
  },
  dot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dotNumber: {
    fontSize: 11,
    fontWeight: '700',
  },
  weightCell: {
    flex: 1,
  },
  repsCell: {
    flex: 1,
  },
  trophyCell: {
    width: 40,
    alignItems: 'flex-end',
  },
  metricText: {
    fontSize: 17,
    fontWeight: '600',
    color: colors.primary,
    fontVariant: ['tabular-nums'],
  },
  deleteWrapper: {
    position: 'absolute',
    right: 8,
    top: 4,
    bottom: 4,
    justifyContent: 'center',
  },
  deleteButton: {
    backgroundColor: colors.danger,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  deleteText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
