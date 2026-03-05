import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  FlatList,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { EditTargetsModal } from '../components/EditTargetsModal';
import { ExerciseTargetRow } from '../components/ExerciseTargetRow';
import {
  addExerciseToProgramDay,
  getProgramDayExercises,
  removeExerciseFromProgramDay,
  reorderProgramDayExercises,
  updateExerciseTargets,
} from '../db/programs';
import { getExercises } from '../db/exercises';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { fontSize, weightBold, weightSemiBold } from '../theme/typography';
import { Exercise, ProgramDayExercise } from '../types';
import { ProgramsStackParamList } from '../navigation/TabNavigator';
import { ExercisePickerSheet } from './ExercisePickerSheet';

type DayDetailRoute = RouteProp<ProgramsStackParamList, 'DayDetail'>;

export function DayDetailScreen() {
  const navigation = useNavigation();
  const route = useRoute<DayDetailRoute>();
  const { dayId, dayName } = route.params;

  const [dayExercises, setDayExercises] = useState<ProgramDayExercise[]>([]);
  const [exerciseMap, setExerciseMap] = useState<Map<number, Exercise>>(new Map());
  const [pickerVisible, setPickerVisible] = useState(false);
  const [selectedExercise, setSelectedExercise] = useState<ProgramDayExercise | null>(null);

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

  const handleRemoveExercise = useCallback(
    (pde: ProgramDayExercise) => {
      const ex = exerciseMap.get(pde.exerciseId);
      const name = ex ? ex.name : 'this exercise';
      Alert.alert('Remove Exercise', `Remove "${name}" from this day?`, [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              await removeExerciseFromProgramDay(pde.id);
              setDayExercises(prev => prev.filter(d => d.id !== pde.id));
            } catch {
              // ignore
            }
          },
        },
      ]);
    },
    [exerciseMap],
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
    async (id: number, sets: number, reps: number, weight: number) => {
      setDayExercises(prev =>
        prev.map(pde =>
          pde.id === id
            ? { ...pde, targetSets: sets, targetReps: reps, targetWeightKg: weight }
            : pde,
        ),
      );
      setSelectedExercise(null);
      try {
        await updateExerciseTargets(id, sets, reps, weight);
      } catch {
        await refresh();
      }
    },
    [refresh],
  );

  const renderItem = useCallback(
    ({ item, index }: { item: ProgramDayExercise; index: number }) => {
      const exercise = exerciseMap.get(item.exerciseId);
      if (!exercise) { return null; }
      return (
        <ExerciseTargetRow
          exercise={exercise}
          dayExercise={item}
          onEdit={() => setSelectedExercise(item)}
          onRemove={() => handleRemoveExercise(item)}
          onMoveUp={() => handleMoveUp(index)}
          onMoveDown={() => handleMoveDown(index)}
          isFirst={index === 0}
          isLast={index === dayExercises.length - 1}
        />
      );
    },
    [exerciseMap, dayExercises.length, handleRemoveExercise, handleMoveUp, handleMoveDown],
  );

  const keyExtractor = useCallback((item: ProgramDayExercise) => String(item.id), []);

  const selectedExerciseName = selectedExercise
    ? exerciseMap.get(selectedExercise.exerciseId)?.name ?? 'Exercise'
    : '';

  return (
    <SafeAreaView style={styles.safeArea}>
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
        <TouchableOpacity
          onPress={() => setPickerVisible(true)}
          style={styles.addButton}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Text style={styles.addButtonText}>+ Add</Text>
        </TouchableOpacity>
      </View>

      {/* Exercise list */}
      {dayExercises.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No exercises yet</Text>
          <Text style={styles.emptyHint}>Tap Add Exercise to build this day</Text>
        </View>
      ) : (
        <FlatList
          data={dayExercises}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          contentContainerStyle={styles.list}
          extraData={exerciseMap}
        />
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
        dayExercise={selectedExercise}
        exerciseName={selectedExerciseName}
        onSave={handleSaveTargets}
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
  list: {
    paddingHorizontal: spacing.base,
    paddingBottom: spacing.xl,
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
});
