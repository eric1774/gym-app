import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  LayoutAnimation,
  PanResponder,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  UIManager,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import {
  activateProgram,
  deleteProgram,
  advanceWeek,
  createProgramDay,
  deleteProgramDay,
  decrementWeek,
  duplicateProgramDay,
  getProgram,
  getProgramDays,
  renameProgram,
  renameProgramDay,
  reorderProgramDays,
} from '../db/programs';
import { getProgramWeekCompletion, getProgramTotalCompleted, unmarkDayCompletion } from '../db/dashboard';
import { createCompletedSession } from '../db/sessions';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { fontSize, weightBold, weightMedium, weightSemiBold } from '../theme/typography';
import { Program, ProgramDay, ProgramDayCompletionStatus } from '../types';
import { ProgramsStackParamList } from '../navigation/TabNavigator';
import { AddDayModal } from './AddDayModal';
import { RenameModal } from '../components/RenameModal';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

type DetailRoute = RouteProp<ProgramsStackParamList, 'ProgramDetail'>;

function CompletionCircle({ isDone, size = 24 }: { isDone: boolean; size?: number }) {
  return (
    <View
      style={[
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          justifyContent: 'center',
          alignItems: 'center',
          borderWidth: 2,
        },
        isDone
          ? { borderColor: colors.accent, backgroundColor: colors.accent }
          : { borderColor: colors.secondary, backgroundColor: 'transparent' },
      ]}>
      {isDone && (
        <Text
          style={{
            fontSize: size * 0.5,
            fontWeight: weightBold,
            color: colors.onAccent,
            lineHeight: size * 0.6,
          }}>
          {'\u2713'}
        </Text>
      )}
    </View>
  );
}

function GripHandle({
  onDragStart,
  onDragMove,
  onDragEnd,
}: {
  onDragStart: () => void;
  onDragMove: (dy: number) => void;
  onDragEnd: () => void;
}) {
  const cb = useRef({ onDragStart, onDragMove, onDragEnd });
  cb.current = { onDragStart, onDragMove, onDragEnd };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderGrant: () => cb.current.onDragStart(),
      onPanResponderMove: (_, gs) => cb.current.onDragMove(gs.dy),
      onPanResponderRelease: () => cb.current.onDragEnd(),
      onPanResponderTerminate: () => cb.current.onDragEnd(),
    }),
  ).current;

  return (
    <View {...panResponder.panHandlers} style={styles.gripHandle}>
      <View style={styles.gripLine} />
      <View style={styles.gripLine} />
      <View style={styles.gripLine} />
    </View>
  );
}

