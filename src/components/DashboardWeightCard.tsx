import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { fontSize, weightBold, weightSemiBold } from '../theme/typography';

export interface DashboardWeightCardProps {
  todayWeight: number | null;
  yesterdayWeight: number | null;
  onPressLog: () => void;
  onPressCard: () => void;
  onPressEdit: () => void;
}

function formatDelta(today: number, yesterday: number): { text: string; color: string } {
  const diff = today - yesterday;
  const abs = Math.abs(diff).toFixed(1);
  if (Math.abs(diff) < 0.05) {
    return { text: `— flat vs yesterday`, color: colors.secondary };
  }
  const arrow = diff < 0 ? '↓' : '↑';
  const color = diff < 0 ? colors.accent : colors.danger;
  return { text: `${arrow} ${abs} vs yesterday`, color };
}

export function DashboardWeightCard({
  todayWeight,
  yesterdayWeight,
  onPressLog,
  onPressCard,
  onPressEdit,
}: DashboardWeightCardProps) {
  const hasToday = todayWeight != null;

  return (
    <Pressable testID="weight-card-body" onPress={onPressCard} style={styles.card}>
      <View style={styles.row}>
        <View style={styles.leftCol}>
          <Text style={styles.label}>WEIGHT · TODAY</Text>
          {hasToday ? (
            <>
              <View style={styles.valueRow}>
                <Text style={styles.value}>{todayWeight!.toFixed(1)}</Text>
                <Text style={styles.unit}> lb</Text>
              </View>
              <Text style={[styles.delta, {
                color: yesterdayWeight != null
                  ? formatDelta(todayWeight!, yesterdayWeight).color
                  : colors.secondary
              }]}>
                {yesterdayWeight != null
                  ? formatDelta(todayWeight!, yesterdayWeight).text
                  : 'first reading'}
              </Text>
            </>
          ) : (
            <>
              <Text style={styles.notLogged}>Not logged</Text>
              <Text style={styles.delta}>
                {yesterdayWeight != null ? `Yesterday: ${yesterdayWeight.toFixed(1)} lb` : 'No recent readings'}
              </Text>
            </>
          )}
        </View>
        {hasToday ? (
          <Pressable testID="weight-card-edit-btn" onPress={onPressEdit} hitSlop={8} style={styles.editBtn}>
            <Text style={styles.editText}>Edit</Text>
          </Pressable>
        ) : (
          <Pressable testID="weight-card-log-btn" onPress={onPressLog} hitSlop={8} style={styles.logBtn}>
            <Text style={styles.logText}>+ Log</Text>
          </Pressable>
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: spacing.base,
    marginHorizontal: spacing.base,
    marginVertical: spacing.sm,
  },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  valueRow: { flexDirection: 'row', alignItems: 'baseline' },
  leftCol: { flex: 1 },
  label: { color: colors.secondary, fontSize: fontSize.xs, fontWeight: weightBold, letterSpacing: 0.8 },
  value: { color: colors.primary, fontSize: fontSize.xxl, fontWeight: weightBold, marginTop: 4 },
  unit: { color: colors.secondary, fontSize: fontSize.sm, fontWeight: '400' },
  notLogged: { color: colors.primary, fontSize: fontSize.lg, fontWeight: weightSemiBold, marginTop: 4 },
  delta: { color: colors.secondary, fontSize: fontSize.xs, marginTop: 2 },
  logBtn: { backgroundColor: colors.accent, paddingHorizontal: spacing.base, paddingVertical: spacing.sm, borderRadius: 8 },
  logText: { color: colors.background, fontSize: fontSize.xs, fontWeight: weightBold },
  editBtn: { paddingHorizontal: spacing.sm, paddingVertical: spacing.xs },
  editText: { color: colors.accent, fontSize: fontSize.xs, fontWeight: weightSemiBold },
});
