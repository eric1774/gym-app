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
  const [modalVisible, setModalVisible] = useState(false);
  const [isEditingGoal, setIsEditingGoal] = useState(false);
  const [editGoalValue, setEditGoalValue] = useState('');
  const [editGoalError, setEditGoalError] = useState<string | null>(null);

  const refreshData = useCallback(async () => {
    const [total, settings, streak] = await Promise.all([
      hydrationDb.getTodayWaterTotal(),
      hydrationDb.getWaterGoal(),
      hydrationDb.getStreakDays(),
    ]);
    setCurrentTotal(total);
    setGoalOz(settings?.goalOz ?? null);
    setStreakDays(streak);
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

  /** Dynamic subtitle based on progress */
  const getSubtitle = (): string => {
    if (goalOz === null) return '';
    const pct = Math.round((currentTotal / goalOz) * 100);
    if (pct === 0) return "Let's get started on your daily goal.";
    if (pct < 50) return "You're making progress. Keep it up!";
    if (pct < 100) return "You're halfway to your daily goal.";
    return "You've reached your daily goal!";
  };

  return (
    <View style={styles.container}>
      {isLoading ? (
        <ActivityIndicator size="large" color={colors.water} />
      ) : goalOz === null ? (
        <View style={styles.setupContainer}>
          <GoalSetupCard onGoalSet={refreshData} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {/* Title and subtitle */}
          <View style={styles.headerSection}>
            <Text style={styles.title}>Hydration Tracker</Text>
            <Text style={styles.subtitle}>{getSubtitle()}</Text>
          </View>

          {/* Cup visualization — centered hero */}
          <View style={styles.cupSection}>
            {isEditingGoal ? (
              <>
                <WaterCup currentOz={currentTotal} goalOz={goalOz} />
                {/* Inline goal editor overlaying the goal label area */}
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
                      <Text style={styles.goalSaveButtonText}>Save</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.goalCancelButton}
                      onPress={handleCancelGoalEdit}
                    >
                      <Text style={styles.goalCancelButtonText}>Cancel</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </>
            ) : (
              <TouchableOpacity
                onPress={handleStartGoalEdit}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel="Edit water goal"
              >
                <WaterCup currentOz={currentTotal} goalOz={goalOz} />
              </TouchableOpacity>
            )}
          </View>

          {/* Log Water CTA — primary action */}
          <TouchableOpacity
            style={styles.logWaterButton}
            onPress={handleOpenModal}
            activeOpacity={0.8}
            accessibilityLabel="Log custom water amount"
          >
            <Text style={styles.logWaterButtonText}>+ Log Water</Text>
          </TouchableOpacity>

          {/* Quick-add buttons */}
          <View style={styles.quickAddRow}>
            {([8, 32, 40] as const).map(oz => (
              <TouchableOpacity
                key={oz}
                style={styles.quickAddButton}
                onPress={() => handleQuickAdd(oz)}
                activeOpacity={0.7}
                accessibilityLabel={`Add ${oz} ounces`}
              >
                <Text style={styles.quickAddText}>+{oz} oz</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Stat cards */}
          <HydrationStatCards streakDays={streakDays} />
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
  headerSection: {
    paddingHorizontal: spacing.base,
    marginTop: spacing.lg,
  },
  title: {
    fontSize: fontSize.xl,
    fontWeight: weightBold,
    color: colors.primary,
  },
  subtitle: {
    fontSize: fontSize.sm,
    fontWeight: weightRegular,
    color: colors.secondary,
    marginTop: spacing.xs,
  },
  cupSection: {
    marginTop: spacing.xl,
    alignItems: 'center',
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
  quickAddRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingHorizontal: spacing.base,
    marginTop: spacing.md,
  },
  quickAddButton: {
    flex: 1,
    backgroundColor: colors.surfaceElevated,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickAddText: {
    color: colors.primary,
    fontSize: fontSize.sm,
    fontWeight: weightBold,
  },
  goalEditContainer: {
    paddingHorizontal: spacing.base,
    marginTop: spacing.md,
    width: '100%',
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
    borderColor: colors.water,
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
