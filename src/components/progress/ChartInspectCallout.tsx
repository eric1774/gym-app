import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { ChartPoint } from '../../types';
import { colors } from '../../theme/colors';
import { fontSize, weightSemiBold } from '../../theme/typography';

interface Props {
  point: ChartPoint | null;
}

const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const formatDate = (iso: string): string => {
  const d = new Date(iso);
  return `${months[d.getUTCMonth()]} ${d.getUTCDate()}`;
};

export const ChartInspectCallout: React.FC<Props> = ({ point }) => {
  if (point === null) {
    return (
      <View style={styles.callout}>
        <Text style={styles.empty}>No session selected · tap a point</Text>
      </View>
    );
  }
  const parts = [
    formatDate(point.date),
    `${point.bestWeightLb} lb`,
    `${point.volumeLb.toLocaleString()} vol`,
  ];
  if (point.isPR) { parts.push('PR'); }
  return (
    <View style={styles.callout}>
      <Text style={styles.dot}>●</Text>
      <View style={{ flex: 1 }}>
        <Text style={styles.body}>{parts.join(' · ')}</Text>
        <Text style={styles.hint}>Tap any point on the chart for session details</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  callout: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 8,
    backgroundColor: colors.accentGlow,
    borderColor: 'rgba(141,194,138,0.20)',
    borderWidth: 1,
    borderRadius: 10,
    marginBottom: 10,
  },
  dot: { color: colors.prGold, fontSize: 14 },
  body: { color: colors.primary, fontSize: fontSize.xs, fontWeight: weightSemiBold },
  hint: { color: colors.secondary, fontSize: 9 },
  empty: { color: colors.secondary, fontSize: fontSize.xs },
});
