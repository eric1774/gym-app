import React, { useCallback, useEffect, useState } from 'react';
import {
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { searchExercises } from '../db/exercises';
import { getWarmupExercises, searchWarmupExercises } from '../db/warmups';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { fontSize, weightBold, weightSemiBold } from '../theme/typography';
import { Exercise, WarmupExercise, WarmupTrackingType } from '../types';
import { CreateWarmupExerciseModal } from './CreateWarmupExerciseModal';

type ActiveTab = 'warmup' | 'library';

type PendingSelection = {
  kind: 'warmup';
  exercise: WarmupExercise;
  trackingType: WarmupTrackingType;
  defaultValue: number | null;
} | {
  kind: 'library';
  exercise: Exercise;
  trackingType: WarmupTrackingType;
};

interface AddWarmupItemModalProps {
  visible: boolean;
  onClose: () => void;
  onAddWarmupExercise: (warmupExerciseId: number, trackingType: WarmupTrackingType, targetValue: number | null) => void;
  onAddLibraryExercise: (exerciseId: number, trackingType: WarmupTrackingType, targetValue: number | null) => void;
}

export function AddWarmupItemModal({
  visible,
  onClose,
  onAddWarmupExercise,
  onAddLibraryExercise,
}: AddWarmupItemModalProps) {
  const [activeTab, setActiveTab] = useState<ActiveTab>('warmup');
  const [warmupExercises, setWarmupExercises] = useState<WarmupExercise[]>([]);
  const [libraryExercises, setLibraryExercises] = useState<Exercise[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [pendingSelection, setPendingSelection] = useState<PendingSelection | null>(null);
  const [targetValueInput, setTargetValueInput] = useState('');
  const [createModalVisible, setCreateModalVisible] = useState(false);

  // Load warmup exercises on open
  useEffect(() => {
    if (visible) {
      loadWarmupExercises();
    }
  }, [visible]);

  // Debounced library search
  useEffect(() => {
    if (activeTab !== 'library') { return; }
    if (searchQuery.trim() === '') {
      setLibraryExercises([]);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const results = await searchExercises(searchQuery.trim());
        setLibraryExercises(results);
      } catch {
        // ignore
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, activeTab]);

  // Warmup search
  useEffect(() => {
    if (activeTab !== 'warmup') { return; }
    if (searchQuery.trim() === '') {
      loadWarmupExercises();
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const results = await searchWarmupExercises(searchQuery.trim());
        setWarmupExercises(results);
      } catch {
        // ignore
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, activeTab]);

  const loadWarmupExercises = async () => {
    try {
      const results = await getWarmupExercises();
      setWarmupExercises(results);
    } catch {
      // ignore
    }
  };

  const handleClose = () => {
    setSearchQuery('');
    setPendingSelection(null);
    setTargetValueInput('');
    setActiveTab('warmup');
    onClose();
  };

  const handleSelectWarmupExercise = (exercise: WarmupExercise) => {
    if (exercise.trackingType === 'checkbox') {
      onAddWarmupExercise(exercise.id, 'checkbox', null);
      handleClose();
      return;
    }
    setPendingSelection({
      kind: 'warmup',
      exercise,
      trackingType: exercise.trackingType,
      defaultValue: exercise.defaultValue,
    });
    setTargetValueInput(exercise.defaultValue != null ? String(exercise.defaultValue) : '');
  };

  const handleSelectLibraryExercise = (exercise: Exercise) => {
    // Library exercises always need a tracking type pick — default to reps
    setPendingSelection({
      kind: 'library',
      exercise,
      trackingType: 'reps',
    });
    setTargetValueInput('');
  };

  const handleConfirmAdd = () => {
    if (!pendingSelection) { return; }
    const parsedValue = targetValueInput.trim() !== ''
      ? parseFloat(targetValueInput.trim())
      : null;

    if (pendingSelection.kind === 'warmup') {
      onAddWarmupExercise(
        pendingSelection.exercise.id,
        pendingSelection.trackingType,
        parsedValue,
      );
    } else {
      onAddLibraryExercise(
        pendingSelection.exercise.id,
        pendingSelection.trackingType,
        parsedValue,
      );
    }
    handleClose();
  };

  const handleWarmupCreated = (exercise: WarmupExercise) => {
    setWarmupExercises(prev => [exercise, ...prev]);
  };

  const renderWarmupItem = useCallback(
    ({ item }: { item: WarmupExercise }) => (
      <TouchableOpacity
        style={styles.listItem}
        onPress={() => handleSelectWarmupExercise(item)}
        activeOpacity={0.7}>
        <View style={styles.listItemContent}>
          <Text style={styles.listItemName}>{item.name}</Text>
          <Text style={styles.listItemMeta}>
            {item.trackingType === 'checkbox'
              ? 'Checkbox'
              : item.trackingType === 'reps'
              ? `Reps${item.defaultValue != null ? ` · ${item.defaultValue}` : ''}`
              : `Duration${item.defaultValue != null ? ` · ${item.defaultValue}s` : ''}`}
          </Text>
        </View>
        <Text style={styles.listItemChevron}>›</Text>
      </TouchableOpacity>
    ),
    [],
  );

  const renderLibraryItem = useCallback(
    ({ item }: { item: Exercise }) => (
      <TouchableOpacity
        style={styles.listItem}
        onPress={() => handleSelectLibraryExercise(item)}
        activeOpacity={0.7}>
        <View style={styles.listItemContent}>
          <Text style={styles.listItemName}>{item.name}</Text>
          <Text style={styles.listItemMeta}>{item.category}</Text>
        </View>
        <Text style={styles.listItemChevron}>›</Text>
      </TouchableOpacity>
    ),
    [],
  );

  return (
    <>
      <Modal
        visible={visible}
        animationType="slide"
        transparent
        onRequestClose={handleClose}>
        <KeyboardAvoidingView
          behavior="padding"
          style={styles.keyboardAvoid}>
          <Pressable style={styles.overlay} onPress={handleClose} />
          <View style={styles.sheet}>
            {pendingSelection ? (
              /* Target value input screen */
              <View style={styles.pendingContainer}>
                <Text style={styles.sheetTitle}>
                  {pendingSelection.kind === 'warmup'
                    ? pendingSelection.exercise.name
                    : pendingSelection.exercise.name}
                </Text>

                {pendingSelection.kind === 'library' && (
                  <>
                    <Text style={styles.label}>Tracking Type</Text>
                    <View style={styles.pillRow}>
                      {(['reps', 'duration'] as WarmupTrackingType[]).map((type) => (
                        <TouchableOpacity
                          key={type}
                          style={[
                            styles.pill,
                            pendingSelection.trackingType === type
                              ? styles.pillActive
                              : styles.pillInactive,
                          ]}
                          onPress={() =>
                            setPendingSelection(prev =>
                              prev ? { ...prev, trackingType: type } : prev,
                            )
                          }>
                          <Text
                            style={[
                              styles.pillText,
                              pendingSelection.trackingType === type
                                ? styles.pillTextActive
                                : styles.pillTextInactive,
                            ]}>
                            {type === 'reps' ? 'Reps' : 'Duration'}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </>
                )}

                <Text style={[styles.label, styles.labelSpaced]}>
                  {pendingSelection.trackingType === 'reps' ? 'Target Reps' : 'Target Duration (sec)'}
                </Text>
                <TextInput
                  style={styles.input}
                  placeholder={pendingSelection.trackingType === 'reps' ? 'e.g. 10' : 'e.g. 30'}
                  placeholderTextColor={colors.secondary}
                  value={targetValueInput}
                  onChangeText={setTargetValueInput}
                  keyboardType="numeric"
                  returnKeyType="done"
                  autoFocus
                />

                <TouchableOpacity
                  style={styles.addButton}
                  onPress={handleConfirmAdd}>
                  <Text style={styles.addButtonText}>Add to Template</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.backButton}
                  onPress={() => {
                    setPendingSelection(null);
                    setTargetValueInput('');
                  }}>
                  <Text style={styles.backButtonText}>Back</Text>
                </TouchableOpacity>
              </View>
            ) : (
              /* Browse screen */
              <>
                <Text style={styles.sheetTitle}>Add Item</Text>

                {/* Tab bar */}
                <View style={styles.tabBar}>
                  <TouchableOpacity
                    style={[styles.tab, activeTab === 'warmup' && styles.tabActive]}
                    onPress={() => {
                      setActiveTab('warmup');
                      setSearchQuery('');
                    }}>
                    <Text
                      style={[
                        styles.tabText,
                        activeTab === 'warmup' && styles.tabTextActive,
                      ]}>
                      Warmup Exercises
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.tab, activeTab === 'library' && styles.tabActive]}
                    onPress={() => {
                      setActiveTab('library');
                      setSearchQuery('');
                    }}>
                    <Text
                      style={[
                        styles.tabText,
                        activeTab === 'library' && styles.tabTextActive,
                      ]}>
                      From Library
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* Search input */}
                <View style={styles.searchContainer}>
                  <TextInput
                    style={styles.searchInput}
                    placeholder={
                      activeTab === 'warmup'
                        ? 'Search warmup exercises...'
                        : 'Search exercise library...'
                    }
                    placeholderTextColor={colors.secondary}
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    returnKeyType="search"
                    autoCapitalize="none"
                    autoCorrect={false}
                    clearButtonMode="while-editing"
                  />
                </View>

                {activeTab === 'warmup' ? (
                  <>
                    <TouchableOpacity
                      style={styles.createNewButton}
                      onPress={() => setCreateModalVisible(true)}>
                      <Text style={styles.createNewButtonText}>+ Create New Warmup Exercise</Text>
                    </TouchableOpacity>
                    <FlatList
                      data={warmupExercises}
                      renderItem={renderWarmupItem}
                      keyExtractor={(item) => String(item.id)}
                      style={styles.list}
                      keyboardShouldPersistTaps="handled"
                      ListEmptyComponent={
                        <Text style={styles.emptyText}>No warmup exercises found</Text>
                      }
                    />
                  </>
                ) : (
                  <FlatList
                    data={libraryExercises}
                    renderItem={renderLibraryItem}
                    keyExtractor={(item) => String(item.id)}
                    style={styles.list}
                    keyboardShouldPersistTaps="handled"
                    ListEmptyComponent={
                      <Text style={styles.emptyText}>
                        {searchQuery.trim() === ''
                          ? 'Type to search the exercise library'
                          : 'No exercises found'}
                      </Text>
                    }
                  />
                )}
              </>
            )}
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <CreateWarmupExerciseModal
        visible={createModalVisible}
        onClose={() => setCreateModalVisible(false)}
        onCreated={(exercise) => {
          setCreateModalVisible(false);
          handleWarmupCreated(exercise);
        }}
      />
    </>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  keyboardAvoid: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xxxl,
    paddingHorizontal: spacing.base,
    height: '85%',
  },
  sheetTitle: {
    fontSize: fontSize.lg,
    fontWeight: weightBold,
    color: colors.primary,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  tabBar: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    marginBottom: spacing.sm,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: colors.accent,
  },
  tabText: {
    fontSize: fontSize.sm,
    fontWeight: weightSemiBold,
    color: colors.secondary,
  },
  tabTextActive: {
    color: colors.accent,
  },
  searchContainer: {
    marginBottom: spacing.sm,
  },
  searchInput: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: 8,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm,
    fontSize: fontSize.base,
    color: colors.primary,
  },
  createNewButton: {
    paddingVertical: spacing.sm,
    marginBottom: spacing.xs,
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.accent,
    borderStyle: 'dashed',
  },
  createNewButtonText: {
    fontSize: fontSize.sm,
    fontWeight: weightSemiBold,
    color: colors.accent,
  },
  list: {
    flex: 1,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  listItemContent: {
    flex: 1,
  },
  listItemName: {
    fontSize: fontSize.base,
    color: colors.primary,
    marginBottom: 2,
  },
  listItemMeta: {
    fontSize: fontSize.sm,
    color: colors.secondary,
  },
  listItemChevron: {
    fontSize: fontSize.lg,
    color: colors.secondary,
    marginLeft: spacing.sm,
  },
  emptyText: {
    textAlign: 'center',
    color: colors.secondary,
    fontSize: fontSize.sm,
    paddingVertical: spacing.xl,
  },
  // Pending (target value) screen
  pendingContainer: {
    paddingBottom: spacing.sm,
  },
  label: {
    fontSize: fontSize.sm,
    color: colors.secondary,
    fontWeight: weightSemiBold,
    marginBottom: spacing.xs,
  },
  labelSpaced: {
    marginTop: spacing.md,
  },
  pillRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  pill: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: 20,
    alignItems: 'center',
  },
  pillActive: {
    backgroundColor: colors.accent,
  },
  pillInactive: {
    backgroundColor: colors.surfaceElevated,
  },
  pillText: {
    fontSize: fontSize.sm,
    fontWeight: weightSemiBold,
  },
  pillTextActive: {
    color: colors.background,
  },
  pillTextInactive: {
    color: colors.secondary,
  },
  input: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: 8,
    padding: spacing.md,
    fontSize: fontSize.base,
    color: colors.primary,
  },
  addButton: {
    backgroundColor: colors.accent,
    borderRadius: 12,
    paddingVertical: spacing.base,
    alignItems: 'center',
    marginTop: spacing.lg,
  },
  addButtonText: {
    color: colors.background,
    fontSize: fontSize.base,
    fontWeight: weightSemiBold,
  },
  backButton: {
    alignItems: 'center',
    paddingVertical: spacing.md,
    marginTop: spacing.sm,
  },
  backButtonText: {
    color: colors.secondary,
    fontSize: fontSize.sm,
  },
});
