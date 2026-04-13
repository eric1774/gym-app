import React from 'react';
import { TouchableOpacity, View, Text, StyleSheet } from 'react-native';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { fontSize, weightBold, weightSemiBold } from '../theme/typography';
import { ExerciseHistorySession } from '../types';

interface SessionTimelineRowProps {
  session: ExerciseHistorySession;
  index: number;
  totalSessions: number;
  isPR?: boolean;
  onPress: () => void;
}

const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function formatDate(isoDate: string): string {
  const d = new Date(isoDate);
  return `${months[d.getUTCMonth()]} ${d.getUTCDate()}`;
}

export function SessionTimelineRow({
  session,
  index,
  totalSessions,
  isPR,
  onPress,
}: SessionTimelineRowProps) {
  const opacity = 1 - (index / totalSessions) * 0.5;
  const workingSets = session.sets.filter(s => !s.isWarmup);
  const volume = workingSets.reduce((sum, s) => sum + s.weightLbs * s.reps, 0);

  return (
    <TouchableOpacity
      testID={`session-row-${session.sessionId}`}
      style={[styles.row, { opacity }]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Text style={styles.date}>{formatDate(session.date)}</Text>

      <View style={styles.pillsContainer}>
        {workingSets.map(s => (
          <View key={s.setNumber} style={styles.pill}>
            <Text style={styles.pillText}>
              {s.weightLbs}{'\u00D7'}{s.reps}
            </Text>
          </View>
        ))}
      </View>

      <View style={styles.right}>
        {isPR && <Text style={styles.prBadge}>PR</Text>}
        <Text style={styles.volume}>{volume.toLocaleString()}</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  row: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.sm,
    marginBottom: spacing.xs,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  date: {
    color: colors.secondary,
    fontSize: fontSize.xs,
    fontWeight: weightSemiBold,
    width: 44,
  },
  pillsContainer: {
    flexDirection: 'row',
    flex: 1,
    flexWrap: 'wrap',
    gap: 4,
  },
  pill: {
    backgroundColor: colors.accent + '20',
    borderRadius: 6,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  pillText: {
    color: colors.accent,
    fontSize: fontSize.xs,
    fontWeight: weightSemiBold,
  },
  right: {
    alignItems: 'flex-end',
    minWidth: 50,
  },
  prBadge: {
    color: colors.prGold,
    fontSize: fontSize.xs,
    fontWeight: weightBold,
  },
  volume: {
    color: colors.secondary,
    fontSize: fontSize.xs,
  },
});
