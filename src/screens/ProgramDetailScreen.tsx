import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  FlatList,
  RefreshControl,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
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
} from '../db/programs';
import { getProgramWeekCompletion } from '../db/dashboard';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { fontSize, weightBold, weightMedium, weightSemiBold } from '../theme/typography';
import { Program, ProgramDay, ProgramDayCompletionStatus } from '../types';
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
  const [weekCompletion, setWeekCompletion] = useState<ProgramDayCompletionStatus[]>([]);
  const [refreshing, setRefreshing] = useState(false);

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

  const handleDayTap = useCallback(
    (day: ProgramDay) => {
      (navigation as any).navigate('DayDetail', { dayId: day.id, dayName: day.name });
    },
    [navigation],
  );

  const renderDay = useCallback(
    ({ item }: { item: ProgramDay }) => {
      const completion = weekCompletion.find(wc => wc.dayId === item.id);
      const isDone = completion?.isCompletedThisWeek ?? false;
      return (
        <TouchableOpacity
          style={[styles.dayCard, isDone && styles.dayCardDone]}
          onPress={() => handleDayTap(item)}
          activeOpacity={0.7}>
          <View style={styles.dayLeft}>
            <Text style={[styles.completionIcon, isDone && styles.completionIconDone]}>
              {isDone ? '✓' : '○'}
            </Text>
          </View>
          <Text style={[styles.dayName, isDone && styles.dayNameDone]}>{item.name}</Text>
          <View style={styles.dayActions}>
            <TouchableOpacity
              style={styles.dupButton}
              onPress={() => handleDuplicateDay(item.id)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Text style={styles.dupText}>Dup</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.deleteButton}
              onPress={() => handleDeleteDay(item)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Text style={styles.deleteText}>Del</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      );
    },
    [handleDayTap, handleDeleteDay, handleDuplicateDay, weekCompletion],
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
  const canGoBack = isActivated && program.currentWeek > 1;
  const isComplete = isActivated && program.currentWeek >= program.weeks;

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
            <View key={day.dayId} style={styles.weekRow}>
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
            </View>
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 52,
  },
  dayCardDone: {
    borderWidth: 1,
    borderColor: colors.accent,
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
  dupButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: 8,
    backgroundColor: colors.surfaceElevated,
  },
  dayActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dupText: {
    fontSize: fontSize.sm,
    fontWeight: weightMedium,
    color: colors.secondary,
  },
  deleteButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: 8,
    backgroundColor: colors.surfaceElevated,
  },
  deleteText: {
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
