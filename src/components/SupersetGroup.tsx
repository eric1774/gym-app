import React from 'react';
import {
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { colors } from '../theme/colors';
import {
  Exercise,
  ExerciseSession,
  WorkoutSet,
} from '../types';
import { ExerciseCard, SupersetBadge } from './ExerciseCard';
import { SetState, ProgramTarget } from './exerciseCardState';

interface SupersetGroupProps {
  groupId: number;
  label: string;                      // 'A', 'B'
  memberIds: number[];
  exerciseMap: Map<number, Exercise>;
  sessionMap: Map<number, ExerciseSession>;
  programTargetsMap: Map<number, ProgramTarget>;
  restOverrides: Record<number, number>;
  setsByExercise: Record<number, SetState[]>;
  nextByExercise: Record<number, { w: number; r: number }>;
  lastSetsByExercise: Record<number, WorkoutSet[] | null>;
  currentMemberId: number;
  activeExerciseId: number | null;
  onExpand: (id: number) => void;
  onToggleComplete: (id: number) => void;
  onLog: (id: number) => void;
  onNextChange: (id: number, field: 'w' | 'r', value: number) => void;
  onOpenPad: (id: number, field: 'w' | 'r') => void;
  onDeleteSet: (id: number, setId: number) => void;
  onSwap: (id: number) => void;
  onEditTarget: (id: number) => void;
  onViewHistory: (id: number) => void;
  onMemberSelect: (memberId: number) => void;  // manual override of current
  pendingRestByExercise: Record<number, boolean>;
  onStartRest: (id: number) => void;
  onRestChange: (id: number, newRestSeconds: number) => void;
  notesByExerciseId?: Record<number, string | null>;
  hintsByExerciseId?: Record<number, string | null>;
  onNoteCommit?: (exerciseId: number, text: string) => void;
}

export function SupersetGroup({
  groupId,
  label,
  memberIds,
  exerciseMap,
  sessionMap,
  programTargetsMap,
  restOverrides,
  setsByExercise,
  nextByExercise,
  lastSetsByExercise,
  currentMemberId,
  activeExerciseId,
  onExpand,
  onToggleComplete,
  onLog,
  onNextChange,
  onOpenPad,
  onDeleteSet,
  onSwap,
  onEditTarget,
  onViewHistory,
  onMemberSelect,
  pendingRestByExercise,
  onStartRest,
  onRestChange,
  notesByExerciseId,
  hintsByExerciseId,
  onNoteCommit,
}: SupersetGroupProps) {
  const members = memberIds
    .map(id => ({ id, ex: exerciseMap.get(id), se: sessionMap.get(id) }))
    .filter(m => m.ex && m.se);

  const totalRounds = Math.max(
    ...members.map(m => programTargetsMap.get(m.id)?.targetSets ?? 3),
  );
  const completedRounds = Math.min(
    ...members.map(m => setsByExercise[m.id]?.length ?? 0),
  );
  const purple = colors.supersetPurple;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{label}</Text>
        </View>
        <View style={styles.textColumn}>
          <Text style={styles.eyebrow}>SUPERSET · {members.length} EXERCISES</Text>
          <View style={styles.flowRow}>
            {members.map((m, i) => (
              <React.Fragment key={m.id}>
                <Text
                  style={[
                    styles.flowWord,
                    m.id === currentMemberId ? styles.flowWordCurrent : null,
                  ]}>
                  {lastWord(m.ex!.name)}
                </Text>
                {i < members.length - 1 && (
                  <Text style={styles.flowArrow}>→</Text>
                )}
              </React.Fragment>
            ))}
          </View>
        </View>
        <View style={styles.counterColumn}>
          <Text style={styles.counterValue}>{completedRounds}/{totalRounds}</Text>
          <Text style={styles.counterLabel}>rounds</Text>
        </View>
      </View>
      <View style={styles.cardsColumn}>
        {members.map((m, i) => {
          const badge: SupersetBadge = {
            label,
            index: i,
            isCurrent: m.id === currentMemberId,
            color: purple,
          };
          return (
            <View key={m.id} style={styles.cardWrap}>
              {m.id === currentMemberId && <View style={styles.glowRail} />}
              <ExerciseCard
                exerciseSession={m.se!}
                exercise={m.ex!}
                isActive={activeExerciseId === m.id}
                programTarget={programTargetsMap.get(m.id) ?? null}
                measurementType={m.ex!.measurementType}
                restSeconds={restOverrides[m.id] ?? m.se!.restSeconds}
                sets={setsByExercise[m.id] ?? []}
                lastSets={lastSetsByExercise[m.id] ?? null}
                next={nextByExercise[m.id] ?? { w: 0, r: 0 }}
                supersetBadge={badge}
                insideSuperset={true}
                onExpand={() => {
                  onMemberSelect(m.id);
                  onExpand(m.id);
                }}
                onToggleComplete={() => onToggleComplete(m.id)}
                onLog={() => onLog(m.id)}
                onNextChange={(field, value) => onNextChange(m.id, field, value)}
                onOpenPad={(field) => onOpenPad(m.id, field)}
                onDeleteSet={(setId) => onDeleteSet(m.id, setId)}
                onSwap={() => onSwap(m.id)}
                onEditTarget={() => onEditTarget(m.id)}
                onViewHistory={() => onViewHistory(m.id)}
                pendingRest={pendingRestByExercise[m.id] ?? false}
                onStartRest={() => onStartRest(m.id)}
                onRestChange={(newRestSeconds) => onRestChange(m.id, newRestSeconds)}
                note={notesByExerciseId?.[m.id] ?? null}
                lastSessionNoteHint={hintsByExerciseId?.[m.id] ?? null}
                onNoteCommit={onNoteCommit ? (text) => onNoteCommit(m.id, text) : undefined}
              />
            </View>
          );
        })}
      </View>
      {/* groupId used for identity; silence lint warning */}
      {groupId === -999 ? null : null}
    </View>
  );
}

function lastWord(name: string): string {
  const parts = name.trim().split(/\s+/);
  return parts[parts.length - 1] ?? name;
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'rgba(181,122,224,0.03)',
    borderWidth: 1,
    borderColor: 'rgba(181,122,224,0.28)',
    borderRadius: 20,
    padding: 10,
    marginBottom: 10,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 8,
    paddingTop: 4,
    paddingBottom: 10,
  },
  badge: {
    width: 26,
    height: 26,
    borderRadius: 8,
    backgroundColor: 'rgba(181,122,224,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.supersetPurple,
  },
  textColumn: {
    flex: 1,
  },
  eyebrow: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.supersetPurple,
    letterSpacing: 1.8,
    textTransform: 'uppercase',
  },
  flowRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  flowWord: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.secondary,
  },
  flowWordCurrent: {
    color: colors.primary,
    fontWeight: '700',
  },
  flowArrow: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.supersetPurple,
  },
  counterColumn: {
    alignItems: 'flex-end',
  },
  counterValue: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.secondary,
    fontVariant: ['tabular-nums'],
    letterSpacing: 0.5,
  },
  counterLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.secondaryDim,
  },
  cardsColumn: {
    gap: 6,
  },
  cardWrap: {
    position: 'relative',
  },
  glowRail: {
    position: 'absolute',
    left: -4,
    top: 16,
    bottom: 16,
    width: 3,
    borderRadius: 2,
    backgroundColor: colors.supersetPurple,
    // RN approximation of box-shadow: 0 0 12px purple80
    shadowColor: colors.supersetPurple,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 6,
    elevation: 4,
  },
});
