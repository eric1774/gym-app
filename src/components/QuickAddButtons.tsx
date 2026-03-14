import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { MealType } from '../types';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { fontSize, weightBold } from '../theme/typography';

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
    <View style={styles.wrapper}>
      <Text style={styles.sectionHeader}>RECENT TEMPLATES</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
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
      </ScrollView>
    </View>
  );
});

const styles = StyleSheet.create({
  wrapper: {
    marginTop: spacing.lg,
  },
  sectionHeader: {
    fontSize: fontSize.sm,
    fontWeight: weightBold,
    color: colors.secondary,
    letterSpacing: 1.2,
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.base,
  },
  scrollContent: {
    paddingHorizontal: spacing.base,
    gap: spacing.sm,
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
