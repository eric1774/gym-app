import React, { useCallback, useEffect, useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { fontSize, weightBold, weightMedium, weightSemiBold } from '../theme/typography';
import { ProgramWeek } from '../types';
import { getAllWeekData, upsertWeekData } from '../db/programs';
import { WeekEditModal } from './WeekEditModal';

interface ManageWeeksModalProps {
  visible: boolean;
  programId: number;
  totalWeeks: number;
  onClose: () => void;
  onChanged: () => void;
}

export function ManageWeeksModal({
  visible,
  programId,
  totalWeeks,
  onClose,
  onChanged,
}: ManageWeeksModalProps) {
  const [weekData, setWeekData] = useState<Map<number, ProgramWeek>>(new Map());
  const [editingWeek, setEditingWeek] = useState<number | null>(null);

  const loadData = useCallback(async () => {
    const data = await getAllWeekData(programId);
    const map = new Map<number, ProgramWeek>();
    for (const w of data) {
      map.set(w.weekNumber, w);
    }
    setWeekData(map);
  }, [programId]);

  useEffect(() => {
    if (visible) {
      loadData();
    }
  }, [visible, loadData]);

  const handleSave = useCallback(
    async (weekNumber: number, name: string | null, details: string | null) => {
      await upsertWeekData(programId, weekNumber, name, details);
      await loadData();
      onChanged();
    },
    [programId, loadData, onChanged],
  );

  const weeks = Array.from({ length: totalWeeks }, (_, i) => i + 1);
  const editingData = editingWeek !== null ? weekData.get(editingWeek) : undefined;

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose} />
      <View style={styles.sheet}>
        <Text style={styles.title}>Manage Weeks</Text>

        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          {weeks.map((weekNum) => {
            const data = weekData.get(weekNum);
            return (
              <TouchableOpacity
                key={weekNum}
                style={styles.weekRow}
                onPress={() => setEditingWeek(weekNum)}
                activeOpacity={0.7}>
                <Text style={styles.weekNumber}>Week {weekNum}</Text>
                <Text
                  style={[styles.weekName, !data?.name && styles.weekNameEmpty]}
                  numberOfLines={1}>
                  {data?.name || 'Unnamed'}
                </Text>
                <Text style={styles.chevron}>{'\u203A'}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        <TouchableOpacity style={styles.doneButton} onPress={onClose}>
          <Text style={styles.doneButtonText}>Done</Text>
        </TouchableOpacity>
      </View>

      <WeekEditModal
        visible={editingWeek !== null}
        weekNumber={editingWeek ?? 1}
        totalWeeks={totalWeeks}
        currentName={editingData?.name ?? ''}
        currentDetails={editingData?.details ?? ''}
        onClose={() => setEditingWeek(null)}
        onSave={(name, details) => {
          if (editingWeek !== null) {
            handleSave(editingWeek, name, details);
          }
        }}
      />
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xxxl,
    paddingHorizontal: spacing.base,
    maxHeight: '70%',
  },
  title: {
    fontSize: fontSize.lg,
    fontWeight: weightBold,
    color: colors.primary,
    marginBottom: spacing.lg,
    textAlign: 'center',
  },
  scrollView: {
    marginBottom: spacing.md,
  },
  weekRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceElevated,
    borderRadius: 12,
    padding: spacing.base,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  weekNumber: {
    fontSize: fontSize.base,
    fontWeight: weightSemiBold,
    color: colors.primary,
    width: 72,
  },
  weekName: {
    fontSize: fontSize.base,
    color: colors.accent,
    flex: 1,
    fontWeight: weightMedium,
  },
  weekNameEmpty: {
    color: colors.secondary,
    fontStyle: 'italic',
  },
  chevron: {
    fontSize: fontSize.lg,
    color: colors.secondary,
    marginLeft: spacing.sm,
  },
  doneButton: {
    backgroundColor: colors.accent,
    borderRadius: 12,
    paddingVertical: spacing.base,
    alignItems: 'center',
  },
  doneButtonText: {
    color: colors.background,
    fontSize: fontSize.base,
    fontWeight: weightSemiBold,
  },
});
