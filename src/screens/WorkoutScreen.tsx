import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ActivityIndicator,
} from 'react-native';
import { useSession } from '../context/SessionContext';
import { ExercisePickerSheet } from './ExercisePickerSheet';
import { SetLoggingPanel } from '../components/SetLoggingPanel';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { fontSize, weightBold, weightSemiBold, weightMedium } from '../theme/typography';
import { Exercise, ExerciseSession, WorkoutSet } from '../types';

/** Format elapsed seconds as MM:SS */
function formatElapsed(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function useElapsedSeconds(startedAt: string | null): number {
  const [elapsed, setElapsed] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!startedAt) {
      setElapsed(0);
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    const tick = () => {
      const diff = Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000);
      setElapsed(diff);
    };

    tick();
    intervalRef.current = setInterval(tick, 1000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [startedAt]);

  return elapsed;
}

interface ExerciseCardProps {
  exerciseSession: ExerciseSession;
  exerciseName: string;
  isActive: boolean;
  setCount: number;
  sessionId: number;
  onPress: () => void;
  onMarkComplete: () => void;
  onSetLogged: (set: WorkoutSet) => void;
}

function ExerciseCard({
  exerciseSession,
  exerciseName,
  isActive,
  setCount,
  sessionId,
  onPress,
  onMarkComplete,
  onSetLogged,
}: ExerciseCardProps) {
  const isComplete = exerciseSession.isComplete;

  return (
    <TouchableOpacity
      style={[
        styles.card,
        isActive ? styles.cardActive : styles.cardInactive,
        isComplete && styles.cardComplete,
      ]}
      onPress={onPress}
      activeOpacity={0.8}>
      <View style={styles.cardHeader}>
        <View style={styles.cardNameContainer}>
          <Text style={[styles.cardName, isComplete && styles.cardNameComplete]}>
            {exerciseName}
          </Text>
          {!isActive && setCount > 0 && (
            <Text style={styles.setCountLabel}>{setCount} set{setCount !== 1 ? 's' : ''} logged</Text>
          )}
        </View>
        <TouchableOpacity
          onPress={onMarkComplete}
          style={[
            styles.checkButton,
            isComplete ? styles.checkButtonDone : styles.checkButtonPending,
          ]}>
          <Text
            style={[
              styles.checkText,
              isComplete ? styles.checkTextDone : styles.checkTextPending,
            ]}>
            {isComplete ? 'Done' : 'Mark Done'}
          </Text>
        </TouchableOpacity>
      </View>

      {isActive && (
        <View style={styles.cardExpanded}>
          <SetLoggingPanel
            sessionId={sessionId}
            exerciseId={exerciseSession.exerciseId}
            onSetLogged={onSetLogged}
          />
        </View>
      )}
    </TouchableOpacity>
  );
}