export function ProgramDetailScreen() {
  const navigation = useNavigation();
  const route = useRoute<DetailRoute>();
  const { programId } = route.params;

  const [program, setProgram] = useState<Program | null>(null);
  const [days, setDays] = useState<ProgramDay[]>([]);
  const [addDayVisible, setAddDayVisible] = useState(false);
  const [weekCompletion, setWeekCompletion] = useState<ProgramDayCompletionStatus[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [renameProgramVisible, setRenameProgramVisible] = useState(false);
  const [renameDayTarget, setRenameDayTarget] = useState<ProgramDay | null>(null);
  const [expandedDayId, setExpandedDayId] = useState<number | null>(null);
  const [completedWorkouts, setCompletedWorkouts] = useState(0);

  // Drag state
  const [draggingId, setDraggingId] = useState<number | null>(null);
  const [orderedDays, setOrderedDays] = useState<ProgramDay[]>([]);
  const dragY = useRef(new Animated.Value(0)).current;
  const cardHeightsMap = useRef<Map<number, number>>(new Map());
  const swapOffset = useRef(0);
  const orderedDaysRef = useRef<ProgramDay[]>([]);
  const draggingIdRef = useRef<number | null>(null);

  useEffect(() => {
    setOrderedDays(days);
    orderedDaysRef.current = days;
  }, [days]);

  const refresh = useCallback(async () => {
    try {
      const [p, d, wc, completed] = await Promise.all([getProgram(programId), getProgramDays(programId), getProgramWeekCompletion(programId), getProgramTotalCompleted(programId)]);
      setProgram(p);
      setDays(d);
      setWeekCompletion(wc);
      setCompletedWorkouts(completed);
    } catch {
      // ignore
    }
  }, [programId]);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh]),
  );

  const handlePullRefresh = useCallback(async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  }, [refresh]);

  const handleActivate = useCallback(async () => {
    try {
      await activateProgram(programId);
      await refresh();
    } catch {
      // ignore
    }
  }, [programId, refresh]);

  const handleAdvanceWeek = useCallback(async () => {
    try {
      await advanceWeek(programId);
      await refresh();
    } catch {
      // ignore
    }
  }, [programId, refresh]);

  const handleAddDay = useCallback(
    async (name: string) => {
      try {
        await createProgramDay(programId, name);
        await refresh();
      } catch {
        // ignore
      }
    },
    [programId, refresh],
  );

  const handleDuplicateDay = useCallback(
    async (dayId: number) => {
      try {
        await duplicateProgramDay(dayId);
        await refresh();
      } catch {
        // ignore
      }
    },
    [refresh],
  );

  const handleDeleteDay = useCallback(
    (day: ProgramDay) => {
      Alert.alert('Delete Day', `Delete "${day.name}"? This cannot be undone.`, [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteProgramDay(day.id);
              await refresh();
            } catch {
              // ignore
            }
          },
        },
      ]);
    },
    [refresh],
  );

  const handleDeleteProgram = useCallback(() => {
    Alert.alert(
      'Delete Program',
      `Delete "${program?.name}"? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteProgram(programId);
              navigation.goBack();
            } catch {
              // ignore
            }
          },
        },
      ],
    );
  }, [programId, program?.name, navigation]);

  const handleGoBack = useCallback(async () => {
    try {
      await decrementWeek(programId);
      await refresh();
    } catch {
      // ignore
    }
  }, [programId, refresh]);

  const handleRenameProgram = useCallback(
    async (newName: string) => {
      try {
        await renameProgram(programId, newName);
        await refresh();
      } catch {
        // ignore
      }
    },
    [programId, refresh],
  );

  const handleRenameDay = useCallback(
    async (newName: string) => {
      if (!renameDayTarget) { return; }
      try {
        await renameProgramDay(renameDayTarget.id, newName);
        await refresh();
      } catch {
        // ignore
      }
    },
    [renameDayTarget, refresh],
  );

  const handleDayTap = useCallback(
    (day: ProgramDay) => {
      (navigation as any).navigate('DayDetail', { dayId: day.id, dayName: day.name });
    },
    [navigation],
  );

  const handleDayLongPress = useCallback(
    async (day: ProgramDay) => {
      const completion = weekCompletion.find(wc => wc.dayId === day.id);
      const isDone = completion?.isCompletedThisWeek ?? false;

      if (isDone) {
        Alert.alert(
          'Unmark Day Complete',
          `Mark "${day.name}" as incomplete?`,
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Unmark',
              onPress: async () => {
                try {
                  await unmarkDayCompletion(programId, day.id);
                } catch {
                  // ignore
                }
                await refresh();
              },
            },
          ],
        );
      } else {
        Alert.alert(
          'Mark Day Complete',
          `Manually mark "${day.name}" as complete?`,
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Complete',
              onPress: async () => {
                await createCompletedSession(day.id);
                await refresh();
              },
            },
          ],
        );
      }
    },
    [programId, weekCompletion, refresh],
  );

  const toggleDayMenu = useCallback((dayId: number) => {
    setExpandedDayId(prev => (prev === dayId ? null : dayId));
  }, []);

  // ── Drag handlers ──────────────────────────────────────────────────

  const handleDragStart = useCallback((dayId: number) => {
    setExpandedDayId(null);
    setDraggingId(dayId);
    draggingIdRef.current = dayId;
    swapOffset.current = 0;
    dragY.setValue(0);
  }, [dragY]);

  const handleDragMove = useCallback((dy: number) => {
    const currentDraggingId = draggingIdRef.current;
    if (currentDraggingId === null) return;

    const currentOrder = orderedDaysRef.current;
    const currentIndex = currentOrder.findIndex(d => d.id === currentDraggingId);
    if (currentIndex < 0) return;

    const adjustedDy = dy - swapOffset.current;
    dragY.setValue(adjustedDy);

    const heights = currentOrder.map(d => cardHeightsMap.current.get(d.id) || 62);

    let yBefore = 0;
    for (let i = 0; i < currentIndex; i++) yBefore += heights[i];
    const draggedCenter = yBefore + heights[currentIndex] / 2 + adjustedDy;

    let targetIndex = currentIndex;

    if (currentIndex < currentOrder.length - 1) {
      let nextY = 0;
      for (let i = 0; i <= currentIndex; i++) nextY += heights[i];
      const nextCenter = nextY + heights[currentIndex + 1] / 2;
      if (draggedCenter > nextCenter) targetIndex = currentIndex + 1;
    }

    if (currentIndex > 0) {
      let prevY = 0;
      for (let i = 0; i < currentIndex - 1; i++) prevY += heights[i];
      const prevCenter = prevY + heights[currentIndex - 1] / 2;
      if (draggedCenter < prevCenter) targetIndex = currentIndex - 1;
    }

    if (targetIndex !== currentIndex) {
      const swappedHeight = heights[targetIndex];
      if (targetIndex > currentIndex) {
        swapOffset.current += swappedHeight;
      } else {
        swapOffset.current -= swappedHeight;
      }

      LayoutAnimation.configureNext({
        duration: 200,
        update: { type: LayoutAnimation.Types.easeInEaseOut },
      });

      const newOrder = [...currentOrder];
      const [item] = newOrder.splice(currentIndex, 1);
      newOrder.splice(targetIndex, 0, item);
      orderedDaysRef.current = newOrder;
      setOrderedDays(newOrder);
    }
  }, [dragY]);

  const handleDragEnd = useCallback(() => {
    const finalOrder = orderedDaysRef.current;
    draggingIdRef.current = null;

    Animated.spring(dragY, {
      toValue: 0,
      useNativeDriver: false,
      bounciness: 4,
      speed: 20,
    }).start(() => {
      setDraggingId(null);
    });

    reorderProgramDays(programId, finalOrder.map(d => d.id));
  }, [dragY, programId]);

  // ── Derived state ──────────────────────────────────────────────────

  if (!program) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.centered}>
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const isActivated = program.startDate !== null;
  const canAdvance = isActivated && program.currentWeek < program.weeks;
  const canGoBack = isActivated && program.currentWeek > 1;
  const totalWorkouts = orderedDays.length * program.weeks;
  const isComplete = isActivated && totalWorkouts > 0 && completedWorkouts >= totalWorkouts;
  const progress = isActivated && totalWorkouts > 0 ? Math.min(completedWorkouts / totalWorkouts, 1) : 0;
  const progressPercent = Math.round(progress * 100);

  const orderedWeekCompletion = orderedDays
    .map(d => weekCompletion.find(wc => wc.dayId === d.id))
    .filter((wc): wc is ProgramDayCompletionStatus => wc != null);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Text style={styles.backText}>{'\u2039'}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.headerCenter}
          onPress={() => setRenameProgramVisible(true)}
          activeOpacity={0.7}>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {program.name}
          </Text>
          {isActivated && (
            <Text style={styles.headerSubtitle}>
              Week {program.currentWeek}/{program.weeks}
            </Text>
          )}
        </TouchableOpacity>
        <TouchableOpacity
          onPress={handleDeleteProgram}
          style={styles.headerRight}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Text style={styles.deleteHeaderText}>Del</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        scrollEnabled={draggingId === null}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handlePullRefresh}
            tintColor={colors.accent}
            colors={[colors.accent]}
          />
        }>
        {isComplete && (
          <View style={styles.completeBanner}>
            <Text style={styles.completeBannerText}>Program Complete!</Text>
          </View>
        )}

        {/* Action row */}
        <View style={styles.actionRow}>
          {!isActivated ? (
            <TouchableOpacity style={styles.actionButton} onPress={handleActivate}>
              <Text style={styles.actionButtonText}>Start Program</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.weekControls}>
              <TouchableOpacity
                style={[styles.weekNavButton, !canGoBack && styles.weekNavButtonDisabled]}
                onPress={handleGoBack}
                disabled={!canGoBack}>
                <Text style={[styles.weekNavText, !canGoBack && styles.weekNavTextDisabled]}>
                  {'\u2039 Prev'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.weekNavButton, !canAdvance && styles.weekNavButtonDisabled]}
                onPress={handleAdvanceWeek}
                disabled={!canAdvance}>
                <Text style={[styles.weekNavText, !canAdvance && styles.weekNavTextDisabled]}>
                  {'Next \u203A'}
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Progress bar */}
        {isActivated && !isComplete && (
          <View style={styles.progressSection}>
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${progressPercent}%` }]} />
            </View>
            <Text style={styles.progressLabel}>{progressPercent}%</Text>
          </View>
        )}

        {/* Week completion card */}
        {isActivated && orderedWeekCompletion.length > 0 && (
          <View style={styles.weekCard}>
            <Text style={styles.weekCardTitle}>
              WEEK {program.currentWeek} OF {program.weeks}
            </Text>
            {orderedWeekCompletion.map((day) => (
              <TouchableOpacity
                key={day.dayId}
                style={styles.weekRow}
                onLongPress={() => {
                  const d = orderedDays.find(dd => dd.id === day.dayId);
                  if (d) { handleDayLongPress(d); }
                }}
                delayLongPress={1000}
                activeOpacity={0.7}>
                <CompletionCircle isDone={day.isCompletedThisWeek} size={20} />
                <Text
                  style={[
                    styles.weekDayName,
                    day.isCompletedThisWeek ? styles.weekDayDone : styles.weekDayPending,
                  ]}>
                  {day.dayName}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Section header */}
        <Text style={styles.daysSectionHeader}>WORKOUT DAYS</Text>

        {/* Day cards */}
        <View style={styles.daysContainer}>
          {orderedDays.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No workout days yet</Text>
              <Text style={styles.emptyHint}>Tap Add Day to get started</Text>
            </View>
          ) : (
            orderedDays.map((day) => {
              const isDragging = day.id === draggingId;
              const completion = weekCompletion.find(wc => wc.dayId === day.id);
              const isDone = completion?.isCompletedThisWeek ?? false;
              const isExpanded = expandedDayId === day.id;

              return (
                <Animated.View
                  key={day.id}
                  onLayout={(e) => {
                    cardHeightsMap.current.set(day.id, e.nativeEvent.layout.height);
                  }}
                  style={
                    isDragging
                      ? {
                          opacity: 0.5,
                          transform: [{ translateY: dragY }, { scale: 1.03 }],
                          zIndex: 999,
                          ...(Platform.OS === 'android' ? { elevation: 10 } : {}),
                        }
                      : undefined
                  }>
                  <View style={styles.dayCard}>
                    <View style={styles.dayRowWithGrip}>
                      <GripHandle
                        onDragStart={() => handleDragStart(day.id)}
                        onDragMove={handleDragMove}
                        onDragEnd={handleDragEnd}
                      />
                      <TouchableOpacity
                        style={styles.dayRow}
                        onPress={() => handleDayTap(day)}
                        onLongPress={() => handleDayLongPress(day)}
                        delayLongPress={1000}
                        activeOpacity={0.7}>
                        <CompletionCircle isDone={isDone} size={24} />
                        <Text style={styles.dayName}>{day.name}</Text>
                      </TouchableOpacity>
                    </View>
                    <TouchableOpacity
                      onPress={() => toggleDayMenu(day.id)}
                      style={styles.caretButton}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                      <Text style={styles.caretText}>{isExpanded ? '\u25B4' : '\u25BE'}</Text>
                    </TouchableOpacity>
                    {isExpanded && (
                      <View style={styles.dayActions}>
                        <TouchableOpacity
                          style={styles.actionChip}
                          onPress={() => { setExpandedDayId(null); setRenameDayTarget(day); }}>
                          <Text style={styles.actionChipText}>Rename</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.actionChip}
                          onPress={() => { setExpandedDayId(null); handleDuplicateDay(day.id); }}>
                          <Text style={styles.actionChipText}>Duplicate</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[styles.actionChip, styles.actionChipDanger]}
                          onPress={() => { setExpandedDayId(null); handleDeleteDay(day); }}>
                          <Text style={styles.actionChipTextDanger}>Delete</Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                </Animated.View>
              );
            })
          )}
        </View>

        <TouchableOpacity
          style={styles.addDayButton}
          onPress={() => setAddDayVisible(true)}>
          <Text style={styles.addDayButtonText}>+ Add Day</Text>
        </TouchableOpacity>
      </ScrollView>

      <AddDayModal
        visible={addDayVisible}
        onClose={() => setAddDayVisible(false)}
        onAdd={handleAddDay}
        defaultName={`Day ${orderedDays.length + 1}`}
      />

      <RenameModal
        visible={renameProgramVisible}
        title="Rename Program"
        currentName={program.name}
        onClose={() => setRenameProgramVisible(false)}
        onSave={handleRenameProgram}
      />

      <RenameModal
        visible={renameDayTarget !== null}
        title="Rename Day"
        currentName={renameDayTarget?.name ?? ''}
        onClose={() => setRenameDayTarget(null)}
        onSave={handleRenameDay}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    color: colors.secondary,
    fontSize: fontSize.base,
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
    fontSize: 32,
    color: colors.accent,
    fontWeight: weightBold,
    lineHeight: 36,
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
  headerSubtitle: {
    fontSize: fontSize.sm,
    color: colors.secondary,
    marginTop: 2,
  },
  headerRight: {
    width: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteHeaderText: {
    fontSize: fontSize.sm,
    fontWeight: weightMedium,
    color: colors.danger,
    textAlign: 'center',
  },
  scrollContent: {
    paddingBottom: spacing.xl,
  },
  actionRow: {
    paddingHorizontal: spacing.base,
    paddingBottom: spacing.md,
  },
  actionButton: {
    backgroundColor: colors.accent,
    borderRadius: 12,
    paddingVertical: spacing.md,
    alignItems: 'center',
    minHeight: 44,
    justifyContent: 'center',
  },
  actionButtonText: {
    color: colors.onAccent,
    fontSize: fontSize.base,
    fontWeight: weightBold,
  },
  completeBanner: {
    backgroundColor: colors.accent,
    marginHorizontal: spacing.base,
    marginBottom: spacing.sm,
    borderRadius: 12,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  completeBannerText: {
    color: colors.onAccent,
    fontSize: fontSize.base,
    fontWeight: weightBold,
  },
  weekControls: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  weekNavButton: {
    flex: 1,
    backgroundColor: 'transparent',
    borderRadius: 12,
    paddingVertical: spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.accent,
    minHeight: 44,
    justifyContent: 'center',
  },
  weekNavButtonDisabled: {
    borderColor: colors.border,
  },
  weekNavText: {
    color: colors.accent,
    fontSize: fontSize.sm,
    fontWeight: weightBold,
  },
  weekNavTextDisabled: {
    color: colors.secondary,
  },
  progressSection: {
    paddingHorizontal: spacing.base,
    paddingBottom: spacing.md,
  },
  progressTrack: {
    height: 8,
    backgroundColor: '#33373D',
    borderRadius: 8,
  },
  progressFill: {
    height: 8,
    backgroundColor: colors.accent,
    borderRadius: 8,
  },
  progressLabel: {
    fontSize: fontSize.sm,
    fontWeight: weightBold,
    color: colors.accent,
    marginTop: spacing.xs,
  },
  weekCard: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: spacing.base,
    marginHorizontal: spacing.base,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  weekCardTitle: {
    fontSize: fontSize.sm,
    fontWeight: weightBold,
    color: colors.secondary,
    letterSpacing: 1.2,
    marginBottom: spacing.sm,
  },
  weekRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
  weekDayName: {
    fontSize: fontSize.base,
  },
  weekDayDone: {
    color: colors.primary,
    fontWeight: weightSemiBold,
  },
  weekDayPending: {
    color: colors.secondary,
  },
  daysSectionHeader: {
    fontSize: fontSize.sm,
    fontWeight: weightBold,
    color: colors.secondary,
    letterSpacing: 1.2,
    paddingHorizontal: spacing.base,
    marginBottom: spacing.sm,
  },
  daysContainer: {
    paddingHorizontal: spacing.base,
  },
  dayCard: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: spacing.base,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  dayRowWithGrip: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  gripHandle: {
    width: 28,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.sm,
    gap: 3,
  },
  gripLine: {
    width: 16,
    height: 2,
    backgroundColor: colors.secondary,
    borderRadius: 1,
  },
  dayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: spacing.sm,
  },
  dayName: {
    fontSize: fontSize.base,
    fontWeight: weightSemiBold,
    color: colors.primary,
    flex: 1,
  },
  caretButton: {
    position: 'absolute',
    top: spacing.base,
    right: spacing.base,
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  caretText: {
    fontSize: 14,
    color: colors.secondary,
  },
  dayActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  actionChip: {
    flex: 1,
    paddingVertical: spacing.xs + 2,
    borderRadius: 10,
    backgroundColor: colors.surfaceElevated,
    alignItems: 'center',
  },
  actionChipDanger: {
    backgroundColor: 'rgba(217, 83, 79, 0.1)',
  },
  actionChipText: {
    fontSize: fontSize.sm,
    fontWeight: weightMedium,
    color: colors.secondary,
  },
  actionChipTextDanger: {
    fontSize: fontSize.sm,
    fontWeight: weightMedium,
    color: colors.danger,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.xl,
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
  addDayButton: {
    backgroundColor: colors.accent,
    borderRadius: 12,
    paddingVertical: spacing.md,
    marginHorizontal: spacing.base,
    marginBottom: spacing.lg,
    alignItems: 'center',
    minHeight: 44,
    justifyContent: 'center',
  },
  addDayButtonText: {
    color: colors.onAccent,
    fontSize: fontSize.base,
    fontWeight: weightBold,
  },
});
