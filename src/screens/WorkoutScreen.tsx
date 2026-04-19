import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
import { SwapSheet } from '../components/SwapSheet';
import { getSetsForExerciseInSession } from '../db';
import { GhostReference } from '../components/GhostReference';
import { NextSetPanel } from '../components/NextSetPanel';
import { NumberPad } from '../components/NumberPad';
import { SetRow } from '../components/SetRow';
import { SetState, PadTarget, ProgramTarget } from '../components/exerciseCardState';
import { logSet, getLastSessionSets, deleteSet, checkForPR } from '../db/sets';
import { RestTimerBanner } from '../components/RestTimerBanner';
import { colors, getCategoryColor } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { fontSize, weightBold, weightSemiBold } from '../theme/typography';
import { Exercise, ExerciseCategory, ExerciseMeasurementType, ExerciseSession, ProgramDayExercise, WorkoutSet } from '../types';
import { getProgramDayExercises, updateExerciseTargets } from '../db/programs';
import { EditTargetsModal } from '../components/EditTargetsModal';
import { getExerciseHistory } from '../db/dashboard';
import { hasSessionActivity, updateSessionRestSeconds } from '../db/sessions';
import { updateDefaultRestSeconds } from '../db/exercises';
import { PRToast, PRToastHandle } from '../components/PRToast';
import { useHeartRate } from '../context/HeartRateContext';
import { DeviceScanSheet } from './DeviceScanSheet';
import { WorkoutHeader } from '../components/WorkoutHeader';
import { HrZone } from '../components/HrPill';
import { getHRSettings } from '../services/HRSettingsService';
import { HRSettings } from '../types';
import { getHRZone, computeMaxHR } from '../utils/hrZones';
import { WarmupSection } from '../components/WarmupSection';
import { WarmupTemplatePicker } from '../components/WarmupTemplatePicker';
import { ExerciseCard } from '../components/ExerciseCard';
import { ConfirmSheet } from '../components/ConfirmSheet';

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
const CHECK_CIRCLE_SIZE = 28;

function HistoryIcon({ color }: { color: string }) {
  return (
    <Svg width={HISTORY_ICON_SIZE} height={HISTORY_ICON_SIZE} viewBox="0 0 24 24" fill="none">
      <Path d="M12 8V12L15 15" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M3.05 11A9 9 0 1 1 3.05 13" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M3 4V11H10" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

interface CategoryHeaderProps {
  category: ExerciseCategory;
  done: number;
  total: number;
}

function CategoryHeader({ category, done, total }: CategoryHeaderProps) {
  return (
    <View style={categoryHeaderStyles.row}>
      <View style={[categoryHeaderStyles.dot, { backgroundColor: getCategoryColor(category) }]} />
      <Text style={categoryHeaderStyles.label}>{category}</Text>
      <View style={categoryHeaderStyles.divider} />
      <Text style={categoryHeaderStyles.counter}>{done}/{total}</Text>
    </View>
  );
}

const categoryHeaderStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 16,
    marginBottom: 10,
    paddingHorizontal: 2,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  label: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.secondary,
    letterSpacing: 1.8,
    textTransform: 'uppercase',
  },
  divider: {
    flex: 1,
    height: 1,
    backgroundColor: colors.border,
  },
  counter: {
    fontSize: 11,
    color: colors.secondaryDim,
    fontVariant: ['tabular-nums'],
  },
});

interface SupersetContainerProps {
  groupId: number;
  exerciseIds: number[];
  supersetLetter: string;
  sessionExercises: ExerciseSession[];
  exercises: Exercise[];
  activeExerciseId: number | null;
  setCountsByExercise: Record<number, number>;
  pendingRestExerciseId: number | null;
  programTargetsMap: Map<number, ProgramTarget>;
  restOverrides: Record<number, number>;
  sets: Record<number, SetState[]>;
  lastSets: Record<number, WorkoutSet[] | null>;
  next: Record<number, { w: number; r: number }>;
  onPressExercise: (exerciseId: number, isActive: boolean) => void;
  onToggleComplete: (exerciseId: number) => void;
  onLog: (id: number) => void;
  onNextChange: (id: number, field: 'w' | 'r', value: number) => void;
  onOpenPad: (id: number, field: 'w' | 'r') => void;
  onDeleteSet: (id: number, setId: number) => void;
  onEditTarget: (exerciseId: number) => void;
  onStartRest: (exerciseId: number) => void;
  onRestChange: (exerciseId: number, newRestSeconds: number) => void;
  onSwap: (exerciseId: number) => void;
}

