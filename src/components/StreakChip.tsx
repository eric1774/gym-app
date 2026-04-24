import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme/colors';
import { fontSize, weightBold } from '../theme/typography';

export interface StreakChipProps {
  currentStreak: number;
  recentDays: { date: string; status: 'workout' | 'rest' | 'missed' }[];
}

export function StreakChip({ currentStreak, recentDays }: StreakChipProps) {
  if (currentStreak <= 0) { return null; }
  return (
    <View testID="streak-chip" style={styles.chip}>
      <View style={styles.textBlock}>
        <Text style={styles.label}>
          <Text style={styles.number}>{currentStreak}</Text>
          <Text style={styles.numberSuffix}>{`-day streak`}</Text>
        </Text>
        <Text style={styles.sub}>Rest days included</Text>
      </View>
      <View style={styles.bars}>
        {recentDays.map((d) => (
          <View
            key={d.date}
            testID={`streak-bar-${d.status}`}
            style={[
              styles.bar,
              d.status === 'workout' && styles.barWorkout,
              d.status === 'rest' && styles.barRest,
              d.status === 'missed' && styles.barMissed,
            ]}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.coralBorder,
    borderWidth: 1,
    borderRadius: 999,
    paddingVertical: 10,
    paddingHorizontal: 16,
    marginHorizontal: 16,
    marginBottom: 8,
  },
  textBlock: { flex: 1, flexDirection: 'row', alignItems: 'baseline' },
  label: { fontSize: fontSize.base, fontWeight: weightBold, color: colors.primary },
  number: { color: colors.coral, fontWeight: '800' },
  numberSuffix: { color: colors.primary, fontWeight: weightBold },
  sub: { fontSize: fontSize.xs, color: colors.secondary, marginLeft: 8 },
  bars: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  bar: { width: 4, borderRadius: 999 },
  barWorkout: { height: 16, backgroundColor: colors.coral },
  barRest: { height: 9, backgroundColor: colors.coralBorder },
  barMissed: { height: 16, backgroundColor: colors.coralFill },
});
