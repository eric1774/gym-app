import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { fontSize, weightSemiBold, weightRegular } from '../theme/typography';
import { FoodSearchResult } from '../types';

interface FoodResultItemProps {
  food: FoodSearchResult;
  onPress: (food: FoodSearchResult) => void;
  showUsageBadge?: boolean;
}

function FoodResultItemComponent({ food, onPress, showUsageBadge }: FoodResultItemProps) {
  const accessibilityLabel = `${food.name}, ${food.category ?? 'uncategorized'}, ${food.proteinPer100g}g protein, ${food.carbsPer100g}g carbs, ${food.fatPer100g}g fat, ${Math.round(food.caloriesPer100g)} calories per 100g${food.usageCount > 0 ? `, logged ${food.usageCount} times` : ''}`;

  return (
    <TouchableOpacity
      style={styles.card}
      activeOpacity={0.7}
      onPress={() => onPress(food)}
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button">
      {showUsageBadge && food.usageCount > 0 && (
        <View style={styles.usageBadge}>
          <Text style={styles.usageBadgeText}>{food.usageCount}x</Text>
        </View>
      )}
      <Text style={styles.foodName}>{food.name}</Text>
      {food.category != null && (
        <Text style={styles.category}>{food.category}</Text>
      )}
      <Text style={styles.macroSummary}>
        {`P:${food.proteinPer100g}g  C:${food.carbsPer100g}g  F:${food.fatPer100g}g  |  ${Math.round(food.caloriesPer100g)}kcal  per 100g`}
      </Text>
    </TouchableOpacity>
  );
}

export const FoodResultItem = React.memo(FoodResultItemComponent);

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: 14,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
    minHeight: 44,
  },
  usageBadge: {
    position: 'absolute',
    top: spacing.md,
    right: spacing.base,
    backgroundColor: colors.accentDim,
    borderRadius: 8,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  usageBadgeText: {
    fontSize: fontSize.xs,
    fontWeight: weightSemiBold,
    color: colors.accent,
  },
  foodName: {
    fontSize: fontSize.md,
    fontWeight: weightSemiBold,
    color: colors.primary,
  },
  category: {
    fontSize: fontSize.base,
    fontWeight: weightRegular,
    color: colors.secondary,
    marginTop: spacing.xs,
  },
  macroSummary: {
    fontSize: fontSize.sm,
    fontWeight: weightRegular,
    color: colors.secondary,
    marginTop: spacing.xs,
  },
});
