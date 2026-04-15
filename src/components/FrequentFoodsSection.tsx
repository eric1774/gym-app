import React from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
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
  if (loading) {
    return null;
  }

  if (foods.length === 0) {
    return (
      <View>
        <Text style={styles.sectionHeader}>FREQUENTLY LOGGED</Text>
        <Text style={styles.emptyState}>Your frequent foods will appear here</Text>
      </View>
    );
  }

  return (
    <FlatList
      data={foods}
      keyExtractor={(item) => String(item.id)}
      renderItem={({ item }) => (
        <FoodResultItem food={item} onPress={onFoodPress} showUsageBadge={true} lastUsedGrams={item.lastUsedGrams} />
      )}
      ListHeaderComponent={<Text style={styles.sectionHeader}>FREQUENTLY LOGGED</Text>}
      ItemSeparatorComponent={() => <View style={styles.separator} />}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.listContent}
    />
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
  separator: {
    height: spacing.sm,
  },
  listContent: {
    paddingBottom: spacing.xxxl,
  },
});
