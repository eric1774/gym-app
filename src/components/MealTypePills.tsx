import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { fontSize, weightSemiBold } from '../theme/typography';
import { MealType, MEAL_TYPES } from '../types';

interface MealTypePillsProps {
  selected: MealType | null;
  onSelect: (t: MealType) => void;
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function MealTypePills({ selected, onSelect }: MealTypePillsProps) {
  return (
    <View style={styles.container}>
      {MEAL_TYPES.map((type) => {
        const isSelected = type === selected;
        return (
          <TouchableOpacity
            key={type}
            onPress={() => onSelect(type)}
            style={[
              styles.pill,
              isSelected ? styles.pillSelected : styles.pillUnselected,
            ]}>
            <Text
              style={[
                styles.pillText,
                isSelected ? styles.pillTextSelected : styles.pillTextUnselected,
              ]}>
              {capitalize(type)}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  pill: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: 20,
    alignItems: 'center',
    minHeight: 44,
    justifyContent: 'center',
  },
  pillSelected: {
    backgroundColor: colors.accent,
  },
  pillUnselected: {
    backgroundColor: colors.surfaceElevated,
  },
  pillText: {
    fontSize: fontSize.sm,
    fontWeight: weightSemiBold,
  },
  pillTextSelected: {
    color: colors.background,
  },
  pillTextUnselected: {
    color: colors.secondary,
  },
});
