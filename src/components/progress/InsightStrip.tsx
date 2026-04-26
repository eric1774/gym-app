import React from 'react';
import { View, StyleSheet } from 'react-native';
import { PRWatchCandidate, StaleExerciseCandidate } from '../../types';
import { PRWatchTile } from './PRWatchTile';
import { StaleTile } from './StaleTile';
import { spacing } from '../../theme/spacing';

interface Props {
  prCandidate: PRWatchCandidate | null;
  staleCandidate: StaleExerciseCandidate | null;
  onTilePress: (exerciseId: number) => void;
}

export const InsightStrip: React.FC<Props> = ({ prCandidate, staleCandidate, onTilePress }) => {
  if (prCandidate === null && staleCandidate === null) { return null; }
  return (
    <View testID="insight-strip" style={styles.strip}>
      {prCandidate && <PRWatchTile candidate={prCandidate} onPress={onTilePress} />}
      {staleCandidate && <StaleTile candidate={staleCandidate} onPress={onTilePress} />}
    </View>
  );
};

const styles = StyleSheet.create({
  strip: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
});
