import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import type { LevelState } from '../types';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';

const SUBSCALES = [
  { key: 'consistencyScore' as const, label: 'Consistency', color: '#8DC28A' },
  { key: 'volumeScore' as const, label: 'Volume', color: '#5B9BF0' },
  { key: 'nutritionScore' as const, label: 'Nutrition', color: '#E0A85C' },
  { key: 'varietyScore' as const, label: 'Variety', color: '#B57AE0' },
];

export function CompositeScoreCard({ levelState }: { levelState: LevelState }) {
  return (
    <View style={styles.card}>
      <View style={styles.grid}>
        {SUBSCALES.map(({ key, label, color }) => (
          <View key={key} style={styles.item}>
            <View style={styles.labelRow}>
              <Text style={styles.label}>{label}</Text>
              <Text style={[styles.score, { color }]}>{Math.round(levelState[key])}</Text>
            </View>
            <View style={styles.track}>
              <View style={[styles.fill, { width: `${levelState[key]}%`, backgroundColor: color }]} />
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: 10,
    padding: spacing.md,
    marginHorizontal: spacing.base,
    marginBottom: spacing.base,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  item: { width: '48%' },
  labelRow: { flexDirection: 'row', justifyContent: 'space-between' },
  label: { color: colors.secondary, fontSize: 11 },
  score: { fontSize: 11 },
  track: { backgroundColor: '#2a2d31', borderRadius: 3, height: 4, marginTop: 3, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 3 },
});
