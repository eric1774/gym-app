import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { MealType } from '../types';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { fontSize } from '../theme/typography';

interface QuickAddButtonsProps {
  meals: Array<{ description: string; proteinGrams: number; mealType: MealType }>;
  onQuickAdd: (meal: { description: string; proteinGrams: number; mealType: MealType }) => void;
}

export const QuickAddButtons = React.memo(function QuickAddButtons({
  meals,
  onQuickAdd,
}: QuickAddButtonsProps) {
  if (meals.length === 0) {
    return null;
  }

  return (
    <View style={styles.container}>
      {meals.map((meal, index) => (
        <TouchableOpacity
          key={`${meal.description}-${meal.proteinGrams}-${index}`}
          style={styles.pill}
          onPress={() => onQuickAdd(meal)}
        >
          <Text style={styles.pillText}>
            {meal.description} {meal.proteinGrams}g
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginHorizontal: spacing.base,
    marginTop: spacing.sm,
  },
  pill: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: 20,
    paddingVertical: 6,
    paddingHorizontal: spacing.base,
    borderWidth: 1,
    borderColor: colors.border,
  },
  pillText: {
    fontSize: fontSize.sm,
    color: colors.primary,
  },
});
