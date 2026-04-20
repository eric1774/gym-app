import React, { useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Pressable,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { fontSize, weightBold, weightSemiBold } from '../theme/typography';

export type EditTargetsScope = 'base' | { week: number };

export interface EditTargetsModalProps {
  visible: boolean;
  onClose: () => void;
  exerciseName: string;
  programDayExerciseId: number | null;
  scope: EditTargetsScope;
  // Base values (for "inherit from base" rendering):
  baseSets: number;
  baseReps: number;
  baseWeightLbs: number;
  baseNote: string | null;
  // Current (possibly-overridden) values as initial form state:
  initialSets: number;
  initialReps: number;
  initialWeightLbs: number;
  initialNote: string | null;
  // Which fields are currently overridden (controls the "inherit" toggle state):
  setsOverridden: boolean;
  repsOverridden: boolean;
  weightOverridden: boolean;
  notesOverridden: boolean;

  onSave: (patch: {
    sets: { inherit: true } | { inherit: false; value: number };
    reps: { inherit: true } | { inherit: false; value: number };
    weight: { inherit: true } | { inherit: false; value: number };
    notes: { inherit: true } | { inherit: false; value: string | null };
  }) => Promise<void> | void;
}

export function EditTargetsModal({
  visible,
  onClose,
  exerciseName,
  programDayExerciseId,
  scope,
  baseSets,
  baseReps,
  baseWeightLbs,
  baseNote,
  initialSets,
  initialReps,
  initialWeightLbs,
  initialNote,
  setsOverridden,
  repsOverridden,
  weightOverridden,
  notesOverridden,
  onSave,
}: EditTargetsModalProps) {
  const [sets, setSets] = useState(String(initialSets));
  const [reps, setReps] = useState(String(initialReps));
  const [weight, setWeight] = useState(String(initialWeightLbs));
  const [note, setNote] = useState(initialNote ?? '');

  const [setsInherit, setSetsInherit] = useState(scope !== 'base' && !setsOverridden);
  const [repsInherit, setRepsInherit] = useState(scope !== 'base' && !repsOverridden);
  const [weightInherit, setWeightInherit] = useState(scope !== 'base' && !weightOverridden);
  const [notesInherit, setNotesInherit] = useState(scope !== 'base' && !notesOverridden);

  const [error, setError] = useState<string | null>(null);

  // Reset state when the modal opens fresh with a different exercise/scope.
  useEffect(() => {
    if (visible) {
      setSets(String(initialSets));
      setReps(String(initialReps));
      setWeight(String(initialWeightLbs));
      setNote(initialNote ?? '');
      setSetsInherit(scope !== 'base' && !setsOverridden);
      setRepsInherit(scope !== 'base' && !repsOverridden);
      setWeightInherit(scope !== 'base' && !weightOverridden);
      setNotesInherit(scope !== 'base' && !notesOverridden);
      setError(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [programDayExerciseId, visible, scope]);

  const isScopedToWeek = scope !== 'base';

  const handleSave = async () => {
    const isBase = scope === 'base';

    const sf = isBase || !setsInherit ? { inherit: false as const, value: parseInt(sets, 10) } : { inherit: true as const };
    const rf = isBase || !repsInherit ? { inherit: false as const, value: parseInt(reps, 10) } : { inherit: true as const };
    const wf = isBase || !weightInherit ? { inherit: false as const, value: parseFloat(weight) } : { inherit: true as const };
    const nf = isBase || !notesInherit ? { inherit: false as const, value: note.trim() === '' ? null : note.trim() } : { inherit: true as const };

    if (sf.inherit === false && (isNaN(sf.value) || sf.value < 1)) { setError('Sets must be a positive number'); return; }
    if (rf.inherit === false && (isNaN(rf.value) || rf.value < 1)) { setError('Reps must be a positive number'); return; }
    if (wf.inherit === false && (isNaN(wf.value) || wf.value < 0)) { setError('Weight must be zero or more'); return; }

    setError(null);
    await onSave({ sets: sf, reps: rf, weight: wf, notes: nf });
    onClose();
  };

  const handleClose = () => {
    setError(null);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={handleClose}>
      <KeyboardAvoidingView
        behavior="padding"
        style={styles.keyboardAvoid}>
        <Pressable style={styles.overlay} onPress={handleClose} />
        <View style={styles.sheet}>
          <Text style={styles.title}>{exerciseName}</Text>

          <Text style={styles.label}>Target Sets</Text>
          <TextInput
            style={[styles.input, isScopedToWeek && setsInherit && styles.inputMuted]}
            value={sets}
            onChangeText={setSets}
            keyboardType="numeric"
            placeholder={String(baseSets)}
            placeholderTextColor={colors.secondary}
            returnKeyType="next"
            maxLength={3}
            editable={!(isScopedToWeek && setsInherit)}
          />
          {isScopedToWeek && (
            <View style={styles.inheritRow}>
              <Text style={styles.inheritLabel}>Inherit from base</Text>
              <Switch value={setsInherit} onValueChange={setSetsInherit} />
            </View>
          )}

          <Text style={[styles.label, styles.fieldGap]}>Target Reps</Text>
          <TextInput
            style={[styles.input, isScopedToWeek && repsInherit && styles.inputMuted]}
            value={reps}
            onChangeText={setReps}
            keyboardType="numeric"
            placeholder={String(baseReps)}
            placeholderTextColor={colors.secondary}
            returnKeyType="next"
            maxLength={3}
            editable={!(isScopedToWeek && repsInherit)}
          />
          {isScopedToWeek && (
            <View style={styles.inheritRow}>
              <Text style={styles.inheritLabel}>Inherit from base</Text>
              <Switch value={repsInherit} onValueChange={setRepsInherit} />
            </View>
          )}

          <Text style={[styles.label, styles.fieldGap]}>Target Weight (lb)</Text>
          <TextInput
            style={[styles.input, isScopedToWeek && weightInherit && styles.inputMuted]}
            value={weight}
            onChangeText={setWeight}
            keyboardType="decimal-pad"
            placeholder={String(baseWeightLbs)}
            placeholderTextColor={colors.secondary}
            returnKeyType="next"
            maxLength={6}
            editable={!(isScopedToWeek && weightInherit)}
          />
          {isScopedToWeek && (
            <View style={styles.inheritRow}>
              <Text style={styles.inheritLabel}>Inherit from base</Text>
              <Switch value={weightInherit} onValueChange={setWeightInherit} />
            </View>
          )}

          <Text style={[styles.label, styles.fieldGap]}>Notes</Text>
          <TextInput
            style={[styles.input, isScopedToWeek && notesInherit && styles.inputMuted]}
            value={note}
            onChangeText={setNote}
            placeholder={baseNote ?? ''}
            placeholderTextColor={colors.secondary}
            returnKeyType="done"
            onSubmitEditing={handleSave}
            editable={!(isScopedToWeek && notesInherit)}
            multiline
          />
          {isScopedToWeek && (
            <View style={styles.inheritRow}>
              <Text style={styles.inheritLabel}>Inherit from base</Text>
              <Switch value={notesInherit} onValueChange={setNotesInherit} />
            </View>
          )}

          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
            <Text style={styles.saveButtonText}>Save</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.cancelButton} onPress={handleClose}>
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  keyboardAvoid: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.surfaceElevated,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xxxl,
    paddingHorizontal: spacing.base,
  },
  title: {
    fontSize: fontSize.lg,
    fontWeight: weightBold,
    color: colors.primary,
    marginBottom: spacing.lg,
    textAlign: 'center',
  },
  label: {
    fontSize: fontSize.sm,
    color: colors.secondary,
    marginBottom: spacing.xs,
    fontWeight: weightSemiBold,
  },
  fieldGap: {
    marginTop: spacing.md,
  },
  input: {
    backgroundColor: colors.surface,
    borderRadius: 8,
    padding: spacing.md,
    fontSize: fontSize.base,
    color: colors.primary,
  },
  inputMuted: {
    opacity: 0.5,
  },
  inheritRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.xs,
  },
  inheritLabel: {
    fontSize: fontSize.sm,
    color: colors.secondary,
  },
  errorText: {
    fontSize: fontSize.sm,
    color: colors.danger,
    marginTop: spacing.sm,
  },
  saveButton: {
    backgroundColor: colors.accent,
    borderRadius: 12,
    paddingVertical: spacing.base,
    alignItems: 'center',
    marginTop: spacing.lg,
  },
  saveButtonText: {
    color: colors.background,
    fontSize: fontSize.base,
    fontWeight: weightSemiBold,
  },
  cancelButton: {
    alignItems: 'center',
    paddingVertical: spacing.md,
    marginTop: spacing.sm,
  },
  cancelText: {
    color: colors.secondary,
    fontSize: fontSize.sm,
  },
});
