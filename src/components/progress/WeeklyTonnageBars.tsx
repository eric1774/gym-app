import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '../../theme/colors';
import { fontSize } from '../../theme/typography';

interface Props {
  values: [number, number, number, number]; // [4wk, 3wk, 2wk, this]
}

const formatVal = (v: number): string => {
  if (v >= 1000) { return `${(v / 1000).toFixed(1)}k`; }
  return `${Math.round(v)}`;
};

export const WeeklyTonnageBars: React.FC<Props> = ({ values }) => {
  const max = Math.max(...values, 1);
  const labels = ['4w ago', '3w', '2w', 'this'];
  return (
    <View>
      <View style={styles.barRow}>
        {values.map((v, i) => {
          const heightPct = (v / max) * 100;
          const isCur = i === values.length - 1;
          return (
            <View key={i} style={styles.barWrap}>
              <Text style={[styles.label, isCur && styles.labelCur]}>{formatVal(v)}</Text>
              <View
                testID={`bar-${i}`}
                style={[
                  styles.bar,
                  {
                    height: `${heightPct}%`,
                    backgroundColor: isCur ? colors.accent : colors.slate,
                    opacity: isCur ? 1 : 0.65,
                  },
                ]}
              />
            </View>
          );
        })}
      </View>
      <View style={styles.timeRow}>
        {labels.map(l => <Text key={l} style={styles.tick}>{l}</Text>)}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  barRow: { flexDirection: 'row', gap: 4, alignItems: 'flex-end', height: 28, paddingHorizontal: 2 },
  barWrap: { flex: 1, alignItems: 'center', justifyContent: 'flex-end' },
  bar: { width: '100%', borderTopLeftRadius: 2, borderTopRightRadius: 2, minHeight: 3 },
  label: { fontSize: 8, color: colors.secondary, marginBottom: 1 },
  labelCur: { color: colors.accent },
  timeRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 3 },
  tick: { flex: 1, textAlign: 'center', fontSize: 8, color: colors.secondary },
});
