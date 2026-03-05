import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  FlatList,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import {
  activateProgram,
  advanceWeek,
  createProgramDay,
  deleteProgramDay,
  duplicateProgramDay,
  getProgram,
  getProgramDays,
} from '../db/programs';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { fontSize, weightBold, weightMedium, weightSemiBold } from '../theme/typography';
import { Program, ProgramDay } from '../types';
import { ProgramsStackParamList } from '../navigation/TabNavigator';
import { AddDayModal } from './AddDayModal';

type DetailRoute = RouteProp<ProgramsStackParamList, 'ProgramDetail'>;

export function ProgramDetailScreen() {
  const navigation = useNavigation();
  const route = useRoute<DetailRoute>();
  const { programId } = route.params;

  const [program, setProgram] = useState<Program | null>(null);
  const [days, setDays] = useState<ProgramDay[]>([]);
  const [addDayVisible, setAddDayVisible] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const [p, d] = await Promise.all([getProgram(programId), getProgramDays(programId)]);
      setProgram(p);
      setDays(d);
    } catch {
      // ignore
    }
  }, [programId]);

  useEffect(() => {
    refresh();
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

  const handleDayTap = useCallback(
    (day: ProgramDay) => {
      (navigation as any).navigate('DayDetail', { dayId: day.id, dayName: day.name });
    },
    [navigation],
  );

  const renderDay = useCallback(
    ({ item }: { item: ProgramDay }) => (
      <TouchableOpacity
        style={styles.dayCard}
        onPress={() => handleDayTap(item)}
        onLongPress={() => handleDeleteDay(item)}
        activeOpacity={0.7}>
        <Text style={styles.dayName}>{item.name}</Text>
        <TouchableOpacity
          style={styles.dupButton}
          onPress={() => handleDuplicateDay(item.id)}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Text style={styles.dupText}>Dup</Text>
        </TouchableOpacity>
      </TouchableOpacity>
    ),
    [handleDayTap, handleDeleteDay, handleDuplicateDay],
  );

  const keyExtractor = useCallback((item: ProgramDay) => String(item.id), []);

  if (!program) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.centered}>
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const isActivated = program.startDate !== null;
  const canAdvance = isActivated && program.currentWeek < program.weeks;

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Text style={styles.backText}>{'<'}</Text>
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {program.name}
          </Text>
          <Text style={styles.headerSubtitle}>
            Week {program.currentWeek}/{program.weeks}
          </Text>
        </View>
        <View style={styles.headerRight} />
      </View>

      <View style={styles.actionRow}>
        {!isActivated ? (
          <TouchableOpacity style={styles.actionButton} onPress={handleActivate}>
            <Text style={styles.actionButtonText}>Start Program</Text>
          </TouchableOpacity>
        ) : canAdvance ? (
          <TouchableOpacity style={styles.actionButtonSecondary} onPress={handleAdvanceWeek}>
            <Text style={styles.actionButtonSecondaryText}>Advance Week</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      {days.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No workout days yet</Text>
          <Text style={styles.emptyHint}>Tap Add Day to get started</Text>
        </View>
      ) : (
        <FlatList
          data={days}
          renderItem={renderDay}
          keyExtractor={keyExtractor}
          contentContainerStyle={styles.list}
        />
      )}

      <TouchableOpacity
        style={styles.addDayButton}
        onPress={() => setAddDayVisible(true)}>
        <Text style={styles.addDayButtonText}>+ Add Day</Text>
      </TouchableOpacity>

      <AddDayModal
        visible={addDayVisible}
        onClose={() => setAddDayVisible(false)}
        onAdd={handleAddDay}
        defaultName={`Day ${days.length + 1}`}
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
    fontSize: fontSize.xl,
    color: colors.accent,
    fontWeight: weightBold,
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
  },
  actionButtonText: {
    color: colors.background,
    fontSize: fontSize.base,
    fontWeight: weightSemiBold,
  },
  actionButtonSecondary: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: 12,
    paddingVertical: spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.accent,
  },
  actionButtonSecondaryText: {
    color: colors.accent,
    fontSize: fontSize.base,
    fontWeight: weightSemiBold,
  },
  list: {
    paddingHorizontal: spacing.base,
    paddingBottom: spacing.xl,
  },
  dayCard: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: spacing.base,
    marginBottom: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 52,
  },
  dayName: {
    fontSize: fontSize.md,
    fontWeight: weightBold,
    color: colors.primary,
    flex: 1,
  },
  dupButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: 8,
    backgroundColor: colors.surfaceElevated,
  },
  dupText: {
    fontSize: fontSize.sm,
    fontWeight: weightMedium,
    color: colors.secondary,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
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
    paddingVertical: spacing.base,
    marginHorizontal: spacing.base,
    marginBottom: spacing.lg,
    alignItems: 'center',
  },
  addDayButtonText: {
    color: colors.background,
    fontSize: fontSize.base,
    fontWeight: weightSemiBold,
  },
});
