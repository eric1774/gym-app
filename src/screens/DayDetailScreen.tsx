import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp, NavigationProp } from '@react-navigation/native';
import { EditTargetsModal } from '../components/EditTargetsModal';
import { ExerciseTargetRow } from '../components/ExerciseTargetRow';
import { SwapSheet } from '../components/SwapSheet';
import { WarmupTemplatePicker } from '../components/WarmupTemplatePicker';
import {
  addExerciseToProgramDay,
  createSupersetGroup,
  getProgramDayExercises,
  removeExerciseFromProgramDay,
  removeSupersetGroup,
  reorderProgramDayExercises,
  updateExerciseTargets,
  updateBaseNote,
  getWarmupTemplateIdForDay,
  setWarmupTemplateIdForDay,
  clearWarmupTemplateIdForDay,
} from '../db/programs';
import { getWarmupTemplateWithItems } from '../db/warmups';
import { executeSql, db as dbPromise } from '../db/database';
import { getExercises } from '../db/exercises';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { fontSize, weightBold, weightSemiBold } from '../theme/typography';
import { Exercise, ProgramDayExercise } from '../types';
import { ProgramsStackParamList } from '../navigation/TabNavigator';
import { ExercisePickerSheet } from './ExercisePickerSheet';
import { useSession } from '../context/SessionContext';
import { TabParamList } from '../navigation/TabNavigator';

type DayDetailRoute = RouteProp<ProgramsStackParamList, 'DayDetail'>;

/** A rendered unit: either a single exercise or a superset group. */
type ExerciseGroup =
  | { kind: 'single'; item: ProgramDayExercise; index: number }
  | { kind: 'superset'; items: ProgramDayExercise[]; groupId: number; startIndex: number };

/** Build the rendering structure from a flat exercise list. */
function buildGroups(exercises: ProgramDayExercise[]): ExerciseGroup[] {
  const groups: ExerciseGroup[] = [];
  let i = 0;
  while (i < exercises.length) {
    const item = exercises[i];
    if (item.supersetGroupId != null) {
      const groupId = item.supersetGroupId;
      const groupItems: ProgramDayExercise[] = [];
      const startIndex = i;
      while (i < exercises.length && exercises[i].supersetGroupId === groupId) {
        groupItems.push(exercises[i]);
        i++;
      }
      groups.push({ kind: 'superset', items: groupItems, groupId, startIndex });
    } else {
      groups.push({ kind: 'single', item, index: i });
      i++;
    }
  }
  return groups;
}

