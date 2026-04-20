import React, { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useRoute, RouteProp } from '@react-navigation/native';

import {
  getExercisesForWeekDay,
  getProgramDayExercises,
  upsertOverride,
  revertOverrideField,
  updateExerciseTargets,
  updateBaseNote,
} from '../db/programs';
import { getExercises } from '../db/exercises';
import type { WeekExerciseResolved, ProgramDayExercise } from '../types';
import { EditTargetsModal } from '../components/EditTargetsModal';
import {
  colors,
  spacing,
  fontSize,
  weightRegular,
  weightMedium,
  weightSemiBold,
} from '../theme';
import type { ProgramsStackParamList } from '../navigation/TabNavigator';

type Route = RouteProp<ProgramsStackParamList, 'WeekDayEditor'>;

export function WeekDayEditorScreen() {
  const route = useRoute<Route>();
  const { scope, dayId, dayName } = route.params;
  const isBase = scope === 'base';
  const weekNumber = isBase ? 1 : scope.week;

  const [rows, setRows] = useState<WeekExerciseResolved[]>([]);
  const [baseRows, setBaseRows] = useState<Record<number, ProgramDayExercise>>({});
  const [names, setNames] = useState<Record<number, string>>({});
  const [editing, setEditing] = useState<WeekExerciseResolved | null>(null);

  const refresh = useCallback(async () => {
    const base = await getProgramDayExercises(dayId);
    setBaseRows(Object.fromEntries(base.map(b => [b.id, b])));

    if (isBase) {
      setRows(
        base.map(b => ({
          programDayExerciseId: b.id,
          exerciseId: b.exerciseId,
          sortOrder: b.sortOrder,
          supersetGroupId: b.supersetGroupId,
          sets: b.targetSets,
          reps: b.targetReps,
          weightLbs: b.targetWeightLbs,
          notes: b.notes ?? null,
          overrideRowExists: false,
          setsOverridden: false,
          repsOverridden: false,
          weightOverridden: false,
          notesOverridden: false,
        })),
      );
    } else {
      const resolved = await getExercisesForWeekDay(dayId, weekNumber);
      setRows(resolved);
    }

    const all = await getExercises();
    const nameMap: Record<number, string> = {};
    for (const ex of all) {
      nameMap[ex.id] = ex.name;
    }
    setNames(nameMap);
  }, [dayId, isBase, weekNumber]);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh]),
  );

  const headerText = isBase ? `Base · ${dayName}` : `W${weekNumber} · ${dayName}`;
  const subHeaderText = isBase ? 'Base template' : `Week ${weekNumber} overrides`;

  return (
    <SafeAreaView style={styles.root}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.headerBlock}>
          <Text style={styles.header}>{headerText}</Text>
          <Text style={styles.subHeader}>{subHeaderText}</Text>
        </View>

        {rows.map(r => {
          const anyOverridden =
            r.setsOverridden || r.repsOverridden || r.weightOverridden || r.notesOverridden;
          const overrideCount =
            (r.setsOverridden ? 1 : 0) +
            (r.repsOverridden ? 1 : 0) +
            (r.weightOverridden ? 1 : 0) +
            (r.notesOverridden ? 1 : 0);
          return (
            <TouchableOpacity
              key={r.programDayExerciseId}
              style={styles.card}
              onPress={() => setEditing(r)}
            >
              <View style={styles.cardHeaderRow}>
                <Text style={styles.exName}>{names[r.exerciseId] ?? '—'}</Text>
                {anyOverridden ? (
                  <View style={styles.overridePill}>
                    <Text style={styles.overridePillText}>
                      {overrideCount > 1 ? `${overrideCount} customized` : 'customized'}
                    </Text>
                  </View>
                ) : null}
              </View>

              <Text style={styles.exLine}>
                <Text style={r.setsOverridden ? styles.overridden : styles.inherited}>
                  {r.sets}
                </Text>
                <Text style={styles.sep}> × </Text>
                <Text style={r.repsOverridden ? styles.overridden : styles.inherited}>
                  {r.reps}
                </Text>
                <Text style={styles.sep}> @ </Text>
                <Text style={r.weightOverridden ? styles.overridden : styles.inherited}>
                  {r.weightLbs}
                </Text>
                <Text style={styles.sep}> lb</Text>
              </Text>

              {r.notes ? (
                <View style={styles.noteRow}>
                  <Text
                    style={[
                      styles.notePencil,
                      r.notesOverridden ? styles.notePencilOverridden : null,
                    ]}
                  >
                    ✎
                  </Text>
                  <Text
                    style={r.notesOverridden ? styles.noteOverridden : styles.note}
                    numberOfLines={2}
                  >
                    {r.notes}
                  </Text>
                </View>
              ) : (
                <Text style={styles.noteMuted}>(inherits base)</Text>
              )}
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {editing && baseRows[editing.programDayExerciseId] && (
        <EditTargetsModal
          visible
          onClose={() => setEditing(null)}
          exerciseName={names[editing.exerciseId] ?? ''}
          programDayExerciseId={editing.programDayExerciseId}
          scope={scope}
          baseSets={baseRows[editing.programDayExerciseId].targetSets}
          baseReps={baseRows[editing.programDayExerciseId].targetReps}
          baseWeightLbs={baseRows[editing.programDayExerciseId].targetWeightLbs}
          baseNote={baseRows[editing.programDayExerciseId].notes ?? null}
          initialSets={editing.sets}
          initialReps={editing.reps}
          initialWeightLbs={editing.weightLbs}
          initialNote={editing.notes}
          setsOverridden={editing.setsOverridden}
          repsOverridden={editing.repsOverridden}
          weightOverridden={editing.weightOverridden}
          notesOverridden={editing.notesOverridden}
          onSave={async patch => {
            const id = editing.programDayExerciseId;
            if (isBase) {
              const newSets = patch.sets.inherit ? editing.sets : patch.sets.value;
              const newReps = patch.reps.inherit ? editing.reps : patch.reps.value;
              const newWeight = patch.weight.inherit ? editing.weightLbs : patch.weight.value;
              await updateExerciseTargets(id, newSets, newReps, newWeight);
              if (!patch.notes.inherit) {
                await updateBaseNote(id, patch.notes.value);
              }
            } else {
              const wk = (scope as { week: number }).week;
              for (const field of ['sets', 'reps', 'weight', 'notes'] as const) {
                const f = patch[field];
                if (f.inherit) {
                  await revertOverrideField({
                    programDayExerciseId: id,
                    weekNumber: wk,
                    field,
                  });
                } else {
                  await upsertOverride({
                    programDayExerciseId: id,
                    weekNumber: wk,
                    field,
                    value: f.value as number | string | null,
                  });
                }
              }
            }
            setEditing(null);
            await refresh();
          }}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  scrollContent: {
    paddingBottom: spacing.xl,
  },
  headerBlock: {
    paddingHorizontal: spacing.base,
    paddingTop: spacing.base,
    paddingBottom: spacing.sm,
  },
  header: {
    fontSize: fontSize.md,
    fontWeight: weightSemiBold,
    color: colors.primary,
  },
  subHeader: {
    fontSize: fontSize.sm,
    fontWeight: weightRegular,
    color: colors.secondary,
    marginTop: 2,
  },
  card: {
    marginHorizontal: spacing.base,
    marginVertical: spacing.xs + 2,
    padding: spacing.base,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceElevated,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  exName: {
    flex: 1,
    fontSize: fontSize.base,
    fontWeight: weightSemiBold,
    color: colors.primary,
  },
  overridePill: {
    backgroundColor: colors.accentGlow,
    borderRadius: 20,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    marginLeft: spacing.sm,
  },
  overridePillText: {
    color: colors.accent,
    fontSize: fontSize.xs,
    fontWeight: weightSemiBold,
  },
  exLine: {
    fontSize: fontSize.sm,
  },
  overridden: {
    color: colors.accent,
    fontWeight: weightSemiBold,
    fontSize: fontSize.sm,
  },
  inherited: {
    color: colors.primary,
    fontWeight: weightMedium,
    fontSize: fontSize.sm,
  },
  sep: {
    color: colors.secondary,
    fontSize: fontSize.sm,
  },
  noteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: spacing.sm,
  },
  notePencil: {
    color: colors.secondary,
    fontSize: fontSize.sm,
  },
  notePencilOverridden: {
    color: colors.accent,
  },
  note: {
    flex: 1,
    fontSize: fontSize.sm,
    color: colors.primary,
  },
  noteOverridden: {
    flex: 1,
    fontSize: fontSize.sm,
    color: colors.accent,
  },
  noteMuted: {
    fontSize: fontSize.sm,
    marginTop: spacing.sm,
    fontStyle: 'italic',
    color: colors.secondaryDim,
  },
});
