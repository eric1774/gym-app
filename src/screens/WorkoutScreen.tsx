import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Svg, { Path } from 'react-native-svg';
import HapticFeedback from 'react-native-haptic-feedback';
import { WorkoutStackParamList } from '../navigation/TabNavigator';
import { useSession } from '../context/SessionContext';
import { useTimer } from '../context/TimerContext';
import { ExercisePickerSheet } from './ExercisePickerSheet';
import { SetLoggingPanel, ProgramTarget } from '../components/SetLoggingPanel';
import { RestTimerBanner } from '../components/RestTimerBanner';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { fontSize, weightBold, weightSemiBold } from '../theme/typography';
import { Exercise, ExerciseCategory, ExerciseMeasurementType, ExerciseSession, ProgramDayExercise, WorkoutSet } from '../types';
import { getProgramDayExercises } from '../db/programs';
import { getExerciseHistory } from '../db/dashboard';
import { hasSessionActivity } from '../db/sessions';
import { checkForPR } from '../db/sets';
import { PRToast, PRToastHandle } from '../components/PRToast';

/** Group session exercises by their exercise category, preserving first-seen order */
function groupByCategory(
  sessionExercises: ExerciseSession[],
  exerciseLookup: Exercise[],
): { category: ExerciseCategory; items: ExerciseSession[] }[] {
  const categoryMap = new Map<ExerciseCategory, ExerciseSession[]>();
  const categoryOrder: ExerciseCategory[] = [];

  for (const se of sessionExercises) {
    const exercise = exerciseLookup.find(ex => ex.id === se.exerciseId);
    const category: ExerciseCategory = exercise?.category ?? 'conditioning';

    if (!categoryMap.has(category)) {
      categoryMap.set(category, []);
      categoryOrder.push(category);
    }
    categoryMap.get(category)!.push(se);
  }

  return categoryOrder.map(cat => ({ category: cat, items: categoryMap.get(cat)! }));
}

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

const HISTORY_ICON_SIZE = 18;

