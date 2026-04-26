import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '../../theme/colors';

interface Props {
  values: [number, number, number, number]; // [4wk, 3wk, 2wk, this]
}

// Reserve a fixed lane above the bars for value labels so the tallest bar
// can never push its label into the axis header above (`content-jumping`).
const BAR_AREA = 28;
const LABEL_LANE = 12;
const BAR_MIN = 3;

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
          const barHeightPx = Math.max((v / max) * BAR_AREA, BAR_MIN);
          const isCur = i === values.length - 1;
          return (
            <View key={i} style={styles.barWrap}>
              <Text style={[styles.label, isCur && styles.labelCur]}>{formatVal(v)}</Text>
              <View
                testID={`bar-${i}`}
                style={[
                  styles.bar,
                  {
                    height: barHeightPx,
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
  barRow: {
    flexDirection: 'row',
    gap: 4,
    alignItems: 'flex-end',
    // BAR_AREA caps the bar; LABEL_LANE keeps the value-text inside the row.
    height: BAR_AREA + LABEL_LANE,
    paddingHorizontal: 2,
  },
  barWrap: { flex: 1, alignItems: 'center', justifyContent: 'flex-end' },
  bar: { width: '100%', borderTopLeftRadius: 2, borderTopRightRadius: 2 },
  label: { fontSize: 9, lineHeight: 11, color: colors.secondary, marginBottom: 1 },
  labelCur: { color: colors.accent },
  timeRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 3 },
  tick: { flex: 1, textAlign: 'center', fontSize: 9, lineHeight: 11, color: colors.secondary },
});
