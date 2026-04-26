import React from 'react';
import { ScrollView, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { ExerciseCategory, EXERCISE_CATEGORIES } from '../../types';
import { colors } from '../../theme/colors';
import { fontSize, weightMedium, weightSemiBold } from '../../theme/typography';
import { spacing } from '../../theme/spacing';

export type ChipFilter = 'all' | ExerciseCategory;

interface Props {
  active: ChipFilter;
  onChange: (filter: ChipFilter) => void;
}

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export const CategoryChipRow: React.FC<Props> = ({ active, onChange }) => (
  <ScrollView
    horizontal
    showsHorizontalScrollIndicator={false}
    contentContainerStyle={styles.container}>
    <TouchableOpacity
      testID="chip-all"
      style={[styles.chip, active === 'all' && styles.chipActive]}
      activeOpacity={0.7}
      onPress={() => onChange('all')}>
      <Text style={[styles.text, active === 'all' && styles.textActive]}>All</Text>
    </TouchableOpacity>
    {EXERCISE_CATEGORIES.map(cat => (
      <TouchableOpacity
        key={cat}
        testID={`chip-${cat}`}
        style={[styles.chip, active === cat && styles.chipActive]}
        activeOpacity={0.7}
        onPress={() => onChange(cat)}>
        <Text style={[styles.text, active === cat && styles.textActive]}>{cap(cat)}</Text>
      </TouchableOpacity>
    ))}
  </ScrollView>
);

const styles = StyleSheet.create({
  container: { gap: 5, paddingRight: spacing.base, marginBottom: 10 },
  chip: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 4,
  },
  chipActive: {
    backgroundColor: colors.accent,
    borderWidth: 0,
  },
  text: {
    color: colors.secondary,
    fontSize: fontSize.xs,
    fontWeight: weightMedium,
  },
  textActive: {
    color: colors.onAccent,
    fontWeight: weightSemiBold,
  },
});
