import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { macrosDb } from '../db';
import { computeCalories } from '../utils/macros';
import { MacroSettings, MacroValues, MacroType, MACRO_COLORS } from '../types';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { fontSize, weightBold, weightRegular } from '../theme/typography';

interface MacroProgressCardProps {
  goals: MacroSettings;
  todayTotals: MacroValues;
  onGoalChanged: () => void;
  streaks?: MacroValues;
}

const MACRO_ORDER: MacroType[] = ['protein', 'carbs', 'fat'];
const MACRO_LABELS: Record<MacroType, string> = {
  protein: 'P',
  carbs: 'C',
  fat: 'F',
};

function getGoalForMacro(goals: MacroSettings, macroType: MacroType): number | null {
  switch (macroType) {
    case 'protein': return goals.proteinGoal;
    case 'carbs': return goals.carbGoal;
    case 'fat': return goals.fatGoal;
  }
}

function formatCalories(n: number): string {
  return Math.round(n).toLocaleString();
}

export function MacroProgressCard({ goals, todayTotals, onGoalChanged, streaks = { protein: 0, carbs: 0, fat: 0 } }: MacroProgressCardProps) {
  const [editingMacro, setEditingMacro] = useState<MacroType | null>(null);
  const [editValue, setEditValue] = useState('');
  const [editError, setEditError] = useState<string | null>(null);

  const totalCalories = computeCalories(todayTotals.protein, todayTotals.carbs, todayTotals.fat);

  const handleStartEdit = (macroType: MacroType) => {
    const currentGoal = getGoalForMacro(goals, macroType);
    setEditValue(currentGoal !== null ? String(currentGoal) : '');
    setEditError(null);
    setEditingMacro(macroType);
  };

  const handleSaveGoal = async (macroType: MacroType) => {
    const parsed = parseInt(editValue, 10);
    if (isNaN(parsed) || parsed <= 0) {
      setEditError('Please enter a number greater than 0');
      return;
    }
    setEditError(null);
    try {
      await macrosDb.setMacroGoals({ [macroType]: parsed });
      onGoalChanged();
      setEditingMacro(null);
    } catch {
      setEditError('Failed to update goal. Please try again.');
    }
  };

  const handleDiscard = () => {
    setEditingMacro(null);
    setEditError(null);
  };

  return (
    <View style={styles.wrapper}>
      <View style={styles.card}>
        {/* Header row */}
        <View style={styles.headerRow}>
          <Text style={styles.headerLabel}>DAILY MACROS</Text>
          <Text style={styles.calorieTotal}>{formatCalories(totalCalories)} cal</Text>
        </View>

        {MACRO_ORDER.map((macroType, index) => {
          const goal = getGoalForMacro(goals, macroType);
          const current = todayTotals[macroType];
          const label = MACRO_LABELS[macroType];
          const macroColor = MACRO_COLORS[macroType];

          return (
            <React.Fragment key={macroType}>
              {/* Divider before each row */}
              <View style={styles.divider} />

              {editingMacro === macroType ? (
                /* Inline edit row */
                <View style={styles.editRowContainer}>
                  <TextInput
                    style={[styles.editInput, { borderColor: macroColor }]}
                    value={editValue}
                    onChangeText={setEditValue}
                    keyboardType="number-pad"
                    maxLength={5}
                    autoFocus
                    returnKeyType="done"
                    onSubmitEditing={() => handleSaveGoal(macroType)}
                    placeholderTextColor={colors.secondary}
                  />
                  {editError ? (
                    <Text style={styles.editError}>{editError}</Text>
                  ) : null}
                  <View style={styles.editButtonRow}>
                    <TouchableOpacity
                      style={styles.saveButton}
                      onPress={() => handleSaveGoal(macroType)}>
                      <Text style={styles.saveButtonText}>Save Goal</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.discardButton}
                      onPress={handleDiscard}>
                      <Text style={styles.discardButtonText}>Discard</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ) : goal !== null ? (
                /* Active bar row */
                <TouchableOpacity
                  style={styles.barRow}
                  onPress={() => handleStartEdit(macroType)}
                  activeOpacity={0.7}>
                  <View style={styles.barTopRow}>
                    <Text style={[styles.macroLabel, { color: macroColor }]}>{label}</Text>
                    <View style={styles.progressTrackContainer}>
                      <View style={styles.progressTrack}>
                        <View
                          style={[
                            styles.progressFill,
                            {
                              backgroundColor: macroColor,
                              width: `${Math.min(Math.max((current / goal) * 100, 8), 100)}%`,
                            },
                          ]}
                        />
                      </View>
                    </View>
                    <Text style={[styles.percentageText, { color: macroColor }]}>
                      {Math.round((current / goal) * 100)}%
                    </Text>
                  </View>
                  <Text style={styles.gramText}>{parseFloat(current.toFixed(2))}g / {goal}g</Text>
                  {streaks[macroType] > 0 && (
                    <Text style={[styles.streakText, { color: macroColor + '99' }]}>
                      {'\uD83D\uDD25'} {streaks[macroType]} day streak
                    </Text>
                  )}
                </TouchableOpacity>
              ) : (
                /* Unset placeholder row */
                <TouchableOpacity
                  style={styles.barRow}
                  onPress={() => handleStartEdit(macroType)}
                  activeOpacity={0.7}>
                  <View style={styles.barTopRow}>
                    <Text style={[styles.macroLabel, { color: colors.secondary }]}>{label}</Text>
                    <View style={styles.placeholderLine} />
                    <Text style={styles.placeholderText}>Tap to set goal</Text>
                  </View>
                </TouchableOpacity>
              )}
            </React.Fragment>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    paddingHorizontal: spacing.base,
    marginTop: spacing.base,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm,
  },
  headerLabel: {
    fontSize: fontSize.sm,
    fontWeight: weightBold,
    color: colors.secondary,
    letterSpacing: 1.2,
  },
  calorieTotal: {
    fontSize: fontSize.md,
    fontWeight: weightBold,
    color: colors.primary,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
  },
  barRow: {
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm,
    minHeight: 44,
    justifyContent: 'center',
  },
  barTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  macroLabel: {
    fontSize: fontSize.sm,
    fontWeight: weightBold,
    width: 16,
  },
  progressTrackContainer: {
    flex: 1,
    marginHorizontal: spacing.sm,
  },
  progressTrack: {
    height: 8,
    backgroundColor: '#33373D',
    borderRadius: 4,
  },
  progressFill: {
    height: 8,
    borderRadius: 4,
  },
  percentageText: {
    fontSize: fontSize.sm,
    fontWeight: weightBold,
    width: 36,
    textAlign: 'right',
  },
  gramText: {
    fontSize: fontSize.base,
    fontWeight: weightRegular,
    color: colors.secondary,
    paddingTop: spacing.xs,
    marginLeft: 16 + spacing.sm, // align with track (label width + marginHorizontal)
  },
  streakText: {
    fontSize: fontSize.xs,
    fontWeight: weightRegular,
    paddingTop: 2,
    marginLeft: 16 + spacing.sm,
  },
  placeholderLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.border,
    marginHorizontal: spacing.sm,
  },
  placeholderText: {
    fontSize: fontSize.base,
    fontWeight: weightRegular,
    color: colors.secondary,
  },
  editRowContainer: {
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm,
  },
  editInput: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: 10,
    borderWidth: 2,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.base,
    fontSize: fontSize.base,
    color: colors.primary,
  },
  editError: {
    fontSize: fontSize.sm,
    color: colors.danger,
    marginTop: spacing.xs,
  },
  editButtonRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  saveButton: {
    flex: 1,
    backgroundColor: colors.accent,
    borderRadius: 12,
    paddingVertical: spacing.sm,
    alignItems: 'center',
  },
  saveButtonText: {
    color: colors.onAccent,
    fontSize: fontSize.sm,
    fontWeight: weightBold,
  },
  discardButton: {
    flex: 1,
    backgroundColor: colors.surfaceElevated,
    borderRadius: 12,
    paddingVertical: spacing.sm,
    alignItems: 'center',
  },
  discardButtonText: {
    color: colors.secondary,
    fontSize: fontSize.sm,
    fontWeight: weightBold,
  },
});
