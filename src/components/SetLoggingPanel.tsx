import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  logSet,
  getSetsForExerciseInSession,
  getLastSessionSets,
  deleteSet,
} from '../db/sets';
import { colors } from '../theme/colors';
import { fontSize, weightBold, weightMedium } from '../theme/typography';
import { spacing } from '../theme/spacing';
import { WorkoutSet } from '../types';
import { GhostReference } from './GhostReference';
import { SetListItem } from './SetListItem';

interface Props {
  sessionId: number;
  exerciseId: number;
  onSetLogged: (set: WorkoutSet) => void;
}

export function SetLoggingPanel({ sessionId, exerciseId, onSetLogged }: Props) {
  const [weightInput, setWeightInput] = useState('');
  const [repsInput, setRepsInput] = useState('');
  const [completedSets, setCompletedSets] = useState<WorkoutSet[]>([]);
  const [lastSessionSets, setLastSessionSets] = useState<WorkoutSet[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const weightRef = useRef<TextInput>(null);
  const repsRef = useRef<TextInput>(null);

  const loadData = useCallback(async () => {
    const [current, last] = await Promise.all([
      getSetsForExerciseInSession(sessionId, exerciseId),
      getLastSessionSets(exerciseId, sessionId),
    ]);
    setCompletedSets(current);
    setLastSessionSets(last);
    // Pre-fill from last session first set if no sets logged yet
    if (current.length === 0 && last.length > 0) {
      setWeightInput(String(last[0].weightKg));
      setRepsInput(String(last[0].reps));
    }
  }, [sessionId, exerciseId]);

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId, exerciseId]);

  const handleConfirm = useCallback(async () => {
    const weight = parseFloat(weightInput);
    const reps = parseInt(repsInput, 10);
    if (isNaN(weight) || isNaN(reps) || isSubmitting) {
      return;
    }

    setIsSubmitting(true);
    try {
      const newSet = await logSet(sessionId, exerciseId, weight, reps);
      setCompletedSets(prev => [...prev, newSet]);
      onSetLogged(newSet);
      // Pre-fill with the just-logged values for the next set
      setWeightInput(String(newSet.weightKg));
      setRepsInput(String(newSet.reps));
    } finally {
      setIsSubmitting(false);
    }
  }, [weightInput, repsInput, sessionId, exerciseId, isSubmitting, onSetLogged]);

  const handleDelete = useCallback(async (id: number) => {
    await deleteSet(id);
    setCompletedSets(prev => prev.filter(s => s.id !== id));
  }, []);

  const isConfirmDisabled = weightInput.trim() === '' || repsInput.trim() === '' || isSubmitting;

  return (
    <View style={styles.container}>
      {/* Ghost reference from last session */}
      <GhostReference sets={lastSessionSets} />

      {/* Completed sets list */}
      {completedSets.length > 0 && (
        <FlatList
          data={completedSets}
          keyExtractor={item => String(item.id)}
          renderItem={({ item }) => (
            <SetListItem set={item} onDelete={handleDelete} />
          )}
          scrollEnabled={false}
          style={styles.setList}
        />
      )}

      {/* Input row */}
      <View style={styles.inputRow}>
        <TextInput
          ref={weightRef}
          style={styles.weightInput}
          value={weightInput}
          onChangeText={setWeightInput}
          placeholder="kg"
          placeholderTextColor={colors.secondary}
          keyboardType="decimal-pad"
          returnKeyType="next"
          onSubmitEditing={() => repsRef.current?.focus()}
          blurOnSubmit={false}
        />
        <TextInput
          ref={repsRef}
          style={styles.repsInput}
          value={repsInput}
          onChangeText={setRepsInput}
          placeholder="reps"
          placeholderTextColor={colors.secondary}
          keyboardType="number-pad"
          returnKeyType="done"
          onSubmitEditing={handleConfirm}
        />
      </View>

      {/* Confirm button */}
      <TouchableOpacity
        style={[styles.confirmButton, isConfirmDisabled && styles.confirmButtonDisabled]}
        onPress={handleConfirm}
        disabled={isConfirmDisabled}
        activeOpacity={0.8}>
        <Text style={styles.confirmText}>Log Set</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: 8,
    overflow: 'hidden',
  },
  setList: {
    maxHeight: 220,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.base,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  weightInput: {
    flex: 55,
    backgroundColor: colors.surfaceElevated,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    fontSize: fontSize.xxl,
    fontWeight: weightMedium,
    color: colors.primary,
    textAlign: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
  },
  repsInput: {
    flex: 35,
    backgroundColor: colors.surfaceElevated,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    fontSize: fontSize.xxl,
    fontWeight: weightMedium,
    color: colors.primary,
    textAlign: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
  },
  confirmButton: {
    marginHorizontal: spacing.base,
    marginBottom: spacing.base,
    backgroundColor: colors.accent,
    borderRadius: 10,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  confirmButtonDisabled: {
    opacity: 0.5,
  },
  confirmText: {
    fontSize: fontSize.md,
    fontWeight: weightBold,
    color: colors.background,
  },
});