function SupersetContainer({
  groupId,
  exerciseIds,
  supersetLetter,
  sessionExercises,
  exercises,
  activeExerciseId,
  setCountsByExercise,
  pendingRestExerciseId,
  programTargetsMap,
  restOverrides,
  sets,
  lastSets,
  next,
  onPressExercise,
  onToggleComplete,
  onLog,
  onNextChange,
  onOpenPad,
  onDeleteSet,
  onEditTarget,
  onStartRest,
  onRestChange,
  onSwap,
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
        if (!exercise) { return null; }
        const isActive = activeExerciseId === exerciseId;
        const supersetBadge = {
          label: supersetLetter,
          index,
          isCurrent: isActive,
          color: colors.supersetPurple,
        };

        return (
          <View key={exerciseId}>
            {index > 0 && <View style={supersetStyles.divider} />}
            <ExerciseCard
              exerciseSession={se}
              exercise={exercise}
              isActive={isActive}
              pendingRest={pendingRestExerciseId === exerciseId}
              programTarget={programTargetsMap.get(exerciseId) ?? null}
              measurementType={exercise.measurementType ?? 'reps'}
              restSeconds={restOverrides[exerciseId] ?? se.restSeconds}
              insideSuperset={true}
              sets={sets[exerciseId] ?? []}
              lastSets={lastSets[exerciseId] ?? null}
              next={next[exerciseId] ?? { w: 0, r: 0 }}
              onExpand={() => onPressExercise(exerciseId, isActive)}
              onToggleComplete={() => onToggleComplete(exerciseId)}
              onLog={() => onLog(exerciseId)}
              onNextChange={(field, value) => onNextChange(exerciseId, field, value)}
              onOpenPad={(field) => onOpenPad(exerciseId, field)}
              onDeleteSet={(setId) => onDeleteSet(exerciseId, setId)}
              onEditTarget={() => onEditTarget(exerciseId)}
              onStartRest={() => onStartRest(exerciseId)}
              onRestChange={(newRest) => onRestChange(exerciseId, newRest)}
              onSwap={() => onSwap(exerciseId)}
              supersetBadge={supersetBadge}
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
  avgHr?: number | null;
  peakHr?: number | null;
  onDismiss: () => void;
}

function WorkoutSummary({
  duration,
  totalSets,
  totalVolume,
  exercisesCompleted,
  exercisesTotal,
  prCount,
  avgHr,
  peakHr,
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

          {avgHr != null && (
            <View style={summaryStyles.statRow}>
              <Text style={summaryStyles.statLabel}>Avg HR</Text>
              <Text style={summaryStyles.statValue}>{avgHr} bpm</Text>
            </View>
          )}

          {peakHr != null && (
            <View style={summaryStyles.statRow}>
              <Text style={summaryStyles.statLabel}>Peak HR</Text>
              <Text style={summaryStyles.statValue}>{peakHr} bpm</Text>
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
    swapExercise: swapExerciseInSession,
    warmupItems,
    warmupState,
    loadWarmupTemplate,
    toggleWarmupItemComplete,
    dismissWarmup,
    collapseWarmup,
    expandWarmup,
    skipAllWarmupItems,
  } = useSession();
  const { remainingSeconds, totalSeconds, isRunning, startTimer, stopTimer, addTime } = useTimer();

  const elapsed = useElapsedSeconds(session?.startedAt ?? null);
  const [activeExerciseId, setActiveExerciseId] = useState<number | null>(null);
  const [swapTarget, setSwapTarget] = useState<Exercise | null>(null);
  const [pickerVisible, setPickerVisible] = useState(false);
  const [showWarmupPicker, setShowWarmupPicker] = useState(false);
  const [showWarmupStartPrompt, setShowWarmupStartPrompt] = useState(false);
  const [pendingRestExerciseId, setPendingRestExerciseId] = useState<number | null>(null);
  const [completionMessage, setCompletionMessage] = useState<string | null>(null);
  const [restOverrides, setRestOverrides] = useState<Record<number, number>>({});
  const [showSummary, setShowSummary] = useState(false);
  const [endWorkoutSheetVisible, setEndWorkoutSheetVisible] = useState(false);
  const [discardSheetVisible, setDiscardSheetVisible] = useState(false);
  const [summaryData, setSummaryData] = useState<{
    duration: number;
    totalSets: number;
    totalVolume: number;
    exercisesCompleted: number;
    exercisesTotal: number;
    prCount: number;
    avgHr: number | null;
    peakHr: number | null;
  } | null>(null);
  const completionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prToastRef = useRef<PRToastHandle>(null);
  // Track the last superset exercise that triggered a rest timer (for post-rest auto-advance)
  const lastSupersetRestRef = useRef<{ groupId: number; exerciseId: number } | null>(null);

  // ─── Phase 7: hoisted per-exercise set state ────────────────────────────
  const [setsByExercise, setSetsByExercise] = useState<Record<number, SetState[]>>({});
  const [nextByExercise, setNextByExercise] = useState<Record<number, { w: number; r: number }>>({});
  const [lastSetsByExercise, setLastSetsByExercise] = useState<Record<number, WorkoutSet[] | null>>({});
  const [pad, setPad] = useState<PadTarget | null>(null);

  // Derived aggregates — match old handleSetLogged exclusions
  const volumeTotal = useMemo(() => {
    let total = 0;
    for (const exIdStr in setsByExercise) {
      const exId = Number(exIdStr);
      const ex = exercises.find(e => e.id === exId);
      if (!ex) { continue; }
      if (ex.measurementType === 'timed' || ex.measurementType === 'height_reps') { continue; }
      for (const s of setsByExercise[exId]) {
        if (s.isWarmup) { continue; }
        total += s.w * s.r;
      }
    }
    return total;
  }, [setsByExercise, exercises]);

  const setCountsByExercise = useMemo<Record<number, number>>(() => {
    const counts: Record<number, number> = {};
    for (const exIdStr in setsByExercise) {
      counts[Number(exIdStr)] = setsByExercise[Number(exIdStr)].length;
    }
    return counts;
  }, [setsByExercise]);

  const prCount = useMemo(() => {
    let c = 0;
    for (const exIdStr in setsByExercise) {
      for (const s of setsByExercise[Number(exIdStr)]) { if (s.isPR) { c += 1; } }
    }
    return c;
  }, [setsByExercise]);

  // Stable reference for SwapSheet — avoids useEffect re-fire on every render
  const excludeIdsForSwap = useMemo(
    () => sessionExercises.map(se => se.exerciseId),
    [sessionExercises],
  );

  // Inline target editing state
  const [editingExerciseId, setEditingExerciseId] = useState<number | null>(null);

  // Load program day exercises when session is a program workout
  const [programTargetsMap, setProgramTargetsMap] = useState<Map<number, ProgramTarget>>(new Map());
  // TODO(workout-v1): wire setProgramDayName from a getProgramDay(programDayId)
  // DB call so WorkoutHeader can show the real day name (e.g. 'PUSH DAY') instead
  // of the 'WORKOUT' fallback. Pre-existing state; never populated before V1.
  const [programDayName, setProgramDayName] = useState<string | null>(null);
  // Superset group maps: groupId -> ordered exerciseIds, exerciseId -> groupId
  const [supersetGroups, setSupersetGroups] = useState<Map<number, number[]>>(new Map());
  const [exerciseSupersetMap, setExerciseSupersetMap] = useState<Map<number, number>>(new Map());
  // Refs for accessing superset maps inside callbacks without stale closures
  const supersetGroupsRef = useRef<Map<number, number[]>>(new Map());
  const exerciseSupersetMapRef = useRef<Map<number, number>>(new Map());

  // ─── Heart Rate Integration ────────────────────────────────────────────────
  const { deviceState, currentBpm, attemptAutoReconnect, flushHRSamples } = useHeartRate();
  const [hasPairedDevice, setHasPairedDevice] = useState(false);
  const [hrSettings, setHrSettings] = useState<HRSettings | null>(null);
  // TODO(workout-v1): wire HrPill onPress (when disconnected) to
  // setScanSheetVisible(true). Task 3.2 removed the inline pair button; users
  // currently have no in-workout path to pair an HR monitor. Pairing via
  // Settings still works. See code-quality review of commit 22fe968.
  const [scanSheetVisible, setScanSheetVisible] = useState(false);
  const prevDeviceStateRef = useRef(deviceState);

  // Load paired device status and HR settings on mount and when session changes
  const loadPairedStatus = useCallback(() => {
    getHRSettings().then(settings => {
      setHasPairedDevice(settings.pairedDeviceId !== null);
      setHrSettings(settings);
    });
  }, []);

  useEffect(() => {
    loadPairedStatus();
  }, [session, loadPairedStatus]);

  const handleScanSheetClose = useCallback(() => {
    setScanSheetVisible(false);
    // Reload paired status — user may have just paired a device
    loadPairedStatus();
  }, [loadPairedStatus]);

  // Auto-reconnect on workout start (per D-09: fires on workout start only)
  useEffect(() => {
    if (session && hasPairedDevice) {
      attemptAutoReconnect();
    }
  }, [session, hasPairedDevice, attemptAutoReconnect]);

  // Disconnect haptic (per D-13: single impactMedium on transition to disconnected/reconnecting from connected)
  useEffect(() => {
    const prev = prevDeviceStateRef.current;
    if (
      prev === 'connected' &&
      (deviceState === 'disconnected' || deviceState === 'reconnecting') &&
      session // only during active workout
    ) {
      HapticFeedback.trigger('impactMedium', { enableVibrateFallback: true });
    }
    prevDeviceStateRef.current = deviceState;
  }, [deviceState, session]);

  // Compute zone info for live BPM display (null when no age configured or no BPM reading)
  // Must be before early returns to maintain consistent hook count across renders
  const bpmZone = React.useMemo(() => {
    if (deviceState !== 'connected' || currentBpm === null || hrSettings === null) {
      return null;
    }
    const age = hrSettings.age;
    const override = hrSettings.maxHrOverride;
    if (age === null && override === null) {
      return null;
    }
    const maxHr = computeMaxHR(age ?? 0, override);
    return getHRZone(currentBpm, maxHr);
  }, [deviceState, currentBpm, hrSettings]);
  // ──────────────────────────────────────────────────────────────────────────

  useEffect(() => {
    if (programDayId) {
      getProgramDayExercises(programDayId).then((pdes: ProgramDayExercise[]) => {
        // Build programTargetsMap
        const map = new Map<number, ProgramTarget>();
        for (const pde of pdes) {
          map.set(pde.exerciseId, {
            pdeId: pde.id,
            targetSets: pde.targetSets,
            targetReps: pde.targetReps,
            targetWeightLbs: pde.targetWeightLbs,
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

  // Seed + rehydrate per-exercise set state on session/exercise load
  useEffect(() => {
    if (!session) {
      setSetsByExercise({});
      setNextByExercise({});
      setLastSetsByExercise({});
      return;
    }
    let cancelled = false;

    (async () => {
      const seededNext: Record<number, { w: number; r: number }> = {};
      const rehydratedSets: Record<number, SetState[]> = {};
      for (const se of sessionExercises) {
        const tgt = programTargetsMap.get(se.exerciseId);
        seededNext[se.exerciseId] = {
          w: tgt?.targetWeightLbs ?? 0,
          r: tgt?.targetReps ?? 0,
        };
        const existing = await getSetsForExerciseInSession(session.id, se.exerciseId);
        rehydratedSets[se.exerciseId] = existing.map(s => ({
          id: s.id,
          setNumber: s.setNumber,
          w: s.weightLbs,
          r: s.reps,
          isWarmup: s.isWarmup,
          // isPR intentionally undefined — ephemeral
        }));
        // Prefer last existing set over program target for next seeded values
        if (existing.length > 0) {
          const last = existing[existing.length - 1];
          seededNext[se.exerciseId] = { w: last.weightLbs, r: last.reps };
        }
      }
      if (!cancelled) {
        setNextByExercise(seededNext);
        setSetsByExercise(rehydratedSets);
      }
    })();

    return () => { cancelled = true; };
  }, [session, sessionExercises, programTargetsMap]);

  const handleWarmupTemplateSelect = useCallback(async (templateId: number) => {
    await loadWarmupTemplate(templateId);
    setShowWarmupPicker(false);
    setShowWarmupStartPrompt(false);
  }, [loadWarmupTemplate]);

  useEffect(() => {
    if (session && warmupState === 'none' && warmupItems.length === 0) {
      setShowWarmupStartPrompt(true);
    }
  }, [session?.id]);

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

  const handleLog = useCallback(async (exerciseId: number) => {
    if (!session) { return; }
    const next = nextByExercise[exerciseId];
    if (!next) { return; }

    const exercise = exercises.find(e => e.id === exerciseId);
    const isTimed = exercise?.measurementType === 'timed';
    const isHeightReps = exercise?.measurementType === 'height_reps';

    // Timed sets read duration from nextR directly (stopwatch path is deferred to Task 7.x timed support)
    const w = isTimed ? 0 : next.w;
    const r = next.r;
    if (r <= 0) { return; }
    if (!isTimed && w < 0) { return; }

    let newSet: WorkoutSet;
    try {
      newSet = await logSet(session.id, exerciseId, w, r);
    } catch {
      return;
    }

    // PR check — only for reps-based, non-warmup sets.
    // Also exclude when an in-session set at the same rep count already
    // matched or exceeded this weight (otherwise checkForPR would still
    // fire because it ignores the current session in its DB query).
    let isPR = false;
    if (!isTimed && !newSet.isWarmup) {
      const inSessionMaxAtSameReps = (setsByExercise[exerciseId] ?? [])
        .filter(s => !s.isWarmup && s.r === r)
        .reduce((max, s) => Math.max(max, s.w), 0);
      if (w > inSessionMaxAtSameReps) {
        try {
          isPR = await checkForPR(exerciseId, w, r, session.id);
        } catch {
          isPR = false;
        }
      }
    }

    setSetsByExercise(prev => ({
      ...prev,
      [exerciseId]: [
        ...(prev[exerciseId] ?? []),
        {
          id: newSet.id,
          setNumber: newSet.setNumber,
          w: newSet.weightLbs,
          r: newSet.reps,
          isWarmup: newSet.isWarmup,
          isPR,
        },
      ],
    }));

    if (isPR) {
      const name = exercise?.name ?? 'Exercise';
      const unit = isHeightReps ? 'in' : 'lbs';
      prToastRef.current?.showPR(name, newSet.reps, newSet.weightLbs, unit);
      HapticFeedback.trigger('notificationSuccess', { enableVibrateFallback: true });
      setTimeout(() => {
        HapticFeedback.trigger('notificationSuccess', { enableVibrateFallback: true });
      }, 400);
    }

    // Pre-fill next set with just-logged values
    setNextByExercise(prev => ({
      ...prev,
      [exerciseId]: { w: newSet.weightLbs, r: newSet.reps },
    }));

    // Superset rotation — preserves existing behavior
    const groupId = exerciseSupersetMapRef.current.get(exerciseId);
    if (groupId !== undefined) {
      const groupExerciseIds = supersetGroupsRef.current.get(groupId) ?? [];
      const currentIndex = groupExerciseIds.indexOf(exerciseId);
      const isLastInGroup = currentIndex === groupExerciseIds.length - 1;

      if (!isLastInGroup) {
        const nextExerciseId = groupExerciseIds[currentIndex + 1];
        LayoutAnimation.configureNext(
          LayoutAnimation.create(250, LayoutAnimation.Types.easeInEaseOut, LayoutAnimation.Properties.opacity),
        );
        setActiveExerciseId(nextExerciseId);
        // Do NOT set pendingRest — rest suppressed for non-last superset member
      } else {
        setPendingRestExerciseId(exerciseId);
        lastSupersetRestRef.current = { groupId, exerciseId };
      }
    } else {
      setPendingRestExerciseId(exerciseId);
    }
  }, [session, nextByExercise, exercises]);

  const handleDeleteSet = useCallback(async (exerciseId: number, setId: number) => {
    try {
      await deleteSet(setId);
    } catch {
      return;
    }
    setSetsByExercise(prev => ({
      ...prev,
      [exerciseId]: (prev[exerciseId] ?? []).filter(s => s.id !== setId),
    }));
  }, []);

  const handleOpenPad = useCallback((exerciseId: number, field: 'w' | 'r') => {
    const next = nextByExercise[exerciseId];
    const exercise = exercises.find(e => e.id === exerciseId);
    const name = exercise?.name ?? '';
    const isHeightReps = exercise?.measurementType === 'height_reps';
    const numberPadField: 'weight' | 'reps' | 'height' =
      field === 'r' ? 'reps' : (isHeightReps ? 'height' : 'weight');
    setPad({
      exerciseId,
      field,
      numberPadField,
      initialValue: next ? (field === 'w' ? next.w : next.r) : 0,
      label: name,
    });
  }, [nextByExercise, exercises]);

  const handleNextChange = useCallback((exerciseId: number, field: 'w' | 'r', value: number) => {
    setNextByExercise(prev => ({
      ...prev,
      [exerciseId]: {
        w: field === 'w' ? value : prev[exerciseId]?.w ?? 0,
        r: field === 'r' ? value : prev[exerciseId]?.r ?? 0,
      },
    }));
  }, []);

  const handleExpandExercise = useCallback((exerciseId: number) => {
    setActiveExerciseId(prev => (prev === exerciseId ? null : exerciseId));
    if (!session) { return; }
    setLastSetsByExercise(prev => {
      if (prev[exerciseId] !== undefined && prev[exerciseId] !== null) {
        return prev; // already fetched — no change
      }
      // Kick off async fetch; resolve/reject updates state independently.
      getLastSessionSets(exerciseId, session.id)
        .then(sets => setLastSetsByExercise(p => ({ ...p, [exerciseId]: sets })))
        .catch(() => setLastSetsByExercise(p => ({ ...p, [exerciseId]: [] })));
      return { ...prev, [exerciseId]: null }; // sentinel to prevent double-fetch
    });
  }, [session]);

  const handleEditTarget = useCallback((exerciseId: number) => {
    setEditingExerciseId(exerciseId);
  }, []);

  const handleSaveTargets = useCallback(async (pdeId: number, sets: number, reps: number, weight: number) => {
    if (editingExerciseId === null) { return; }
    // Optimistic local update
    setProgramTargetsMap(prev => {
      const next = new Map(prev);
      next.set(editingExerciseId, { pdeId, targetSets: sets, targetReps: reps, targetWeightLbs: weight });
      return next;
    });
    setEditingExerciseId(null);
    try {
      await updateExerciseTargets(pdeId, sets, reps, weight);
    } catch {
      // Revert on error — re-fetch from DB
      if (programDayId) {
        getProgramDayExercises(programDayId).then((pdes: ProgramDayExercise[]) => {
          const map = new Map<number, ProgramTarget>();
          for (const pde of pdes) {
            map.set(pde.exerciseId, { pdeId: pde.id, targetSets: pde.targetSets, targetReps: pde.targetReps, targetWeightLbs: pde.targetWeightLbs });
          }
          setProgramTargetsMap(map);
        });
      }
    }
  }, [editingExerciseId, programDayId]);

  const editingExerciseName = useMemo(() => {
    if (editingExerciseId === null) { return ''; }
    return exercises.find(ex => ex.id === editingExerciseId)?.name ?? '';
  }, [editingExerciseId, exercises]);

  const editingDayExercise = useMemo((): ProgramDayExercise | null => {
    if (editingExerciseId === null || !programTargetsMap.has(editingExerciseId) || !programDayId) { return null; }
    const target = programTargetsMap.get(editingExerciseId)!;
    return {
      id: target.pdeId,
      programDayId,
      exerciseId: editingExerciseId,
      targetSets: target.targetSets,
      targetReps: target.targetReps,
      targetWeightLbs: target.targetWeightLbs,
      sortOrder: 0,
      supersetGroupId: null,
    };
  }, [editingExerciseId, programDayId, programTargetsMap]);

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
        category: exercise.category,
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
    setPendingRestExerciseId(null);
    setRestOverrides({});
    (navigation as any).navigate('DashboardTab');
  }, [navigation]);

  const handleEndWorkout = useCallback(async () => {
    if (!session) { return; }
    const hadActivity = await hasSessionActivity(session.id);
    if (!hadActivity) {
      setDiscardSheetVisible(true);
    } else {
      setEndWorkoutSheetVisible(true);
    }
  }, [session]);

  const confirmDiscard = useCallback(async () => {
    if (!session) { return; }
    HapticFeedback.trigger('notificationSuccess', { enableVibrateFallback: true });
    const wasProgramWorkout = !!programDayId;
    if (isRunning) { stopTimer(); }
    await endSession();
    setActiveExerciseId(null);
    setPendingRestExerciseId(null);
    setRestOverrides({});
    if (wasProgramWorkout) {
      (navigation as any).navigate('ProgramsTab');
    }
  }, [session, programDayId, isRunning, stopTimer, endSession, navigation]);

  const confirmEndWorkout = useCallback(async () => {
    if (!session) { return; }
    HapticFeedback.trigger('notificationSuccess', { enableVibrateFallback: true });
    const totalSets = Object.values(setCountsByExercise).reduce((sum, c) => sum + c, 0);
    const exercisesCompleted = sessionExercises.filter(se => se.isComplete).length;
    const exercisesTotal = sessionExercises.length;
    // Flush HR samples before completing the session (D-06)
    const { avgHr, peakHr } = await flushHRSamples(session.id);
    setSummaryData({
      duration: elapsed,
      totalSets,
      totalVolume: volumeTotal,
      exercisesCompleted,
      exercisesTotal,
      prCount,
      avgHr,
      peakHr,
    });
    if (isRunning) { stopTimer(); }
    await endSession();
    setShowSummary(true);
  }, [session, isRunning, stopTimer, endSession, elapsed, setCountsByExercise, sessionExercises, volumeTotal, prCount, flushHRSamples]);

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
        avgHr={summaryData.avgHr}
        peakHr={summaryData.peakHr}
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

  // Build superset-aware grouped sections for rendering
  const workoutSections = groupForWorkout(sessionExercises, exercises, exerciseSupersetMap, supersetGroups);

  // Map each superset groupId to a position-based letter (first superset = A, second = B, …)
  const supersetLetterByGroupId = useMemo(() => {
    const map = new Map<number, string>();
    let letterIdx = 0;
    for (const section of workoutSections) {
      if (section.type === 'superset') {
        map.set(section.groupId, String.fromCharCode(65 + (letterIdx % 26)));
        letterIdx++;
      }
    }
    return map;
  }, [workoutSections]);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <WorkoutHeader
        title={programDayName ?? 'WORKOUT'}
        elapsed={elapsed}
        volume={volumeTotal}
        setCount={Object.values(setCountsByExercise).reduce((sum, c) => sum + c, 0)}
        prCount={prCount}
        hr={{
          bpm: deviceState === 'connected' ? currentBpm : null,
          zone: (bpmZone?.zone ?? null) as HrZone | null,
        }}
        onFinish={handleEndWorkout}
      />

      {/* Rest timer banner */}
      {isRunning && (
        <RestTimerBanner
          remainingSeconds={remainingSeconds ?? 0}
          totalSeconds={totalSeconds ?? 0}
          onStop={stopTimer}
          onAdd={() => addTime(15)}
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
          <WarmupSection
            items={warmupItems}
            state={warmupState}
            onToggleItem={toggleWarmupItemComplete}
            onCollapse={collapseWarmup}
            onExpand={expandWarmup}
            onDismiss={dismissWarmup}
            onSkipAll={skipAllWarmupItems}
          />
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
                  supersetLetter={supersetLetterByGroupId.get(section.groupId) ?? 'A'}
                  sessionExercises={sessionExercises}
                  exercises={exercises}
                  activeExerciseId={activeExerciseId}
                  setCountsByExercise={setCountsByExercise}
                  pendingRestExerciseId={pendingRestExerciseId}
                  programTargetsMap={programTargetsMap}
                  restOverrides={restOverrides}
                  sets={setsByExercise}
                  lastSets={lastSetsByExercise}
                  next={nextByExercise}
                  onPressExercise={(exerciseId, isActive) =>
                    handleExpandExercise(exerciseId)
                  }
                  onToggleComplete={handleToggleComplete}
                  onLog={handleLog}
                  onNextChange={handleNextChange}
                  onOpenPad={handleOpenPad}
                  onDeleteSet={handleDeleteSet}
                  onEditTarget={handleEditTarget}
                  onStartRest={handleStartRest}
                  onRestChange={handleRestChange}
                  onSwap={(exerciseId) => {
                    const ex = exercises.find(e => e.id === exerciseId);
                    setSwapTarget(ex ?? null);
                  }}
                />
              );
            }

            // Category section
            return (
              <View key={section.category}>
                <CategoryHeader
                  category={section.category}
                  done={section.items.filter(i => i.isComplete).length}
                  total={section.items.length}
                />
                <View style={styles.categoryContainer}>
                  {section.items.map((se) => {
                    const exercise = exercises.find(ex => ex.id === se.exerciseId);
                    if (!exercise) { return null; }
                    const isActive = activeExerciseId === se.exerciseId;
                    return (
                      <ExerciseCard
                        key={se.exerciseId}
                        exerciseSession={se}
                        exercise={exercise}
                        isActive={isActive}
                        pendingRest={pendingRestExerciseId === se.exerciseId}
                        programTarget={programTargetsMap.get(se.exerciseId) ?? null}
                        measurementType={exercise.measurementType ?? 'reps'}
                        restSeconds={restOverrides[se.exerciseId] ?? se.restSeconds}
                        sets={setsByExercise[se.exerciseId] ?? []}
                        lastSets={lastSetsByExercise[se.exerciseId] ?? null}
                        next={nextByExercise[se.exerciseId] ?? { w: 0, r: 0 }}
                        onExpand={() => handleExpandExercise(se.exerciseId)}
                        onToggleComplete={() => handleToggleComplete(se.exerciseId)}
                        onLog={() => handleLog(se.exerciseId)}
                        onNextChange={(field, value) => handleNextChange(se.exerciseId, field, value)}
                        onOpenPad={(field) => handleOpenPad(se.exerciseId, field)}
                        onDeleteSet={(setId) => handleDeleteSet(se.exerciseId, setId)}
                        onEditTarget={() => handleEditTarget(se.exerciseId)}
                        onStartRest={() => handleStartRest(se.exerciseId)}
                        onRestChange={(newRest) => handleRestChange(se.exerciseId, newRest)}
                        onSwap={() => setSwapTarget(exercise ?? null)}
                      />
                    );
                  })}
                </View>
              </View>
            );
          })}
          {(warmupState === 'none' || warmupState === 'dismissed') && (
            <TouchableOpacity
              style={styles.addWarmupButton}
              onPress={() => setShowWarmupPicker(true)}
            >
              <Text style={styles.addWarmupText}>🔥 Add Warmup</Text>
            </TouchableOpacity>
          )}
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

      <DeviceScanSheet
        visible={scanSheetVisible}
        onClose={handleScanSheetClose}
      />

      {/* Inline target editing modal */}
      <EditTargetsModal
        visible={editingExerciseId !== null}
        onClose={() => setEditingExerciseId(null)}
        exerciseName={editingExerciseName}
        dayExercise={editingDayExercise}
        onSave={handleSaveTargets}
      />

      <SwapSheet
        visible={swapTarget !== null}
        exercise={swapTarget}
        excludeExerciseIds={excludeIdsForSwap}
        onSelect={async (newExercise) => {
          if (!swapTarget || !session) return;
          const sets = await getSetsForExerciseInSession(session.id, swapTarget.id);
          const setsCount = sets.length;
          if (setsCount > 0) {
            Alert.alert(
              `You've logged ${setsCount} set${setsCount !== 1 ? 's' : ''} on ${swapTarget.name}`,
              'What would you like to do?',
              [
                {
                  text: 'Keep sets & add new',
                  onPress: async () => {
                    await swapExerciseInSession(swapTarget.id, newExercise, true);
                    setSwapTarget(null);
                  },
                },
                {
                  text: 'Discard & replace',
                  style: 'destructive',
                  onPress: async () => {
                    await swapExerciseInSession(swapTarget.id, newExercise, false);
                    setSwapTarget(null);
                  },
                },
                { text: 'Cancel', style: 'cancel' },
              ],
            );
          } else {
            await swapExerciseInSession(swapTarget.id, newExercise, false);
            setSwapTarget(null);
          }
        }}
        onClose={() => setSwapTarget(null)}
      />

      <NumberPad
        visible={pad !== null}
        field={pad?.numberPadField ?? 'weight'}
        initialValue={pad?.initialValue ?? 0}
        label={pad?.label}
        onCancel={() => setPad(null)}
        onCommit={(v) => {
          if (pad) {
            handleNextChange(pad.exerciseId, pad.field, v);
          }
          setPad(null);
        }}
      />

      <WarmupTemplatePicker
        visible={showWarmupPicker}
        onClose={() => setShowWarmupPicker(false)}
        onSelect={handleWarmupTemplateSelect}
        title="Select Warmup Template"
      />
      <WarmupTemplatePicker
        visible={showWarmupStartPrompt}
        onClose={() => setShowWarmupStartPrompt(false)}
        onSelect={handleWarmupTemplateSelect}
        showSkip
        onSkip={() => setShowWarmupStartPrompt(false)}
        title="Add a warmup?"
      />

      <ConfirmSheet
        visible={discardSheetVisible}
        title="No Exercises Logged"
        message="No exercises were logged or completed. Discard this workout?"
        confirmLabel="Discard"
        destructive
        onConfirm={confirmDiscard}
        onClose={() => setDiscardSheetVisible(false)}
      />
      <ConfirmSheet
        visible={endWorkoutSheetVisible}
        title="End Workout?"
        message="This marks your session complete."
        confirmLabel="End Workout"
        destructive
        onConfirm={confirmEndWorkout}
        onClose={() => setEndWorkoutSheetVisible(false)}
      />
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
  addWarmupButton: {
    backgroundColor: 'rgba(141,194,138,0.1)',
    borderRadius: 10,
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.base,
    alignItems: 'center',
    marginHorizontal: spacing.base,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: 'rgba(141,194,138,0.2)',
  },
  addWarmupText: {
    color: colors.accent,
    fontSize: fontSize.sm,
    fontWeight: '600' as const,
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
