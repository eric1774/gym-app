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
import HapticFeedback from 'react-native-haptic-feedback';
import { WorkoutStackParamList } from '../navigation/TabNavigator';
import { useSession } from '../context/SessionContext';
import { useTimer } from '../context/TimerContext';
import { ExercisePickerSheet } from './ExercisePickerSheet';
import { SwapSheet } from '../components/SwapSheet';
import { getSetsForExerciseInSession } from '../db';
import { NumberPad } from '../components/NumberPad';
import { SetState, PadTarget, ProgramTarget } from '../components/exerciseCardState';
import { logSet, getLastSessionSets, deleteSet, checkForPR } from '../db/sets';
import { RestTimerBanner } from '../components/RestTimerBanner';
import { colors, getCategoryColor } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { fontSize, weightBold, weightSemiBold } from '../theme/typography';
import { Exercise, ExerciseCategory, ExerciseMeasurementType, ExerciseSession, ProgramDayExercise, WorkoutSet } from '../types';
import { getProgramDayExercises, updateExerciseTargets } from '../db/programs';
import { EditTargetsModal } from '../components/EditTargetsModal';
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
import { SupersetGroup } from '../components/SupersetGroup';
import { ConfirmSheet } from '../components/ConfirmSheet';
import { WorkoutSummary } from '../components/WorkoutSummary';

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
  const [ssCurrentByGroup, setSsCurrentByGroup] = useState<Record<number, number>>({});
  const [exerciseSupersetMap, setExerciseSupersetMap] = useState<Map<number, number>>(new Map());
  // Refs for accessing superset maps inside callbacks without stale closures
  const supersetGroupsRef = useRef<Map<number, number[]>>(new Map());
  const exerciseSupersetMapRef = useRef<Map<number, number>>(new Map());

  // Seed initial current-member pointer (first member of each group). Preserves
  // any existing user-chosen pointers when groups change.
  useEffect(() => {
    if (supersetGroups.size === 0) {
      setSsCurrentByGroup({});
      return;
    }
    setSsCurrentByGroup(prev => {
      const next: Record<number, number> = {};
      supersetGroups.forEach((members, gid) => {
        if (members.length > 0) {
          next[gid] = prev[gid] ?? members[0];
        }
      });
      return next;
    });
  }, [supersetGroups]);

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

  const ensureLastSetsFetched = useCallback((exerciseId: number) => {
    if (!session) { return; }
    setLastSetsByExercise(prev => {
      if (prev[exerciseId] !== undefined) {
        return prev; // already fetched (or in-flight) — skip
      }
      getLastSessionSets(exerciseId, session.id)
        .then(sets => setLastSetsByExercise(p => ({ ...p, [exerciseId]: sets })))
        .catch(() => setLastSetsByExercise(p => ({ ...p, [exerciseId]: [] })));
      return { ...prev, [exerciseId]: null }; // sentinel to prevent double-fetch
    });
  }, [session]);

  // Whenever a card becomes active, ensure its last-session data is fetched.
  // Centralizes the lazy-load so every path that sets activeExerciseId
  // (manual tap, initial session load, post-rest auto-advance, superset
  // rotation, handleAddExercise) hydrates the GhostReference peek.
  useEffect(() => {
    if (activeExerciseId !== null) {
      ensureLastSetsFetched(activeExerciseId);
    }
  }, [activeExerciseId, ensureLastSetsFetched]);

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
        // Sync ssCurrentByGroup so the NOW badge moves with the active card.
        setSsCurrentByGroup(prev => ({ ...prev, [groupId]: groupExerciseIds[0] }));
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

    // V1 superset model: rotate only for non-last members; stay put on last member.
    const groupId = exerciseSupersetMapRef.current.get(exerciseId);
    if (groupId !== undefined) {
      const members = supersetGroupsRef.current.get(groupId) ?? [];
      const idx = members.indexOf(exerciseId);
      const isLastInCycle = idx === members.length - 1;
      if (!isLastInCycle && idx >= 0 && members.length > 1) {
        // Mid-cycle: rotate to next member, no rest.
        const nextMember = members[idx + 1];
        LayoutAnimation.configureNext(
          LayoutAnimation.create(250, LayoutAnimation.Types.easeInEaseOut, LayoutAnimation.Properties.opacity),
        );
        setSsCurrentByGroup(prev => ({ ...prev, [groupId]: nextMember }));
        setActiveExerciseId(nextMember);
      } else {
        // End-of-cycle (or single-member group): stay put, queue rest, mark round complete.
        setPendingRestExerciseId(exerciseId);
        lastSupersetRestRef.current = { groupId, exerciseId };
      }
    } else {
      setPendingRestExerciseId(exerciseId);
    }
  }, [session, nextByExercise, exercises, setsByExercise]);

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
  }, []);

  const handleSupersetMemberSelect = useCallback((memberId: number) => {
    const groupId = exerciseSupersetMapRef.current.get(memberId);
    if (groupId === undefined) { return; }
    setSsCurrentByGroup(prev => ({ ...prev, [groupId]: memberId }));
  }, []);

  const handleEditTarget = useCallback((exerciseId: number) => {
    setEditingExerciseId(exerciseId);
  }, []);

  const handleViewHistory = useCallback((exerciseId: number) => {
    const exercise = exercises.find(ex => ex.id === exerciseId);
    if (!exercise) { return; }
    navigation.navigate('ExerciseDetail', {
      exerciseId,
      exerciseName: exercise.name,
      measurementType: exercise.measurementType,
      category: exercise.category,
    });
  }, [exercises, navigation]);

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
      // Compute the rest duration. For superset members, use min(member rest values).
      const groupId = exerciseSupersetMapRef.current.get(exerciseId);
      let duration: number;
      if (groupId !== undefined) {
        const members = supersetGroupsRef.current.get(groupId) ?? [];
        const memberRests = members.map(id => {
          const over = restOverrides[id];
          if (typeof over === 'number') { return over; }
          const se = sessionExercises.find(s => s.exerciseId === id);
          return se?.restSeconds ?? exercises.find(ex => ex.id === id)?.defaultRestSeconds ?? 90;
        });
        duration = memberRests.length > 0 ? Math.max(0, Math.min(...memberRests)) : 90;
      } else {
        const override = restOverrides[exerciseId];
        if (override !== undefined) {
          duration = override;
        } else {
          const se = sessionExercises.find(s => s.exerciseId === exerciseId);
          duration = se?.restSeconds ?? exercises.find(ex => ex.id === exerciseId)?.defaultRestSeconds ?? 90;
        }
      }
      startTimer(duration);
      setPendingRestExerciseId(null);
    },
    [restOverrides, sessionExercises, exercises, startTimer],
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

  // Helper maps for SupersetGroup — hoisted above early-return wall
  const exerciseMap = useMemo(() => {
    const m = new Map<number, Exercise>();
    for (const ex of exercises) { m.set(ex.id, ex); }
    return m;
  }, [exercises]);

  const sessionExerciseMap = useMemo(() => {
    const m = new Map<number, ExerciseSession>();
    for (const se of sessionExercises) { m.set(se.exerciseId, se); }
    return m;
  }, [sessionExercises]);

  // Build sections + letter map BEFORE early returns so hook order stays stable
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
          {(warmupState === 'none' || warmupState === 'dismissed') && (
            <TouchableOpacity
              style={styles.addWarmupButton}
              onPress={() => setShowWarmupPicker(true)}
            >
              <Text style={styles.addWarmupText}>🔥 Add Warmup</Text>
            </TouchableOpacity>
          )}
          {sessionExercises.length === 0 && (
            <Text style={styles.emptyState}>Tap + to add exercises</Text>
          )}
          {workoutSections.map((section, sectionIdx) => {
            if (section.type === 'superset') {
              return (
                <SupersetGroup
                  key={`superset-${section.groupId}`}
                  groupId={section.groupId}
                  label={supersetLetterByGroupId.get(section.groupId) ?? 'A'}
                  memberIds={section.exerciseIds}
                  exerciseMap={exerciseMap}
                  sessionMap={sessionExerciseMap}
                  programTargetsMap={programTargetsMap}
                  restOverrides={restOverrides}
                  setsByExercise={setsByExercise}
                  nextByExercise={nextByExercise}
                  lastSetsByExercise={lastSetsByExercise}
                  pendingRestByExercise={pendingRestExerciseId !== null ? { [pendingRestExerciseId]: true } : {}}
                  currentMemberId={ssCurrentByGroup[section.groupId] ?? section.exerciseIds[0]}
                  activeExerciseId={activeExerciseId}
                  onExpand={handleExpandExercise}
                  onToggleComplete={handleToggleComplete}
                  onLog={handleLog}
                  onNextChange={handleNextChange}
                  onOpenPad={handleOpenPad}
                  onDeleteSet={handleDeleteSet}
                  onStartRest={handleStartRest}
                  onRestChange={handleRestChange}
                  onSwap={(id) => {
                    const ex = exercises.find(e => e.id === id);
                    setSwapTarget(ex ?? null);
                  }}
                  onEditTarget={handleEditTarget}
                  onViewHistory={handleViewHistory}
                  onMemberSelect={handleSupersetMemberSelect}
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
                        onViewHistory={() => handleViewHistory(se.exerciseId)}
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
  categoryContainer: {
    // Groups exercise cards within a category
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

