import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity } from 'react-native';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { fontSize, weightBold } from '../theme/typography';
import { ExerciseCategory, EXERCISE_CATEGORIES } from '../types';

interface ExerciseCategoryTabsProps {
  selected: ExerciseCategory | null;
  onSelect: (c: ExerciseCategory) => void;
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function ExerciseCategoryTabs({ selected, onSelect }: ExerciseCategoryTabsProps) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.container}
      contentContainerStyle={styles.content}>
      {EXERCISE_CATEGORIES.map(category => {
        const isSelected = category === selected;
        return (
          <TouchableOpacity
            key={category}
            onPress={() => onSelect(category)}
            style={[styles.pill, isSelected ? styles.pillSelected : styles.pillUnselected]}>
            <Text
              style={[
                styles.pillText,
                isSelected ? styles.pillTextSelected : styles.pillTextUnselected,
              ]}>
              {capitalize(category)}
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 0,
  },
  content: {
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
  pill: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: 20,
  },
  pillSelected: {
    backgroundColor: colors.accent,
  },
  pillUnselected: {
    backgroundColor: '#33373D',
  },
  pillText: {
    fontSize: fontSize.sm,
    fontWeight: weightBold,
  },
  pillTextSelected: {
    color: colors.onAccent,
  },
  pillTextUnselected: {
    color: colors.secondary,
  },
});
