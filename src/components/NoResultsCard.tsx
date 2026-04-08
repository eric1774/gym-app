import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { fontSize, weightSemiBold, weightRegular } from '../theme/typography';

interface NoResultsCardProps {
  query: string;
  onCreateCustomFood: () => void;
}

export function NoResultsCard({ query, onCreateCustomFood }: NoResultsCardProps) {
  return (
    <View style={styles.card}>
      <Text style={styles.title}>No results for "{query}"</Text>
      <Text style={styles.hint}>
        Try a different spelling or create a custom food
      </Text>
      <TouchableOpacity
        style={styles.ctaButton}
        onPress={onCreateCustomFood}
        accessibilityLabel="Create custom food"
        accessibilityRole="button">
        <Text style={styles.ctaText}>+ Create Custom Food</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: spacing.base,
    marginTop: spacing.md,
  },
  title: {
    fontSize: fontSize.md,
    fontWeight: weightSemiBold,
    color: colors.primary,
  },
  hint: {
    fontSize: fontSize.base,
    fontWeight: weightRegular,
    color: colors.secondary,
    marginTop: spacing.xs,
  },
  ctaButton: {
    marginTop: spacing.md,
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  ctaText: {
    fontSize: fontSize.base,
    fontWeight: weightSemiBold,
    color: colors.accent,
  },
});
