import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
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
} from '../db/programs';
import { getProgramWeekCompletion, unmarkDayCompletion } from '../db/dashboard';
import { createCompletedSession } from '../db/sessions';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { fontSize, weightBold, weightMedium, weightSemiBold } from '../theme/typography';
import { Program, ProgramDay, ProgramDayCompletionStatus } from '../types';
import { ProgramsStackParamList } from '../navigation/TabNavigator';
import { AddDayModal } from './AddDayModal';
import { RenameModal } from '../components/RenameModal';

type DetailRoute = RouteProp<ProgramsStackParamList, 'ProgramDetail'>;

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

  const refresh = useCallback(async () => {
    try {
      const [p, d, wc] = await Promise.all([getProgram(programId), getProgramDays(programId), getProgramWeekCompletion(programId)]);
      setProgram(p);
      setDays(d);
      setWeekCompletion(wc);
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

  const renderDay = useCallback(
    ({ item }: { item: ProgramDay }) => {
      const completion = weekCompletion.find(wc => wc.dayId === item.id);
      const isDone = completion?.isCompletedThisWeek ?? false;
      const isExpanded = expandedDayId === item.id;
      return (
        <View style={[styles.dayCard, isDone && styles.dayCardDone]}>
          <TouchableOpacity
            style={styles.dayRow}
            onPress={() => handleDayTap(item)}
            onLongPress={() => handleDayLongPress(item)}
            delayLongPress={1000}
            activeOpacity={0.7}>
            <View style={styles.dayLeft}>
              <Text style={[styles.completionIcon, isDone && styles.completionIconDone]}>
                {isDone ? '✓' : '○'}
              </Text>
            </View>
            <Text style={styles.dayName}>{item.name}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => toggleDayMenu(item.id)}
            style={styles.caretButton}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Text style={styles.caretText}>{isExpanded ? '▴' : '▾'}</Text>
          </TouchableOpacity>
          {isExpanded && (
            <View style={styles.dayActions}>
              <TouchableOpacity
                style={styles.actionChip}
                onPress={() => { setExpandedDayId(null); setRenameDayTarget(item); }}>
                <Text style={styles.actionChipText}>Rename</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.actionChip}
                onPress={() => { setExpandedDayId(null); handleDuplicateDay(item.id); }}>
                <Text style={styles.actionChipText}>Duplicate</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionChip, styles.actionChipDanger]}
                onPress={() => { setExpandedDayId(null); handleDeleteDay(item); }}>
                <Text style={styles.actionChipTextDanger}>Delete</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      );
    },
    [handleDayTap, handleDayLongPress, handleDeleteDay, handleDuplicateDay, weekCompletion, expandedDayId, toggleDayMenu],
  );

  const keyExtractor = useCallback((item: ProgramDay) => String(item.id), []);

  if (!program) {
    return (
      <SafeAreaView style={styles.safeArea} edges={["top"]}>
        <View style={styles.centered}>
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const isActivated = program.startDate !== null;
  const canAdvance = isActivated && program.currentWeek < program.weeks;
  const canGoBack = isActivated && program.currentWeek > 1;
  const isComplete = isActivated && program.currentWeek >= program.weeks;

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Text style={styles.backText}>{'<'}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.headerCenter}
          onPress={() => setRenameProgramVisible(true)}
          activeOpacity={0.7}>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {program.name}
          </Text>
          <Text style={styles.headerSubtitle}>
            Week {program.currentWeek}/{program.weeks}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={handleDeleteProgram}
          style={styles.headerRight}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Text style={styles.deleteHeaderText}>Del</Text>
        </TouchableOpacity>
      </View>

      {isComplete && (
        <View style={styles.completeBanner}>
          <Text style={styles.completeBannerText}>Program Complete!</Text>
        </View>
      )}

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
                {'< Prev'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.weekNavButton, !canAdvance && styles.weekNavButtonDisabled]}
              onPress={handleAdvanceWeek}
              disabled={!canAdvance}>
              <Text style={[styles.weekNavText, !canAdvance && styles.weekNavTextDisabled]}>
                {'Next >'}
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {isActivated && weekCompletion.length > 0 && (
        <View style={styles.weekCard}>
          <Text style={styles.weekTitle}>
            Week {program.currentWeek} of {program.weeks}
          </Text>
          {weekCompletion.map((day) => (
            <TouchableOpacity
              key={day.dayId}
              style={styles.weekRow}
              onLongPress={() => {
                const d = days.find(dd => dd.id === day.dayId);
                if (d) { handleDayLongPress(d); }
              }}
              delayLongPress={1000}
              activeOpacity={0.7}>
              <Text style={day.isCompletedThisWeek ? styles.checkDone : styles.checkPending}>
                {day.isCompletedThisWeek ? '✓' : '○'}
              </Text>
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
          extraData={weekCompletion}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handlePullRefresh}
              tintColor={colors.accent}
              colors={[colors.accent]}
            />
          }
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
  deleteHeaderText: {
    fontSize: fontSize.sm,
    fontWeight: weightMedium,
    color: '#E53935',
    textAlign: 'center',
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
  completeBanner: {
    backgroundColor: colors.accent,
    marginHorizontal: spacing.base,
    marginBottom: spacing.sm,
    borderRadius: 12,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  completeBannerText: {
    color: colors.background,
    fontSize: fontSize.base,
    fontWeight: weightBold,
  },
  weekControls: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  weekNavButton: {
    flex: 1,
    backgroundColor: colors.surfaceElevated,
    borderRadius: 12,
    paddingVertical: spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.accent,
  },
  weekNavButtonDisabled: {
    borderColor: colors.border,
  },
  weekNavText: {
    color: colors.accent,
    fontSize: fontSize.sm,
    fontWeight: weightSemiBold,
  },
  weekNavTextDisabled: {
    color: colors.secondary,
  },
  weekCard: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: spacing.base,
    marginHorizontal: spacing.base,
    marginBottom: spacing.md,
  },
  weekTitle: {
    fontSize: fontSize.md,
    fontWeight: weightBold,
    color: colors.primary,
    marginBottom: spacing.sm,
  },
  weekRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  checkDone: {
    fontSize: fontSize.base,
    color: colors.accent,
    marginRight: spacing.sm,
    fontWeight: weightBold,
  },
  checkPending: {
    fontSize: fontSize.base,
    color: colors.secondary,
    marginRight: spacing.sm,
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
  list: {
    paddingHorizontal: spacing.base,
    paddingBottom: spacing.xl,
  },
  dayCard: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: spacing.base,
    marginBottom: spacing.sm,
  },
  dayCardDone: {
    borderWidth: 1,
    borderColor: colors.accent,
  },
  dayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  dayLeft: {
    marginRight: spacing.sm,
  },
  completionIcon: {
    fontSize: fontSize.base,
    color: colors.secondary,
    width: 20,
    textAlign: 'center',
  },
  completionIconDone: {
    color: colors.accent,
    fontWeight: weightBold,
  },
  dayName: {
    fontSize: fontSize.md,
    fontWeight: weightBold,
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
    paddingVertical: spacing.xs,
    borderRadius: 8,
    backgroundColor: colors.surfaceElevated,
    alignItems: 'center',
  },
  actionChipDanger: {
    backgroundColor: 'rgba(229, 57, 53, 0.1)',
  },
  actionChipText: {
    fontSize: fontSize.sm,
    fontWeight: weightMedium,
    color: colors.secondary,
  },
  actionChipTextDanger: {
    fontSize: fontSize.sm,
    fontWeight: weightMedium,
    color: '#E53935',
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
