import React, { useState } from 'react';
import {
  ActionSheetIOS,
  Alert,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import HapticFeedback from 'react-native-haptic-feedback';
import { colors, getCategoryColor } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { fontSize, weightBold, weightSemiBold } from '../theme/typography';
import {
  Exercise,
  ExerciseCategory,
  ExerciseMeasurementType,
  ExerciseSession,
  WorkoutSet,
} from '../types';
import { SetRow } from './SetRow';
import { GhostReference } from './GhostReference';
import { NextSetPanel } from './NextSetPanel';
import { Check, Trophy, More } from './icons';
import { SetState, ProgramTarget } from './exerciseCardState';

export interface SupersetBadge {
  label: string;               // "A", "B"
  index: number;               // 0-based member index
  isCurrent: boolean;
  color: string;               // supersetPurple
}

export interface ExerciseCardProps {
  exerciseSession: ExerciseSession;
  exercise: Exercise;
  isActive: boolean;
  programTarget: ProgramTarget | null;
  measurementType: ExerciseMeasurementType;
  restSeconds: number;             // PRESERVED — drives rest stepper
  pendingRest: boolean;            // PRESERVED — drives Start Rest Timer button
  sets: SetState[];
  lastSets: WorkoutSet[] | null;
  next: { w: number; r: number };
  supersetBadge?: SupersetBadge;
  insideSuperset?: boolean;
  onExpand: () => void;            // renamed from onPress
  onToggleComplete: () => void;
  onLog: () => void;
  onNextChange: (field: 'w' | 'r', value: number) => void;
  onOpenPad: (field: 'w' | 'r') => void;
  onDeleteSet: (setId: number) => void;
  onSwap: () => void;              // REQUIRED — wires into More menu
  onEditTarget: () => void;        // REQUIRED — wires into More menu
  onStartRest: () => void;         // PRESERVED — pendingRest button
  onRestChange: (newRestSeconds: number) => void;  // PRESERVED — rest stepper
}

function presentMoreMenu(options: {
  onSwap: () => void;
  onEditTarget: () => void;
}) {
  const items = ['Swap exercise', 'Edit target', 'Cancel'];
  if (Platform.OS === 'ios') {
    ActionSheetIOS.showActionSheetWithOptions(
      { options: items, cancelButtonIndex: 2 },
      i => {
        if (i === 0) { options.onSwap(); }
        else if (i === 1) { options.onEditTarget(); }
      },
    );
  } else {
    Alert.alert('', undefined, [
      { text: 'Swap exercise', onPress: options.onSwap },
      { text: 'Edit target', onPress: options.onEditTarget },
      { text: 'Cancel', style: 'cancel' },
    ]);
  }
}

function formatDuration(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export function ExerciseCard({
  exerciseSession,
  exercise,
  isActive,
  programTarget,
  measurementType,
  restSeconds,
  pendingRest,
  sets,
  lastSets,
  next,
  supersetBadge,
  insideSuperset,
  onExpand,
  onToggleComplete,
  onLog,
  onNextChange,
  onOpenPad,
  onDeleteSet,
  onSwap,
  onEditTarget,
  onStartRest,
  onRestChange,
}: ExerciseCardProps) {
  const [restStepperVisible, setRestStepperVisible] = useState(false);

  const target = programTarget;
  const completed = sets.length;
  const isTimed = measurementType === 'timed';
  const isHeightReps = measurementType === 'height_reps';
  const isDone = exerciseSession.isComplete;
  const catColor = supersetBadge
    ? supersetBadge.color
    : getCategoryColor(exercise.category as ExerciseCategory);

  const lastLoggedWeight = sets.length > 0 ? sets[sets.length - 1].w : 0;
  const liveWeight = next.w > 0 ? next.w : (lastLoggedWeight > 0 ? lastLoggedWeight : (target?.targetWeightLbs ?? 0));
  const reps = target?.targetReps ?? next.r;

  let targetLabel = '';
  if (isTimed) {
    targetLabel = reps > 0 ? `${reps}s target` : '';
  } else if (liveWeight > 0 && reps > 0) {
    targetLabel = `${reps} × ${isHeightReps ? `${liveWeight} in` : `${liveWeight} lb`}`;
  }

  const prCount = sets.filter(s => s.isPR).length;

  return (
    <View
      style={[
        styles.card,
        insideSuperset ? styles.cardInSuperset : null,
        isActive ? styles.cardActive : styles.cardInactive,
      ]}>
      {/* Header row */}
      <TouchableOpacity style={styles.header} onPress={onExpand} activeOpacity={0.8}>
        {/* 3px category accent bar */}
        <View style={[styles.accentBar, { backgroundColor: catColor }]} />

        <View style={styles.textColumn}>
          {supersetBadge && (
            <View style={styles.ssBadgeRow}>
              <View
                style={[
                  styles.ssBadge,
                  {
                    backgroundColor: supersetBadge.isCurrent
                      ? supersetBadge.color
                      : 'rgba(181,122,224,0.15)',
                  },
                ]}>
                <Text
                  style={[
                    styles.ssBadgeText,
                    { color: supersetBadge.isCurrent ? '#FFFFFF' : supersetBadge.color },
                  ]}>
                  {supersetBadge.label}{supersetBadge.index + 1}
                </Text>
              </View>
              {supersetBadge.isCurrent && (
                <Text style={[styles.ssNow, { color: supersetBadge.color }]}>← NOW</Text>
              )}
            </View>
          )}
          <Text style={[styles.name, isDone && styles.nameDone]} numberOfLines={2}>
            {exercise.name}
          </Text>
          <View style={styles.metaRow}>
            <Text style={styles.metaText}>
              {completed}/{target?.targetSets ?? 3} SETS
            </Text>
            {targetLabel ? (
              <>
                <View style={styles.metaBullet} />
                <Text style={styles.metaText}>{targetLabel}</Text>
              </>
            ) : null}
            {prCount > 0 && (
              <>
                <View style={styles.metaBullet} />
                <View style={styles.prMeta}>
                  <Trophy size={12} color={colors.prGold} />
                  <Text style={styles.prText}>PR</Text>
                </View>
              </>
            )}
          </View>
        </View>

        <TouchableOpacity
          onPress={() => presentMoreMenu({ onSwap, onEditTarget })}
          style={styles.moreButton}
          hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
          <More size={20} color={colors.secondary} />
        </TouchableOpacity>

        <TouchableOpacity
          onPress={onToggleComplete}
          style={[styles.checkCircle, isDone ? styles.checkCircleDone : styles.checkCirclePending]}
          hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
          {isDone && <Check size={16} color={colors.onAccent} />}
        </TouchableOpacity>
      </TouchableOpacity>

      {/* Collapsed chip row */}
      {!isActive && completed > 0 && (
        <View style={styles.chipRow}>
          {sets.map((s, i) => (
            <View
              key={s.id ?? i}
              style={[
                styles.chip,
                s.isPR ? styles.chipPr : styles.chipRegular,
              ]}>
              <Text style={[styles.chipText, s.isPR ? styles.chipTextPr : styles.chipTextRegular]}>
                {isTimed
                  ? formatDuration(s.r)
                  : `${s.w}×${s.r}${s.isPR ? ' ★' : ''}`}
              </Text>
            </View>
          ))}
        </View>
      )}

      {/* Expanded body */}
      {isActive && (
        <View style={styles.expandedBody}>
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

          {/* Logged sets */}
          {sets.length > 0 && (
            <View style={styles.setsColumn}>
              {sets.map(s => (
                <SetRow
                  key={s.id}
                  setNumber={s.setNumber}
                  weightLbs={s.w}
                  reps={s.r}
                  type={s.isPR ? 'pr' : 'done'}
                  isTimed={isTimed}
                  isHeightReps={isHeightReps}
                  onDelete={() => onDeleteSet(s.id)}
                />
              ))}
            </View>
          )}

          {/* Last-session history peek */}
          <GhostReference sets={lastSets ?? []} isTimed={isTimed} isHeightReps={isHeightReps} />

          {/* Next-set panel */}
          <NextSetPanel
            setNumber={completed + 1}
            measurementType={measurementType}
            nextW={next.w}
            nextR={next.r}
            onNextChange={onNextChange}
            onOpenPad={onOpenPad}
            onLog={onLog}
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
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 10,
    overflow: 'hidden',
  },
  cardInSuperset: {
    marginBottom: 6,
  },
  cardActive: {
    backgroundColor: colors.surfaceElevated,
    borderColor: 'rgba(141,194,138,0.28)',
  },
  cardInactive: {
    borderColor: colors.border,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  accentBar: {
    width: 3,
    alignSelf: 'stretch',
    borderRadius: 2,
  },
  textColumn: {
    flex: 1,
    minWidth: 0,
  },
  ssBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 3,
  },
  ssBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
  },
  ssBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1,
  },
  ssNow: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1.2,
  },
  name: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.primary,
    letterSpacing: -0.2,
  },
  nameDone: {
    color: colors.secondary,
    textDecorationLine: 'line-through',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 2,
  },
  metaText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.secondary,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    fontVariant: ['tabular-nums'],
  },
  metaBullet: {
    width: 3,
    height: 3,
    borderRadius: 2,
    backgroundColor: colors.secondaryDim,
  },
  prMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  prText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.prGold,
  },
  moreButton: {
    padding: 4,
  },
  checkCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkCircleDone: {
    backgroundColor: colors.accent,
  },
  checkCirclePending: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: colors.borderStrong,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    paddingHorizontal: 16,
    paddingBottom: 14,
  },
  chip: {
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 999,
  },
  chipRegular: {
    backgroundColor: 'rgba(141,194,138,0.10)',
  },
  chipPr: {
    backgroundColor: 'rgba(255,184,0,0.12)',
  },
  chipText: {
    fontSize: 12,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  chipTextRegular: {
    color: colors.accent,
  },
  chipTextPr: {
    color: colors.prGold,
  },
  expandedBody: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    gap: 0,
  },
  setsColumn: {
    marginBottom: 10,
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
});
