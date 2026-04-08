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
import Svg, { Defs, LinearGradient, Stop, Rect } from 'react-native-svg';
import { useFocusEffect } from '@react-navigation/native';
import HapticFeedback from 'react-native-haptic-feedback';
import { hydrationDb } from '../db';
import { WaterCup } from './WaterCup';
import { GoalSetupCard } from './GoalSetupCard';
import { HydrationStatCards } from './HydrationStatCards';
import { LogWaterModal } from '../screens/LogWaterModal';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { fontSize, weightBold, weightMedium, weightRegular } from '../theme/typography';

function getProgressSubtitle(currentOz: number, goalOz: number): string {
  const pct = goalOz > 0 ? currentOz / goalOz : 0;
  if (currentOz === 0) { return 'Start tracking your daily water intake.'; }
  if (pct >= 1) { return "You've met your daily goal!"; }
  if (pct >= 0.75) { return "Almost there! Keep drinking."; }
  if (pct >= 0.5) { return "You're halfway to your daily goal."; }
  if (pct >= 0.25) { return "Keep it up, you're making progress."; }
  return "You're off to a good start.";
}

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
          {/* Hero title */}
          <View style={styles.heroSection}>
            <Text style={styles.heroTitle}>Hydration Tracker</Text>
            <Text style={styles.heroSubtitle}>
              {getProgressSubtitle(currentTotal, goalOz)}
            </Text>
          </View>

          {/* Cup visualization — centered */}
          <View style={styles.cupSection}>
            <WaterCup currentOz={currentTotal} goalOz={goalOz} />
          </View>

          {/* Count display or inline goal edit */}
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
            <View style={styles.countDisplay}>
              <Text style={styles.countLarge}>
                {currentTotal}
                <Text style={styles.countUnit}> FL OZ</Text>
              </Text>
              <TouchableOpacity
                onPress={handleStartGoalEdit}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel="Edit water goal"
              >
                <Text style={styles.goalLabel}>GOAL: {goalOz} fl oz</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Log Water CTA — gradient button with shadow */}
          <View style={styles.logWaterShadowWrap}>
            <TouchableOpacity
              style={styles.logWaterButton}
              onPress={handleOpenModal}
              activeOpacity={0.85}
              accessibilityLabel="Log custom water amount"
            >
              <Svg
                width="100%"
                height="100%"
                style={StyleSheet.absoluteFill}
                preserveAspectRatio="none"
              >
                <Defs>
                  <LinearGradient id="logBtnGrad" x1="0" y1="0" x2="0" y2="1">
                    <Stop offset="0" stopColor="#8DC28A" stopOpacity="1" />
                    <Stop offset="1" stopColor="#205024" stopOpacity="1" />
                  </LinearGradient>
                </Defs>
                <Rect x="0" y="0" width="100%" height="100%" fill="url(#logBtnGrad)" />
              </Svg>
              <Text style={styles.logWaterButtonText}>+ Log Water</Text>
            </TouchableOpacity>
          </View>

          {/* Quick-add row */}
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

          {/* Today's stats */}
          <View style={styles.statsSection}>
            <Text style={styles.statsSectionHeader}>TODAY'S STATS</Text>
            <HydrationStatCards
              streakDays={streakDays}
              weeklyAvgOz={weeklyAvgOz}
              goalOz={goalOz}
            />
          </View>
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

  heroSection: {
    paddingHorizontal: spacing.base,
    paddingTop: spacing.xl,
    paddingBottom: spacing.sm,
    gap: spacing.xs,
  },
  heroTitle: {
    fontSize: fontSize.xxl,
    fontWeight: weightBold,
    color: colors.primary,
    letterSpacing: -0.5,
  },
  heroSubtitle: {
    fontSize: fontSize.sm,
    fontWeight: weightRegular,
    color: colors.secondary,
    letterSpacing: 0.2,
  },

  cupSection: {
    marginTop: spacing.xl,
    alignItems: 'center',
    paddingHorizontal: spacing.base,
  },

  countDisplay: {
    marginTop: spacing.xl,
    alignItems: 'center',
    gap: spacing.xs,
  },
  countLarge: {
    fontSize: 48,
    fontWeight: weightBold,
    color: colors.primary,
    letterSpacing: -1,
    lineHeight: 56,
  },
  countUnit: {
    fontSize: fontSize.lg,
    fontWeight: weightMedium,
    color: colors.secondary,
    letterSpacing: 1.5,
  },
  goalLabel: {
    fontSize: fontSize.sm,
    fontWeight: weightMedium,
    color: colors.secondary,
    letterSpacing: 0.8,
    textAlign: 'center',
    paddingVertical: spacing.xs,
  },

  goalEditContainer: {
    paddingHorizontal: spacing.base,
    marginTop: spacing.xl,
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

  logWaterShadowWrap: {
    marginHorizontal: spacing.base,
    marginTop: spacing.xl,
    borderRadius: 12,
    shadowColor: colors.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.28,
    shadowRadius: 10,
    elevation: 8,
  },
  logWaterButton: {
    borderRadius: 12,
    overflow: 'hidden',
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4A8447', // fallback while SVG renders
  },
  logWaterButtonText: {
    color: '#FFFFFF',
    fontSize: fontSize.base,
    fontWeight: weightBold,
    letterSpacing: 0.3,
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
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickAddText: {
    color: colors.primary,
    fontSize: fontSize.sm,
    fontWeight: weightBold,
  },

  statsSection: {
    marginTop: spacing.xl,
    paddingHorizontal: spacing.base,
    gap: spacing.sm,
  },
  statsSectionHeader: {
    fontSize: 10,
    fontWeight: weightBold,
    color: colors.secondary,
    letterSpacing: 2,
    paddingHorizontal: spacing.xs,
  },
});
