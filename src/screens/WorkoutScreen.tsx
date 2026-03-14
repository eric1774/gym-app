import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  LayoutAnimation,
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
import { hasSessionActivity, updateSessionRestSeconds } from '../db/sessions';
import { checkForPR } from '../db/sets';
import { updateDefaultRestSeconds } from '../db/exercises';
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

type WorkoutSection =
  | { type: 'superset'; groupId: number; exerciseIds: number[] }
  | { type: 'category'; category: ExerciseCategory; items: ExerciseSession[] };

/**
 * Groups sessionExercises into a render list of WorkoutSection items.
 * Superset exercises are grouped by groupId first (in sortOrder). Non-superset
 * exercises fall through to the existing category-based grouping.
 */
function groupForWorkout(
  sessionExercises: ExerciseSession[],
  exerciseLookup: Exercise[],
  exerciseSupersetMap: Map<number, number>,
  supersetGroups: Map<number, number[]>,
): WorkoutSection[] {
  const sections: WorkoutSection[] = [];

  // Build superset sections in the order their first exercise appears in sessionExercises
  const seenGroupIds = new Set<number>();
  const nonSupersetSessions: ExerciseSession[] = [];

  for (const se of sessionExercises) {
    const groupId = exerciseSupersetMap.get(se.exerciseId);
    if (groupId !== undefined) {
      if (!seenGroupIds.has(groupId)) {
        seenGroupIds.add(groupId);
        const exerciseIds = supersetGroups.get(groupId) ?? [se.exerciseId];
        sections.push({ type: 'superset', groupId, exerciseIds });
      }
    } else {
      nonSupersetSessions.push(se);
    }
  }

  // Append category sections for non-superset exercises
  const catGroups = groupByCategory(nonSupersetSessions, exerciseLookup);
  for (const g of catGroups) {
    sections.push({ type: 'category', category: g.category, items: g.items });
  }

  return sections;
}

