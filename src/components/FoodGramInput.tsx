import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  KeyboardAvoidingView,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { computeCalories } from '../utils/macros';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { fontSize, weightSemiBold } from '../theme/typography';
import { MACRO_COLORS } from '../types';

interface FoodGramInputProps {
  food: {
    name: string;
    proteinPer100g: number;
    carbsPer100g: number;
    fatPer100g: number;
  };
  initialGrams?: string;
  /** Last gram quantity used for this food — shown as ghost placeholder text (D-01). */
  lastUsedGrams?: number;
  onSubmit: (grams: number) => void;
  onDismiss: () => void;
  visible: boolean;
  /** "Add to Meal" (default) or "Update" for edit mode */
  buttonLabel?: string;
}

export function FoodGramInput({
  food,
  initialGrams,
  lastUsedGrams,
  onSubmit,
  onDismiss,
  visible,
  buttonLabel,
}: FoodGramInputProps) {
  const [gramsText, setGramsText] = useState(initialGrams ?? '');
  const [shouldRender, setShouldRender] = useState(visible);
  const translateY = useRef(new Animated.Value(400)).current;
  const inputRef = useRef<TextInput>(null);

  // Sync gramsText when initialGrams prop changes (edit mode)
  useEffect(() => {
    setGramsText(initialGrams ?? '');
  }, [initialGrams]);

  // Animate in/out when visible changes
  useEffect(() => {
    if (visible) {
      setShouldRender(true);
      // Slide up
      Animated.timing(translateY, {
        toValue: 0,
        duration: 250,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }).start(() => {
        // Auto-focus with Android keyboard timing delay
        setTimeout(() => {
          inputRef.current?.focus();
        }, 100);
      });
    } else {
      // Slide down, then unmount
      Animated.timing(translateY, {
        toValue: 400,
        duration: 200,
        easing: Easing.in(Easing.quad),
        useNativeDriver: true,
      }).start(() => {
        setShouldRender(false);
      });
    }
  }, [visible, translateY]);

  if (!shouldRender) {
    return null;
  }

  // Live macro computation — pure math, no debounce needed per D-08
  const grams = parseFloat(gramsText) || 0;
  const protein = (grams / 100) * food.proteinPer100g;
  const carbs = (grams / 100) * food.carbsPer100g;
  const fat = (grams / 100) * food.fatPer100g;
  const calories = Math.round(computeCalories(protein, carbs, fat));

  const isSubmitDisabled = gramsText === '' || grams === 0;

  const handleSubmit = () => {
    if (!isSubmitDisabled) {
      onSubmit(grams);
    }
  };

  return (
    <>
      {/* Semi-transparent backdrop */}
      <Pressable style={styles.backdrop} onPress={onDismiss} />

      {/* Slide-up card */}
      <Animated.View
        style={[styles.card, { transform: [{ translateY }] }]}>
        <KeyboardAvoidingView behavior="padding">
          {/* Row 1: Food name */}
          <Text style={styles.foodName} numberOfLines={1} ellipsizeMode="tail">
            {food.name}
          </Text>

          {/* Row 2: Gram input */}
          <View style={styles.inputRow}>
            <TextInput
              ref={inputRef}
              style={styles.gramInput}
              value={gramsText}
              onChangeText={setGramsText}
              keyboardType="numeric"
              placeholder={
                initialGrams != null
                  ? '0'
                  : lastUsedGrams != null
                    ? String(lastUsedGrams)
                    : '0'
              }
              placeholderTextColor={colors.secondary}
              returnKeyType="done"
              onSubmitEditing={handleSubmit}
              selectTextOnFocus
            />
            <Text style={styles.gramSuffix}>g</Text>
          </View>

          {/* Row 3: Live macro preview */}
          <View style={styles.previewRow}>
            <Text style={[styles.previewLabel, { color: MACRO_COLORS.protein }]}>
              P{' '}
              <Text style={styles.previewValue}>{protein.toFixed(1)}g</Text>
            </Text>
            <Text style={[styles.previewLabel, { color: MACRO_COLORS.carbs }]}>
              C{' '}
              <Text style={styles.previewValue}>{carbs.toFixed(1)}g</Text>
            </Text>
            <Text style={[styles.previewLabel, { color: MACRO_COLORS.fat }]}>
              F{' '}
              <Text style={styles.previewValue}>{fat.toFixed(1)}g</Text>
            </Text>
            <Text style={styles.caloriesPreview}>{calories} kcal</Text>
          </View>

          {/* Row 4: Submit button */}
          <TouchableOpacity
            style={[styles.submitButton, isSubmitDisabled && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={isSubmitDisabled}>
            <Text style={styles.submitButtonText}>
              {buttonLabel ?? 'Add to Meal'}
            </Text>
          </TouchableOpacity>
        </KeyboardAvoidingView>
      </Animated.View>
    </>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  card: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: spacing.xl,
    paddingBottom: spacing.xxl,
    paddingHorizontal: spacing.base,
  },
  foodName: {
    fontSize: fontSize.md,
    fontWeight: weightSemiBold,
    color: colors.primary,
    marginBottom: spacing.md,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceElevated,
    borderRadius: 8,
    paddingHorizontal: spacing.md,
    minHeight: 44,
  },
  gramInput: {
    flex: 1,
    fontSize: fontSize.md,
    fontWeight: weightSemiBold,
    color: colors.primary,
    paddingVertical: spacing.md,
    minHeight: 44,
  },
  gramSuffix: {
    fontSize: fontSize.md,
    fontWeight: weightSemiBold,
    color: colors.secondary,
    marginLeft: spacing.xs,
  },
  previewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginTop: spacing.md,
  },
  previewLabel: {
    fontSize: fontSize.base,
    fontWeight: weightSemiBold,
  },
  previewValue: {
    fontSize: fontSize.base,
    fontWeight: weightSemiBold,
  },
  caloriesPreview: {
    marginLeft: 'auto',
    fontSize: fontSize.base,
    color: colors.accent,
    fontWeight: weightSemiBold,
  },
  submitButton: {
    backgroundColor: colors.accent,
    borderRadius: 12,
    paddingVertical: spacing.md,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.md,
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  submitButtonText: {
    color: colors.onAccent,
    fontSize: fontSize.base,
    fontWeight: weightSemiBold,
  },
});
