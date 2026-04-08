import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { FoodResultItem } from './FoodResultItem';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { fontSize, weightSemiBold } from '../theme/typography';
import { FoodSearchResult } from '../types';

interface FrequentFoodsSectionProps {
  foods: FoodSearchResult[];
  onFoodPress: (food: FoodSearchResult) => void;
  loading: boolean;
}

export function FrequentFoodsSection({ foods, onFoodPress, loading }: FrequentFoodsSectionProps) {
  return (
    <View>
      <Text style={styles.sectionHeader}>FREQUENTLY LOGGED</Text>
      {loading ? null : foods.length === 0 ? (
        <Text style={styles.emptyState}>Your frequent foods will appear here</Text>
      ) : (
        <View>
          {foods.map((food, index) => (
            <View key={food.id} style={index > 0 ? styles.cardGap : undefined}>
              <FoodResultItem food={food} onPress={onFoodPress} showUsageBadge={true} />
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  sectionHeader: {
    fontSize: fontSize.xs,
    fontWeight: weightSemiBold,
    color: colors.secondary,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: spacing.md,
  },
  emptyState: {
    fontSize: fontSize.base,
    color: colors.secondary,
    textAlign: 'center',
    paddingVertical: spacing.xl,
  },
  cardGap: {
    marginTop: spacing.sm,
  },
});