function HistoryIcon({ color }: { color: string }) {
  return (
    <Svg width={HISTORY_ICON_SIZE} height={HISTORY_ICON_SIZE} viewBox="0 0 24 24" fill="none">
      <Path d="M12 8V12L15 15" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M3.05 11A9 9 0 1 1 3.05 13" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M3 4V11H10" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

const CHECK_CIRCLE_SIZE = 28;

interface ExerciseCardProps {
  exerciseSession: ExerciseSession;
  exerciseName: string;
  isActive: boolean;
  setCount: number;
  sessionId: number;
  pendingRest: boolean;
  programTarget: ProgramTarget | null;
  measurementType: ExerciseMeasurementType;
  onPress: () => void;
  onToggleComplete: () => void;
  onSetLogged: (set: WorkoutSet) => void;
  onStartRest: () => void;
  onViewHistory: () => void;
}

function ExerciseCard({
  exerciseSession,
  exerciseName,
  isActive,
  setCount,
  sessionId,
  pendingRest,
  programTarget,
  measurementType,
  onPress,
  onToggleComplete,
  onSetLogged,
  onStartRest,
  onViewHistory,
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
        <View style={styles.cardHeaderRight}>
          <TouchableOpacity
            onPress={onViewHistory}
            style={styles.historyButton}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            activeOpacity={0.7}>
            <HistoryIcon color={colors.secondary} />
          </TouchableOpacity>
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
      </View>

      {isActive && (
        <View style={styles.cardExpanded}>
          <SetLoggingPanel
            sessionId={sessionId}
            exerciseId={exerciseSession.exerciseId}
            onSetLogged={onSetLogged}
            programTarget={programTarget}
            measurementType={measurementType}
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
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NativeStackNavigationProp<WorkoutStackParamList>>();
  const {
    session,
    sessionExercises,
    exercises,
    isLoading,
    programDayId,
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
  const [volumeTotal, setVolumeTotal] = useState(0);
  const completionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prToastRef = useRef<PRToastHandle>(null);

  // Load program day exercises when session is a program workout
  const [programTargetsMap, setProgramTargetsMap] = useState<Map<number, ProgramTarget>>(new Map());
  const [programDayName, setProgramDayName] = useState<string | null>(null);

  useEffect(() => {
    if (programDayId) {
      getProgramDayExercises(programDayId).then((pdes: ProgramDayExercise[]) => {
        const map = new Map<number, ProgramTarget>();
        for (const pde of pdes) {
          map.set(pde.exerciseId, {
            targetSets: pde.targetSets,
            targetReps: pde.targetReps,
            targetWeightKg: pde.targetWeightKg,
          });
        }
        setProgramTargetsMap(map);
      });
    } else {
      setProgramTargetsMap(new Map());
    }
  }, [programDayId]);

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
      HapticFeedback.trigger('impactLight', { enableVibrateFallback: true });
    },
    [toggleExerciseComplete],
  );

  const handleSetLogged = useCallback((exerciseId: number, set: WorkoutSet) => {
    setSetCountsByExercise(prev => ({
      ...prev,
      [exerciseId]: (prev[exerciseId] ?? 0) + 1,
    }));
    setPendingRestExerciseId(exerciseId);

    const exercise = exercises.find(ex => ex.id === exerciseId);
    if (set.isWarmup === false && exercise?.measurementType !== 'timed') {
      setVolumeTotal(prev => prev + set.weightKg * set.reps);

      checkForPR(exerciseId, set.weightKg, set.reps, session!.id).then(isPR => {
        if (isPR) {
          const name = exercises.find(ex => ex.id === exerciseId)?.name ?? 'Exercise';
          prToastRef.current?.showPR(name, set.reps, set.weightKg);
          HapticFeedback.trigger('notificationSuccess', { enableVibrateFallback: true });
          setTimeout(() => {
            HapticFeedback.trigger('notificationSuccess', { enableVibrateFallback: true });
          }, 400);
        }
      });
    }
  }, [exercises, session]);

  const handleStartRest = useCallback(
    (exerciseId: number) => {
      const exercise = exercises.find(ex => ex.id === exerciseId);
      const duration = exercise?.defaultRestSeconds ?? 90;
      startTimer(duration);
      setPendingRestExerciseId(null);
    },
    [exercises, startTimer],
  );

  const handleViewHistory = useCallback(
    async (exerciseId: number) => {
      const exercise = exercises.find(ex => ex.id === exerciseId);
      if (!exercise) { return; }

      const history = await getExerciseHistory(exerciseId);
      if (history.length === 0) {
        Alert.alert('No History', 'No History for this Exercise Exists');
        return;
      }

      navigation.navigate('ExerciseProgress', {
        exerciseId,
        exerciseName: exercise.name,
        measurementType: exercise.measurementType,
      });
    },
    [exercises, navigation],
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

  const handleEndWorkout = useCallback(async () => {
    if (!session) { return; }
    const hadActivity = await hasSessionActivity(session.id);

    if (!hadActivity) {
      Alert.alert(
        'No Exercises Logged',
        'No exercises were logged or completed. Discard this workout?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Discard',
            style: 'destructive',
            onPress: async () => {
              HapticFeedback.trigger('notificationSuccess', { enableVibrateFallback: true });
              const wasProgramWorkout = !!programDayId;
              if (isRunning) { stopTimer(); }
              await endSession();
              setActiveExerciseId(null);
              setSetCountsByExercise({});
              setPendingRestExerciseId(null);
              setVolumeTotal(0);
              if (wasProgramWorkout) {
                (navigation as any).navigate('ProgramsTab');
              }
            },
          },
        ],
      );
    } else {
      Alert.alert(
        'End Workout?',
        'This marks your session complete.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'End Workout',
            style: 'destructive',
            onPress: async () => {
              HapticFeedback.trigger('notificationSuccess', { enableVibrateFallback: true });
              const wasProgramWorkout = !!programDayId;
              if (isRunning) { stopTimer(); }
              await endSession();
              setActiveExerciseId(null);
              setSetCountsByExercise({});
              setPendingRestExerciseId(null);
              setVolumeTotal(0);
              if (wasProgramWorkout) {
                (navigation as any).navigate('ProgramsTab');
              } else {
                showCompletionMessage('Workout complete!');
              }
            },
          },
        ],
      );
    }
  }, [session, endSession, isRunning, stopTimer, showCompletionMessage, programDayId, navigation]);

  if (isLoading) {
    return (
      <SafeAreaView style={styles.centered} edges={['top']}>
        <ActivityIndicator color={colors.accent} size="large" />
      </SafeAreaView>
    );
  }

  if (!session) {
    return (
      <SafeAreaView style={styles.startContainer} edges={['top']}>
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
      </SafeAreaView>
    );
  }

  // Build a session title from exercise categories
  const categories = groupByCategory(sessionExercises, exercises);
  const sessionTitle = programDayId
    ? categories.map(g => g.category.toUpperCase()).join(' & ')
    : null;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Session header */}
      <View style={styles.header}>
        <Text style={styles.timerText}>{formatElapsed(elapsed)}</Text>
        <Text style={styles.volumeText}>
          {volumeTotal > 0 ? `${volumeTotal.toLocaleString()} lbs` : ''}
        </Text>
        <TouchableOpacity
          onPress={handleEndWorkout}
          style={styles.endButtonTouchable}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Text style={styles.endButton}>End Workout</Text>
        </TouchableOpacity>
      </View>

      {/* Session title banner for program workouts */}
      {sessionTitle && sessionExercises.length > 0 && (
        <View style={styles.sessionBanner}>
          <Text style={styles.sessionBannerText} numberOfLines={2}>
            ACTIVE WORKOUT SESSION: {sessionTitle}
          </Text>
        </View>
      )}

      {/* Rest timer banner */}
      {isRunning && (
        <RestTimerBanner
          remainingSeconds={remainingSeconds ?? 0}
          totalSeconds={totalSeconds ?? 0}
          onStop={stopTimer}
        />
      )}

      {/* Exercise list */}
      <KeyboardAvoidingView
        style={styles.scroll}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled">
          {sessionExercises.length === 0 && (
            <Text style={styles.emptyState}>Tap + to add exercises</Text>
          )}
          {categories.map((group, groupIdx) => (
            <View key={group.category}>
              <View style={[styles.categoryHeader, groupIdx > 0 && styles.categoryHeaderSpaced]}>
                <Text style={styles.categoryLabel}>{group.category.toUpperCase()}</Text>
                <View style={styles.categoryLine} />
              </View>
              <View style={styles.categoryContainer}>
                {group.items.map((se) => {
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
                      programTarget={programTargetsMap.get(se.exerciseId) ?? null}
                      measurementType={exercise?.measurementType ?? 'reps'}
                      onPress={() => setActiveExerciseId(isActive ? null : se.exerciseId)}
                      onToggleComplete={() => handleToggleComplete(se.exerciseId)}
                      onSetLogged={(set) => handleSetLogged(se.exerciseId, set)}
                      onStartRest={() => handleStartRest(se.exerciseId)}
                      onViewHistory={() => handleViewHistory(se.exerciseId)}
                    />
                  );
                })}
              </View>
            </View>
          ))}
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Add Exercise FAB */}
      <TouchableOpacity
        style={[styles.fab, { bottom: spacing.xl + insets.bottom }]}
        onPress={() => setPickerVisible(true)}
        activeOpacity={0.85}>
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>

      <ExercisePickerSheet
        visible={pickerVisible}
        onClose={() => setPickerVisible(false)}
        onSelect={handleAddExercise}
      />

      <PRToast ref={prToastRef} />
    </SafeAreaView>
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
  completionMessage: {
    fontSize: fontSize.lg,
    fontWeight: weightSemiBold,
    color: colors.accent,
    marginBottom: spacing.xl,
  },
  startButton: {
    backgroundColor: colors.accent,
    borderRadius: 12,
    paddingVertical: spacing.base,
    alignSelf: 'stretch',
    alignItems: 'center',
    minHeight: 52,
    justifyContent: 'center' as const,
  },
  startButtonText: {
    fontSize: fontSize.lg,
    fontWeight: weightBold,
    color: colors.onAccent,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
  },
  timerText: {
    fontSize: fontSize.xl,
    fontWeight: weightBold,
    color: colors.primary,
    letterSpacing: 2,
  },
  volumeText: {
    fontSize: fontSize.sm,
    fontWeight: weightSemiBold,
    color: colors.secondary,
    letterSpacing: 0.5,
    minWidth: 80,
    textAlign: 'center',
  },
  endButtonTouchable: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: 8,
    minHeight: 40,
    justifyContent: 'center' as const,
  },
  endButton: {
    fontSize: fontSize.sm,
    fontWeight: weightSemiBold,
    color: colors.danger,
  },
  sessionBanner: {
    paddingHorizontal: spacing.base,
    paddingBottom: spacing.md,
  },
  sessionBannerText: {
    fontSize: fontSize.xs,
    fontWeight: weightBold,
    color: colors.secondary,
    letterSpacing: 1.2,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.base,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xxxl + spacing.xl,
  },
  emptyState: {
    textAlign: 'center',
    color: colors.secondary,
    fontSize: fontSize.base,
    marginTop: spacing.xxl,
  },
  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
    paddingLeft: spacing.xs,
  },
  categoryHeaderSpaced: {
    marginTop: spacing.lg,
  },
  categoryLabel: {
    fontSize: fontSize.xs,
    fontWeight: weightBold,
    color: colors.secondary,
    letterSpacing: 1.5,
  },
  categoryLine: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
    marginLeft: spacing.sm,
  },
  categoryContainer: {
    // Groups exercise cards within a category
  },
  card: {
    borderRadius: 14,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  cardActive: {
    backgroundColor: colors.surfaceElevated,
    borderColor: 'rgba(141, 194, 138, 0.2)',
  },
  cardInactive: {
    backgroundColor: colors.surface,
  },
  cardComplete: {
    backgroundColor: colors.accentDim,
    borderColor: 'rgba(141, 194, 138, 0.15)',
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
    fontSize: fontSize.base,
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
  cardHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
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
    fontSize: fontSize.sm,
    fontWeight: weightBold,
    color: colors.onAccent,
    lineHeight: fontSize.sm + 2,
  },
  historyButton: {
    padding: spacing.xs,
  },
  cardExpanded: {
    paddingHorizontal: spacing.base,
    paddingBottom: spacing.base,
  },
  startRestButton: {
    marginTop: spacing.sm,
    backgroundColor: colors.timerActive,
    borderRadius: 10,
    paddingVertical: spacing.sm,
    alignItems: 'center',
  },
  startRestText: {
    fontSize: fontSize.sm,
    fontWeight: weightSemiBold,
    color: colors.onAccent,
  },
  fab: {
    position: 'absolute',
    right: spacing.lg,
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.accent,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fabText: {
    fontSize: fontSize.xl,
    fontWeight: weightBold,
    color: colors.onAccent,
    lineHeight: fontSize.xl + 4,
  },
});
