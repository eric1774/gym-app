import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  FlatList,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  Vibration,
  View,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { MealFoodCard } from '../components/MealFoodCard';
import { MealTotalsBar, formatDisplayDate } from '../components/MealTotalsBar';
import { FoodGramInput } from '../components/FoodGramInput';
import { FoodSearchModal } from './FoodSearchModal';
import { foodsDb } from '../db';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { fontSize, weightSemiBold } from '../theme/typography';
import { Food, MealFoodInput, MealType } from '../types';
import { computeCalories } from '../utils/macros';
import { ProteinStackParamList } from '../navigation/TabNavigator';

type Props = NativeStackScreenProps<ProteinStackParamList, 'MealBuilder'>;

// ── Builder food item ────────────────────────────────────────────────

interface BuilderFood {
  key: string;
  foodId: number;
  foodName: string;
  grams: number;
  proteinPer100g: number;
  carbsPer100g: number;
  fatPer100g: number;
}

// ── Date/time utilities (same pattern as AddMealModal) ───────────────

function formatDateForInput(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatTimeForInput(date: Date): string {
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
}

function parseDate(dateStr: string): { year: number; month: number; day: number } | null {
  const match = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) { return null; }
  const year = parseInt(match[1], 10);
  const month = parseInt(match[2], 10);
  const day = parseInt(match[3], 10);
  if (month < 1 || month > 12 || day < 1 || day > 31) { return null; }
  return { year, month, day };
}

function parseTime(timeStr: string): { hours: number; minutes: number } | null {
  const match = timeStr.match(/^(\d{1,2}):(\d{2})$/);
  if (!match) { return null; }
  const hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) { return null; }
  return { hours, minutes };
}

// ── Empty state ──────────────────────────────────────────────────────

interface EmptyStateProps {
  onSearchPress: () => void;
}

function EmptyState({ onSearchPress }: EmptyStateProps) {
  return (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyHeading}>Add your first food</Text>
      <Text style={styles.emptyBody}>
        Search the USDA database or your custom foods to build a meal
      </Text>
      <TouchableOpacity style={styles.searchFoodsButton} onPress={onSearchPress}>
        <Text style={styles.searchFoodsButtonText}>+ Search Foods</Text>
      </TouchableOpacity>
    </View>
  );
}

// ── Add Another Food button ──────────────────────────────────────────

interface AddFoodButtonProps {
  onPress: () => void;
}

function AddFoodButton({ onPress }: AddFoodButtonProps) {
  return (
    <TouchableOpacity style={styles.addFoodButton} onPress={onPress}>
      <Text style={styles.addFoodButtonText}>+ Add Another Food</Text>
    </TouchableOpacity>
  );
}

// ── Date edit section ────────────────────────────────────────────────

interface DateEditSectionProps {
  dateText: string;
  timeText: string;
  dateError: string | null;
  onDateChange: (text: string) => void;
  onTimeChange: (text: string) => void;
}

function DateEditSection({
  dateText,
  timeText,
  dateError,
  onDateChange,
  onTimeChange,
}: DateEditSectionProps) {
  return (
    <View style={styles.dateEditContainer}>
      <View style={styles.dateEditRow}>
        <View style={styles.dateEditField}>
          <Text style={styles.dateEditLabel}>Date</Text>
          <TextInput
            style={styles.dateEditInput}
            placeholder="YYYY-MM-DD"
            placeholderTextColor={colors.secondary}
            value={dateText}
            onChangeText={onDateChange}
            keyboardType="numbers-and-punctuation"
            returnKeyType="done"
          />
        </View>
        <View style={styles.dateEditField}>
          <Text style={styles.dateEditLabel}>Time</Text>
          <TextInput
            style={styles.dateEditInput}
            placeholder="HH:MM"
            placeholderTextColor={colors.secondary}
            value={timeText}
            onChangeText={onTimeChange}
            keyboardType="numbers-and-punctuation"
            returnKeyType="done"
          />
        </View>
      </View>
      {dateError != null && (
        <Text style={styles.dateErrorText}>{dateError}</Text>
      )}
    </View>
  );
}

