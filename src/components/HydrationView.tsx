import React, { useState, useCallback } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import HapticFeedback from 'react-native-haptic-feedback';
import { hydrationDb } from '../db';
import { WaterCup } from './WaterCup';
import { GoalSetupCard } from './GoalSetupCard';
import { HydrationStatCards } from './HydrationStatCards';
import { LogWaterModal } from '../screens/LogWaterModal';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { fontSize, weightBold, weightRegular } from '../theme/typography';

export function HydrationView() {
  const [isLoading, setIsLoading] = useState(true);
  const [currentTotal, setCurrentTotal] = useState(0);
  const [goalOz, setGoalOz] = useState<number | null>(null);
  const [streakDays, setStreakDays] = useState<number>(0);
  const [weeklyAvgOz, setWeeklyAvgOz] = useState<number | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [isEditingGoal, setIsEditingGoal] = useState(false);
  const [editGoalValue, setEditGoalValue] = useState('');
  const [editGoalError, setEditGoalError] = useState<string | null>(null);

  const refreshData = useCallback(async () => {
    const [total, settings, streak, avgOz] = await Promise.all([
      hydrationDb.getTodayWaterTotal(),
      hydrationDb.getWaterGoal(),
      hydrationDb.getStreakDays(),
      hydrationDb.get7DayAverage(),
    ]);
    setCurrentTotal(total);
    setGoalOz(settings?.goalOz ?? null);
    setStreakDays(streak);
    setWeeklyAvgOz(avgOz);
  }, []);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      (async () => {
        await refreshData();
        if (!cancelled) { setIsLoading(false); }
      })();
      return () => { cancelled = true; };
    }, [refreshData]),
  );

  const handleStartGoalEdit = useCallback(() => {
    setEditGoalValue(goalOz !== null ? String(goalOz) : '64');
    setEditGoalError(null);
    setIsEditingGoal(true);
  }, [goalOz]);

  const handleSaveGoal = useCallback(async () => {
    const parsed = parseInt(editGoalValue, 10);
    if (isNaN(parsed) || parsed <= 0) {
      setEditGoalError('Please enter a number greater than 0');
      return;
    }
    setEditGoalError(null);
    try {
      await hydrationDb.setWaterGoal(parsed);
      await refreshData();
      setIsEditingGoal(false);
    } catch {
      setEditGoalError('Failed to update goal. Please try again.');
    }
  }, [editGoalValue, refreshData]);

  const handleCancelGoalEdit = useCallback(() => {
    setIsEditingGoal(false);
    setEditGoalError(null);
  }, []);

  const handleQuickAdd = useCallback(async (oz: number) => {
    HapticFeedback.trigger('impactMedium', { enableVibrateFallback: true });
    try {
      await hydrationDb.logWater(oz);
      await refreshData();
    } catch (_err) {
      // Silent fail — cup doesn't update, user can retry
    }
  }, [refreshData]);

  const handleOpenModal = useCallback(() => setModalVisible(true), []);
  const handleCloseModal = useCallback(() => setModalVisible(false), []);
  const handleModalSaved = useCallback(async () => {
    await refreshData();
  }, [refreshData]);

  return (
    <View style={styles.container}>
      {isLoading ? (
        <ActivityIndicator size="large" color={colors.accent} />
      ) : goalOz === null ? (
        <View style={styles.setupContainer}>
          <GoalSetupCard onGoalSet={refreshData} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {/* Cup visualization — centered hero */}
          <View style={styles.cupSection}>
            <WaterCup currentOz={currentTotal} goalOz={goalOz} />
          </View>

          {/* Goal label (display) or inline edit */}
          {isEditingGoal ? (
            <View style={styles.goalEditContainer}>
              <View style={styles.goalEditInputRow}>
                <TextInput
                  style={styles.goalEditInput}
                  value={editGoalValue}
                  onChangeText={setEditGoalValue}
                  keyboardType="number-pad"
                  maxLength={4}
                  autoFocus
                  returnKeyType="done"
                  onSubmitEditing={handleSaveGoal}
                />
                <Text style={styles.goalEditSuffix}>fl oz</Text>
              </View>
              {editGoalError ? (
                <Text style={styles.goalEditError}>{editGoalError}</Text>
              ) : null}
              <View style={styles.goalEditButtonRow}>
                <TouchableOpacity
                  style={styles.goalSaveButton}
                  onPress={handleSaveGoal}
                >
                  <Text style={styles.goalSaveButtonText}>Save Goal</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.goalCancelButton}
                  onPress={handleCancelGoalEdit}
                >
                  <Text style={styles.goalCancelButtonText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <TouchableOpacity
              onPress={handleStartGoalEdit}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel="Edit water goal"
              style={styles.goalLabelTouchable}
            >
              <Text style={styles.goalLabel}>GOAL: {goalOz} fl oz</Text>
            </TouchableOpacity>
          )}

          {/* Stat cards row */}
          <HydrationStatCards
            streakDays={streakDays}
            weeklyAvgOz={weeklyAvgOz}
            goalOz={goalOz}
          />

          {/* Quick-add section */}
          <View style={styles.quickAddSection}>
            <Text style={styles.sectionHeader}>QUICK ADD</Text>
            <View style={styles.quickAddRow}>
              {([8, 16, 24] as const).map(oz => (
                <TouchableOpacity
                  key={oz}
                  style={styles.quickAddButton}
                  onPress={() => handleQuickAdd(oz)}
                  activeOpacity={0.7}
                  accessibilityLabel={`+${oz} fl oz`}
                >
                  <Text style={styles.quickAddText}>+{oz} oz</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Log Water CTA */}
          <TouchableOpacity
            style={styles.logWaterButton}
            onPress={handleOpenModal}
            activeOpacity={0.8}
            accessibilityLabel="Log custom water amount"
          >
            <Text style={styles.logWaterButtonText}>+ Log Water</Text>
          </TouchableOpacity>
        </ScrollView>
      )}

      <LogWaterModal
        visible={modalVisible}
        onClose={handleCloseModal}
        onSaved={handleModalSaved}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  setupContainer: { flex: 1, justifyContent: 'center' },
  scrollContent: { paddingBottom: 100 },
  cupSection: {
    marginTop: spacing.xl,
    alignItems: 'center',
    paddingHorizontal: spacing.base,
  },
  quickAddSection: {
    marginTop: spacing.xl,
    paddingHorizontal: spacing.base,
  },
  sectionHeader: {
    fontSize: fontSize.sm,
    fontWeight: weightBold,
    color: colors.secondary,
    letterSpacing: 1.2,
    marginBottom: spacing.sm,
  },
  quickAddRow: { flexDirection: 'row', gap: spacing.sm },
  quickAddButton: {
    flex: 1,
    backgroundColor: colors.surfaceElevated,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickAddText: {
    color: colors.accent,
    fontSize: fontSize.sm,
    fontWeight: weightBold,
  },
  logWaterButton: {
    backgroundColor: colors.accent,
    borderRadius: 12,
    paddingVertical: spacing.md,
    alignItems: 'center',
    marginHorizontal: spacing.base,
    marginTop: spacing.xl,
    minHeight: 48,
    justifyContent: 'center',
  },
  logWaterButtonText: {
    color: colors.onAccent,
    fontSize: fontSize.base,
    fontWeight: weightBold,
  },
  goalLabelTouchable: {
    alignSelf: 'center',
    paddingVertical: spacing.sm,
    marginTop: spacing.md,
  },
  goalLabel: {
    fontSize: fontSize.sm,
    fontWeight: weightBold,
    color: colors.secondary,
    letterSpacing: 1.2,
    textAlign: 'center',
  },
  goalEditContainer: {
    paddingHorizontal: spacing.base,
    marginTop: spacing.md,
  },
  goalEditInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  goalEditInput: {
    flex: 1,
    backgroundColor: colors.surfaceElevated,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: colors.accent,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.base,
    fontSize: fontSize.base,
    color: colors.primary,
  },
  goalEditSuffix: {
    fontSize: fontSize.base,
    color: colors.secondary,
    marginLeft: spacing.sm,
  },
  goalEditError: {
    fontSize: fontSize.sm,
    color: colors.danger,
    marginTop: spacing.xs,
  },
  goalEditButtonRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  goalSaveButton: {
    flex: 1,
    backgroundColor: colors.accent,
    borderRadius: 12,
    paddingVertical: spacing.sm,
    alignItems: 'center',
  },
  goalSaveButtonText: {
    color: colors.onAccent,
    fontSize: fontSize.sm,
    fontWeight: weightBold,
  },
  goalCancelButton: {
    flex: 1,
    backgroundColor: colors.surfaceElevated,
    borderRadius: 12,
    paddingVertical: spacing.sm,
    alignItems: 'center',
  },
  goalCancelButtonText: {
    color: colors.secondary,
    fontSize: fontSize.sm,
    fontWeight: weightBold,
  },
});
