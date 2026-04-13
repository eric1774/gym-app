import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { WeeklySnapshot } from '../types';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { fontSize, weightBold } from '../theme/typography';

interface WeeklySnapshotCardProps {
  snapshot: WeeklySnapshot;
  onPress: () => void;
}

function formatVolumeChange(volumeChangePercent: number | null): {
  text: string;
  positive: boolean | null;
} {
  if (volumeChangePercent === null) {
    return { text: '\u2014', positive: null };
  }
  const rounded = Math.round(Math.abs(volumeChangePercent));
  if (volumeChangePercent >= 0) {
    return { text: `+${rounded}%`, positive: true };
  }
  return { text: `\u2212${rounded}%`, positive: false };
}

export const WeeklySnapshotCard: React.FC<WeeklySnapshotCardProps> = ({
  snapshot,
  onPress,
}) => {
  const { sessionsThisWeek, prsThisWeek, volumeChangePercent } = snapshot;
  const volume = formatVolumeChange(volumeChangePercent);

  const volumeColor =
    volume.positive === true
      ? colors.accent
      : colors.secondary;

  return (
    <TouchableOpacity
      testID="weekly-snapshot-card"
      style={styles.card}
      activeOpacity={0.75}
      onPress={onPress}>
      <Text style={styles.label}>This Week</Text>

      <View style={styles.statsRow}>
        {/* Sessions */}
        <View style={styles.statBlock}>
          <Text style={styles.sessionNumber}>{sessionsThisWeek}</Text>
          <Text style={styles.statLabel}>Sessions</Text>
        </View>

        {/* PRs */}
        <View style={styles.statBlock}>
          <Text style={styles.prNumber}>{prsThisWeek}</Text>
          <Text style={styles.statLabel}>PRs</Text>
        </View>

        {/* Volume change */}
        <View style={styles.statBlock}>
          <Text style={[styles.volumeNumber, { color: volumeColor }]}>
            {volume.text}
          </Text>
          <Text style={styles.statLabel}>Volume</Text>
        </View>
      </View>

      <Text style={styles.cta}>View Progress →</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.accentDim,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.accent + '40',
    padding: spacing.base,
    marginHorizontal: spacing.base,
    marginBottom: spacing.md,
  },
  label: {
    color: colors.secondary,
    fontSize: fontSize.xs,
    marginBottom: spacing.sm,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: spacing.sm,
  },
  statBlock: {
    alignItems: 'center',
  },
  sessionNumber: {
    color: colors.primary,
    fontSize: fontSize.xl,
    fontWeight: weightBold,
  },
  prNumber: {
    color: colors.prGold,
    fontSize: fontSize.xl,
    fontWeight: weightBold,
  },
  volumeNumber: {
    fontSize: fontSize.xl,
    fontWeight: weightBold,
  },
  statLabel: {
    color: colors.secondary,
    fontSize: fontSize.xs,
    marginTop: spacing.xs,
  },
  cta: {
    color: colors.accent + '80',
    fontSize: fontSize.xs,
    textAlign: 'right',
  },
});
