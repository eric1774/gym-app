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
import { useTimer } from '../context/TimerContext';
import { ExercisePickerSheet } from './ExercisePickerSheet';
import { SetLoggingPanel } from '../components/SetLoggingPanel';
import { RestTimerBanner } from '../components/RestTimerBanner';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { fontSize, weightBold, weightSemiBold } from '../theme/typography';
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
  pendingRest: boolean;
  onPress: () => void;
  onToggleComplete: () => void;
  onSetLogged: (set: WorkoutSet) => void;
  onStartRest: () => void;
}

function ExerciseCard({
  exerciseSession,
  exerciseName,
  isActive,
  setCount,
  sessionId,
  pendingRest,
  onPress,
  onToggleComplete,
  onSetLogged,
  onStartRest,
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
            <Text style={styles.setCountLabel}>
              {setCount} set{setCount !== 1 ? 's' : ''} logged
            </Text>
          )}
        </View>
        {/* Circular checkmark toggle — outline when pending, filled accent when complete */}
        <TouchableOpacity
          onPress={onToggleComplete}
          style={[
            styles.checkCircle,
            isComplete ? styles.checkCircleDone : styles.checkCirclePending,
          ]}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          {isComplete && (
            <Text style={styles.checkIcon}>{'\u2713'}</Text>
          )}
        </TouchableOpacity>
      </View>

      {isActive && (
        <View style={styles.cardExpanded}>
          <SetLoggingPanel
            sessionId={sessionId}
            exerciseId={exerciseSession.exerciseId}
            onSetLogged={onSetLogged}
          />
          {pendingRest && (
            <TouchableOpacity
              style={styles.startRestButton}
              onPress={onStartRest}
              activeOpacity={0.85}>
              <Text style={styles.startRestText}>Start Rest Timer</Text>
            </TouchableOpacity>
          )}
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
    toggleExerciseComplete,
  } = useSession();
  const { remainingSeconds, totalSeconds, isRunning, startTimer, stopTimer } = useTimer();

  const elapsed = useElapsedSeconds(session?.startedAt ?? null);
  const [activeExerciseId, setActiveExerciseId] = useState<number | null>(null);
  const [pickerVisible, setPickerVisible] = useState(false);
  const [setCountsByExercise, setSetCountsByExercise] = useState<Record<number, number>>({});
  const [pendingRestExerciseId, setPendingRestExerciseId] = useState<number | null>(null);
  const [completionMessage, setCompletionMessage] = useState<string | null>(null);
  const completionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  // Cleanup completion message timer on unmount
  useEffect(() => {
    return () => {
      if (completionTimerRef.current) {
        clearTimeout(completionTimerRef.current);
      }
    };
  }, []);

  const handleAddExercise = useCallback(
    async (exercise: Exercise) => {
      await addExercise(exercise);
      setActiveExerciseId(exercise.id);
    },
    [addExercise],
  );

  const handleToggleComplete = useCallback(
    async (exerciseId: number) => {
      await toggleExerciseComplete(exerciseId);
    },
    [toggleExerciseComplete],
  );

  const handleSetLogged = useCallback((exerciseId: number, _set: WorkoutSet) => {
    setSetCountsByExercise(prev => ({
      ...prev,
      [exerciseId]: (prev[exerciseId] ?? 0) + 1,
    }));
    setPendingRestExerciseId(exerciseId);
  }, []);

  const handleStartRest = useCallback(
    (exerciseId: number) => {
      const exercise = exercises.find(ex => ex.id === exerciseId);
      const duration = exercise?.defaultRestSeconds ?? 90;
      startTimer(duration);
      setPendingRestExerciseId(null);
    },
    [exercises, startTimer],
  );

  const showCompletionMessage = useCallback((message: string) => {
    if (completionTimerRef.current) {
      clearTimeout(completionTimerRef.current);
    }
    setCompletionMessage(message);
    completionTimerRef.current = setTimeout(() => {
      setCompletionMessage(null);
      completionTimerRef.current = null;
    }, 2000);
  }, []);

  const handleEndWorkout = useCallback(() => {
    Alert.alert(
      'End Workout?',
      'This marks your session complete.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'End Workout',
          style: 'destructive',
          onPress: async () => {
            if (isRunning) {
              stopTimer();
            }
            await endSession();
            setActiveExerciseId(null);
            setSetCountsByExercise({});
            setPendingRestExerciseId(null);
            showCompletionMessage('Workout complete!');
          },
        },
      ],
    );
  }, [endSession, isRunning, stopTimer, showCompletionMessage]);

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
        {completionMessage ? (
          <Text style={styles.completionMessage}>{completionMessage}</Text>
        ) : (
          <Text style={styles.readyLabel}>Ready to train?</Text>
        )}
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

      {/* Rest timer banner */}
      {isRunning && (
        <RestTimerBanner
          remainingSeconds={remainingSeconds ?? 0}
          totalSeconds={totalSeconds ?? 0}
          onStop={stopTimer}
        />
      )}

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
              pendingRest={pendingRestExerciseId === se.exerciseId}
              onPress={() => setActiveExerciseId(isActive ? null : se.exerciseId)}
              onToggleComplete={() => handleToggleComplete(se.exerciseId)}
              onSetLogged={(set) => handleSetLogged(se.exerciseId, set)}
              onStartRest={() => handleStartRest(se.exerciseId)}
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

const CHECK_CIRCLE_SIZE = 32;

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
  completionMessage: {
    fontSize: fontSize.lg,
    fontWeight: weightSemiBold,
    color: colors.accent,
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
    fontSize: fontSize.sm,
    fontWeight: weightSemiBold,
    color: colors.danger,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.base,
    paddingTop: spacing.md,
    paddingBottom: spacing.xxxl + spacing.xl,
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
  },
  setCountLabel: {
    fontSize: fontSize.sm,
    color: colors.secondary,
    marginTop: 2,
  },
  checkCircle: {
    width: CHECK_CIRCLE_SIZE,
    height: CHECK_CIRCLE_SIZE,
    borderRadius: CHECK_CIRCLE_SIZE / 2,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
  },
  checkCirclePending: {
    borderColor: colors.secondary,
    backgroundColor: 'transparent',
  },
  checkCircleDone: {
    borderColor: colors.accent,
    backgroundColor: colors.accent,
  },
  checkIcon: {
    fontSize: fontSize.base,
    fontWeight: weightBold,
    color: colors.background,
    lineHeight: fontSize.base + 2,
  },
  cardExpanded: {
    paddingHorizontal: spacing.base,
    paddingBottom: spacing.base,
  },
  startRestButton: {
    marginTop: spacing.sm,
    backgroundColor: colors.timerActive,
    borderRadius: 8,
    paddingVertical: spacing.sm,
    alignItems: 'center',
  },
  startRestText: {
    fontSize: fontSize.sm,
    fontWeight: weightSemiBold,
    color: colors.background,
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
