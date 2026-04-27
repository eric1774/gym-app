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
import { WarmupTemplateListScreen } from './WarmupTemplateListScreen';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ExerciseCategoryTabs } from '../components/ExerciseCategoryTabs';
import { ExerciseListItem } from '../components/ExerciseListItem';
import { MintRadial } from '../components/MintRadial';
import { Plus } from '../components/icons/Plus';
import { SearchIcon } from '../components/icons/SearchIcon';
import { deleteExercise, searchExercises } from '../db/exercises';
import { getExercisesByCategoryViaGroups } from '../db/muscleGroups';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { fontSize, weightBold } from '../theme/typography';
import { Exercise, ExerciseCategory } from '../types';
import { AddExerciseModal } from './AddExerciseModal';

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function LibraryScreen() {
  const [activeSubTab, setActiveSubTab] = useState<'exercises' | 'warmups'>('exercises');
  const [selectedCategory, setSelectedCategory] = useState<ExerciseCategory>('chest');
  const [searchQuery, setSearchQuery] = useState('');
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [newTemplateModalVisible, setNewTemplateModalVisible] = useState(false);
  const [editingExercise, setEditingExercise] = useState<Exercise | null>(null);
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadByCategory = useCallback(async (category: ExerciseCategory) => {
    setIsLoading(true);
    try {
      const results = await getExercisesByCategoryViaGroups(category);
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

  const isSearching = searchQuery.trim() !== '';
  const sectionLabel = isSearching
    ? `SEARCH · "${searchQuery.trim().toUpperCase()}"`
    : `FILTERED · ${selectedCategory.toUpperCase()}`;

  const handleAddPress = useCallback(() => {
    if (activeSubTab === 'warmups') {
      setNewTemplateModalVisible(true);
    } else {
      setModalVisible(true);
    }
  }, [activeSubTab]);

  const subTabActiveColor =
    activeSubTab === 'warmups' ? colors.warmupAmber : colors.accent;

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <MintRadial corner="tl" />
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.eyebrow}>TRAINING</Text>
            <Text style={styles.title}>Library</Text>
          </View>
          <TouchableOpacity
            style={styles.addButton}
            onPress={handleAddPress}
            hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
            accessibilityLabel="Add"
            accessibilityRole="button">
            <Plus size={20} color={colors.onAccent} />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.subTabBar}>
        <TouchableOpacity
          style={[
            styles.subTab,
            activeSubTab === 'exercises' && { borderBottomWidth: 2, borderBottomColor: subTabActiveColor, marginBottom: -2 },
          ]}
          onPress={() => setActiveSubTab('exercises')}>
          <Text style={[styles.subTabText, activeSubTab === 'exercises' && { color: subTabActiveColor }]}>
            Exercises
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.subTab,
            activeSubTab === 'warmups' && { borderBottomWidth: 2, borderBottomColor: subTabActiveColor, marginBottom: -2 },
          ]}
          onPress={() => setActiveSubTab('warmups')}>
          <Text style={[styles.subTabText, activeSubTab === 'warmups' && { color: subTabActiveColor }]}>
            Warmups
          </Text>
        </TouchableOpacity>
      </View>

      {activeSubTab === 'warmups' ? (
        <WarmupTemplateListScreen
          newNameModalVisible={newTemplateModalVisible}
          onCloseNewNameModal={() => setNewTemplateModalVisible(false)}
        />
      ) : (
        <>
      <View style={styles.searchContainer}>
        <View style={styles.searchInputWrapper}>
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
          <View style={styles.searchIcon} pointerEvents="none">
            <SearchIcon size={16} color={colors.secondary} />
          </View>
        </View>
      </View>

      {!isSearching && (
        <ExerciseCategoryTabs selected={selectedCategory} onSelect={setSelectedCategory} />
      )}

      <View style={styles.sectionEyebrow}>
        <Text style={styles.sectionEyebrowText}>{sectionLabel}</Text>
        <Text style={styles.sectionEyebrowCount}>{exercises.length}</Text>
      </View>

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
          contentContainerStyle={styles.listContent}
          style={styles.list}
        />
      )}

      <AddExerciseModal
        visible={modalVisible}
        onClose={() => {
          setModalVisible(false);
          setEditingExercise(null);
        }}
        onAdded={handleExerciseAdded}
        editExercise={editingExercise}
      />
        </>
      )}
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
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  eyebrow: {
    color: colors.accent,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 2.2,
    marginBottom: 4,
  },
  title: {
    fontSize: 30,
    fontWeight: '900',
    letterSpacing: -0.6,
    lineHeight: 30,
    color: colors.primary,
  },
  addButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchContainer: {
    paddingHorizontal: spacing.base,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  searchInputWrapper: {
    position: 'relative',
    justifyContent: 'center',
  },
  searchInput: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm + 2,
    paddingRight: 40,
    color: colors.primary,
    fontSize: fontSize.base,
  },
  searchIcon: {
    position: 'absolute',
    right: spacing.md,
    opacity: 0.6,
  },
  sectionEyebrow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.base + 2,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  sectionEyebrowText: {
    color: colors.secondaryDim,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.6,
  },
  sectionEyebrowCount: {
    color: colors.secondary,
    fontSize: 10,
    fontWeight: '700',
  },
  list: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: spacing.base,
    paddingBottom: spacing.xxl,
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
  subTabBar: {
    flexDirection: 'row',
    borderBottomWidth: 2,
    borderBottomColor: colors.border,
  },
  subTab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.sm + 2,
  },
  subTabText: {
    color: colors.secondary,
    fontSize: fontSize.sm,
    fontWeight: '600',
  },
});
