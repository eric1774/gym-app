import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { PRWatchCandidate } from '../../types';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { fontSize, weightSemiBold, weightBold } from '../../theme/typography';

interface Props {
  candidate: PRWatchCandidate;
  onPress: (exerciseId: number) => void;
}

export const PRWatchTile: React.FC<Props> = ({ candidate, onPress }) => (
  <TouchableOpacity
    testID="pr-watch-tile"
    style={styles.tile}
    activeOpacity={0.7}
    onPress={() => onPress(candidate.exerciseId)}>
    <Text testID="pr-watch-label" style={styles.label}>★ PR Watch</Text>
    <Text style={styles.body} numberOfLines={1}>{candidate.exerciseName}</Text>
    <Text style={styles.sub}>−{candidate.distanceLb} lb away</Text>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  tile: {
    backgroundColor: colors.surface,
    borderColor: colors.goldBorder,
    borderWidth: 1,
    borderRadius: 10,
    padding: spacing.sm,
    flex: 1,
  },
  label: {
    color: colors.prGold,
    fontSize: 9,
    fontWeight: weightBold,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  body: {
    color: colors.primary,
    fontSize: fontSize.sm,
    fontWeight: weightSemiBold,
    marginTop: 2,
  },
  sub: {
    color: colors.secondary,
    fontSize: fontSize.xs,
  },
});
