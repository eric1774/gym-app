import React, { useState, useCallback, useMemo } from 'react';
import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ProteinStackParamList } from '../navigation/TabNavigator';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { macrosDb } from '../db';
import { getLocalDateString } from '../utils/dates';
import { MacroMeal, MacroSettings, MacroValues } from '../types';
import { MacroProgressCard } from '../components/MacroProgressCard';
import { MacroGoalSetupForm } from '../components/MacroGoalSetupForm';
import { MacroChart } from '../components/MacroChart';
import { MealListItem } from '../components/MealListItem';
import { StreakAverageRow } from '../components/StreakAverageRow';
import { AddMealModal } from './AddMealModal';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { fontSize, weightBold, weightSemiBold } from '../theme/typography';

export function ProteinScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NativeStackNavigationProp<ProteinStackParamList>>();
  const [goals, setGoals] = useState<MacroSettings | null>(null);
  const [todayTotals, setTodayTotals] = useState<MacroValues>({ protein: 0, carbs: 0, fat: 0 });
  const [meals, setMeals] = useState<MacroMeal[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingMeal, setEditingMeal] = useState<MacroMeal | null>(null);
  const [average, setAverage] = useState<number | null>(null);
  const [streak, setStreak] = useState(0);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [chartRefreshKey, setChartRefreshKey] = useState(0);
  const [selectedDate, setSelectedDate] = useState(getLocalDateString());

  const isToday = selectedDate === getLocalDateString();

  const dateLabel = useMemo(() => {
    if (isToday) return 'Today';
    const d = new Date(selectedDate + 'T12:00:00');
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${days[d.getDay()]}, ${months[d.getMonth()]} ${d.getDate()}`;
  }, [selectedDate, isToday]);

  const refreshData = useCallback(async () => {
    const [fetchedGoals, fetchedTotals, fetchedMeals, fetchedAverage, fetchedStreak] = await Promise.all([
      macrosDb.getMacroGoals(),
      macrosDb.getTodayMacroTotals(),
      macrosDb.getMealsByDate(selectedDate),
      macrosDb.get7DayAverage(),
      macrosDb.getStreakDays(),
    ]);
    setGoals(fetchedGoals);
    setTodayTotals(fetchedTotals);
    setMeals(fetchedMeals);
    setAverage(fetchedAverage?.protein ?? null);
    setStreak(fetchedStreak);
    setChartRefreshKey(k => k + 1);
  }, [selectedDate]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await refreshData();
    setRefreshing(false);
  }, [refreshData]);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      setSelectedDate(getLocalDateString());
      async function load() {
        const today = getLocalDateString();
        const [fetchedGoals, fetchedTotals, fetchedMeals, fetchedAverage, fetchedStreak] = await Promise.all([
          macrosDb.getMacroGoals(),
          macrosDb.getTodayMacroTotals(),
          macrosDb.getMealsByDate(today),
          macrosDb.get7DayAverage(),
          macrosDb.getStreakDays(),
        ]);
        if (!cancelled) {
          setGoals(fetchedGoals);
          setTodayTotals(fetchedTotals);
          setMeals(fetchedMeals);
          setAverage(fetchedAverage?.protein ?? null);
          setStreak(fetchedStreak);
          setIsLoading(false);
        }
      }
      load();
      return () => { cancelled = true; };
    }, []),
  );

  const handlePrevDay = useCallback(() => {
    const d = new Date(selectedDate + 'T12:00:00');
    d.setDate(d.getDate() - 1);
    const newDate = getLocalDateString(d);
    setSelectedDate(newDate);
    macrosDb.getMealsByDate(newDate).then(setMeals);
  }, [selectedDate]);

  const handleNextDay = useCallback(() => {
    if (isToday) return;
    const d = new Date(selectedDate + 'T12:00:00');
    d.setDate(d.getDate() + 1);
    const newDate = getLocalDateString(d);
    setSelectedDate(newDate);
    macrosDb.getMealsByDate(newDate).then(setMeals);
  }, [selectedDate, isToday]);

  const handleAddMeal = useCallback(() => {
    setEditingMeal(null);
    setModalVisible(true);
  }, []);

  const handleEdit = useCallback((meal: MacroMeal) => {
    setEditingMeal(meal);
    setModalVisible(true);
  }, []);

  const handleDelete = useCallback(
    (meal: MacroMeal) => {
      Alert.alert(
        'Delete Meal',
        `Delete this ${meal.mealType} entry?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: async () => {
              try {
                await macrosDb.deleteMeal(meal.id);
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

  const handleCloseModal = useCallback(() => {
    setModalVisible(false);
  }, []);

  if (isLoading) {
    return (
      <View style={[styles.centered, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  if (goals === null) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <Text style={styles.title}>Protein</Text>
        </View>
        <MacroGoalSetupForm
          onGoalSet={() => refreshData()}
        />
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.title}>Protein</Text>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.accent} colors={[colors.accent]} />
        }
      >
        <MacroProgressCard
          goals={goals}
          todayTotals={todayTotals}
          onGoalChanged={() => refreshData()}
        />

        <StreakAverageRow streak={streak} average={average} />

        <TouchableOpacity style={styles.addMealButton} onPress={() => navigation.navigate('MealLibrary')}>
          <Text style={styles.addMealButtonText}>Meal Library</Text>
        </TouchableOpacity>

        {/* LOGS */}
        <View style={styles.logsSection}>
          <Text style={styles.sectionHeader}>{isToday ? "TODAY'S LOGS" : 'LOGS'}</Text>
          <View style={styles.dateNav}>
            <TouchableOpacity onPress={handlePrevDay} style={styles.dateNavArrow} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
              <Text style={styles.dateNavArrowText}>{'\u2039'}</Text>
            </TouchableOpacity>
            <Text style={styles.dateNavLabel}>{dateLabel}</Text>
            <TouchableOpacity onPress={handleNextDay} style={styles.dateNavArrow} disabled={isToday} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
              <Text style={[styles.dateNavArrowText, isToday && styles.dateNavArrowDisabled]}>{'\u203A'}</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.logsContainer}>
            {meals.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>{isToday ? 'No meals logged today' : 'No meals logged'}</Text>
              </View>
            ) : (
              meals.map((meal, index) => (
                <MealListItem
                  key={meal.id}
                  meal={meal}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                  isLast={index === meals.length - 1}
                />
              ))
            )}
          </View>
        </View>

        <MacroChart goals={goals} refreshKey={chartRefreshKey} />
      </ScrollView>

      {/* FAB */}
      <TouchableOpacity style={styles.fab} onPress={handleAddMeal} activeOpacity={0.8}>
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>

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
    fontSize: fontSize.xl,
    fontWeight: weightBold,
    color: colors.primary,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  addMealButton: {
    backgroundColor: colors.accent,
    borderRadius: 12,
    paddingVertical: spacing.md,
    alignItems: 'center',
    marginHorizontal: spacing.base,
    marginTop: spacing.lg,
    minHeight: 44,
    justifyContent: 'center',
  },
  addMealButtonText: {
    color: colors.onAccent,
    fontSize: fontSize.base,
    fontWeight: weightBold,
  },
  sectionHeader: {
    fontSize: fontSize.sm,
    fontWeight: weightBold,
    color: colors.secondary,
    letterSpacing: 1.2,
    marginBottom: spacing.sm,
  },
  logsSection: {
    marginTop: spacing.xl,
    paddingHorizontal: spacing.base,
    marginBottom: spacing.lg,
  },
  dateNav: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  dateNavArrow: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dateNavArrowText: {
    fontSize: fontSize.xl,
    color: colors.accent,
    fontWeight: weightBold,
  },
  dateNavArrowDisabled: {
    opacity: 0.25,
  },
  dateNavLabel: {
    flex: 1,
    color: colors.primary,
    fontSize: fontSize.base,
    fontWeight: weightSemiBold,
    textAlign: 'center',
  },
  logsContainer: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  emptyContainer: {
    paddingVertical: spacing.xl,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: fontSize.sm,
    color: colors.secondary,
    textAlign: 'center',
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 20,
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  fabText: {
    fontSize: 24,
    color: colors.onAccent,
    fontWeight: weightBold,
    marginTop: -2,
  },
  toast: {
    position: 'absolute',
    bottom: 90,
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