export function DayDetailScreen() {
  const navigation = useNavigation();
  const route = useRoute<DayDetailRoute>();
  const { dayId, dayName } = route.params;
  const { session, startSessionFromProgramDay } = useSession();

  const [dayExercises, setDayExercises] = useState<ProgramDayExercise[]>([]);
  const [exerciseMap, setExerciseMap] = useState<Map<number, Exercise>>(new Map());
  const [pickerVisible, setPickerVisible] = useState(false);
  const [selectedExercise, setSelectedExercise] = useState<ProgramDayExercise | null>(null);
  const [swapTarget, setSwapTarget] = useState<{ exercise: Exercise; dayExercise: ProgramDayExercise } | null>(null);

  const [warmupTemplateName, setWarmupTemplateName] = useState<string | null>(null);
  const [warmupItemCount, setWarmupItemCount] = useState(0);
  const [showWarmupPicker, setShowWarmupPicker] = useState(false);

  // Superset multi-select mode
  const [supersetMode, setSupersetMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);

  const refresh = useCallback(async () => {
    try {
      const [pdes, allExercises] = await Promise.all([
        getProgramDayExercises(dayId),
        getExercises(),
      ]);
      setDayExercises(pdes);
      const map = new Map<number, Exercise>();
      for (const ex of allExercises) {
        map.set(ex.id, ex);
      }
      setExerciseMap(map);
    } catch {
      // ignore
    }
  }, [dayId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    async function loadWarmupInfo() {
      const templateId = await getWarmupTemplateIdForDay(dayId);
      if (templateId) {
        const { template, items } = await getWarmupTemplateWithItems(templateId);
        setWarmupTemplateName(template.name);
        setWarmupItemCount(items.length);
      } else {
        setWarmupTemplateName(null);
        setWarmupItemCount(0);
      }
    }
    loadWarmupInfo();
  }, [dayId]);

  const handleWarmupTemplateSelect = useCallback(async (templateId: number) => {
    await setWarmupTemplateIdForDay(dayId, templateId);
    const { template, items } = await getWarmupTemplateWithItems(templateId);
    setWarmupTemplateName(template.name);
    setWarmupItemCount(items.length);
    setShowWarmupPicker(false);
  }, [dayId]);

  const handleClearWarmup = useCallback(async () => {
    await clearWarmupTemplateIdForDay(dayId);
    setWarmupTemplateName(null);
    setWarmupItemCount(0);
  }, [dayId]);

  const handleAddExercise = useCallback(
    async (exercise: Exercise) => {
      try {
        await addExerciseToProgramDay(dayId, exercise.id);
        await refresh();
      } catch {
        // ignore
      }
      setPickerVisible(false);
    },
    [dayId, refresh],
  );

  const confirmRemoveExercise = useCallback(
    async (pdeId: number) => {
      try {
        await removeExerciseFromProgramDay(pdeId);
        setDayExercises(prev => prev.filter(d => d.id !== pdeId));
      } catch {
        // ignore
      }
    },
    [],
  );

  const handleRemoveExercise = useCallback(
    (pde: ProgramDayExercise) => {
      const ex = exerciseMap.get(pde.exerciseId);
      const name = ex ? ex.name : 'this exercise';
      Alert.alert('Remove Exercise', `Remove "${name}" from this day?`, [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => { confirmRemoveExercise(pde.id); },
        },
      ]);
    },
    [exerciseMap, confirmRemoveExercise],
  );

  const handleMoveUp = useCallback(
    async (index: number) => {
      if (index <= 0) { return; }
      const newList = [...dayExercises];
      const temp = newList[index];
      newList[index] = newList[index - 1];
      newList[index - 1] = temp;
      setDayExercises(newList);
      try {
        await reorderProgramDayExercises(dayId, newList.map(d => d.id));
      } catch {
        // revert on error
        await refresh();
      }
    },
    [dayExercises, dayId, refresh],
  );

  const handleMoveDown = useCallback(
    async (index: number) => {
      if (index >= dayExercises.length - 1) { return; }
      const newList = [...dayExercises];
      const temp = newList[index];
      newList[index] = newList[index + 1];
      newList[index + 1] = temp;
      setDayExercises(newList);
      try {
        await reorderProgramDayExercises(dayId, newList.map(d => d.id));
      } catch {
        await refresh();
      }
    },
    [dayExercises, dayId, refresh],
  );

  const handleSaveTargets = useCallback(
    async (
      id: number,
      patch: {
        sets: { inherit: true } | { inherit: false; value: number };
        reps: { inherit: true } | { inherit: false; value: number };
        weight: { inherit: true } | { inherit: false; value: number };
        notes: { inherit: true } | { inherit: false; value: string | null };
      },
    ) => {
      // Base-scope: "inherit" is not meaningful — in practice all fields arrive as { inherit: false }
      // because EditTargetsModal always produces non-inherit patches when scope === 'base'.
      const setsVal = patch.sets.inherit ? 0 : patch.sets.value;
      const repsVal = patch.reps.inherit ? 0 : patch.reps.value;
      const weightVal = patch.weight.inherit ? 0 : patch.weight.value;
      const notesVal = patch.notes.inherit ? null : patch.notes.value;

      setDayExercises(prev =>
        prev.map(pde =>
          pde.id === id
            ? { ...pde, targetSets: setsVal, targetReps: repsVal, targetWeightLbs: weightVal, notes: notesVal }
            : pde,
        ),
      );
      setSelectedExercise(null);
      try {
        await updateExerciseTargets(id, setsVal, repsVal, weightVal);
        await updateBaseNote(id, notesVal);
      } catch {
        await refresh();
      }
    },
    [refresh],
  );

  const handleStartWorkout = useCallback(async () => {
    if (session) {
      Alert.alert(
        'Workout in Progress',
        'A workout is already in progress. End it first before starting a new one.',
      );
      return;
    }
    // Build Exercise objects from exerciseMap in program day order
    const exerciseObjects = dayExercises
      .map(pde => exerciseMap.get(pde.exerciseId))
      .filter((ex): ex is Exercise => ex !== undefined);
    if (exerciseObjects.length === 0) { return; }
    await startSessionFromProgramDay(dayId, exerciseObjects);
    // Navigate to WorkoutTab
    const parent = navigation.getParent<NavigationProp<TabParamList>>();
    if (parent) {
      parent.navigate('WorkoutTab');
    }
  }, [session, dayExercises, exerciseMap, dayId, startSessionFromProgramDay, navigation]);

  // Toggle an exercise ID in the selectedIds list
  const handleToggleSelect = useCallback((id: number) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id],
    );
  }, []);

  // Validate and create a superset group from selectedIds
  const handleGroupSuperset = useCallback(async () => {
    if (selectedIds.length < 2 || selectedIds.length > 3) { return; }

    // Validate adjacency: indices of selected exercises must be contiguous
    const indices = selectedIds
      .map(id => dayExercises.findIndex(ex => ex.id === id))
      .sort((a, b) => a - b);

    const isContiguous = indices.every((idx, i) => i === 0 || idx === indices[i - 1] + 1);

    if (!isContiguous) {
      Alert.alert(
        'Non-Adjacent Exercises',
        'Exercises must be adjacent. Reorder exercises first, then group.',
      );
      return;
    }

    try {
      await createSupersetGroup(dayId, selectedIds);
      await refresh();
    } catch {
      // ignore
    }
    setSupersetMode(false);
    setSelectedIds([]);
  }, [selectedIds, dayExercises, dayId, refresh]);

  // Ungroup a superset when the lightning bolt is tapped
  const handleUngroup = useCallback(
    (groupId: number) => {
      Alert.alert('Ungroup superset?', undefined, [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Ungroup',
          style: 'destructive',
          onPress: async () => {
            try {
              await removeSupersetGroup(dayId, groupId);
              await refresh();
            } catch {
              // ignore
            }
          },
        },
      ]);
    },
    [dayId, refresh],
  );

  const cancelSupersetMode = useCallback(() => {
    setSupersetMode(false);
    setSelectedIds([]);
  }, []);

  const enterSupersetMode = useCallback(() => {
    setSupersetMode(true);
    setSelectedIds([]);
  }, []);

  // Build the grouped rendering structure
  const groups = buildGroups(dayExercises);
  const hasEnoughSelected = selectedIds.length >= 2 && selectedIds.length <= 3;

  const selectedExerciseName = selectedExercise
    ? exerciseMap.get(selectedExercise.exerciseId)?.name ?? 'Exercise'
    : '';

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Text style={styles.backText}>{'<'}</Text>
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {dayName}
          </Text>
        </View>
        {supersetMode ? (
          <TouchableOpacity
            onPress={cancelSupersetMode}
            style={styles.cancelButton}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.headerActions}>
            <TouchableOpacity
              onPress={enterSupersetMode}
              style={styles.ssButton}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Text style={styles.ssButtonText}>SS</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setPickerVisible(true)}
              style={styles.addButton}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Text style={styles.addButtonText}>+ Add</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Superset mode instruction */}
      {supersetMode && (
        <Text style={styles.supersetInstruction}>SELECT 2-3 EXERCISES</Text>
      )}

      {/* Warmup badge */}
      {warmupTemplateName ? (
        <View style={styles.warmupBadge}>
          <View style={styles.warmupBadgeLeft}>
            <Text style={styles.warmupEmoji}>🔥</Text>
            <View>
              <Text style={styles.warmupBadgeName}>{warmupTemplateName}</Text>
              <Text style={styles.warmupBadgeCount}>
                {warmupItemCount} items · auto-loads on start
              </Text>
            </View>
          </View>
          <View style={styles.warmupBadgeActions}>
            <TouchableOpacity onPress={() => setShowWarmupPicker(true)}>
              <Text style={styles.warmupChangeText}>Change ›</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={handleClearWarmup}>
              <Text style={styles.warmupRemoveText}>✕</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <TouchableOpacity
          style={styles.attachWarmupButton}
          onPress={() => setShowWarmupPicker(true)}
        >
          <Text style={styles.warmupEmoji}>🔥</Text>
          <Text style={styles.attachWarmupText}>Attach Warmup</Text>
        </TouchableOpacity>
      )}

      {/* Exercise list */}
      {dayExercises.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No exercises yet</Text>
          <Text style={styles.emptyHint}>Tap Add Exercise to build this day</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.list}>
          {groups.map(group => {
            if (group.kind === 'single') {
              const { item, index } = group;
              const exercise = exerciseMap.get(item.exerciseId);
              if (!exercise) { return null; }
              return (
                <ExerciseTargetRow
                  key={item.id}
                  exercise={exercise}
                  dayExercise={item}
                  onEdit={() => setSelectedExercise(item)}
                  onRemove={() => handleRemoveExercise(item)}
                  onSwap={() => setSwapTarget({ exercise, dayExercise: item })}
                  onMoveUp={() => handleMoveUp(index)}
                  onMoveDown={() => handleMoveDown(index)}
                  isFirst={index === 0}
                  isLast={index === dayExercises.length - 1}
                  supersetGroupId={item.supersetGroupId}
                  selectionMode={supersetMode}
                  isSelected={selectedIds.includes(item.id)}
                  onSelect={() => handleToggleSelect(item.id)}
                  onUngroup={item.supersetGroupId != null ? () => handleUngroup(item.supersetGroupId!) : undefined}
                />
              );
            } else {
              // Superset group: render inside a shared container
              const { items, groupId, startIndex } = group;
              return (
                <View key={groupId} style={styles.supersetContainer}>
                  {items.map((item, idx) => {
                    const exercise = exerciseMap.get(item.exerciseId);
                    if (!exercise) { return null; }
                    const absoluteIndex = startIndex + idx;
                    return (
                      <ExerciseTargetRow
                        key={item.id}
                        exercise={exercise}
                        dayExercise={item}
                        onEdit={() => setSelectedExercise(item)}
                        onRemove={() => handleRemoveExercise(item)}
                        onSwap={() => setSwapTarget({ exercise, dayExercise: item })}
                        onMoveUp={() => handleMoveUp(absoluteIndex)}
                        onMoveDown={() => handleMoveDown(absoluteIndex)}
                        isFirst={absoluteIndex === 0}
                        isLast={absoluteIndex === dayExercises.length - 1}
                        supersetGroupId={item.supersetGroupId}
                        selectionMode={supersetMode}
                        isSelected={selectedIds.includes(item.id)}
                        onSelect={() => handleToggleSelect(item.id)}
                        onUngroup={() => handleUngroup(groupId)}
                      />
                    );
                  })}
                </View>
              );
            }
          })}
        </ScrollView>
      )}

      {/* Bottom button: "Group as Superset" in superset mode, "Start Workout" otherwise */}
      {dayExercises.length > 0 && (
        <View style={styles.bottomContainer}>
          {supersetMode ? (
            <TouchableOpacity
              style={[styles.primaryButton, !hasEnoughSelected && styles.primaryButtonDisabled]}
              onPress={handleGroupSuperset}
              activeOpacity={0.85}
              disabled={!hasEnoughSelected}>
              <Text style={styles.primaryButtonText}>Group as Superset</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={handleStartWorkout}
              activeOpacity={0.85}>
              <Text style={styles.primaryButtonText}>Start Workout</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Exercise picker sheet (reused from Phase 1) */}
      <ExercisePickerSheet
        visible={pickerVisible}
        onClose={() => setPickerVisible(false)}
        onSelect={handleAddExercise}
      />

      {/* Edit targets modal */}
      <EditTargetsModal
        visible={selectedExercise !== null}
        onClose={() => setSelectedExercise(null)}
        exerciseName={selectedExerciseName}
        programDayExerciseId={selectedExercise?.id ?? null}
        scope="base"
        baseSets={selectedExercise?.targetSets ?? 0}
        baseReps={selectedExercise?.targetReps ?? 0}
        baseWeightLbs={selectedExercise?.targetWeightLbs ?? 0}
        baseNote={selectedExercise?.notes ?? null}
        initialSets={selectedExercise?.targetSets ?? 0}
        initialReps={selectedExercise?.targetReps ?? 0}
        initialWeightLbs={selectedExercise?.targetWeightLbs ?? 0}
        initialNote={selectedExercise?.notes ?? null}
        setsOverridden={false}
        repsOverridden={false}
        weightOverridden={false}
        notesOverridden={false}
        onSave={async (patch) => {
          if (!selectedExercise) { return; }
          await handleSaveTargets(selectedExercise.id, patch);
        }}
      />

      {/* Warmup template picker */}
      <WarmupTemplatePicker
        visible={showWarmupPicker}
        onClose={() => setShowWarmupPicker(false)}
        onSelect={handleWarmupTemplateSelect}
        title="Select Warmup Template"
      />

      {/* Swap sheet */}
      <SwapSheet
        visible={swapTarget !== null}
        exercise={swapTarget?.exercise ?? null}
        excludeExerciseIds={dayExercises.map(de => de.exerciseId)}
        onSelect={async (newExercise) => {
          if (!swapTarget) { return; }
          const { dayExercise } = swapTarget;
          await removeExerciseFromProgramDay(dayExercise.id);
          const newPde = await addExerciseToProgramDay(
            dayExercise.programDayId,
            newExercise.id,
            dayExercise.targetSets,
            dayExercise.targetReps,
            dayExercise.targetWeightLbs,
          );
          if (dayExercise.supersetGroupId != null) {
            const database = await dbPromise;
            await executeSql(
              database,
              'UPDATE program_day_exercises SET superset_group_id = ? WHERE id = ?',
              [dayExercise.supersetGroupId, newPde.id],
            );
          }
          setSwapTarget(null);
          refresh();
        }}
        onClose={() => setSwapTarget(null)}
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
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.base,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
  },
  backButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backText: {
    fontSize: fontSize.xl,
    color: colors.accent,
    fontWeight: weightBold,
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: fontSize.lg,
    fontWeight: weightBold,
    color: colors.primary,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  ssButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: 8,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.accent,
  },
  ssButtonText: {
    fontSize: fontSize.sm,
    fontWeight: weightSemiBold,
    color: colors.accent,
  },
  addButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: 8,
    backgroundColor: colors.accent,
  },
  addButtonText: {
    fontSize: fontSize.sm,
    fontWeight: weightSemiBold,
    color: colors.background,
  },
  cancelButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  cancelButtonText: {
    fontSize: fontSize.sm,
    fontWeight: weightSemiBold,
    color: colors.accent,
  },
  supersetInstruction: {
    textAlign: 'center',
    color: colors.secondary,
    fontSize: fontSize.xs,
    letterSpacing: 1.2,
    marginBottom: spacing.sm,
  },
  list: {
    paddingHorizontal: spacing.base,
    paddingBottom: spacing.xl,
  },
  supersetContainer: {
    backgroundColor: colors.accentDim,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(141, 194, 138, 0.15)',
    marginBottom: spacing.sm,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.xs,
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
  bottomContainer: {
    paddingHorizontal: spacing.base,
    paddingBottom: spacing.xl,
    paddingTop: spacing.md,
  },
  primaryButton: {
    backgroundColor: colors.accent,
    borderRadius: 10,
    paddingVertical: spacing.base,
    alignItems: 'center',
  },
  primaryButtonDisabled: {
    opacity: 0.4,
  },
  primaryButtonText: {
    fontSize: fontSize.lg,
    fontWeight: weightBold,
    color: colors.background,
  },
  warmupBadge: {
    backgroundColor: 'rgba(141,194,138,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(141,194,138,0.2)',
    borderRadius: 10,
    padding: spacing.md,
    marginHorizontal: spacing.base,
    marginBottom: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  warmupBadgeLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
  },
  warmupEmoji: { fontSize: 14 },
  warmupBadgeName: {
    color: colors.accent,
    fontSize: fontSize.sm,
    fontWeight: '700',
  },
  warmupBadgeCount: {
    color: colors.secondary,
    fontSize: fontSize.xs,
    marginTop: 2,
  },
  warmupBadgeActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  warmupChangeText: { color: colors.secondary, fontSize: fontSize.xs },
  warmupRemoveText: { color: colors.secondary, fontSize: 14 },
  attachWarmupButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: 'rgba(141,194,138,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(141,194,138,0.15)',
    borderStyle: 'dashed',
    borderRadius: 10,
    padding: spacing.md,
    marginHorizontal: spacing.base,
    marginBottom: spacing.md,
  },
  attachWarmupText: { color: colors.accent, fontSize: fontSize.sm },
});
