import React, { useState, useCallback } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getProteinGoal, getTodayProteinTotal, getMealsByDate } from '../db';
import { getLocalDateString } from '../utils/dates';
import { Meal } from '../types';
import { GoalSetupForm } from '../components/GoalSetupForm';
import { ProteinProgressBar } from '../components/ProteinProgressBar';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { fontSize, weightBold, weightSemiBold } from '../theme/typography';

export function ProteinScreen() {
  const insets = useSafeAreaInsets();
  const [goal, setGoal] = useState<number | null>(null);
  const [todayTotal, setTodayTotal] = useState(0);
  const [meals, setMeals] = useState<Meal[]>([]);
  const [isLoading, setIsLoading] = useState(true);

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

      <ProteinProgressBar
        goal={goal}
        current={todayTotal}
        onGoalChanged={(g) => {
          setGoal(g);
        }}
      />

      <TouchableOpacity style={styles.addMealButton} onPress={() => {}}>
        <Text style={styles.addMealButtonText}>Add Meal</Text>
      </TouchableOpacity>

      <View style={styles.mealListArea}>
        {meals.length === 0 ? (
          <Text style={styles.emptyText}>No meals logged today</Text>
        ) : (
          meals.map((meal) => (
            <View key={meal.id} style={styles.mealRow}>
              <Text style={styles.mealDescription}>{meal.description}</Text>
              <Text style={styles.mealGrams}>{meal.proteinGrams}g</Text>
            </View>
          ))
        )}
      </View>
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
  mealListArea: {
    marginTop: spacing.lg,
    paddingHorizontal: spacing.base,
  },
  emptyText: {
    fontSize: fontSize.sm,
    color: colors.secondary,
    textAlign: 'center',
    marginTop: spacing.xl,
  },
  mealRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 8,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  mealDescription: {
    fontSize: fontSize.base,
    color: colors.primary,
    flex: 1,
  },
  mealGrams: {
    fontSize: fontSize.base,
    fontWeight: weightSemiBold,
    color: colors.accent,
    marginLeft: spacing.sm,
  },
});