// ── Main screen ──────────────────────────────────────────────────────

export function MealBuilderScreen({ navigation, route }: Props) {
  const params = route.params;
  const mode = params?.mode ?? 'normal';
  const editMealId = params?.editMealId;

  const [foods, setFoods] = useState<BuilderFood[]>([]);
  const [searchVisible, setSearchVisible] = useState(false);
  const [gramInputVisible, setGramInputVisible] = useState(false);
  const [gramInputFood, setGramInputFood] = useState<Food | null>(null);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [lastUsedGrams, setLastUsedGrams] = useState<number | null>(null);
  const [mealType, setMealType] = useState<MealType | null>(null);
  const [description, setDescription] = useState('');
  const [loggedAt, setLoggedAt] = useState(new Date());
  const [showDateEdit, setShowDateEdit] = useState(false);
  const [dateText, setDateText] = useState('');
  const [timeText, setTimeText] = useState('');
  const [dateError, setDateError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [totalsBarHeight, setTotalsBarHeight] = useState(0);

  // Track description override for edit mode pre-fill (used once, then auto-generate takes over)
  const [descriptionOverride, setDescriptionOverride] = useState<string | null>(
    mode === 'edit' && params?.prefillDescription ? params.prefillDescription : null,
  );

  // ── Computed macros per food ────────────────────────────────────────

  const computedFoods = useMemo(() => foods.map(f => {
    const protein = (f.grams / 100) * f.proteinPer100g;
    const carbs = (f.grams / 100) * f.carbsPer100g;
    const fat = (f.grams / 100) * f.fatPer100g;
    const calories = Math.round(computeCalories(protein, carbs, fat));
    return { ...f, protein, carbs, fat, calories };
  }), [foods]);

  const totalProtein = useMemo(
    () => computedFoods.reduce((sum, f) => sum + f.protein, 0),
    [computedFoods],
  );
  const totalCarbs = useMemo(
    () => computedFoods.reduce((sum, f) => sum + f.carbs, 0),
    [computedFoods],
  );
  const totalFat = useMemo(
    () => computedFoods.reduce((sum, f) => sum + f.fat, 0),
    [computedFoods],
  );
  const totalCalories = useMemo(
    () => Math.round(computeCalories(totalProtein, totalCarbs, totalFat)),
    [totalProtein, totalCarbs, totalFat],
  );

  // ── Pre-load foods/mealType/loggedAt from params (repeat or edit mode) ─

  useEffect(() => {
    if (params?.prefillFoods && params.prefillFoods.length > 0) {
      const preloaded: BuilderFood[] = params.prefillFoods.map((f, i) => ({
        key: `${f.foodId}-prefill-${i}`,
        foodId: f.foodId,
        foodName: f.foodName,
        grams: f.grams,
        proteinPer100g: f.proteinPer100g,
        carbsPer100g: f.carbsPer100g,
        fatPer100g: f.fatPer100g,
      }));
      setFoods(preloaded);
    }
    if (params?.prefillMealType) {
      setMealType(params.prefillMealType);
    }
    if (params?.prefillLoggedAt) {
      setLoggedAt(new Date(params.prefillLoggedAt));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run once on mount only

  // ── Auto-generate description from food names (D-14) ───────────────

  useEffect(() => {
    if (descriptionOverride !== null) {
      setDescription(descriptionOverride);
      setDescriptionOverride(null); // Only use once, then auto-generate takes over on food changes
      return;
    }
    if (foods.length === 0) {
      setDescription('');
      return;
    }
    const names = foods.map(f => f.foodName);
    const display = names.length <= 3
      ? names.join(', ')
      : names.slice(0, 3).join(', ') + '...';
    setDescription(display);
  }, [foods, descriptionOverride]);

  // ── canLog gate (D-16, T-39-10) ────────────────────────────────────

  const canLog = foods.length > 0 && mealType !== null;

  // ── Food flow handlers ──────────────────────────────────────────────

  const handleAddFoodPress = useCallback(() => {
    // Dismiss gram input first if open (UI-SPEC Implementation Note 2)
    if (gramInputVisible) {
      setGramInputVisible(false);
      setTimeout(() => setSearchVisible(true), 50);
    } else {
      setSearchVisible(true);
    }
  }, [gramInputVisible]);

  const handleFoodSelected = useCallback(async (food: Food) => {
    setSearchVisible(false);
    setGramInputFood(food);
    setEditingIndex(null);
    // Fetch remembered portion for ghost text pre-fill (D-01)
    const portion = await foodsDb.getLastUsedPortion(food.id);
    setLastUsedGrams(portion);
    setGramInputVisible(true);
  }, []);

  const handleEditFood = useCallback((index: number) => {
    const f = foods[index];
    // Build a Food-shaped object for FoodGramInput
    setGramInputFood({
      id: f.foodId,
      fdcId: null,
      name: f.foodName,
      category: null,
      proteinPer100g: f.proteinPer100g,
      carbsPer100g: f.carbsPer100g,
      fatPer100g: f.fatPer100g,
      caloriesPer100g: computeCalories(f.proteinPer100g, f.carbsPer100g, f.fatPer100g),
      searchText: '',
      isCustom: false,
    });
    setEditingIndex(index);
    // Edit mode: clear lastUsedGrams so ghost text is not shown (initialGrams takes precedence)
    setLastUsedGrams(null);
    setGramInputVisible(true);
  }, [foods]);

  const handleRemoveFood = useCallback((index: number) => {
    setFoods(prev => prev.filter((_, i) => i !== index));
  }, []);

  const handleGramSubmit = useCallback((grams: number) => {
    if (editingIndex !== null) {
      // Edit mode — update existing food
      setFoods(prev => prev.map((f, i) =>
        i === editingIndex ? { ...f, grams } : f,
      ));
    } else if (gramInputFood !== null) {
      // Add mode — append new food
      const newFood: BuilderFood = {
        key: `${gramInputFood.id}-${Date.now()}`,
        foodId: gramInputFood.id,
        foodName: gramInputFood.name,
        grams,
        proteinPer100g: gramInputFood.proteinPer100g,
        carbsPer100g: gramInputFood.carbsPer100g,
        fatPer100g: gramInputFood.fatPer100g,
      };
      setFoods(prev => [...prev, newFood]);
    }
    setGramInputVisible(false);
    setEditingIndex(null);
    setGramInputFood(null);
  }, [editingIndex, gramInputFood]);

  const handleGramDismiss = useCallback(() => {
    setGramInputVisible(false);
    setEditingIndex(null);
    setLastUsedGrams(null);
  }, []);

  // ── Date/time handlers ──────────────────────────────────────────────

  const handleDatePress = useCallback(() => {
    if (!showDateEdit) {
      setDateText(formatDateForInput(loggedAt));
      setTimeText(formatTimeForInput(loggedAt));
      setDateError(null);
    }
    setShowDateEdit(prev => !prev);
  }, [showDateEdit, loggedAt]);

  const handleDateChange = useCallback((text: string) => {
    setDateText(text);
    const parsedDate = parseDate(text);
    const parsedTime = parseTime(timeText);
    if (!parsedDate && text.length > 0) {
      setDateError('Use YYYY-MM-DD format');
      return;
    }
    setDateError(null);
    if (parsedDate && parsedTime) {
      setLoggedAt(new Date(
        parsedDate.year, parsedDate.month - 1, parsedDate.day,
        parsedTime.hours, parsedTime.minutes,
      ));
    }
  }, [timeText]);

  const handleTimeChange = useCallback((text: string) => {
    setTimeText(text);
    const parsedDate = parseDate(dateText);
    const parsedTime = parseTime(text);
    if (!parsedTime && text.length > 0) {
      setDateError('Use HH:MM format');
      return;
    }
    setDateError(null);
    if (parsedDate && parsedTime) {
      setLoggedAt(new Date(
        parsedDate.year, parsedDate.month - 1, parsedDate.day,
        parsedTime.hours, parsedTime.minutes,
      ));
    }
  }, [dateText]);

  // ── Log meal (D-16, D-17, D-18, T-39-07, T-39-10) ─────────────────

  const ctaLabel = mode === 'edit' ? 'SAVE CHANGES' : mode === 'library' ? 'SAVE TO LIBRARY' : 'LOG MEAL';

  const handleLogMeal = useCallback(async () => {
    if (!canLog || isSubmitting) { return; }
    setIsSubmitting(true);
    setError(null);

    try {
      const mealFoodInputs: MealFoodInput[] = foods.map(f => ({
        foodId: f.foodId,
        foodName: f.foodName,
        grams: f.grams,
        proteinPer100g: f.proteinPer100g,
        carbsPer100g: f.carbsPer100g,
        fatPer100g: f.fatPer100g,
      }));

      if (mode === 'edit' && editMealId != null) {
        await foodsDb.updateMealWithFoods(editMealId, description, mealType!, mealFoodInputs, loggedAt);
      } else {
        await foodsDb.addMealWithFoods(description, mealType!, mealFoodInputs, loggedAt);
      }

      // Light haptic feedback on success (D-18)
      Vibration.vibrate(10);

      // Navigate back — MacrosView useFocusEffect will refresh data (D-18)
      navigation.goBack();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to log meal. Please try again.');
      setIsSubmitting(false);
    }
  }, [canLog, isSubmitting, foods, description, mealType, loggedAt, navigation, mode, editMealId]);

  // ── FlatList render helpers ─────────────────────────────────────────

  const renderItem = useCallback(({ item, index }: { item: typeof computedFoods[0]; index: number }) => (
    <MealFoodCard
      foodName={item.foodName}
      grams={item.grams}
      protein={Number(item.protein.toFixed(1))}
      carbs={Number(item.carbs.toFixed(1))}
      fat={Number(item.fat.toFixed(1))}
      calories={item.calories}
      onRemove={() => handleRemoveFood(index)}
      onEdit={() => handleEditFood(index)}
    />
  ), [computedFoods, handleRemoveFood, handleEditFood]);

  const keyExtractor = useCallback((item: typeof computedFoods[0]) => item.key, []);

  const listSeparator = useCallback(() => <View style={styles.separator} />, []);

  const listHeader = useCallback(() => (
    <Text style={styles.sectionHeader}>FOODS ADDED</Text>
  ), []);

  const listFooter = useCallback(() => (
    <AddFoodButton onPress={handleAddFoodPress} />
  ), [handleAddFoodPress]);

  // ── FoodGramInput food prop (safe when null) ────────────────────────

  const gramInputFoodProp = gramInputFood
    ? {
        name: gramInputFood.name,
        proteinPer100g: gramInputFood.proteinPer100g,
        carbsPer100g: gramInputFood.carbsPer100g,
        fatPer100g: gramInputFood.fatPer100g,
      }
    : { name: '', proteinPer100g: 0, carbsPer100g: 0, fatPer100g: 0 };

  const gramInitialGrams = editingIndex !== null && foods[editingIndex] != null
    ? String(foods[editingIndex].grams)
    : undefined;

  // ── Render ──────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={styles.screen}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          accessibilityLabel="Go back"
          accessibilityRole="button">
          <Text style={styles.backButtonText}>{'<'}</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{mode === 'edit' ? 'EDIT MEAL' : 'BUILD MEAL'}</Text>
        <View style={styles.headerSpacer} />
      </View>

      {/* Food list or empty state */}
      {foods.length === 0 ? (
        <View style={styles.emptyWrapper}>
          <EmptyState onSearchPress={() => setSearchVisible(true)} />
        </View>
      ) : (
        <FlatList
          data={computedFoods}
          keyExtractor={keyExtractor}
          renderItem={renderItem}
          ItemSeparatorComponent={listSeparator}
          ListHeaderComponent={listHeader}
          ListFooterComponent={listFooter}
          contentContainerStyle={[
            styles.listContent,
            { paddingBottom: totalsBarHeight + spacing.lg },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Date edit section (shown above totals bar, in flow) */}
      {showDateEdit && (
        <DateEditSection
          dateText={dateText}
          timeText={timeText}
          dateError={dateError}
          onDateChange={handleDateChange}
          onTimeChange={handleTimeChange}
        />
      )}

      {/* Sticky bottom totals bar */}
      <MealTotalsBar
        totalProtein={Number(totalProtein.toFixed(1))}
        totalCarbs={Number(totalCarbs.toFixed(1))}
        totalFat={Number(totalFat.toFixed(1))}
        totalCalories={totalCalories}
        mealType={mealType}
        onMealTypeSelect={setMealType}
        description={description}
        onDescriptionChange={setDescription}
        loggedAt={loggedAt}
        onDatePress={handleDatePress}
        onLogMeal={handleLogMeal}
        isSubmitting={isSubmitting}
        canLog={canLog}
        error={error}
        onLayout={e => setTotalsBarHeight(e.nativeEvent.layout.height)}
        ctaLabel={ctaLabel}
      />

      {/* Gram input overlay (slide-up) */}
      <FoodGramInput
        food={gramInputFoodProp}
        visible={gramInputVisible}
        initialGrams={gramInitialGrams}
        lastUsedGrams={lastUsedGrams ?? undefined}
        buttonLabel={editingIndex !== null ? 'Update' : 'Add to Meal'}
        onSubmit={handleGramSubmit}
        onDismiss={handleGramDismiss}
      />

      {/* Food search modal overlay */}
      <FoodSearchModal
        visible={searchVisible}
        onClose={() => setSearchVisible(false)}
        onFoodSelected={handleFoodSelected}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  // ── Header ──────────────────────────────────────────────────────────
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.base,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
  },
  backButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backButtonText: {
    fontSize: fontSize.lg,
    color: colors.primary,
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: fontSize.lg,
    fontWeight: weightSemiBold,
    color: colors.primary,
  },
  headerSpacer: {
    width: 44,
  },
  // ── Food list ───────────────────────────────────────────────────────
  listContent: {
    paddingHorizontal: spacing.base,
  },
  sectionHeader: {
    fontSize: fontSize.sm,
    fontWeight: weightSemiBold,
    color: colors.secondary,
    letterSpacing: 1.2,
    marginBottom: spacing.sm,
    marginTop: spacing.md,
  },
  separator: {
    height: spacing.sm,
  },
  // ── Add food button (dashed-border card) ────────────────────────────
  addFoodButton: {
    backgroundColor: colors.accentDim,
    borderWidth: 1,
    borderColor: colors.accent,
    borderRadius: 14,
    paddingVertical: spacing.md,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.sm,
  },
  addFoodButtonText: {
    color: colors.accent,
    fontSize: fontSize.base,
    fontWeight: weightSemiBold,
  },
  // ── Empty state ─────────────────────────────────────────────────────
  emptyWrapper: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
  },
  emptyContainer: {
    alignItems: 'center',
    gap: spacing.sm,
  },
  emptyHeading: {
    fontSize: fontSize.md,
    fontWeight: weightSemiBold,
    color: colors.primary,
    textAlign: 'center',
  },
  emptyBody: {
    fontSize: fontSize.base,
    color: colors.secondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: spacing.md,
  },
  searchFoodsButton: {
    backgroundColor: colors.accentDim,
    borderWidth: 1,
    borderColor: colors.accent,
    borderRadius: 14,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchFoodsButtonText: {
    color: colors.accent,
    fontSize: fontSize.base,
    fontWeight: weightSemiBold,
  },
  // ── Date edit section ───────────────────────────────────────────────
  dateEditContainer: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.sm,
    backgroundColor: colors.surfaceElevated,
  },
  dateEditRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  dateEditField: {
    flex: 1,
  },
  dateEditLabel: {
    fontSize: fontSize.xs,
    color: colors.secondary,
    marginBottom: spacing.xs,
  },
  dateEditInput: {
    backgroundColor: colors.surface,
    borderRadius: 8,
    padding: spacing.md,
    fontSize: fontSize.base,
    color: colors.primary,
  },
  dateErrorText: {
    fontSize: fontSize.xs,
    color: colors.danger,
    marginTop: spacing.xs,
  },
});
