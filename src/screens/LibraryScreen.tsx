import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { ExerciseCategoryTabs } from '../components/ExerciseCategoryTabs';
import { ExerciseListItem } from '../components/ExerciseListItem';
import { deleteExercise, getExercisesByCategory, searchExercises } from '../db/exercises';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { fontSize, weightBold } from '../theme/typography';
import { Exercise, ExerciseCategory } from '../types';
import { AddExerciseModal } from './AddExerciseModal';

export function LibraryScreen() {
  const insets = useSafeAreaInsets();
  const [selectedCategory, setSelectedCategory] = useState<ExerciseCategory>('chest');
  const [searchQuery, setSearchQuery] = useState('');
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingExercise, setEditingExercise] = useState<Exercise | null>(null);
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadByCategory = useCallback(async (category: ExerciseCategory) => {
    setIsLoading(true);
    try {
      const results = await getExercisesByCategory(category);
      setExercises(results);
    } catch {
      // ignore load errors silently — list stays empty
    } finally {
      setIsLoading(false);
    }
  }, []);

  const loadBySearch = useCallback(async (query: string) => {
    setIsLoading(true);
    try {
      const results = await searchExercises(query);
      setExercises(results);
    } catch {
      // ignore
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Load by category on mount and when category changes (only when not searching)
  useEffect(() => {
    if (searchQuery.trim() === '') {
      loadByCategory(selectedCategory);
    }
  }, [selectedCategory, searchQuery, loadByCategory]);

  // Debounced search
  useEffect(() => {
    if (searchQuery.trim() === '') {
      return;
    }
    if (searchDebounceRef.current) {
      clearTimeout(searchDebounceRef.current);
    }
    searchDebounceRef.current = setTimeout(() => {
      loadBySearch(searchQuery.trim());
    }, 300);
    return () => {
      if (searchDebounceRef.current) {
        clearTimeout(searchDebounceRef.current);
      }
    };
  }, [searchQuery, loadBySearch]);

  const handleDelete = useCallback(
    async (id: number) => {
      try {
        await deleteExercise(id);
        // Refresh list after delete
        if (searchQuery.trim() !== '') {
          await loadBySearch(searchQuery.trim());
        } else {
          await loadByCategory(selectedCategory);
        }
      } catch {
        // If delete fails (e.g., preset exercise), ignore silently
      }
    },
    [searchQuery, selectedCategory, loadBySearch, loadByCategory],
  );

  const handleExerciseAdded = useCallback(
    (exercise: Exercise) => {
      if (editingExercise) {
        // Was an update — refresh the full list so moved exercises disappear/appear correctly
        if (searchQuery.trim() !== '') {
          loadBySearch(searchQuery.trim());
        } else {
          loadByCategory(selectedCategory);
        }
        setEditingExercise(null);
        return;
      }
      // Append new exercise to list so library updates immediately
      setExercises(prev => {
        // If searching, add only if it matches search
        if (searchQuery.trim() !== '') {
          if (exercise.name.toLowerCase().includes(searchQuery.trim().toLowerCase())) {
            return [...prev, exercise].sort((a, b) => a.name.localeCompare(b.name));
          }
          return prev;
        }
        // If showing category and the new exercise matches current category, add it
        if (exercise.category === selectedCategory) {
          return [...prev, exercise].sort((a, b) => a.name.localeCompare(b.name));
        }
        return prev;
      });
    },
    [editingExercise, searchQuery, selectedCategory, loadBySearch, loadByCategory],
  );

  const handleLongPress = useCallback((exercise: Exercise) => {
    setEditingExercise(exercise);
    setModalVisible(true);
  }, []);

  const renderItem = useCallback(
    ({ item }: { item: Exercise }) => (
      <ExerciseListItem
        exercise={item}
        onDelete={() => handleDelete(item.id)}
        onLongPress={() => handleLongPress(item)}
      />
    ),
    [handleDelete, handleLongPress],
  );

  const keyExtractor = useCallback((item: Exercise) => String(item.id), []);

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <View style={styles.header}>
        <Text style={styles.title}>Exercise Library</Text>
      </View>

      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search exercises..."
          placeholderTextColor={colors.secondary}
          value={searchQuery}
          onChangeText={setSearchQuery}
          returnKeyType="search"
          autoCapitalize="none"
          autoCorrect={false}
          clearButtonMode="while-editing"
        />
      </View>

      {searchQuery.trim() === '' ? (
        <ExerciseCategoryTabs selected={selectedCategory} onSelect={setSelectedCategory} />
      ) : null}

      {isLoading ? (
        <ActivityIndicator style={styles.loader} color={colors.accent} />
      ) : exercises.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No exercises in this category</Text>
          <Text style={styles.emptyHint}>Tap + to add a custom exercise</Text>
        </View>
      ) : (
        <FlatList
          data={exercises}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          style={styles.list}
        />
      )}

      <TouchableOpacity
        style={[styles.fab, { bottom: spacing.xl + insets.bottom }]}
        onPress={() => setModalVisible(true)}>
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>

      <AddExerciseModal
        visible={modalVisible}
        onClose={() => {
          setModalVisible(false);
          setEditingExercise(null);
        }}
        onAdded={handleExerciseAdded}
        editExercise={editingExercise}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    paddingHorizontal: spacing.base,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
  },
  title: {
    fontSize: fontSize.lg,
    fontWeight: weightBold,
    color: colors.primary,
  },
  searchContainer: {
    paddingHorizontal: spacing.base,
    paddingBottom: spacing.sm,
  },
  searchInput: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    paddingHorizontal: spacing.base,
    paddingVertical: 14,
    color: colors.primary,
    fontSize: fontSize.base,
    minHeight: 48,
  },
  list: {
    flex: 1,
  },
  loader: {
    flex: 1,
    alignSelf: 'center',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  emptyText: {
    fontSize: fontSize.base,
    color: colors.secondary,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  emptyHint: {
    fontSize: fontSize.sm,
    color: colors.secondary,
    textAlign: 'center',
  },
  fab: {
    position: 'absolute',
    right: spacing.base,
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  fabText: {
    fontSize: fontSize.xl,
    color: colors.background,
    fontWeight: weightBold,
    lineHeight: 28,
  },
});
