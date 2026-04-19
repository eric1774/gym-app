import React, { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { colors } from '../theme/colors';
import { WorkoutSet } from '../types';
import { History, Chevron } from './icons';

interface Props {
  sets: WorkoutSet[];
  isTimed?: boolean;
  isHeightReps?: boolean;
}

function formatDuration(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export function GhostReference({ sets, isTimed = false, isHeightReps = false }: Props) {
  const [open, setOpen] = useState(false);
  if (!sets || sets.length === 0) { return null; }

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.toggle}
        onPress={() => setOpen(v => !v)}
        activeOpacity={0.7}>
        <View style={styles.toggleLeft}>
          <History size={14} color={colors.secondary} />
          <Text style={styles.toggleLabel}>
            Last session {open ? '' : `· ${sets.length} sets`}
          </Text>
        </View>
        <Chevron size={14} color={colors.secondary} dir={open ? 'up' : 'down'} />
      </TouchableOpacity>
      {open && (
        <View style={styles.list}>
          {sets.map((s, i) => (
            <View key={s.id} style={styles.row}>
              <Text style={styles.rowText}>Set {i + 1}</Text>
              <Text style={styles.rowText}>
                {isTimed
                  ? formatDuration(s.reps)
                  : `${s.weightLbs}${isHeightReps ? 'in' : 'lb'} × ${s.reps}`}
              </Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 10,
  },
  toggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    borderStyle: 'dashed',
    borderRadius: 10,
  },
  toggleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  toggleLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.secondary,
  },
  list: {
    backgroundColor: 'rgba(255,255,255,0.02)',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginTop: 8,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  rowText: {
    fontSize: 13,
    color: colors.secondary,
    fontVariant: ['tabular-nums'],
  },
});
