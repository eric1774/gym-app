import React, { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity } from 'react-native';
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
import { colors } from '../theme/colors';
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

  return (
    <SafeAreaView style={styles.root}>
      <ScrollView>
        <Text style={styles.header}>{headerText}</Text>

        {rows.map(r => (
          <TouchableOpacity
            key={r.programDayExerciseId}
            style={styles.card}
            onPress={() => setEditing(r)}
          >
            <Text style={styles.exName}>{names[r.exerciseId] ?? '—'}</Text>
            <Text style={styles.exLine}>
              <Text style={r.setsOverridden ? styles.overridden : styles.inherited}>{r.sets}</Text>
              <Text style={styles.sep}> × </Text>
              <Text style={r.repsOverridden ? styles.overridden : styles.inherited}>{r.reps}</Text>
              <Text style={styles.sep}> @ </Text>
              <Text style={r.weightOverridden ? styles.overridden : styles.inherited}>
                {r.weightLbs} lb
              </Text>
            </Text>
            {r.notes ? (
              <Text style={r.notesOverridden ? styles.noteOverridden : styles.note}>
                {r.notes}
              </Text>
            ) : (
              <Text style={styles.noteMuted}>(inherits base)</Text>
            )}
          </TouchableOpacity>
        ))}
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
  header: { fontWeight: '600', fontSize: 16, margin: 16, color: colors.primary },
  card: {
    marginHorizontal: 12,
    marginVertical: 6,
    padding: 12,
    borderRadius: 10,
    backgroundColor: colors.surfaceElevated,
  },
  exName: { fontWeight: '600', fontSize: 14, marginBottom: 4, color: colors.primary },
  exLine: { fontSize: 13 },
  overridden: { fontWeight: '600', color: colors.accent },
  inherited: { color: colors.primary },
  sep: { color: colors.secondary },
  note: { fontSize: 12, marginTop: 6, color: colors.primary },
  noteOverridden: { fontSize: 12, marginTop: 6, color: colors.accent },
  noteMuted: { fontSize: 12, marginTop: 6, fontStyle: 'italic', color: colors.secondaryDim },
});
