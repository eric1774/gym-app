import React from 'react';
import { TouchableOpacity, View, Text, StyleSheet } from 'react-native';
import { ProgramDayWeeklyTonnage } from '../../types';
import { WeeklyTonnageBars } from './WeeklyTonnageBars';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { fontSize, weightBold, weightSemiBold } from '../../theme/typography';

interface Props {
  day: ProgramDayWeeklyTonnage;
  onPress: (programDayId: number) => void;
}

const formatDelta = (pct: number | null): string => {
  if (pct === null) { return '— vs prior 2wk'; }
  const r = Math.round(pct);
  if (r === 0) { return '— 0% vs prior 2wk'; }
  if (r > 0) { return `▲ ${r}% vs prior 2wk`; }
  return `▼ ${Math.abs(r)}% vs prior 2wk`;
};

const formatRelativeShort = (iso: string | null): string => {
  if (!iso) { return '—'; }
  const ms = Date.now() - new Date(iso).getTime();
  const days = Math.floor(ms / (24 * 60 * 60 * 1000));
  if (days === 0) { return 'today'; }
  if (days === 1) { return 'yesterday'; }
  const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  return weekdays[new Date(iso).getDay()];
};

export const ProgramDayCard: React.FC<Props> = ({ day, onPress }) => (
  <TouchableOpacity
    testID="day-card"
    style={styles.card}
    activeOpacity={0.7}
    onPress={() => onPress(day.programDayId)}>
    <View style={styles.header}>
      <View>
        <Text style={styles.name}>{day.dayName}</Text>
        <Text style={styles.sub}>
          Last: {formatRelativeShort(day.lastPerformedAt)} · {day.exerciseCount} exercises
        </Text>
      </View>
      <View style={{ alignItems: 'flex-end' }}>
        <Text style={styles.tonnage}>
          {day.currentWeekTonnageLb.toLocaleString()}<Text style={styles.unit}> lb</Text>
        </Text>
        <Text testID="day-delta" style={styles.delta}>{formatDelta(day.deltaPercent2wk)}</Text>
      </View>
    </View>
    <View style={styles.barsBlock}>
      <Text style={styles.axisLabel}>Weekly · last 4wk</Text>
      <WeeklyTonnageBars values={day.weeklyTonnageLb} />
    </View>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surfaceElevated,
    borderColor: colors.slateBorder,
    borderWidth: 1,
    borderRadius: 12,
    padding: spacing.sm + 3,
    marginBottom: 7,
  },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 },
  name: { color: colors.primary, fontSize: fontSize.sm, fontWeight: weightBold },
  sub: { color: colors.secondary, fontSize: fontSize.xs, marginTop: 1 },
  tonnage: { color: colors.primary, fontSize: fontSize.md, fontWeight: weightBold },
  unit: { color: colors.secondary, fontSize: fontSize.xs, fontWeight: '500' },
  delta: { color: colors.textSoft, fontSize: fontSize.xs, fontWeight: weightSemiBold, marginTop: 2 },
  barsBlock: { marginTop: spacing.sm, paddingTop: 7, borderTopWidth: 1, borderTopColor: colors.border },
  axisLabel: { color: colors.secondary, fontSize: 8, letterSpacing: 0.6, textTransform: 'uppercase', marginBottom: 4 },
});