export function WorkoutScreen() {
  const {
    session,
    sessionExercises,
    exercises,
    isLoading,
    startSession,
    endSession,
    addExercise,
    markExerciseComplete,
  } = useSession();

  const elapsed = useElapsedSeconds(session?.startedAt ?? null);
  const [activeExerciseId, setActiveExerciseId] = useState<number | null>(null);
  const [pickerVisible, setPickerVisible] = useState(false);
  const [setCountsByExercise, setSetCountsByExercise] = useState<Record<number, number>>({});

  // Default to first non-complete exercise on session load
  useEffect(() => {
    if (sessionExercises.length > 0 && activeExerciseId === null) {
      const firstIncomplete = sessionExercises.find(se => !se.isComplete);
      if (firstIncomplete) {
        setActiveExerciseId(firstIncomplete.exerciseId);
      } else {
        setActiveExerciseId(sessionExercises[0].exerciseId);
      }
    }
    if (sessionExercises.length === 0) {
      setActiveExerciseId(null);
    }
  }, [sessionExercises, activeExerciseId]);

  const handleAddExercise = useCallback(
    async (exercise: Exercise) => {
      await addExercise(exercise);
      // Auto-expand the newly added exercise
      setActiveExerciseId(exercise.id);
    },
    [addExercise],
  );

  const handleMarkComplete = useCallback(
    async (exerciseId: number) => {
      await markExerciseComplete(exerciseId);
    },
    [markExerciseComplete],
  );

  const handleSetLogged = useCallback((exerciseId: number, _set: WorkoutSet) => {
    setSetCountsByExercise(prev => ({
      ...prev,
      [exerciseId]: (prev[exerciseId] ?? 0) + 1,
    }));
  }, []);

  const handleEndWorkout = useCallback(() => {
    Alert.alert(
      'End Workout',
      'End workout? This marks the session complete.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'End',
          style: 'destructive',
          onPress: async () => {
            await endSession();
            setActiveExerciseId(null);
            setSetCountsByExercise({});
          },
        },
      ],
    );
  }, [endSession]);

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={colors.accent} size="large" />
      </View>
    );
  }

  if (!session) {
    return (
      <View style={styles.startContainer}>
        <Text style={styles.readyLabel}>Ready to train?</Text>
        <TouchableOpacity
          style={styles.startButton}
          onPress={startSession}
          activeOpacity={0.85}>
          <Text style={styles.startButtonText}>Start Workout</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Session header */}
      <View style={styles.header}>
        <Text style={styles.timerText}>{formatElapsed(elapsed)}</Text>
        <TouchableOpacity onPress={handleEndWorkout}>
          <Text style={styles.endButton}>End Workout</Text>
        </TouchableOpacity>
      </View>

      {/* Exercise list */}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled">
        {sessionExercises.length === 0 && (
          <Text style={styles.emptyState}>Tap + to add exercises</Text>
        )}
        {sessionExercises.map((se) => {
          const exercise = exercises.find(ex => ex.id === se.exerciseId);
          const name = exercise?.name ?? `Exercise ${se.exerciseId}`;
          const isActive = activeExerciseId === se.exerciseId;
          const setCount = setCountsByExercise[se.exerciseId] ?? 0;
          return (
            <ExerciseCard
              key={se.exerciseId}
              exerciseSession={se}
              exerciseName={name}
              isActive={isActive}
              setCount={setCount}
              sessionId={session.id}
              onPress={() => setActiveExerciseId(isActive ? null : se.exerciseId)}
              onMarkComplete={() => handleMarkComplete(se.exerciseId)}
              onSetLogged={(set) => handleSetLogged(se.exerciseId, set)}
            />
          );
        })}
      </ScrollView>

      {/* Add Exercise FAB */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => setPickerVisible(true)}
        activeOpacity={0.85}>
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>

      <ExercisePickerSheet
        visible={pickerVisible}
        onClose={() => setPickerVisible(false)}
        onSelect={handleAddExercise}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  centered: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  startContainer: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.base,
  },
  readyLabel: {
    fontSize: fontSize.base,
    color: colors.secondary,
    marginBottom: spacing.xl,
  },
  startButton: {
    backgroundColor: colors.accent,
    borderRadius: 10,
    paddingVertical: spacing.base,
    alignSelf: 'stretch',
    alignItems: 'center',
  },
  startButtonText: {
    fontSize: fontSize.lg,
    fontWeight: weightBold,
    color: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  timerText: {
    fontSize: fontSize.xl,
    fontWeight: weightBold,
    color: colors.primary,
    letterSpacing: 2,
  },
  endButton: {
    fontSize: fontSize.base,
    fontWeight: weightSemiBold,
    color: colors.danger,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.base,
    paddingTop: spacing.md,
    paddingBottom: spacing.xxxl + spacing.xl, // room for FAB
  },
  emptyState: {
    textAlign: 'center',
    color: colors.secondary,
    fontSize: fontSize.base,
    marginTop: spacing.xxl,
  },
  card: {
    borderRadius: 10,
    marginBottom: spacing.sm,
    overflow: 'hidden',
  },
  cardActive: {
    backgroundColor: colors.surfaceElevated,
  },
  cardInactive: {
    backgroundColor: colors.surface,
  },
  cardComplete: {
    backgroundColor: colors.accentDim,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
  },
  cardNameContainer: {
    flex: 1,
    marginRight: spacing.sm,
  },
  cardName: {
    fontSize: fontSize.md,
    fontWeight: weightSemiBold,
    color: colors.primary,
  },
  cardNameComplete: {
    color: colors.secondary,
    textDecorationLine: 'line-through',
  },
  setCountLabel: {
    fontSize: fontSize.sm,
    color: colors.secondary,
    marginTop: 2,
  },
  checkButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: 6,
    borderWidth: 1,
  },
  checkButtonDone: {
    borderColor: colors.accent,
    backgroundColor: colors.accentDim,
  },
  checkButtonPending: {
    borderColor: colors.border,
    backgroundColor: 'transparent',
  },
  checkText: {
    fontSize: fontSize.sm,
    fontWeight: weightMedium,
  },
  checkTextDone: {
    color: colors.accent,
  },
  checkTextPending: {
    color: colors.secondary,
  },
  cardExpanded: {
    paddingHorizontal: spacing.base,
    paddingBottom: spacing.base,
  },

  fab: {
    position: 'absolute',
    bottom: spacing.xl,
    right: spacing.xl,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.accent,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
  },
  fabText: {
    fontSize: fontSize.xl,
    fontWeight: weightBold,
    color: colors.background,
    lineHeight: fontSize.xl + 4,
  },
});
