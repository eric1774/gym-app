import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity } from 'react-native';
import { colors, getCategoryColor } from '../theme/colors';
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

/** Append a hex alpha suffix to a 6-digit hex color. 0.14 → '24'. */
function withHexAlpha(hex: string, alpha: number): string {
  const a = Math.round(Math.max(0, Math.min(1, alpha)) * 255).toString(16).padStart(2, '0');
  return `${hex}${a}`;
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
        const tint = getCategoryColor(category);
        const pillStyle = isSelected
          ? { backgroundColor: tint }
          : { backgroundColor: withHexAlpha(tint, 0.14) };
        const textStyle = isSelected ? { color: colors.onAccent } : { color: tint };
        return (
          <TouchableOpacity
            key={category}
            onPress={() => onSelect(category)}
            style={[styles.pill, pillStyle]}>
            <Text style={[styles.pillText, textStyle]}>{capitalize(category)}</Text>
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
  pillText: {
    fontSize: fontSize.sm,
    fontWeight: weightBold,
  },
});
