import React from 'react';
import {
  ActivityIndicator,
  LayoutChangeEvent,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { MealTypePills } from './MealTypePills';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { fontSize, weightSemiBold } from '../theme/typography';
import { MealType, MACRO_COLORS } from '../types';

interface MealTotalsBarProps {
  totalProtein: number;
  totalCarbs: number;
  totalFat: number;
  totalCalories: number;
  mealType: MealType | null;
  onMealTypeSelect: (t: MealType) => void;
  description: string;
  onDescriptionChange: (text: string) => void;
  loggedAt: Date;
  onDatePress: () => void;
  onLogMeal: () => void;
  isSubmitting: boolean;
  canLog: boolean;
  error: string | null;
  onLayout: (event: LayoutChangeEvent) => void;
  ctaLabel?: string;
}

/** Format date for display: "Today H:MM AM/PM" if today, else "M/D/YYYY at H:MM AM/PM" */
export function formatDisplayDate(date: Date): string {
  const now = new Date();
  const isToday =
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate();

  const hours = date.getHours();
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours % 12 || 12;
  const timeStr = `${displayHours}:${minutes} ${ampm}`;

  if (isToday) {
    return `Today ${timeStr}`;
  }

  const month = date.getMonth() + 1;
  const day = date.getDate();
  const year = date.getFullYear();
  return `${month}/${day}/${year} at ${timeStr}`;
}

export function MealTotalsBar({
  totalProtein,
  totalCarbs,
  totalFat,
  totalCalories,
  mealType,
  onMealTypeSelect,
  description,
  onDescriptionChange,
  loggedAt,
  onDatePress,
  onLogMeal,
  isSubmitting,
  canLog,
  error,
  onLayout,
  ctaLabel,
}: MealTotalsBarProps) {
  const isDisabled = !canLog || isSubmitting;

  return (
    <View style={styles.container} onLayout={onLayout}>
      {/* Row 1: Macro totals */}
      <View style={styles.macroRow}>
        <Text style={[styles.macroLabel, { color: MACRO_COLORS.protein }]}>
          P{' '}
          <Text style={styles.macroValue}>{totalProtein.toFixed(0)}g</Text>
        </Text>
        <Text style={[styles.macroLabel, { color: MACRO_COLORS.carbs }]}>
          C{' '}
          <Text style={styles.macroValue}>{totalCarbs.toFixed(0)}g</Text>
        </Text>
        <Text style={[styles.macroLabel, { color: MACRO_COLORS.fat }]}>
          F{' '}
          <Text style={styles.macroValue}>{totalFat.toFixed(0)}g</Text>
        </Text>
        <Text style={styles.caloriesText}>{totalCalories} kcal</Text>
      </View>

      {/* Row 2: MealTypePills */}
      <View style={styles.row}>
        <MealTypePills selected={mealType} onSelect={onMealTypeSelect} />
      </View>

      {/* Row 3: Description */}
      <View style={styles.row}>
        <TextInput
          style={styles.descriptionInput}
          value={description}
          onChangeText={onDescriptionChange}
          placeholder="e.g. Chicken breast, White rice"
          placeholderTextColor={colors.secondary}
          returnKeyType="done"
        />
      </View>

      {/* Row 4: Date/time */}
      <TouchableOpacity
        style={[styles.row, styles.dateButton]}
        onPress={onDatePress}>
        <Text style={styles.dateText}>{formatDisplayDate(loggedAt)}</Text>
      </TouchableOpacity>

      {/* Row 5: LOG MEAL button */}
      <TouchableOpacity
        style={[styles.row, styles.logButton, isDisabled && styles.logButtonDisabled]}
        onPress={onLogMeal}
        disabled={isDisabled}>
        {isSubmitting ? (
          <ActivityIndicator color={colors.onAccent} size="small" />
        ) : (
          <Text style={styles.logButtonText}>{ctaLabel ?? 'LOG MEAL'}</Text>
        )}
      </TouchableOpacity>

      {/* Row 6: Error */}
      {error != null && (
        <Text style={styles.errorText}>{error}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surfaceElevated,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
    paddingBottom: spacing.xxxl,
  },
  macroRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.base,
  },
  macroLabel: {
    fontSize: fontSize.sm,
    fontWeight: weightSemiBold,
  },
  macroValue: {
    fontSize: fontSize.sm,
    fontWeight: weightSemiBold,
  },
  caloriesText: {
    marginLeft: 'auto',
    fontSize: fontSize.sm,
    fontWeight: weightSemiBold,
    color: colors.accent,
  },
  row: {
    marginTop: spacing.md,
  },
  descriptionInput: {
    color: colors.primary,
    fontSize: fontSize.base,
    backgroundColor: colors.surface,
    borderRadius: 8,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    minHeight: 44,
  },
  dateButton: {
    minHeight: 44,
    justifyContent: 'center',
  },
  dateText: {
    fontSize: fontSize.base,
    color: colors.secondary,
  },
  logButton: {
    backgroundColor: colors.accent,
    borderRadius: 12,
    paddingVertical: spacing.base,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logButtonDisabled: {
    opacity: 0.5,
  },
  logButtonText: {
    color: colors.onAccent,
    fontSize: fontSize.base,
    fontWeight: weightSemiBold,
  },
  errorText: {
    marginTop: spacing.sm,
    fontSize: fontSize.sm,
    color: colors.danger,
  },
});