/** Format elapsed seconds as MM:SS (or H:MM:SS for sessions >= 1 hour) */
function formatElapsed(seconds: number): string {
  if (seconds >= 3600) {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }
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
  restSeconds: number;
  insideSuperset?: boolean;
  isLastInSuperset?: boolean;
  onPress: () => void;
  onToggleComplete: () => void;
  onSetLogged: (set: WorkoutSet) => void;
  onStartRest: () => void;
  onViewHistory: () => void;
  onRestChange: (newRestSeconds: number) => void;
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
  restSeconds,
  insideSuperset = false,
  onPress,
  onToggleComplete,
  onSetLogged,
  onStartRest,
  onViewHistory,
  onRestChange,
}: ExerciseCardProps) {
  const isComplete = exerciseSession.isComplete;
  const [restStepperVisible, setRestStepperVisible] = useState(false);

  return (
    <TouchableOpacity
      style={[
        insideSuperset ? styles.cardInSuperset : styles.card,
        isActive ? styles.cardActive : styles.cardInactive,
        isComplete && styles.cardComplete,
      ]}
      onPress={onPress}
      activeOpacity={0.8}>
      <View style={[styles.cardHeader, insideSuperset && styles.cardHeaderInSuperset]}>
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
        <View style={[styles.cardExpanded, insideSuperset && styles.cardExpandedInSuperset]}>
          {/* Rest duration label + stepper */}
          <TouchableOpacity
            style={styles.restLabelRow}
            onPress={() => setRestStepperVisible(v => !v)}
            activeOpacity={0.7}>
            <Text style={styles.restLabelText}>Rest: {restSeconds}s</Text>
          </TouchableOpacity>
          {restStepperVisible && (
            <View style={styles.restStepperRow}>
              <TouchableOpacity
                style={[styles.restStepperButton, restSeconds <= 30 && styles.restStepperButtonDisabled]}
                onPress={() => {
                  if (restSeconds > 30) {
                    onRestChange(restSeconds - 15);
                    HapticFeedback.trigger('impactLight', { enableVibrateFallback: true });
                  }
                }}
                disabled={restSeconds <= 30}
                activeOpacity={0.7}>
                <Text style={[styles.restStepperText, restSeconds <= 30 && styles.restStepperTextDisabled]}>-15</Text>
              </TouchableOpacity>
              <Text style={styles.restStepperValue}>{restSeconds}s</Text>
              <TouchableOpacity
                style={[styles.restStepperButton, restSeconds >= 180 && styles.restStepperButtonDisabled]}
                onPress={() => {
                  if (restSeconds < 180) {
                    onRestChange(restSeconds + 15);
                    HapticFeedback.trigger('impactLight', { enableVibrateFallback: true });
                  }
                }}
                disabled={restSeconds >= 180}
                activeOpacity={0.7}>
                <Text style={[styles.restStepperText, restSeconds >= 180 && styles.restStepperTextDisabled]}>+15</Text>
              </TouchableOpacity>
            </View>
          )}
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

interface SupersetContainerProps {
  groupId: number;
  exerciseIds: number[];
  sessionExercises: ExerciseSession[];
  exercises: Exercise[];
  activeExerciseId: number | null;
  setCountsByExercise: Record<number, number>;
  pendingRestExerciseId: number | null;
  programTargetsMap: Map<number, ProgramTarget>;
  restOverrides: Record<number, number>;
  sessionId: number;
  onPressExercise: (exerciseId: number, isActive: boolean) => void;
  onToggleComplete: (exerciseId: number) => void;
  onSetLogged: (exerciseId: number, set: WorkoutSet) => void;
  onStartRest: (exerciseId: number) => void;
  onViewHistory: (exerciseId: number) => void;
  onRestChange: (exerciseId: number, newRestSeconds: number) => void;
}

function SupersetContainer({
  groupId,
  exerciseIds,
  sessionExercises,
  exercises,
  activeExerciseId,
  setCountsByExercise,
  pendingRestExerciseId,
  programTargetsMap,
  restOverrides,
  sessionId,
  onPressExercise,
  onToggleComplete,
  onSetLogged,
  onStartRest,
  onViewHistory,
  onRestChange,
}: SupersetContainerProps) {
  // Round = min completed sets across all exercises + 1
  const round = Math.min(...exerciseIds.map(id => setCountsByExercise[id] ?? 0)) + 1;
  const total = Math.max(...exerciseIds.map(id => programTargetsMap.get(id)?.targetSets ?? 3));

  return (
    <View style={supersetStyles.container}>
      {/* Mint accent bar on the left */}
      <View style={supersetStyles.accentBar} />

      {/* SUPERSET header label */}
      <View style={supersetStyles.header}>
        <Text style={supersetStyles.headerText}>
          {'SUPERSET \u00B7 Round '}{round}/{total}
        </Text>
      </View>

      {/* Exercise cards */}
      {exerciseIds.map((exerciseId, index) => {
        const se = sessionExercises.find(s => s.exerciseId === exerciseId);
        if (!se) { return null; }
        const exercise = exercises.find(ex => ex.id === exerciseId);
        const name = exercise?.name ?? `Exercise ${exerciseId}`;
        const isActive = activeExerciseId === exerciseId;
        const setCount = setCountsByExercise[exerciseId] ?? 0;
        const isLast = index === exerciseIds.length - 1;

        return (
          <View key={exerciseId}>
            {index > 0 && <View style={supersetStyles.divider} />}
            <ExerciseCard
              exerciseSession={se}
              exerciseName={name}
              isActive={isActive}
              setCount={setCount}
              sessionId={sessionId}
              pendingRest={pendingRestExerciseId === exerciseId}
              programTarget={programTargetsMap.get(exerciseId) ?? null}
              measurementType={exercise?.measurementType ?? 'reps'}
              restSeconds={restOverrides[exerciseId] ?? se.restSeconds}
              insideSuperset={true}
              isLastInSuperset={isLast}
              onPress={() => onPressExercise(exerciseId, isActive)}
              onToggleComplete={() => onToggleComplete(exerciseId)}
              onSetLogged={(set) => onSetLogged(exerciseId, set)}
              onStartRest={() => onStartRest(exerciseId)}
              onViewHistory={() => onViewHistory(exerciseId)}
              onRestChange={(newRest) => onRestChange(exerciseId, newRest)}
            />
          </View>
        );
      })}
    </View>
  );
}

const supersetStyles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.sm,
    overflow: 'hidden',
  },
  accentBar: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
    backgroundColor: colors.accent,
    borderTopLeftRadius: 14,
    borderBottomLeftRadius: 14,
  },
  header: {
    paddingLeft: spacing.base + 8,
    paddingRight: spacing.base,
    paddingTop: spacing.md,
    paddingBottom: spacing.xs,
  },
  headerText: {
    fontSize: 11,
    fontWeight: weightBold,
    color: colors.secondary,
    letterSpacing: 1.5,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
    marginLeft: spacing.base + 8,
  },
});

