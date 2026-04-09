import React from 'react';
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { MacroPills } from './MacroPills';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { fontSize, weightSemiBold } from '../theme/typography';

interface MealFoodCardProps {
  foodName: string;
  grams: number;
  protein: number;
  carbs: number;
  fat: number;
  calories: number;
  onRemove: () => void;
  onEdit: () => void;
}

function MealFoodCardInner({
  foodName,
  grams,
  protein,
  carbs,
  fat,
  calories,
  onRemove,
  onEdit,
}: MealFoodCardProps) {
  return (
    <TouchableOpacity
      style={styles.card}
      onPress={onEdit}
      activeOpacity={0.7}>
      {/* Row 1: food name + remove button */}
      <View style={styles.topRow}>
        <Text style={styles.foodName} numberOfLines={1} ellipsizeMode="tail">
          {foodName}
        </Text>
        <TouchableOpacity
          style={styles.removeButton}
          onPress={onRemove}
          accessibilityLabel={`Remove ${foodName} from meal`}
          hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}>
          <Text style={styles.removeText}>✕</Text>
        </TouchableOpacity>
      </View>

      {/* Row 2: gram weight */}
      <Text style={styles.gramWeight}>{grams}g</Text>

      {/* Row 3: macro pills + calories */}
      <View style={styles.bottomRow}>
        <MacroPills protein={protein} carbs={carbs} fat={fat} />
        <Text style={styles.calories}>{calories} kcal</Text>
      </View>
    </TouchableOpacity>
  );
}

export const MealFoodCard = React.memo(MealFoodCardInner);

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: 14,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
    minHeight: 44,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  foodName: {
    flex: 1,
    fontSize: fontSize.md,
    fontWeight: weightSemiBold,
    color: colors.primary,
    marginRight: spacing.sm,
  },
  removeButton: {
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeText: {
    fontSize: fontSize.base,
    color: colors.danger,
    fontWeight: weightSemiBold,
  },
  gramWeight: {
    fontSize: fontSize.base,
    color: colors.secondary,
    marginTop: spacing.xs,
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.xs,
  },
  calories: {
    fontSize: fontSize.base,
    color: colors.secondary,
  },
});
