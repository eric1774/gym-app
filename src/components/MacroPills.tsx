import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { spacing } from '../theme/spacing';
import { fontSize, weightSemiBold } from '../theme/typography';
import { MACRO_COLORS, MacroType } from '../types';

interface MacroPillsProps {
  protein: number;
  carbs: number;
  fat: number;
}

export function MacroPills({ protein, carbs, fat }: MacroPillsProps) {
  const macros: Array<{ type: MacroType; value: number; letter: string }> = [
    { type: 'protein', value: protein, letter: 'P' },
    { type: 'carbs', value: carbs, letter: 'C' },
    { type: 'fat', value: fat, letter: 'F' },
  ];

  const nonZero = macros.filter(m => m.value > 0);
  if (nonZero.length === 0) { return null; }

  return (
    <View style={styles.container}>
      {nonZero.map(({ type, value, letter }) => (
        <View
          key={type}
          style={[styles.pill, { backgroundColor: MACRO_COLORS[type] + '33' }]}>
          <Text style={[styles.pillText, { color: MACRO_COLORS[type] }]}>
            {parseFloat(value.toFixed(2))}g {letter}
          </Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: spacing.xs,
    flexWrap: 'wrap',
    marginTop: spacing.xs,
  },
  pill: {
    borderRadius: 8,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
  },
  pillText: {
    fontSize: fontSize.xs,
    fontWeight: weightSemiBold,
  },
});
