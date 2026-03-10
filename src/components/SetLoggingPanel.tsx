import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import HapticFeedback from 'react-native-haptic-feedback';
import {
  logSet,
  getSetsForExerciseInSession,
  getLastSessionSets,
  deleteSet,
} from '../db/sets';
import { colors } from '../theme/colors';
import { fontSize, weightBold, weightMedium } from '../theme/typography';
import { spacing } from '../theme/spacing';
import { ExerciseMeasurementType, WorkoutSet } from '../types';
import { GhostReference } from './GhostReference';
import { ProgramTargetReference } from './ProgramTargetReference';
import { SetListItem } from './SetListItem';

export interface ProgramTarget {
  targetSets: number;
  targetReps: number;
  targetWeightKg: number;
}

interface Props {
  sessionId: number;
  exerciseId: number;
  onSetLogged: (set: WorkoutSet) => void;
  programTarget?: ProgramTarget | null;
  measurementType?: ExerciseMeasurementType;
}

/** Format seconds as MM:SS */
function formatStopwatch(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export function SetLoggingPanel({ sessionId, exerciseId, onSetLogged, programTarget, measurementType = 'reps' }: Props) {
  const [weightInput, setWeightInput] = useState('');
  const [repsInput, setRepsInput] = useState('');
  const [completedSets, setCompletedSets] = useState<WorkoutSet[]>([]);
  const [lastSessionSets, setLastSessionSets] = useState<WorkoutSet[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Stopwatch state for timed exercises
  const [stopwatchSeconds, setStopwatchSeconds] = useState(0);
  const [stopwatchRunning, setStopwatchRunning] = useState(false);
  const stopwatchRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const weightRef = useRef<TextInput>(null);
  const repsRef = useRef<TextInput>(null);

  const isTimed = measurementType === 'timed';

  const loadData = useCallback(async () => {
    const [current, last] = await Promise.all([
      getSetsForExerciseInSession(sessionId, exerciseId),
      getLastSessionSets(exerciseId, sessionId),
    ]);
    setCompletedSets(current);
    setLastSessionSets(last);
    // Pre-fill from last session first set if no sets logged yet (reps mode only)
    if (!isTimed && current.length === 0 && last.length > 0) {
      setWeightInput(String(last[0].weightKg));
      setRepsInput(String(last[0].reps));
    } else if (!isTimed && current.length > 0) {
      // Re-expanded panel: pre-fill from most recent intra-session set
      const lastSet = current[current.length - 1];
      setWeightInput(String(lastSet.weightKg));
      setRepsInput(String(lastSet.reps));
    }
  }, [sessionId, exerciseId, isTimed]);

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId, exerciseId]);

  // Cleanup stopwatch on unmount
  useEffect(() => {
    return () => {
      if (stopwatchRef.current) {
        clearInterval(stopwatchRef.current);
      }
    };
  }, []);

  const handleStartStopwatch = useCallback(() => {
    setStopwatchRunning(true);
    stopwatchRef.current = setInterval(() => {
      setStopwatchSeconds(prev => prev + 1);
    }, 1000);
  }, []);

  const handleStopStopwatch = useCallback(() => {
    setStopwatchRunning(false);
    if (stopwatchRef.current) {
      clearInterval(stopwatchRef.current);
      stopwatchRef.current = null;
    }
  }, []);

  const handleResetStopwatch = useCallback(() => {
    setStopwatchRunning(false);
    if (stopwatchRef.current) {
      clearInterval(stopwatchRef.current);
      stopwatchRef.current = null;
    }
    setStopwatchSeconds(0);
  }, []);

  const handleStepWeight = useCallback((delta: number) => {
    const current = parseFloat(weightInput) || 0;
    const newWeight = Math.max(0, current + delta);
    setWeightInput(String(newWeight));
    HapticFeedback.trigger('impactLight', { enableVibrateFallback: true });
  }, [weightInput]);

  const handleConfirm = useCallback(async () => {
    if (isSubmitting) {
      return;
    }

    if (isTimed) {
      if (stopwatchSeconds === 0) {
        return;
      }
      setIsSubmitting(true);
      try {
        // Store duration in reps (seconds), weight as 0
        const newSet = await logSet(sessionId, exerciseId, 0, stopwatchSeconds);
        setCompletedSets(prev => [...prev, newSet]);
        onSetLogged(newSet);
        HapticFeedback.trigger('impactMedium', { enableVibrateFallback: true });
        handleResetStopwatch();
      } finally {
        setIsSubmitting(false);
      }
    } else {
      const weight = parseFloat(weightInput);
      const reps = parseInt(repsInput, 10);
      if (isNaN(weight) || isNaN(reps)) {
        return;
      }
      setIsSubmitting(true);
      try {
        const newSet = await logSet(sessionId, exerciseId, weight, reps);
        setCompletedSets(prev => [...prev, newSet]);
        onSetLogged(newSet);
        HapticFeedback.trigger('impactMedium', { enableVibrateFallback: true });
        // Pre-fill with the just-logged values for the next set
        setWeightInput(String(newSet.weightKg));
        setRepsInput(String(newSet.reps));
      } finally {
        setIsSubmitting(false);
      }
    }
  }, [weightInput, repsInput, sessionId, exerciseId, isSubmitting, onSetLogged, isTimed, stopwatchSeconds, handleResetStopwatch]);

  const handleDelete = useCallback(async (id: number) => {
    await deleteSet(id);
    setCompletedSets(prev => prev.filter(s => s.id !== id));
  }, []);

  const isConfirmDisabled = isTimed
    ? stopwatchSeconds === 0 || stopwatchRunning || isSubmitting
    : weightInput.trim() === '' || repsInput.trim() === '' || isSubmitting;

  const weightValue = parseFloat(weightInput);
  const isWeightAtZero = isNaN(weightValue) || weightValue <= 0;

  return (
    <View style={styles.container}>
      {/* Program target reference (shown during program workouts) */}
      {programTarget && (
        <ProgramTargetReference
          targetSets={programTarget.targetSets}
          targetReps={programTarget.targetReps}
          targetWeightKg={programTarget.targetWeightKg}
        />
      )}

      {/* Ghost reference from last session */}
      <GhostReference sets={lastSessionSets} isTimed={isTimed} />

      {/* Completed sets list */}
      {completedSets.length > 0 && (
        <ScrollView nestedScrollEnabled style={styles.setList}>
          {completedSets.map(set => (
            <SetListItem key={set.id} set={set} onDelete={handleDelete} isTimed={isTimed} />
          ))}
        </ScrollView>
      )}

      {isTimed ? (
        /* Stopwatch UI for timed exercises */
        <View style={styles.stopwatchContainer}>
          <Text style={styles.stopwatchDisplay}>{formatStopwatch(stopwatchSeconds)}</Text>
          <View style={styles.stopwatchButtons}>
            {!stopwatchRunning ? (
              <TouchableOpacity
                style={styles.stopwatchStartButton}
                onPress={handleStartStopwatch}
                activeOpacity={0.8}>
                <Text style={styles.stopwatchButtonText}>
                  {stopwatchSeconds > 0 ? 'Resume' : 'Start'}
                </Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={styles.stopwatchStopButton}
                onPress={handleStopStopwatch}
                activeOpacity={0.8}>
                <Text style={styles.stopwatchButtonText}>Stop</Text>
              </TouchableOpacity>
            )}
            {stopwatchSeconds > 0 && !stopwatchRunning && (
              <TouchableOpacity
                style={styles.stopwatchResetButton}
                onPress={handleResetStopwatch}
                activeOpacity={0.8}>
                <Text style={styles.stopwatchResetText}>Reset</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      ) : (
        /* Stacked weight + reps layout for rep-based exercises */
        <View style={styles.inputColumn}>
          {/* Weight row with steppers */}
          <View style={styles.weightRow}>
            <TouchableOpacity
              style={[styles.stepperButton, isWeightAtZero && styles.stepperButtonDisabled]}
              onPress={() => handleStepWeight(-5)}
              disabled={isWeightAtZero}
              activeOpacity={0.7}>
              <Text style={[styles.stepperText, isWeightAtZero && styles.stepperTextDisabled]}>-5</Text>
            </TouchableOpacity>
            <TextInput
              ref={weightRef}
              style={styles.weightInput}
              value={weightInput}
              onChangeText={setWeightInput}
              placeholder="lb"
              placeholderTextColor={colors.secondary}
              keyboardType="decimal-pad"
              returnKeyType="next"
              onSubmitEditing={() => repsRef.current?.focus()}
              blurOnSubmit={false}
            />
            <TouchableOpacity
              style={styles.stepperButton}
              onPress={() => handleStepWeight(5)}
              activeOpacity={0.7}>
              <Text style={styles.stepperText}>+5</Text>
            </TouchableOpacity>
          </View>
          {/* Reps row */}
          <View style={styles.repsRow}>
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
        </View>
      )}

      {/* Confirm button */}
      <TouchableOpacity
        style={[styles.confirmButton, isConfirmDisabled && styles.confirmButtonDisabled]}
        onPress={handleConfirm}
        disabled={isConfirmDisabled}
        activeOpacity={0.8}>
        <Text style={styles.confirmText}>{isTimed ? 'Log Time' : 'Log Set'}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: 10,
    overflow: 'hidden',
  },
  setList: {
    maxHeight: 220,
  },
  inputColumn: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    gap: spacing.sm,
  },
  weightRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  repsRow: {
    // reps input stretches full width within the column
  },
  stepperButton: {
    width: 56,
    height: 48,
    backgroundColor: colors.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepperButtonDisabled: {
    opacity: 0.3,
  },
  stepperText: {
    fontSize: fontSize.lg,
    fontWeight: weightBold,
    color: colors.primary,
  },
  stepperTextDisabled: {
    color: colors.secondary,
  },
  weightInput: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 10,
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
    backgroundColor: colors.surface,
    borderRadius: 10,
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
    marginHorizontal: spacing.md,
    marginBottom: spacing.md,
    backgroundColor: colors.accent,
    borderRadius: 12,
    paddingVertical: spacing.md,
    alignItems: 'center',
    minHeight: 44,
    justifyContent: 'center' as const,
  },
  confirmButtonDisabled: {
    opacity: 0.5,
  },
  confirmText: {
    fontSize: fontSize.base,
    fontWeight: weightBold,
    color: colors.onAccent,
  },
  // Stopwatch styles
  stopwatchContainer: {
    alignItems: 'center',
    paddingHorizontal: spacing.base,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  stopwatchDisplay: {
    fontSize: 48,
    fontWeight: weightBold,
    color: colors.timerActive,
    letterSpacing: 4,
    fontVariant: ['tabular-nums'],
  },
  stopwatchButtons: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.md,
  },
  stopwatchStartButton: {
    backgroundColor: colors.accent,
    borderRadius: 12,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xxl,
    minHeight: 44,
    justifyContent: 'center' as const,
    alignItems: 'center',
  },
  stopwatchStopButton: {
    backgroundColor: colors.danger,
    borderRadius: 12,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xxl,
    minHeight: 44,
    justifyContent: 'center' as const,
    alignItems: 'center',
  },
  stopwatchButtonText: {
    fontSize: fontSize.md,
    fontWeight: weightBold,
    color: colors.onAccent,
  },
  stopwatchResetButton: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xl,
    minHeight: 44,
    justifyContent: 'center' as const,
    alignItems: 'center',
  },
  stopwatchResetText: {
    fontSize: fontSize.md,
    fontWeight: weightMedium,
    color: colors.secondary,
  },
});
