import React, { useCallback, useEffect, useState } from 'react';
import {
  Dimensions,
  FlatList,
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { ExerciseCategoryTabs } from '../components/ExerciseCategoryTabs';
import { ExerciseListItem } from '../components/ExerciseListItem';
import { useSession } from '../context/SessionContext';
import { getExercisesByCategory, searchExercises } from '../db/exercises';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { fontSize, weightBold, weightSemiBold } from '../theme/typography';
import { Exercise, ExerciseCategory } from '../types';
import { AddExerciseModal } from './AddExerciseModal';

const SCREEN_HEIGHT = Dimensions.get('window').height;

export interface ExercisePickerSheetProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (exercise: Exercise) => void;
}

export function ExercisePickerSheet({ visible, onClose, onSelect }: ExercisePickerSheetProps) {
  const { sessionExercises } = useSession();
  const [category, setCategory] = useState<ExerciseCategory>('chest');
  const [query, setQuery] = useState('');
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [addModalVisible, setAddModalVisible] = useState(false);

  const addedIds = new Set(sessionExercises.map(se => se.exerciseId));

  const loadExercises = useCallback(async () => {
    try {
      if (query.trim().length > 0) {
        const results = await searchExercises(query.trim());
        setExercises(results);
      } else {
        const results = await getExercisesByCategory(category);
        setExercises(results);
      }
    } catch {
      // ignore load errors
    }
  }, [category, query]);

  // Reload when sheet becomes visible, category changes, or query changes
  useEffect(() => {
    if (visible) {
      loadExercises();
    }
  }, [visible, loadExercises]);

  // Reset state when sheet closes
  useEffect(() => {
    if (!visible) {
      setQuery('');
      setCategory('chest');
      setExercises([]);
    }
  }, [visible]);

  const handleSelect = useCallback(
    (exercise: Exercise) => {
      onSelect(exercise);
      onClose();
    },
    [onSelect, onClose],
  );

  const handleExerciseAdded = useCallback(
    (exercise: Exercise) => {
      // Select and close immediately after creating a new exercise
      onSelect(exercise);
      onClose();
    },
    [onSelect, onClose],
  );

  const isSearchActive = query.trim().length > 0;

  // Exercises not yet in the session
  const availableExercises = exercises.filter(ex => !addedIds.has(ex.id));
  const allAdded = exercises.length > 0 && availableExercises.length === 0;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}>
      {/* Dark overlay — tap to close */}
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay} />
      </TouchableWithoutFeedback>

      {/* Bottom sheet */}
      <View style={styles.sheet}>
        {/* Handle bar */}
        <View style={styles.handle} />

        {/* Header */}
        <View style={styles.sheetHeader}>
          <Text style={styles.sheetTitle}>Add Exercise</Text>
          <TouchableOpacity onPress={onClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Text style={styles.closeButton}>✕</Text>
          </TouchableOpacity>
        </View>

        {/* Search bar */}
        <View style={styles.searchRow}>
          <TextInput
            style={styles.searchInput}
            value={query}
            onChangeText={setQuery}
            placeholder="Search exercises…"
            placeholderTextColor={colors.secondary}
            returnKeyType="search"
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>

        {/* Category tabs — hidden when search is active */}
        {!isSearchActive && (
          <ExerciseCategoryTabs selected={category} onSelect={setCategory} />
        )}

        {/* Exercise list */}
        {allAdded ? (
          <View style={styles.allAddedContainer}>
            <Text style={styles.allAddedText}>
              All exercises in this category are already added
            </Text>
          </View>
        ) : (
          <FlatList
            data={availableExercises}
            keyExtractor={item => String(item.id)}
            renderItem={({ item }) => (
              <ExerciseListItem
                exercise={item}
                onSelect={() => handleSelect(item)}
              />
            )}
            contentContainerStyle={styles.listContent}
            keyboardShouldPersistTaps="handled"
            ListEmptyComponent={
              <Text style={styles.emptyText}>
                {isSearchActive ? 'No exercises found' : 'No exercises in this category'}
              </Text>
            }
          />
        )}

        {/* Create New link */}
        <TouchableOpacity
          style={styles.createNewRow}
          onPress={() => setAddModalVisible(true)}>
          <Text style={styles.createNewText}>+ Create New Exercise</Text>
        </TouchableOpacity>
      </View>

      {/* AddExerciseModal from Plan 03 */}
      <AddExerciseModal
        visible={addModalVisible}
        onClose={() => setAddModalVisible(false)}
        onAdded={handleExerciseAdded}
      />
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: SCREEN_HEIGHT * 0.75,
    backgroundColor: colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
    alignSelf: 'center',
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  sheetTitle: {
    fontSize: fontSize.md,
    fontWeight: weightBold,
    color: colors.primary,
  },
  closeButton: {
    fontSize: fontSize.base,
    color: colors.secondary,
  },
  searchRow: {
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm,
  },
  searchInput: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: 8,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: fontSize.base,
    color: colors.primary,
    borderWidth: 1,
    borderColor: colors.border,
  },
  listContent: {
    paddingBottom: spacing.base,
    flexGrow: 1,
  },
  emptyText: {
    textAlign: 'center',
    color: colors.secondary,
    fontSize: fontSize.base,
    marginTop: spacing.xxl,
  },
  allAddedContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
  },
  allAddedText: {
    color: colors.secondary,
    fontSize: fontSize.base,
    textAlign: 'center',
  },
  createNewRow: {
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    alignItems: 'center',
  },
  createNewText: {
    fontSize: fontSize.base,
    fontWeight: weightSemiBold,
    color: colors.accent,
  },
});
