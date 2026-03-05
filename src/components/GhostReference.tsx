import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme/colors';
import { fontSize, weightMedium } from '../theme/typography';
import { spacing } from '../theme/spacing';
import { WorkoutSet } from '../types';

interface Props {
  sets: WorkoutSet[];
}

export function GhostReference({ sets }: Props) {
  if (!sets || sets.length === 0) {
    return null;
  }

  // Use horizontal compact display for 1-3 sets, vertical list for 4+
  const useVertical = sets.length > 3;

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Last session:</Text>
      {useVertical ? (
        <View style={styles.verticalList}>
          {sets.map(s => (
            <Text key={s.id} style={styles.setText}>
              Set {s.setNumber}: {s.weightKg}kg × {s.reps} reps
            </Text>
          ))}
        </View>
      ) : (
        <View style={styles.horizontalRow}>
          {sets.map((s, idx) => (
            <Text key={s.id} style={styles.setText}>
              Set {s.setNumber}: {s.weightKg}kg × {s.reps}
              {idx < sets.length - 1 ? '   ' : ''}
            </Text>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.base,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  label: {
    fontSize: fontSize.sm,
    color: colors.secondary,
    fontWeight: weightMedium,
    marginBottom: spacing.xs,
  },
  horizontalRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  verticalList: {
    flexDirection: 'column',
  },
  setText: {
    fontSize: fontSize.sm,
    color: colors.secondary,
  },
});
