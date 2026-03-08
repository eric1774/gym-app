import React, { useState, useCallback, useMemo } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getProteinGoal, getTodayProteinTotal, getMealsByDate, deleteMeal, addMeal, getStreakDays, get7DayAverage, getRecentDistinctMeals } from '../db';
import { getLocalDateString } from '../utils/dates';
import { Meal, MealType } from '../types';
import { GoalSetupForm } from '../components/GoalSetupForm';
import { MealListItem } from '../components/MealListItem';
import { ProteinChart } from '../components/ProteinChart';
import { ProteinProgressBar } from '../components/ProteinProgressBar';
import { StreakAverageRow } from '../components/StreakAverageRow';
import { QuickAddButtons } from '../components/QuickAddButtons';
import { AddMealModal } from './AddMealModal';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { fontSize, weightBold, weightSemiBold } from '../theme/typography';

export function ProteinScreen() {
  const insets = useSafeAreaInsets();
  const [goal, setGoal] = useState<number | null>(null);
  const [todayTotal, setTodayTotal] = useState(0);
  const [meals, setMeals] = useState<Meal[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingMeal, setEditingMeal] = useState<Meal | null>(null);
  const [streak, setStreak] = useState(0);
  const [average, setAverage] = useState<number | null>(null);
  const [recentMeals, setRecentMeals] = useState<Array<{ description: string; proteinGrams: number; mealType: MealType }>>([]);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const refreshData = useCallback(async () => {
    const [fetchedGoal, fetchedTotal, fetchedMeals, fetchedStreak, fetchedAverage, fetchedRecent] = await Promise.all([
      getProteinGoal(),
      getTodayProteinTotal(),
      getMealsByDate(getLocalDateString()),
      getStreakDays(),
      get7DayAverage(),
      getRecentDistinctMeals(),
    ]);
    setGoal(fetchedGoal);
    setTodayTotal(fetchedTotal);
    setMeals(fetchedMeals);
    setStreak(fetchedStreak);
    setAverage(fetchedAverage);
    setRecentMeals(fetchedRecent);
  }, []);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;

      async function load() {
        const [fetchedGoal, fetchedTotal, fetchedMeals, fetchedStreak, fetchedAverage, fetchedRecent] = await Promise.all([
          getProteinGoal(),
          getTodayProteinTotal(),
          getMealsByDate(getLocalDateString()),
          getStreakDays(),
          get7DayAverage(),
          getRecentDistinctMeals(),
        ]);
        if (!cancelled) {
          setGoal(fetchedGoal);
          setTodayTotal(fetchedTotal);
          setMeals(fetchedMeals);
          setStreak(fetchedStreak);
          setAverage(fetchedAverage);
          setRecentMeals(fetchedRecent);
          setIsLoading(false);
        }
      }

      load();
      return () => {
        cancelled = true;
      };
    }, []),
  );

  const handleAddMeal = useCallback(() => {
    setEditingMeal(null);
    setModalVisible(true);
  }, []);

  const handleEdit = useCallback((meal: Meal) => {
    setEditingMeal(meal);
    setModalVisible(true);
  }, []);

  const handleDelete = useCallback(
    (meal: Meal) => {
      Alert.alert(
        'Delete Meal',
        `Delete this ${meal.mealType} entry (${meal.proteinGrams}g)?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: async () => {
              try {
                await deleteMeal(meal.id);
                await refreshData();
              } catch (_err) {
                Alert.alert('Error', 'Failed to delete meal');
              }
            },
          },
        ],
      );
    },
    [refreshData],
  );

  const handleMealSaved = useCallback(() => {
    refreshData();
  }, [refreshData]);

  const renderMealItem = useCallback(
    ({ item }: { item: Meal }) => (
      <MealListItem meal={item} onEdit={handleEdit} onDelete={handleDelete} />
    ),
    [handleEdit, handleDelete],
  );

  const keyExtractor = useCallback((item: Meal) => String(item.id), []);

  const handleCloseModal = useCallback(() => {
    setModalVisible(false);
  }, []);

  const handleGoalChanged = useCallback((g: number) => {
    setGoal(g);
  }, []);

  const handleQuickAdd = useCallback(async (meal: { description: string; proteinGrams: number; mealType: MealType }) => {
    try {
      await addMeal(meal.proteinGrams, meal.description, meal.mealType);
      setToastMessage(`${meal.description} ${meal.proteinGrams}g logged`);
      setTimeout(() => setToastMessage(null), 2000);
      await refreshData();
    } catch (_err) {
      Alert.alert('Error', 'Failed to log meal');
    }
  }, [refreshData]);

  // Memoize as a JSX element (not a component function) so FlatList gets a
  // stable reference and never unmounts/remounts the header on parent re-renders.
  const listHeader = useMemo(() => {
    if (goal === null) { return null; }
    return (
      <View>
        <ProteinProgressBar
          goal={goal}
          current={todayTotal}
          onGoalChanged={handleGoalChanged}
        />

        <StreakAverageRow streak={streak} average={average} />

        <TouchableOpacity style={styles.addMealButton} onPress={handleAddMeal}>
          <Text style={styles.addMealButtonText}>Add Meal</Text>
        </TouchableOpacity>

        <QuickAddButtons meals={recentMeals} onQuickAdd={handleQuickAdd} />

        <ProteinChart goal={goal} />

        <Text style={styles.sectionTitle}>Today's Meals</Text>
      </View>
    );
  }, [goal, todayTotal, handleAddMeal, handleGoalChanged, streak, average, recentMeals, handleQuickAdd]);

  if (isLoading) {
    return (
      <View style={[styles.centered, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  if (goal === null) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <Text style={styles.title}>Protein</Text>
        </View>
        <GoalSetupForm
          onGoalSet={(g) => {
            setGoal(g);
            refreshData();
          }}
        />
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.title}>Protein</Text>
      </View>

      <FlatList
        data={meals}
        renderItem={renderMealItem}
        keyExtractor={keyExtractor}
        ListHeaderComponent={listHeader}
        ListEmptyComponent={
          <Text style={styles.emptyText}>No meals logged today</Text>
        }
        style={styles.mealList}
        contentContainerStyle={meals.length === 0 ? styles.emptyContainer : undefined}
      />

      {toastMessage && (
        <View style={styles.toast}>
          <Text style={styles.toastText}>{toastMessage}</Text>
        </View>
      )}

      <AddMealModal
        visible={modalVisible}
        onClose={handleCloseModal}
        onSaved={handleMealSaved}
        editMeal={editingMeal}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  centered: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    paddingHorizontal: spacing.base,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  title: {
    fontSize: fontSize.lg,
    fontWeight: weightBold,
    color: colors.primary,
  },
  addMealButton: {
    backgroundColor: colors.accent,
    borderRadius: 12,
    paddingVertical: spacing.base,
    alignItems: 'center',
    marginHorizontal: spacing.base,
    marginTop: spacing.base,
  },
  addMealButtonText: {
    color: colors.background,
    fontSize: fontSize.base,
    fontWeight: weightSemiBold,
  },
  mealList: {
    flex: 1,
  },
  sectionTitle: {
    color: colors.primary,
    fontSize: fontSize.md,
    fontWeight: weightBold,
    marginHorizontal: spacing.base,
    marginTop: spacing.lg,
    marginBottom: spacing.md,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingTop: spacing.xl,
  },
  emptyText: {
    fontSize: fontSize.sm,
    color: colors.secondary,
    textAlign: 'center',
  },
  toast: {
    position: 'absolute',
    bottom: 80,
    alignSelf: 'center',
    backgroundColor: colors.surfaceElevated,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
  },
  toastText: {
    color: colors.primary,
    fontSize: fontSize.sm,
  },
});
