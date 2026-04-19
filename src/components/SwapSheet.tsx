import React, { useEffect, useState } from 'react';
import {
  Dimensions,
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { fontSize, weightBold, weightSemiBold } from '../theme/typography';
import { Exercise } from '../types';
import { getExerciseMuscleGroups, getExercisesByMuscleGroups } from '../db/muscleGroups';

const SCREEN_HEIGHT = Dimensions.get('window').height;

interface SwapSheetProps {
  visible: boolean;
  exercise: Exercise | null;
  excludeExerciseIds: number[];
  onSelect: (exercise: Exercise) => void;
  onClose: () => void;
}

interface AlternativeRow {
  exercise: Exercise;
  matchCount: number;
  isExact: boolean;
}

export function SwapSheet({ visible, exercise, excludeExerciseIds, onSelect, onClose }: SwapSheetProps) {
  const [alternatives, setAlternatives] = useState<AlternativeRow[]>([]);
  const [muscleGroupNames, setMuscleGroupNames] = useState<string[]>([]);
  const [totalMuscleGroups, setTotalMuscleGroups] = useState(0);

  useEffect(() => {
    if (!visible || !exercise) {
      setAlternatives([]);
      setMuscleGroupNames([]);
      return;
    }

    let cancelled = false;

    (async () => {
      const groups = await getExerciseMuscleGroups(exercise.id);
      if (cancelled) return;

      const mgIds = groups.map((g: { muscleGroupId: number }) => g.muscleGroupId);
      setMuscleGroupNames(groups.map((g: { name: string }) => g.name));
      setTotalMuscleGroups(mgIds.length);

      if (mgIds.length === 0) {
        setAlternatives([]);
        return;
      }

      const results = await getExercisesByMuscleGroups(mgIds, excludeExerciseIds);
      if (cancelled) return;

      setAlternatives(
        results.map((r: { exercise: Exercise; matchCount: number }) => ({
          ...r,
          isExact: r.matchCount === mgIds.length,
        })),
      );
    })();

    return () => { cancelled = true; };
  }, [visible, exercise, excludeExerciseIds]);

  if (!exercise) return null;

  const exactMatches = alternatives.filter(a => a.isExact);
  const partialMatches = alternatives.filter(a => !a.isExact);

  const renderAlternativeRow = (item: AlternativeRow) => (
    <TouchableOpacity
      style={styles.row}
      onPress={() => onSelect(item.exercise)}
      activeOpacity={0.7}>
      <View style={styles.rowInfo}>
        <Text style={styles.rowName}>{item.exercise.name}</Text>
        <Text style={styles.rowMeta}>
          {item.matchCount}/{totalMuscleGroups} groups
          {item.exercise.measurementType === 'timed' ? ' · Timed' : ''}
        </Text>
      </View>
    </TouchableOpacity>
  );

  // Build flat list data with section headers
  type ListItem = { type: 'header'; title: string } | { type: 'item'; data: AlternativeRow };
  const listData: ListItem[] = [];
  if (exactMatches.length > 0) {
    listData.push({ type: 'header', title: 'Exact Matches' });
    exactMatches.forEach(a => listData.push({ type: 'item', data: a }));
  }
  if (partialMatches.length > 0) {
    listData.push({ type: 'header', title: 'Partial Matches' });
    partialMatches.forEach(a => listData.push({ type: 'item', data: a }));
  }

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.modalContainer}>
        <Pressable style={styles.overlay} onPress={onClose} />
        <View style={styles.sheet}>
          <Text style={styles.title}>Swap {exercise.name}</Text>
          <View style={styles.chipRow}>
            {muscleGroupNames.map(name => (
              <View key={name} style={styles.chip}>
                <Text style={styles.chipText}>{name}</Text>
              </View>
            ))}
          </View>

          {alternatives.length === 0 ? (
            <Text style={styles.emptyText}>No alternatives found</Text>
          ) : (
            <FlatList
              data={listData}
              keyExtractor={(item, index) => item.type === 'header' ? `h-${index}` : `e-${item.data.exercise.id}`}
              renderItem={({ item }) => {
                if (item.type === 'header') {
                  return <Text style={styles.sectionHeader}>{item.title}</Text>;
                }
                return renderAlternativeRow(item.data);
              }}
              showsVerticalScrollIndicator={false}
              style={styles.list}
            />
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xxxl,
    paddingHorizontal: spacing.base,
    maxHeight: SCREEN_HEIGHT * 0.75,
  },
  title: {
    fontSize: fontSize.lg,
    fontWeight: weightBold,
    color: colors.primary,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
  chip: {
    backgroundColor: colors.accentDim,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 12,
  },
  chipText: {
    fontSize: fontSize.xs,
    color: colors.accent,
    fontWeight: weightSemiBold,
  },
  sectionHeader: {
    fontSize: fontSize.sm,
    fontWeight: weightBold,
    color: colors.secondary,
    marginTop: spacing.md,
    marginBottom: spacing.xs,
  },
  list: {
    maxHeight: SCREEN_HEIGHT * 0.5,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceElevated,
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  rowInfo: {
    flex: 1,
  },
  rowName: {
    fontSize: fontSize.base,
    fontWeight: weightSemiBold,
    color: colors.primary,
  },
  rowMeta: {
    fontSize: fontSize.sm,
    color: colors.secondary,
    marginTop: 2,
  },
  emptyText: {
    fontSize: fontSize.base,
    color: colors.secondary,
    textAlign: 'center',
    marginTop: spacing.xl,
  },
});
