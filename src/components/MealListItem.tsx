import React, { useRef } from 'react';
import {
  Animated,
  PanResponder,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { fontSize, weightBold, weightSemiBold } from '../theme/typography';
import { MacroMeal } from '../types';
import { MacroPills } from './MacroPills';

interface MealListItemProps {
  meal: MacroMeal;
  onEdit: (meal: MacroMeal) => void;
  onDelete: (meal: MacroMeal) => void;
  onRepeat?: (meal: MacroMeal) => void;
  hasMealFoods?: boolean;
  isLast?: boolean;
}

const DELETE_THRESHOLD = -80;

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export const MealListItem = React.memo(function MealListItem({
  meal,
  onEdit,
  onDelete,
  onRepeat,
  hasMealFoods = false,
  isLast = false,
}: MealListItemProps) {
  const translateX = useRef(new Animated.Value(0)).current;

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_evt, gs) =>
        Math.abs(gs.dx) > 10 && Math.abs(gs.dx) > Math.abs(gs.dy),
      onPanResponderMove: (_evt, gs) => {
        if (gs.dx < 0) {
          translateX.setValue(Math.max(gs.dx, DELETE_THRESHOLD));
        }
      },
      onPanResponderRelease: (_evt, gs) => {
        if (gs.dx < DELETE_THRESHOLD / 2) {
          Animated.spring(translateX, {
            toValue: DELETE_THRESHOLD,
            useNativeDriver: true,
          }).start();
        } else {
          Animated.spring(translateX, {
            toValue: 0,
            useNativeDriver: true,
          }).start();
        }
      },
    }),
  ).current;

  return (
    <View style={[styles.outerContainer, !isLast && styles.withBorder]}>
      <TouchableOpacity
        style={styles.deleteArea}
        onPress={() => onDelete(meal)}
        activeOpacity={0.8}>
        <Text style={styles.deleteText}>Delete</Text>
      </TouchableOpacity>

      <Animated.View
        style={[styles.rowAnimated, { transform: [{ translateX }] }]}
        {...panResponder.panHandlers}>
        <TouchableOpacity
          style={styles.rowContent}
          onPress={() => onEdit(meal)}
          activeOpacity={0.7}>
          <View style={styles.checkCircle}>
            <Text style={styles.checkMark}>{'\u2713'}</Text>
          </View>
          <View style={styles.leftContent}>
            <Text style={styles.mealTypeLabel}>
              {capitalize(meal.mealType)}:
            </Text>
            {meal.description ? (
              <Text style={styles.description} numberOfLines={1}>
                {meal.description}
              </Text>
            ) : null}
            <MacroPills protein={meal.protein} carbs={meal.carbs} fat={meal.fat} />
          </View>
          {hasMealFoods && onRepeat && (
            <TouchableOpacity
              onPress={() => onRepeat(meal)}
              activeOpacity={0.7}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              style={styles.repeatButton}
              accessibilityLabel="Repeat meal"
              accessibilityHint="Opens builder pre-loaded with this meal's foods"
              accessibilityRole="button">
              <Text style={styles.repeatIcon}>{'\u21BA'}</Text>
            </TouchableOpacity>
          )}
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
});

const styles = StyleSheet.create({
  outerContainer: {
    position: 'relative',
    overflow: 'hidden',
  },
  withBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  deleteArea: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: 80,
    backgroundColor: colors.danger,
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteText: {
    fontSize: fontSize.sm,
    fontWeight: weightBold,
    color: colors.primary,
  },
  rowAnimated: {
    backgroundColor: colors.surface,
  },
  rowContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
    minHeight: 56,
  },
  checkCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.accent,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  checkMark: {
    fontSize: 14,
    fontWeight: weightBold,
    color: colors.onAccent,
    marginTop: -1,
  },
  leftContent: {
    flex: 1,
  },
  repeatButton: {
    minWidth: 44,
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: spacing.md,
  },
  repeatIcon: {
    fontSize: 20,
    color: colors.accent,
  },
  mealTypeLabel: {
    fontSize: fontSize.xs,
    color: colors.secondary,
  },
  description: {
    fontSize: fontSize.base,
    fontWeight: weightSemiBold,
    color: colors.primary,
  },
});
