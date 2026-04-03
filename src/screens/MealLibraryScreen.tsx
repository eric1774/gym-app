import React, { useState, useCallback, useRef } from 'react';
import {
  Alert,
  Animated,
  PanResponder,
  SectionList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { macrosDb } from '../db';
import { MacroLibraryMeal, MealType, MEAL_TYPES } from '../types';
import { AddLibraryMealModal } from './AddLibraryMealModal';
import { MacroPills } from '../components/MacroPills';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { fontSize, weightBold, weightSemiBold } from '../theme/typography';

interface MealSection {
  title: string;
  data: MacroLibraryMeal[];
  mealType: MealType;
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

const DELETE_THRESHOLD = -80;

interface LibraryMealRowProps {
  meal: MacroLibraryMeal;
  onTap: (meal: MacroLibraryMeal) => void;
  onDelete: (meal: MacroLibraryMeal) => void;
}

const LibraryMealRow = React.memo(function LibraryMealRow({
  meal,
  onTap,
  onDelete,
}: LibraryMealRowProps) {
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
    <View style={styles.rowOuter}>
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
          onPress={() => onTap(meal)}
          activeOpacity={0.7}>
          <View style={styles.rowInner}>
            <Text style={styles.mealName} numberOfLines={1}>
              {meal.name}
            </Text>
            <MacroPills protein={meal.protein} carbs={meal.carbs} fat={meal.fat} />
          </View>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
});

export function MealLibraryScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const [sections, setSections] = useState<MealSection[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadData = useCallback(async () => {
    const byType = await macrosDb.getLibraryMealsByType();
    const built: MealSection[] = [];
    for (const mt of MEAL_TYPES) {
      const meals = byType[mt];
      if (meals.length > 0) {
        built.push({ title: capitalize(mt), data: meals, mealType: mt });
      }
    }
    setSections(built);
  }, []);

  const refreshData = useCallback(async () => {
    await loadData();
  }, [loadData]);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;

      async function load() {
        const byType = await macrosDb.getLibraryMealsByType();
        if (cancelled) { return; }
        const built: MealSection[] = [];
        for (const mt of MEAL_TYPES) {
          const meals = byType[mt];
          if (meals.length > 0) {
            built.push({ title: capitalize(mt), data: meals, mealType: mt });
          }
        }
        setSections(built);
        setIsLoading(false);
      }

      load();
      return () => {
        cancelled = true;
      };
    }, []),
  );

  const handleTapMeal = useCallback(async (meal: MacroLibraryMeal) => {
    try {
      await macrosDb.addMeal(
        meal.name,
        meal.mealType,
        { protein: meal.protein, carbs: meal.carbs, fat: meal.fat },
      );
      setToastMessage(`Logged: ${meal.name}`);
      setTimeout(() => setToastMessage(null), 2000);
    } catch (_err) {
      Alert.alert('Error', 'Failed to log meal');
    }
  }, []);

  const handleDeleteMeal = useCallback(
    (meal: MacroLibraryMeal) => {
      Alert.alert(
        'Delete Library Meal',
        `Remove "${meal.name}" from your library?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: async () => {
              try {
                await macrosDb.deleteLibraryMeal(meal.id);
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

  const renderItem = useCallback(
    ({ item }: { item: MacroLibraryMeal }) => (
      <LibraryMealRow meal={item} onTap={handleTapMeal} onDelete={handleDeleteMeal} />
    ),
    [handleTapMeal, handleDeleteMeal],
  );

  const renderSectionHeader = useCallback(
    ({ section }: { section: MealSection }) => (
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionHeaderText}>{section.title}</Text>
      </View>
    ),
    [],
  );

  const keyExtractor = useCallback((item: MacroLibraryMeal) => String(item.id), []);

  const handleOpenModal = useCallback(() => {
    setModalVisible(true);
  }, []);

  const handleCloseModal = useCallback(() => {
    setModalVisible(false);
  }, []);

  const handleSaved = useCallback(() => {
    setModalVisible(false);
    refreshData();
  }, [refreshData]);

  const emptyComponent = !isLoading ? (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyText}>No saved meals yet</Text>
      <TouchableOpacity style={styles.emptyAddButton} onPress={handleOpenModal}>
        <Text style={styles.emptyAddButtonText}>Add Meal</Text>
      </TouchableOpacity>
    </View>
  ) : null;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          <Text style={styles.backButtonText}>&#8249;</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Meal Library</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={handleOpenModal}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          <Text style={styles.addButtonText}>+</Text>
        </TouchableOpacity>
      </View>

      <SectionList
        sections={sections}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        renderSectionHeader={renderSectionHeader}
        ListEmptyComponent={emptyComponent}
        stickySectionHeadersEnabled={false}
        contentContainerStyle={sections.length === 0 ? styles.emptyListContent : undefined}
      />

      {toastMessage && (
        <View style={styles.toast}>
          <Text style={styles.toastText}>{toastMessage}</Text>
        </View>
      )}

      <AddLibraryMealModal
        visible={modalVisible}
        onClose={handleCloseModal}
        onSaved={handleSaved}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.base,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  backButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backButtonText: {
    fontSize: fontSize.xl,
    color: colors.accent,
    fontWeight: weightBold,
  },
  headerTitle: {
    flex: 1,
    fontSize: fontSize.lg,
    fontWeight: weightBold,
    color: colors.primary,
    textAlign: 'center',
  },
  addButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addButtonText: {
    fontSize: fontSize.xl,
    color: colors.accent,
    fontWeight: weightBold,
  },
  sectionHeader: {
    paddingHorizontal: spacing.base,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xs,
    backgroundColor: colors.background,
  },
  sectionHeaderText: {
    fontSize: fontSize.sm,
    color: colors.secondary,
    fontWeight: weightSemiBold,
  },
  rowOuter: {
    position: 'relative',
    overflow: 'hidden',
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
    paddingHorizontal: spacing.base,
    paddingVertical: 14,
    minHeight: 48,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  rowInner: {
    flex: 1,
  },
  mealName: {
    fontSize: fontSize.base,
    fontWeight: weightSemiBold,
    color: colors.primary,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingTop: spacing.xxxl,
  },
  emptyText: {
    fontSize: fontSize.base,
    color: colors.secondary,
    marginBottom: spacing.lg,
  },
  emptyAddButton: {
    backgroundColor: colors.accent,
    borderRadius: 12,
    paddingVertical: spacing.base,
    paddingHorizontal: spacing.xxl,
    alignItems: 'center',
  },
  emptyAddButtonText: {
    color: colors.background,
    fontSize: fontSize.base,
    fontWeight: weightSemiBold,
  },
  emptyListContent: {
    flexGrow: 1,
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
