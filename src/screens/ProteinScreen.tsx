import React, { useState, useCallback } from 'react';
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
import { getProteinGoal, getTodayProteinTotal, getMealsByDate, deleteMeal } from '../db';
import { getLocalDateString } from '../utils/dates';
import { Meal } from '../types';
import { GoalSetupForm } from '../components/GoalSetupForm';
import { MealListItem } from '../components/MealListItem';
import { ProteinChart } from '../components/ProteinChart';
import { ProteinProgressBar } from '../components/ProteinProgressBar';
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

  const refreshData = useCallback(async () => {
    const [fetchedGoal, fetchedTotal, fetchedMeals] = await Promise.all([
      getProteinGoal(),
      getTodayProteinTotal(),
      getMealsByDate(getLocalDateString()),
    ]);
    setGoal(fetchedGoal);
    setTodayTotal(fetchedTotal);
    setMeals(fetchedMeals);
  }, []);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;

      async function load() {
        const [fetchedGoal, fetchedTotal, fetchedMeals] = await Promise.all([
          getProteinGoal(),
          getTodayProteinTotal(),
          getMealsByDate(getLocalDateString()),
        ]);
        if (!cancelled) {
          setGoal(fetchedGoal);
          setTodayTotal(fetchedTotal);
          setMeals(fetchedMeals);
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

  const ListHeader = useCallback(() => (
    <View>
      <ProteinProgressBar
        goal={goal!}
        current={todayTotal}
        onGoalChanged={(g) => {
          setGoal(g);
        }}
      />

      <TouchableOpacity style={styles.addMealButton} onPress={handleAddMeal}>
        <Text style={styles.addMealButtonText}>Add Meal</Text>
      </TouchableOpacity>

      <ProteinChart goal={goal!} />

      <Text style={styles.sectionTitle}>Today's Meals</Text>
    </View>
  ), [goal, todayTotal, handleAddMeal]);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.title}>Protein</Text>
      </View>

      <FlatList
        data={meals}
        renderItem={renderMealItem}
        keyExtractor={keyExtractor}
        ListHeaderComponent={ListHeader}
        ListEmptyComponent={
          <Text style={styles.emptyText}>No meals logged today</Text>
        }
        style={styles.mealList}
        contentContainerStyle={meals.length === 0 ? styles.emptyContainer : undefined}
      />

      <AddMealModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
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
});