interface WorkoutSummaryProps {
  duration: number;
  totalSets: number;
  totalVolume: number;
  exercisesCompleted: number;
  exercisesTotal: number;
  prCount: number;
  onDismiss: () => void;
}

function WorkoutSummary({
  duration,
  totalSets,
  totalVolume,
  exercisesCompleted,
  exercisesTotal,
  prCount,
  onDismiss,
}: WorkoutSummaryProps) {
  return (
    <SafeAreaView style={summaryStyles.container} edges={['top', 'bottom']}>
      <View style={summaryStyles.card}>
        {/* Heading */}
        <Text style={summaryStyles.heading}>Workout Complete</Text>

        {/* Stats table */}
        <View style={summaryStyles.statsContainer}>
          <View style={summaryStyles.statRow}>
            <Text style={summaryStyles.statLabel}>Duration</Text>
            <Text style={summaryStyles.statValue}>{formatElapsed(duration)}</Text>
          </View>

          <View style={summaryStyles.statRow}>
            <Text style={summaryStyles.statLabel}>Total Sets</Text>
            <Text style={summaryStyles.statValue}>{totalSets}</Text>
          </View>

          <View style={summaryStyles.statRow}>
            <Text style={summaryStyles.statLabel}>Volume</Text>
            <Text style={summaryStyles.statValue}>
              {totalVolume > 0 ? `${totalVolume.toLocaleString()} lbs` : '0 lbs'}
            </Text>
          </View>

          <View style={summaryStyles.statRow}>
            <Text style={summaryStyles.statLabel}>Exercises</Text>
            <Text style={summaryStyles.statValue}>{exercisesCompleted}/{exercisesTotal}</Text>
          </View>

          {prCount > 0 && (
            <View style={summaryStyles.statRow}>
              <Text style={summaryStyles.prLabel}>{'\uD83C\uDFC6'} PRs</Text>
              <Text style={summaryStyles.prValue}>{prCount}</Text>
            </View>
          )}
        </View>

        {/* Done button */}
        <TouchableOpacity
          style={summaryStyles.doneButton}
          onPress={onDismiss}
          activeOpacity={0.85}>
          <Text style={summaryStyles.doneButtonText}>Done</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
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
  const [restOverrides, setRestOverrides] = useState<Record<number, number>>({});
  const [prCount, setPrCount] = useState(0);
  const [showSummary, setShowSummary] = useState(false);
  const [summaryData, setSummaryData] = useState<{
    duration: number;
    totalSets: number;
    totalVolume: number;
    exercisesCompleted: number;
    exercisesTotal: number;
    prCount: number;
  } | null>(null);
  const completionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prToastRef = useRef<PRToastHandle>(null);
  // Track the last superset exercise that triggered a rest timer (for post-rest auto-advance)
  const lastSupersetRestRef = useRef<{ groupId: number; exerciseId: number } | null>(null);

  // Load program day exercises when session is a program workout
  const [programTargetsMap, setProgramTargetsMap] = useState<Map<number, ProgramTarget>>(new Map());
  const [programDayName, setProgramDayName] = useState<string | null>(null);
  // Superset group maps: groupId -> ordered exerciseIds, exerciseId -> groupId
  const [supersetGroups, setSupersetGroups] = useState<Map<number, number[]>>(new Map());
  const [exerciseSupersetMap, setExerciseSupersetMap] = useState<Map<number, number>>(new Map());
  // Refs for accessing superset maps inside callbacks without stale closures
  const supersetGroupsRef = useRef<Map<number, number[]>>(new Map());
  const exerciseSupersetMapRef = useRef<Map<number, number>>(new Map());

  useEffect(() => {
    if (programDayId) {
      getProgramDayExercises(programDayId).then((pdes: ProgramDayExercise[]) => {
        // Build programTargetsMap
        const map = new Map<number, ProgramTarget>();
        for (const pde of pdes) {
          map.set(pde.exerciseId, {
            targetSets: pde.targetSets,
            targetReps: pde.targetReps,
            targetWeightKg: pde.targetWeightKg,
          });
        }
        setProgramTargetsMap(map);

        // Build superset maps from supersetGroupId
        const groupsMap = new Map<number, number[]>();
        const exMap = new Map<number, number>();
        // Sort by sortOrder to preserve ordering within groups
        const sorted = [...pdes].sort((a, b) => a.sortOrder - b.sortOrder);
        for (const pde of sorted) {
          if (pde.supersetGroupId !== null) {
            if (!groupsMap.has(pde.supersetGroupId)) {
              groupsMap.set(pde.supersetGroupId, []);
            }
            groupsMap.get(pde.supersetGroupId)!.push(pde.exerciseId);
            exMap.set(pde.exerciseId, pde.supersetGroupId);
          }
        }
        setSupersetGroups(groupsMap);
        setExerciseSupersetMap(exMap);
        supersetGroupsRef.current = groupsMap;
        exerciseSupersetMapRef.current = exMap;
      });
    } else {
      const emptyMap1 = new Map<number, number[]>();
      const emptyMap2 = new Map<number, number>();
      setProgramTargetsMap(new Map());
      setSupersetGroups(emptyMap1);
      setExerciseSupersetMap(emptyMap2);
      supersetGroupsRef.current = emptyMap1;
      exerciseSupersetMapRef.current = emptyMap2;
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

  // Post-rest auto-advance: when rest timer ends and last superset exercise triggered it,
  // auto-expand the FIRST exercise in the group for the next round
  const isRunningRef = useRef(isRunning);
  useEffect(() => {
    const wasRunning = isRunningRef.current;
    isRunningRef.current = isRunning;

    if (wasRunning && !isRunning && lastSupersetRestRef.current) {
      const { groupId } = lastSupersetRestRef.current;
      lastSupersetRestRef.current = null;
      const groupExerciseIds = supersetGroupsRef.current.get(groupId);
      if (groupExerciseIds && groupExerciseIds.length > 0) {
        LayoutAnimation.configureNext(
          LayoutAnimation.create(250, LayoutAnimation.Types.easeInEaseOut, LayoutAnimation.Properties.opacity),
        );
        setActiveExerciseId(groupExerciseIds[0]);
      }
    }
  }, [isRunning]);

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

    // Superset auto-advance: check if this exercise is in a superset group
    const groupId = exerciseSupersetMapRef.current.get(exerciseId);
    if (groupId !== undefined) {
      const groupExerciseIds = supersetGroupsRef.current.get(groupId) ?? [];
      const currentIndex = groupExerciseIds.indexOf(exerciseId);
      const isLastInGroup = currentIndex === groupExerciseIds.length - 1;

      if (!isLastInGroup) {
        // Not the last exercise — auto-advance to next, suppress rest timer
        const nextExerciseId = groupExerciseIds[currentIndex + 1];
        LayoutAnimation.configureNext(
          LayoutAnimation.create(250, LayoutAnimation.Types.easeInEaseOut, LayoutAnimation.Properties.opacity),
        );
        setActiveExerciseId(nextExerciseId);
        // Do NOT set pendingRestExerciseId — rest is suppressed for non-last exercises
      } else {
        // Last exercise in group — show rest timer as normal, track for post-rest advance
        setPendingRestExerciseId(exerciseId);
        lastSupersetRestRef.current = { groupId, exerciseId };
      }
    } else {
      // Not in a superset — normal behavior
      setPendingRestExerciseId(exerciseId);
    }

    const exercise = exercises.find(ex => ex.id === exerciseId);
    if (set.isWarmup === false && exercise?.measurementType !== 'timed') {
      setVolumeTotal(prev => prev + set.weightKg * set.reps);

      checkForPR(exerciseId, set.weightKg, set.reps, session!.id).then(isPR => {
        if (isPR) {
          setPrCount(prev => prev + 1);
          const name = exercises.find(ex => ex.id === exerciseId)?.name ?? 'Exercise';
          prToastRef.current?.showPR(name, set.reps, set.weightKg);
          HapticFeedback.trigger('notificationSuccess', { enableVibrateFallback: true });
          setTimeout(() => {
            HapticFeedback.trigger('notificationSuccess', { enableVibrateFallback: true });
          }, 400);
        }
      }).catch(() => {});
    }
  }, [exercises, session]);

  const handleRestChange = useCallback(
    (exerciseId: number, newRestSeconds: number) => {
      const clamped = Math.max(30, Math.min(180, newRestSeconds));
      setRestOverrides(prev => ({ ...prev, [exerciseId]: clamped }));

      // Persist to both tables — fire and forget
      if (session) {
        updateSessionRestSeconds(session.id, exerciseId, clamped).catch(() => {});
        updateDefaultRestSeconds(exerciseId, clamped).catch(() => {});
      }
    },
    [session],
  );

  const handleStartRest = useCallback(
    (exerciseId: number) => {
      // Prefer local override, fall back to session rest, then exercise default, then 90
      const override = restOverrides[exerciseId];
      if (override !== undefined) {
        startTimer(override);
      } else {
        const se = sessionExercises.find(s => s.exerciseId === exerciseId);
        const duration = se?.restSeconds ?? exercises.find(ex => ex.id === exerciseId)?.defaultRestSeconds ?? 90;
        startTimer(duration);
      }
      setPendingRestExerciseId(null);
    },
    [restOverrides, sessionExercises, exercises, startTimer],
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

  const handleDismissSummary = useCallback(() => {
    setShowSummary(false);
    setSummaryData(null);
    setActiveExerciseId(null);
    setSetCountsByExercise({});
    setPendingRestExerciseId(null);
    setVolumeTotal(0);
    setRestOverrides({});
    setPrCount(0);
    (navigation as any).navigate('DashboardTab');
  }, [navigation]);

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
              setRestOverrides({});
              setPrCount(0);
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
              const totalSets = Object.values(setCountsByExercise).reduce((sum, c) => sum + c, 0);
              const exercisesCompleted = sessionExercises.filter(se => se.isComplete).length;
              const exercisesTotal = sessionExercises.length;
              setSummaryData({
                duration: elapsed,
                totalSets,
                totalVolume: volumeTotal,
                exercisesCompleted,
                exercisesTotal,
                prCount,
              });
              if (isRunning) { stopTimer(); }
              await endSession();
              setShowSummary(true);
            },
          },
        ],
      );
    }
  }, [session, endSession, isRunning, stopTimer, programDayId, navigation, elapsed, setCountsByExercise, sessionExercises, volumeTotal, prCount]);

  if (isLoading) {
    return (
      <SafeAreaView style={styles.centered} edges={['top']}>
        <ActivityIndicator color={colors.accent} size="large" />
      </SafeAreaView>
    );
  }

  if (showSummary && summaryData) {
    return (
      <WorkoutSummary
        duration={summaryData.duration}
        totalSets={summaryData.totalSets}
        totalVolume={summaryData.totalVolume}
        exercisesCompleted={summaryData.exercisesCompleted}
        exercisesTotal={summaryData.exercisesTotal}
        prCount={summaryData.prCount}
        onDismiss={handleDismissSummary}
      />
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

  // Build a session title from exercise categories (used for banner only)
  const allCategories = groupByCategory(sessionExercises, exercises);
  const sessionTitle = programDayId
    ? allCategories.map(g => g.category.toUpperCase()).join(' & ')
    : null;

  // Build superset-aware grouped sections for rendering
  const workoutSections = groupForWorkout(sessionExercises, exercises, exerciseSupersetMap, supersetGroups);

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
          {workoutSections.map((section, sectionIdx) => {
            if (section.type === 'superset') {
              return (
                <SupersetContainer
                  key={`superset-${section.groupId}`}
                  groupId={section.groupId}
                  exerciseIds={section.exerciseIds}
                  sessionExercises={sessionExercises}
                  exercises={exercises}
                  activeExerciseId={activeExerciseId}
                  setCountsByExercise={setCountsByExercise}
                  pendingRestExerciseId={pendingRestExerciseId}
                  programTargetsMap={programTargetsMap}
                  restOverrides={restOverrides}
                  sessionId={session.id}
                  onPressExercise={(exerciseId, isActive) =>
                    setActiveExerciseId(isActive ? null : exerciseId)
                  }
                  onToggleComplete={handleToggleComplete}
                  onSetLogged={handleSetLogged}
                  onStartRest={handleStartRest}
                  onViewHistory={handleViewHistory}
                  onRestChange={handleRestChange}
                />
              );
            }

            // Category section
            return (
              <View key={section.category}>
                <View style={[styles.categoryHeader, (sectionIdx > 0) && styles.categoryHeaderSpaced]}>
                  <Text style={styles.categoryLabel}>{section.category.toUpperCase()}</Text>
                  <View style={styles.categoryLine} />
                </View>
                <View style={styles.categoryContainer}>
                  {section.items.map((se) => {
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
                        restSeconds={restOverrides[se.exerciseId] ?? se.restSeconds}
                        onPress={() => setActiveExerciseId(isActive ? null : se.exerciseId)}
                        onToggleComplete={() => handleToggleComplete(se.exerciseId)}
                        onSetLogged={(set) => handleSetLogged(se.exerciseId, set)}
                        onStartRest={() => handleStartRest(se.exerciseId)}
                        onViewHistory={() => handleViewHistory(se.exerciseId)}
                        onRestChange={(newRest) => handleRestChange(se.exerciseId, newRest)}
                      />
                    );
                  })}
                </View>
              </View>
            );
          })}
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
  // Card inside a SupersetContainer — no individual border/radius/margin
  cardInSuperset: {
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
  // Offset header content from the accent bar on the left
  cardHeaderInSuperset: {
    paddingLeft: spacing.base + 8,
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
  // Offset expanded content from the accent bar
  cardExpandedInSuperset: {
    paddingLeft: spacing.base + 8,
  },
  restLabelRow: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xs,
  },
  restLabelText: {
    fontSize: fontSize.sm,
    fontWeight: weightSemiBold,
    color: colors.secondary,
  },
  restStepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingBottom: spacing.sm,
  },
  restStepperButton: {
    width: 56,
    height: 48,
    backgroundColor: colors.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  restStepperButtonDisabled: {
    opacity: 0.3,
  },
  restStepperText: {
    fontSize: fontSize.lg,
    fontWeight: weightBold,
    color: colors.primary,
  },
  restStepperTextDisabled: {
    color: colors.secondary,
  },
  restStepperValue: {
    fontSize: fontSize.lg,
    fontWeight: weightBold,
    color: colors.primary,
    minWidth: 60,
    textAlign: 'center',
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

const summaryStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: spacing.xxl,
    paddingHorizontal: spacing.xl,
    width: '100%',
    maxWidth: 360,
  },
  heading: {
    fontSize: fontSize.xl,
    fontWeight: weightBold,
    color: colors.primary,
    textAlign: 'center',
    marginBottom: spacing.xl,
  },
  statsContainer: {
    marginBottom: spacing.xl,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  statLabel: {
    fontSize: fontSize.base,
    fontWeight: weightSemiBold,
    color: colors.secondary,
  },
  statValue: {
    fontSize: fontSize.base,
    fontWeight: weightBold,
    color: colors.primary,
  },
  prLabel: {
    fontSize: fontSize.base,
    fontWeight: weightSemiBold,
    color: colors.prGold,
  },
  prValue: {
    fontSize: fontSize.base,
    fontWeight: weightBold,
    color: colors.prGold,
  },
  doneButton: {
    backgroundColor: colors.accent,
    borderRadius: 12,
    paddingVertical: spacing.base,
    alignItems: 'center',
    minHeight: 52,
    justifyContent: 'center',
  },
  doneButtonText: {
    fontSize: fontSize.lg,
    fontWeight: weightBold,
    color: colors.onAccent,
  },
});
